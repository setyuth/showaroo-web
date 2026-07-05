/**
 * server-selector.js
 * Builds and handles the Server Selection modal.
 */

class ServerSelector {
    constructor(manager) {
        this.manager = manager;
        this.modal = null;
        this.sortBy = 'score'; // score, latency, reliability, priority
        this.init();
    }

    init() {
        this.createModal();
        this.manager.on('healthChecked', () => this.updateServerList());
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'server-modal-overlay hidden';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-labelledby', 'server-modal-title');
        
        this.modal.innerHTML = `
            <div class="server-modal glass">
                <div class="server-modal-header">
                    <h3 id="server-modal-title">Premium Server Dashboard</h3>
                    <button class="close-modal" aria-label="Close">&times;</button>
                </div>
                <div class="server-sort-controls">
                    <button data-sort="score">Smart Rank</button>
                    <button data-sort="latency">Latency</button>
                    <button data-sort="reliability">Reliability</button>
                    <button data-sort="priority">Priority</button>
                </div>
                <div class="server-list" role="listbox"></div>
            </div>
        `;
        document.body.appendChild(this.modal);

        this.modal.querySelector('.close-modal').addEventListener('click', () => this.hide());
        this.modal.querySelectorAll('[data-sort]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.sortBy = e.target.dataset.sort;
                this.updateServerList();
            });
        });
    }

    updateServerList() {
        const list = this.modal.querySelector('.server-list');
        let providers = [...this.manager.providers];

        // Sorting logic
        if (this.sortBy === 'latency') {
            providers.sort((a, b) => (this.manager.healthChecker.cache.get(a.id)?.latency || 9999) - (this.manager.healthChecker.cache.get(b.id)?.latency || 9999));
        } else if (this.sortBy === 'reliability') {
            providers.sort((a, b) => (this.manager.analytics[b.id]?.success || 0) - (this.manager.analytics[a.id]?.success || 0));
        } else if (this.sortBy === 'priority') {
            providers.sort((a, b) => a.priority - b.priority);
        } else {
            providers = this.manager.getRankedProviders();
        }

        const bestProvider = this.manager.getBestProvider();
        const currentId = this.manager.getCurrent().id;

        list.innerHTML = providers.map(p => {
            const health = this.manager.healthChecker.cache.get(p.id) || { isOnline: false, latency: 0 };
            const stats = this.manager.healthChecker.stats[p.id] || {};
            const analytics = this.manager.analytics[p.id] || { usage: 0, success: 0, failure: 0 };
            const successRate = analytics.usage > 0 ? ((analytics.success / analytics.usage) * 100).toFixed(0) : 'N/A';
            const score = this.manager.calculateScore(p);
            
            return `
                <div class="server-item ${p.id === currentId ? 'active' : ''}" data-id="${p.id}" role="option" tabindex="0">
                    <div class="server-primary">
                        <span class="server-logo">${p.name.charAt(0)}</span>
                        <div class="server-info">
                            <span class="server-name">
                                ${p.name} 
                                ${p.id === bestProvider.id ? '<span class="badge recommended">Recommended</span>' : ''}
                                ${p.id === currentId ? '<span class="badge current">Current</span>' : ''}
                            </span>
                            <span class="server-meta">v${p.version} • ${p.features.join(', ')}</span>
                        </div>
                    </div>
                    <div class="server-stats">
                        <div class="stat-block">
                            <span class="stat-label">Status</span>
                            <span class="stat-value ${health.isOnline ? 'online' : 'offline'}">${health.isOnline ? `${health.latency}ms` : 'Offline'}</span>
                        </div>
                        <div class="stat-block">
                            <span class="stat-label">Success</span>
                            <span class="stat-value">${successRate}%</span>
                        </div>
                        <div class="stat-block">
                            <span class="stat-label">Plays</span>
                            <span class="stat-value">${analytics.usage}</span>
                        </div>
                        <div class="stat-block">
                            <span class="stat-label">Score</span>
                            <span class="stat-value">${score}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.server-item').forEach(item => {
            item.addEventListener('click', () => {
                if (this.manager.select(item.getAttribute('data-id'))) this.hide();
            });
            item.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') item.click();
            });
        });
    }

    show() {
        this.updateServerList();
        this.modal.classList.remove('hidden');
    }

    hide() {
        this.modal.classList.add('hidden');
    }
}

window.ServerSelector = ServerSelector;