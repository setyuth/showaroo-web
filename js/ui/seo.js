/**
 * seo.js
 * Handles dynamic SEO updates for SPA navigation.
 */

class SEOManager {
    constructor() {
        this.titleEl = document.querySelector('title');
        this.metaDesc = document.querySelector('meta[name="description"]');
        this.ogTitle = document.querySelector('meta[property="og:title"]');
        this.ogImage = document.querySelector('meta[property="og:image"]');
        this.schemaEl = document.getElementById('dynamic-schema') || this.createSchemaEl();
    }

    createSchemaEl() {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'dynamic-schema';
        document.head.appendChild(script);
        return script;
    }

    updateMovieSEO(movie) {
        this.titleEl.textContent = `${movie.title} (${movie.release_date?.substring(0,4) || ''}) - Watch Now`;
        this.metaDesc.setAttribute('content', movie.overview?.substring(0, 150) || 'Premium Entertainment Hub');
        this.ogTitle.setAttribute('content', this.titleEl.textContent);
        this.ogImage.setAttribute('content', TMDB.getImage(movie.backdrop_path, 'original'));

        const schema = {
            "@context": "https://schema.org",
            "@type": "Movie",
            "name": movie.title,
            "description": movie.overview,
            "image": TMDB.getImage(movie.backdrop_path, 'original'),
            "datePublished": movie.release_date,
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": movie.vote_average,
                "ratingCount": movie.vote_count
            }
        };
        this.schemaEl.textContent = JSON.stringify(schema);
    }

    updateTVSEO(tv) {
        // Similar to Movie, but @type: "TVSeries"
    }

    updatePersonSEO(person) {
        // @type: "Person"
    }
}