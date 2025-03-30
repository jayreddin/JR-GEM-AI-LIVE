const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function generateImage() {
  const contents = "Hi, can you create a 3d rendered image of a pig " +
    "with wings and a top hat flying over a happy " +
    "futuristic scifi city with lots of greenery?";

  try {
    // Set responseModalities to include "Image" so the model can generate  an image
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: contents,
      config: {
        responseModalities: ['Text', 'Image']
      },
    });
    for (const part of response.candidates[0].content.parts) {
      // Based on the part type, either show the text or save the image
      if (part.text) {
        console.log(part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync('gemini-native-image.png', buffer);
        console.log('Image saved as gemini-native-image.png');
      }
    }
  } catch (error) {
    console.error("Error generating content:", error);
  }
}

generateImage();