const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { getBotResponse } = require("./botLogic");
const {products} = require("./products")

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("Surfboard Bot server alive!"));

// Poe bot-style webhook
app.post("/webhook", async (req, res) => {
  const { access_key, user_message } = req.body;

  if (access_key !== process.env.POE_BOT_ACCESS_KEY) {
    return res.status(403).json({ error: "Invalid access key" });
  }

  if (!user_message) return res.status(400).json({ error: "No message provided" });

  try {
    const reply = await getBotResponse(user_message);
    res.json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Backend error", details: err.message });
  }
});

// Products API endpoint
app.get("/products", (req, res) => {
  try {
    res.json(products);
  } catch (err) {
    console.error("Products API error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.listen(PORT, () => console.log(`Surfboard Bot server running on port ${PORT}!`));
