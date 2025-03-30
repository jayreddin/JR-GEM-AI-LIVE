/**
 * Main application entry point.
 * Initializes core components like the Agent, ToolManager, and ChatManager,
 * sets up global references, handles agent events for chat updates,
 * and initiates the connection to the backend service.
 */

// Core application components
import { GeminiAgent } from './main/agent.js';
import { ToolManager } from './tools/tool-manager.js';
import { ChatManager } from './chat/chat-manager.js';

// Tool implementations
import { GoogleSearchTool } from './tools/google-search.js';
import './dom/events.js';

// --- Initialization ---

console.info("Initializing application...");

// 1. Initialize Tool Manager and register tools
const toolManager = new ToolManager();
try {
    toolManager.registerTool('googleSearch', new GoogleSearchTool());
    // Register other tools here if needed
    console.info("ToolManager initialized and tools registered.");
} catch (error) {
    console.error("Error initializing ToolManager or registering tools:", error);
    // Potentially halt initialization or notify user
}

// 2. Initialize Chat Manager (for UI updates)
let chatManager;
try {
    chatManager = new ChatManager();
    // Make chatManager globally accessible (required by current dom/events.js structure)
    // TODO: Refactor dom/events.js to avoid relying on globals if possible.
    window.chatManager = chatManager;
    console.info("ChatManager initialized.");
} catch (error) {
    console.error("Error initializing ChatManager:", error);
    // Application might be unusable without chat UI, notify user or halt
    alert("Critical error: Failed to initialize chat interface."); // Basic user feedback
}


// 3. Initialize Gemini Agent
let geminiAgent;
try {
    geminiAgent = new GeminiAgent({
        name: 'GeminiAgentInstance', // Optional name for logging
        toolManager: toolManager, // Pass the initialized tool manager
        // Configuration (URL, API keys, model settings) is now loaded internally by the Agent
        // Transcription options can still be passed if needed, otherwise defaults are used:
        // transcribeModelsSpeech: true,
        // transcribeUsersSpeech: false,
    });
    // Expose agent globally (required by current dom/events.js structure)
    // TODO: Refactor dom/events.js to avoid relying on globals if possible.
    window.agent = geminiAgent;
    console.info("GeminiAgent instance created.");

} catch (error) {
    console.error("Error creating GeminiAgent instance:", error);
    // Critical error, likely configuration related. Notify user.
    alert(`Critical error: Failed to create agent - ${error.message}`); // Basic user feedback
    // Halt further execution as the agent is essential
    throw error; // Stop script execution
}


// 4. Setup Agent Event Listeners (for Chat UI updates)
// These listeners connect agent events to chat manager actions.
if (geminiAgent && chatManager) {
    geminiAgent.on('transcription', (transcript) => {
        // console.debug('Agent emitted transcription:', transcript); // Optional debug log
        chatManager.updateStreamingMessage(transcript);
    });

    geminiAgent.on('text_sent', (data) => { // Assuming client emits object { text, endOfTurn }
        console.debug('Agent emitted text_sent:', data.text);
        // Finalize any previous streaming message *before* adding the user's message
        chatManager.finalizeStreamingMessage();
        // Add the user message (handled by dom/events.js now)
        // chatManager.addUserMessage(data.text); // Duplicates logic in dom/events.js
    });

    geminiAgent.on('interrupted', () => {
        console.debug('Agent emitted interrupted.');
        chatManager.finalizeStreamingMessage(); // Stop displaying streaming indicator
        // User message display is handled by ChatManager logic based on lastUserMessageType
        // if (!chatManager.lastUserMessageType) {
        //     chatManager.addUserAudioMessage(); // Might be redundant if turn_complete also finalizes
        // }
    });

    geminiAgent.on('turn_complete', () => {
        console.debug('Agent emitted turn_complete.');
        chatManager.finalizeStreamingMessage(); // Ensure message is finalized
    });

    geminiAgent.on('text', (text) => {

        // --- Tab Switching and IMG GEN functionality ---

        document.addEventListener('DOMContentLoaded', () => {
            // Tab switching logic
            const liveTab = document.getElementById('liveTab');
            const imgGenTab = document.getElementById('imgGenTab');
            const liveContent = document.getElementById('liveContent');
            const imgGenContent = document.getElementById('imgGenContent');
            const liveControlBar = document.getElementById('liveControlBar');
            const imgGenControlBar = document.getElementById('imgGenControlBar');
            const modelSelector = document.getElementById('modelSelector');

            // Function to switch between tabs
            function switchTab(tab) {
                // Update tab buttons
                liveTab.classList.toggle('active', tab === 'live');
                imgGenTab.classList.toggle('active', tab === 'imggen');

                // Update content
                liveContent.classList.toggle('active', tab === 'live');
                imgGenContent.classList.toggle('active', tab === 'imggen');

                // Update control bars
                liveControlBar.classList.toggle('active', tab === 'live');
                imgGenControlBar.classList.toggle('active', tab === 'imggen');

                // For IMG GEN tab, set the model to gemini-2.0-flash-exp-image-generation
                if (tab === 'imggen' && modelSelector) {
                    // Save the current model for when we switch back to LIVE
                    if (!modelSelector.dataset.savedModel) {
                        modelSelector.dataset.savedModel = modelSelector.value;
                    }

                    // Find the image generation model option
                    const imgGenOption = Array.from(modelSelector.options).find(
                        option => option.value === 'models/gemini-2.0-flash-exp-image-generation'
                    );

                    // If option exists, select it
                    if (imgGenOption) {
                        modelSelector.value = 'models/gemini-2.0-flash-exp-image-generation';
                        // Trigger change event to update the agent
                        modelSelector.dispatchEvent(new Event('change'));
                    } else {
                        // Create the option if it doesn't exist
                        const option = document.createElement('option');
                        option.value = 'models/gemini-2.0-flash-exp-image-generation';
                        option.textContent = 'Gemini 2.0 Flash Image Generation';
                        modelSelector.appendChild(option);
                        modelSelector.value = 'models/gemini-2.0-flash-exp-image-generation';
                        // Trigger change event
                        modelSelector.dispatchEvent(new Event('change'));
                    }

                    // Disable model selector in IMG GEN mode
                    modelSelector.disabled = true;
                } else if (tab === 'live' && modelSelector) {
                    // Restore saved model if switching back to LIVE
                    if (modelSelector.dataset.savedModel) {
                        modelSelector.value = modelSelector.dataset.savedModel;
                        // Trigger change event
                        modelSelector.dispatchEvent(new Event('change'));
                    }

                    // Enable model selector in LIVE mode
                    modelSelector.disabled = false;
                }
            }

            // Tab click handlers
            liveTab.addEventListener('click', () => switchTab('live'));
            imgGenTab.addEventListener('click', () => switchTab('imggen'));

            // IMG GEN mode controls
            const filtersBtn = document.getElementById('filtersBtn');
            const filtersPopup = document.getElementById('filtersPopup');
            const closeFiltersBtn = document.getElementById('closeFiltersBtn');
            const applyFiltersBtn = document.getElementById('applyFiltersBtn');
            const uploadImageBtn = document.getElementById('uploadImageBtn');
            const imageUpload = document.getElementById('imageUpload');
            const newImageBtn = document.getElementById('newImageBtn');
            const storyBookBtn = document.getElementById('storyBookBtn');
            const birthdayCardBtn = document.getElementById('birthdayCardBtn');

            // Filters popup handlers
            if (filtersBtn && filtersPopup && closeFiltersBtn) {
                filtersBtn.addEventListener('click', () => {
                    filtersPopup.style.display = 'flex';
                });

                closeFiltersBtn.addEventListener('click', () => {
                    filtersPopup.style.display = 'none';
                });

                // Close popup when clicking outside
                filtersPopup.addEventListener('click', (e) => {
                    if (e.target === filtersPopup) {
                        filtersPopup.style.display = 'none';
                    }
                });

                // Apply filters
                if (applyFiltersBtn) {
                    applyFiltersBtn.addEventListener('click', () => {
                        // Get selected filter options
                        const imageAmount = document.getElementById('imageAmount').value;
                        const imageSize = document.getElementById('imageSize').value;
                        const imageFilter = document.getElementById('imageFilter').value;

                        // Apply filters logic here - will be implemented when processing generation
                        console.log(`Filters applied: Amount=${imageAmount}, Size=${imageSize}, Filter=${imageFilter}`);
                        filtersPopup.style.display = 'none';
                    });
                }
            }

            // Image upload handler
            if (uploadImageBtn && imageUpload) {
                uploadImageBtn.addEventListener('click', () => {
                    imageUpload.click();
                });

                imageUpload.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            // Display uploaded image
                            const imageDisplay = document.getElementById('imageDisplay');
                            if (imageDisplay) {
                                imageDisplay.innerHTML = '';
                                const img = document.createElement('img');
                                img.src = event.target.result;
                                img.classList.add('generated-image');
                                img.alt = 'Uploaded image';
                                imageDisplay.appendChild(img);

                                // Store the image data for editing
                                window.uploadedImage = {
                                    data: event.target.result,
                                    file: e.target.files[0]
                                };

                                // Add visual indicator that image is ready for editing
                                uploadImageBtn.classList.add('upload-active');
                            }
                        };
                        reader.readAsDataURL(e.target.files[0]);
                    }
                });
            }

            // New Image generation
            if (newImageBtn) {
                newImageBtn.addEventListener('click', () => {
                    // Clear any existing image
                    const imageDisplay = document.getElementById('imageDisplay');
                    if (imageDisplay) {
                        imageDisplay.innerHTML = '<div class="placeholder-text">Generated images will appear here</div>';
                    }

                    // Reset upload indicator
                    if (uploadImageBtn) {
                        uploadImageBtn.classList.remove('upload-active');
                    }

                    // Clear uploaded image data
                    window.uploadedImage = null;
                });
            }

            // Story Book mode
            if (storyBookBtn) {
                storyBookBtn.addEventListener('click', () => {
                    // Toggle active state
                    storyBookBtn.classList.toggle('active');

                    // If activating Story Book mode, deactivate Birthday Card mode
                    if (storyBookBtn.classList.contains('active') && birthdayCardBtn) {
                        birthdayCardBtn.classList.remove('active');
                    }

                    // Update mode flag
                    window.storyBookMode = storyBookBtn.classList.contains('active');
                    console.log(`Story Book mode ${window.storyBookMode ? 'activated' : 'deactivated'}`);
                });
            }

            // Birthday Card mode
            if (birthdayCardBtn) {
                birthdayCardBtn.addEventListener('click', () => {
                    // Toggle active state
                    birthdayCardBtn.classList.toggle('active');

                    // If activating Birthday Card mode, deactivate Story Book mode
                    if (birthdayCardBtn.classList.contains('active') && storyBookBtn) {
                        storyBookBtn.classList.remove('active');
                    }

                    // Update mode flag
                    window.birthdayCardMode = birthdayCardBtn.classList.contains('active');
                    console.log(`Birthday Card mode ${window.birthdayCardMode ? 'activated' : 'deactivated'}`);
                });
            }

            // Image generation and editing handler
            const sendBtn = document.getElementById('sendBtn');
            const messageInput = document.getElementById('messageInput');

            // Override send button in IMG GEN mode
            if (sendBtn && messageInput) {
                const originalClickHandler = sendBtn.onclick;

                sendBtn.onclick = function(event) {
                    if (imgGenContent.classList.contains('active')) {
                        // We're in IMG GEN mode
                        const prompt = messageInput.value.trim();

                        if (prompt) {
                            // Show loading state
                            const imageDisplay = document.getElementById('imageDisplay');
                            if (imageDisplay) {
                                imageDisplay.innerHTML = '<div class="placeholder-text">Generating image...</div>';
                            }

                            // Get filter settings
                            const imageAmount = document.getElementById('imageAmount')?.value || '1';
                            const imageSize = document.getElementById('imageSize')?.value || '512x512';
                            const imageFilter = document.getElementById('imageFilter')?.value || 'none';

                            // Determine generation mode
                            let generationMode = 'standard';
                            if (window.storyBookMode) generationMode = 'storybook';
                            if (window.birthdayCardMode) generationMode = 'birthday';

                            // Check if this is image editing (has uploaded image)
                            const isEditing = !!window.uploadedImage;

                            console.log(`Image ${isEditing ? 'editing' : 'generation'} request:`, {
                                prompt,
                                mode: generationMode,
                                filters: {
                                    amount: imageAmount,
                                    size: imageSize,
                                    filter: imageFilter
                                }
                            });

                            // Clear input
                            messageInput.value = '';

                            // For now, we'll simulate image generation with a placeholder
                            // In a real implementation, this would call the Gemini API
                            setTimeout(() => {
                                if (imageDisplay) {
                                    // Simulate a generated image (in real implementation, this would be the response from the API)
                                    const img = document.createElement('img');
                                    img.src = 'https://picsum.photos/512/512?random=' + Math.random(); // Placeholder image
                                    img.classList.add('generated-image');
                                    img.alt = 'Generated image';

                                    imageDisplay.innerHTML = '';
                                    imageDisplay.appendChild(img);
                                }
                            }, 1500);
                        }

                        return; // Don't proceed with original handler
                    }

                    // If we're in LIVE mode, use the original handler
                    if (typeof originalClickHandler === 'function') {
                        originalClickHandler.call(this, event);
                    }
                };

                // Override Enter key as well
                const originalKeydownHandler = messageInput.onkeydown;

                messageInput.onkeydown = function(event) {
                    if (event.key === 'Enter' && !event.shiftKey && imgGenContent.classList.contains('active')) {
                        event.preventDefault();
                        sendBtn.click();
                        return;
                    }

                    // Use original handler for other cases
                    if (typeof originalKeydownHandler === 'function') {
                        originalKeydownHandler.call(this, event);
                    }
                };
            }
        });

        // console.debug('Agent emitted text chunk:', text); // Optional debug log
        // Handle streaming text from the model
        chatManager.updateStreamingMessage(text);
    });

    geminiAgent.on('error', (errorInfo) => {
        // Generic handler for errors emitted by the agent (connection, init, etc.)
        console.error(`Agent emitted error (${errorInfo?.type || 'general'}):`, errorInfo?.details || errorInfo);
        // Optionally display a generic error message in the UI via chatManager
        if (chatManager.addStatusMessage) { // Check if function exists
            chatManager.addStatusMessage(`Agent error: ${errorInfo?.details?.message || 'An unspecified error occurred.'}`);
        }
    });

    geminiAgent.on('disconnected', (details) => {
        // Handle unexpected disconnects if needed (e.g., update UI beyond button state)
        console.warn(`Agent emitted disconnected. Code: ${details?.code}, Reason: ${details?.reason}`);
        if (chatManager.addStatusMessage) {
            chatManager.addStatusMessage(`Connection lost. Code: ${details?.code}`);
        }
    });


    console.info("Agent event listeners configured for ChatManager.");

} else {
    console.error("Cannot setup agent event listeners: Agent or ChatManager instance is missing.");
}


// 5. Initial Connection Attempt (using the agent instance)
// The connection logic is now encapsulated within agent.connect()
// Event listeners in dom/events.js handle the visual feedback (button states, status messages)
(async () => {
    if (geminiAgent) {
        console.info("Attempting initial connection via agent...");
        // No need to explicitly call ensureAgentReady here,
        // let the user initiate connection via the power button in the UI.
        // The power button click handler in dom/events.js will call agent.connect().

        // If automatic connection on load is desired, uncomment the following:
        /*
        try {
            await geminiAgent.connect();
            console.log('Initial connection successful.');
            // The 'connected' event emitted by the agent can trigger further UI updates if needed.
            // The power button state should ideally be updated by the event listener in dom/events.js
            // based on the agent.connected state or emitted events.

            // Optional: Trigger initial model interaction after connection
            // await geminiAgent.initialize(); // Initialize audio etc. if needed immediately
            // await geminiAgent.sendText("."); // Send initial prompt
        } catch (error) {
            console.error('Initial connection failed:', error);
            // Error message should be shown via the 'error' event listener setup above
            // or handled by the connect method itself. UI should reflect disconnected state.
        }
        */
    } else {
        console.error("Cannot initiate connection: GeminiAgent instance not available.");
    }
})();

console.info("Application script initialization finished.");

// Note: All UI event listeners (button clicks, input handling) are now managed
// within js/dom/events.js, which runs after DOMContentLoaded.

