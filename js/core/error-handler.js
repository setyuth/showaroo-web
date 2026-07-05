/**
 * core/error-handler.js
 * Centralized error handling and logging.
 */
const ErrorHandler = {
    init() {
        window.addEventListener('error', (event) => this.capture(event.error, 'GlobalError'));
        window.addEventListener('unhandledrejection', (event) => this.capture(event.reason, 'PromiseRejection'));
    },

    capture(error, type = 'UnknownError') {
        const errorObj = {
            type,
            message: error.message || 'An unknown error occurred',
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        StateManager.get('errors').push(errorObj);
        if (window.DevTools) window.DevTools.logError(errorObj);

        // User-friendly UI notification
        this.displayToast(`Error: ${errorObj.message}`);
        console.error(`[${type}]`, error);
    },

    displayToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification glass';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};