/**
 * Manages the chat history UI, including adding user and model messages,
 * handling streaming messages, timestamps, and text-to-speech output.
 */
import StatusManager from '../dom/status-manager.js'; // Import StatusManager

export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.statusManager = StatusManager; // Use the imported instance

        if (!this.chatContainer) {
            console.error('Chat container (#chatHistory) not found!');
            // Attempt fallback creation if necessary
            try {
                this.chatContainer = document.createElement('div');
                this.chatContainer.id = 'chatHistory';
                this.chatContainer.className = 'chat-history';
                document.body.appendChild(this.chatContainer);
                console.warn('Fallback chat container appended to body.');
            } catch (error) {
                console.error("CRITICAL: Failed to find or create chat container.", error);
                this.chatContainer = null;
            }
        }

        // State Variables:
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
        this.isSpeechEnabled = localStorage.getItem('speakEnabled') === 'true';
        this.visualizer = window.mediaManager?.visualizer; // Get visualizer from MediaManager

        console.info("ChatManager initialized.");
    }

    /** Adds a user message to the chat. */
    addUserMessage(text) {
        if (!this.chatContainer) return;
        const messageDiv = this._createMessageElement('user-message');
        messageDiv.appendChild(this._createTitleElement('You'));
        messageDiv.appendChild(this._createContentElement(text));
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'text';
        this.scrollToBottom();
    }

    /** Adds a placeholder for user voice input. */
    addUserAudioMessage() {
        if (!this.chatContainer) return;
        const messageDiv = this._createMessageElement('user-message');
        messageDiv.appendChild(this._createTitleElement('You'));
        const contentDiv = this._createContentElement('🎤 Voice input');
        contentDiv.style.fontStyle = 'italic';
        messageDiv.appendChild(contentDiv);
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio';
        this.scrollToBottom();
    }

    /** Starts a new model message structure. */
    startModelMessage() {
        if (!this.chatContainer) return;
        if (this.currentStreamingMessage) this.finalizeStreamingMessage();
        if (!this.lastUserMessageType) this.addUserAudioMessage();

        const messageDiv = this._createMessageElement('model-message streaming');
        messageDiv.appendChild(this._createTitleElement('Gemini')); // Simplified name
        messageDiv.appendChild(this._createContentElement(''));
        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv;
        this.currentTranscript = '';
        this.scrollToBottom();
    }

    /** Updates the currently streaming model message. */
    updateStreamingMessage(textChunk) {
        if (!this.chatContainer) return;
        if (!this.currentStreamingMessage) {
            this.startModelMessage();
            if (!this.currentStreamingMessage) return; // Guard if start failed
        }

        const contentDiv = this.currentStreamingMessage.querySelector('.chat-content');
        if (contentDiv) {
            this.currentTranscript += textChunk;
            contentDiv.textContent = this.currentTranscript;
            this.scrollToBottom();
            if (this.isSpeechEnabled && textChunk?.trim()) {
                this.speakText(textChunk);
            }
        } else {
            console.error("Could not find .chat-content in streaming message.");
            this.finalizeStreamingMessage();
        }
    }

    /** Finalizes the streaming message. */
    finalizeStreamingMessage() {
        this.currentStreamingMessage?.classList.remove('streaming');
        this.currentStreamingMessage = null;
        this.currentTranscript = '';
        this.lastUserMessageType = null;
        // Ensure AI wave bar stops if speech ends abruptly
        // this.visualizer?.disconnectSource('ai'); // Moved to utterance.onend
    }

    /** Speaks text using SpeechSynthesis API and controls AI wave bar. */
    speakText(text) {
        if (!('speechSynthesis' in window) || !this.isSpeechEnabled || !text?.trim()) {
            return;
        }

        try {
            // Ensure visualizer is available
            if (!this.visualizer && window.mediaManager?.visualizer) {
                 this.visualizer = window.mediaManager.visualizer;
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // --- Wave Bar Control ---
            utterance.onstart = () => {
                console.log("AI Speech started, activating wave bar.");
                // We pass null because we can't connect the source directly,
                // but connectSource will still activate the bar.
                this.visualizer?.connectSource(null, 'ai'); 
            };
            utterance.onend = () => {
                console.log("AI Speech ended, deactivating wave bar.");
                this.visualizer?.disconnectSource('ai');
            };
            utterance.onerror = (event) => {
                console.error(`SpeechSynthesisUtterance Error: ${event.error}`, event);
                this.visualizer?.disconnectSource('ai'); // Deactivate bar on error too
            };
            // --- End Wave Bar Control ---

            // Optional: Configure voice, rate, pitch from settings if needed
            // const voiceName = localStorage.getItem('voiceName');
            // if (voiceName) {
            //     const voices = window.speechSynthesis.getVoices();
            //     utterance.voice = voices.find(v => v.name === voiceName);
            // }
            // utterance.rate = parseFloat(localStorage.getItem('speechRate') || '1');
            // utterance.pitch = parseFloat(localStorage.getItem('speechPitch') || '1');

            window.speechSynthesis.speak(utterance);

        } catch (error) {
            console.error("Error in speakText:", error);
            this.visualizer?.disconnectSource('ai'); // Ensure deactivation on error
        }
    }

    /** Updates internal speech status and cancels ongoing speech if disabled. */
    updateSpeechStatus(isEnabled) {
        this.isSpeechEnabled = !!isEnabled;
        console.log("ChatManager speech status updated:", this.isSpeechEnabled);
        if (!this.isSpeechEnabled && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            this.visualizer?.disconnectSource('ai'); // Deactivate bar when globally disabled
            console.log("Ongoing speech cancelled.");
        }
    }

    /** Clears chat history and resets state. */
    clear() {
        if (this.chatContainer) {
            this.chatContainer.innerHTML = ''; // Clear UI
            // Re-add essential containers if they were inside chatHistory
            this.chatContainer.innerHTML = `
                <div class="status-container"></div>
                <div class="wave-container">
                    <canvas class="wave-bar ai"></canvas>
                    <canvas class="wave-bar user"></canvas>
                </div>`;
            console.log("Chat history cleared.");
        }
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            this.visualizer?.disconnectSource('ai');
        }
        this.statusManager.clearAll(); // Use StatusManager to clear statuses
    }

    /** Scrolls chat to the bottom. */
    scrollToBottom() {
        if (this.chatContainer) {
            try {
                this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
            } catch (error) {
                console.warn("Error scrolling chat container:", error);
            }
        }
    }

    // --- Private Helper Methods ---
    _createMessageElement(messageTypeClass) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${messageTypeClass}`;
        return messageDiv;
    }

    _createTitleElement(senderName) {
        const titleDiv = document.createElement('div');
        titleDiv.className = 'chat-title';
        const timestamp = this._getTimestampString();
        titleDiv.textContent = timestamp ? `${senderName} - ${timestamp}` : senderName;

            window.speechSynthesis.speak(utterance);

        } catch (error) {
            console.error("Error creating or speaking SpeechSynthesisUtterance:", error);
            // Potentially disable speech feature if errors are persistent
            // this.updateSpeechStatus(false);
        }
    }

    /**
     * Toggles the display of timestamps in chat messages based on localStorage.
     * Note: This currently only affects *new* messages added after the toggle.
     * To update existing messages, more complex DOM manipulation would be needed.
     */
    toggleTimestamps() {
        const currentSetting = localStorage.getItem('showTimestamps') === 'true';
        localStorage.setItem('showTimestamps', !currentSetting);
        console.log('Timestamp display toggled to:', !currentSetting, "(Affects new messages)");
        // Optionally, trigger a re-render or update existing messages if desired.
    }

    /**
     * Updates the internal speech enabled status. Called from event listeners or settings.
     * @param {boolean} isEnabled - The new status for speech synthesis.
     */
    updateSpeechStatus(isEnabled) {
        this.isSpeechEnabled = !!isEnabled; // Coerce to boolean
        console.log("ChatManager speech status updated:", this.isSpeechEnabled);
        // If speech is being disabled, cancel any ongoing speech
        if (!this.isSpeechEnabled && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            console.log("Ongoing speech cancelled due to status update.");
        }
    }


    /** Clears all messages from the chat history UI and resets state. */
    clear() {
        if (this.chatContainer) {
            this.chatContainer.innerHTML = ''; // Clear UI
            console.log("Chat history cleared.");
        } else {
            console.error("Cannot clear chat history: Container not found.");
        }
        // Reset state variables
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
        // Cancel any ongoing speech synthesis
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    }

    /** Scrolls the chat container to the bottom. */
    scrollToBottom() {
        if (this.chatContainer) {
            // Use smooth scrolling if supported/desired
            // this.chatContainer.scrollTo({ top: this.chatContainer.scrollHeight, behavior: 'smooth' });
            // Using immediate scroll for now
            try {
                this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
            } catch (error) {
                console.warn("Error scrolling chat container:", error);
            }
        }
    }

    // --- Private Helper Methods ---

    /**
     * Creates a basic message div element with common class names.
     * @param {string} messageTypeClass - Class specific to message type (e.g., 'user-message', 'model-message').
     * @returns {HTMLDivElement} The created message container div.
     */
    _createMessageElement(messageTypeClass) {
        const messageDiv = document.createElement('div');
        // Basic classes + specific type class
        messageDiv.className = `chat-message ${messageTypeClass}`;
        return messageDiv;
    }

    /**
     * Creates the title element (sender name + optional timestamp).
     * @param {string} senderName - The name of the sender ('You', 'Gemini', etc.).
     * @returns {HTMLDivElement} The created title div.
     */
    _createTitleElement(senderName) {
        const titleDiv = document.createElement('div');
        titleDiv.className = 'chat-title';
        const timestamp = this._getTimestampString(); // Get timestamp string if enabled
        titleDiv.textContent = timestamp ? `${senderName} - ${timestamp}` : senderName;
        return titleDiv;
    }

    /**
     * Creates the content element for the message text.
     * @param {string} textContent - The initial text content.
     * @returns {HTMLDivElement} The created content div.
     */
    _createContentElement(textContent) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-content';
        contentDiv.textContent = textContent; // Set initial text
        return contentDiv;
    }

    /**
     * Gets the current time as a formatted string if timestamps are enabled.
     * @returns {string|null} Formatted time string (e.g., "09:15") or null.
     */
    _getTimestampString() {
        // Check localStorage directly for the most up-to-date setting
        if (localStorage.getItem('showTimestamps') === 'true') {
            const now = new Date();
            // Use 2-digit format for hour and minute
            return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); // Use 24hr format for consistency unless locale implies otherwise
        }
        return null; // Return null if timestamps are disabled
    }

    /**
     * Adds a status message (like connection status, errors) to the chat.
     * This is useful for non-conversational feedback.
     * @param {string} text - The status message text.
     */
    addStatusMessage(text) {
        if (!this.chatContainer) return;

        const statusDiv = document.createElement('div');
        statusDiv.className = 'chat-message status-message'; // Use specific class for styling
        // Optional: Add inline styles if no CSS class is defined, but class is preferred
        // statusDiv.style.cssText = 'font-style: italic; color: gray; text-align: center; margin: 5px 0;';

        const contentDiv = this._createContentElement(`${this._getTimestampString() || ''} - ${text}`);
        statusDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(statusDiv);
        this.scrollToBottom();
    }

}