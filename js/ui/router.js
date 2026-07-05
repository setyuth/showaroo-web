/**
 * ui/router.js
 * Hash-based SPA router for Blogger compatibility.
 */
const Router = {
    routes: {},
    currentView: null,

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    add(path, callback) {
        this.routes[path] = callback;
    },

    async handleRoute() {
        const hash = window.location.hash.substring(2) || 'home'; // Remove #/
        const [path, id, season, episode] = hash.split('/');
        
        const appContainer = document.getElementById('app-container');
        appContainer.style.opacity = 0;

        // Wait for fade out
        await new Promise(r => setTimeout(r, 150));

        if (path === 'movie' || path === 'tv') {
            EventBus.emit('route:details', { type: path, id, season, episode });
            StateManager.set('currentPage', 'details');
        } else if (path === 'library') {
            EventBus.emit('route:library');
            StateManager.set('currentPage', 'library');
        } else {
            EventBus.emit('route:home');
            StateManager.set('currentPage', 'home');
        }

        // Fade in new view
        appContainer.style.opacity = 1;
        
        // Scroll restoration
        if (this.currentView !== path) {
            window.scrollTo(0, 0);
            this.currentView = path;
        }
    },

    navigate(path) {
        window.location.hash = `#/${path}`;
    }
};