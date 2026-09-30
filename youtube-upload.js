const express = require("express");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { oauth2Client, loadToken } = require("./youtube-auth");

const router = express.Router();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getYouTube() {
  return google.youtube({
    version: "v3",
    auth: oauth2Client
  });
}

function getVideoPath(filename) {
  const uploadsDir = path.resolve(__dirname, "uploads") + path.sep;
  const videoPath = path.resolve(
    __dirname,
    "uploads",
    path.basename(String(filename))
  );

  if (!videoPath.startsWith(uploadsDir)) {
    throw new Error("Invalid video file path.");
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error("Video file not found.");
  }

  return videoPath;
}

async function getVideoStatus(youtube, videoId) {
  const response = await youtube.videos.list({
    part: "status,processingDetails",
    id: String(videoId)
  });

  const video = response.data.items?.[0];

  if (!video) {
    return null;
  }

  return {
    uploadStatus: video.status?.uploadStatus || null,
    privacyStatus: video.status?.privacyStatus || null,
    failureReason: video.status?.failureReason || null,
    rejectionReason: video.status?.rejectionReason || null,
    processingStatus:
      video.processingDetails?.processingStatus || null
  };
}

async function deleteYouTubeVideo(youtube, videoId) {
  await youtube.videos.delete({
    id: String(videoId)
  });
}

async function makeVideoPublic(youtube, videoId) {
  await youtube.videos.update({
    part: "status",
    requestBody: {
      id: String(videoId),
      status: {
        privacyStatus: "public"
      }
    }
  });
}

/*
 * Automatic workflow:
 *
 * 1. Upload PRIVATE
 * 2. Wait for YouTube processing
 * 3. If YouTube reports rejection/copyright -> DELETE
 * 4. Otherwise -> PUBLIC
 *
 * NOTE:
 * YouTube Data API does not expose a guaranteed complete Content ID
 * claim verdict for ordinary API clients. "No rejection" is therefore
 * not a legal guarantee that the video is copyright-free.
 */
async function runAutomaticCopyrightWorkflow(videoId) {
  const youtube = getYouTube();

  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await sleep(5000);

    const status = await getVideoStatus(youtube, videoId);

    if (!status) {
      return {
        success: false,
        action: "unknown",
        message: "YouTube video disappeared while checking."
      };
    }

    console.log(
      `YouTube check ${videoId}:`,
      JSON.stringify(status)
    );

    if (
      status.failureReason ||
      status.rejectionReason
    ) {
      const reason =
        status.rejectionReason ||
        status.failureReason ||
        "unknown";

      try {
        await deleteYouTubeVideo(youtube, videoId);

        return {
          success: false,
          action: "deleted",
          videoId,
          reason,
          message:
            reason === "copyright"
              ? "Copyright rejection detected by YouTube. Private video was deleted automatically."
              : `YouTube rejected the video (${reason}). Private video was deleted automatically.`
        };
      } catch (deleteError) {
        console.error(
          "Automatic YouTube delete error:",
          deleteError?.response?.data || deleteError
        );

        return {
          success: false,
          action: "delete_failed",
          videoId,
          reason,
          message:
            reason === "copyright"
              ? "Copyright rejection detected, but automatic deletion failed."
              : `YouTube rejected the video (${reason}), but automatic deletion failed.`
        };
      }
    }

    /*
     * Only move to public after YouTube reports processing completed.
     */
    if (
      status.processingStatus === "processed" &&
      status.uploadStatus === "uploaded"
    ) {
      try {
        await makeVideoPublic(youtube, videoId);

        return {
          success: true,
          action: "published",
          videoId,
          message:
            "YouTube processing completed without an API rejection. Video was made Public automatically."
        };
      } catch (publishError) {
        console.error(
          "Automatic YouTube publish error:",
          publishError?.response?.data || publishError
        );

        return {
          success: false,
          action: "publish_failed",
          videoId,
          message:
            publishError?.response?.data?.error?.message ||
            publishError.message ||
            "Video processed, but automatic Public conversion failed."
        };
      }
    }
  }

  // Maximum check time reached.
  // No YouTube API rejection was reported, so publish automatically.
  try {
    console.log(
      `YouTube check window finished for ${videoId}. No rejection reported. Making video public...`
    );

    await makeVideoPublic(youtube, videoId);

    const finalStatus =
      await getVideoStatus(youtube, videoId);

    if (finalStatus?.privacyStatus === "public") {
      return {
        success: true,
        action: "published",
        videoId,
        privacyStatus: "public",
        message:
          "YouTube check window completed without an API rejection. Video is now Public automatically."
      };
    }

    return {
      success: false,
      action: "publish_pending",
      videoId,
      privacyStatus:
        finalStatus?.privacyStatus || null,
      message:
        "Check window completed, but YouTube did not confirm Public status yet."
    };

  } catch (publishError) {
    console.error(
      "Final automatic Public conversion error:",
      publishError?.response?.data || publishError
    );

    return {
      success: false,
      action: "publish_failed",
      videoId,
      message:
        publishError?.response?.data?.error?.message ||
        publishError.message ||
        "Automatic Public conversion failed."
    };
  }
}


router.post("/youtube/upload", async (req, res) => {
  let videoPath = null;

  try {
    if (!loadToken()) {
      return res.status(401).json({
        success: false,
        message: "YouTube account is not connected.",
        needsLogin: true
      });
    }

    const {
      file,
      filename,
      title,
      description = "",
      tags = "",
      thumbnailFilename = ""
    } = req.body;

    if (!file && !filename) {
      return res.status(400).json({
        success: false,
        message: "Video file is required."
      });
    }

    if (filename) {
      videoPath = getVideoPath(filename);
    } else {
      videoPath = path.resolve(file);

      const uploadsDir =
        path.resolve(__dirname, "uploads") + path.sep;

      if (!videoPath.startsWith(uploadsDir)) {
        return res.status(400).json({
          success: false,
          message: "Invalid video file path."
        });
      }
    }

    const youtube = getYouTube();

    const cleanTags = String(tags)
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);

    /*
     * IMPORTANT:
     * Always upload PRIVATE first.
     * User-selected Public/Unlisted is deliberately ignored because
     * copyright processing must happen before publication.
     */
    const body = {
      snippet: {
        title: String(title || "Untitled Video").trim(),
        description: String(description || ""),
        tags: cleanTags
      },
      status: {
        privacyStatus: "private"
      }
    };

    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: body,
      media: {
        body: fs.createReadStream(videoPath)
      }
    });

    const videoId = response.data.id;

    let thumbnailStatus = null;

    if (thumbnailFilename) {
      const thumbnailPath = path.resolve(
        __dirname,
        "uploads",
        "thumbnails",
        path.basename(String(thumbnailFilename))
      );

      const thumbnailDir =
        path.resolve(__dirname, "uploads", "thumbnails") +
        path.sep;

      if (
        !thumbnailPath.startsWith(thumbnailDir) ||
        !fs.existsSync(thumbnailPath)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid thumbnail file."
        });
      }

      try {
        const ext = path.extname(thumbnailPath).toLowerCase();

        const mimeType =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : "image/jpeg";

        await youtube.thumbnails.set({
          videoId,
          media: {
            mimeType,
            body: fs.createReadStream(thumbnailPath)
          }
        });

        thumbnailStatus = "uploaded";
      } catch (thumbnailError) {
        console.error(
          "YouTube thumbnail error:",
          thumbnailError?.response?.data || thumbnailError
        );

        thumbnailStatus = "failed";
      }
    }

    /*
     * Start automatic workflow in background.
     * The HTTP request returns immediately after private upload.
     */
    runAutomaticCopyrightWorkflow(videoId)
      .then(result => {
        console.log(
          "Automatic YouTube workflow result:",
          JSON.stringify(result)
        );
      })
      .catch(error => {
        console.error(
          "Automatic YouTube workflow error:",
          error?.response?.data || error
        );
      });

    res.json({
      success: true,
      message:
        "Video uploaded to YouTube as Private. Automatic YouTube processing/check has started.",
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailStatus,
      initialPrivacyStatus: "private",
      automaticWorkflow: true
    });

  } catch (error) {
    console.error(
      "YouTube upload error:",
      error?.response?.data || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.response?.data?.error?.message ||
        error.message ||
        "YouTube upload failed."
    });
  }
});


router.get("/youtube/video-status", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "YouTube video ID is required."
      });
    }

    if (!loadToken()) {
      return res.status(401).json({
        success: false,
        message: "YouTube account is not connected.",
        needsLogin: true
      });
    }

    const youtube = getYouTube();
    const status = await getVideoStatus(youtube, id);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: "YouTube video not found."
      });
    }

    res.json({
      success: true,
      videoId: id,
      ...status
    });

  } catch (error) {
    console.error(
      "YouTube video status error:",
      error?.response?.data || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.response?.data?.error?.message ||
        error.message ||
        "Unable to check YouTube video status."
    });
  }
});


router.post("/youtube/automatic-check", async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "YouTube video ID is required."
      });
    }

    if (!loadToken()) {
      return res.status(401).json({
        success: false,
        message: "YouTube account is not connected.",
        needsLogin: true
      });
    }

    const result = await runAutomaticCopyrightWorkflow(
      String(videoId)
    );

    res.json(result);

  } catch (error) {
    console.error(
      "Automatic check error:",
      error?.response?.data || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.response?.data?.error?.message ||
        error.message ||
        "Automatic YouTube check failed."
    });
  }
});


module.exports = router;
