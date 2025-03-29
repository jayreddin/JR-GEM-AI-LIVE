/**
 * Manages switching between light and dark themes based on localStorage settings.
 * Listens for 'settingsUpdated' event to re-apply the theme if changed in settings.
 */
class ThemeManager {
    constructor() {
        // Initialize theme based on saved preference or default (dark)
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.initialize();
        console.info(`ThemeManager initialized. Current mode: ${this.isDarkMode ? 'Dark' : 'Light'}`);
    }

    /**
     * Applies the current theme and sets up listener for settings changes.
     */
    initialize() {
        this.applyTheme(); // Apply theme immediately on load

        // Listen for the custom event dispatched when settings are saved
        document.addEventListener('settingsUpdated', () => {
            console.debug("ThemeManager: Detected 'settingsUpdated' event.");
            // Re-check localStorage setting
            const updatedIsDarkMode = localStorage.getItem('darkMode') === 'true';
            // Apply theme only if the setting actually changed
            if (updatedIsDarkMode !== this.isDarkMode) {
                this.isDarkMode = updatedIsDarkMode;
                this.applyTheme();
                console.info(`ThemeManager: Theme updated to ${this.isDarkMode ? 'Dark' : 'Light'} via settings.`);
            }
        });
    }

    /**
     * Applies the theme by adding or removing the 'data-theme="light"' attribute
     * from the document's root element (<html>).
     * Assumes CSS rules are defined for :root and :root[data-theme="light"].
     */
    applyTheme() {
        if (this.isDarkMode) {
            // Remove attribute for dark mode (assuming dark is the default/no attribute state)
            document.documentElement.removeAttribute('data-theme');
        } else {
            // Add attribute for light mode
            document.documentElement.setAttribute('data-theme', 'light');
        }
        // console.debug(`ThemeManager: Applied ${this.isDarkMode ? 'Dark' : 'Light'} theme attribute.`);
    }

    /**
     * Toggles the theme between dark and light mode.
     * Updates localStorage and applies the new theme.
     * Note: This method might be redundant if toggling only happens via the settings dialog,
     * which triggers the 'settingsUpdated' event listener. Keep if direct toggling is needed elsewhere.
     */
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        console.info(`ThemeManager: Toggling theme to ${this.isDarkMode ? 'Dark' : 'Light'}.`);
        try {
            localStorage.setItem('darkMode', this.isDarkMode ? 'true' : 'false');
        } catch (error) {
            console.error("ThemeManager: Error saving theme preference to localStorage:", error);
        }
        this.applyTheme();
    }
}

// Export a single instance if used as a singleton, or the class itself
export default ThemeManager;
// export default new ThemeManager(); // Use this if only one instance is needed app-wide