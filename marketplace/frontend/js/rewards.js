class RewardsManager {
    constructor() {
        this.userId = this.getCurrentUserId();
        this.teneoToken = localStorage.getItem('teneo_token');
        this.rewards = [];
        this.summary = {};
        
        this.init();
    }

    getCurrentUserId() {
        // In a real implementation, this would decode the JWT token
        // For now, we'll use a placeholder or get from API
        return localStorage.getItem('teneo_user_id') || 'current_user';
    }

    async init() {
        if (!this.teneoToken) {
            this.showError('Please log in to view your rewards');
            return;
        }

        try {
            await this.loadRewards();
            await this.loadProfile();
            this.renderRewards();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading rewards:', error);
            this.showError('Failed to load rewards');
        }
    }

    async loadRewards() {
        const response = await fetch(`/api/publishers/rewards/${this.userId}`, {
            headers: {
                'Authorization': `Bearer ${this.teneoToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
            this.rewards = data.data.rewards;
            this.summary = data.data.summary;
        } else {
            throw new Error(data.error || 'Failed to load rewards');
        }
    }

    async loadProfile() {
        try {
            const response = await fetch(`/api/publishers/profile/${this.userId}/stats`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.nextMilestone = data.data.next_milestone;
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    renderRewards() {
        this.renderSummary();
        this.renderAvailableRewards();
        this.renderRewardHistory();
    }

    renderSummary() {
        const summaryContainer = document.getElementById('summaryStats');
        
        const summaryHtml = `
            <div class="reward-stat">
                <span class="stat-label">Total Rewards Earned</span>
                <span class="stat-value">${this.summary.total_rewards || 0}</span>
            </div>
            <div class="reward-stat">
                <span class="stat-label">Available Rewards</span>
                <span class="stat-value highlight">${this.summary.available_rewards || 0}</span>
            </div>
            <div class="reward-stat">
                <span class="stat-label">Free Generations</span>
                <span class="stat-value highlight">${this.summary.free_generations_available || 0}</span>
            </div>
        `;
        
        summaryContainer.innerHTML = summaryHtml;

        // Render next milestone if available
        if (this.nextMilestone) {
            this.renderNextMilestone();
        }
    }

    renderNextMilestone() {
        const milestoneContainer = document.getElementById('nextMilestone');
        const contentContainer = document.getElementById('milestoneContent');
        
        if (!this.nextMilestone) {
            milestoneContainer.style.display = 'none';
            return;
        }

        const milestone = this.nextMilestone;
        
        contentContainer.innerHTML = `
            <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">
                ${milestone.remaining} more books to earn ${milestone.reward}
            </div>
            <div class="milestone-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${milestone.progress_percent}%"></div>
                </div>
            </div>
            <div style="font-size: 0.9rem; opacity: 0.9;">
                ${milestone.current} / ${milestone.target} books published
            </div>
        `;

        milestoneContainer.style.display = 'block';
    }

    renderAvailableRewards() {
        const container = document.getElementById('availableRewardsList');
        
        const availableRewards = this.rewards.filter(reward => reward.status === 'available');
        
        if (availableRewards.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <h3>No rewards available</h3>
                    <p>Keep publishing books to earn more rewards!</p>
                </div>
            `;
            return;
        }

        const rewardsHtml = availableRewards.map(reward => this.createRewardCard(reward, true)).join('');
        container.innerHTML = rewardsHtml;
    }

    renderRewardHistory() {
        const container = document.getElementById('rewardHistoryList');
        
        const claimedRewards = this.rewards.filter(reward => reward.status === 'claimed');
        
        if (claimedRewards.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No rewards claimed yet</p>
                </div>
            `;
            return;
        }

        const historyHtml = claimedRewards.map(reward => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">
                        ${this.getRewardIcon(reward.reward_type)} ${this.getRewardTitle(reward)}
                    </div>
                    <div class="history-description">${reward.earned_for}</div>
                </div>
                <div class="history-date">
                    Claimed ${this.formatDate(reward.claimed_date)}
                </div>
            </div>
        `).join('');

        container.innerHTML = historyHtml;
    }

    createRewardCard(reward, canClaim = false) {
        const isAvailable = reward.status === 'available';
        const cardClass = isAvailable ? 'available' : 'claimed';
        
        return `
            <div class="reward-card ${cardClass}">
                <div class="reward-header">
                    <div>
                        <span class="reward-icon">${this.getRewardIcon(reward.reward_type)}</span>
                        <span class="reward-title">${this.getRewardTitle(reward)}</span>
                    </div>
                    <span class="reward-value ${isAvailable ? 'available' : ''}">${reward.reward_value}x</span>
                </div>
                
                <div class="reward-description">${reward.earned_for}</div>
                
                <div class="reward-date">
                    ${isAvailable ? 'Earned' : 'Claimed'} ${this.formatDate(isAvailable ? reward.earned_date : reward.claimed_date)}
                </div>
                
                ${isAvailable && canClaim ? `
                    <button class="claim-btn" onclick="claimReward(${reward.id})">
                        <i class="fas fa-gift"></i> Claim Reward
                    </button>
                ` : ''}
            </div>
        `;
    }

    getRewardIcon(rewardType) {
        const icons = {
            'free_generation': '🎁',
            'badge': '🏆',
            'milestone_bonus': '⭐'
        };
        return icons[rewardType] || '🎁';
    }

    getRewardTitle(reward) {
        const titles = {
            'free_generation': 'Free Book Generation',
            'badge': 'Achievement Badge',
            'milestone_bonus': 'Milestone Bonus'
        };
        return titles[reward.reward_type] || 'Reward';
    }

    async claimReward(rewardId) {
        const button = event.target;
        const originalText = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';
        button.disabled = true;

        try {
            const response = await fetch(`/api/publishers/rewards/${this.userId}/claim/${rewardId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.teneoToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.showCelebration(`🎉 Claimed ${data.data.reward_value} free generation${data.data.reward_value > 1 ? 's' : ''}!`);
                
                // Reload rewards data
                await this.loadRewards();
                this.renderRewards();
            } else {
                alert('Failed to claim reward: ' + data.error);
                button.innerHTML = originalText;
                button.disabled = false;
            }
        } catch (error) {
            console.error('Error claiming reward:', error);
            alert('Failed to claim reward');
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    showCelebration(message) {
        // Create celebration modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
            align-items: center; justify-content: center; animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 3rem; border-radius: 20px; text-align: center; max-width: 400px; animation: bounceIn 0.5s ease;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                <h2 style="color: #27ae60; margin-bottom: 1rem;">Reward Claimed!</h2>
                <p style="font-size: 1.2rem; margin-bottom: 2rem;">${message}</p>
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="background: #27ae60; color: white; border: none; padding: 1rem 2rem; border-radius: 25px; font-weight: bold; cursor: pointer;">
                    Awesome!
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add CSS animations
        if (!document.getElementById('celebration-styles')) {
            const style = document.createElement('style');
            style.id = 'celebration-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.1); opacity: 1; }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 5000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('rewardsContent').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        const errorP = document.querySelector('#error p');
        if (errorP) {
            errorP.textContent = message;
        }
    }
}

// Global functions
function goToProfile() {
    const userId = localStorage.getItem('teneo_user_id') || 'current_user';
    window.location.href = `/published/profile/${userId}`;
}

async function claimReward(rewardId) {
    if (window.rewardsManager) {
        await window.rewardsManager.claimReward(rewardId);
    }
}

// Initialize rewards manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rewardsManager = new RewardsManager();
});