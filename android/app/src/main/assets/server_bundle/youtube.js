const express = require("express");

const router = express.Router();

const API_KEY = process.env.YOUTUBE_API_KEY;

router.get("/youtube/recommendations", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: "YouTube API key is not configured."
      });
    }

    const query = String(req.query.q || "technology").trim();

    const url =
      "https://www.googleapis.com/youtube/v3/search" +
      `?part=snippet&type=video&maxResults=10` +
      `&q=${encodeURIComponent(query)}` +
      `&key=${encodeURIComponent(API_KEY)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data?.error?.message || "YouTube API request failed."
      });
    }

    const videos = (data.items || [])
      .filter(item => item.id?.videoId)
      .map(item => ({
        id: item.id.videoId,
        title: item.snippet?.title || "",
        channel: item.snippet?.channelTitle || "",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
        publishedAt: item.snippet?.publishedAt || "",
        youtube: true,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`
      }));

    res.json({
      success: true,
      query,
      videos
    });

  } catch (error) {
    console.error("YouTube API error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load YouTube recommendations."
    });
  }
});

module.exports = router;
