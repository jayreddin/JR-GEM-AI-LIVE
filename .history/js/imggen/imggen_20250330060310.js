/**
 * Core Image Generation Logic Module.
 * Handles API calls, state management, and processing for image generation/editing.
 */
import { getApiKey } from '../config/config.js'; // Assuming API key retrieval function

export class ImageGenerator {
    constructor(agent) {
        // We might not need the agent if we use fetch directly
        // this.agent = agent;
        this.imageDisplay = document.getElementById('imgGenContent')?.querySelector('.image-display'); // Cache the display area
        this.apiKey = null; // Store API key

        if (!this.imageDisplay) {
            console.error("ImageGenerator could not find the '.image-display' element within '#imgGenContent'.");
        }
        console.log("ImageGenerator initialized.");
        this._loadApiKey(); // Load API key on init
    }

     _loadApiKey() {
        try {
            this.apiKey = getApiKey(); // Use the config function
            if (!this.apiKey) {
                console.error("ImageGenerator: Failed to load Gemini API key from config.");
                this.displayError("API Key not configured. Please check settings.");
            }
        } catch (error) {
             console.error("ImageGenerator: Error loading API key:", error);
             this.displayError("Error loading API Key.");
        }
    }

    /**
     * Processes an image generation or editing request using fetch.
     * @param {object} requestDetails - Contains prompt, mode, isEditing, uploadedImage, filters.
     */
    async processRequest(requestDetails) {
        console.log("ImageGenerator received request:", requestDetails);

        if (!this.imageDisplay) {
            console.error("Cannot process request: Image display area not found.");
            return; // Exit if display area isn't found
        }
         if (!this.apiKey) {
             console.error("Cannot process request: API Key missing.");
             this.displayError("API Key is missing. Please configure it in settings.");
             return; // Exit if no API key
         }

        // Show loading state
        this.imageDisplay.innerHTML = '<div class="placeholder-text">Generating image(s)...</div>';

        // --- Prepare API Request ---
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${this.apiKey}`;

        // Construct the prompt including size and filter instructions
        let fullPrompt = requestDetails.prompt;
        if (requestDetails.filters.size && requestDetails.filters.size !== '512x512') { // Assuming 512x512 is default
            fullPrompt += ` (Image size: ${requestDetails.filters.size})`;
        }
        if (requestDetails.filters.filter && requestDetails.filters.filter !== 'none') {
            fullPrompt += ` (Style: ${requestDetails.filters.filter})`;
        }

        // Construct contents array
        const contents = [{ role: "user", parts: [{ text: fullPrompt }] }];

        // Add image data if editing
        if (requestDetails.isEditing && requestDetails.uploadedImage?.data) {
            try {
                // Extract base64 data (assuming data is a data URL like 'data:image/png;base64,...')
                const base64Data = requestDetails.uploadedImage.data.split(',')[1];
                const mimeType = requestDetails.uploadedImage.file.type || 'image/png'; // Get MIME type from file object

                contents[0].parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
                console.log("Added uploaded image to request contents.");
            } catch (e) {
                console.error("Error processing uploaded image data:", e);
                this.displayError("Failed to process uploaded image.");
                return;
            }
        }

        // Construct generationConfig
        const generationConfig = {
            candidateCount: parseInt(requestDetails.filters.amount, 10) || 1,
            temperature: parseFloat(requestDetails.filters.weirdness) || 1.0,
            // Add other config params like topP, topK if needed/available
        };

        // Construct request body
        const requestBody = {
            contents: contents,
            generationConfig: generationConfig,
            // Safety settings can be added here if required
            // safetySettings: [...]
        };

        console.debug("API Request Body:", JSON.stringify(requestBody, null, 2)); // Log the request body for debugging

        // --- Make API Call using fetch ---
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorBody = await response.text(); // Read error body as text
                console.error(`API Error ${response.status}: ${response.statusText}`, errorBody);
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }

            const responseData = await response.json();
            console.log("API Response:", responseData);

            // --- Process Response ---
            this.imageDisplay.innerHTML = ''; // Clear loading/previous content
            let imagesFound = 0;
            let textResponse = '';

            if (responseData.candidates && responseData.candidates.length > 0) {
                // Process parts from the first candidate (usually)
                for (const part of responseData.candidates[0].content.parts) {
                    if (part.text) {
                        textResponse += part.text + "\n"; // Collect text parts
                    } else if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                        const img = document.createElement('img');
                        img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        img.classList.add('generated-image');
                        img.alt = `Generated image ${imagesFound + 1}`;
                        // TODO: Add click handlers for selection, download, etc.
                        this.imageDisplay.appendChild(img);
                        imagesFound++;
                    }
                }
            } else {
                 // Handle cases where no candidates are returned (e.g., safety blocks)
                 textResponse = responseData.promptFeedback?.blockReason
                    ? `Blocked: ${responseData.promptFeedback.blockReason}`
                    : "No content generated.";
                 console.warn("No candidates found in response:", responseData);
            }


            // Display collected text if any
            if (textResponse.trim()) {
                // TODO: Display text in a more structured way, maybe using ChatManager?
                // For now, append it simply.
                const textDiv = document.createElement('div');
                textDiv.textContent = textResponse.trim();
                textDiv.style.width = '100%'; // Span full width below images
                textDiv.style.marginTop = '10px';
                this.imageDisplay.appendChild(textDiv);
            }

            if (imagesFound === 0 && !textResponse.trim()) {
                 this.displayError("Model did not return any images or text.");
            }

            console.log(`Image generation complete. Found ${imagesFound} images.`);

        } catch (error) {
            console.error("Error during image generation API call:", error);
            this.displayError(`Failed to generate image(s): ${error.message}`);
        }
    }

    /**
     * Displays an error message in the image display area.
     * @param {string} message - The error message to display.
     */
    displayError(message) {
        if (this.imageDisplay) {
            this.imageDisplay.innerHTML = `<div class="error-text">${message}</div>`;
        }
    }

    // TODO: Add methods for handling specific API calls (standard gen, edit, storybook, birthday)
    // TODO: Add state management for filters, modes if needed centrally.
}
