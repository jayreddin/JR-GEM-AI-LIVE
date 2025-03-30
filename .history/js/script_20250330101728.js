/**
 * Main application script
 * Handles initialization and core functionality
 */
import { ImageGenUI } from './imggen/imggen-ui.js';
import { ImageGenEvents } from './imggen/imggen-events.js';
import { ImageGenerator } from './imggen/imggen.js'; // Corrected import name
import MediaManager from './dom/media-manager.js';
import StatusManager from './dom/status-manager.js';
import SettingsManager from './settings/settings-manager.js';
import { ChatManager } from './chat/chat-manager.js';
// import { GeminiAgent } from './main/agent.js'; 

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Ready. Initializing components...");

    // Initialize managers first as other components might depend on them
    window.mediaManager = MediaManager;
    window.statusManager = StatusManager;
    window.settingsManager = SettingsManager;
    window.chatManager = new ChatManager();

    // Initialize control bar buttons
    setupControlBarButtons();

    // Initialize IMG GEN components
    try {
        const imgGen = new ImageGenerator(); // Use correct class name
        const imgGenUI = new ImageGenUI(); // UI might need to be initialized before events
        const imgGenEvents = new ImageGenEvents(imgGen); // Pass the generator instance

        // Store references globally if needed by other modules or for debugging
        window.imgGen = imgGen;
        window.imgGenUI = imgGenUI;
        window.imgGenEvents = imgGenEvents;
        console.log("IMG GEN components initialized.");
    } catch (error) {
        console.error("Error initializing IMG GEN components:", error);
        StatusManager.addStatus("Error loading Image Generation module.", 5000);
    }

    // Initialize Agent (Example - Adapt based on actual Agent implementation)
    /*
    try {
        const agent = new GeminiAgent({ ...config... });
        window.agent = agent;
        console.log("Agent initialized.");
        // Connect agent event listeners if needed
        // agent.on('some_event', () => { ... });
    } catch (error) {
        console.error("Error initializing Agent:", error);
        StatusManager.addStatus("Error initializing core agent.", 5000);
    }
    */

    // Settings button handler
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        // Ensure settingsManager is initialized before showing
        window.settingsManager.initialize(); // Initialize if not already done
        window.settingsManager.show();
    });

    // Power button handler
    document.getElementById('powerBtn')?.addEventListener('click', () => {
        console.log('Power button clicked');
        // TODO: Implement connect/disconnect logic using Agent instance (window.agent)
        // Example: if (window.agent?.connected) window.agent.disconnect(); else window.agent?.connect();
        StatusManager.addStatus("Connect/Disconnect Toggled (Placeholder)", 2000);
    });

    // Setup tab switching logic
    setupTabSwitching();

    // Trigger initial switch to set the correct state based on HTML 'checked' attribute
    const initialTab = document.querySelector('input[name="tab-select"]:checked')?.value || 'live';
    switchTab(initialTab); // Use the globally defined switchTab

    console.log("Core application initialization complete.");
});

/**
 * Sets up LIVE tab control bar button functionality
 */
function setupControlBarButtons() {
    // New Chat Button
    document.getElementById('newChatBtn')?.addEventListener('click', () => {
        window.chatManager?.clear();
        StatusManager.addStatus("Starting new chat session", 2000);
    });

    // Camera Button
    document.getElementById('cameraBtn')?.addEventListener('click', () => {
        if (window.mediaManager) {
            if (window.mediaManager.isCameraActive()) {
                window.mediaManager.stopCamera();
            } else {
                window.mediaManager.startCamera();
            }
        }
    });

    // Screen Share Button
    document.getElementById('screenBtn')?.addEventListener('click', () => {
        if (window.mediaManager) {
            if (window.mediaManager.isScreenActive()) {
                window.mediaManager.stopScreen();
            } else {
                window.mediaManager.startScreen();
            }
        }
    });

    // Microphone Button
    document.getElementById('micBtn')?.addEventListener('click', () => {
        if (window.mediaManager) {
            if (window.mediaManager.isMicActive()) {
                window.mediaManager.stopMic();
            } else {
                window.mediaManager.startMic();
            }
        }
    });

    // Text-to-Speech Button
    document.getElementById('speakBtn')?.addEventListener('click', () => {
        const isEnabled = !localStorage.getItem('speakEnabled');
        localStorage.setItem('speakEnabled', isEnabled);
        document.getElementById('speakBtn').classList.toggle('active', isEnabled);
        window.chatManager?.updateSpeechStatus(isEnabled);
        StatusManager.addStatus(`Text-to-speech ${isEnabled ? 'enabled' : 'disabled'}`, 2000);
    });

    // Message Input and Send Button
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    if (messageInput && sendBtn) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleMessageSend();
            }
        });

        sendBtn.addEventListener('click', handleMessageSend);
    }
}

/**
 * Handles sending a message in either LIVE or IMG GEN mode
 */
function handleMessageSend() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput?.value.trim();
    
    if (!message) return;

    const isLiveMode = document.getElementById('liveTab').checked;
    
    if (isLiveMode) {
        // Handle LIVE tab message
        window.chatManager?.addUserMessage(message);
        // TODO: Send to agent when implemented
        messageInput.value = '';
    } else {
        // IMG GEN message handling is already set up in ImageGenEvents
        window.imgGenEvents?.handleImageGeneration();
    }
}

/**
 * Sets up tab switching functionality and makes switchTab globally accessible.
 */
function setupTabSwitching() {
    const liveContent = document.getElementById('liveContent');
    const imgGenContent = document.getElementById('imgGenContent');
    const liveModelDisplay = document.getElementById('liveModelDisplay'); // New static display for LIVE
    const imgGenModelDisplay = document.getElementById('imgGenModelDisplay');
    const liveControlBar = document.getElementById('liveControlBar');
    const imgGenControlBar = document.getElementById('imgGenControlBar');

    // Tab radio buttons
    const liveTab = document.getElementById('liveTab');
    const imgGenTab = document.getElementById('imgGenTab');

    // Define switchTab globally
    window.switchTab = function(tab) {
        console.log(`Switching to tab: ${tab}`);
        const isLive = tab === 'live';

        liveContent?.classList.toggle('active', isLive);
        imgGenContent?.classList.toggle('active', !isLive);

        liveModelDisplay?.classList.toggle('active', isLive); // Toggle LIVE display
        imgGenModelDisplay?.classList.toggle('active', !isLive); // Toggle IMG GEN display

        liveControlBar?.classList.toggle('active', isLive);
        imgGenControlBar?.classList.toggle('active', !isLive);

        // Ensure IMG GEN popups are hidden when switching away
        if (isLive && window.imgGenEvents?.hideAllPopups) {
            window.imgGenEvents.hideAllPopups();
        }

        // Update IMG GEN Events active state
        if (window.imgGenEvents) {
            window.imgGenEvents.isActive = !isLive;
        }
    }

    // Tab change handlers
    liveTab?.addEventListener('change', () => window.switchTab('live'));
    imgGenTab?.addEventListener('change', () => window.switchTab('imggen'));

    console.log("Tab switching setup complete.");
}
