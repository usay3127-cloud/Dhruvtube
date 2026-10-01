const API = "/api";

let videos = [];

const grid = document.getElementById("videoGrid");
const searchInput = document.getElementById("searchInput");
const searchPanel = document.getElementById("searchPanel");
const player = document.getElementById("player");
const playerTitle = document.getElementById("playerTitle");


// ===============================
// LOAD VIDEOS FROM SERVER
// ===============================


async function loadYouTubeVideos(query = "technology") {
  try {
    const response = await fetch(
      `${API}/youtube/recommendations?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!data.success || !Array.isArray(data.videos)) {
      return [];
    }

    return data.videos;
  } catch (error) {
    console.error("YouTube load error:", error);
    return [];
  }
}

function renderYouTubeVideos(list) {
  if (!grid || !list.length) return;

  list.forEach(v => {
    const card = document.createElement("article");
    card.className = "video-card youtube-card";

    const title = v.title || "YouTube Video";
    const channel = v.channel || "YouTube";
    const avatar = channel.charAt(0).toUpperCase();

    card.innerHTML = `
      <div class="thumbnail">
        <img
          src="${escapeHTML(v.thumbnail)}"
          alt="${escapeHTML(title)}"
          loading="lazy"
          style="width:100%;height:100%;object-fit:cover;"
        >
        <span class="duration">YouTube</span>
      </div>

      <div class="video-info">
        <div class="channel-avatar">${escapeHTML(avatar)}</div>

        <div>
          <div class="video-title">
            ${escapeHTML(title)}
          </div>

          <div class="video-meta">
            ${escapeHTML(channel)}<br>
            YouTube
          </div>
        </div>
      </div>
    `;

    card.onclick = () => openYouTubePlayer(v);

    grid.appendChild(card);
  });
}

async function openYouTubePlayer(v) {
  playerTitle.textContent = v.title || "YouTube Video";

  const screen = player.querySelector(".player-screen");

  if (screen) {
    screen.innerHTML = `
      <iframe
        src="${escapeHTML(v.embedUrl)}?autoplay=1&rel=0"
        style="width:100%;height:100%;border:0;background:#000;"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen>
      </iframe>
    `;
  }

  // Remove only the previous YouTube details section.
  const oldDetails = document.getElementById("youtubePlayerDetails");
  if (oldDetails) oldDetails.remove();

  // Dedicated wrapper for DhruvTube's own YouTube information UI.
  const details = document.createElement("section");
  details.id = "youtubePlayerDetails";
  details.className = "youtube-player-details";

  details.innerHTML = `
    <div class="yt-player-title">
      ${escapeHTML(v.title || "YouTube Video")}
    </div>

    <div class="yt-player-channel">
      <div class="yt-channel-avatar">
        ${(v.channel || "Y").charAt(0).toUpperCase()}
      </div>

      <div class="yt-channel-name">
        ${escapeHTML(v.channel || "YouTube")}
      </div>

      <button id="ytSubscribeBtn" class="yt-subscribe" type="button">
        🔔 Subscribe
      </button>
    </div>

    <div class="yt-actions">
      <button id="ytLikeBtn" type="button">👍 Like</button>
      <button id="ytDislikeBtn" type="button">👎 Dislike</button>
      <button id="ytShareBtn" type="button">↗ Share</button>
    </div>

    <div class="yt-description">
      <b>Description</b>
      <p>Watch this video on DhruvTube.</p>
    </div>

    <div class="yt-comments">
      <h3>Comments</h3>

      <div class="comment-box">
        <input id="commentInput" placeholder="Add a comment..." autocomplete="off">
        <button id="commentBtn" type="button">Post</button>
      </div>

      <div id="commentsList">
        <div class="no-comments">
          No comments yet.
        </div>
      </div>
    </div>

    <div class="yt-recommended-title">
      Recommended
    </div>

    <div id="playerRecommended" class="player-recommended">
      <div class="recommended-loading">
        Loading recommended videos...
      </div>
    </div>
  `;

  // IMPORTANT: YouTube details are appended directly after the video screen.
  // Local openPlayer() remains untouched.
  player.appendChild(details);

  player.classList.remove("hidden");

  const likeBtn = document.getElementById("ytLikeBtn");
  const dislikeBtn = document.getElementById("ytDislikeBtn");

  likeBtn.onclick = () => {
    likeBtn.classList.toggle("active");
    dislikeBtn.classList.remove("active");
  };

  dislikeBtn.onclick = () => {
    dislikeBtn.classList.toggle("active");
    likeBtn.classList.remove("active");
  };

  document.getElementById("ytSubscribeBtn").onclick = function () {
    this.classList.toggle("subscribed");
    this.textContent = this.classList.contains("subscribed")
      ? "✓ Subscribed"
      : "🔔 Subscribe";
  };

  document.getElementById("ytShareBtn").onclick = async () => {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: v.title || "YouTube Video",
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("YouTube link copied");
      }
    } catch (e) {
      console.log("Share cancelled");
    }
  };

  const commentInput = document.getElementById("commentInput");
  const commentBtn = document.getElementById("commentBtn");
  const commentsList = document.getElementById("commentsList");

  commentBtn.onclick = () => {
    const text = commentInput.value.trim();
    if (!text) return;

    const comment = document.createElement("div");
    comment.className = "local-comment";

    comment.innerHTML = `
      <b>You</b>
      <div>${escapeHTML(text)}</div>
    `;

    commentsList.prepend(comment);
    commentInput.value = "";
  };

  try {
    const query = v.channel || "technology";

    const response = await fetch(
      `${API}/youtube/recommendations?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    const related = Array.isArray(data.videos)
      ? data.videos.filter(x => x.id !== v.id).slice(0, 8)
      : [];

    const rec = document.getElementById("playerRecommended");

    if (!related.length) {
      rec.innerHTML = `
        <div class="recommended-loading">
          No recommendations available.
        </div>
      `;
      return;
    }

    rec.innerHTML = "";

    related.forEach(item => {
      const card = document.createElement("article");
      card.className = "player-rec-card";

      card.innerHTML = `
        <img
          src="${escapeHTML(item.thumbnail)}"
          alt=""
          loading="lazy"
        >

        <div class="player-rec-info">
          <div class="player-rec-title">
            ${escapeHTML(item.title || "YouTube Video")}
          </div>

          <div class="player-rec-channel">
            ${escapeHTML(item.channel || "YouTube")}
          </div>
        </div>
      `;

      card.onclick = () => openYouTubePlayer(item);
      rec.appendChild(card);
    });
  } catch (error) {
    console.error("Player recommendations error:", error);
  }
}

async function loadVideos() {
  console.log("LOAD VIDEOS STARTED", grid);
  try {
    const response = await fetch(`${API}/videos`);

    if (!response.ok) {
      throw new Error("Videos API not available");
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.videos)) {
      videos = data.videos;
    } else {
      videos = [];
    }

    renderVideos();

    // Load YouTube videos alongside DhruvTube videos
    const youtubeVideos = await loadYouTubeVideos("technology");

    if (youtubeVideos.length) {
      renderYouTubeVideos(youtubeVideos);
    }

  } catch (error) {
    console.error("Load videos error:", error);

    videos = [];

    grid.innerHTML = `
      <div style="padding:30px;text-align:center;">
        <h3>No videos yet</h3>
        <p>Upload your first video to DhruvTube.</p>
      </div>
    `;

    // Even if local videos fail, try YouTube
    const youtubeVideos = await loadYouTubeVideos("technology");

    if (youtubeVideos.length) {
      grid.innerHTML = "";
      renderYouTubeVideos(youtubeVideos);
    }
  }
}

// ===============================
// RENDER VIDEOS
// ===============================

function renderVideos(list = videos) {

  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = `
      <div style="padding:30px;text-align:center;">
        <h3>No videos found</h3>
        <p>Try another search or upload a video.</p>
      </div>
    `;
    return;
  }

  list.forEach(v => {

    const card = document.createElement("article");

    card.className = "video-card";

    const channelName =
      v.channel || "DhruvTube User";

    const title =
      v.title || "Untitled Video";

    const views =
      typeof v.views === "number"
        ? `${v.views} views`
        : (v.views || "0 views");

    const time =
      v.time || "Just now";

    const duration =
      v.duration || "";

    const avatar =
      channelName.charAt(0).toUpperCase();

    card.innerHTML = `
      <div class="thumbnail">

        ${
          v.url
            ? `<video
                 src="${v.url}"
                 preload="metadata"
                 muted
                 playsinline
               ></video>`
            : "▶"
        }

        ${
          duration
            ? `<span class="duration">${duration}</span>`
            : ""
        }

      </div>

      <div class="video-info">

        <div class="channel-avatar">
          ${avatar}
        </div>

        <div>

          <div class="video-title">
            ${escapeHTML(title)}
          </div>

          <div class="video-meta">
            ${escapeHTML(channelName)}
            <br>
            ${escapeHTML(views)} • ${escapeHTML(time)}
          </div>

        </div>

      </div>
    `;

    card.onclick = () => openPlayer(v);

    grid.appendChild(card);
  });
}


// ===============================
// VIDEO PLAYER
// ===============================

async function openPlayer(v) {

  playerTitle.textContent =
    v.title || "Untitled Video";

  const screen =
    player.querySelector(".player-screen");

  if (screen) {

    if (v.url) {

      screen.innerHTML = `
        <video
          id="activeVideo"
          controls
          autoplay
          playsinline
          style="
            width:100%;
            height:100%;
            object-fit:contain;
            background:#000;
          "
        >
          <source src="${escapeHTML(v.url)}">
          Your browser does not support video playback.
        </video>
      `;

    } else {

      screen.innerHTML = "▶";

    }
  }


  // ===============================
  // PLAYER DETAILS
  // ===============================

  let details =
    document.getElementById("playerDetails");

  if (details) {
    details.remove();
  }

  details =
    document.createElement("div");

  details.id = "playerDetails";

  details.style.cssText = `
    padding:16px;
    color:var(--text,#111);
    background:var(--card,#fff);
    box-sizing:border-box;
  `;

  const currentViews =
    Number(v.views) || 0;

  details.innerHTML = `

    <div style="
      font-size:20px;
      font-weight:700;
      line-height:1.35;
      margin-bottom:8px;
    ">
      ${escapeHTML(v.title || "Untitled Video")}
    </div>

    <div style="
      font-size:14px;
      opacity:.7;
      margin-bottom:14px;
    ">
      ${escapeHTML(v.channel || "DhruvTube User")}
      •
      <span id="playerViewCount">
        ${currentViews} views
      </span>
      • Recently uploaded
    </div>

    <div style="
      display:flex;
      align-items:center;
      gap:10px;
      margin-bottom:16px;
      overflow-x:auto;
    ">

      <button
        id="likeVideoButton"
        style="
          border:0;
          border-radius:22px;
          padding:10px 18px;
          background:#f0f0f0;
          font-size:14px;
          cursor:pointer;
        "
      >
        👍 Like <span id="likeCount">0</span>
      </button>

      <button
        style="
          border:0;
          border-radius:22px;
          padding:10px 18px;
          background:#f0f0f0;
          font-size:14px;
        "
        disabled
      >
        👎
      </button>

      <button
        style="
          border:0;
          border-radius:22px;
          padding:10px 18px;
          background:#f0f0f0;
          font-size:14px;
        "
        disabled
      >
        🔔 Subscribe
      </button>

      <button
        id="shareVideoButton"
        style="
          border:0;
          border-radius:22px;
          padding:10px 18px;
          background:#f0f0f0;
          font-size:14px;
        "
      >
        ↗ Share
      </button>

    </div>

    ${
      v.description
        ? `
          <div style="
            padding:14px;
            border-radius:12px;
            background:rgba(127,127,127,.10);
            font-size:14px;
            line-height:1.5;
            margin-bottom:20px;
          ">
            ${escapeHTML(v.description)}
          </div>
        `
        : ""
    }

    <div style="
      font-size:18px;
      font-weight:700;
      margin-bottom:12px;
    ">
      Recommended
    </div>

    <div id="relatedVideos"></div>
  `;


  player.appendChild(details);


  // ===============================
  // LIKE / UNLIKE
  // ===============================

  const likeButton =
    document.getElementById("likeVideoButton");

  const likeCount =
    document.getElementById("likeCount");

  if (likeButton && likeCount) {

    try {

      const response =
        await fetch(
          `${API}/videos/${v.id}/likes`
        );

      const data =
        await response.json();

      if (data.success) {

        likeCount.textContent =
          Number(data.likes) || 0;

        likeButton.dataset.liked =
          data.liked ? "true" : "false";

        likeButton.innerHTML =
          data.liked
            ? `👍 Liked <span id="likeCount">${Number(data.likes) || 0}</span>`
            : `👍 Like <span id="likeCount">${Number(data.likes) || 0}</span>`;
      }

    } catch (error) {

      console.error(
        "Failed to load like status:",
        error
      );

    }


    likeButton.onclick = async () => {

      const currentlyLiked =
        likeButton.dataset.liked === "true";

      likeButton.disabled = true;

      try {

        const response =
          await fetch(
            `${API}/videos/${v.id}/like`,
            {
              method:
                currentlyLiked
                  ? "DELETE"
                  : "POST"
            }
          );

        const data =
          await response.json();

        if (data.success) {

          likeButton.dataset.liked =
            data.liked ? "true" : "false";

          likeButton.innerHTML =
            data.liked
              ? `👍 Liked <span id="likeCount">${Number(data.likes) || 0}</span>`
              : `👍 Like <span id="likeCount">${Number(data.likes) || 0}</span>`;
        }

      } catch (error) {

        console.error(
          "Like request failed:",
          error
        );

      } finally {

        likeButton.disabled = false;

      }
    };
  }


  // ===============================
  // SHARE
  // ===============================

  const shareButton =
    document.getElementById("shareVideoButton");

  if (shareButton) {

    shareButton.onclick = async () => {

      const shareText =
        v.title || "Watch this video on DhruvTube";

      try {

        if (navigator.share) {

          await navigator.share({
            title: shareText,
            text: shareText,
            url: window.location.href
          });

        } else {

          await navigator.clipboard.writeText(
            window.location.href
          );

          alert("Link copied!");

        }

      } catch (error) {

        console.log("Share cancelled");

      }
    };
  }


  // ===============================
  // RELATED VIDEOS
  // ===============================

  renderRelatedVideos(v);


  // ===============================
  // COUNT VIEW WHEN VIDEO STARTS
  // ===============================

  const activeVideo =
    document.getElementById("activeVideo");

  if (activeVideo) {

    let viewCounted = false;

    activeVideo.addEventListener(
      "playing",
      async () => {

        if (viewCounted) {
          return;
        }

        viewCounted = true;

        await addVideoView(v.id);

      },
      { once: true }
    );
  }


  player.classList.remove("hidden");
}

// ===============================
// ADD VIEW
// ===============================

async function addVideoView(videoId) {

  try {

    const response =
      await fetch(
        `${API}/videos/${videoId}/view`,
        {
          method: "POST"
        }
      );

    const data =
      await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "View update failed"
      );
    }


    // Update local video data
    const video =
      videos.find(
        item => Number(item.id) === Number(videoId)
      );

    if (video) {
      video.views =
        Number(data.views) || 0;
    }


    // Update player count
    const count =
      document.getElementById("playerViewCount");

    if (count) {
      count.textContent =
        `${data.views} views`;
    }


    // Update home card after closing player
    renderVideos();

  } catch (error) {

    console.error(
      "View count error:",
      error
    );

  }
}


// ===============================
// RELATED VIDEOS
// ===============================

function renderRelatedVideos(currentVideo) {

  const container =
    document.getElementById("relatedVideos");

  if (!container) {
    return;
  }

  const related =
    videos
      .filter(
        video =>
          Number(video.id) !==
          Number(currentVideo.id)
      )
      .slice(0, 6);


  if (!related.length) {

    container.innerHTML = `
      <div style="
        padding:15px 0;
        opacity:.65;
        font-size:14px;
      ">
        No other videos yet.
      </div>
    `;

    return;
  }


  related.forEach(video => {

    const item =
      document.createElement("div");

    item.style.cssText = `
      display:flex;
      gap:12px;
      padding:10px 0;
      cursor:pointer;
      border-bottom:1px solid rgba(127,127,127,.15);
    `;


    item.innerHTML = `

      <div style="
        width:130px;
        height:74px;
        flex-shrink:0;
        border-radius:8px;
        overflow:hidden;
        background:#111;
      ">

        ${
          video.url
            ? `
              <video
                src="${escapeHTML(video.url)}"
                muted
                preload="metadata"
                playsinline
                style="
                  width:100%;
                  height:100%;
                  object-fit:cover;
                "
              ></video>
            `
            : "▶"
        }

      </div>

      <div style="
        min-width:0;
      ">

        <div style="
          font-weight:600;
          font-size:14px;
          line-height:1.35;
          margin-bottom:5px;
        ">
          ${escapeHTML(video.title || "Untitled Video")}
        </div>

        <div style="
          font-size:12px;
          opacity:.65;
        ">
          ${escapeHTML(video.channel || "DhruvTube User")}
          <br>
          ${Number(video.views) || 0} views
        </div>

      </div>
    `;


    item.onclick = () => {

      openPlayer(video);

    };


    container.appendChild(item);
  });
}


// ===============================
// CLOSE PLAYER
// ===============================

document.getElementById("closePlayer").onclick = () => {

  const video =
    player.querySelector("video");

  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  const details =
    document.getElementById("playerDetails");

  if (details) {
    details.remove();
  }

  player.classList.add("hidden");
};


// ===============================
// SEARCH
// ===============================

document.getElementById("searchOpen").onclick = () => {

  searchPanel.classList.add("show");

  searchInput.focus();
};


document.getElementById("searchBack").onclick = async () => {

  searchPanel.classList.remove("show");

  searchInput.value = "";

  await loadVideos();
};


async function doSearch() {

  const q = searchInput.value.trim();

  if (!q) {
    await loadVideos();
    return;
  }

  const oldText = searchInput.value;

  try {
    const response = await fetch(
      `${API}/youtube/search?q=${encodeURIComponent(q)}`
    );

    const data = await response.json();

    if (!data.success || !Array.isArray(data.videos)) {
      throw new Error(data.message || "Search failed");
    }

    grid.innerHTML = "";

    if (!data.videos.length) {
      grid.innerHTML = `
        <div style="padding:30px;text-align:center;">
          <h3>No videos found</h3>
          <p>Try another search.</p>
        </div>
      `;
      return;
    }

    renderYouTubeVideos(data.videos);

    document.getElementById("home").classList.remove("hidden");

    document.querySelectorAll(".page").forEach(p => {
      p.classList.add("hidden");
    });

    document.getElementById("home").classList.remove("hidden");

  } catch (error) {
    console.error("YouTube search error:", error);

    grid.innerHTML = `
      <div style="padding:30px;text-align:center;">
        <h3>Search failed</h3>
        <p>Please try again.</p>
      </div>
    `;
  }
}

document.getElementById("searchBtn").onclick =
  doSearch;


searchInput.addEventListener(
  "keydown",
  e => {

    if (e.key === "Enter") {
      doSearch();
    }

  }
);


// ===============================
// THEME
// ===============================

document.getElementById("themeBtn").onclick = () => {

  document.body.classList.toggle("dark");

  document.getElementById("themeBtn").textContent =
    document.body.classList.contains("dark")
      ? "☀"
      : "☾";
};


// ===============================
// CATEGORIES
// ===============================

document
  .querySelectorAll(".categories button")
  .forEach(btn => {

    btn.onclick = () => {

      document
        .querySelectorAll(".categories button")
        .forEach(
          b => b.classList.remove("selected")
        );

      btn.classList.add("selected");

      const cat =
        btn.textContent.trim();


      if (cat === "All") {
        renderVideos();
        return;
      }


      renderVideos(
        videos.filter(
          v =>
            (v.type || "").toLowerCase() ===
            cat.toLowerCase()
        )
      );

    };

  });


// ===============================
// PAGES
// ===============================

const pages = {

  home:
    document.getElementById("home"),

  shorts:
    document.getElementById("shortsPage"),

  subscriptions:
    document.getElementById("subscriptionsPage"),

  profile:
    document.getElementById("profilePage")

};


function showPage(name) {
  // Hide everything first
  document.getElementById("home").classList.add("hidden");

  Object.values(pages).forEach(p => {
    p.classList.add("hidden");
  });

  // You page mode
  document.body.classList.toggle("you-mode", name === "profile");

  // Show selected page
  if (name === "home") {
    document.getElementById("home").classList.remove("hidden");
  } else if (pages[name]) {
    pages[name].classList.remove("hidden");
  }

  // Bottom navigation
  document.querySelectorAll(".nav").forEach(n => {
    n.classList.toggle(
      "active",
      n.dataset.page === name
    );
  });

  // Scroll to top
  window.scrollTo(0, 0);
}

document
  .querySelectorAll(".nav")
  .forEach(btn => {

    btn.onclick = () => {

      showPage(
        btn.dataset.page
      );

    };

  });


document.getElementById("profileBtn").onclick = () => {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  const popup = document.getElementById("accountPopup");

  if (popup) {
    popup.classList.toggle("hidden");
    updateAccountPopup();
  }
};


// ===============================
// REAL UPLOAD BUTTON
// ===============================

document.getElementById("uploadBtn").onclick =
  () => {

    openUploadForm();

  };


// ===============================
// UPLOAD FORM
// ===============================

function openUploadForm() {

  const oldForm =
    document.getElementById("dhruvUploadForm");

  if (oldForm) {
    oldForm.remove();
  }


  const form =
    document.createElement("div");

  form.id =
    "dhruvUploadForm";


  form.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.75);
    z-index:9999;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
  `;


  form.innerHTML = `

    <div style="
      width:100%;
      max-width:500px;
      background:var(--card,#fff);
      color:var(--text,#111);
      border-radius:16px;
      padding:22px;
      box-sizing:border-box;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:18px;
      ">

        <h2 style="margin:0;">
          Upload Video
        </h2>

        <button
          id="uploadClose"
          style="
            border:0;
            background:none;
            font-size:24px;
            cursor:pointer;
          "
        >
          ✕
        </button>

      </div>


      <input
        id="uploadVideoFile"
        type="file"
        accept="video/*"
        style="
          width:100%;
          margin-bottom:8px;
        "
      >

      <div style="
        font-size:12px;
        opacity:.7;
        margin-bottom:15px;
      ">
        Video selected above
      </div>


      <input
        id="uploadThumbnail"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style="
          width:100%;
          margin-bottom:15px;
        "
      >

      <div style="
        font-size:12px;
        opacity:.7;
        margin-top:-10px;
        margin-bottom:15px;
      ">
        YouTube thumbnail (optional)
      </div>


      <input
        id="uploadTitle"
        type="text"
        placeholder="Video title"
        style="
          width:100%;
          box-sizing:border-box;
          padding:12px;
          margin-bottom:12px;
          border-radius:8px;
          border:1px solid #ccc;
        "
      >


      <textarea
        id="uploadDescription"
        placeholder="Description"
        rows="4"
        style="
          width:100%;
          box-sizing:border-box;
          padding:12px;
          margin-bottom:12px;
          border-radius:8px;
          border:1px solid #ccc;
          resize:vertical;
        "
      ></textarea>


      <label style="
        display:flex;
        align-items:center;
        gap:8px;
        margin-bottom:15px;
      ">

        <input
          id="uploadShort"
          type="checkbox"
        >

        This is a Short

      </label>


      <button
        id="startUpload"
        style="
          width:100%;
          padding:13px;
          border:0;
          border-radius:9px;
          background:#ff0000;
          color:white;
          font-size:16px;
          font-weight:bold;
          cursor:pointer;
        "
      >
        Upload Video
      </button>


      <div
        id="uploadProgress"
        style="
          margin-top:15px;
          text-align:center;
        "
      ></div>

    </div>
  `;


  document.body.appendChild(form);


  document.getElementById("uploadClose").onclick =
    () => form.remove();


  document.getElementById("startUpload").onclick =
    uploadVideo;
}


// ===============================
// SEND VIDEO TO SERVER
// ===============================

async function uploadVideo() {

  const fileInput =
    document.getElementById("uploadVideoFile");

  const titleInput =
    document.getElementById("uploadTitle");

  const descriptionInput =
    document.getElementById("uploadDescription");

  const shortInput =
    document.getElementById("uploadShort");

  const progress =
    document.getElementById("uploadProgress");

  const button =
    document.getElementById("startUpload");


  if (!fileInput.files.length) {

    alert("Please select a video.");

    return;
  }


  const file =
    fileInput.files[0];


  if (!file.type.startsWith("video/")) {

    alert("Please select a valid video file.");

    return;
  }


  const formData =
    new FormData();


  formData.append(
    "video",
    file
  );

  formData.append(
    "title",
    titleInput.value.trim() ||
    "Untitled Video"
  );

  formData.append(
    "description",
    descriptionInput.value.trim()
  );

  formData.append(
    "is_short",
    shortInput.checked
      ? "1"
      : "0"
  );


  button.disabled = true;

  button.textContent =
    "Uploading...";

  progress.textContent =
    "Uploading video, please wait...";


  try {

    const response =
      await fetch(
        `${API}/upload`,
        {
          method: "POST",
          body: formData
        }
      );


    const data =
      await response.json();


    if (!response.ok || !data.success) {

      throw new Error(
        data.message ||
        "Upload failed"
      );

    }


    progress.textContent =
      "Upload successful!";


    
    const youtubeFlowInfo = document.createElement("div");
    youtubeFlowInfo.textContent =
      "🔒 Automatic flow: PRIVATE → YouTube Check → PUBLIC / DELETE";
    youtubeFlowInfo.style.cssText = `
      width:100%;
      margin-top:10px;
      padding:12px;
      box-sizing:border-box;
      border-radius:10px;
      background:#f3f4f6;
      color:#222;
      font-size:13px;
      line-height:1.4;
    `;
    document.querySelector("#dhruvUploadForm > div").appendChild(youtubeFlowInfo);

const ytButton = document.createElement("button");
    ytButton.textContent = "Upload to YouTube";
    ytButton.style.cssText = `
      width:100%;
      padding:13px;
      margin-top:12px;
      border:0;
      border-radius:9px;
      background:#cc0000;
      color:white;
      font-size:16px;
      font-weight:bold;
      cursor:pointer;
    `;

    document.querySelector("#dhruvUploadForm > div").appendChild(ytButton);


async function checkYouTubeVideoStatus(videoId, progressElement) {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${API}/youtube/video-status?id=${encodeURIComponent(videoId)}`
      );

      const data = await response.json();

      if (response.status === 404) {
        progressElement.textContent =
          "❌ YouTube rejection detected. DhruvTube automatically deleted the private video.";

        return {
          success: false,
          action: "deleted"
        };
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          "YouTube status check failed."
        );
      }

      const processing =
        data.processingStatus || "unknown";

      const upload =
        data.uploadStatus || "unknown";

      const privacy =
        data.privacyStatus || "unknown";

      if (
        data.failureReason ||
        data.rejectionReason
      ) {
        progressElement.textContent =
          `❌ YouTube rejection: ${
            data.rejectionReason ||
            data.failureReason
          }`;

        return {
          ...data,
          action: "deleted"
        };
      }

      if (
        processing === "processed" &&
        upload === "uploaded"
      ) {
        if (privacy === "public") {
          progressElement.textContent =
            "✅ YouTube check completed. Video is now PUBLIC automatically.";

          return {
            ...data,
            action: "published"
          };
        }

        progressElement.textContent =
          "⏳ YouTube processing complete. Automatic Public conversion is in progress...";
      } else {
        progressElement.textContent =
          `⏳ YouTube processing/check: ${processing} (${attempt}/${maxAttempts})`;
      }

      await new Promise(resolve =>
        setTimeout(resolve, 5000)
      );

    } catch (error) {
      console.error(
        "YouTube status check error:",
        error
      );

      progressElement.textContent =
        "❌ YouTube status check failed: " +
        error.message;

      return {
        success: false,
        action: "check_failed",
        message: error.message
      };
    }
  }

  progressElement.textContent =
    "⏳ YouTube is still processing/checking. Video remains PRIVATE.";

  return {
    success: false,
    action: "still_processing"
  };
}

    ytButton.onclick = async () => {
      try {
        ytButton.disabled = true;
        ytButton.textContent = "Checking YouTube account...";

        const accountResponse =
          await fetch(`${API}/youtube/status`);

        const account = await accountResponse.json();

        if (!account.connected) {
          throw new Error(
            "YouTube account connected nahi hai."
          );
        }

        const channelName =
          account.channel?.title ||
          "connected YouTube channel";

        ytButton.textContent =
          "Uploading to YouTube...";

        progress.textContent =
          `Uploading to: ${channelName}`;

        const yt =
          await uploadLocalVideoToYouTube(
            data.video.filename,
            titleInput.value.trim() ||
              "Untitled Video",
            descriptionInput.value.trim()
          );

        if (yt.videoId) {
          progress.textContent =
            "🔒 Uploaded to YouTube as PRIVATE. Starting YouTube processing/check...";

          const result =
            await checkYouTubeVideoStatus(
              yt.videoId,
              progress
            );

          if (result?.action === "deleted") {
            progress.textContent =
              "❌ YouTube rejection detected. DhruvTube automatically deleted the private video.";
          } else if (
            result?.action === "published"
          ) {
            progress.textContent =
              "✅ YouTube check completed. Video is now PUBLIC automatically.";
          } else if (
            result?.action === "still_processing"
          ) {
            progress.textContent =
              "⏳ YouTube is still checking the video. It remains PRIVATE.";
          } else if (
            result?.privacyStatus === "public"
          ) {
            progress.textContent =
              "✅ Video is now PUBLIC on YouTube.";
          }
        }

        if (yt.url) {
          const openLink =
            document.createElement("a");

          openLink.href = yt.url;
          openLink.target = "_blank";
          openLink.rel =
            "noopener noreferrer";
          openLink.textContent =
            "Open on YouTube";

          openLink.style.cssText = `
            display:block;
            margin-top:10px;
            text-align:center;
            font-weight:600;
          `;

          progress.parentElement.appendChild(
            openLink
          );
        }

        ytButton.disabled = false;
        ytButton.textContent =
          "🚀 YouTube: Private → Check → Public";

      } catch (error) {
        console.error(
          "YouTube upload flow error:",
          error
        );

        progress.textContent =
          "❌ YouTube upload/check failed: " +
          error.message;

        ytButton.disabled = false;
        ytButton.textContent =
          "🚀 YouTube: Private → Check → Public";
      }
    };

    setTimeout(() => {

      const form =
        document.getElementById(
          "dhruvUploadForm"
        );

      if (form) {
//         form.remove();
      }

    }, 800);


    await loadVideos();


  } catch (error) {

    console.error(
      "Upload error:",
      error
    );


    progress.textContent =
      "Upload failed: " +
      error.message;


    button.disabled = false;

    button.textContent =
      "Upload Video";
  }
}


// ===============================
// HTML SAFETY
// ===============================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ===============================
// GOOGLE LOGIN CALLBACK
// ===============================

(function handleGoogleLoginCallback() {
  const params = new URLSearchParams(window.location.search);
  const encodedUser = params.get("user");
  const googleLogin = params.get("google_login");

  if (googleLogin === "success" && encodedUser) {
    try {
      const base64 = encodedUser
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const padded =
        base64 + "=".repeat((4 - base64.length % 4) % 4);

      const user = JSON.parse(
        decodeURIComponent(
          Array.from(atob(padded))
            .map(char =>
              "%" + char.charCodeAt(0).toString(16).padStart(2, "0")
            )
            .join("")
        )
      );

      if (user && user.id) {
        localStorage.setItem(
          "dhruvtube_user",
          JSON.stringify(user)
        );
      }

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    } catch (error) {
      console.error("Google login callback error:", error);
    }
  }
})();

// ===============================
// AUTH / ACCOUNT
// ===============================

let currentUser = null;

const authModal = document.getElementById("authModal");
const authClose = document.getElementById("authClose");
const loginBtn = document.getElementById("loginBtn");
const loginSubmit = document.getElementById("loginSubmit");
const registerSubmit = document.getElementById("registerSubmit");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const authLoginForm = document.getElementById("authLoginForm");
const authRegisterForm = document.getElementById("authRegisterForm");
const authTitle = document.getElementById("authTitle");

function openAuthModal() {
  window.location.href = "/api/youtube/connect";
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function updateAccountUI() {
  const avatar = document.getElementById("accountAvatar");
  const name = document.getElementById("accountName");
  const handle = document.getElementById("accountHandle");
  const loginButton = document.getElementById("loginBtn");
  const loggedIn = document.getElementById("accountLoggedIn");
  const topAvatar = document.getElementById("profileBtn");

  if (!currentUser) {
    avatar.textContent = "D";
    name.textContent = "DhruvTube";
    handle.textContent = "@dhruvtube";
    loginButton.classList.remove("hidden");
    loggedIn.classList.add("hidden");
    topAvatar.style.backgroundImage = "";
    topAvatar.textContent = "D";
    return;
  }

  const initial =
    (currentUser.username || "D").charAt(0).toUpperCase();

  avatar.textContent = initial;
  name.textContent = currentUser.username || "DhruvTube";
  handle.textContent =
    "@" + (currentUser.username || "dhruvtube").toLowerCase();

  loginButton.classList.add("hidden");
  loggedIn.classList.remove("hidden");
  if (currentUser.avatar) {
    topAvatar.style.backgroundImage = `url("${currentUser.avatar}")`;
    topAvatar.style.backgroundSize = "cover";
    topAvatar.style.backgroundPosition = "center";
    topAvatar.textContent = "";
  } else {
    topAvatar.style.backgroundImage = "";
    topAvatar.textContent = initial;
  }
}

function saveCurrentUser(user) {
  currentUser = user;
        // login storage disabled for logout test
  updateAccountUI();
}

function loadCurrentUser() {
  try {
    const saved = localStorage.getItem("dhruvtube_user");

    if (saved) {
      currentUser = JSON.parse(saved);
    }
  } catch (error) {
    console.error("Load user error:", error);
    currentUser = null;
  }

  updateAccountUI();
}

localStorage.removeItem("dhruvtube_user"); currentUser = null;
loadCurrentUser();



function updateAccountPopup() {
  const popupName = document.getElementById("popupName");
  const popupEmail = document.getElementById("popupEmail");
  const popupAvatar = document.getElementById("popupAvatar");
  const signIn = document.getElementById("popupSignIn");
  const viewChannel = document.getElementById("popupViewChannel");
  const signOut = document.getElementById("popupSignOut");

  if (!popupName || !popupEmail || !popupAvatar) return;

  if (!currentUser) {
    popupName.textContent = "DhruvTube";
    popupEmail.textContent = "Not signed in";
    popupAvatar.textContent = "D";

    signIn.classList.remove("hidden");
    signIn.textContent = "Sign in with Google";
    viewChannel.classList.add("hidden");
    signOut.classList.add("hidden");

    return;
  }

  const initial =
    (currentUser.username || "D").charAt(0).toUpperCase();

  popupName.textContent =
    currentUser.username || "DhruvTube";

  popupEmail.textContent =
    currentUser.email || "";

  popupAvatar.textContent = initial;

  signIn.classList.remove("hidden");
  signIn.textContent = "Switch Google account";
  viewChannel.classList.remove("hidden");
  signOut.classList.remove("hidden");
}

document.getElementById("popupSignIn").onclick = () => {
  document.getElementById("accountPopup").classList.add("hidden");
  openAuthModal();
};

const accountAddBtn = document.getElementById("accountAddBtn");

if (accountAddBtn) {
  accountAddBtn.onclick = () => {
    document.getElementById("accountPopup").classList.add("hidden");
    openAuthModal();
  };
}

document.getElementById("popupViewChannel").onclick = () => {
  document.getElementById("accountPopup").classList.add("hidden");
  showPage("profile");
  updateAccountUI();
};

function logoutCurrentUser() {
  currentUser = null;

  localStorage.removeItem("dhruvtube_user");
  sessionStorage.removeItem("dhruvtube_user");

  const popup = document.getElementById("accountPopup");
  if (popup) popup.classList.add("hidden");

  updateAccountUI();
  updateAccountPopup();

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );

  window.location.reload();
}

const popupSignOutButton = document.getElementById("popupSignOut");

if (popupSignOutButton) {
  popupSignOutButton.onclick = function (event) {
    event.preventDefault();
    event.stopPropagation();
    logoutCurrentUser();
  };
}

loginBtn.onclick = () => {
  openAuthModal();
};

authClose.onclick = () => {
  closeAuthModal();
};

showRegister.onclick = () => {
  authLoginForm.classList.add("hidden");
  authRegisterForm.classList.remove("hidden");
  authTitle.textContent = "Create your DhruvTube account";
};

showLogin.onclick = () => {
  authRegisterForm.classList.add("hidden");
  authLoginForm.classList.remove("hidden");
  authTitle.textContent = "Sign in to DhruvTube";
};

loginSubmit.onclick = async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const message = document.getElementById("loginMessage");

  if (!email || !password) {
    message.textContent = "Enter email and password.";
    return;
  }

  loginSubmit.disabled = true;
  loginSubmit.textContent = "Signing in...";
  message.textContent = "";

  try {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Login failed.");
    }

    saveCurrentUser(data.user);
    closeAuthModal();

    showPage("profile");

  } catch (error) {
    message.textContent = error.message;
  }

  loginSubmit.disabled = false;
  loginSubmit.textContent = "Sign in";
};

registerSubmit.onclick = async () => {
  const username =
    document.getElementById("registerUsername").value.trim();

  const email =
    document.getElementById("registerEmail").value.trim();

  const password =
    document.getElementById("registerPassword").value;

  const message =
    document.getElementById("registerMessage");

  if (!username || !email || !password) {
    message.textContent =
      "Enter username, email and password.";
    return;
  }

  registerSubmit.disabled = true;
  registerSubmit.textContent = "Creating...";
  message.textContent = "";

  try {
    const response = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Registration failed."
      );
    }

    saveCurrentUser(data.user);
    closeAuthModal();

    showPage("profile");

  } catch (error) {
    message.textContent = error.message;
  }

  registerSubmit.disabled = false;
  registerSubmit.textContent = "Create account";
};

document.getElementById("logoutBtn").onclick = () => {
  currentUser = null;
  localStorage.removeItem("dhruvtube_user");
  updateAccountUI();
  showPage("profile");
};

localStorage.removeItem("dhruvtube_user"); currentUser = null;
loadCurrentUser();
updateAccountPopup();


// ===============================
// START
// ===============================

loadVideos();

console.log("DHruvTube JS LOADED");

document.addEventListener("DOMContentLoaded", () => {
  const youBtn = document.querySelector('.nav[data-page="profile"]');

  if (youBtn) {
    console.log("YOU BUTTON FOUND");

    youBtn.addEventListener("click", () => {
      console.log("YOU BUTTON CLICKED");
      showPage("profile");
    });
  } else {
    console.log("YOU BUTTON NOT FOUND");
  }
});

async function uploadLocalVideoToYouTube(filename, title, description, tags = "", privacyStatus = "private", publishAt = "", thumbnailFilename = "") {
  const statusResponse = await fetch(`${API}/youtube/status`);
  const status = await statusResponse.json();

  if (!status.connected) {
    throw new Error("YouTube account connected nahi hai. Pehle YouTube account connect karo.");
  }

  const response = await fetch(`${API}/youtube/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filename,
      title: title || "Untitled Video",
      description: description || "",
      tags: tags || "",
      privacyStatus: privacyStatus || "private",
      publishAt: publishAt || "",
      thumbnailFilename: thumbnailFilename || ""
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "YouTube upload failed.");
  }

  return data;
}

console.log("DhruvTube YouTube uploader ready");

/* ===============================
   ACCOUNT POPUP - SINGLE CLICK HANDLER
   =============================== */

document.addEventListener("click", function (event) {
  const target = event.target;

  const addBtn = target.closest("#accountAddBtn");
  const switchBtn = target.closest("#popupSignIn");
  const channelBtn = target.closest("#popupViewChannel");
  const signOutBtn = target.closest("#popupSignOut");

  if (addBtn || switchBtn) {
    event.preventDefault();
    openAuthModal();
    return;
  }

  if (channelBtn) {
    event.preventDefault();

    const popup = document.getElementById("accountPopup");
    if (popup) popup.classList.add("hidden");

    if (typeof showPage === "function") {
      showPage("profile");
    }

    if (typeof updateAccountUI === "function") {
      updateAccountUI();
    }

  if (signOutBtn) {
    event.preventDefault();
    event.stopPropagation();

    if (typeof logoutCurrentUser === "function") {
      logoutCurrentUser();
    }

    return;
  }

    return;
  }


});
