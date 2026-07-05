/**
 * /js/player/diagnostics.js
 * Hidden Debug Panel available only in DEBUG_MODE.
 */
class DiagnosticsPanel {
    constructor(manager, player) {
        this.manager = manager;
        this.player = player;
        this.panel = null;
        if (CONFIG.PLAYER_SYS.DEBUG_MODE) this.init();
    }

    init() {
        this.panel = document.createElement('div');
        this.panel.className = 'diagnostics-panel hidden';
        this.panel.innerHTML = `
            <div class="diag-header">Engine Diagnostics (Ctrl+D to toggle)</div>
            <div class="diag-content"></div>
        `;
        document.body.appendChild(this.panel);

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.panel.classList.toggle('hidden');
                this.update();
            }
        });

        setInterval(() => {
            if (!this.panel.classList.contains('hidden')) this.update();
        }, 2000);
    }

    update() {
        const ranked = this.manager.getRankedProviders();
        const html = `
            <h4>Provider Ranking</h4>
            <ul>
                ${ranked.map(p => `<li>${p.name}: Score ${this.manager.calculateScore(p)} (Latency: ${this.manager.healthChecker.cache.get(p.id)?.latency || 'N/A'}ms)</li>`).join('')}
            </ul>
            <h4>Current State</h4>
            <p>Current Provider: ${this.manager.getCurrent().name}</p>
            <p>Player Retry Count: ${this.player.retryCount}</p>
            <p>Manager Switch Count: ${this.manager.switchCount}</p>
            <h4>Last Errors</h4>
            <ul>
                ${this.manager.lastErrors.map(e => `<li>${e.time} - ${e.provider}: ${e.reason}</li>`).join('') || '<li>None</li>'}
            </ul>
            <h4>Storage</h4>
            <p>Analytics Size: ${new Blob([localStorage.getItem(CONFIG.STORAGE_KEYS.SERVER_ANALYTICS) || '']).size} bytes</p>
        `;
        this.panel.querySelector('.diag-content').innerHTML = html;
    }
}