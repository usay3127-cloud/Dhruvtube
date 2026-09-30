const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const router = express.Router();

const uploadDir = path.join(__dirname, "uploads");
const DB_FILE = path.join(__dirname, "dhruvtube.db");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const name =
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 10) +
      ext;

    cb(null, name);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed."));
    }
  }
});


async function openDatabase() {
  const SQL = await initSqlJs({
    locateFile: file => require.resolve("sql.js/dist/" + file)
  });

  if (fs.existsSync(DB_FILE)) {
    return new SQL.Database(fs.readFileSync(DB_FILE));
  }

  return new SQL.Database();
}


function saveDatabase(db) {
  const data = db.export();

  fs.writeFileSync(
    DB_FILE,
    Buffer.from(data)
  );
}


router.post(
  "/upload",
  upload.single("video"),
  async (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No video uploaded."
        });
      }


      const title =
        typeof req.body.title === "string" &&
        req.body.title.trim()
          ? req.body.title.trim()
          : "Untitled Video";


      const description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";


      const isShort =
        req.body.is_short === "1" ||
        req.body.is_short === "true"
          ? 1
          : 0;


      const db = await openDatabase();


      /*
        TEMPORARY LOCAL USER

        Authentication abhi nahi bana hai.
        Isliye local prototype me user_id = 1.
      */

      const guestUserId = 1;


      /*
        Ensure user #1 exists.
      */

      db.run(`
        INSERT OR IGNORE INTO users
        (
          id,
          username,
          email,
          password_hash
        )
        VALUES
        (
          1,
          'DhruvTube User',
          'local@dhruvtube.local',
          'local-prototype'
        )
      `);


      /*
        Save video metadata.
      */

      db.run(
        `
        INSERT INTO videos
        (
          user_id,
          title,
          description,
          filename,
          is_short
        )
        VALUES
        (?, ?, ?, ?, ?)
        `,
        [
          guestUserId,
          title,
          description,
          req.file.filename,
          isShort
        ]
      );


      const result = db.exec(`
        SELECT
          id,
          user_id,
          title,
          description,
          filename,
          thumbnail,
          views,
          is_short,
          created_at
        FROM videos
        ORDER BY id DESC
        LIMIT 1
      `);


      saveDatabase(db);

      db.close();


      const row =
        result[0].values[0];


      const savedVideo = {

        id: row[0],

        user_id: row[1],

        title: row[2],

        description: row[3] || "",

        filename: row[4],

        url:
          "/uploads/" +
          row[4],

        thumbnail: row[5],

        views: row[6] || 0,

        is_short: row[7] || 0,

        created_at: row[8],

        channel:
          "DhruvTube User",

        type:
          row[7]
            ? "Shorts"
            : "Video",

        time:
          "Just now",

        size:
          req.file.size,

        mimetype:
          req.file.mimetype
      };


      res.json({

        success: true,

        message:
          "Video uploaded and saved successfully.",

        video:
          savedVideo

      });


    } catch (error) {

      console.error(
        "Upload error:",
        error
      );


      /*
        Remove uploaded file
        if database save fails.
      */

      if (
        req.file &&
        req.file.path &&
        fs.existsSync(req.file.path)
      ) {

        try {

          fs.unlinkSync(
            req.file.path
          );

        } catch (deleteError) {

          console.error(
            "File cleanup error:",
            deleteError
          );

        }

      }


      res.status(500).json({

        success: false,

        message:
          "Upload failed.",

        error:
          error.message

      });

    }

  }
);


router.use(
  (err, req, res, next) => {

    console.error(
      "Upload middleware error:",
      err
    );

    res.status(400).json({

      success: false,

      message:
        err.message ||
        "Upload error."

    });

  }
);


module.exports = router;
