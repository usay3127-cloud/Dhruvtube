const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const uploadRouter = require("./upload");
const videosRouter = require("./videos");
const authRouter = require("./auth");
const youtubeRouter = require("./youtube");

const PORT = 3000;


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);


// ===============================
// STATIC FILES
// ===============================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);


// ===============================
// API ROUTES
// ===============================

app.use(
  "/api",
  uploadRouter
);

app.use(
  "/api",
  videosRouter
);

app.use(
  "/api",
  authRouter
);

app.use(
  "/api",
  youtubeRouter
);


// ===============================
// SERVER STATUS
// ===============================

app.get(
  "/api/status",
  (req, res) => {

    res.json({
      success: true,
      app: "DhruvTube",
      message: "DhruvTube server is running"
    });

  }
);


// ===============================
// FRONTEND FALLBACK
// ===============================

app.get(
  "/*splat",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


// ===============================
// START SERVER
// ===============================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `DhruvTube running at http://127.0.0.1:${PORT}`
    );

  }
);
