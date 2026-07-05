/**
 * health-check.js
 * Measures provider response time using image ping to bypass CORS.
 */

class HealthCheck {
    constructor() {
        this.cache = new Map();
        this.stats = this.loadStats();
    }

    loadStats() {
        const data = localStorage.getItem('eh_provider_stats');
        return data ? JSON.parse(data) : {};
    }

    saveStats() {
        localStorage.setItem('eh_provider_stats', JSON.stringify(this.stats));
    }

    initStats(providerId) {
        if (!this.stats[providerId]) {
            this.stats[providerId] = {
                avgLatency: 0, fastest: 0, slowest: 0, 
                totalChecks: 0, lastChecked: null, isOnline: false
            };
        }
    }

    async check(provider) {
        if (!provider || !provider.healthCheckUrl) return { isOnline: false, latency: -1 };
        this.initStats(provider.id);
        const stats = this.stats[provider.id];

        return new Promise((resolve) => {
            const start = performance.now();
            const img = new Image();
            let finished = false;

            const timeout = setTimeout(() => {
                if (!finished) {
                    finished = true;
                    stats.isOnline = false;
                    this.saveStats();
                    resolve({ isOnline: false, latency: -1 });
                }
            }, 5000);

            img.onload = img.onerror = () => {
                if (!finished) {
                    finished = true;
                    clearTimeout(timeout);
                    const latency = Math.round(performance.now() - start);
                    
                    stats.isOnline = true;
                    stats.lastChecked = new Date().toISOString();
                    stats.totalChecks++;
                    if (stats.fastest === 0 || latency < stats.fastest) stats.fastest = latency;
                    if (latency > stats.slowest) stats.slowest = latency;
                    stats.avgLatency = Math.round((stats.avgLatency * (stats.totalChecks - 1) + latency) / stats.totalChecks);
                    
                    this.cache.set(provider.id, { isOnline: true, latency });
                    this.saveStats();
                    resolve({ isOnline: true, latency });
                }
            };
            img.src = `${provider.healthCheckUrl}?_=${Date.now()}`;
        });
    }

    async runIdleChecks(providers, callback) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => this.runChecks(providers, callback));
        } else {
            setTimeout(() => this.runChecks(providers, callback), 100);
        }
    }

    async runChecks(providers, callback) {
        const promises = providers.map(p => this.check(p));
        await Promise.all(promises);
        if (callback) callback();
    }
}

window.HealthCheck = HealthCheck;