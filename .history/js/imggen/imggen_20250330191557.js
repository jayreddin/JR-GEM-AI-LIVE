/**
 * Core Image Generation Logic Module.
 * Handles API calls, state management, and processing for image generation/editing.
 */
export class ImageGenerator {
    constructor(agent) {
        this.apiKey = null;
        // Defer image display initialization until after UI setup
        setTimeout(() => {
            this.image-Display = document.getElementById('imgGenContent')?.querySelector('.image-display');
            if (!this.image-Display) {
                console.error("ImageGenerator could not find the '.image-display' element within '#imgGenContent'.");
            }
        }, 0);
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
                img.addEventListener('click', () => this._handleImageClick(img));
                
                this.imageDisplay.appendChild(img);
                imagesFound++;
            }
        }

        if (imagesFound === 0) {
            throw new Error("No images were generated.");
        }
    }

    _handleImageClick(img) {
        // TODO: Implement image preview/download functionality
        console.log("Image clicked:", img.src);
    }

    displayError(message) {
        if (this.imageDisplay) {
            this.imageDisplay.innerHTML = `
                <div class="error-text">
                    <span class="error-icon">⚠️</span>
                    ${message}
                </div>`;
        }
    }
}
