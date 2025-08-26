// Marketplace Preview and Publisher Story System
class MarketplacePreview {
    constructor() {
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        this.loadMarketplaceStats();
        this.initProgressAnimation();
        this.loadWaitlistCount();
    }

    // Load marketplace statistics
    async loadMarketplaceStats() {
        try {
            const response = await fetch(`${this.baseUrl}/api/publisher-stories/marketplace/stats`);
            if (!response.ok) {
                // Use fallback data
                this.updateStatsWithFallback();
                return;
            }
            
            const result = await response.json();
            if (result.success) {
                this.updateStats(result.data);
            } else {
                this.updateStatsWithFallback();
            }
        } catch (error) {
            console.error('Error loading marketplace stats:', error);
            this.updateStatsWithFallback();
        }
    }

    updateStats(data) {
        const { stats, comparison } = data;
        
        // Update progress thermometer
        const progressPercentage = Math.min((stats.total_books / 10000) * 100, 100);
        document.getElementById('marketplaceProgress').style.height = `${progressPercentage}%`;
        
        // Update current books count
        document.getElementById('currentBooks').textContent = this.formatNumber(stats.total_books);
        
        // Calculate estimated launch date
        const estimatedDate = this.calculateEstimatedLaunch(stats.total_books, stats.milestone.target_value);
        document.getElementById('estimatedDate').textContent = estimatedDate;
        
        // Update waitlist count
        document.getElementById('waitlistCount').textContent = this.formatNumber(stats.waitlist_count);
    }

    updateStatsWithFallback() {
        // Use mock data for demonstration
        const mockStats = {
            total_books: 142,
            waitlist_count: 1247,
            milestone: { target_value: 10000 }
        };
        
        this.updateStats({ stats: mockStats, comparison: {} });
    }

    // Initialize progress animation
    initProgressAnimation() {
        // Animate thermometer fill on load
        setTimeout(() => {
            const progressElement = document.getElementById('marketplaceProgress');
            if (progressElement) {
                const currentHeight = progressElement.style.height;
                progressElement.style.height = '0%';
                setTimeout(() => {
                    progressElement.style.height = currentHeight;
                }, 100);
            }
        }, 500);
    }

    // Load waitlist count with periodic updates
    async loadWaitlistCount() {
        try {
            // Simulate growing waitlist with small increments
            setInterval(() => {
                const countElement = document.getElementById('waitlistCount');
                if (countElement) {
                    const currentCount = parseInt(countElement.textContent.replace(/,/g, ''));
                    const newCount = currentCount + Math.floor(Math.random() * 3); // Add 0-2 people
                    countElement.textContent = this.formatNumber(newCount);
                }
            }, 30000); // Update every 30 seconds
        } catch (error) {
            console.error('Error updating waitlist count:', error);
        }
    }

    // Calculate estimated launch date based on current velocity
    calculateEstimatedLaunch(currentBooks, targetBooks) {
        const remaining = targetBooks - currentBooks;
        const dailyRate = 3; // Assume 3 books per day average
        const daysRemaining = Math.ceil(remaining / dailyRate);
        
        const launchDate = new Date();
        launchDate.setDate(launchDate.getDate() + daysRemaining);
        
        const month = launchDate.toLocaleDateString('en-US', { month: 'long' });
        const year = launchDate.getFullYear();
        
        return `${month} ${year}`;
    }

    // Format numbers with commas
    formatNumber(num) {
        return num.toLocaleString();
    }

    // Handle marketplace store claim
    async claimMarketplaceStore() {
        try {
            // Show claim form modal
            this.showClaimStoreModal();
        } catch (error) {
            console.error('Error claiming store:', error);
            alert('Error claiming store. Please try again.');
        }
    }

    // Handle waitlist join
    async joinMarketplaceWaitlist() {
        try {
            // Show waitlist form modal
            this.showWaitlistModal();
        } catch (error) {
            console.error('Error joining waitlist:', error);
            alert('Error joining waitlist. Please try again.');
        }
    }

    // Show claim store modal
    showClaimStoreModal() {
        const modal = this.createModal({
            title: '🏆 Claim Your Marketplace Store',
            content: `
                <div class="claim-store-form">
                    <p><strong>Founding Publisher Requirements:</strong></p>
                    <ul>
                        <li>✅ 10+ published books on Amazon</li>
                        <li>✅ Active Teneo community member</li>
                        <li>✅ Commitment to marketplace success</li>
                    </ul>
                    
                    <form id="claimStoreForm">
                        <div class="form-group">
                            <label>Publisher Name *</label>
                            <input type="text" name="publisher_name" required>
                        </div>
                        <div class="form-group">
                            <label>Email Address *</label>
                            <input type="email" name="publisher_email" required>
                        </div>
                        <div class="form-group">
                            <label>Number of Published Books *</label>
                            <input type="number" name="books_published" min="10" required>
                        </div>
                        <div class="form-group">
                            <label>Amazon Author Profile URL</label>
                            <input type="url" name="author_profile">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" required>
                                I commit to helping build the Teneo Marketplace community
                            </label>
                        </div>
                        <button type="submit" class="cta-btn primary">Claim Founding Publisher Status</button>
                    </form>
                </div>
            `,
            onSubmit: (formData) => this.processStoreClaim(formData)
        });
    }

    // Show waitlist modal
    showWaitlistModal() {
        const modal = this.createModal({
            title: '📋 Join the Marketplace Waitlist',
            content: `
                <div class="waitlist-form">
                    <p>Be among the first to know when the Teneo Marketplace launches!</p>
                    
                    <form id="waitlistForm">
                        <div class="form-group">
                            <label>Publisher Name *</label>
                            <input type="text" name="publisher_name" required>
                        </div>
                        <div class="form-group">
                            <label>Email Address *</label>
                            <input type="email" name="publisher_email" required>
                        </div>
                        <div class="form-group">
                            <label>Current Books Published</label>
                            <input type="number" name="books_published" min="0" value="0">
                        </div>
                        <div class="form-group">
                            <label>Referral Code (Optional)</label>
                            <input type="text" name="referral_code" placeholder="Enter referral code">
                        </div>
                        <button type="submit" class="cta-btn secondary">Join Waitlist</button>
                    </form>
                </div>
            `,
            onSubmit: (formData) => this.processWaitlistJoin(formData)
        });
    }

    // Create modal dialog
    createModal({ title, content, onSubmit }) {
        const modalHtml = `
            <div class="modal-backdrop" id="marketplaceModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('marketplaceModal');
        const closeBtn = modal.querySelector('.modal-close');
        const form = modal.querySelector('form');
        
        // Close modal handlers
        closeBtn.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        
        // Form submission
        if (form && onSubmit) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                onSubmit(data);
            });
        }
        
        return modal;
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('marketplaceModal');
        if (modal) {
            modal.remove();
        }
    }

    // Process store claim
    async processStoreClaim(formData) {
        try {
            formData.status = 'claimed';
            
            const response = await fetch(`${this.baseUrl}/api/publisher-stories/marketplace/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                this.closeModal();
                this.showSuccessMessage('🎉 Congratulations! Your Founding Publisher status has been claimed. You\'ll receive your unique referral code via email.');
                this.loadMarketplaceStats(); // Refresh stats
            } else {
                throw new Error('Failed to claim store');
            }
        } catch (error) {
            console.error('Error claiming store:', error);
            alert('Error claiming store. Please try again.');
        }
    }

    // Process waitlist join
    async processWaitlistJoin(formData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/publisher-stories/marketplace/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.closeModal();
                this.showSuccessMessage(`✅ Welcome to the waitlist! Your referral code: <strong>${result.data.referralCode}</strong><br>Share it with other publishers to earn rewards!`);
                this.loadMarketplaceStats(); // Refresh stats
            } else {
                throw new Error('Failed to join waitlist');
            }
        } catch (error) {
            console.error('Error joining waitlist:', error);
            alert('Error joining waitlist. Please try again.');
        }
    }

    // Show success message
    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-content">
                <div class="success-icon">✅</div>
                <div class="success-text">${message}</div>
                <button class="success-close" onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 10000);
    }
}

// Global functions for onclick handlers
function claimMarketplaceStore() {
    if (window.marketplacePreview) {
        window.marketplacePreview.claimMarketplaceStore();
    }
}

function joinMarketplaceWaitlist() {
    if (window.marketplacePreview) {
        window.marketplacePreview.joinMarketplaceWaitlist();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.marketplacePreview = new MarketplacePreview();
});

// Add modal styles
const modalStyles = `
<style>
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.modal-content {
    background-color: white;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    background-color: #1e3f54;
    color: white;
    border-radius: 8px 8px 0 0;
}

.modal-header h3 {
    margin: 0;
    color: white;
}

.modal-close {
    background: none;
    border: none;
    color: white;
    font-size: 1.5em;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-body {
    padding: 20px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    color: #01151b;
    font-weight: 500;
}

.form-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #b9cbd5;
    border-radius: 4px;
    font-size: 14px;
}

.form-group input[type="checkbox"] {
    width: auto;
    margin-right: 8px;
}

.claim-store-form ul {
    background-color: #e8f0f5;
    padding: 15px 20px;
    border-radius: 6px;
    margin-bottom: 20px;
}

.success-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: white;
    border: 2px solid #4CAF50;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    max-width: 400px;
}

.success-content {
    padding: 20px;
    text-align: center;
}

.success-icon {
    font-size: 2em;
    margin-bottom: 10px;
}

.success-text {
    color: #01151b;
    margin-bottom: 15px;
    line-height: 1.4;
}

.success-close {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', modalStyles);