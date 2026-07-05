/**
 * provider-manager.js
 * Orchestrates providers, handles auto-failover, analytics, and localStorage.
 */

class ProviderManager {
    constructor(providers, healthChecker) {
        this.providers = providers.filter(p => p.enabled);
        this.healthChecker = healthChecker;
        this.currentProvider = null;
        this.events = {};
        this.analytics = this.loadAnalytics();
        this.recentServers = this.loadRecentServers();
        this.switchCount = 0;
        this.lastErrors = [];
        
        this.initPreferredProvider();
        this.startBackgroundRecovery();
    }

    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }

    sortByPriority() {
        this.providers.sort((a, b) => a.priority - b.priority);
    }

    sortByLatency() {
        this.providers.sort((a, b) => {
            const healthA = this.healthChecker.cache.get(a.id) || { latency: 9999 };
            const healthB = this.healthChecker.cache.get(b.id) || { latency: 9999 };
            return healthA.latency - healthB.latency;
        });
    }

    initPreferredProvider() {
        const preferredId = localStorage.getItem(CONFIG.STORAGE_KEYS.PREFERRED_PROVIDER);
        if (preferredId) {
            const provider = this.getProviderById(preferredId);
            if (provider) {
                this.currentProvider = provider;
                return;
            }
        }
        this.currentProvider = this.providers[0];
    }

    getCurrent() {
        return this.currentProvider;
    }

    getProviderById(id) {
        return this.providers.find(p => p.id === id);
    }

    next() {
        const currentIndex = this.providers.findIndex(p => p.id === this.currentProvider.id);
        const nextIndex = (currentIndex + 1) % this.providers.length;
        this.currentProvider = this.providers[nextIndex];
        this.savePreferredProvider();
        this.emit('providerChanged', this.currentProvider);
        return this.currentProvider;
    }

    select(id) {
        const provider = this.getProviderById(id);
        if (provider) {
            this.currentProvider = provider;
            this.savePreferredProvider();
            this.addRecentServer(id);
            this.emit('providerChanged', this.currentProvider);
            return true;
        }
        return false;
    }

    // NEW: Intelligent Scoring Algorithm
    calculateScore(provider) {
        const weights = CONFIG.SCORING_WEIGHTS;
        const health = this.healthChecker.cache.get(provider.id) || { latency: 9999, isOnline: false };
        const stats = this.analytics[provider.id] || { success: 0, failure: 0, usage: 0 };
        
        const successRate = stats.usage > 0 ? (stats.success / stats.usage) * 100 : 50;
        
        // Priority Score: 1 -> max points, 10 -> min points
        const priorityScore = Math.max(0, (10 - provider.priority) / 10) * weights.PRIORITY;
        
        // Latency Score: 0ms -> max points, >1000ms -> 0 points
        const latencyScore = Math.max(0, (1000 - health.latency) / 1000) * weights.LATENCY;
        
        // Success Score
        const successScore = (successRate / 100) * weights.SUCCESS_RATE;
        
        // User Pref Score
        const isPreferred = localStorage.getItem(CONFIG.STORAGE_KEYS.PREFERRED_PROVIDER) === provider.id;
        const userScore = isPreferred ? weights.USER_PREF : 0;

        const totalScore = priorityScore + latencyScore + successScore + userScore;
        return Math.round(totalScore * 100) / 100;
    }

    getRankedProviders() {
        return [...this.providers].sort((a, b) => this.calculateScore(b) - this.calculateScore(a));
    }

    getBestProvider() {
        const ranked = this.getRankedProviders().filter(p => this.healthChecker.cache.get(p.id)?.isOnline);
        return ranked[0] || this.providers[0];
    }

    // NEW: Smart Failover Sequence
    getSmartNextProvider(reason) {
        this.switchCount++;
        this.lastErrors.unshift({ reason, time: new Date().toISOString(), provider: this.currentProvider.id });
        this.lastErrors = this.lastErrors.slice(0, 5);

        const healthy = this.providers.filter(p => this.healthChecker.cache.get(p.id)?.isOnline && p.id !== this.currentProvider.id);
        if (healthy.length === 0) return this.providers[0]; // Emergency fallback

        // 1. Best Latency Provider
        let next = healthy.sort((a, b) => this.healthChecker.cache.get(a.id).latency - this.healthChecker.cache.get(b.id).latency)[0];
        
        // 2. Best Success Rate Provider (if latency is terrible > 500ms)
        if (this.healthChecker.cache.get(next.id).latency > 500) {
            const successful = healthy.sort((a, b) => {
                const rateA = this.analytics[a.id]?.success || 0;
                const rateB = this.analytics[b.id]?.success || 0;
                return rateB - rateA;
            });
            if (successful[0]) next = successful[0];
        }

        // 3. User Preferred Provider
        const prefId = localStorage.getItem(CONFIG.STORAGE_KEYS.PREFERRED_PROVIDER);
        const pref = healthy.find(p => p.id === prefId);
        if (pref) next = pref;

        this.currentProvider = next;
        this.savePreferredProvider();
        this.emit('providerChanged', { provider: this.currentProvider, reason });
        return this.currentProvider;
    }

    // NEW: Silent Background Recovery
    startBackgroundRecovery() {
        setInterval(() => {
            const offlineProviders = this.providers.filter(p => !this.healthChecker.cache.get(p.id)?.isOnline);
            if (offlineProviders.length > 0) {
                this.healthChecker.runIdleChecks(offlineProviders, () => {
                    this.emit('healthChecked', this.providers);
                });
            }
        }, CONFIG.PLAYER_SYS.HEALTH_CHECK_INTERVAL_MS);
    }
    
    getMovieUrl(tmdbId) {
        return this.currentProvider.movieUrl(tmdbId);
    }

    getEpisodeUrl(tmdbId, season, episode) {
        return this.currentProvider.tvUrl(tmdbId, season, episode);
    }

    savePreferredProvider() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PREFERRED_PROVIDER, this.currentProvider.id);
    }

    addRecentServer(id) {
        this.recentServers = this.recentServers.filter(s => s !== id);
        this.recentServers.unshift(id);
        this.recentServers = this.recentServers.slice(0, 3);
        localStorage.setItem(CONFIG.STORAGE_KEYS.RECENT_SERVERS, JSON.stringify(this.recentServers));
    }

    loadRecentServers() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.RECENT_SERVERS);
        return data ? JSON.parse(data) : [];
    }

    loadAnalytics() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.SERVER_ANALYTICS);
        return data ? JSON.parse(data) : {};
    }

    saveAnalytics() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SERVER_ANALYTICS, JSON.stringify(this.analytics));
    }

    recordAnalytics(providerId, success) {
        if (!this.analytics[providerId]) {
            this.analytics[providerId] = { usage: 0, success: 0, failure: 0 };
        }
        this.analytics[providerId].usage++;
        if (success) this.analytics[providerId].success++;
        else this.analytics[providerId].failure++;
        this.saveAnalytics();
    }

    async runHealthChecks() {
        const promises = this.providers.map(p => this.healthChecker.check(p));
        await Promise.all(promises);
        this.sortByLatency();
        this.emit('healthChecked', this.providers);
    }
}

window.ProviderManager = ProviderManager;