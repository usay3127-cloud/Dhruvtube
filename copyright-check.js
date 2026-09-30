const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

router.post("/copyright-check", (req, res) => {
  try {
    const { filename, title = "", description = "" } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: "Video filename is required."
      });
    }

    const videoPath = path.resolve(
      __dirname,
      "uploads",
      path.basename(String(filename))
    );

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        message: "Video file not found."
      });
    }

    const warnings = [];
    const text = `${title} ${description}`.toLowerCase();

    const riskyTerms = [
      "full movie",
      "movie clip",
      "episode",
      "official song",
      "full song",
      "copyrighted music"
    ];

    for (const term of riskyTerms) {
      if (text.includes(term)) {
        warnings.push(
          `Possible copyrighted/reused content indicator: "${term}"`
        );
      }
    }

    res.json({
      success: true,
      status: warnings.length ? "warning" : "low_risk",
      warnings,
      message: warnings.length
        ? "Potential copyright risk detected. YouTube may still perform its own Content ID check."
        : "No obvious copyright indicator found. This is not a guarantee of copyright clearance."
    });

  } catch (error) {
    console.error("Copyright check error:", error);

    res.status(500).json({
      success: false,
      message: "Copyright check failed."
    });
  }
});

module.exports = router;
