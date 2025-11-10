const https = require("https");
const products = require("./products");

// Helper: fetch weather from OpenWeather
function getWeather(city) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return reject(new Error("No OpenWeather API key found"));

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error(`Weather API error: ${res.statusCode}`));
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

// Helper: format weather nicely
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

// Helper: find product info
function getProductInfo(query) {
  const lower = query.toLowerCase();
  const matched = products.filter(p => lower.includes(p.name.toLowerCase()));

  if (matched.length === 0) return "No matching surfboards or accessories found.";

  return matched.map(p => {
    const price = p.discount ? (p.price * 0.85).toFixed(2) : p.price.toFixed(2);
    return `🏄 ${p.name} - $${price} (${p.stock} in stock) ${p.discount ? "🔥 15% OFF!" : ""}`;
  }).join("\n");
}

// Parse intent
function parseIntent(message) {
  const msg = message.toLowerCase();
  if (/(weather|temperature|forecast|surf)/.test(msg)) return "weather";
  if (/(surfboard|board|wax|accessory|price|stock|discount)/.test(msg)) return "product";
  return "general";
}

// Main entry: returns formatted reply
async function getBotResponse(userMessage) {
  const intent = parseIntent(userMessage);

  try {
    if (intent === "weather") {
      // extract city
      const match = userMessage.match(/in ([a-zA-Z\s]+)/i);
      const city = match ? match[1].trim() : null;
      if (!city) return "Please specify a city for the weather.";
      const weatherData = await getWeather(city);
      return formatWeather(weatherData);
    }

    if (intent === "product") {
      return getProductInfo(userMessage);
    }

    // fallback/general
    return "🏄‍♂️ Ask me about our surfboards, accessories, discounts, or the current weather for surfing!";
  } catch (err) {
    console.error("Bot logic error:", err);
    return "⚠️ Sorry, I couldn't process your request. Try again!";
  }
}

module.exports = { getBotResponse };
