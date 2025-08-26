class PublishedDashboard {
    constructor() {
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.currentSort = 'recent';
        this.currentTimeframe = 'all';
        this.currentPublisher = 'all';
        this.currentGenre = 'all';
        this.booksPerPage = 20;
        this.isLoading = false;
        this.hasMoreBooks = true;
        this.allBooks = [];
        this.availableGenres = new Set();
        this.availablePublishers = new Set();
        this.init();
    }

    async init() {
        await this.loadStats();
        await this.loadBooks(true);
        await this.loadLeaderboards();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Performance filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterClick(e.target);
            });
        });
        
        // Sort dropdown
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.loadBooks(true);
            });
        }
        
        // Time filter dropdown
        const timeSelect = document.getElementById('timeSelect');
        if (timeSelect) {
            timeSelect.addEventListener('change', (e) => {
                this.currentTimeframe = e.target.value;
                this.loadBooks(true);
            });
        }
        
        // Publisher filter dropdown
        const publisherSelect = document.getElementById('publisherSelect');
        if (publisherSelect) {
            publisherSelect.addEventListener('change', (e) => {
                this.currentPublisher = e.target.value;
                this.loadBooks(true);
            });
        }
        
        // Genre filter dropdown
        const genreSelect = document.getElementById('genreSelect');
        if (genreSelect) {
            genreSelect.addEventListener('change', (e) => {
                this.currentGenre = e.target.value;
                this.loadBooks(true);
            });
        }
        
        // Infinite scroll
        window.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Clear all filters button
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/published/stats');
            const data = await response.json();

            if (data.success) {
                this.updateStatsDisplay(data.data);
                this.updateProgressBar(data.data.milestones);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsDisplay(stats) {
        const { overall, recent } = stats;
        
        document.getElementById('totalBooks').textContent = overall.total_books || 0;
        document.getElementById('verifiedBooks').textContent = overall.verified_books || 0;
        document.getElementById('rankedBooks').textContent = overall.ranked_books || 0;
        document.getElementById('avgRating').textContent = (overall.avg_rating || 0).toFixed(1);

        this.animateCounters();
    }

    updateProgressBar(milestones) {
        const milestone = milestones.find(m => m.milestone_name === '10K_BOOKS_GOAL');
        if (milestone) {
            const progress = (milestone.current_count / milestone.target_count) * 100;
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            setTimeout(() => {
                progressFill.style.width = `${Math.min(progress, 100)}%`;
            }, 500);
            
            progressText.textContent = `${milestone.current_count.toLocaleString()} / ${milestone.target_count.toLocaleString()} Books Published`;
            
            if (milestone.achieved_at) {
                progressText.innerHTML += '<br><span style="color: #27ae60; font-weight: bold;">🎉 Milestone Achieved!</span>';
            }
        }
    }

    async loadBooks(reset = false) {
        if (this.isLoading || (!this.hasMoreBooks && !reset)) return;
        
        this.isLoading = true;
        
        if (reset) {
            this.currentPage = 1;
            this.hasMoreBooks = true;
            this.allBooks = [];
            document.getElementById('booksGrid').innerHTML = '';
        }
        
        const loading = document.getElementById('loading');
        const scrollLoading = document.getElementById('scrollLoading');
        
        if (reset) {
            loading.style.display = 'block';
            scrollLoading.style.display = 'none';
        } else {
            loading.style.display = 'none';
            scrollLoading.style.display = 'block';
        }

        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.booksPerPage,
                filter: this.currentFilter,
                sort_by: this.getSortBy(),
                timeframe: this.currentTimeframe,
                publisher: this.currentPublisher,
                genre: this.currentGenre,
                order: this.getSortOrder()
            });

            const response = await fetch(`/api/published/dashboard?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                const newBooks = data.data.books;
                if (newBooks.length === 0) {
                    this.hasMoreBooks = false;
                } else {
                    this.allBooks = [...this.allBooks, ...newBooks];
                    this.appendBooks(newBooks, reset);
                    this.currentPage++;
                    
                    // Extract genres and publishers for filters
                    newBooks.forEach(book => {
                        if (book.genre) this.availableGenres.add(book.genre);
                        if (book.publisher_name) this.availablePublishers.add(book.publisher_name);
                    });
                    
                    if (reset) {
                        this.updateFilterOptions();
                    }
                }
            } else {
                console.error('Error loading books:', data.error);
            }
        } catch (error) {
            console.error('Error loading books:', error);
        } finally {
            this.isLoading = false;
            loading.style.display = 'none';
            scrollLoading.style.display = 'none';
        }
    }

    getSortBy() {
        switch (this.currentSort) {
            case 'recent':
                return 'created_at';
            case 'best_bsr':
                return 'bestseller_rank';
            case 'most_reviews':
                return 'rating_count';
            case 'biggest_improvement':
                return 'rank_improvement_30d';
            case 'trending_up':
                return 'trend_score';
            default:
                return 'created_at';
        }
    }
    
    getSortOrder() {
        switch (this.currentSort) {
            case 'best_bsr':
                return 'ASC'; // Lower BSR is better
            case 'recent':
            case 'most_reviews':
            case 'biggest_improvement':
            case 'trending_up':
            default:
                return 'DESC';
        }
    }

    appendBooks(books, reset = false) {
        const booksGrid = document.getElementById('booksGrid');
        
        if (books.length === 0 && reset) {
            booksGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #7f8c8d;">No books found for the selected filters.</div>';
            return;
        }

        const newBooksHtml = books.map(book => this.createBookCard(book)).join('');
        
        if (reset) {
            booksGrid.innerHTML = newBooksHtml;
        } else {
            booksGrid.insertAdjacentHTML('beforeend', newBooksHtml);
        }
    }

    createBookCard(book) {
        const coverImage = book.cover_image_url || '/images/book-placeholder.png';
        const rating = book.rating_average ? book.rating_average.toFixed(1) : 'N/A';
        const ratingStars = this.generateStars(book.rating_average || 0);
        const rank = book.bestseller_rank ? `#${book.bestseller_rank.toLocaleString()}` : 'Unranked';
        const price = book.current_price ? `$${book.current_price}` : '';
        const verificationBadge = book.verification_status === 'verified' ? 
            '<div style="position: absolute; top: 10px; right: 10px; background: #27ae60; color: white; padding: 0.3rem 0.6rem; border-radius: 10px; font-size: 0.8rem;"><i class="fas fa-check"></i></div>' : '';

        // Add trend arrow based on recent performance
        const trendArrow = this.getTrendArrow(book);

        return `
            <div class="book-card" data-book-id="${book.id}" onclick="showBookPerformance(${book.id}, '${this.escapeHtml(book.title)}', '${coverImage}')">
                ${verificationBadge}
                <img src="${coverImage}" alt="${book.title}" class="book-image" 
                     onerror="this.src='/images/book-placeholder.png'">
                <div class="book-hover-overlay">
                    <div class="hover-stats">
                        <div class="hover-stat">
                            <i class="fas fa-chart-line"></i>
                            <span>BSR: ${rank}</span>
                        </div>
                        <div class="hover-stat">
                            <i class="fas fa-star"></i>
                            <span>${rating} (${book.rating_count || 0})</span>
                        </div>
                        ${trendArrow ? `<div class="hover-stat trend-${trendArrow.direction}">
                            <i class="fas fa-arrow-${trendArrow.direction}"></i>
                            <span>${trendArrow.text}</span>
                        </div>` : ''}
                    </div>
                    <div class="hover-action">
                        <i class="fas fa-chart-bar"></i> View Performance
                    </div>
                </div>
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(book.title)}</div>
                    <div class="book-author">by ${this.escapeHtml(book.author)}</div>
                    <div class="book-metrics">
                        <div class="rating">
                            ${ratingStars}
                            <span>${rating}</span>
                            ${book.rating_count ? `<span style="color: #7f8c8d; font-size: 0.9rem;">(${book.rating_count})</span>` : ''}
                        </div>
                        ${book.bestseller_rank ? `<div class="rank-badge">${rank}${trendArrow ? ` ${trendArrow.icon}` : ''}</div>` : ''}
                    </div>
                    ${price ? `<div style="margin-top: 0.5rem; font-weight: bold; color: #27ae60;">${price}</div>` : ''}
                    <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #7f8c8d;">
                        Published: ${this.formatDate(book.created_at)}
                    </div>
                </div>
            </div>
        `;
    }

    getTrendArrow(book) {
        // Use actual trend data from the backend
        if (book.trend_direction) {
            if (book.trend_direction === 'up') {
                return { direction: 'up', icon: '📈', text: 'Trending Up' };
            } else if (book.trend_direction === 'down') {
                return { direction: 'down', icon: '📉', text: 'Trending Down' };
            }
        }
        
        // Fallback to rank improvement data
        if (book.rank_improvement_30d) {
            const improvement = parseFloat(book.rank_improvement_30d);
            if (improvement > 1000) {
                return { direction: 'up', icon: '📈', text: `+${Math.floor(improvement).toLocaleString()}` };
            } else if (improvement < -1000) {
                return { direction: 'down', icon: '📉', text: `${Math.floor(improvement).toLocaleString()}` };
            }
        }
        
        return null;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    handleScroll() {
        if (this.isLoading || !this.hasMoreBooks) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Load more when user is 200px from bottom
        if (scrollTop + windowHeight >= documentHeight - 200) {
            this.loadBooks();
        }
    }
    
    updateFilterOptions() {
        // Update genre filter options
        const genreSelect = document.getElementById('genreSelect');
        if (genreSelect && this.availableGenres.size > 0) {
            const currentValue = genreSelect.value;
            const genreOptions = Array.from(this.availableGenres).sort().map(genre => 
                `<option value="${genre}" ${currentValue === genre ? 'selected' : ''}>${genre}</option>`
            ).join('');
            
            genreSelect.innerHTML = `
                <option value="all" ${currentValue === 'all' ? 'selected' : ''}>All Genres</option>
                ${genreOptions}
            `;
        }
        
        // Update publisher filter options
        const publisherSelect = document.getElementById('publisherSelect');
        if (publisherSelect && this.availablePublishers.size > 0) {
            const currentValue = publisherSelect.value;
            const publisherOptions = Array.from(this.availablePublishers).sort().map(publisher => 
                `<option value="${publisher}" ${currentValue === publisher ? 'selected' : ''}>${publisher}</option>`
            ).join('');
            
            publisherSelect.innerHTML = `
                <option value="all" ${currentValue === 'all' ? 'selected' : ''}>All Publishers</option>
                ${publisherOptions}
            `;
        }
    }

    handleFilterClick(button) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        this.currentFilter = button.dataset.filter;
        this.loadBooks(true);
    }
    
    clearAllFilters() {
        // Reset all filters
        this.currentFilter = 'all';
        this.currentSort = 'recent';
        this.currentTimeframe = 'all';
        this.currentPublisher = 'all';
        this.currentGenre = 'all';
        
        // Reset UI
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
        
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.value = 'recent';
        
        const timeSelect = document.getElementById('timeSelect');
        if (timeSelect) timeSelect.value = 'all';
        
        const publisherSelect = document.getElementById('publisherSelect');
        if (publisherSelect) publisherSelect.value = 'all';
        
        const genreSelect = document.getElementById('genreSelect');
        if (genreSelect) genreSelect.value = 'all';
        
        // Reload books
        this.loadBooks(true);
    }

    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        counters.forEach(counter => {
            const target = parseInt(counter.textContent) || parseFloat(counter.textContent);
            const isFloat = counter.textContent.includes('.');
            let current = 0;
            const increment = target / 50;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = isFloat ? target.toFixed(1) : target.toLocaleString();
                    clearInterval(timer);
                } else {
                    counter.textContent = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString();
                }
            }, 30);
        });
    }

    async loadLeaderboards() {
        try {
            const response = await fetch('/api/publishers/leaderboards?limit=5');
            const data = await response.json();

            if (data.success) {
                this.displayLeaderboard('topPublishers', data.data.most_published?.entries || []);
                this.displayLeaderboard('risingStars', data.data.rising_stars?.entries || []);
                this.displayLeaderboard('bestSellers', data.data.best_sellers?.entries || []);
            }
        } catch (error) {
            console.error('Error loading leaderboards:', error);
        }
    }

    displayLeaderboard(containerId, entries) {
        const container = document.getElementById(containerId);
        
        if (!entries || entries.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #7f8c8d; font-style: italic; padding: 1rem;">No data yet</div>';
            return;
        }

        const leaderboardHtml = entries.map((entry, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            const badges = this.parseBadges(entry.badge_display || '[]');
            const displayName = entry.display_name || entry.username || `Publisher${entry.user_id?.slice(-4) || ''}`;
            
            return `
                <div class="leaderboard-entry" onclick="goToProfile('${entry.user_id}')">
                    <div class="rank-number ${rankClass}">${entry.rank}</div>
                    <div class="publisher-info">
                        <div class="publisher-name">${this.escapeHtml(displayName)}</div>
                        <div class="publisher-stat">${entry.formatted_value}</div>
                        ${entry.secondary_formatted ? `<div class="publisher-stat">${entry.secondary_formatted}</div>` : ''}
                        <div class="publisher-badges">
                            ${badges.slice(0, 3).map(badge => `<span class="mini-badge" title="${badge.name}">${badge.icon}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = leaderboardHtml;
    }

    parseBadges(badgeJson) {
        try {
            const badgeIds = JSON.parse(badgeJson || '[]');
            return badgeIds.map(id => this.getBadgeConfig(id)).filter(Boolean);
        } catch (e) {
            return [];
        }
    }

    getBadgeConfig(badgeId) {
        const badges = {
            'bronze_book': { icon: '📘', name: 'Bronze Book' },
            'silver_stack': { icon: '📚', name: 'Silver Stack' },
            'gold_trophy': { icon: '🏆', name: 'Gold Trophy' },
            'diamond': { icon: '💎', name: 'Diamond' },
            'crown': { icon: '👑', name: 'Crown' },
            'rocket': { icon: '🚀', name: 'Rocket' },
            'star': { icon: '🌟', name: 'Star' }
        };
        return badges[badgeId];
    }

    showBadgeEarned(badgeNotification) {
        this.createConfettiAnimation();
        
        // Show badge earned modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
            align-items: center; justify-content: center; animation: fadeIn 0.5s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 3rem; border-radius: 20px; text-align: center; max-width: 450px; animation: bounceIn 0.8s ease;">
                <div style="font-size: 5rem; margin-bottom: 1rem; animation: pulse 2s infinite;">${badgeNotification.badge.icon}</div>
                <h2 style="color: #f39c12; margin-bottom: 0.5rem; font-size: 2rem;">${badgeNotification.title}</h2>
                <div style="background: linear-gradient(135deg, #f39c12, #e67e22); color: white; padding: 0.5rem 1rem; border-radius: 25px; display: inline-block; font-weight: bold; margin-bottom: 1rem;">
                    ${badgeNotification.badge.name}
                </div>
                <p style="font-size: 1.1rem; color: #666; margin-bottom: 1rem;">${badgeNotification.message}</p>
                <div style="background: #27ae60; color: white; padding: 0.5rem 1rem; border-radius: 20px; display: inline-block; font-size: 0.9rem; font-weight: bold; margin-bottom: 2rem;">
                    ${badgeNotification.reward}
                </div>
                <div>
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; padding: 1rem 2rem; border-radius: 25px; font-weight: bold; cursor: pointer; margin-right: 1rem;">
                        Awesome!
                    </button>
                    <button onclick="window.location.href='/rewards'" 
                            style="background: #27ae60; color: white; border: none; padding: 1rem 2rem; border-radius: 25px; font-weight: bold; cursor: pointer;">
                        View Rewards
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add celebration styles
        this.addCelebrationStyles();
        
        // Auto-close after 8 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 8000);
    }

    showProximityAlert(alert) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.7); z-index: 1000; display: flex; 
            align-items: center; justify-content: center; animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 15px; text-align: center; max-width: 400px;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${alert.icon}</div>
                <h3 style="color: #3498db; margin-bottom: 1rem;">Almost There!</h3>
                <p style="margin-bottom: 2rem;">${alert.message}</p>
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="background: #3498db; color: white; border: none; padding: 1rem 2rem; border-radius: 25px; font-weight: bold; cursor: pointer;">
                    Keep Publishing!
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 5000);
    }

    createConfettiAnimation() {
        const colors = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f1c40f'];
        const confettiContainer = document.createElement('div');
        confettiContainer.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            pointer-events: none; z-index: 999;
        `;
        
        // Create 100 confetti pieces
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: absolute; width: 10px; height: 10px; 
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%; top: -10px;
                animation: confettiFall ${2 + Math.random() * 3}s linear forwards;
                animation-delay: ${Math.random() * 2}s;
            `;
            
            confettiContainer.appendChild(confetti);
        }
        
        document.body.appendChild(confettiContainer);
        
        // Remove confetti after animation
        setTimeout(() => {
            confettiContainer.remove();
        }, 5000);
    }

    addCelebrationStyles() {
        if (!document.getElementById('celebration-styles')) {
            const style = document.createElement('style');
            style.id = 'celebration-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                    50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
                    70% { transform: scale(0.9) rotate(-2deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @keyframes confettiFall {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadStats();
            this.loadLeaderboards();
        }, 60000); // Refresh stats and leaderboards every minute
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new PublishedDashboard();
});

// Submit form functions
function showSubmitForm() {
    // Check if user is logged in to Teneo
    const teneoToken = localStorage.getItem('teneo_token');
    
    if (!teneoToken) {
        showLoginPrompt();
        return;
    }
    
    showBookSubmissionForm();
}

function showLoginPrompt() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 400px; text-align: center;">
            <h3 style="margin-bottom: 1rem;">Login Required</h3>
            <p style="margin-bottom: 2rem;">You need to be logged into your Teneo account to submit books.</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="window.open('https://teneo.io/login', '_blank')" 
                        style="padding: 0.8rem 1.5rem; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Login to Teneo
                </button>
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="padding: 0.8rem 1.5rem; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function showBookSubmissionForm() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 2rem;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 500px; width: 100%;">
            <h3 style="margin-bottom: 1rem;">Submit Your Published Book</h3>
            <form id="bookSubmissionForm">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Teneo Book ID:</label>
                    <input type="text" id="teneoBookId" required 
                           style="width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 8px;">
                    <small style="color: #7f8c8d;">Found in your Teneo dashboard</small>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Amazon URL:</label>
                    <input type="url" id="amazonUrl" required 
                           style="width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 8px;"
                           placeholder="https://www.amazon.com/dp/...">
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Notes (optional):</label>
                    <textarea id="submissionNotes" rows="3"
                              style="width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 8px;"
                              placeholder="Any additional information..."></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="this.closest('div').parentElement.remove()" 
                            style="padding: 0.8rem 1.5rem; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Cancel
                    </button>
                    <button type="submit" 
                            style="padding: 0.8rem 1.5rem; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Submit Book
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('bookSubmissionForm').addEventListener('submit', submitBook);
}

async function submitBook(event) {
    event.preventDefault();
    
    const teneoToken = localStorage.getItem('teneo_token');
    const formData = {
        teneo_book_id: document.getElementById('teneoBookId').value,
        amazon_url: document.getElementById('amazonUrl').value,
        submission_notes: document.getElementById('submissionNotes').value
    };
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;
    
    try {
        const response = await fetch('/api/published/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${teneoToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Check for new badges or proximity alerts
            if (data.new_badges && data.new_badges.length > 0) {
                dashboard.showBadgeEarned(data.new_badges[0]);
            } else if (data.proximity_alerts && data.proximity_alerts.length > 0) {
                dashboard.showProximityAlert(data.proximity_alerts[0]);
            } else {
                alert('Book submitted successfully! It will be verified and appear on the dashboard soon.');
            }
            
            event.target.closest('div').parentElement.remove();
            dashboard.loadBooks();
            dashboard.loadStats();
            dashboard.loadLeaderboards();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Submission failed. Please try again.');
        console.error('Submission error:', error);
    } finally {
        submitButton.textContent = 'Submit Book';
        submitButton.disabled = false;
    }
}

// Global navigation functions
function goToProfile(userId) {
    window.location.href = `/published/profile/${userId}`;
}

function showAllLeaderboards() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 2rem;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 800px; width: 100%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="margin: 0;">🏆 All Leaderboards</h2>
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
            </div>
            
            <div id="allLeaderboards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem;">
                <div style="text-align: center; padding: 2rem; color: #7f8c8d;">
                    <i class="fas fa-spinner fa-spin"></i> Loading leaderboards...
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    loadAllLeaderboards();
}

async function loadAllLeaderboards() {
    try {
        const response = await fetch('/api/publishers/leaderboards?limit=10');
        const data = await response.json();
        
        const container = document.getElementById('allLeaderboards');
        if (!container) return;

        if (data.success) {
            const leaderboardsHtml = Object.entries(data.data).map(([type, leaderboard]) => `
                <div style="border: 1px solid #ddd; border-radius: 10px; padding: 1.5rem;">
                    <h3 style="margin: 0 0 1rem 0; color: #2c3e50; display: flex; align-items: center; gap: 0.5rem;">
                        ${getLeaderboardIcon(type)} ${leaderboard.title}
                    </h3>
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
                        ${leaderboard.description}
                    </div>
                    ${renderLeaderboardEntries(leaderboard.entries)}
                </div>
            `).join('');
            
            container.innerHTML = leaderboardsHtml;
        } else {
            container.innerHTML = '<div style="text-align: center; color: #e74c3c;">Failed to load leaderboards</div>';
        }
    } catch (error) {
        const container = document.getElementById('allLeaderboards');
        if (container) {
            container.innerHTML = '<div style="text-align: center; color: #e74c3c;">Error loading leaderboards</div>';
        }
    }
}

function getLeaderboardIcon(type) {
    const icons = {
        'most_published': '📚',
        'rising_stars': '🚀',
        'best_sellers': '⭐',
        'most_reviewed': '💬',
        'velocity_leaders': '⚡'
    };
    return icons[type] || '🏆';
}

function renderLeaderboardEntries(entries) {
    if (!entries || entries.length === 0) {
        return '<div style="text-align: center; color: #7f8c8d; font-style: italic;">No data yet</div>';
    }
    
    return entries.map((entry, index) => {
        const displayName = entry.display_name || entry.username || `Publisher${entry.user_id?.slice(-4) || ''}`;
        return `
            <div onclick="goToProfile('${entry.user_id}')" 
                 style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: 5px; cursor: pointer; transition: background 0.3s ease;"
                 onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='transparent'">
                <div style="background: ${index < 3 ? '#3498db' : '#95a5a6'}; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold;">
                    ${entry.rank}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #2c3e50; font-size: 0.85rem;">${escapeHtmlGlobal(displayName)}</div>
                    <div style="font-size: 0.75rem; color: #666;">${entry.formatted_value}</div>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtmlGlobal(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global function to show book performance modal
function showBookPerformance(bookId, title, coverImage) {
    bookModal.show(bookId, title, coverImage);
}