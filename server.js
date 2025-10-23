import express from "express";
import mysql from "mysql2";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

// 🧩 Connect to MySQL
const db = mysql.createPool({
  connectionLimit: 10,
  host: "127.0.0.1",
  user: "root",
  password: "Leonard1234#1234",
  database: "wedding",
});


db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

// ✅ API: Get all guests
app.get("/api/guest", (req, res) => {
  db.query("SELECT * FROM guests", (err, results) => {
    if (err) {
      console.error("❌ Error fetching guests:", err.message);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});

// ✅ API: Get guest by UUID
app.get("/api/guest/:uuid", (req, res) => {
  const { uuid } = req.params;
  console.log("🔍 Guest requested:", uuid);

  db.query("SELECT * FROM guests WHERE uuid = ?", [uuid], (err, results) => {
    if (err) {
      console.error("❌ MySQL error details:", err);
      return res.status(500).json({ error: err.message || "Database query failed" });
    }

    if (!results || results.length === 0) {
      console.log("⚠️ Guest not found for UUID:", uuid);
      return res.status(404).json({ message: "Guest not found" });
    }

    res.status(200).json(results[0]);
  });
});


// ✅ API: Add new guest
app.post("/api/guest", (req, res) => {
  const { name, email, phone, type } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Guest name is required" });
  }

  const uuid = uuidv4();

  db.query(
    "INSERT INTO guests (uuid, name, email, phone, type) VALUES (?, ?, ?, ?, ?)",
    [uuid, name, email || null, phone || null, type || "single"],
    (err, result) => {
      if (err) {
        console.error("❌ Error inserting guest:", err.message);
        return res.status(500).json({ error: "Failed to add guest" });
      }
      console.log("✅ New guest added:", name);
      res.status(201).json({ message: "Guest added successfully", uuid });
    }
  );
});

// 🧠 Default 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// 🚀 Start server
const PORT = 7000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
