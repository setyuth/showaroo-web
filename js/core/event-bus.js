/**
 * core/event-bus.js
 * Global Pub/Sub event system. Modules communicate exclusively via events.
 */
const EventBus = {
    events: {},

    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    },

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    },

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    ErrorHandler.log('EventBusError', `Error in listener for ${event}: ${e.message}`);
                }
            });
        }
        // Log to DevTools if active
        if (window.DevTools) window.DevTools.logEvent(event, data);
    }
};