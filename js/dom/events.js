import elements from './elements.js';

// Log available DOM elements for debugging
document.addEventListener('DOMContentLoaded', () => {
    // Store DOM elements
    const elements = {
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        cameraBtn: document.getElementById('cameraBtn'),
        screenBtn: document.getElementById('screenBtn'),
        chatHistory: document.getElementById('chatHistory')
    };

    const initialize = async () => {
        const agent = window.agent;
        if (!agent) {
            console.error('Agent not found');
            return;
        }

        // Message input handling
        if (elements.messageInput && elements.sendBtn) {
            const sendMessage = async () => {
                try {
                    await ensureAgentReady(agent);
                    const text = elements.messageInput.value.trim();
                    if (text) {
                        // Use the ChatManager to add the user message
                        const chatManager = window.chatManager;
                        if (!chatManager) {
                            console.error('ChatManager not initialized');
                            return;
                        }

                        // Add message to chat and send to agent
                        await chatManager.addUserMessage(text);
                        elements.messageInput.value = '';
                    }
                } catch (error) {
                    console.error('Error sending message:', error);
                    addStatusMessage('Failed to send message');
                }
            };

            elements.sendBtn.addEventListener('click', sendMessage);
            elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        // Mic button click
        const micBtn = document.getElementById('micBtn');
        if (micBtn) {
            micBtn.addEventListener('click', async () => {
                try {
                    if (!agent.initialized) {
                        await agent.initialize();
                    }
                    micBtn.classList.toggle('active');
                    await agent.toggleMic();
                    addStatusMessage(micBtn.classList.contains('active') ? 'Microphone activated' : 'Microphone deactivated');
                } catch (error) {
                    console.error('Microphone error:', error);
                    addStatusMessage('Microphone access error');
                    micBtn.classList.remove('active');
                }
            });
        }

        // Helper functions
        async function ensureAgentReady(agent) {
            if (!agent.connected) {
                await agent.connect();
                showDisconnectButton();
            }
            if (!agent.initialized) {
                await agent.initialize();
            }
        }

        // Function to add status message to chat
        const addStatusMessage = (message) => {
            const statusElement = document.createElement('div');
            statusElement.className = 'status-message';
            statusElement.textContent = message;
            document.getElementById('chatHistory').appendChild(statusElement);
            document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
        };

        // Function to get current timestamp
        const getTimestamp = () => {
            const now = new Date();
            return now.toLocaleTimeString();
        };

        // Camera toggle handler
        if (elements.cameraBtn) {
            elements.cameraBtn.addEventListener('click', async () => {
                try {
                    await ensureAgentReady(agent);
                    await agent.toggleCamera();
                    elements.cameraBtn.classList.toggle('active');
                    addStatusMessage(elements.cameraBtn.classList.contains('active') ? 'Camera activated' : 'Camera deactivated');
                } catch (error) {
                    console.error('Camera error:', error);
                    addStatusMessage('Camera access error');
                    elements.cameraBtn.classList.remove('active');
                }
            });
        }

        // Screen sharing handler
        if (elements.screenBtn) {
            elements.screenBtn.addEventListener('click', async () => {
                try {
                    await ensureAgentReady(agent);
                    await agent.toggleScreenShare();
                    elements.screenBtn.classList.toggle('active');
                    addStatusMessage(elements.screenBtn.classList.contains('active') ? 'Screen sharing activated' : 'Screen sharing deactivated');
                } catch (error) {
                    console.error('Screen sharing error:', error);
                    addStatusMessage('Screen sharing access error');
                    elements.screenBtn.classList.remove('active');
                    // Try to clean up any hanging resources
                    if (agent.screenInterval) {
                        await agent.stopScreenShare();
                    }
                }
            });
        }
    };

    initialize().catch(console.error);
});

import settingsManager from '../settings/settings-manager.js';

/**
 * Updates UI to show disconnect button and hide connect button
 */
const showDisconnectButton = () => {
    elements.connectBtn.style.display = 'none';
    elements.disconnectBtn.style.display = 'block';
};

/**
 * Updates UI to show connect button and hide disconnect button
 */
const showConnectButton = () => {
    elements.disconnectBtn.style.display = 'none';
    elements.connectBtn.style.display = 'block';
};

let isCameraActive = false;

/**
 * Ensures the agent is connected and initialized
 * @param {GeminiAgent} agent - The main application agent instance
 * @returns {Promise<void>}
 */
const ensureAgentReady = async (agent) => {
    if (!agent.connected) {
        await agent.connect();
        showDisconnectButton();
    }
    if (!agent.initialized) {
        await agent.initialize();
    }
};

/**
 * Sets up event listeners for the application's UI elements
 * @param {Object} elements - UI elements
 * @param {Object} settingsManager - Settings manager
 * @param {GeminiAgent} agent - The main application agent instance
 * @param {Object} themeManager - Theme manager
 * @param {Function} toggleDarkMode - Dark mode toggle function
 * @param {Function} updateTextSize - Text size update function
 * @param {Function} toggleTimestamps - Timestamps toggle function
 * @param {Function} toggleSpeech - Speech toggle function
 * @param {Function} replacePowerButtonIcon - Power button icon replacement function
 */
export function setupEventListeners(elements, settingsManager, agent, themeManager, toggleDarkMode, updateTextSize, toggleTimestamps, toggleSpeech, replacePowerButtonIcon) {
    // Make sure we have access to chatManager
    const chatManager = window.chatManager;
    if (!chatManager) {
        console.error('Chat manager not found in global scope');
    }

    // Add status message function (This is now a helper function in the DOMContentLoaded handler)

    // Implement send message (This is now a helper function in the DOMContentLoaded handler)


    // Disconnect handler (This is now handled in the DOMContentLoaded handler)

    // Connect handler (This is now handled in the DOMContentLoaded handler)

    // Microphone toggle handler (This is now handled in the DOMContentLoaded handler)


    // Camera toggle handler (This is now handled in the DOMContentLoaded handler)

    // Screen sharing handler (This is now handled in the DOMContentLoaded handler)

    // Power button functionality (This remains largely unchanged)
    const powerBtn = document.getElementById('powerBtn');
    const newChatBtn = document.getElementById('newChatBtn');

    let isConnected = true;

    if (powerBtn) {
        powerBtn.addEventListener('click', async () => {
            if (isConnected) {
                try {
                    await agent.disconnect();
                    powerBtn.classList.remove('connected');
                    isConnected = false;
                    addStatusMessage(`Disconnected - ${getTimestamp()}`);
                } catch (error) {
                    console.error('Error disconnecting:', error);
                }
            } else {
                try {
                    await agent.connect();
                    powerBtn.classList.add('connected');
                    isConnected = true;
                    addStatusMessage(`Connected - ${getTimestamp()}`);
                } catch (error) {
                    console.error('Error connecting:', error);
                }
            }
        });
    }

    // New chat button functionality (This remains largely unchanged)
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            // Clear chat history
            document.getElementById('chatHistory').innerHTML = '';
            // Reset any active streams
            if (isCameraActive && elements.cameraBtn) {
                elements.cameraBtn.click();
            }
            if (isScreenShareActive && elements.screenBtn) {
                elements.screenBtn.click();
            }
            if (isMicActive && elements.micBtn) {
                elements.micBtn.click();
            }
            // Add a status message
            addStatusMessage(`New chat started - ${getTimestamp()}`);
        });
    }


    // Message sending handlers (This is now handled in the DOMContentLoaded handler)


    // Settings button click (This remains largely unchanged)
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsManager && typeof settingsManager.toggleDialog === 'function') {
                settingsManager.toggleDialog();
            } else {
                console.error('settingsManager.toggleDialog is not a function');
            }
        });
    }

    // Speak button click (This remains largely unchanged)
    const speakBtn = document.getElementById('speakBtn');
    if (speakBtn) {
        speakBtn.addEventListener('click', () => {
            window.speechEnabled = !window.speechEnabled;
            speakBtn.classList.toggle('active');

            // Show status message
            if (window.speechEnabled) {
                addStatusMessage('Text-to-speech activated');
            } else {
                addStatusMessage('Text-to-speech deactivated');
                // Stop any ongoing speech
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                }
            }
        });
    }

    // Mic button click (This is now handled in the DOMContentLoaded handler)

}