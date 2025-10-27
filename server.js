import express from "express";
import mysql from "mysql2";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

// 🧩 Connect to MySQL
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

// 🔠 Helper: Generate random 6-character code
function generateCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ✅ API: Add new guest
app.post("/api/guest", (req, res) => {
  const { name, email, phone, type, hasSmartphone } = req.body;

  if (!name) return res.status(400).json({ error: "Guest name is required" });

  const uuid = uuidv4();
  const verifyCode = !hasSmartphone ? generateCode(6) : null; // only for guests without smartphones

  db.query(
    "INSERT INTO guests (uuid, name, email, phone, type, verify_code) VALUES (?, ?, ?, ?, ?, ?)",
    [uuid, name, email || null, phone || null, type || "single", verifyCode],
    (err) => {
      if (err) {
        console.error("❌ Error inserting guest:", err.message);
        return res.status(500).json({ error: "Failed to add guest" });
      }

      console.log("✅ New guest added:", name);
      res.status(201).json({
        message: "Guest added successfully",
        uuid,
        verifyCode,
      });
    }
  );
});

// ✅ API: Verify guest (QR code or manual code)
app.post("/api/verify", (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Verification code required" });

  const sql = `
    SELECT * FROM guests
    WHERE uuid = ? OR verify_code = ?
  `;

  db.query(sql, [code, code], (err, results) => {
    if (err) {
      console.error("❌ Verification error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Code not found or invalid" });
    }

    const guest = results[0];

    if (guest.checked_in) {
      return res.status(409).json({
        message: "⚠️ Guest already checked in!",
        guest,
      });
    }

    // ✅ Mark guest as checked-in
    db.query(
      "UPDATE guests SET checked_in = 1, checkin_time = NOW() WHERE id = ?",
      [guest.id],
      (updateErr) => {
        if (updateErr) {
          console.error("❌ Update error:", updateErr);
          return res.status(500).json({ message: "Failed to mark check-in" });
        }

        console.log(`✅ ${guest.name} verified and checked-in`);
        res.status(200).json({
          message: "Guest verified and checked-in successfully 🎉",
          guest: { ...guest, checked_in: 1 },
        });
      }
    );
  });
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
