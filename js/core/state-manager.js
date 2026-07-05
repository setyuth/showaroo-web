/**
 * core/state-manager.js
 * Centralized state management with pub/sub for UI reactivity.
 */
const StateManager = {
    state: {
        currentMovie: null,
        currentTV: null,
        currentEpisode: null,
        currentProvider: null,
        theme: localStorage.getItem(CONFIG.STORAGE_KEYS.DARK_MODE) || 'dark',
        loading: false,
        errors: []
    },

    listeners: new Map(),

    get(key) {
        return this.state[key];
    },

    set(key, value) {
        if (this.state[key] === value) return;
        this.state[key] = value;
        this.notify(key, value);
        EventBus.emit(`state:changed:${key}`, value);
    },

    subscribe(key, callback) {
        if (!this.listeners.has(key)) this.listeners.set(key, new Set());
        this.listeners.get(key).add(callback);
        return () => this.listeners.get(key).delete(callback);
    },

    notify(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(cb => cb(value));
        }
    }
};