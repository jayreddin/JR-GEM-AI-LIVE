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
import { GeminiAgent } from './main/agent.js'; // Use the correct agent
import { getWebsocketUrl, getConfig, getDeepgramApiKey, MODEL_SAMPLE_RATE } from './config/config.js';
import { ToolManager } from './tools/tool-manager.js'; // Assuming ToolManager exists

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Ready. Initializing components...");

    // Initialize managers
    window.mediaManager = MediaManager;
    window.statusManager = StatusManager;
    window.settingsManager = SettingsManager;
    window.chatManager = new ChatManager();
    window.speechHandler = SpeechHandler;
    window.toolManager = new ToolManager(); // Initialize ToolManager

    // Initialize Agent
    try {
        const agentConfig = {
            url: getWebsocketUrl(),
            config: getConfig(),
            deepgramApiKey: getDeepgramApiKey(),
            transcribeModelsSpeech: true, // Enable model speech transcription
            transcribeUsersSpeech: true, // Enable user speech transcription
            modelSampleRate: MODEL_SAMPLE_RATE,
            toolManager: window.toolManager
        };
        window.agent = new GeminiAgent(agentConfig);
        console.log("Agent initialized.");
        setupAgentEventListeners(window.agent); // Setup listeners after agent creation
    } catch (error) {
        console.error("Error initializing Agent:", error);
        StatusManager.addStatus("Error initializing core agent.", 5000);
    }

    // Initialize control bar buttons and speech handling
    setupControlBarButtons();
    setupSpeechHandling();

    // Initialize IMG GEN components
    try {
        const imgGen = new ImageGenerator(window.agent); // Pass agent if needed
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

    // Power button handler (Connect/Disconnect)
    const powerBtn = document.getElementById('powerBtn');
    powerBtn?.addEventListener('click', async () => {
        if (window.agent?.connected) {
            try {
                await window.agent.disconnect();
                powerBtn.classList.remove('connected');
                powerBtn.setAttribute('aria-pressed', 'false');
                powerBtn.setAttribute('aria-label', 'Connect');
                StatusManager.addStatus("Disconnected", 2000);
                // Reset UI states if needed
                window.mediaManager?.cleanup();
            } catch (error) {
                console.error('Error disconnecting:', error);
                StatusManager.addStatus("Disconnect failed", 3000);
            }
        } else {
            try {
                await window.agent?.connect();
                await window.agent?.initialize(); // Initialize after connecting
                powerBtn.classList.add('connected');
                powerBtn.setAttribute('aria-pressed', 'true');
                powerBtn.setAttribute('aria-label', 'Disconnect');
                StatusManager.addStatus("Connected", 2000);
            } catch (error) {
                console.error('Error connecting:', error);
                StatusManager.addStatus("Connection failed", 3000);
                powerBtn.classList.remove('connected');
            }
        }
    });

    // Setup tab switching logic
    setupTabSwitching();

    // Trigger initial switch to set the correct state
    const initialTab = document.querySelector('input[name="tab-select"]:checked')?.value || 'live';
    switchTab(initialTab);

    console.log("Core application initialization complete.");
});

/**
 * Sets up event listeners for the GeminiAgent.
 * @param {GeminiAgent} agent - The agent instance.
 */
function setupAgentEventListeners(agent) {
    if (!agent) return;

    agent.on('text', (text) => {
        window.chatManager?.updateStreamingMessage(text);
        // Dispatch AI response event for potential TTS
        document.dispatchEvent(new CustomEvent('aiResponse', { detail: { text } }));
    });

    agent.on('turn_complete', () => {
        window.chatManager?.finalizeStreamingMessage();
    });

    agent.on('interrupted', () => {
        // Handle interruption, maybe clear the last message or add an indicator
        window.chatManager?.finalizeStreamingMessage(); // Finalize potentially incomplete message
        StatusManager.addStatus("Model interrupted", 2000);
    });

    agent.on('user_transcription', (transcriptData) => {
        if (transcriptData && transcriptData.transcript) {
            // Dispatch event for user speech
             document.dispatchEvent(new CustomEvent('userSpeech', {
                detail: { text: transcriptData.transcript }
            }));
        }
    });

     agent.on('transcription', (transcriptData) => {
        // Handle model transcription if needed (e.g., for logging or display)
        // console.log("Model Transcription:", transcriptData.transcript);
    });

    agent.on('screenshare_stopped', () => {
        // Update UI when screen share stops externally
        const screenBtn = document.getElementById('screenBtn');
        screenBtn?.classList.remove('active');
        window.mediaManager.isScreenActive = false; // Update state in MediaManager
    });
}


/**
 * Sets up speech recognition and synthesis handling
 */
function setupSpeechHandling() {
    // Listen for transcribed speech from microphone
    document.addEventListener('userSpeech', async (event) => {
        if (event.detail && event.detail.text && window.agent?.connected) {
             try {
                // Send transcribed text to the agent
                await window.agent.sendText(event.detail.text);
                // Add user message to chat visually
                window.chatManager?.addUserMessage(event.detail.text);
            } catch (error) {
                console.error('Error sending transcribed text:', error);
                StatusManager.addStatus("Error sending speech", 3000);
            }
        }
    });

    // Listen for AI responses to handle text-to-speech (handled in setupAgentEventListeners now)
}

/**
 * Sets up LIVE tab control bar button functionality
 */
function setupControlBarButtons() {
    // New Chat Button
    document.getElementById('newChatBtn')?.addEventListener('click', () => {
        window.chatManager?.clear();
        // Optionally send a signal to the agent to reset context if needed
        // window.agent?.resetContext();
        StatusManager.addStatus("Starting new chat session", 2000);
    });

    // Camera Button
    document.getElementById('cameraBtn')?.addEventListener('click', async () => {
        if (!window.agent?.connected) {
             StatusManager.addStatus("Connect first to use camera", 3000);
             return;
        }
        await window.mediaManager?.toggleCamera(); // MediaManager handles agent calls now
    });

    // Screen Share Button
    document.getElementById('screenBtn')?.addEventListener('click', async () => {
         if (!window.agent?.connected) {
             StatusManager.addStatus("Connect first to share screen", 3000);
             return;
        }
        await window.mediaManager?.toggleScreen(); // MediaManager handles agent calls now
    });

    // Microphone Button
    document.getElementById('micBtn')?.addEventListener('click', async () => {
         if (!window.agent?.connected) {
             StatusManager.addStatus("Connect first to use microphone", 3000);
             return;
        }
        await window.mediaManager?.toggleMic(); // MediaManager handles agent calls now
    });

    // Text-to-Speech Button
    document.getElementById('speakBtn')?.addEventListener('click', () => {
        window.mediaManager?.toggleSpeaker(); // MediaManager handles state
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
 * Handles sending a text message in either LIVE or IMG GEN mode
 */
async function handleMessageSend() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput?.value.trim();

    if (!message) return;

    const isLiveMode = document.getElementById('liveTab').checked;

    if (isLiveMode) {
        if (!window.agent?.connected) {
            StatusManager.addStatus("Connect first to send messages", 3000);
            return;
        }
        try {
            // Add user message visually
            window.chatManager?.addUserMessage(message);
            // Send text to the agent
            await window.agent.sendText(message);
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            StatusManager.addStatus("Error sending message", 3000);
        }
    } else {
        // IMG GEN message handling
        if (window.imgGenEvents) {
            window.imgGenEvents.handleImageGeneration(); // This now handles prompt internally
        }
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
            // Stop mic recording if active when switching away from LIVE
            if (window.mediaManager?.isMicActive) {
                 window.mediaManager.toggleMic(); // Turn off mic
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
