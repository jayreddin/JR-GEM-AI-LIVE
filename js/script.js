import { GeminiAgent } from './main/agent.js';
import { getConfig, getWebsocketUrl, getDeepgramApiKey, MODEL_SAMPLE_RATE } from './config/config.js';

import { GoogleSearchTool } from './tools/google-search.js';
import { ToolManager } from './tools/tool-manager.js';
import { ChatManager } from './chat/chat-manager.js';

import { setupEventListeners } from './dom/events.js';
import ThemeManager from './settings/theme-manager.js'; // Added import for theme manager


const url = getWebsocketUrl();
const config = getConfig();
const deepgramApiKey = getDeepgramApiKey();

const toolManager = new ToolManager();
toolManager.registerTool('googleSearch', new GoogleSearchTool());

// Make chatManager globally accessible
const chatManager = new ChatManager();
window.chatManager = chatManager;

const geminiAgent = new GeminiAgent({
    url,
    config,
    deepgramApiKey,
    modelSampleRate: MODEL_SAMPLE_RATE,
    toolManager
});

// Handle chat-related events
geminiAgent.on('transcription', (transcript) => {
    chatManager.updateStreamingMessage(transcript);
});

geminiAgent.on('text_sent', (text) => {
    chatManager.finalizeStreamingMessage();
    chatManager.addUserMessage(text);
});

geminiAgent.on('interrupted', () => {
    chatManager.finalizeStreamingMessage();
    if (!chatManager.lastUserMessageType) {
        chatManager.addUserAudioMessage();
    }
});

geminiAgent.on('turn_complete', () => {
    chatManager.finalizeStreamingMessage();
});

geminiAgent.on('text', (text) => {
    console.log('text', text);
    chatManager.updateStreamingMessage(text);
});

geminiAgent.connect();

// Initialize audio components after connection
geminiAgent.on('connected', async () => {
    try {
        await geminiAgent.initialize();
        console.log('Audio components initialized successfully');
    } catch (error) {
        console.error('Failed to initialize audio components:', error);
    }
});

// Initialize theme manager
const themeManager = new ThemeManager();

// Initialize speech capability
window.speechEnabled = localStorage.getItem('speakEnabled') === 'true';
if (window.speechEnabled) {
    const speakBtn = document.getElementById('speakBtn');
    if (speakBtn) {
        speakBtn.classList.add('active');
    }
}

// Implement Dark/Light mode themes
function toggleDarkMode() {
    themeManager.toggleDarkMode();
}

// Implement live text size adjustment
function updateTextSize(size) {
    document.body.style.fontSize = size + 'px';
}

// Implement show timestamps switch
function toggleTimestamps() {
    chatManager.toggleTimestamps();
}


// Implement 4th icon (Speak), speech synthesis, and live chat
function toggleSpeech() {
    window.speechEnabled = !window.speechEnabled;
    localStorage.setItem('speakEnabled', window.speechEnabled);
    const speakBtn = document.getElementById('speakBtn');
    if (speakBtn) {
        speakBtn.classList.toggle('active');
        chatManager.updateSpeechStatus(window.speechEnabled);
    }
}


// Placeholder for replacing power button icon
function replacePowerButtonIcon() {
    // Implement icon replacement logic here
    console.log('Power button icon replaced');
}


// Updated setupEventListeners to include themeManager and other elements
const elements = {
    darkModeToggle: document.getElementById('darkModeToggle'),
    textSizeSlider: document.getElementById('textSizeSlider'),
    timestampsToggle: document.getElementById('timestampsToggle'),
    speakBtn: document.getElementById('speakBtn'),
    powerButton: document.getElementById('powerButton')
};
// Import the settings manager instance
import settingsManager from './settings/settings-manager.js';

setupEventListeners(elements, settingsManager, geminiAgent, themeManager, toggleDarkMode, updateTextSize, toggleTimestamps, toggleSpeech, replacePowerButtonIcon);