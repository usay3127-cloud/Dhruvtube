const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const thumbnailDir = path.join(__dirname, "uploads", "thumbnails");

if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, thumbnailDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG or WEBP thumbnails are allowed."));
    }

    cb(null, true);
  }
});

router.post("/youtube/thumbnail-upload", (req, res) => {
  upload.single("thumbnail")(req, res, error => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Thumbnail upload failed."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Thumbnail file is required."
      });
    }

    res.json({
      success: true,
      filename: req.file.filename
    });
  });
});

module.exports = router;
