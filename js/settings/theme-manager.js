
// Theme manager to handle switching between dark and light modes
class ThemeManager {
    constructor() {
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.initialize();
    }
    
    initialize() {
        this.applyTheme();
        
        // Listen for theme changes from settings
        document.addEventListener('settingsUpdated', () => {
            this.isDarkMode = localStorage.getItem('darkMode') === 'true';
            this.applyTheme();
        });
    }
    
    applyTheme() {
        if (this.isDarkMode) {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', this.isDarkMode);
        this.applyTheme();
    }
}

export default ThemeManager;
