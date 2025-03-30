/**
 * Manages the chat history UI, including adding user and model messages,
 * handling streaming messages, timestamps, and text-to-speech output.
 */
import StatusManager from '../dom/status-manager.js'; // Import StatusManager

export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.statusManager = StatusManager; // Use the imported instance

            // Attempt to create and append a fallback container
            try {
                this.chatContainer = document.createElement('div');
                this.chatContainer.id = 'chatHistory';
                this.chatContainer.className = 'chat-history'; // Ensure styles apply
                document.body.appendChild(this.chatContainer); // Append to body as last resort
                console.warn('Fallback chat container appended to body. Ensure #chatHistory exists in index.html for proper layout.');
            } catch (error) {
                console.error("CRITICAL: Failed to find or create chat container. Chat UI will not function.", error);
                // Prevent methods from running if container is truly unavailable
                this.chatContainer = null;
            }
        }

        // State Variables:
        this.currentStreamingMessage = null; // Holds the DOM element of the currently streaming model message
        this.lastUserMessageType = null; // Tracks if the last user input was 'text' or 'audio'
        this.currentTranscript = ''; // Accumulates text for the current streaming message
        this.isSpeechEnabled = localStorage.getItem('speakEnabled') === 'true'; // Cache speech state

        console.info("ChatManager initialized.");
    }

    /**
     * Adds a message sent by the user to the chat history.
     * @param {string} text - The text content of the user's message.
     */
    addUserMessage(text) {
        if (!this.chatContainer) return; // Don't proceed if container is missing

        const messageDiv = this._createMessageElement('user-message');

        const titleDiv = this._createTitleElement('You');
        messageDiv.appendChild(titleDiv);

        const contentDiv = this._createContentElement(text);
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'text'; // Mark last input type
        this.scrollToBottom();
    }

    /**
     * Adds a placeholder message indicating user voice input to the chat history.
     * Typically called when the model responds after voice input without explicit user text shown yet.
     */
    addUserAudioMessage() {
        if (!this.chatContainer) return;

        const messageDiv = this._createMessageElement('user-message'); // Style as user message

        const titleDiv = this._createTitleElement('You');
        messageDiv.appendChild(titleDiv);

        // Use italics or specific text for voice input indication
        const contentDiv = this._createContentElement('🎤 Voice input'); // Example text
        contentDiv.style.fontStyle = 'italic'; // Optional styling
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio'; // Mark last input type
        this.scrollToBottom();
    }

    /**
     * Creates the initial DOM structure for a new message from the model, ready for streaming content.
     * Finalizes any previous streaming message first.
     */
    startModelMessage() {
        if (!this.chatContainer) return;

        // Ensure any previous message is finalized before starting a new one
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }

        // If the model starts speaking but no user message was explicitly shown yet
        // (e.g., after voice input), add the voice input placeholder.
        if (!this.lastUserMessageType) {
            this.addUserAudioMessage();
        }

        const messageDiv = this._createMessageElement('model-message streaming'); // Add 'streaming' class

        // TODO: Consider making model name configurable
        const titleDiv = this._createTitleElement('Gemini 2.0 Flash');
        messageDiv.appendChild(titleDiv);

        const contentDiv = this._createContentElement(''); // Start with empty content
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv; // Store reference to the streaming element
        this.currentTranscript = ''; // Reset transcript accumulator for the new message
        this.scrollToBottom();
    }

    /**
     * Appends text to the currently streaming model message.
     * Creates a new model message structure if one isn't active.
     * @param {string} textChunk - The chunk of text received from the model.
     */
    updateStreamingMessage(textChunk) {
        if (!this.chatContainer) return;

        // If no message is currently streaming, start a new one
        if (!this.currentStreamingMessage) {
            console.warn("updateStreamingMessage called without an active streaming message, starting a new one.");
            this.startModelMessage();
            // Need to double-check if currentStreamingMessage is now set, otherwise return
            if (!this.currentStreamingMessage) {
                console.error("Failed to start new streaming message in updateStreamingMessage.");
                return;
            }
        }

        // Find the content element within the streaming message
        const contentDiv = this.currentStreamingMessage.querySelector('.chat-content');
        if (contentDiv) {
            // Append new text chunk to the accumulated transcript
            this.currentTranscript += textChunk;
            // Update the text content of the DOM element
            contentDiv.textContent = this.currentTranscript;

            this.scrollToBottom(); // Scroll as content is added

            // Speak the incoming text chunk if speech is enabled
            if (this.isSpeechEnabled && textChunk?.trim()) {
                try {
                    this.speakText(textChunk);
                } catch (speechError) {
                    console.error("Error during speakText:", speechError);
                    // Optionally disable speech or notify user if errors persist
                    // this.updateSpeechStatus(false); // Example: Disable speech on error
                    // this.addStatusMessage("Text-to-speech error occurred.");
                }
            }
        } else {
            console.error("Could not find .chat-content element within the current streaming message.");
            // Reset state as something is wrong
            this.finalizeStreamingMessage();
        }
    }

    /**
     * Finalizes the currently streaming message by removing the streaming indicator
     * and resetting the related state variables.
     */
    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null; // Clear reference
        }
        // Reset transcript and last user message type for the next exchange
        this.currentTranscript = '';
        this.lastUserMessageType = null;
        // console.debug("Streaming message finalized."); // Optional log
    }

    /**
     * Uses the browser's SpeechSynthesis API to speak the provided text.
     * @param {string} text - The text to be spoken.
     */
    speakText(text) {
        // Basic check if required API exists
        if (!('speechSynthesis' in window)) {
            console.warn("Speech Synthesis API not available in this browser.");
            this.updateSpeechStatus(false); // Disable speech if API is missing
            return;
        }

        // Check if speech is enabled (might have been disabled externally)
        if (!this.isSpeechEnabled) {
            return; // Don't speak if disabled
        }

        // Basic check for empty text
        if (!text || !text.trim()) {
            return;
        }


        try {
            // Check if speech is already in progress (optional, depends on desired behavior)
            // If you want to queue messages, you might need more complex logic here.
            // If you want to interrupt previous speech, you can call cancel first:
            // if (window.speechSynthesis.speaking) {
            //     window.speechSynthesis.cancel();
            // }

            const utterance = new SpeechSynthesisUtterance(text);
            // Optional: Configure utterance properties (voice, rate, pitch) based on settings
            // utterance.voice = ...;
            // utterance.rate = ...;
            // utterance.pitch = ...;

            utterance.onerror = (event) => {
                console.error(`SpeechSynthesisUtterance Error: ${event.error}`, event);
                // Handle errors during speech playback
            };

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