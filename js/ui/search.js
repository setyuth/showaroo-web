/**
 * search.js
 * Advanced search engine with history and accessibility.
 */

class SearchEngine {
    constructor(inputSelector, resultsSelector) {
        this.input = document.querySelector(inputSelector);
        this.resultsContainer = document.querySelector(resultsSelector);
        this.debounceTimer = null;
        this.activeIndex = -1;
        this.history = JSON.parse(localStorage.getItem('eh_search_history') || '[]');
        
        this.init();
    }

    init() {
        this.input.addEventListener('input', (e) => this.handleInput(e.target.value));
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.input.addEventListener('focus', () => this.showRecentSearches());
    }

    handleInput(query) {
        clearTimeout(this.debounceTimer);
        if (query.trim().length < 2) {
            this.showRecentSearches();
            return;
        }
        
        this.debounceTimer = setTimeout(async () => {
            const data = await TMDB.search(query);
            if (data && data.results) {
                this.renderResults(data.results.slice(0, 8), query);
            }
        }, CONFIG.UI.SEARCH_DEBOUNCE_MS);
    }

    handleKeydown(e) {
        const items = this.resultsContainer.querySelectorAll('.search-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
            this.updateFocus(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.activeIndex = Math.max(this.activeIndex - 1, -1);
            this.updateFocus(items);
        } else if (e.key === 'Enter' && this.activeIndex > -1) {
            items[this.activeIndex].click();
        }
    }

    updateFocus(items) {
        items.forEach((item, idx) => {
            if (idx === this.activeIndex) item.setAttribute('aria-selected', 'true');
            else item.removeAttribute('aria-selected');
        });
        if (items[this.activeIndex]) items[this.activeIndex].scrollIntoView({ block: 'nearest' });
    }

    renderResults(results, query) {
        this.resultsContainer.innerHTML = results.map(item => {
            if (item.media_type === 'person' || !item.poster_path) return ''; // Basic filter
            const title = item.title || item.name;
            const highlightedTitle = title.replace(new RegExp(query, 'gi'), match => `<mark>${match}</mark>`);
            
            return `
                <div class="search-item" role="option" tabindex="-1" data-id="${item.id}" data-type="${item.media_type}">
                    <img src="${TMDB.getImage(item.poster_path, 'w92')}" alt="${title}" loading="lazy">
                    <div class="search-item-info">
                        <span class="title">${highlightedTitle}</span>
                        <span class="meta">${item.media_type.toUpperCase()} • ${item.release_date || item.first_air_date || 'N/A'}</span>
                    </div>
                </div>
            `;
        }).join('');

        this.bindResultClicks();
    }

    showRecentSearches() {
        if (this.history.length === 0) return;
        this.resultsContainer.innerHTML = `<div class="search-header">Recent Searches</div>` + 
            this.history.map(term => `
                <div class="search-item recent" role="option" tabindex="-1" data-term="${term}">
                    <span class="icon">🕘</span> <span>${term}</span>
                </div>
            `).join('');
        
        this.resultsContainer.querySelectorAll('.recent').forEach(item => {
            item.addEventListener('click', () => {
                this.input.value = item.dataset.term;
                this.handleInput(item.dataset.term);
            });
        });
    }

    bindResultClicks() {
        this.resultsContainer.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', () => {
                const term = this.input.value;
                this.history = [term, ...this.history.filter(h => h !== term)].slice(0, 5);
                localStorage.setItem('eh_search_history', JSON.stringify(this.history));
                
                // Trigger routing
                window.location.hash = `#/${item.dataset.type}/${item.dataset.id}`;
            });
        });
    }
}