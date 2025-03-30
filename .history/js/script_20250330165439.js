/**
 * Main application script
 * Handles initialization and core functionality
 */
import { ImageGenUI } from './imggen/imggen-ui.js';
import { ImageGenEvents } from './imggen/imggen-events.js';
import { ImageGenerator } from './imggen/imggen.js';
import MediaManager from './dom/media-manager.js';
import StatusManager from './dom/status-manager.js';
import SettingsManager from './settings/settings-manager.js';
import { ChatManager } from './chat/chat-manager.js';
import SpeechHandler from './audio/speech-handler.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Ready. Initializing components...");

    // Initialize managers
    window.mediaManager = MediaManager;
    window.statusManager = StatusManager;
    window.settingsManager = SettingsManager;
    window.chatManager = new ChatManager();
    window.speechHandler = SpeechHandler;

    // Initialize control bar buttons
    setupControlBarButtons();
    setupSpeechHandling();

    // Initialize IMG GEN components
    try {
        const imgGen = new ImageGenerator();
        const imgGenUI = new ImageGenUI();
        const imgGenEvents = new ImageGenEvents(imgGen);

        window.imgGen = imgGen;
        window.imgGenUI = imgGenUI;
        window.imgGenEvents = imgGenEvents;
        console.log("IMG GEN components initialized.");
    } catch (error) {
        console.error("Error initializing IMG GEN components:", error);
        StatusManager.addStatus("Error loading Image Generation module.", 5000);
    }

    // Settings button handler
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        window.settingsManager.initialize();
        window.settingsManager.show();
    });

    // Power button handler
    document.getElementById('powerBtn')?.addEventListener('click', () => {
        console.log('Power button clicked');
        StatusManager.addStatus("Connect/Disconnect Toggled (Placeholder)", 2000);
    });

    // Setup tab switching logic
    setupTabSwitching();

    // Trigger initial switch to set the correct state
    const initialTab = document.querySelector('input[name="tab-select"]:checked')?.value || 'live';
    switchTab(initialTab);

    console.log("Core application initialization complete.");
});

/**
 * Sets up speech recognition and synthesis handling
 */
function setupSpeechHandling() {
    // Listen for transcribed speech from microphone
    document.addEventListener('userSpeech', async (event) => {
        if (event.detail && event.detail.text) {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = event.detail.text;
                handleMessageSend();
            }
        }
    });

    // Listen for AI responses to handle text-to-speech
    document.addEventListener('aiResponse', async (event) => {
        if (event.detail && event.detail.text && window.mediaManager.isSpeakerActive) {
            try {
                await window.speechHandler.speak(event.detail.text);
            } catch (error) {
                console.error('Text-to-speech error:', error);
                StatusManager.addStatus('Text-to-speech error', 3000);
            }
        }
    });
}

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
        window.mediaManager?.toggleCamera();
    });

    // Screen Share Button
    document.getElementById('screenBtn')?.addEventListener('click', () => {
        window.mediaManager?.toggleScreen();
    });

    // Microphone Button
    document.getElementById('micBtn')?.addEventListener('click', () => {
        window.mediaManager?.toggleMic();
    });

    // Text-to-Speech Button
    document.getElementById('speakBtn')?.addEventListener('click', () => {
        window.mediaManager?.toggleSpeaker();
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
        window.chatManager?.addUserMessage(message);
        messageInput.value = '';

        // Simulate AI response for testing (replace with actual AI integration)
        setTimeout(() => {
            // Random responses for testing
            const responses = [
                `I understand you're saying "${message}". Let me help you with that.`,
                `Thanks for your message. Here's what I think about "${message}"...`,
                `That's an interesting point about "${message}". Here's my perspective...`,
                `I've processed your message about "${message}" and here's my response...`
            ];
            const response = responses[Math.floor(Math.random() * responses.length)];
            
            window.chatManager?.addModelMessage(response);
            
            if (window.mediaManager?.isSpeakerActive) {
                // Dispatch AI response event for text-to-speech
                document.dispatchEvent(new CustomEvent('aiResponse', {
                    detail: { text: response }
                }));
            }
        }, 800);
    } else {
        window.imgGenEvents?.handleImageGeneration();
    }
}

/**
 * Sets up tab switching functionality and makes switchTab globally accessible.
 */
function setupTabSwitching() {
    const liveContent = document.getElementById('liveContent');
    const imgGenContent = document.getElementById('imgGenContent');
    const liveModelDisplay = document.getElementById('liveModelDisplay');
    const imgGenModelDisplay = document.getElementById('imgGenModelDisplay');
    const liveControlBar = document.getElementById('liveControlBar');
    const imgGenControlBar = document.getElementById('imgGenControlBar');

    const liveTab = document.getElementById('liveTab');
    const imgGenTab = document.getElementById('imgGenTab');

    window.switchTab = function(tab) {
        console.log(`Switching to tab: ${tab}`);
        const isLive = tab === 'live';

        // Update visibility
        liveContent?.classList.toggle('active', isLive);
        imgGenContent?.classList.toggle('active', !isLive);
        liveModelDisplay?.classList.toggle('active', isLive);
        imgGenModelDisplay?.classList.toggle('active', !isLive);
        liveControlBar?.classList.toggle('active', isLive);
        imgGenControlBar?.classList.toggle('active', !isLive);

        // Clean up when switching away from IMG GEN
        if (isLive && window.imgGenEvents?.hideAllPopups) {
            window.imgGenEvents.hideAllPopups();
        }

        // Stop speech recognition and synthesis when switching tabs
        if (!isLive) {
            window.speechHandler?.stopSpeaking();
            if (window.mediaManager.isMicActive) {
                window.mediaManager.toggleMic();
            }
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
