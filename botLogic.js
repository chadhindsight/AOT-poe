const https = require("https");
const products = require("./products");

// ---------------------------
// Weather helpers
// ---------------------------
function getWeather(city) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return reject(new Error("No OpenWeather API key found"));

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200)
          return reject(new Error(`Weather API error: ${res.statusCode}`));
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

function formatWeather(weatherData) {
  const city = weatherData.name;
  const country = weatherData.sys.country;
  const main = weatherData.main;
  const weather = weatherData.weather[0];
  const wind = weatherData.wind || {};

  return `🌤️ Weather in ${city}, ${country}

📊 Current Conditions:
• Temperature: ${Math.round(main.temp)}°C
• Feels like: ${Math.round(main.feels_like)}°C
• Condition: ${weather.description}
• High/Low: ${Math.round(main.temp_max)}°C / ${Math.round(main.temp_min)}°C

💨 Additional Details:
• Humidity: ${main.humidity}%
• Pressure: ${main.pressure} hPa
• Wind Speed: ${wind.speed || 0} m/s`;
}

// ---------------------------
// Product helpers
// ---------------------------
function getProductInfo(query) {
  const lowerQuery = query.toLowerCase();

  // 1. Match by keywords in product name or type
  const matched = products.filter((p) => {
    const name = p.name.toLowerCase();
    return lowerQuery
      .split(/\s+/)
      .some((word) => name.includes(word) || p.type?.toLowerCase()?.includes(word));
  });

  // 2. Check special commands
  if (/cheapest/.test(lowerQuery)) {
    const cheapest = [...products].sort((a, b) => a.price - b.price)[0];
    const price = cheapest.discount ? (cheapest.price * 0.85).toFixed(2) : cheapest.price.toFixed(2);
    return `🏄 Cheapest board: ${cheapest.name} - $${price} (${cheapest.stock} in stock) ${cheapest.discount ? "🔥 15% OFF!" : ""}`;
  }

  if (/most expensive|priciest/.test(lowerQuery)) {
    const expensive = [...products].sort((a, b) => b.price - a.price)[0];
    const price = expensive.discount ? (expensive.price * 0.85).toFixed(2) : expensive.price.toFixed(2);
    return `🏄 Most expensive board: ${expensive.name} - $${price} (${expensive.stock} in stock) ${expensive.discount ? "🔥 15% OFF!" : ""}`;
  }

  if (matched.length === 0) return "No matching surfboards or accessories found.";

  return matched
    .map((p) => {
      const price = p.discount ? (p.price * 0.85).toFixed(2) : p.price.toFixed(2);
      return `🏄 ${p.name} - $${price} (${p.stock} in stock) ${p.discount ? "🔥 15% OFF!" : ""}`;
    })
    .join("\n");
}

// ---------------------------
// Intent helpers
// ---------------------------
function parseIntents(message) {
  const msg = message.toLowerCase();
  const intents = [];

  if (/(surfboard|board|wax|accessory|price|stock|discount|cheapest|most expensive)/.test(msg)) intents.push("product");
  if (/(weather|temperature|forecast|surf)/.test(msg) && !/surfboard|board/.test(msg)) intents.push("weather");
  if (intents.length === 0) intents.push("general");

  return intents;
}

function extractCity(message) {
  const match = message.match(/in ([a-zA-Z\s]+)/i);
  if (!match) return null;
  return match[1].trim().replace(/[?.!]/g, "");
}

// ---------------------------
// Main bot response
// ---------------------------
async function getBotResponse(userMessage) {
  const intents = parseIntents(userMessage);
  const replies = [];

  try {
    for (const intent of intents) {
      if (intent === "weather") {
        const city = extractCity(userMessage);
        if (!city) {
          replies.push("Please specify a city for the weather.");
        } else {
          const weatherData = await getWeather(city);
          replies.push(formatWeather(weatherData));
        }
      }

      if (intent === "product") {
        replies.push(getProductInfo(userMessage));
      }

      if (intent === "general") {
        replies.push("🏄‍♂️ Ask me about our surfboards, accessories, discounts, or the current weather for surfing!");
      }
    }

    return replies.join("\n\n");
  } catch (err) {
    console.error("Bot logic error:", err);
    return "⚠️ Sorry, I couldn't process your request. Try again!";
  }
}

module.exports = { getBotResponse };
