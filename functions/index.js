/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenAI } = require('@google/genai');

admin.initializeApp();

// GEMINI_API_KEY should be set in Firebase functions config or secrets
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

/**
 * Proxy function to fetch clothing recommendations from Gemini.
 * This ensures the API key is hidden and allows access from restricted regions.
 */
exports.getNestRecommendation = functions.https.onCall(async (data, context) => {
  // Security check: Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { weather, childAge, language } = data;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Role: Expert Parenting Assistant for "Nest" app.
    Task: Translate weather data into simple clothing layers for a baby.
    Child Age: ${childAge} days.
    Weather: ${weather.temp}°C, ${weather.condition}, Humidity: ${weather.humidity}%, Wind: ${weather.wind} km/h.
    Language: ${language === 'ru' ? 'Russian' : 'English'}.

    Requirements:
    - Calm, supportive, expert tone.
    - NO images, ONLY text.
    - Provide a clear list of layers (e.g., "Body + cotton slip + seasonal jumpsuit").
    - Max 2 sentences of advice.
    - Return JSON format: { "clothing": string[], "advice": string, "confidence": number }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid AI response format");
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch recommendation.');
  }
});

/**
 * Proxy function for AI Chat.
 */
exports.nestAIChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { message, history, childInfo, weather, language } = data;
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are Nest, a supportive AI for parents. Tone: Calm, expert, caring. Language: ${language}.`
  });

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    return { text: response.text() };
  } catch (error) {
    console.error("Gemini Chat Proxy Error:", error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch chat response.');
  }
});
