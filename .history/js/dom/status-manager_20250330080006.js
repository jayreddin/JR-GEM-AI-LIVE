/**
 * Manages status messages in the chat interface
 * Handles message cycling, animations, and limits
 */
export class StatusManager {
    constructor(containerId = '.status-container') {
        this.container = document.querySelector(containerId);
        this.maxMessages = 4;
        this.messages = []; // Array to store message elements

        if (!this.container) {
            console.error('Status container not found:', containerId);
            return;
        }
    }

    /**
     * Adds a new status message
     * @param {string} message - The status message to display
     * @param {number} duration - Optional duration in ms before auto-removing (0 for permanent)
     */
    addStatus(message, duration = 0) {
        if (!this.container) return;

        // Create new message element
        const statusElement = document.createElement('div');
        statusElement.className = 'status-message';
        statusElement.textContent = message;

        // Add to DOM
        this.container.appendChild(statusElement);
        this.messages.push(statusElement); // Add to the end of the array

        // Trigger enter animation
        requestAnimationFrame(() => {
            statusElement.classList.add('visible');
        });

        // Remove oldest if over limit
        if (this.messages.length > this.maxMessages) {
            this.removeOldest();
        }

        // Set up auto-removal if duration specified
        if (duration > 0) {
            setTimeout(() => {
                this.removeMessage(statusElement);
            }, duration);
        }
    }

    /**
     * Removes a specific message with animation
     * @param {HTMLElement} element - The message element to remove
     */
    removeMessage(element) {
        if (!element || !this.container) return;

        // Find the index of the element in the array
        const index = this.messages.indexOf(element);
        if (index > -1) {
            this.messages.splice(index, 1); // Remove from tracking array
        }

        // Add exit animation class
        element.classList.add('fade-out');

        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode === this.container) {
                this.container.removeChild(element);
            }
        }, 400); // Match CSS transition duration
    }

    /**
     * Removes the oldest message (first element in the array)
     */
    removeOldest() {
        if (this.messages.length === 0) return;
        const oldest = this.messages[0]; // Get the first element
        this.removeMessage(oldest);
    }

    /**
     * Updates an existing message or adds a new one if not found
     * @param {string} id - Unique identifier for the message
     * @param {string} message - The new message text
     */
    updateStatus(id, message) {
        if (!this.container) return;

        // Find existing message with this ID
        const existing = this.messages.find(el => el.dataset.statusId === id);

        if (existing) {
            // Update existing message
            existing.textContent = message;
        } else {
            // Add new message with ID
            this.addStatus(message);
            const newElement = this.messages[this.messages.length - 1];
            if (newElement) {
                newElement.dataset.statusId = id;
            }
        }
    }

    /**
     * Clears all status messages
     */
    clearAll() {
        if (!this.container) return;
        // Remove all messages with animation
        [...this.messages].forEach(msg => this.removeMessage(msg)); // Iterate over a copy
        this.messages = []; // Clear the tracking array
    }
}

// Export singleton instance
export default new StatusManager();
