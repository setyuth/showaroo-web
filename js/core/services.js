/**
 * core/services.js
 * Services wrap existing modules to enforce business logic boundaries.
 * Services interact with each other ONLY via EventBus.
 */

const Services = {
    TMDBService: {
        fetch: (endpoint, params) => TMDB.fetch(endpoint, params),
        getImage: (path, size) => TMDB.getImage(path, size)
    },

    PlayerService: {
        load: (media) => {
            StateManager.set('loading', true);
            window.App.player.load(media);
            EventBus.emit('player:loadRequested', media);
        },
        handleProviderChanged: (data) => EventBus.emit('provider:changed', data)
    },

    ProviderService: {
        getCurrent: () => window.App.providerManager.getCurrent(),
        select: (id) => {
            const success = window.App.providerManager.select(id);
            if (success) EventBus.emit('provider:changed', window.App.providerManager.getCurrent());
            return success;
        }
    },

    StorageService: {
        get: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
        set: (key, data) => localStorage.setItem(key, JSON.stringify(data))
    },

    HistoryService: {
        trackView: (details) => {
            window.App.recommendationEngine.trackView(details);
            EventBus.emit('history:updated', details);
        }
    },

    SearchService: {
        search: (query) => {
            EventBus.emit('search:started', query);
            TMDB.search(query).then(data => {
                EventBus.emit('search:completed', data);
            });
        }
    },

    RecommendationService: {
        getRecommended: async () => {
            const recs = await window.App.recommendationEngine.getRecommendedForYou();
            EventBus.emit('recommendations:ready', recs);
            return recs;
        }
    }
};