/**
 * core/app.js
 * Application entry point. Initializes all modules in strict order.
 */
const App = {
    async init() {
        console.log('%c[App] Booting Enterprise Architecture...', 'color: #E50914; font-weight: bold;');
        
        // 1. Core Systems
        ErrorHandler.init();
        DevTools.init();

        // 2. State Management
        StateManager.set('loading', true);

        // 3. Services & Existing Modules Wiring
        this.healthChecker = new HealthCheck();
        this.providerManager = new ProviderManager(PROVIDERS, this.healthChecker);
        window.serverSelector = new ServerSelector(this.providerManager);
        this.player = new Player('player-container', this.providerManager);
        this.diagnostics = new DiagnosticsPanel(this.providerManager, this.player);
        this.recommendationEngine = new RecommendationEngine();

        // 4. Event Subscriptions (Decoupled wiring)
        EventBus.on('provider:changed', (provider) => {
            StateManager.set('currentProvider', provider);
            Services.PlayerService.handleProviderChanged(provider);
        });

        EventBus.on('movie:selected', (movie) => {
            StateManager.set('currentMovie', movie);
            Services.HistoryService.trackView(movie);
        });

        // 5. Background Tasks
        this.healthChecker.runIdleChecks(PROVIDERS, () => {
            EventBus.emit('providers:healthChecked');
        });
        setInterval(() => {
            this.healthChecker.runIdleChecks(PROVIDERS, () => EventBus.emit('providers:healthChecked'));
        }, CONFIG.PLAYER_SYS.HEALTH_CHECK_INTERVAL_MS);

        // 6. UI Initialization
        if (window.SearchEngine) {
            this.search = new SearchEngine('#search-input', '#search-results');
        }
        
        StateManager.set('loading', false);
        EventBus.emit('app:ready');
        console.log('%c[App] Architecture Booted Successfully.', 'color: #4CAF50; font-weight: bold;');
    }
};

// Bootstrap on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
// Add this to the very bottom of /js/core/app.js
window.App = App;