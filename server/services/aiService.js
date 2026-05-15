const { GoogleGenerativeAI } = require('@google/generative-ai');

const generateCaptionAndHashtags = async (base64Image) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error("GEMINI_API_KEY is not configured in .env");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = "You are a social media expert. Generate a catchy, engaging caption and 5 relevant trending hashtags for this image. Keep it under 300 characters total. Do not use quotes around the caption.";

    if (base64Image) {
      // Clean up base64 string if it contains data URI scheme
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      
      const imageParts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg" // fallback
          }
        }
      ];
      
      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      return response.text();
    } else {
      const textOnlyPrompt = "Generate a catchy, aesthetic social media caption about having a great day, including 5 hashtags. Do not use quotes.";
      const result = await model.generateContent(textOnlyPrompt);
      const response = await result.response;
      return response.text();
    }
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};

const generateSmartReplies = async (messageText) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') return ["Sounds good!", "I'm in!", "Thanks!"];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an AI generating 3 short, conversational, human-like quick reply suggestions for a social media chat. The last message received was: "${messageText}". Generate exactly 3 short replies (max 4-5 words each). Return ONLY a JSON array of strings, like ["reply 1", "reply 2", "reply 3"] without markdown blocks.`;
    
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    
    // Parse the JSON array. If it fails, fallback to defaults.
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3);
    } catch (e) {
      console.error("Failed to parse smart replies:", text);
    }
    return ["Nice!", "Okay", "Got it"];
  } catch (error) {
    console.error("Smart Replies Error:", error);
    return ["Yes", "No", "Thanks"]; // Safe fallback
  }
};

const generateBio = async (keywords) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') return "Passionate about life and building cool things.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert social media profile bio writer. Generate a very short, aesthetic, catchy bio based on these keywords/vibes: "${keywords || 'creative, coding, chill'}". Keep it under 150 characters. Include 1-2 emojis. Do not use quotes.`;
    
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    return text.trim().substring(0, 200);
  } catch (error) {
    console.error("Generate Bio Error:", error);
    return "Exploring the world one day at a time 🌎✨"; 
  }
};

const moderateContent = async (text) => {
  if (!text) return { isToxic: false };
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') return { isToxic: false };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze the following text for severe toxicity, hate speech, severe harassment, or explicit NSFL content. Text: "${text}". Reply strictly with a JSON object: {"isToxic": true} or {"isToxic": false}. Do not return anything else.`;
    
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    
    const parsed = JSON.parse(responseText.replace(/```json|```/g, '').trim());
    return { isToxic: parsed.isToxic === true };
  } catch (error) {
    console.error("Content Moderation Error:", error);
    return { isToxic: false }; // Fail open if API errors
  }
};

const generateBotReply = async (messageText) => {
  if (!messageText) return "Hello! I am Vibe Bot.";
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') return "Sorry, my brain (API key) is currently disconnected!";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are "Vibe Bot", a friendly, fun, and slightly sarcastic AI assistant built into a social media app called Vibe. Reply to the user's message conversationally and concisely. User says: "${messageText}"`;
    
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) {
    console.error("Bot Reply Error:", error);
    return "I'm having some trouble thinking right now. 🤖💤";
  }
};

module.exports = {
  generateCaptionAndHashtags,
  generateSmartReplies,
  generateBio,
  moderateContent,
  generateBotReply
};
