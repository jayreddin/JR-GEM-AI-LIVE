/**
 * Core Image Generation Logic Module.
 * Handles API calls, state management, and processing for image generation/editing.
 */
export class ImageGenerator {
    constructor(agent) {
        this.imageDisplay = document.getElementById('imgGenContent')?.querySelector('.image-display');
        this.apiKey = null;

        if (!this.imageDisplay) {
            console.error("ImageGenerator could not find the '.image-display' element within '#imgGenContent'.");
        }
        console.log("ImageGenerator initialized.");
        this._loadApiKey();
    }

    _loadApiKey() {
        try {
            this.apiKey = localStorage.getItem('apiKey');
            if (!this.apiKey) {
                console.error("ImageGenerator: Gemini API Key not found in localStorage.");
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

        if (!this.imageDisplay || !this.apiKey) {
            this.displayError(!this.apiKey ? "API Key missing. Check settings." : "Image display area not found.");
            return;
        }

        // Show loading state
        this.imageDisplay.innerHTML = '<div class="placeholder-text">Generating image(s)...</div>';

        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${this.apiKey}`;
            const requestBody = this._prepareRequestBody(requestDetails);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const responseData = await response.json();
            await this._processResponse(responseData);

        } catch (error) {
            console.error("Error during image generation:", error);
            this.displayError(`Failed to generate image(s): ${error.message}`);
        }
    }

    _prepareRequestBody(requestDetails) {
        // Construct the prompt with size and filter instructions
        let fullPrompt = requestDetails.prompt;
        if (requestDetails.filters.size && requestDetails.filters.size !== '512x512') {
            fullPrompt += ` (Image size: ${requestDetails.filters.size})`;
        }
        if (requestDetails.filters.filter && requestDetails.filters.filter !== 'none') {
            fullPrompt += ` (Style: ${requestDetails.filters.filter})`;
        }

        // Base content structure
        const contents = [{ 
            role: "user", 
            parts: [{ text: fullPrompt }] 
        }];

        // Add image data if editing
        if (requestDetails.isEditing && requestDetails.uploadedImage?.data) {
            const base64Data = requestDetails.uploadedImage.data.split(',')[1];
            const mimeType = requestDetails.uploadedImage.file.type || 'image/png';
            contents[0].parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        }

        return {
            contents: contents,
            generationConfig: {
                candidateCount: parseInt(requestDetails.filters.amount, 10) || 1,
                temperature: parseFloat(requestDetails.filters.weirdness) || 1.0
            }
        };
    }

    async _processResponse(responseData) {
        this.imageDisplay.innerHTML = ''; // Clear previous content
        let imagesFound = 0;

        if (!responseData.candidates?.length) {
            const blockReason = responseData.promptFeedback?.blockReason;
            throw new Error(blockReason ? `Blocked: ${blockReason}` : "No images generated");
        }

        // Process each part looking only for images
        for (const part of responseData.candidates[0].content.parts) {
            if (part.inlineData?.mimeType.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                img.classList.add('generated-image');
                img.alt = `Generated image ${imagesFound + 1}`;
                
                // Add click handler for image preview/download

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
