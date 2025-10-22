import express from "express";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Endpoint: Add guest
app.post("/api/guest", async (req, res) => {
  const { name, email, phone } = req.body;
  const uuid = uuidv4();

  try {
    await db.query(
      "INSERT INTO guests (uuid, name, email, phone) VALUES (?, ?, ?, ?)",
      [uuid, name, email || "", phone || ""]
    );
    res.json({ uuid, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint: Get guest by UUID
app.get("/api/guest/:uuid", async (req, res) => {
  const { uuid } = req.params;

  try {
    const [rows] = await db.query("SELECT * FROM guests WHERE uuid = ?", [uuid]);
    if (rows.length === 0) return res.status(404).json({ error: "Hakuna mgeni" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
