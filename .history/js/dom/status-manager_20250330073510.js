/**
 * Manages status messages in the chat interface
 * Handles message cycling, animations, and limits
 */
export class StatusManager {
    constructor(containerId = '.status-container') {
        this.container = document.querySelector(containerId);
        this.maxMessages = 4;
        this.messages = [];
        
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

        // Add to tracking array
        this.messages.push(statusElement);

        // Remove oldest if over limit
        if (this.messages.length > this.maxMessages) {
            this.removeOldest();
        }

        // Add to DOM
        this.container.appendChild(statusElement);

        // Trigger enter animation
        requestAnimationFrame(() => {
            statusElement.style.opacity = '1';
            statusElement.style.transform = 'translateY(0)';
        });

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
        if (!element) return;

        // Add exit animation class
        element.classList.add('fade-out');

        // Remove from tracking array
        this.messages = this.messages.filter(msg => msg !== element);

        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode === this.container) {
                this.container.removeChild(element);
            }
        }, 300); // Match CSS transition duration
    }

    /**
     * Removes the oldest message
     */
    removeOldest() {
        if (this.messages.length === 0) return;
        
        const oldest = this.messages[0];
        this.removeMessage(oldest);
    }

    /**
     * Updates an existing message or adds a new one if not found
     * @param {string} id - Unique identifier for the message
     * @param {string} message - The new message text
     */
    updateStatus(id, message) {
        // Find existing message with this ID
        const existing = Array.from(this.container.children)
            .find(el => el.dataset.statusId === id);

        if (existing) {
            // Update existing message
            existing.textContent = message;
        } else {
            // Add new message with ID
            this.addStatus(message);
            const newElement = this.messages[this.messages.length - 1];
            newElement.dataset.statusId = id;
        }
    }

    /**
     * Clears all status messages
     */
    clearAll() {
        // Remove all messages with animation
        this.messages.forEach(msg => this.removeMessage(msg));
        this.messages = [];
    }
}

// Export singleton instance
export default new StatusManager();
