/**
 * tmdb.js
 * TMDB API Wrapper with Stale-While-Revalidate caching and deduplication.
 */

const TMDB_CACHE = new Map();
const ACTIVE_REQUESTS = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const TMDB = {
    async fetch(endpoint, params = {}) {
        const url = new URL(`${CONFIG.TMDB.BASE_URL}${endpoint}`);
        url.searchParams.set('api_key', CONFIG.TMDB.API_KEY);
        url.searchParams.set('language', CONFIG.TMDB.LANGUAGE);
        
        // Safely encode all parameters
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, encodeURIComponent(params[key]));
        });
        
        const cacheKey = url.toString();

        // 1. Return fresh cache immediately
        if (TMDB_CACHE.has(cacheKey)) {
            const { timestamp, data } = TMDB_CACHE.get(cacheKey);
            const isStale = (Date.now() - timestamp) > CACHE_TTL;
            
            if (!isStale) return data;
            
            // Stale-While-Revalidate: return stale data, fetch new in background
            this.backgroundFetch(cacheKey, url);
            return data;
        }

        // 2. Request Deduplication
        if (ACTIVE_REQUESTS.has(cacheKey)) {
            return ACTIVE_REQUESTS.get(cacheKey);
        }

        // 3. New Fetch
        const promise = fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('TMDB Network Error');
                return res.json();
            })
            .then(data => {
                TMDB_CACHE.set(cacheKey, { timestamp: Date.now(), data });
                ACTIVE_REQUESTS.delete(cacheKey);
                return data;
            })
            .catch(err => {
                ACTIVE_REQUESTS.delete(cacheKey);
                console.error('TMDB Fetch Failed:', err);
                return null;
            });

        ACTIVE_REQUESTS.set(cacheKey, promise);
        return promise;
    },

    async backgroundFetch(cacheKey, url) {
        try {
            const res = await fetch(url);
            const data = await res.json();
            TMDB_CACHE.set(cacheKey, { timestamp: Date.now(), data });
        } catch (e) {
            // Silent fail in background
        }
    },

    // Endpoints
    getTrending: (type = 'movie', time = 'day') => this.fetch(`/trending/${type}/${time}`),
    getMovies: (category, page = 1) => this.fetch(`/movie/${category}`, { page }),
    getTV: (category, page = 1) => this.fetch(`/tv/${category}`, { page }),
    getDetails: (type, id) => this.fetch(`/${type}/${id}`, { append_to_response: 'credits,recommendations,similar,images,videos,keywords,external_ids' }),
    search: (query, page = 1) => this.fetch('/search/multi', { query, page }),
    discover: (type, filters) => this.fetch(`/discover/${type}`, filters),
    getPerson: (id) => this.fetch(`/person/${id}`, { append_to_response: 'movie_credits,tv_credits,images' }),
    getCollection: (id) => this.fetch(`/collection/${id}`),

    // Image URL Helper
    getImage(path, size = 'w500') {
        if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
        return `${CONFIG.TMDB.IMAGE_BASE_URL}${size}${path}`;
    }
};