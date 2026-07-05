/**
 * providers.js
 * Registry for all streaming providers. Add new providers here ONLY.
 */

const PROVIDERS = [
    {
        id: "vidlink",
        name: "VidLink Premium",
        priority: 1,
        enabled: true,
        version: "2.1.0",
        author: "VidLink Team",
        homepage: "https://vidlink.pro",
        lastUpdated: "2023-10-15",
        features: ["4K", "Subtitles", "Skip Intro"],
        supportsMovie: true,
        supportsTV: true,
        supportsSubtitle: true,
        supportsQualitySelection: true,
        healthCheckUrl: "https://vidlink.pro/favicon.ico",
        movieUrl: (tmdbId) => `https://vidlink.pro/movie/${tmdbId}?autoplay=false&poster=true&title=true&primaryColor=E50914&secondaryColor=1F80FF`,
        tvUrl: (tmdbId, season, episode) => `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?autoplay=false&poster=true&title=true&primaryColor=E50914&secondaryColor=1F80FF`
    },
    {
        id: "vidsrc",
        name: "VidSrc Mirror",
        priority: 2,
        enabled: true,
        version: "1.4.2",
        author: "VidSrc",
        homepage: "https://vidsrc.to",
        lastUpdated: "2023-09-20",
        features: ["1080p", "Fast Loading"],
        supportsMovie: true,
        supportsTV: true,
        supportsSubtitle: false,
        supportsQualitySelection: false,
        healthCheckUrl: "https://vidsrc.to/favicon.ico",
        movieUrl: (tmdbId) => `https://vidsrc.to/embed/movie/${tmdbId}`,
        tvUrl: (tmdbId, season, episode) => `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
    },
    {
        id: "superembed",
        name: "SuperEmbed",
        priority: 3,
        enabled: true,
        version: "3.0.0",
        supportsMovie: true,
        supportsTV: true,
        supportsSubtitle: true,
        supportsQualitySelection: false,
        healthCheckUrl: "https://multiembed.mov/favicon.ico",
        movieUrl: (tmdbId) => `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
        tvUrl: (tmdbId, season, episode) => `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
    }
];

window.PROVIDERS = PROVIDERS;