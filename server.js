// server.js
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

// 🧩 Connect to MySQL (connection pool)
const db = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "Leonard1234#1234",
  database: "wedding",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log("✅ Connected to MySQL database (using connection pool)");

// ---------- Helpers ----------
function generateCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Small wrapper to run queries with promise
function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Healthcheck
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ✅ API: Get ALL guests
app.get("/api/guest", async (req, res) => {
  try {
    const results = await queryAsync("SELECT * FROM guests ORDER BY id");
    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching guests:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// ✅ API: Get guest by UUID
app.get("/api/guest/:uuid", async (req, res) => {
  const { uuid } = req.params;
  console.log("🔍 Guest requested:", uuid);
  try {
    const results = await queryAsync("SELECT * FROM guests WHERE uuid = ?", [uuid]);
    if (!results || results.length === 0) {
      console.log("⚠️ Guest not found for UUID:", uuid);
      return res.status(404).json({ message: "Guest not found" });
    }
    res.json(results[0]);
  } catch (err) {
    console.error("❌ Error fetching guest:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// ✅ API: Add new guest (creates verify_code for guests without smartphone)
app.post("/api/guest", async (req, res) => {
  const { name, email, phone, type, hasSmartphone } = req.body;
  if (!name) return res.status(400).json({ error: "Guest name is required" });

  const uuid = uuidv4();
  const verifyCode = hasSmartphone ? null : generateCode(6); // generate only for those without smartphone

  try {
    await queryAsync(
      "INSERT INTO guests (uuid, name, email, phone, type, verify_code, checked_in) VALUES (?, ?, ?, ?, ?, ?, 0)",
      [uuid, name, email || null, phone || null, type || "single", verifyCode]
    );

    console.log("✅ New guest added:", name);
    res.status(201).json({ message: "Guest added successfully", uuid, verifyCode });
  } catch (err) {
    console.error("❌ Error inserting guest:", err);
    res.status(500).json({ error: "Failed to add guest" });
  }
});

// ✅ API: Verify guest (accepts UUID OR verify_code). Marks checked_in and returns guest info.
app.post("/api/verify", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Verification code required" });

  try {
    const sql = "SELECT * FROM guests WHERE uuid = ? OR verify_code = ?";
    const results = await queryAsync(sql, [code, code]);

    if (!results || results.length === 0) {
      console.log("⚠️ Code not found:", code);
      return res.status(404).json({ message: "Code not found or invalid" });
    }

    const guest = results[0];

    if (guest.checked_in) {
      // already checked in
      return res.status(409).json({ message: "Guest already checked in", guest });
    }

    // mark as checked in
    await queryAsync("UPDATE guests SET checked_in = 1, checkin_time = NOW() WHERE id = ?", [guest.id]);

    console.log(`✅ ${guest.name} verified and checked-in`);
    // Return updated guest (fetch fresh)
    const updated = await queryAsync("SELECT * FROM guests WHERE id = ?", [guest.id]);
    res.status(200).json({ message: "Guest verified and checked-in", guest: updated[0] });
  } catch (err) {
    console.error("❌ Verification error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Optional: endpoint to bulk-assign verify_codes to guests missing them (admin use)
app.post("/api/admin/assign-codes", async (req, res) => {
  // WARNING: protect this route in production
  try {
    const rows = await queryAsync("SELECT id FROM guests WHERE verify_code IS NULL OR verify_code = ''");
    for (const r of rows) {
      const code = generateCode(6);
      await queryAsync("UPDATE guests SET verify_code = ? WHERE id = ?", [code, r.id]);
    }
    res.json({ message: "Assign completed", count: rows.length });
  } catch (err) {
    console.error("❌ assign-codes error:", err);
    res.status(500).json({ error: "Failed to assign codes" });
  }
});

// Default 404 (API)
app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));

// Start server
const PORT = 7000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
