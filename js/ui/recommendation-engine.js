/**
 * recommendation-engine.js
 * Tracks user affinities and generates personalized recommendations.
 */

class RecommendationEngine {
    constructor() {
        this.affinities = this.loadAffinities();
    }

    loadAffinities() {
        return JSON.parse(localStorage.getItem('eh_user_affinities') || '{"genres":{}, "actors":{}, "languages":{}}');
    }

    saveAffinities() {
        localStorage.setItem('eh_user_affinities', JSON.stringify(this.affinities));
    }

    // Call this when a user views a detail page
    trackView(details) {
        if (details.genres) {
            details.genres.forEach(g => {
                this.affinities.genres[g.id] = (this.affinities.genres[g.id] || 0) + 1;
            });
        }
        if (details.credits?.cast) {
            details.credits.cast.slice(0, 3).forEach(c => {
                this.affinities.actors[c.id] = (this.affinities.actors[c.id] || 0) + 1;
            });
        }
        if (details.original_language) {
            this.affinities.languages[details.original_language] = (this.affinities.languages[details.original_language] || 0) + 1;
        }
        this.saveAffinities();
    }

    getTopGenres(limit = 3) {
        return Object.entries(this.affinities.genres)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => id);
    }

    async getRecommendedForYou() {
        const topGenres = this.getTopGenres();
        if (topGenres.length === 0) return [];

        // Use TMDB Discover with user's top genre
        const data = await TMDB.discover('movie', {
            with_genres: topGenres.join(','),
            sort_by: 'popularity.desc',
            'vote_count.gte': 100
        });

        // Filter out items already in history to avoid duplicates
        const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RECENTLY_VIEWED) || '[]');
        return data.results.filter(m => !history.some(h => h.id === m.id));
    }
}