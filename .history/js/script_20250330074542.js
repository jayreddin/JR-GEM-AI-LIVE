/**
 * Main application script
 * Handles initialization and core functionality
 */
import { ImageGenUI } from './imggen/imggen-ui.js';
import { ImageGenEvents } from './imggen/imggen-events.js';
import { ImageGen } from './imggen/imggen.js';
import MediaManager from './dom/media-manager.js';
import StatusManager from './dom/status-manager.js';
import SettingsManager from './settings/settings-manager.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    window.mediaManager = MediaManager;
    window.statusManager = StatusManager;
    window.settingsManager = SettingsManager;

    // Initialize IMG GEN components
    const imgGenUI = new ImageGenUI();
    const imgGen = new ImageGen();
    const imgGenEvents = new ImageGenEvents(imgGen);

    // Store references
    window.imgGen = imgGen;
    window.imgGenUI = imgGenUI;
    window.imgGenEvents = imgGenEvents;

    // Settings button handler
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        window.settingsManager.show();
    });

    // Power button handler
    document.getElementById('powerBtn')?.addEventListener('click', () => {
        console.log('Power button clicked');
    });

    // Model selector handler
    const modelSelector = document.getElementById('modelSelector');
    if (modelSelector) {
        // Populate model options
        const models = [
            'gemini-pro',
            'gemini-pro-vision',
            'gemini-ultra',
            'gemini-ultra-vision'
        ];
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelector.appendChild(option);
        });

        modelSelector.addEventListener('change', (e) => {
            console.log('Selected model:', e.target.value);
        });
    }

    // Initialize with default tab
    setupTabSwitching();
    document.getElementById('liveTab')?.click();
});

/**
 * Sets up tab switching functionality
 */
function setupTabSwitching() {
    const liveContent = document.getElementById('liveContent');
    const imgGenContent = document.getElementById('imgGenContent');
    const modelSelector = document.querySelector('.model-selector-container');
    const imgGenModelDisplay = document.getElementById('imgGenModelDisplay');

    // Tab radio buttons
    const liveTab = document.getElementById('liveTab');
    const imgGenTab = document.getElementById('imgGenTab');

    function switchTab(tab) {
        if (tab === 'live') {
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
