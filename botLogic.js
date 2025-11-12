const https = require("https");
const products = require("./products");

// ---------------------------
// Conversation state management
// ---------------------------
const userStates = new Map();

function getUserState(userId) {
  if (!userStates.has(userId)) {
    userStates.set(userId, { context: null, lastIntent: null });
  }
  return userStates.get(userId);
}

function clearUserState(userId) {
  userStates.delete(userId);
}

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

  return `🌤️ Weather in ${city}, ${country}:

• Temperature: ${Math.round(main.temp)}°C (feels like ${Math.round(main.feels_like)}°C)
• Conditions: ${weather.description}
• High/Low: ${Math.round(main.temp_max)}°C / ${Math.round(main.temp_min)}°C
• Wind: ${wind.speed || 0} m/s
• Humidity: ${main.humidity}%`;
}

// ---------------------------
// Product helpers - Category-based
// ---------------------------
function getProductsByCategory(category = 'all', discountOnly = false) {
  let filtered = products;
  
  if (category !== 'all') {
    filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  
  if (discountOnly) {
    filtered = filtered.filter(p => p.discount);
  }
  
  return filtered;
}

function formatProductList(products, category = 'products') {
  if (products.length === 0) {
    return `No ${category} found matching your criteria.`;
  }

  return products.map(p => {
    const price = p.discount ? (p.price * 0.85).toFixed(2) : p.price.toFixed(2);
    const discountTag = p.discount ? " - 15% OFF" : "";
    return `🏄 ${p.name}: $${price} (${p.stock} in stock)${discountTag}`;
  }).join('\n');
}

function getCategoryFromQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  if (/(surfboard|board)/.test(lowerQuery)) return 'Surfboard';
  if (/wax/.test(lowerQuery)) return 'Wax';
  if (/(accessory|leash|fins|bag|wetsuit|repair)/.test(lowerQuery)) return 'Accessory';
  
  return 'all';
}

// ---------------------------
// Product conversation flow
// ---------------------------
function handleProductInquiry(query, userState) {
  const lowerQuery = query.toLowerCase();
  
  // Clear previous context if starting a new conversation
  if (!/(discount|sale|price|stock|buy)/.test(lowerQuery)) {
    userState.context = null;
  }

  // Handle specific product searches
  if (/(discounts?|on sale|sale)/.test(lowerQuery)) {
    const category = getCategoryFromQuery(query);
    
    if (category === 'all') {
      userState.context = 'awaiting_discount_category';
      return "I'd be happy to show you what's on sale! 🏄\n\nWhich category are you interested in?\n• Surfboards\n• Wax \n• Accessories\n• Or just say 'everything' to see all discounts";
    } else {
      const discounted = getProductsByCategory(category, true);
      if (discounted.length === 0) {
        return `No ${category.toLowerCase()} are currently on sale. Check out our other products though!`;
      }
      return `Here are the ${category.toLowerCase()} currently on sale: \n\n${formatProductList(discounted, category.toLowerCase())}`;
    }
  }

  // Handle category-specific requests
  const category = getCategoryFromQuery(query);
  if (category !== 'all') {
    const categoryProducts = getProductsByCategory(category);
    return `Here are our ${category.toLowerCase()}s:\n\n${formatProductList(categoryProducts, category.toLowerCase())}`;
  }

  // Handle cheapest/most expensive
  if (/cheapest/.test(lowerQuery)) {
    const cheapest = [...products].sort((a, b) => a.price - b.price)[0];
    const price = cheapest.discount ? (cheapest.price * 0.85).toFixed(2) : cheapest.price.toFixed(2);
    return `Our most affordable option is:\n🏄 ${cheapest.name} - $${price} ${cheapest.discount ? "15% OFF!" : ""}\n\nPerfect for beginners or those on a budget!`;
  }

  if (/most expensive|priciest/.test(lowerQuery)) {
    const expensive = [...products].sort((a, b) => b.price - a.price)[0];
    const price = expensive.discount ? (expensive.price * 0.85).toFixed(2) : expensive.price.toFixed(2);
    return `Our premium high-performance option:\n🏄 ${expensive.name} - $${price} ${expensive.discount ? "15% OFF!" : ""}\n\nTop-tier quality for experienced surfers!`;
  }

  // Handle follow-up responses
  if (userState.context === 'awaiting_discount_category') {
    userState.context = null;
    
    if (/(everything|all|show all)/.test(lowerQuery)) {
      const allDiscounted = getProductsByCategory('all', true);
      if (allDiscounted.length === 0) return "No products are currently on sale.";
      return `Here's everything currently on sale: n\n${formatProductList(allDiscounted, 'discounted products')}`;
    }
    
    const category = getCategoryFromQuery(query);
    if (category !== 'all') {
      const discounted = getProductsByCategory(category, true);
      if (discounted.length === 0) {
        return `No ${category.toLowerCase()} are currently on sale. Want to see our regular ${category.toLowerCase()} collection?`;
      }
      return `Here are the ${category.toLowerCase()} on sale: n\n${formatProductList(discounted, category.toLowerCase())}`;
    }
    
    return "Sorry, I didn't understand. Would you like to see discounts on surfboards, wax, or accessories?";
  }

  // Default product response
  const matched = products.filter(p =>
    lowerQuery.split(/\s+/).some(word => 
      p.name.toLowerCase().includes(word) || 
      p.description.toLowerCase().includes(word)
    )
  );

  if (matched.length > 0) {
    return `I found these products matching your search:\n\n${formatProductList(matched, 'matching products')}`;
  }

  return "I can help you with:\n• Specific products or categories\n• What's on sale\n• Price ranges\n• Stock availability\n\nWhat are you looking for?";
}

// ---------------------------
// Surfing Tips & Advice
// ---------------------------
function getSurfingAdvice(query) {
  const lowerCaseQuery = query.toLowerCase();

  if (/(first board|beginner board|starting out|new to surfing|choose.*board)/.test(lowerCaseQuery)) {
    return `🏄 **Choosing Your First Board:**\n\nStart with a larger, stable board like the EcoWave Breeze or Mini. These are easier to paddle and stand up on, making learning much more successful!\n\n**My beginner picks:**\n• EcoWave Breeze - Great all-rounder\n• EcoWave Mini - Perfect for small waves\n• EcoWave Paddle Board - Maximum stability`;
  }

  if (/(wax|waxing|grip)/.test(lowerCaseQuery)) {
    return `🧴 **Waxing Tips:**\n\nUse the right wax for your water temperature:\n• **Tropical Wax** - For warm water (70°F+)\n• **Cold Water Wax** - Below 58°F\n• **All-Temp Wax** - Most conditions\n\nApply in circular motions for better grip!`;
  }

  if (/(care|maintain|clean|rinse|store)/.test(lowerCaseQuery) && !/wetsuit/.test(lowerCaseQuery)) {
    return `🔧 **Board Care:**\n\n• Rinse with fresh water after each use\n• Store out of direct sunlight\n• Use a board bag for protection\n• Avoid hot cars and extreme temperatures`;
  }

  if (/(wetsuit|neoprene|suit care)/.test(lowerCaseQuery)) {
    return `🤿 **Wetsuit Care:**\n\n• Rinse inside and out after use\n• Hang on wide hangers\n• Air dry away from sun/heat\n• Never machine dry\n• Your wetsuit will last years with proper care!`;
  }

  if (/(tips|advice|help|how to|learn)/.test(lowerCaseQuery)) {
    return `🌊 **Surfing Basics:**\n\n• Start with lessons\n• Practice popping up on land first\n• Use a leash always\n• Know your limits\n• Surf with buddies\n• Respect surf etiquette\n\nWant specific advice on gear or techniques?`;
  }

  return null;
}

// ---------------------------
// Intent helpers
// ---------------------------
function parseIntents(message) {
  const msg = message.toLowerCase();
  const intents = [];

  if (/(surfboard|board|wax|accessory|price|stock|thing|discount|cheapest|most expensive|buy|product)/.test(msg))
    intents.push("product");
  if (/(weather|temperature|forecast)/.test(msg) && !/surfboard|board/.test(msg))
    intents.push("weather");
  if (/(first board|beginner|waxing|care|maintain|tips|advice|how to|learn|wetsuit)/.test(msg))
    intents.push("advice");
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
async function getBotResponse(userMessage, userId = 'default') {
  const intents = parseIntents(userMessage);
  const userState = getUserState(userId);
  const replies = [];

  try {
    for (const intent of intents) {
      if (intent === "weather") {
        const city = extractCity(userMessage);
        if (!city) {
          replies.push("Sure, I can check the weather! 🌤️ Which city are you interested in? (e.g., 'weather in San Diego')");
        } else {
          const weatherData = await getWeather(city);
          replies.push(formatWeather(weatherData));
        }
      }

      if (intent === "product") {
        const productReply = handleProductInquiry(userMessage, userState);
        replies.push(productReply);
      }

      if (intent === "advice") {
        const advice = getSurfingAdvice(userMessage);
        if (advice) {
          replies.push(advice);
        }
      }

      if (intent === "general") {
        // Clear context for new conversations
        clearUserState(userId);
        replies.push(
          "🏄‍♂️ Hey there! I'm your surf shop assistant. I can help you with:\n\n" +
          "• **Products**: Surfboards, wax, accessories, discounts\n" +
          "• **Weather**: Surf conditions for any city\n" +
          "• **Advice**: Beginner tips, gear care, techniques\n\n" +
          "What can I help you with today?"
        );
      }
    }

    return replies.join('\n\n');
  } catch (err) {
    clearUserState(userId);
    return "⚠️ Sorry, I'm having trouble right now. Try asking about our products, weather, or surfing tips!";
  }
}

module.exports = { getBotResponse };