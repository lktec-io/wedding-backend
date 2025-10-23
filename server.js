import express from "express";
import mysql from "mysql2";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

// 🧩 Connect to MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Leonard1234#1234",
  database: "wedding",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅Database has been Connected to MySQL database");
  }
});

// 🧾 API route: Get all guests
app.get("/api/guest", (req, res) => {
  db.query("SELECT * FROM guests", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// 🧾 API route: Get one guest by UUID
app.get("/api/guest/:uuid", (req, res) => {
  const { uuid } = req.params;
  console.log("🔍 Received UUID:", uuid);

  db.query("SELECT * FROM guests WHERE uuid = ?", [uuid], (err, results) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    if (results.length === 0) {
      console.warn("⚠️ Guest not found for UUID:", uuid);
      return res.status(404).json({ message: "Guest not found" });
    }
    res.json(results[0]);
  });
});


// 🧩 API route: Add new guest (optional for now)
app.post("/api/guest", (req, res) => {
  const { name } = req.body;
  const uuid = uuidv4();

  db.query(
    "INSERT INTO guests (uuid, name) VALUES (?, ?)",
    [uuid, name],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Guest added successfully", uuid });
    }
  );
});

// 🚀 Start server
const PORT = 7000;
app.listen(7000, '0.0.0.0', () => {
  console.log("🚀 Server running on port 7000");
});

