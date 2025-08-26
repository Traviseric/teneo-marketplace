// Daily Digest and Collective Intelligence Components
class DailyDigest {
    constructor() {
        this.digestData = null;
        this.updateInterval = null;
    }

    async init() {
        await this.loadDigest();
        this.startAutoRefresh();
    }

    async loadDigest() {
        try {
            const response = await fetch('/api/digest/daily');
            const data = await response.json();
            
            if (data.success) {
                this.digestData = data.data;
                this.renderDigest();
                this.renderCollectiveIntelligence();
                this.renderMilestonesFeed();
                this.renderCommunityInsights();
            } else {
                console.error('Failed to load digest:', data.error);
                this.renderError();
            }
        } catch (error) {
            console.error('Error loading digest:', error);
            this.renderError();
        }
    }

    renderDigest() {
        const container = document.getElementById('dailyDigest');
        if (!container || !this.digestData) return;

        const { bookOfTheDay, moverAndShaker, reviewChampion, risingCategory } = this.digestData;
        
        container.innerHTML = `
            <div class="digest-header">
                <h2 class="digest-title">📊 Today's Performance Digest</h2>
                <div class="digest-meta">
                    <span class="last-updated">Updated ${this.formatTimeAgo(this.digestData.generatedAt)}</span>
                    <button class="refresh-btn" onclick="dailyDigest.refreshDigest()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
            
            <div class="digest-cards">
                ${this.renderBookOfTheDay(bookOfTheDay)}
                ${this.renderMoverAndShaker(moverAndShaker)}
                ${this.renderReviewChampion(reviewChampion)}
                ${this.renderRisingCategory(risingCategory)}
            </div>
        `;
    }

    renderBookOfTheDay(book) {
        if (!book) return '<div class="digest-card empty">📚 No standout performer today</div>';

        return `
            <div class="digest-card book-of-day">
                <div class="card-header">
                    <h3>📈 Book of the Day</h3>
                    <div class="improvement-badge">
                        BSR improved ${book.improvementPercent}%
                    </div>
                </div>
                <div class="card-content">
                    <img src="${book.cover_image_url || '/images/book-placeholder.png'}" 
                         alt="${book.title}" class="book-cover-small"
                         onerror="this.src='/images/book-placeholder.png'">
                    <div class="book-details">
                        <h4 class="book-title-small">${this.escapeHtml(book.title)}</h4>
                        <p class="book-author-small">by ${this.escapeHtml(book.author)}</p>
                        <p class="publisher-name">Publisher: ${this.escapeHtml(book.publisher_name)}</p>
                        
                        <div class="bsr-improvement">
                            <span class="bsr-previous">#${book.previous_rank?.toLocaleString() || 'Unknown'}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="bsr-current">#${book.current_rank?.toLocaleString()}</span>
                            <span class="arrow-up">📈</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMoverAndShaker(book) {
        if (!book) return '<div class="digest-card empty">📊 No major movements today</div>';

        return `
            <div class="digest-card mover-shaker">
                <div class="card-header">
                    <h3>📊 Mover & Shaker</h3>
                    <div class="volatility-badge">
                        ${book.position_changes} position changes
                    </div>
                </div>
                <div class="card-content">
                    <div class="book-info-line">
                        <strong>${this.escapeHtml(book.title)}</strong><br>
                        <small>by ${this.escapeHtml(book.publisher_name)}</small>
                    </div>
                    
                    <div class="sparkline-container">
                        <canvas id="sparkline-${book.id}" width="200" height="60"></canvas>
                    </div>
                    
                    <div class="volatility-stats">
                        <div class="stat">
                            <span class="label">Best:</span>
                            <span class="value">#${book.best_rank?.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <span class="label">Worst:</span>
                            <span class="value">#${book.worst_rank?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderReviewChampion(book) {
        if (!book) return '<div class="digest-card empty">⭐ No review champions today</div>';

        const stars = this.generateStars(book.rating_average || 0);

        return `
            <div class="digest-card review-champion">
                <div class="card-header">
                    <h3>⭐ Review Champion</h3>
                    <div class="reviews-badge">
                        +${book.newReviewsCount} reviews this week
                    </div>
                </div>
                <div class="card-content">
                    <div class="book-info-line">
                        <strong>${this.escapeHtml(book.title)}</strong><br>
                        <small>by ${this.escapeHtml(book.publisher_name)}</small>
                    </div>
                    
                    <div class="review-stats">
                        <div class="rating-display">
                            ${stars}
                            <span class="rating-number">${(book.rating_average || 0).toFixed(1)}</span>
                        </div>
                        <div class="review-count">
                            ${(book.rating_count || 0).toLocaleString()} total reviews
                        </div>
                    </div>
                    
                    <div class="review-growth">
                        <div class="growth-bar">
                            <div class="growth-fill" style="width: ${Math.min(100, book.newReviewsCount * 10)}%"></div>
                        </div>
                        <small>Weekly review growth</small>
                    </div>
                </div>
            </div>
        `;
    }

    renderRisingCategory(category) {
        if (!category) return '<div class="digest-card empty">📚 No rising categories</div>';

        return `
            <div class="digest-card rising-category">
                <div class="card-header">
                    <h3>🚀 Rising Category</h3>
                    <div class="category-badge">
                        ${category.improvementPercent}% avg improvement
                    </div>
                </div>
                <div class="card-content">
                    <div class="category-name">${this.escapeHtml(category.category)}</div>
                    
                    <div class="category-stats">
                        <div class="stat">
                            <div class="stat-number">${category.book_count}</div>
                            <div class="stat-label">Books in category</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">${category.successRate}%</div>
                            <div class="stat-label">Success rate</div>
                        </div>
                    </div>
                    
                    <div class="trend-indicator">
                        <span class="trend-arrow">📈</span>
                        <span class="trend-text">Category trending upward</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderCollectiveIntelligence() {
        const container = document.getElementById('collectiveIntelligence');
        if (!container || !this.digestData?.collectiveIntelligence) return;

        const { metrics, velocityData, genreData, successRates } = this.digestData.collectiveIntelligence;

        container.innerHTML = `
            <div class="ci-header">
                <h2 class="ci-title">🧠 Collective Intelligence</h2>
                <p class="ci-subtitle">Community-wide performance insights</p>
            </div>
            
            <div class="hero-metrics">
                <div class="hero-metric">
                    <div class="metric-icon">💰</div>
                    <div class="metric-value">$${this.formatNumber(metrics.estimated_revenue)}</div>
                    <div class="metric-label">Est. Monthly Revenue</div>
                </div>
                <div class="hero-metric">
                    <div class="metric-icon">📝</div>
                    <div class="metric-value">${this.formatNumber(metrics.total_reviews)}</div>
                    <div class="metric-label">Total Reviews</div>
                </div>
                <div class="hero-metric">
                    <div class="metric-icon">⭐</div>
                    <div class="metric-value">${metrics.avg_rating}</div>
                    <div class="metric-label">Average Rating</div>
                </div>
                <div class="hero-metric">
                    <div class="metric-icon">🎯</div>
                    <div class="metric-value">${metrics.active_categories}</div>
                    <div class="metric-label">Active Categories</div>
                </div>
            </div>
            
            <div class="ci-charts">
                <div class="chart-container">
                    <h3>Publishing Velocity (30 Days)</h3>
                    <canvas id="velocityChart" width="400" height="200"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Genre Distribution</h3>
                    <canvas id="genreChart" width="400" height="200"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Success Rates</h3>
                    <canvas id="successChart" width="400" height="200"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Publisher Growth</h3>
                    <canvas id="publisherChart" width="400" height="200"></canvas>
                </div>
            </div>
        `;

        // Render charts after DOM is updated
        setTimeout(() => {
            this.renderVelocityChart(velocityData);
            this.renderGenreChart(genreData);
            this.renderSuccessChart(successRates);
            this.renderPublisherGrowthChart();
        }, 100);
    }

    renderCommunityInsights() {
        const container = document.getElementById('communityInsights');
        if (!container || !this.digestData?.communityInsights) return;

        const insights = this.digestData.communityInsights;

        container.innerHTML = `
            <div class="insights-header">
                <h3>💡 Community Insights</h3>
                <p>Data-driven insights from our publishing network</p>
            </div>
            
            <div class="insights-list">
                ${insights.map((insight, index) => `
                    <div class="insight-item" style="animation-delay: ${index * 0.2}s">
                        <div class="insight-icon">💡</div>
                        <div class="insight-text">${insight}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMilestonesFeed() {
        const container = document.getElementById('milestonesFeed');
        if (!container || !this.digestData?.milestonesFeed) return;

        const feed = this.digestData.milestonesFeed;

        container.innerHTML = `
            <div class="feed-header">
                <h3>🎉 Recent Achievements</h3>
                <div class="feed-refresh">
                    <button onclick="dailyDigest.refreshMilestones()" class="feed-refresh-btn">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            
            <div class="milestones-list">
                ${feed.length > 0 ? feed.map((item, index) => `
                    <div class="milestone-item" style="animation-delay: ${index * 0.1}s">
                        <div class="milestone-icon">${item.icon}</div>
                        <div class="milestone-content">
                            <div class="milestone-message">${item.message}</div>
                            <div class="milestone-time">${this.formatTimeAgo(item.timestamp)}</div>
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-feed">
                        <div class="empty-icon">🎯</div>
                        <div class="empty-message">No recent achievements</div>
                        <div class="empty-subtitle">Be the first to make a milestone!</div>
                    </div>
                `}
            </div>
        `;
    }

    renderVelocityChart(data) {
        const ctx = document.getElementById('velocityChart');
        if (!ctx || !data) return;

        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.publish_date).toLocaleDateString()),
                datasets: [{
                    label: 'Books Published',
                    data: data.map(d => d.books_published),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    renderGenreChart(data) {
        const ctx = document.getElementById('genreChart');
        if (!ctx || !data) return;

        new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.genre),
                datasets: [{
                    data: data.map(d => d.book_count),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, fontSize: 10 }
                    }
                }
            }
        });
    }

    renderSuccessChart(data) {
        const ctx = document.getElementById('successChart');
        if (!ctx || !data) return;

        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Top 100k', 'Top 50k', 'Top 10k', 'Top 5k'],
                datasets: [{
                    label: 'Success Rate %',
                    data: [data.top_100k, data.top_50k, data.top_10k, data.top_5k],
                    backgroundColor: ['#e74c3c', '#f39c12', '#2ecc71', '#3498db']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: v => v + '%' }
                    }
                }
            }
        });
    }

    renderPublisherGrowthChart() {
        const ctx = document.getElementById('publisherChart');
        if (!ctx) return;

        // Mock data for publisher growth
        const mockData = Array.from({length: 12}, (_, i) => ({
            week: `Week ${i + 1}`,
            new_publishers: Math.floor(Math.random() * 10) + 2,
            cumulative: (i + 1) * 15 + Math.floor(Math.random() * 20)
        }));

        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: mockData.map(d => d.week),
                datasets: [{
                    label: 'New Publishers',
                    data: mockData.map(d => d.new_publishers),
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    yAxisID: 'y'
                }, {
                    label: 'Total Publishers',
                    data: mockData.map(d => d.cumulative),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { type: 'linear', display: true, position: 'left' },
                    y1: { type: 'linear', display: true, position: 'right',
                          grid: { drawOnChartArea: false } }
                }
            }
        });
    }

    async refreshDigest() {
        const btn = document.querySelector('.refresh-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            btn.disabled = true;
        }

        try {
            const response = await fetch('/api/digest/daily/regenerate', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                this.digestData = data.data;
                this.renderDigest();
                this.renderCollectiveIntelligence();
                this.renderMilestonesFeed();
                this.renderCommunityInsights();
            }
        } catch (error) {
            console.error('Error refreshing digest:', error);
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                btn.disabled = false;
            }
        }
    }

    async refreshMilestones() {
        try {
            const response = await fetch('/api/digest/milestones');
            const data = await response.json();
            
            if (data.success) {
                this.digestData.milestonesFeed = data.data.feed;
                this.renderMilestonesFeed();
            }
        } catch (error) {
            console.error('Error refreshing milestones:', error);
        }
    }

    startAutoRefresh() {
        // Refresh milestones every 30 seconds
        this.updateInterval = setInterval(() => {
            this.refreshMilestones();
        }, 30000);
    }

    renderError() {
        const containers = ['dailyDigest', 'collectiveIntelligence', 'communityInsights', 'milestonesFeed'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <div class="error-message">Unable to load digest data</div>
                        <button onclick="dailyDigest.loadDigest()" class="retry-btn">Retry</button>
                    </div>
                `;
            }
        });
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
        if (hasHalfStar) stars += '<i class="fas fa-star-half-alt"></i>';
        for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';
        
        return stars;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toString() || '0';
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    }
}

// Initialize digest
let dailyDigest;
document.addEventListener('DOMContentLoaded', () => {
    dailyDigest = new DailyDigest();
});