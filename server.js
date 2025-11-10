
const express = require("express");
const cors = require("cors");
// Load .env
require("dotenv").config(); 

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) return res.status(400).json({ error: "No message provided" });

  try {
    const response = await fetch("https://api.poe.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.POE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: userMessage }]
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Poe API returned non-OK status:", response.status, text);
      return res.status(response.status).send(text);
    }

    const data = await response.json();
    const botReply = data.choices?.[0]?.message?.content || "No reply";
    res.json({ reply: botReply });
  } catch (err) {
    console.error("Error calling Poe API:", err);
    res.status(500).json({ error: "Backend error calling Poe API", details: err.message });
  }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}!`));
