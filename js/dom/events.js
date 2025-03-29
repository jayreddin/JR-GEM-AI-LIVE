import elements from './elements.js';
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
 * @param {GeminiAgent} agent - The main application agent instance
 */
export function setupEventListeners(agent) {
    // Make sure agent is defined
    if (!agent) {
        console.error('Agent is undefined in setupEventListeners');
        return;
    }
    // Disconnect handler
    if (elements.disconnectBtn) {
    elements.disconnectBtn.addEventListener('click', async () => {
        try {
            await agent.disconnect();
            showConnectButton();
            [elements.cameraBtn, elements.screenBtn, elements.micBtn].forEach(btn => btn.classList.remove('active'));
            isCameraActive = false;
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    });
    }

    // Connect handler
    if (elements.connectBtn) {
    elements.connectBtn.addEventListener('click', async () => {
        try {
            await ensureAgentReady(agent);
        } catch (error) {
            console.error('Error connecting:', error);
        }
    });
    }

    // Microphone toggle handler
    let isMicActive = false;
    if (elements.micBtn) {
        elements.micBtn.addEventListener('click', async () => {
            try {
                await ensureAgentReady(agent);
                await agent.toggleMic();

                isMicActive = !isMicActive;

                if (isMicActive) {
                    elements.micBtn.classList.add('active');
                    addStatusMessage(`Microphone: Active - ${getTimestamp()}`);
                } else {
                    elements.micBtn.classList.remove('active');
                    addStatusMessage(`Microphone: Deactivated - ${getTimestamp()}`);
                }
            } catch (error) {
                console.error('Error toggling microphone:', error);
                elements.micBtn.classList.remove('active');
                isMicActive = false;
            }
        });
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

            if (!isCameraActive) {
                await agent.startCameraCapture();
                elements.cameraBtn.classList.add('active');
                addStatusMessage(`Live Camera: Active - ${getTimestamp()}`);
            } else {
                await agent.stopCameraCapture();
                elements.cameraBtn.classList.remove('active');
                addStatusMessage(`Live Camera: Deactivated - ${getTimestamp()}`);
            }
            isCameraActive = !isCameraActive;
        } catch (error) {
            console.error('Error toggling camera:', error);
            elements.cameraBtn.classList.remove('active');
            isCameraActive = false;
        }
    });
    }

    // Screen sharing handler
    let isScreenShareActive = false;

    // Listen for screen share stopped events (from native browser controls)
    agent.on('screenshare_stopped', () => {
        if(elements.screenBtn){
            elements.screenBtn.classList.remove('active');
        }
        isScreenShareActive = false;
        addStatusMessage(`Live Screen Share: Deactivated - ${getTimestamp()}`);
        console.info('Screen share stopped');
    });

    // Power button functionality
    const powerBtn = document.getElementById('powerBtn');
    const newChatBtn = document.getElementById('newChatBtn');

    let isConnected = true;

    if(powerBtn){
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

    // New chat button functionality
    if(newChatBtn){
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

    if(elements.screenBtn){
        elements.screenBtn.addEventListener('click', async () => {
            try {
                await ensureAgentReady(agent);

                if (!isScreenShareActive) {
                    await agent.startScreenShare();
                    elements.screenBtn.classList.add('active');
                    addStatusMessage(`Live Screen Share: Active - ${getTimestamp()}`);
                } else {
                    await agent.stopScreenShare();
                    elements.screenBtn.classList.remove('active');
                    addStatusMessage(`Live Screen Share: Deactivated - ${getTimestamp()}`);
                }
                isScreenShareActive = !isScreenShareActive;
            } catch (error) {
                console.error('Error toggling screen share:', error);
                elements.screenBtn.classList.remove('active');
                isScreenShareActive = false;
            }
        });
    }

    // Message sending handlers
    const sendMessage = async () => {
        try {
            await ensureAgentReady(agent);
            if (!elements.messageInput) {
                console.error('Message input element not found');
                return;
            }
            const text = elements.messageInput.value.trim();
            if (text) {
                const messageElement = document.createElement('div');
                messageElement.classList.add('chat-message', 'user-message');

                // Add title with timestamp
                const titleElement = document.createElement('div');
                titleElement.classList.add('chat-title');
                titleElement.textContent = `User: You - ${getTimestamp()}`;
                messageElement.appendChild(titleElement);

                const textElement = document.createElement('div');
                textElement.textContent = text;
                messageElement.appendChild(textElement);

                document.getElementById('chatHistory').appendChild(messageElement);

                await agent.sendText(text);
                elements.messageInput.value = '';
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    if (elements.sendBtn) {
        elements.sendBtn.addEventListener('click', sendMessage);
    }

    if (elements.messageInput) {
        elements.messageInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    // Settings button click
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => settingsManager.toggleDialog());
    }
    
    // Speak button click
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
}