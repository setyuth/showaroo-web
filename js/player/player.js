/**
 * player.js
 * Core player logic: iframe injection, failover, skeleton loading, and controls.
 */

class Player {
    constructor(containerId, manager) {
        this.container = document.getElementById(containerId);
        this.manager = manager;
        this.retryCount = 0;
        this.currentMedia = null;
        this.watchTimer = null;
        this.watchTime = 0;
        
        this.renderUI();
        this.bindControls();
        
        // Listen for smart failover events
        this.manager.on('providerChanged', (data) => this.handleProviderSwitch(data));
    }

    renderUI() {
        this.container.innerHTML = `
            <div class="player-wrapper">
                <div class="player-skeleton">
                    <div class="skeleton-loader"></div>
                    <span class="loading-text">Loading Server...</span>
                </div>
                <iframe class="player-iframe hidden" allowfullscreen frameborder="0"></iframe>
                <div class="player-controls glass">
                    <button class="ctrl-btn reload" title="Reload"><i class="icon-reload"></i></button>
                    <button class="ctrl-btn change-server" title="Change Server"><i class="icon-server"></i> Server</button>
                    <button class="ctrl-btn copy-link" title="Copy Embed Link"><i class="icon-copy"></i></button>
                    <button class="ctrl-btn open-tab" title="Open in New Tab"><i class="icon-tab"></i></button>
                    <button class="ctrl-btn report" title="Report Issue"><i class="icon-report"></i></button>
                </div>
                <div class="player-switching hidden">
                    <div class="switching-spinner"></div>
                    <span>Switching Server...</span>
                </div>
            </div>
        `;
        
        this.iframe = this.container.querySelector('.player-iframe');
        this.skeleton = this.container.querySelector('.player-skeleton');
        this.switching = this.container.querySelector('.player-switching');
    }

    bindControls() {
        this.container.querySelector('.reload').addEventListener('click', () => this.load(this.currentMedia));
        this.container.querySelector('.change-server').addEventListener('click', () => window.serverSelector.show());
        this.container.querySelector('.copy-link').addEventListener('click', () => this.copyLink());
        this.container.querySelector('.open-tab').addEventListener('click', () => this.openInNewTab());
        this.container.querySelector('.report').addEventListener('click', () => this.reportIssue());
    }

    load(media) {
        this.currentMedia = media;
        this.retryCount = 0;
        this.attemptLoad();
    }

    attemptLoad() {
        this.showSkeleton();
        const provider = this.manager.getCurrent();
        let url = '';

        if (this.currentMedia.type === 'movie') {
            url = provider.movieUrl(this.currentMedia.id);
        } else if (this.currentMedia.type === 'tv') {
            url = provider.tvUrl(this.currentMedia.id, this.currentMedia.season, this.currentMedia.episode);
        }

        if (CONFIG.PLAYER_SYS.DEBUG_MODE) console.log(`Loading via ${provider.name}: ${url}`);

        // Set timeout for dead servers
        this.timeoutHandle = setTimeout(() => this.handleLoadError('Timeout'), CONFIG.PLAYER_SYS.PLAYER_LOAD_TIMEOUT_MS);

        this.iframe.onload = () => {
            clearTimeout(this.timeoutHandle);
            this.hideSkeleton();
            this.manager.recordAnalytics(provider.id, true);
        };

        this.iframe.src = url;
    }

    handleLoadError(reason) {
        clearTimeout(this.timeoutHandle);
        if (CONFIG.PLAYER_SYS.DEBUG_MODE) console.warn(`Player Error: ${reason}. Retrying...`);

        if (this.retryCount < CONFIG.PLAYER_SYS.MAX_RETRIES) {
            this.retryCount++;
            this.showSwitching();
            setTimeout(() => this.attemptLoad(), 1500);
        } else {
            this.retryCount = 0;
            this.manager.recordAnalytics(this.manager.getCurrent().id, false);
            this.manager.next();
            this.showSwitching();
            setTimeout(() => this.attemptLoad(), 1500);
        }
    }

    copyLink() {
        navigator.clipboard.writeText(this.iframe.src).then(() => {
            alert('Embed link copied to clipboard!');
        });
    }

    openInNewTab() {
        window.open(this.iframe.src, '_blank');
    }

    reportIssue() {
        const provider = this.manager.getCurrent();
        alert(`Playback issue reported for ${provider.name}. Switching servers automatically...`);
        this.handleLoadError('User Reported Issue');
    }

    showSkeleton() {
        this.iframe.classList.add('hidden');
        this.switching.classList.add('hidden');
        this.skeleton.classList.remove('hidden');
    }

    hideSkeleton() {
        this.skeleton.classList.add('hidden');
        this.iframe.classList.remove('hidden');
        this.switching.classList.add('hidden');
    }

    showSwitching() {
        this.iframe.classList.add('hidden');
        this.skeleton.classList.add('hidden');
        this.switching.classList.remove('hidden');
    }

    load(media) {
        // Validate Media ID before attempting load
        if (!media.id || (media.type === 'tv' && (!media.season || !media.episode))) {
            this.showError("Invalid TMDB ID or missing episode data.");
            return;
        }
        
        this.currentMedia = media;
        this.retryCount = 0;
        this.watchTime = 0;
        this.attemptLoad();
        this.startContinueWatchingTracker();
    }

    attemptLoad() {
        this.showSkeleton();
        const provider = this.manager.getCurrent();
        let url = provider.movieUrl(this.currentMedia.id) || 
                  provider.tvUrl(this.currentMedia.id, this.currentMedia.season, this.currentMedia.episode);

        this.timeoutHandle = setTimeout(() => this.handlePlaybackError('Server timeout'), CONFIG.PLAYER_SYS.PLAYER_LOAD_TIMEOUT_MS);

        this.iframe.onload = () => {
            clearTimeout(this.timeoutHandle);
            // Basic check: iframe loaded. Cross-origin prevents deeper inspection.
            this.hideSkeleton();
            this.manager.recordAnalytics(provider.id, true);
        };

        this.iframe.onerror = () => this.handlePlaybackError('Network error');
        this.iframe.src = url;
    }

    handleProviderSwitch(data) {
        this.showSwitching(data.reason);
        setTimeout(() => this.attemptLoad(), 1500);
    }

    handlePlaybackError(reason) {
        clearTimeout(this.timeoutHandle);
        if (CONFIG.PLAYER_SYS.DEBUG_MODE) console.warn(`Playback Validation Failed: ${reason}`);

        if (this.retryCount < CONFIG.PLAYER_SYS.MAX_RETRIES) {
            this.retryCount++;
            this.showSwitching(`Retrying... (${reason})`);
            setTimeout(() => this.attemptLoad(), 1500);
        } else {
            this.retryCount = 0;
            this.manager.recordAnalytics(this.manager.getCurrent().id, false);
            this.manager.getSmartNextProvider(reason);
            // Provider changed event will trigger handleProviderSwitch
        }
    }

    // NEW: Continue Watching Tracking
    startContinueWatchingTracker() {
        clearInterval(this.watchTimer);
        this.watchTimer = setInterval(() => {
            this.watchTime += CONFIG.PLAYER_SYS.CONTINUE_WATCHING_SAVE_INTERVAL_MS / 1000;
            this.saveContinueWatching();
        }, CONFIG.PLAYER_SYS.CONTINUE_WATCHING_SAVE_INTERVAL_MS);
    }

    saveContinueWatching() {
        if (!this.currentMedia) return;
        let history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CONTINUE_WATCHING) || '[]');
        const item = {
            ...this.currentMedia,
            provider: this.manager.getCurrent().id,
            watchTime: this.watchTime,
            date: new Date().toISOString()
        };
        history = history.filter(h => !(h.id === item.id && h.season === item.season && h.episode === item.episode));
        history.unshift(item);
        history = history.slice(0, 20); // Keep last 20
        localStorage.setItem(CONFIG.STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(history));
    }

    showError(message) {
        this.container.innerHTML = `<div class="player-error"><h3>Playback Error</h3><p>${message}</p></div>`;
    }
}

window.Player = Player;