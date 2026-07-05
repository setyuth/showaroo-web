/**
 * core/devtools.js
 * Centralized debugging dashboard for the application.
 */
const DevTools = {
    panel: null,
    eventLogs: [],
    errorLogs: [],
    isVisible: false,

    init() {
        this.panel = document.createElement('div');
        this.panel.className = 'devtools-panel hidden';
        this.panel.innerHTML = `
            <div class="devtools-header">
                <span>Enterprise DevTools</span>
                <button class="devtools-close">&times;</button>
            </div>
            <div class="devtools-content">
                <div class="dt-section"><h4>State</h4><pre id="dt-state"></pre></div>
                <div class="dt-section"><h4>Event Logs (Last 10)</h4><pre id="dt-events"></pre></div>
                <div class="dt-section"><h4>Errors</h4><pre id="dt-errors"></pre></div>
            </div>
        `;
        document.body.appendChild(this.panel);

        this.panel.querySelector('.devtools-close').addEventListener('click', () => this.toggle(false));
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
        });

        setInterval(() => {
            if (this.isVisible) this.update();
        }, 1000);
    },

    toggle(forceState) {
        this.isVisible = forceState !== undefined ? forceState : !this.isVisible;
        this.panel.classList.toggle('hidden', !this.isVisible);
        if (this.isVisible) this.update();
    },

    logEvent(event, data) {
        this.eventLogs.unshift({ event, data: JSON.stringify(data)?.substring(0, 50), time: new Date().toLocaleTimeString() });
        this.eventLogs = this.eventLogs.slice(0, 10);
    },

    logError(error) {
        this.errorLogs.unshift(error);
        this.errorLogs = this.errorLogs.slice(0, 10);
    },

    update() {
        this.panel.querySelector('#dt-state').textContent = JSON.stringify(StateManager.state, null, 2);
        this.panel.querySelector('#dt-events').textContent = JSON.stringify(this.eventLogs, null, 2);
        this.panel.querySelector('#dt-errors').textContent = JSON.stringify(this.errorLogs, null, 2);
    }
};