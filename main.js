/**
 * main.js
 * Application entry point. Fires the initialization sequence
 * once the DOM and all dependent scripts are fully loaded.
 */

(function() {
    'use strict';

    function bootApplication() {
        if (window.App && typeof window.App.init === 'function') {
            console.log('%c[Showaroo] Booting Application...', 'color: #E50914; font-weight: bold;');
            window.App.init();
        } else {
            console.error('[Showaroo] Core Application module not found. Ensure js/core/app.js is loaded correctly.');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootApplication);
    } else {
        // DOM already parsed (e.g., async script loading)
        bootApplication();
    }
})();