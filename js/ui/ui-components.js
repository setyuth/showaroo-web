/**
 * ui/ui-components.js
 * Premium UI components: Hero, Carousel, Card, Preview Modal, Toasts.
 */

class NotificationSystem {
    static show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification glass ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

class HeroComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.slides = [];
        this.currentIndex = 0;
        this.interval = null;
    }

    render(items) {
        this.slides = items;
        this.container.innerHTML = this.slides.map((item, index) => `
            <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: linear-gradient(to bottom, rgba(9,9,9,0.3), rgba(9,9,9,0.8), #090909), url('${Services.TMDBService.getImage(item.backdrop_path, 'original')}')">
                <div class="hero-content">
                    <h1 class="hero-title">${item.title || item.name}</h1>
                    <div class="hero-meta">
                        <span class="rating">★ ${item.vote_average?.toFixed(1)}</span>
                        <span>${item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4)}</span>
                    </div>
                    <p class="hero-overview">${item.overview?.substring(0, 200)}...</p>
                    <div class="hero-actions">
                        <button class="btn btn-primary" data-id="${item.id}" data-type="${item.media_type}">Watch Now</button>
                        <button class="btn btn-secondary" data-id="${item.id}" data-type="${item.media_type}">More Info</button>
                    </div>
                </div>
            </div>
        `).join('');

        this.startAutoRotate();
    }

    startAutoRotate() {
        clearInterval(this.interval);
        this.interval = setInterval(() => this.next(), 8000);
    }

    next() {
        const current = this.container.querySelector('.hero-slide.active');
        current?.classList.remove('active');
        this.currentIndex = (this.currentIndex + 1) % this.slides.length;
        this.container.querySelectorAll('.hero-slide')[this.currentIndex].classList.add('active');
    }
}

class CarouselComponent {
    constructor(containerId, title) {
        this.container = document.getElementById(containerId);
        this.title = title;
        this.isDown = false;
        this.startX = 0;
        this.scrollLeft = 0;
    }

    async render(fetchFunction) {
        this.container.innerHTML = `
            <h2 class="row-title">${this.title}</h2>
            <div class="row-slider" role="listbox" aria-label="${this.title} carousel"></div>
        `;
        const slider = this.container.querySelector('.row-slider');
        slider.innerHTML = Array(6).fill('<div class="card-skeleton"></div>').join('');
        
        const data = await fetchFunction();
        if (!data || !data.results) return;

        slider.innerHTML = data.results.slice(0, 20).map(item => `
            <div class="content-card" data-id="${item.id}" data-type="${item.media_type || (item.title ? 'movie' : 'tv')}" role="option" tabindex="0">
                <img data-src="${Services.TMDBService.getImage(item.poster_path, 'w342')}" alt="${item.title || item.name}" class="lazy-load">
                <div class="card-overlay">
                    <button class="card-action play" aria-label="Play">▶</button>
                    <button class="card-action fav" aria-label="Add to Favorites">+</button>
                </div>
                <div class="card-info">
                    <span class="card-title">${item.title || item.name}</span>
                    <span class="card-meta">★ ${item.vote_average?.toFixed(1)}</span>
                </div>
            </div>
        `).join('');

        this.setupScrolling(slider);
        this.setupLazyLoad(slider);
    }

    setupScrolling(slider) {
        slider.addEventListener('mousedown', (e) => {
            this.isDown = true;
            slider.classList.add('active-drag');
            this.startX = e.pageX - slider.offsetLeft;
            this.scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => { this.isDown = false; slider.classList.remove('active-drag'); });
        slider.addEventListener('mouseup', () => { this.isDown = false; slider.classList.remove('active-drag'); });
        slider.addEventListener('mousemove', (e) => {
            if (!this.isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - this.startX) * 2; // Scroll speed
            slider.scrollLeft = this.scrollLeft - walk;
        });
        
        // Mouse wheel horizontal scroll
        slider.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                slider.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    setupLazyLoad(slider) {
        // Use a single observer per carousel instance
        this.lazyObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.onload = () => img.classList.add('loaded');
                    obs.unobserve(img);
                }
            });
        }, { rootMargin: '200px' });
        
        slider.querySelectorAll('img.lazy-load').forEach(img => this.lazyObserver.observe(img));
    }

    destroy() {
        // Called by Router when navigating away
        if (this.lazyObserver) this.lazyObserver.disconnect();
    }
}

class PreviewModal {
    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'preview-modal-overlay hidden';
        this.modal.innerHTML = `<div class="preview-modal glass"><button class="close-preview">&times;</button><div class="preview-content"></div></div>`;
        document.body.appendChild(this.modal);
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal || e.target.classList.contains('close-preview')) this.hide();
        });
    }

    async show(id, type) {
        this.modal.classList.remove('hidden');
        const content = this.modal.querySelector('.preview-content');
        content.innerHTML = '<div class="skeleton-loader large"></div>';

        const data = await Services.TMDBService.fetch(`/${type}/${id}`, { append_to_response: 'videos,credits' });
        if (!data) return;

        const trailer = data.videos?.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        content.innerHTML = `
            <div class="preview-header" style="background-image: linear-gradient(to bottom, transparent, #141414), url('${Services.TMDBService.getImage(data.backdrop_path, 'w1280')}')">
                ${trailer ? `<iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1" frameborder="0" allow="autoplay; encrypted-media"></iframe>` : ''}
            </div>
            <div class="preview-body">
                <h2>${data.title || data.name}</h2>
                <p>${data.overview}</p>
                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="window.location.hash='#/${type}/${id}'">Watch Now</button>
                </div>
            </div>
        `;
    }

    hide() {
        this.modal.classList.add('hidden');
        this.modal.querySelector('.preview-content').innerHTML = ''; // Stop video playback
    }
}

// Global Instantiation
window.NotificationSystem = NotificationSystem;
window.HeroComponent = HeroComponent;
window.CarouselComponent = CarouselComponent;
window.PreviewModal = PreviewModal;