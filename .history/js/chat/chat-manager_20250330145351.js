/**
 * Manages the chat interface, including adding messages,
 * handling streaming responses, and scrolling.
 */
export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null; // 'text' or 'audio'
        this.currentTranscript = ''; // Store accumulated transcript
        this.speechEnabled = localStorage.getItem('speakEnabled') === 'true'; // Load initial state
    }

    /**
     * Adds a user message to the chat.
     * @param {string} text - The message text.
     */
    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'text';
        this.scrollToBottom();
    }

    /**
     * Adds a placeholder for a user audio message.
     */
    addUserAudioMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = 'User sent audio'; // Placeholder text
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio';
        this.scrollToBottom();
    }

    /**
     * Starts a new streaming message from the model.
     */
    startModelMessage() {
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }

        // If no user message was shown yet (e.g., model starts speaking first), add placeholder
        if (!this.lastUserMessageType) {
            // You might want a different placeholder if the model initiates
            // this.addUserAudioMessage(); // Or maybe nothing?
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message streaming';
        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv;
        this.currentTranscript = ''; // Reset transcript
        this.scrollToBottom();
    }

    /**
     * Updates the content of the current streaming model message.
     * @param {string} text - The new text chunk to append.
     */
    updateStreamingMessage(text) {
        if (!this.currentStreamingMessage) {
            this.startModelMessage();
        }
        // Append text smoothly
        this.currentTranscript += text; // Append directly, no extra space needed if streaming correctly
        this.currentStreamingMessage.textContent = this.currentTranscript;
        this.scrollToBottom();
    }

    /**
     * Finalizes the current streaming message, removing the streaming indicator.
     */
    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null;
            this.lastUserMessageType = null; // Reset for the next turn
            this.currentTranscript = ''; // Clear transcript
        }
    }

    /**
     * Adds a complete model message (non-streaming).
     * @param {string} text - The full message text.
     */
    addModelMessage(text) {
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage(); // Finalize any ongoing stream first
        }
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message';
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = null; // Reset for the next turn
        this.scrollToBottom();
    }

    /**
     * Scrolls the chat container to the bottom.
     */
    scrollToBottom() {
        // Use setTimeout to ensure scrolling happens after DOM update
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 0);
    }

    /**
     * Clears all messages from the chat container.
     */
    clear() {
        this.chatContainer.innerHTML = ''; // Clear content
        // Add back status container if it was inside chatHistory
        const statusContainer = document.createElement('div');
        statusContainer.className = 'status-container';
        this.chatContainer.appendChild(statusContainer);
        // Add back wave container if it was inside chatHistory
        const waveContainer = document.createElement('div');
        waveContainer.className = 'wave-container';
        waveContainer.innerHTML = `
            <canvas class="wave-bar ai"></canvas>
            <canvas class="wave-bar user"></canvas>
        `;
        this.chatContainer.appendChild(waveContainer);

        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }

    /**
     * Updates the speech enabled status.
     * @param {boolean} isEnabled - Whether speech output is enabled.
     */
    updateSpeechStatus(isEnabled) {
        this.speechEnabled = isEnabled;
        console.log(`ChatManager: Speech output ${isEnabled ? 'enabled' : 'disabled'}`);
    }
}
