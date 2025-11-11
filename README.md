# AOT Chatbot Project
This repository contains the backend API for the EcoWave chatbot — a simple Node.js and Express-based server that processes user messages and returns automated responses.
It’s designed to help students understand how a chatbot backend works and how it can connect to a frontend webpage or app.

## ⚙️ How It Works

1. The server exposes a /webhook endpoint that accepts POST requests with a JSON payload.

2. The payload includes a user message and an access key.

3. The server analyzes the message and returns a relevant response (e.g., product info, discounts, greetings).

4. Frontend clients (like a landing page on Codesandbox or chat widget) can call this endpoint using fetch() or any HTTP client.

## 🧩 Tech Stack

Node.js – Runtime environment

Express.js – Web framework for routing and request handling

Render – Deployment platform for hosting the API