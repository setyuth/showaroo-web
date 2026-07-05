/**
 * core/security.js
 * Provides safe DOM manipulation utilities to prevent XSS.
 */
const SecurityService = {
    /**
     * Sanitizes a string by escaping HTML entities.
     * @param {string} str - The untrusted string.
     * @returns {string} The sanitized string.
     */
    sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Safely creates a DOM element from an HTML string.
     * @param {string} htmlString - The HTML string to parse.
     * @returns {DocumentFragment}
     */
    createSafeFragment(htmlString) {
        const template = document.createElement('template');
        template.innerHTML = htmlString;
        return template.content.cloneNode(true);
    }
};