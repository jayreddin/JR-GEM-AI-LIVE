/**
 * Handles attaching event listeners to DOM elements after the document is loaded.
 * Connects UI interactions (buttons, input, model selector) to ChatManager and Agent functionalities.
 */
import settingsManager from '../settings/settings-manager.js';
// Import model list and default from config for the selector
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '../config/config.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired, attaching event listeners..."); // Keep basic check

    // Retrieve necessary elements and instances
    const agent = window.agent;
    const chatManager = window.chatManager;

    // Check critical components exist
    if (!agent) {
        console.error('CRITICAL: GeminiAgent instance (window.agent) not found.');
        alert("Fatal Error: Agent module failed to load. App cannot start.");
        return;
    }
    if (!chatManager) {
        console.error('CRITICAL: ChatManager instance (window.chatManager) not found.');
        alert("Fatal Error: Chat manager module failed to load. App cannot start.");
        return;
    }

    // Cache frequently used elements
    const elements = {
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        micBtn: document.getElementById('micBtn'),
        cameraBtn: document.getElementById('cameraBtn'),
        screenBtn: document.getElementById('screenBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        powerBtn: document.getElementById('powerBtn'),
        newChatBtn: document.getElementById('newChatBtn'),
        modelSelector: document.getElementById('modelSelector'), // Added selector
        chatHistory: document.getElementById('chatHistory'),
        speakBtn: document.getElementById('speakBtn'),
        cameraPreview: document.getElementById('cameraPreview'),
        screenPreview: document.getElementById('screenPreview')
    };

    // Helper function to add status messages to chat (uses ChatManager now)
    const addStatusMessage = (message) => {
        // Use chatManager's method if available, otherwise log
        if (chatManager?.addStatusMessage) {
            chatManager.addStatusMessage(message);
        } else {
            console.log(`STATUS [${getTimestamp()}]: ${message}`);
        }
    };

    // Helper function to get current timestamp
    const getTimestamp = () => {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    // Helper function to ensure agent is connected (used by actions needing connection)
    const ensureAgentConnected = async (showStatus = true) => {
        if (agent.connected) {
            return true; // Already connected
        }
        if (showStatus) addStatusMessage('Connecting...');
        try {
            await agent.connect(); // Agent connect handles config loading
            if (elements.powerBtn) { // Update UI on successful connect
                elements.powerBtn.classList.add('connected');
                elements.powerBtn.setAttribute('aria-pressed', 'true');
                elements.powerBtn.setAttribute('aria-label', 'Disconnect');
            }
            if (showStatus) addStatusMessage('Connected');
            return true;
        } catch (error) {
            console.error('Agent connection failed:', error);
            if (elements.powerBtn) { // Update UI on connect failure
                elements.powerBtn.classList.remove('connected');
                elements.powerBtn.setAttribute('aria-pressed', 'false');
                elements.powerBtn.setAttribute('aria-label', 'Connect (Error)');
            }
            // Use chatManager's status message if possible
            addStatusMessage(`Error connecting: ${error.message || 'Unknown error'}`);
            return false;
        }
    };

    // Helper function to ensure agent is initialized (used by actions needing audio/mic)
    const ensureAgentInitialized = async (showStatus = true) => {
        if (agent.initialized) {
            return true;
        }
        // Agent must be connected to initialize
        if (!agent.connected) {
            addStatusMessage('Cannot initialize audio: Agent not connected.');
            return false;
        }
        if (showStatus) addStatusMessage('Initializing audio components...');
        try {
            await agent.initialize();
            if (showStatus) addStatusMessage('Audio initialized.');
            return true;
        } catch (initError) {
            console.error('Agent audio initialization failed:', initError);
            addStatusMessage(`Audio initialization failed: ${initError.message || 'Unknown error'}`);
            return false;
        }
    };


    // --- Event Listener Setup ---

    // Power Button (Connect/Disconnect)
    if (elements.powerBtn) {
        elements.powerBtn.setAttribute('aria-pressed', 'false');
        elements.powerBtn.setAttribute('aria-label', 'Connect');
        elements.powerBtn.addEventListener('click', async () => {
            console.log("Power button clicked");
            if (agent.connected) {
                try {
                    addStatusMessage('Disconnecting...');
                    await agent.disconnect(); // Agent's disconnect handles cleanup & state
                    elements.powerBtn.classList.remove('connected');
                    elements.powerBtn.setAttribute('aria-pressed', 'false');
                    elements.powerBtn.setAttribute('aria-label', 'Connect');
                    // Deactivate media buttons visually on disconnect
                    elements.micBtn?.classList.remove('active');
                    elements.cameraBtn?.classList.remove('active');
                    elements.screenBtn?.classList.remove('active');
                    elements.micBtn?.setAttribute('aria-pressed', 'false');
                    elements.cameraBtn?.setAttribute('aria-pressed', 'false');
                    elements.screenBtn?.setAttribute('aria-pressed', 'false');
                    addStatusMessage('Disconnected');
                } catch (error) {
                    console.error('Error disconnecting:', error);
                    addStatusMessage(`Error disconnecting: ${error.message || 'Unknown error'}`);
                    elements.powerBtn.classList.remove('connected'); // Ensure disconnected state on error
                    elements.powerBtn.setAttribute('aria-pressed', 'false');
                    elements.powerBtn.setAttribute('aria-label', 'Connect (Error)');
                }
            } else {
                // Attempt connection (handles UI updates via ensureAgentConnected)
                await ensureAgentConnected(true);
            }
        });
    } else { console.warn('Power button (#powerBtn) not found.'); }

    // New Chat Button
    if (elements.newChatBtn) {
        elements.newChatBtn.addEventListener('click', async () => {
            console.log("New Chat button clicked");
            addStatusMessage('Starting new chat...');
            if (chatManager) chatManager.clear(); // Clear the visual chat history

            // Stop active media streams if agent is initialized
            if (agent.connected && agent.initialized) {
                if (elements.micBtn?.classList.contains('active')) {
                    try { await agent.toggleMic(); elements.micBtn.classList.remove('active'); elements.micBtn.setAttribute('aria-pressed', 'false'); }
                    catch (error) { console.error('Error stopping mic for new chat:', error); addStatusMessage('Error stopping mic.'); }
                }
                if (elements.cameraBtn?.classList.contains('active')) {
                    try { await agent.stopCameraCapture(); elements.cameraBtn.classList.remove('active'); elements.cameraBtn.setAttribute('aria-pressed', 'false'); }
                    catch (error) { console.error('Error stopping camera for new chat:', error); addStatusMessage('Error stopping camera.'); }
                }
                if (elements.screenBtn?.classList.contains('active')) {
                    try { await agent.stopScreenShare(); elements.screenBtn.classList.remove('active'); elements.screenBtn.setAttribute('aria-pressed', 'false'); }
                    catch (error) { console.error('Error stopping screen share for new chat:', error); addStatusMessage('Error stopping screen share.'); }
                }
                // Optionally send reset signal to agent if API supports it
            } else if (!agent.connected) {
                addStatusMessage('New chat ready (Agent is disconnected).');
            } else {
                addStatusMessage('New chat ready.'); // Agent connected but not initialized
            }
        });
    } else { console.warn('New chat button (#newChatBtn) not found.'); }

    // --- Model Selector Setup ---
    if (elements.modelSelector) {
        try {
            // 1. Populate Options
            AVAILABLE_MODELS.forEach(modelName => {
                const option = document.createElement('option');
                option.value = modelName;
                // Display a shorter name if possible (e.g., remove "models/")
                option.textContent = modelName.startsWith('models/') ? modelName.substring(7) : modelName;
                elements.modelSelector.appendChild(option);
            });

            // 2. Set Initial Value from localStorage or Default
            const savedModel = localStorage.getItem('selectedModel') || DEFAULT_MODEL;
            // Ensure the saved model is actually in the list before setting
            if (AVAILABLE_MODELS.includes(savedModel)) {
                elements.modelSelector.value = savedModel;
            } else {
                console.warn(`Saved model "${savedModel}" not in available list. Using default: ${DEFAULT_MODEL}`);
                elements.modelSelector.value = DEFAULT_MODEL;
                localStorage.setItem('selectedModel', DEFAULT_MODEL); // Save default if saved one was invalid
            }
            console.log(`Model selector initialized. Current value: ${elements.modelSelector.value}`);


            // 3. Add Change Event Listener
            elements.modelSelector.addEventListener('change', async (event) => {
                const newModel = event.target.value;
                console.log(`Model selection changed to: ${newModel}`);

                // Save the new selection
                try {
                    localStorage.setItem('selectedModel', newModel);
                } catch (error) {
                    console.error("Error saving selected model to localStorage:", error);
                    addStatusMessage("Error saving model preference.");
                    // Optionally revert selector value?
                    // event.target.value = localStorage.getItem('selectedModel') || DEFAULT_MODEL;
                    return; // Stop processing if save failed
                }

                // Inform user and reconnect agent
                addStatusMessage(`Model changed to ${newModel.substring(7)}. Reconnecting...`);

                const wasConnected = agent.connected; // Check current state

                try {
                    // Disconnect if currently connected
                    if (wasConnected) {
                        await agent.disconnect();
                        // Update power button state visually
                        if (elements.powerBtn) {
                            elements.powerBtn.classList.remove('connected');
                            elements.powerBtn.setAttribute('aria-pressed', 'false');
                            elements.powerBtn.setAttribute('aria-label', 'Connect');
                        }
                        // Deactivate media buttons visually
                        elements.micBtn?.classList.remove('active');
                        elements.cameraBtn?.classList.remove('active');
                        elements.screenBtn?.classList.remove('active');
                        elements.micBtn?.setAttribute('aria-pressed', 'false');
                        elements.cameraBtn?.setAttribute('aria-pressed', 'false');
                        elements.screenBtn?.setAttribute('aria-pressed', 'false');
                    }

                    // Reconnect (will use the new model from localStorage via getConfig)
                    // Ensure connection attempt happens even if initially disconnected
                    await ensureAgentConnected(false); // Connect silently first

                } catch (error) {
                    console.error(`Error during reconnect after model change:`, error);
                    addStatusMessage(`Failed to reconnect with new model: ${error.message}`);
                    // UI should reflect disconnected state via ensureAgentConnected error handling
                }
            });

        } catch (error) {
            console.error("Error setting up model selector:", error);
            if (elements.modelSelector) {
                elements.modelSelector.disabled = true; // Disable selector on error
                const option = document.createElement('option');
                option.textContent = "Error loading models";
                elements.modelSelector.appendChild(option);
            }
        }
    } else { console.warn('Model selector (#modelSelector) not found.'); }


    // Settings Button
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', () => {
            console.log("Settings button clicked");
            if (settingsManager && typeof settingsManager.toggleDialog === 'function') {
                settingsManager.toggleDialog();
            } else {
                console.error('SettingsManager instance or toggleDialog method not available.');
                addStatusMessage('Could not open settings.');
            }
        });
    } else { console.warn('Settings button (#settingsBtn) not found.'); }

    // Send Message Input & Button
    const handleSendMessage = async () => {
        console.log("Send button clicked / Enter pressed");
        const text = elements.messageInput?.value?.trim(); // Optional chaining
        if (!text || !elements.messageInput) return;

        // Ensure agent is connected before sending
        if (!await ensureAgentConnected(true)) {
            addStatusMessage('Cannot send message: Agent not connected.');
            return;
        }

        try {
            elements.messageInput.value = ''; // Clear input
            if (chatManager) chatManager.addUserMessage(text); // Add to UI
            await agent.sendText(text); // Send to agent
            console.log("agent.sendText called successfully.");
        } catch (error) {
            console.error('Error sending message:', error);
            addStatusMessage(`Failed to send message: ${error.message || 'Unknown error'}`);
        }
    };

    if (elements.sendBtn && elements.messageInput) {
        elements.sendBtn.addEventListener('click', handleSendMessage);
        elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    } else { console.warn('Send button (#sendBtn) or message input (#messageInput) not found.'); }

    // Microphone Button
    if (elements.micBtn) {
        elements.micBtn.setAttribute('aria-pressed', 'false');
        elements.micBtn.addEventListener('click', async () => {
            console.log("Mic button clicked");
            // Ensure connected first
            if (!await ensureAgentConnected(true)) {
                addStatusMessage('Cannot use microphone: Agent not connected.');
                return;
            }
            // Ensure initialized (handles audio setup)
            if (!await ensureAgentInitialized(true)) {
                addStatusMessage('Cannot use microphone: Audio initialization failed.');
                return;
            }

            try {
                await agent.toggleMic();
                const isActive = elements.micBtn.classList.toggle('active');
                elements.micBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                addStatusMessage(isActive ? 'Microphone activated' : 'Microphone deactivated');
            } catch (error) {
                console.error('Microphone toggle error:', error);
                addStatusMessage(`Microphone error: ${error.message || 'Unknown error'}`);
                elements.micBtn.classList.remove('active'); // Ensure inactive state on error
                elements.micBtn.setAttribute('aria-pressed', 'false');
            }
        });
    } else { console.warn('Microphone button (#micBtn) not found.'); }

    // Camera Button
    if (elements.cameraBtn) {
        elements.cameraBtn.setAttribute('aria-pressed', 'false');
        elements.cameraBtn.addEventListener('click', async () => {
            console.log("Camera button clicked");
            if (!await ensureAgentConnected(true)) {
                addStatusMessage('Cannot use camera: Agent not connected.');
                return;
            }

            const isActive = elements.cameraBtn.classList.contains('active');
            try {
                if (!isActive) {
                    addStatusMessage('Starting camera...');
                    await agent.startCameraCapture();
                    elements.cameraBtn.classList.add('active');
                    elements.cameraBtn.setAttribute('aria-pressed', 'true');
                    addStatusMessage('Camera activated');
                    if (elements.cameraPreview) elements.cameraPreview.style.display = 'block'; // Show preview
                } else {
                    addStatusMessage('Stopping camera...');
                    await agent.stopCameraCapture();
                    elements.cameraBtn.classList.remove('active');
                    elements.cameraBtn.setAttribute('aria-pressed', 'false');
                    addStatusMessage('Camera deactivated');
                    if (elements.cameraPreview) elements.cameraPreview.style.display = 'none'; // Hide preview
                }
            } catch (error) {
                console.error('Camera toggle error:', error);
                addStatusMessage(`Camera error: ${error.message || 'Unknown error'}`);
                elements.cameraBtn.classList.remove('active');
                elements.cameraBtn.setAttribute('aria-pressed', 'false');
                if (elements.cameraPreview) elements.cameraPreview.style.display = 'none';
                try { await agent.stopCameraCapture(); } catch { /* ignore cleanup error */ }
            }
        });
    } else { console.warn('Camera button (#cameraBtn) not found.'); }

    // Screen Share Button
    if (elements.screenBtn) {
        elements.screenBtn.setAttribute('aria-pressed', 'false');
        agent.on('screenshare_stopped', () => { // Listen for external stop
            if (elements.screenBtn?.classList.contains('active')) {
                elements.screenBtn.classList.remove('active');
                elements.screenBtn.setAttribute('aria-pressed', 'false');
                addStatusMessage('Screen sharing stopped (externally)');
                if (elements.screenPreview) elements.screenPreview.style.display = 'none';
            }
        });

        elements.screenBtn.addEventListener('click', async () => {
            console.log("Screen button clicked");
            if (!await ensureAgentConnected(true)) {
                addStatusMessage('Cannot share screen: Agent not connected.');
                return;
            }

            const isActive = elements.screenBtn.classList.contains('active');
            try {
                if (!isActive) {
                    addStatusMessage('Starting screen share...');
                    await agent.startScreenShare(); // This throws specific error if user denies
                    elements.screenBtn.classList.add('active');
                    elements.screenBtn.setAttribute('aria-pressed', 'true');
                    addStatusMessage('Screen sharing activated');
                    if (elements.screenPreview) elements.screenPreview.style.display = 'block';
                } else {
                    addStatusMessage('Stopping screen share...');
                    await agent.stopScreenShare();
                    elements.screenBtn.classList.remove('active');
                    elements.screenBtn.setAttribute('aria-pressed', 'false');
                    addStatusMessage('Screen sharing deactivated');
                    if (elements.screenPreview) elements.screenPreview.style.display = 'none';
                }
            } catch (error) {
                console.error('Screen sharing toggle error:', error);
                // Check if it was user cancellation
                if (error.name !== 'NotAllowedError' && !error.message.includes('denied') && !error.message.includes('cancel')) {
                    addStatusMessage(`Screen sharing error: ${error.message || 'Unknown error'}`);
                } else {
                    addStatusMessage('Screen sharing cancelled or denied.');
                }
                elements.screenBtn.classList.remove('active');
                elements.screenBtn.setAttribute('aria-pressed', 'false');
                if (elements.screenPreview) elements.screenPreview.style.display = 'none';
                try { await agent.stopScreenShare(); } catch { /* ignore cleanup error */ }
            }
        });
    } else { console.warn('Screen share button (#screenBtn) not found.'); }

    // Speak Button (TTS Toggle)
    if (elements.speakBtn) {
        window.speechEnabled = localStorage.getItem('speakEnabled') === 'true';
        if (window.speechEnabled) {
            elements.speakBtn.classList.add('active');
            elements.speakBtn.setAttribute('aria-pressed', 'true');
        } else {
            elements.speakBtn.setAttribute('aria-pressed', 'false');
        }

        elements.speakBtn.addEventListener('click', () => {
            console.log("Speak button clicked");
            window.speechEnabled = !window.speechEnabled;
            localStorage.setItem('speakEnabled', window.speechEnabled);

            const isActive = elements.speakBtn.classList.toggle('active');
            elements.speakBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

            if (isActive) {
                addStatusMessage('Text-to-speech activated');
            } else {
                addStatusMessage('Text-to-speech deactivated');
                if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                }
            }
            if (chatManager?.updateSpeechStatus) {
                chatManager.updateSpeechStatus(window.speechEnabled);
            }
        });
    } else { console.warn('Speak button (#speakBtn) not found.'); }


    // Initial UI state check based on agent state (if loaded before DOM ready)
    if (agent.connected && elements.powerBtn) {
        elements.powerBtn.classList.add('connected');
        elements.powerBtn.setAttribute('aria-pressed', 'true');
        elements.powerBtn.setAttribute('aria-label', 'Disconnect');
    }

    console.log("Event listeners attached."); // Confirm setup completed

}); // End DOMContentLoaded