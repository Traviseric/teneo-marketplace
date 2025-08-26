class BookPerformanceModal {
    constructor() {
        this.modal = null;
        this.currentBookId = null;
        this.charts = {};
        this.performanceData = null;
    }

    async show(bookId, bookTitle, coverImage) {
        this.currentBookId = bookId;
        
        // Create modal structure
        this.createModal(bookTitle, coverImage);
        
        // Show loading state
        this.showLoading();
        
        try {
            // Load performance data
            await this.loadPerformanceData(bookId);
            
            // Render the content
            this.renderTabs();
            this.renderPerformanceTab();
            this.renderNotesTab();
            this.renderInsightsTab();
            
            this.hideLoading();
        } catch (error) {
            console.error('Error loading performance data:', error);
            this.showError('Failed to load performance data');
        }
    }

    createModal(title, coverImage) {
        // Remove existing modal if present
        if (this.modal) {
            this.modal.remove();
        }

        this.modal = document.createElement('div');
        this.modal.className = 'book-modal';
        this.modal.innerHTML = `
            <div class="book-modal-backdrop" onclick="bookModal.close()"></div>
            <div class="book-modal-content">
                <div class="book-modal-header">
                    <div class="book-modal-book-info">
                        <img src="${coverImage || '/images/book-placeholder.png'}" 
                             alt="${title}" class="book-modal-cover" 
                             onerror="this.src='/images/book-placeholder.png'">
                        <div class="book-modal-title-section">
                            <h2 class="book-modal-title">${this.escapeHtml(title)}</h2>
                            <div class="book-modal-quick-stats" id="quickStats"></div>
                        </div>
                    </div>
                    <button class="book-modal-close" onclick="bookModal.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="book-modal-tabs">
                    <button class="tab-button active" data-tab="performance">
                        <i class="fas fa-chart-line"></i> Performance
                    </button>
                    <button class="tab-button" data-tab="notes">
                        <i class="fas fa-edit"></i> Publisher Notes
                    </button>
                    <button class="tab-button" data-tab="insights">
                        <i class="fas fa-lightbulb"></i> Insights
                    </button>
                </div>
                
                <div class="book-modal-body">
                    <div id="modalLoading" class="modal-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading performance data...</p>
                    </div>
                    
                    <div id="modalError" class="modal-error" style="display: none;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load data</p>
                    </div>
                    
                    <div class="tab-content" id="performanceTab" style="display: none;">
                        <div class="performance-metrics-grid" id="performanceMetrics"></div>
                        <div class="charts-container">
                            <div class="chart-section">
                                <h3><i class="fas fa-chart-line"></i> BSR Performance</h3>
                                <canvas id="bsrChart" width="400" height="200"></canvas>
                            </div>
                            <div class="chart-section">
                                <h3><i class="fas fa-star"></i> Review Growth</h3>
                                <canvas id="reviewChart" width="400" height="200"></canvas>
                            </div>
                            <div class="chart-section" id="priceChartSection">
                                <h3><i class="fas fa-dollar-sign"></i> Price History</h3>
                                <canvas id="priceChart" width="400" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="notesTab" style="display: none;">
                        <div class="notes-sections">
                            <div class="notes-section">
                                <h3><i class="fas fa-book"></i> My Publishing Story</h3>
                                <textarea id="publishingNotes" placeholder="Share how you published this book..."></textarea>
                            </div>
                            <div class="notes-section">
                                <h3><i class="fas fa-tips"></i> Publishing Tips</h3>
                                <textarea id="publishingTips" placeholder="Tips for other publishers..."></textarea>
                            </div>
                            <div class="notes-section">
                                <h3><i class="fas fa-bullhorn"></i> Marketing Tactics</h3>
                                <textarea id="marketingTactics" placeholder="Marketing strategies that worked..."></textarea>
                            </div>
                            <div class="notes-section">
                                <h3><i class="fas fa-robot"></i> Teneo Modifications</h3>
                                <textarea id="teneoModifications" placeholder="How you modified the original Teneo output..."></textarea>
                            </div>
                            <div class="notes-actions">
                                <button id="saveNotesBtn" class="save-notes-btn">
                                    <i class="fas fa-save"></i> Save Notes
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="insightsTab" style="display: none;">
                        <div class="insights-header">
                            <button id="generateInsightsBtn" class="generate-insights-btn">
                                <i class="fas fa-magic"></i> Generate New Insights
                            </button>
                        </div>
                        <div id="insightsContainer" class="insights-container"></div>
                    </div>
                </div>
            </div>
        `;

        // Add styles if not already present
        this.addModalStyles();
        
        document.body.appendChild(this.modal);
        document.body.style.overflow = 'hidden';
        
        // Setup tab switching
        this.setupTabSwitching();
    }

    async loadPerformanceData(bookId) {
        const response = await fetch(`/api/books/${bookId}/performance?timeframe=30`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load performance data');
        }
        
        this.performanceData = data.data;
    }

    renderTabs() {
        // Update quick stats
        const book = this.performanceData.book;
        const quickStats = document.getElementById('quickStats');
        
        quickStats.innerHTML = `
            <div class="quick-stat">
                <span class="stat-label">BSR:</span>
                <span class="stat-value">${book.bestseller_rank ? `#${book.bestseller_rank.toLocaleString()}` : 'N/A'}</span>
            </div>
            <div class="quick-stat">
                <span class="stat-label">Rating:</span>
                <span class="stat-value">${book.rating_average ? `${book.rating_average.toFixed(1)} ⭐` : 'N/A'}</span>
            </div>
            <div class="quick-stat">
                <span class="stat-label">Reviews:</span>
                <span class="stat-value">${book.rating_count || 0}</span>
            </div>
        `;
    }

    renderPerformanceTab() {
        const metrics = this.performanceData.performance.metrics;
        const metricsContainer = document.getElementById('performanceMetrics');
        
        metricsContainer.innerHTML = `
            <div class="metric-card">
                <div class="metric-icon"><i class="fas fa-trophy"></i></div>
                <div class="metric-info">
                    <div class="metric-label">Best Rank</div>
                    <div class="metric-value">${metrics.best_rank ? `#${metrics.best_rank.toLocaleString()}` : 'N/A'}</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon ${this.getTrendIcon(metrics.trend_direction)}"></div>
                <div class="metric-info">
                    <div class="metric-label">7-Day Trend</div>
                    <div class="metric-value ${metrics.trend_direction}">${this.formatTrend(metrics.rank_improvement_7d)}</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon"><i class="fas fa-comments"></i></div>
                <div class="metric-info">
                    <div class="metric-label">Review Velocity</div>
                    <div class="metric-value">${metrics.review_velocity ? `${metrics.review_velocity.toFixed(2)}/day` : 'N/A'}</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="metric-info">
                    <div class="metric-label">Est. Monthly Revenue</div>
                    <div class="metric-value">${metrics.estimated_monthly_revenue ? `$${metrics.estimated_monthly_revenue.toFixed(0)}` : 'N/A'}</div>
                </div>
            </div>
        `;

        // Render charts
        this.renderBSRChart();
        this.renderReviewChart();
        this.renderPriceChart();
    }

    renderBSRChart() {
        const ctx = document.getElementById('bsrChart').getContext('2d');
        const data = this.performanceData.performance.bsr_history;
        
        if (this.charts.bsr) {
            this.charts.bsr.destroy();
        }

        this.charts.bsr = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.recorded_at).toLocaleDateString()),
                datasets: [{
                    label: 'Best Seller Rank',
                    data: data.map(d => d.bestseller_rank),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        reverse: true, // Lower rank is better
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '#' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Rank: #${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderReviewChart() {
        const ctx = document.getElementById('reviewChart').getContext('2d');
        const data = this.performanceData.performance.bsr_history;
        
        if (this.charts.review) {
            this.charts.review.destroy();
        }

        this.charts.review = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.recorded_at).toLocaleDateString()),
                datasets: [{
                    label: 'Review Count',
                    data: data.map(d => d.review_count || 0),
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Average Rating',
                    data: data.map(d => d.rating_average || 0),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Review Count'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 5,
                        title: {
                            display: true,
                            text: 'Average Rating'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    renderPriceChart() {
        const priceHistory = this.performanceData.performance.price_history;
        
        if (priceHistory.length === 0) {
            document.getElementById('priceChartSection').style.display = 'none';
            return;
        }

        const ctx = document.getElementById('priceChart').getContext('2d');
        
        if (this.charts.price) {
            this.charts.price.destroy();
        }

        // Group by format
        const formatData = {};
        priceHistory.forEach(entry => {
            if (!formatData[entry.format]) {
                formatData[entry.format] = [];
            }
            formatData[entry.format].push(entry);
        });

        const datasets = Object.entries(formatData).map(([format, data], index) => {
            const colors = ['#3498db', '#2ecc71', '#e74c3c'];
            return {
                label: format.charAt(0).toUpperCase() + format.slice(1),
                data: data.map(d => ({ x: d.recorded_at, y: d.price })),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                tension: 0.4
            };
        });

        this.charts.price = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    async renderNotesTab() {
        const userId = localStorage.getItem('teneo_user_id');
        const teneoToken = localStorage.getItem('teneo_token');
        
        if (!userId || !teneoToken) {
            document.getElementById('notesTab').innerHTML = `
                <div class="notes-login-prompt">
                    <i class="fas fa-lock fa-3x"></i>
                    <h3>Login Required</h3>
                    <p>Please log in to view and edit publisher notes.</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(`/api/books/${this.currentBookId}/notes/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${teneoToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const notes = data.data;
                document.getElementById('publishingNotes').value = notes.notes_markdown || '';
                document.getElementById('publishingTips').value = notes.publishing_tips || '';
                document.getElementById('marketingTactics').value = notes.marketing_tactics || '';
                document.getElementById('teneoModifications').value = notes.teneo_modifications || '';
                
                // Setup save button
                document.getElementById('saveNotesBtn').onclick = () => this.saveNotes();
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    renderInsightsTab() {
        const insights = this.performanceData.insights;
        const container = document.getElementById('insightsContainer');
        
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="no-insights">
                    <i class="fas fa-lightbulb fa-3x"></i>
                    <h3>No Insights Yet</h3>
                    <p>Click "Generate New Insights" to analyze your book's performance patterns.</p>
                </div>
            `;
        } else {
            container.innerHTML = insights.map(insight => this.createInsightCard(insight)).join('');
        }
        
        // Setup generate insights button
        document.getElementById('generateInsightsBtn').onclick = () => this.generateInsights();
    }

    createInsightCard(insight) {
        const iconMap = {
            'pattern': 'fas fa-chart-line',
            'comparison': 'fas fa-balance-scale',
            'optimization': 'fas fa-rocket',
            'trend': 'fas fa-trending-up'
        };
        
        return `
            <div class="insight-card">
                <div class="insight-header">
                    <i class="${iconMap[insight.insight_type] || 'fas fa-lightbulb'}"></i>
                    <h4>${insight.insight_title}</h4>
                    <span class="confidence-score">${(insight.confidence_score * 100).toFixed(0)}% confidence</span>
                </div>
                <p>${insight.insight_description}</p>
            </div>
        `;
    }

    setupTabSwitching() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update button states
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update content visibility
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        document.getElementById(`${tabName}Tab`).style.display = 'block';
    }

    async saveNotes() {
        const userId = localStorage.getItem('teneo_user_id');
        const teneoToken = localStorage.getItem('teneo_token');
        
        const notesData = {
            notes_markdown: document.getElementById('publishingNotes').value,
            publishing_tips: document.getElementById('publishingTips').value,
            marketing_tactics: document.getElementById('marketingTactics').value,
            teneo_modifications: document.getElementById('teneoModifications').value
        };

        try {
            const response = await fetch(`/api/books/${this.currentBookId}/notes/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${teneoToken}`
                },
                body: JSON.stringify(notesData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Notes saved successfully!', 'success');
            } else {
                this.showToast('Failed to save notes: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error saving notes:', error);
            this.showToast('Failed to save notes', 'error');
        }
    }

    async generateInsights() {
        const button = document.getElementById('generateInsightsBtn');
        const originalText = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        button.disabled = true;

        try {
            const response = await fetch(`/api/books/${this.currentBookId}/generate-insights`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Reload performance data to get new insights
                await this.loadPerformanceData(this.currentBookId);
                this.renderInsightsTab();
                this.showToast('New insights generated!', 'success');
            } else {
                this.showToast('Failed to generate insights: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error generating insights:', error);
            this.showToast('Failed to generate insights', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    getTrendIcon(direction) {
        switch (direction) {
            case 'up': return 'fas fa-arrow-up trend-up';
            case 'down': return 'fas fa-arrow-down trend-down';
            default: return 'fas fa-minus trend-stable';
        }
    }

    formatTrend(improvement) {
        if (!improvement) return 'N/A';
        const abs = Math.abs(improvement);
        const direction = improvement > 0 ? '+' : '';
        return `${direction}${abs.toLocaleString()}`;
    }

    showLoading() {
        document.getElementById('modalLoading').style.display = 'block';
        document.getElementById('modalError').style.display = 'none';
        document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    }

    hideLoading() {
        document.getElementById('modalLoading').style.display = 'none';
        document.getElementById('performanceTab').style.display = 'block';
    }

    showError(message) {
        document.getElementById('modalLoading').style.display = 'none';
        document.getElementById('modalError').style.display = 'block';
        document.getElementById('modalError').querySelector('p').textContent = message;
    }

    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            padding: 1rem 1.5rem; border-radius: 8px; color: white;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    close() {
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
        
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        
        document.body.style.overflow = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addModalStyles() {
        if (document.getElementById('book-modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'book-modal-styles';
        styles.textContent = `
            .book-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                animation: fadeIn 0.3s ease;
            }

            .book-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
            }

            .book-modal-content {
                background: white;
                border-radius: 20px;
                width: 100%;
                max-width: 900px;
                max-height: 90vh;
                overflow: hidden;
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                animation: scaleIn 0.3s ease;
            }

            .book-modal-header {
                padding: 2rem;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }

            .book-modal-book-info {
                display: flex;
                gap: 1.5rem;
                flex: 1;
            }

            .book-modal-cover {
                width: 80px;
                height: 120px;
                object-fit: cover;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }

            .book-modal-title {
                font-size: 1.5rem;
                color: #2c3e50;
                margin-bottom: 1rem;
            }

            .quick-stats {
                display: flex;
                gap: 1.5rem;
            }

            .quick-stat {
                display: flex;
                flex-direction: column;
            }

            .stat-label {
                font-size: 0.8rem;
                color: #7f8c8d;
                margin-bottom: 0.25rem;
            }

            .stat-value {
                font-weight: bold;
                color: #2c3e50;
            }

            .book-modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #7f8c8d;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 50%;
                transition: background 0.3s ease;
            }

            .book-modal-close:hover {
                background: #f8f9fa;
            }

            .book-modal-tabs {
                display: flex;
                border-bottom: 1px solid #eee;
            }

            .tab-button {
                flex: 1;
                padding: 1rem 1.5rem;
                border: none;
                background: none;
                cursor: pointer;
                font-weight: 500;
                color: #7f8c8d;
                transition: all 0.3s ease;
            }

            .tab-button.active {
                color: #3498db;
                border-bottom: 2px solid #3498db;
            }

            .tab-button:hover {
                background: #f8f9fa;
            }

            .book-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 2rem;
            }

            .performance-metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }

            .metric-card {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .metric-icon {
                font-size: 1.5rem;
                color: #3498db;
            }

            .metric-icon.trend-up { color: #27ae60; }
            .metric-icon.trend-down { color: #e74c3c; }
            .metric-icon.trend-stable { color: #7f8c8d; }

            .metric-label {
                font-size: 0.9rem;
                color: #7f8c8d;
                margin-bottom: 0.25rem;
            }

            .metric-value {
                font-weight: bold;
                font-size: 1.2rem;
                color: #2c3e50;
            }

            .metric-value.up { color: #27ae60; }
            .metric-value.down { color: #e74c3c; }

            .charts-container {
                display: grid;
                gap: 2rem;
            }

            .chart-section {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 1.5rem;
            }

            .chart-section h3 {
                margin-bottom: 1rem;
                color: #2c3e50;
                font-size: 1.1rem;
            }

            .chart-section canvas {
                height: 200px !important;
            }

            .notes-sections {
                display: grid;
                gap: 1.5rem;
            }

            .notes-section h3 {
                color: #2c3e50;
                margin-bottom: 0.5rem;
                font-size: 1.1rem;
            }

            .notes-section textarea {
                width: 100%;
                min-height: 120px;
                padding: 1rem;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-family: inherit;
                resize: vertical;
            }

            .notes-actions {
                display: flex;
                justify-content: flex-end;
            }

            .save-notes-btn {
                background: #27ae60;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                transition: background 0.3s ease;
            }

            .save-notes-btn:hover {
                background: #219a52;
            }

            .insights-header {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 1.5rem;
            }

            .generate-insights-btn {
                background: #3498db;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                transition: background 0.3s ease;
            }

            .generate-insights-btn:hover {
                background: #2980b9;
            }

            .insight-card {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                border-left: 4px solid #3498db;
            }

            .insight-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }

            .insight-header i {
                color: #3498db;
            }

            .insight-header h4 {
                flex: 1;
                margin: 0;
                color: #2c3e50;
            }

            .confidence-score {
                font-size: 0.8rem;
                background: #3498db;
                color: white;
                padding: 0.2rem 0.5rem;
                border-radius: 10px;
            }

            .no-insights, .notes-login-prompt {
                text-align: center;
                padding: 3rem;
                color: #7f8c8d;
            }

            .no-insights i, .notes-login-prompt i {
                margin-bottom: 1rem;
                opacity: 0.5;
            }

            .modal-loading, .modal-error {
                text-align: center;
                padding: 3rem;
                color: #7f8c8d;
            }

            .modal-error {
                color: #e74c3c;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }

            @keyframes slideOut {
                from { transform: translateX(0); }
                to { transform: translateX(100%); }
            }

            @media (max-width: 768px) {
                .book-modal {
                    padding: 1rem;
                }
                
                .book-modal-content {
                    max-height: 95vh;
                }
                
                .book-modal-header {
                    padding: 1.5rem;
                }
                
                .book-modal-book-info {
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .performance-metrics-grid {
                    grid-template-columns: 1fr;
                }
                
                .quick-stats {
                    flex-direction: column;
                    gap: 0.5rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Global instance
const bookModal = new BookPerformanceModal();