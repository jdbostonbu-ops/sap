// proxy.js — Local Development Proxy Server
// Run with: node proxy.js
// Keeps your GOOGLE_API_KEY safe — it never touches the browser
//
// Usage:
//   1. Add your key to .env (see .env.example)
//   2. Run: node proxy.js
//   3. Run your Live Server on port 5500 as usual
//   4. The proxy runs on port 3001

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors({ origin: ["http://localhost:5500", "http://127.0.0.1:5500"] }));

app.post("/api/review", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error("❌  GOOGLE_API_KEY not found in .env");
    return res.status(500).json({ error: "API key not configured — check your .env file" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log(`✅  Review completed (${text.length} chars)`);
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Proxy error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🛡️  SAP Proxy running on http://localhost:${PORT}`);
  console.log(`   Forwarding /api/review → Google Gemini`);
  console.log(`   API Key: ${process.env.GOOGLE_API_KEY ? "✅ loaded" : "❌ NOT FOUND — check .env"}\n`);
});
