/**
 * Main application script
 * Handles initialization and core functionality
 */
import { ImageGenUI } from './imggen/imggen-ui.js';
import { ImageGenEvents } from './imggen/imggen-events.js';
import { ImageGen } from './imggen/imggen.js';
import MediaManager from './dom/media-manager.js';
import StatusManager from './dom/status-manager.js';
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
                elements.messageInput,
                elements.sendBtn
            );
            console.info("ImageGen modules initialized.");
        } catch (error) {
            console.error("Error initializing ImageGen modules:", error);
        }
    }

    // Set up tab change listeners
    elements.liveTab?.addEventListener('change', () => switchTab('live'));
    elements.imgGenTab?.addEventListener('change', () => switchTab('imggen'));

    // Set initial tab state
    switchTab('live');
});

// Setup agent event handlers
if (geminiAgent && chatManager) {
    geminiAgent.on('transcription', (transcript) => {
        chatManager.updateStreamingMessage(transcript);
    });

    geminiAgent.on('text_sent', (data) => {
        chatManager.finalizeStreamingMessage();
    });

    geminiAgent.on('interrupted', () => {
        chatManager.finalizeStreamingMessage();
    });

    geminiAgent.on('turn_complete', () => {
        chatManager.finalizeStreamingMessage();
    });

    geminiAgent.on('text', (text) => {
        chatManager.updateStreamingMessage(text);
    });

    geminiAgent.on('error', (errorInfo) => {
        console.error(`Agent error:`, errorInfo);
        chatManager.addStatusMessage?.(`Agent error: ${errorInfo?.details?.message || 'Unknown error'}`);
    });

    geminiAgent.on('disconnected', (details) => {
        console.warn(`Agent disconnected:`, details);
        chatManager.addStatusMessage?.(`Connection lost. Code: ${details?.code}`);
    });

    console.info("Agent event handlers configured.");
}

console.info("Application initialization complete.");
