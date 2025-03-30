/**
 * Main application script
 * Handles initialization and core functionality using GeminiAgent
 */
import { ImageGenUI } from './imggen/imggen-ui.js';
import { ImageGenEvents } from './imggen/imggen-events.js';
import { ImageGenerator } from './imggen/imggen.js';
import MediaManager from './dom/media-manager.js'; // Assuming this handles UI buttons now
import StatusManager from './dom/status-manager.js';
import SettingsManager from './settings/settings-manager.js';
import { ChatManager } from './chat/chat-manager.js';
import SpeechHandler from './audio/speech-handler.js'; // Keep for TTS
import { GeminiAgent } from './main/agent.js'; // Use the correct agent path
import { getWebsocketUrl, getConfig, getDeepgramApiKey, MODEL_SAMPLE_RATE } from './config/config.js';
import { ToolManager } from './tools/tool-manager.js'; // Assuming ToolManager exists

// Global agent instance
let agent = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Ready. Initializing components...");

    // Initialize managers
    window.mediaManager = MediaManager; // Make globally accessible if needed by other modules
    window.statusManager = StatusManager;
    window.settingsManager = SettingsManager;
    window.chatManager = new ChatManager();
    window.speechHandler = SpeechHandler; // Keep for TTS
    window.toolManager = new ToolManager();

    // Initialize Agent (but don't connect yet)
    try {
        // Dynamically get config when creating the agent
        const agentConfig = {
            url: getWebsocketUrl(),
            config: getConfig(),
            deepgramApiKey: getDeepgramApiKey(),
            transcribeModelsSpeech: true,
            transcribeUsersSpeech: true, // Enable user transcription via agent
            modelSampleRate: MODEL_SAMPLE_RATE, // Use constant from config
            toolManager: window.toolManager
        };
        agent = new GeminiAgent(agentConfig); // Assign to global agent
        window.agent = agent; // Make globally accessible if needed
        console.log("Agent instance created.");
        setupAgentEventListeners(agent); // Setup listeners immediately
    } catch (error) {
        console.error("Error creating Agent instance:", error);
        StatusManager.addStatus("Error initializing core agent.", 5000);
    }

    // Initialize UI components and event listeners
    setupUIEventListeners(); // Renamed from setupControlBarButtons for clarity
    setupSpeechHandling(); // Keep TTS handling separate

    // Initialize IMG GEN components
    try {
        const imgGen = new ImageGenerator(agent); // Pass agent if needed
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

    // Setup tab switching logic
    setupTabSwitching();

    // Trigger initial switch to set the correct state
    const initialTab = document.querySelector('input[name="tab-select"]:checked')?.value || 'live';
    switchTab(initialTab); // Use the globally defined switchTab

    // Listen for settings updates to reconfigure agent if needed
    document.addEventListener('settingsUpdated', () => {
        console.log("Settings updated, reconfiguring agent...");
        if (agent) {
            // Update agent's internal config if possible, or recreate agent
            // For simplicity, let's update relevant parts if agent allows
            agent.config = getConfig(); // Update the config object
            agent.modelSampleRate = MODEL_SAMPLE_RATE; // Update sample rate
            // Note: Changing URL or Deepgram key might require full disconnect/reconnect or recreation
            console.log("Agent config potentially updated.");
            StatusManager.addStatus("Settings applied.", 2000);
        }
    });


    console.log("Core application initialization complete.");
});

/**
 * Sets up event listeners for the GeminiAgent instance based on Context/agent.js.
 * @param {GeminiAgent} agentInstance - The agent instance.
 */
function setupAgentEventListeners(agentInstance) {
    if (!agentInstance) return;

    // Clear existing listeners if any (optional, depends if this is called multiple times)
    // agentInstance.removeAllListeners?.(); // If using EventEmitter3 or similar

    // Handle incoming text from the model (Matches Context/agent.js)
    agentInstance.on('text', (text) => {
        // console.log("Agent received text:", text); // Debug log
        window.chatManager?.updateStreamingMessage(text);
        // Dispatch AI response event for potential TTS
        document.dispatchEvent(new CustomEvent('aiResponse', { detail: { text } }));
    });

    // Handle turn completion (Matches Context/agent.js)
    agentInstance.on('turn_complete', () => {
        // console.log("Agent turn complete."); // Debug log
        window.chatManager?.finalizeStreamingMessage();
        
        // Dispatch AI response end event for audio chat mode
        document.dispatchEvent(new CustomEvent('aiResponseEnd'));
    });

    // Handle interruption (Matches Context/agent.js)
    agentInstance.on('interrupted', () => {
        // console.log("Agent interrupted."); // Debug log
        window.chatManager?.finalizeStreamingMessage(); // Finalize potentially incomplete message
        StatusManager.addStatus("Model interrupted", 2000);
        
        // Dispatch AI response end event for audio chat mode
        document.dispatchEvent(new CustomEvent('aiResponseEnd'));
    });

    // Listen for user transcription coming *from the agent* if enabled there
    agentInstance.on('user_transcription', (transcriptData) => {
         // Process only final transcripts to avoid sending partial speech
         if (transcriptData && transcriptData.transcript && transcriptData.isFinal) {
             console.log("Agent user transcription (final):", transcriptData.transcript); // Debug log
             // Send final transcript as a user message
             handleMessageSend(transcriptData.transcript); // Send the final text
         }
    });

    // Handle model transcription if needed (e.g., for subtitles)
    agentInstance.on('transcription', (transcriptData) => {
        // console.log("Model Transcription:", transcriptData.transcript);
    });

    // Handle screen share stopping externally (Matches Context/agent.js)
    agentInstance.on('screenshare_stopped', () => {
        const screenBtn = document.getElementById('screenBtn');
        screenBtn?.classList.remove('active');
        if (window.mediaManager) window.mediaManager.isScreenActive = false; // Update state in MediaManager
        StatusManager.addStatus("Screen sharing stopped", 3000);
    });

    // Add listener for connection status changes if agent emits them
    // agentInstance.on('connected', () => { ... });
    // agentInstance.on('disconnected', () => { ... });
}


/**
 * Sets up speech synthesis handling.
 */
function setupSpeechHandling() {
    // Listen for AI responses to handle text-to-speech
    document.addEventListener('aiResponse', async (event) => {
        // Check the global speechEnabled flag managed by MediaManager/SettingsManager
        // This flag should be updated by the speakBtn toggle and settings load
        if (event.detail && event.detail.text && window.speechEnabled) {
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
 * Ensures the agent is connected and initialized before performing an action.
 * @returns {Promise<boolean>} True if ready, false otherwise.
 */
async function ensureAgentReady() {
    if (!agent) {
        console.error("Agent not initialized.");
        StatusManager.addStatus("Agent not ready.", 3000);
        return false;
    }
    const powerBtn = document.getElementById('powerBtn');
    if (!agent.connected) {
        StatusManager.addStatus("Connecting...", 2000);
        try {
            // Update config before connecting, in case settings changed
            agent.config = getConfig();
            agent.url = getWebsocketUrl(); // Update URL in case API key changed

            // Add a timeout to the connection attempt
            const connectionPromise = agent.connect();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Connection timeout")), 10000)
            );
            
            await Promise.race([connectionPromise, timeoutPromise]);
            await agent.initialize(); // Initialize after connecting
            
            powerBtn?.classList.add('connected');
            powerBtn?.setAttribute('aria-pressed', 'true');
            powerBtn?.setAttribute('aria-label', 'Disconnect');
            StatusManager.addStatus("Connected", 2000);
            return true;
        } catch (error) {
            console.error('Error connecting/initializing agent:', error);
            StatusManager.addStatus(`Connection failed: ${error.message || 'Unknown error'}`, 5000);
            powerBtn?.classList.remove('connected');
            powerBtn?.setAttribute('aria-pressed', 'false');
            powerBtn?.setAttribute('aria-label', 'Connect');
            return false;
        }
    }
    // If connected but not initialized (e.g., after disconnect/reconnect without page reload)
    if (!agent.initialized) {
         StatusManager.addStatus("Initializing agent...", 2000);
         try {
             await agent.initialize();
             return true;
         } catch (error) {
             console.error('Error initializing agent:', error);
             StatusManager.addStatus(`Initialization failed: ${error.message || 'Unknown error'}`, 5000);
             return false;
         }
    }
    return true; // Already connected and initialized
}


/**
 * Sets up UI event listeners (buttons, input).
 */
function setupUIEventListeners() {
    const powerBtn = document.getElementById('powerBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const screenBtn = document.getElementById('screenBtn');
    const micBtn = document.getElementById('micBtn');
    const speakBtn = document.getElementById('speakBtn');
    const audioChatBtn = document.getElementById('audioChatBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    // Power Button (Connect/Disconnect)
    powerBtn?.addEventListener('click', async () => {
        if (agent?.connected) {
            try {
                await agent.disconnect();
                powerBtn.classList.remove('connected');
                powerBtn.setAttribute('aria-pressed', 'false');
                powerBtn.setAttribute('aria-label', 'Connect');
                StatusManager.addStatus("Disconnected", 2000);
                window.mediaManager?.cleanup(); // Cleanup media on disconnect
            } catch (error) {
                console.error('Error disconnecting:', error);
                StatusManager.addStatus("Disconnect failed", 3000);
            }
        } else {
            // ensureAgentReady handles the connection logic
            await ensureAgentReady();
        }
    });

    // New Chat Button
    newChatBtn?.addEventListener('click', async () => { // Make async if agent reset is async
        window.chatManager?.clear();
        // TODO: Add agent context reset if implemented and connected
        // if (agent?.connected) await agent.resetContext();
        StatusManager.addStatus("Starting new chat session", 2000);
    });

    // Camera Button
    cameraBtn?.addEventListener('click', async () => {
        if (!await ensureAgentReady()) return;
        await window.mediaManager?.toggleCamera(); // MediaManager handles agent calls internally
    });

    // Screen Share Button
    screenBtn?.addEventListener('click', async () => {
        if (!await ensureAgentReady()) return;
        await window.mediaManager?.toggleScreen(); // MediaManager handles agent calls internally
    });

    // Microphone Button
    micBtn?.addEventListener('click', async () => {
        if (!await ensureAgentReady()) return;
        await window.mediaManager?.toggleMic(); // MediaManager handles agent calls internally
    });

    // Audio Chat Mode Button
    audioChatBtn?.addEventListener('click', async () => {
        if (!await ensureAgentReady()) return;
        await window.mediaManager?.toggleAudioChat(); // MediaManager handles state
        
        // Auto-start microphone if audio chat mode is activated
        if (window.mediaManager?.isAudioChatMode && !window.mediaManager?.isMicActive) {
            await window.mediaManager?.toggleMic();
        }
    });

    // Text-to-Speech Button
    speakBtn?.addEventListener('click', () => {
        window.mediaManager?.toggleSpeaker(); // MediaManager handles state and TTS enabling/disabling
    });

    // Settings Button
    settingsBtn?.addEventListener('click', () => {
        window.settingsManager.initialize(); // Ensure initialized
        window.settingsManager.show();
    });

    // Message Input and Send Button
    if (messageInput && sendBtn) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleMessageSend(); // Call the refactored send function
            }
        });
        sendBtn.addEventListener('click', handleMessageSend); // Call the refactored send function
    }
    
    // User Speech Event (from audio transcription)
    document.addEventListener('userSpeech', (event) => {
        if (event.detail && event.detail.text) {
            handleMessageSend(event.detail.text);
        }
    });
}

/**
 * Handles sending a text message or triggering image generation.
 * Accepts an optional text parameter (e.g., from transcription).
 * @param {string} [text] - Optional text to send. If not provided, uses input field value.
 */
async function handleMessageSend(text = null) {
    const messageInput = document.getElementById('messageInput');
    const message = text ?? messageInput?.value.trim(); // Use provided text or input value

    if (!message) return;

    const isLiveMode = document.getElementById('liveTab').checked;

    if (isLiveMode) {
        if (!await ensureAgentReady()) return; // Ensure connection before sending
        try {
            // Add user message visually *before* sending to agent
            window.chatManager?.addUserMessage(message);
            if (messageInput && !text) messageInput.value = ''; // Clear input only if it wasn't from transcription

            // Send text to the agent
            await agent.sendText(message);

        } catch (error) {
            console.error('Error sending message:', error);
            StatusManager.addStatus("Error sending message", 3000);
            // Optionally re-add message to input if sending failed?
            // if (messageInput && !text) messageInput.value = message;
        }
    } else {
        // IMG GEN message handling
        if (window.imgGenEvents) {
             // Pass the prompt to the handler
            window.imgGenEvents.handleImageGeneration(message); // Assuming this takes the prompt
             if (messageInput && !text) messageInput.value = ''; // Clear input
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
        liveModelDisplay?.classList.toggle('active', isLive); // Toggle model display visibility
        imgGenModelDisplay?.classList.toggle('active', !isLive); // Toggle model display visibility
        liveControlBar?.classList.toggle('active', isLive);
        imgGenControlBar?.classList.toggle('active', !isLive);

        // Clean up when switching away from IMG GEN
        if (isLive && window.imgGenEvents?.hideAllPopups) {
            window.imgGenEvents.hideAllPopups();
        }

        // Stop speech synthesis when switching tabs
        window.speechHandler?.stopSpeaking();

        // Stop mic recording if active when switching away from LIVE
        if (!isLive && window.mediaManager?.isMicActive) {
             window.mediaManager.toggleMic(); // Turn off mic
        } else if (isLive) {
             // If switching TO live, maybe re-enable mic if it was active?
             // Depends on desired UX. For now, user must manually toggle mic again.
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
