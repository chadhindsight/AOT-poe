
const express = require("express");
const cors = require("cors");
// Load .env
require("dotenv").config(); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  try {
   const response = await fetch("https://api.poe.com/bot/gpt-4o-mini", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.POE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: userMessage }),
});

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Backend error calling Poe API" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
