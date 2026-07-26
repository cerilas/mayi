const { GoogleGenAI } = require("@google/genai");

async function run() {
  require('dotenv').config({ path: '.env.local' });
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.list();
    for (const model of response) {
      if (model.name.includes("pro")) {
        console.log(model.name);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
