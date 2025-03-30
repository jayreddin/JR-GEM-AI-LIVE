/**
 * Main application entry point.
 */

// Core application components
import { GeminiAgent } from './main/agent.js';
import { ToolManager } from './tools/tool-manager.js';
import { ChatManager } from './chat/chat-manager.js';

// Tool implementations
import { GoogleSearchTool } from './tools/google-search.js';
import './dom/events.js';

// IMG GEN specific imports
import { ImageGenUI } from './imggen/imggen-ui.js';
import { ImageGenEvents } from './imggen/imggen-events.js';

console.info("Initializing application...");

// Initialize managers and components
const toolManager = new ToolManager();
let chatManager;
let geminiAgent;

try {
    toolManager.registerTool('googleSearch', new GoogleSearchTool());
    console.info("ToolManager initialized and tools registered.");
} catch (error) {
    console.error("Error initializing ToolManager:", error);
    alert("Error: Tool initialization failed.");
}

try {
    chatManager = new ChatManager();
    window.chatManager = chatManager;
    console.info("ChatManager initialized.");
} catch (error) {
    console.error("Error initializing ChatManager:", error);
    alert("Critical error: Failed to initialize chat interface.");
}

try {
    geminiAgent = new GeminiAgent({
        name: 'GeminiAgentInstance',
        toolManager: toolManager,
    });
    window.agent = geminiAgent;
    console.info("GeminiAgent instance created.");
} catch (error) {
    console.error("Error creating GeminiAgent:", error);
    alert(`Critical error: Failed to create agent - ${error.message}`);
    throw error;
}

// Setup core event handlers
document.addEventListener('DOMContentLoaded', () => {
    console.log("Setting up tab switching and UI components...");

    // Get elements needed for tab switching
    const elements = {
        liveTab: document.getElementById('liveTab'),
        imgGenTab: document.getElementById('imgGenTab'),
        liveContent: document.getElementById('liveContent'),
        imgGenContent: document.getElementById('imgGenContent'),
        liveControlBar: document.getElementById('liveControlBar'),
        modelSelector: document.getElementById('modelSelector'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn')
    };

    // Function to switch between tabs
    function switchTab(tab) {
        if (!elements.liveContent || !elements.imgGenContent) {
            console.error("Required content elements not found");
            return;
        }

        // Update radio buttons
        elements.liveTab.checked = tab === 'live';
        elements.imgGenTab.checked = tab === 'imggen';

        // Update content visibility
        elements.liveContent.classList.toggle('active', tab === 'live');
        elements.imgGenContent.classList.toggle('active', tab === 'imggen');

        // Update control bars
        elements.liveControlBar?.classList.toggle('active', tab === 'live');
        // Get imgGenControlBar dynamically as it's added by ImageGenUI
        const imgGenControlBar = document.getElementById('imgGenControlBar');
        imgGenControlBar?.classList.toggle('active', tab === 'imggen');

        // Handle model selector
        if (elements.modelSelector) {
            if (tab === 'imggen') {
                // Save current model
                if (!elements.modelSelector.dataset.savedModel) {
                    elements.modelSelector.dataset.savedModel = elements.modelSelector.value;
                }

                // Set image generation model
                const modelValue = 'models/gemini-2.0-flash-exp-image-generation';
                let imgGenOption = Array.from(elements.modelSelector.options)
                    .find(option => option.value === modelValue);

                if (!imgGenOption) {
                    imgGenOption = document.createElement('option');
                    imgGenOption.value = modelValue;
                    imgGenOption.textContent = 'Gemini 2.0 Flash Image Generation';
                    elements.modelSelector.appendChild(imgGenOption);
                }

                elements.modelSelector.value = modelValue;
                elements.modelSelector.dispatchEvent(new Event('change'));
                elements.modelSelector.disabled = true;
            } else {
                // Restore previous model for live mode
                if (elements.modelSelector.dataset.savedModel) {
                    elements.modelSelector.value = elements.modelSelector.dataset.savedModel;
                    elements.modelSelector.dispatchEvent(new Event('change'));
                }
                elements.modelSelector.disabled = false;
                elements.modelSelector.style.display = '';
            }
        }

        // Update input placeholder
        if (elements.messageInput) {
            elements.messageInput.placeholder = tab === 'imggen' 
                ? "Describe the image you want..."
                : "Type your message...";
        }

        // Toggle IMG GEN specific handlers
        if (window.imgGenEvents) {
            if (tab === 'imggen') {
                window.imgGenEvents.activate();
            } else {
                window.imgGenEvents.deactivate();
            }
        }
    }

    // Initialize IMG GEN UI and events
    if (elements.imgGenContent && elements.messageInput && elements.sendBtn && geminiAgent) {
        try {
            window.imgGenUI = new ImageGenUI();
            window.imgGenEvents = new ImageGenEvents(
                geminiAgent,
                elements.imgGenContent,

                // Update control bars
                // Look up imgGenControlBar *inside* the function to ensure it exists
                const imgGenControlBar = document.getElementById('imgGenControlBar');
                if (liveControlBar) liveControlBar.classList.toggle('active', tab === 'live');
                if (imgGenControlBar) imgGenControlBar.classList.toggle('active', tab === 'imggen'); // Check if found before toggling

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
                    modelSelector.style.display = ''; // Show selector
                } else if (modelSelector) {
                    // Hide selector if not in LIVE mode (e.g., IMG GEN)
                     modelSelector.style.display = 'none';
                }

                // Activate/Deactivate IMG GEN specific event handlers
                if (imgGenEvents) {
                    if (tab === 'imggen') {
                        imgGenEvents.activate();
                    } else {
                        imgGenEvents.deactivate();
                    }
                }
            }

            // Tab click handlers
            liveTab.addEventListener('click', () => switchTab('live'));
            imgGenTab.addEventListener('click', () => switchTab('imggen'));

            // NOTE: All IMG GEN specific event listeners (filters, upload, modes, send override)
            // are now handled within the ImageGenEvents class.

            // Ensure the default tab state is set correctly on load (e.g., 'live')
            switchTab('live'); // Or whichever tab should be active initially

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
