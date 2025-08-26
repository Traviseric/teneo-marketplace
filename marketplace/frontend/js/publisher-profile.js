class PublisherProfile {
    constructor() {
        this.userId = this.getUserIdFromUrl();
        this.currentUser = null;
        this.profile = null;
        this.badges = {
            'bronze_book': { icon: '📘', name: 'Bronze Book', color: '#cd7f32' },
            'silver_stack': { icon: '📚', name: 'Silver Stack', color: '#c0c0c0' },
            'gold_trophy': { icon: '🏆', name: 'Gold Trophy', color: '#ffd700' },
            'diamond': { icon: '💎', name: 'Diamond', color: '#b9f2ff' },
            'crown': { icon: '👑', name: 'Crown', color: '#ff6b6b' },
            'rocket': { icon: '🚀', name: 'Rocket', color: '#4ecdc4' },
            'star': { icon: '🌟', name: 'Star', color: '#ffe66d' }
        };
        
        this.init();
    }

    getUserIdFromUrl() {
        const pathParts = window.location.pathname.split('/');
        const profileIndex = pathParts.indexOf('profile');
        return profileIndex !== -1 && pathParts[profileIndex + 1] ? pathParts[profileIndex + 1] : null;
    }

    async init() {
        if (!this.userId) {
            this.showError('Invalid profile URL');
            return;
        }

        try {
            await this.loadProfile();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile');
        }
    }

    async loadProfile() {
        const response = await fetch(`/api/publishers/profile/${this.userId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                this.showError('Publisher profile not found');
            } else if (response.status === 403) {
                this.showError('This profile is private');
            } else {
                this.showError('Failed to load profile');
            }
            return;
        }

        const data = await response.json();
        if (data.success) {
            this.profile = data.data;
            await this.loadStats();
            this.renderProfile();
            this.hideLoading();
        } else {
            this.showError(data.error || 'Failed to load profile');
        }
    }

    async loadStats() {
        try {
            const response = await fetch(`/api/publishers/profile/${this.userId}/stats`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.profile.stats = data.data.stats;
                    this.profile.badges = data.data.badges;
                    this.profile.milestones = data.data.milestones;
                    this.profile.next_milestone = data.data.next_milestone;
                }
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderProfile() {
        this.renderHeader();
        this.renderStats();
        this.renderNextMilestone();
        this.renderBooks();
        this.renderRankings();
        this.renderAchievements();
        this.checkIfOwner();
    }

    renderHeader() {
        const profile = this.profile.profile;
        
        // Set page title
        const displayName = profile.display_name || profile.username || 'Publisher';
        document.title = `${displayName} - Teneo Publishing Network`;
        document.getElementById('pageTitle').textContent = document.title;

        // Display name and username
        document.getElementById('displayName').textContent = displayName;
        document.getElementById('username').textContent = profile.username ? `@${profile.username}` : '';

        // Avatar
        const avatarContainer = document.getElementById('profileAvatar');
        if (profile.profile_image_url) {
            avatarContainer.innerHTML = `<img src="${profile.profile_image_url}" alt="${displayName}">`;
        } else {
            const initials = this.getInitials(displayName);
            document.getElementById('avatarInitials').textContent = initials;
        }

        // Bio
        if (profile.profile_bio) {
            document.getElementById('profileBio').textContent = profile.profile_bio;
        }

        // Badges
        this.renderBadges();

        // Social links
        this.renderSocialLinks();
    }

    renderBadges() {
        const badgesContainer = document.getElementById('badgesContainer');
        if (!this.profile.badges || this.profile.badges.length === 0) {
            badgesContainer.style.display = 'none';
            return;
        }

        const badgesHtml = this.profile.badges.map(badge => {
            const badgeConfig = this.badges[badge.id] || badge;
            return `
                <div class="badge" title="${badgeConfig.name}">
                    <span style="font-size: 1.2em;">${badgeConfig.icon}</span>
                    <span>${badgeConfig.name}</span>
                </div>
            `;
        }).join('');

        badgesContainer.innerHTML = badgesHtml;
    }

    renderSocialLinks() {
        const socialLinksContainer = document.getElementById('socialLinks');
        const socialLinks = [];

        const profile = this.profile.profile;
        
        if (profile.social_twitter) {
            socialLinks.push({
                type: 'twitter',
                url: `https://twitter.com/${profile.social_twitter.replace('@', '')}`,
                icon: 'fab fa-twitter',
                text: 'Twitter'
            });
        }

        if (profile.social_linkedin) {
            socialLinks.push({
                type: 'linkedin',
                url: profile.social_linkedin,
                icon: 'fab fa-linkedin',
                text: 'LinkedIn'
            });
        }

        if (profile.social_website) {
            socialLinks.push({
                type: 'website',
                url: profile.social_website,
                icon: 'fas fa-globe',
                text: 'Website'
            });
        }

        if (socialLinks.length === 0) {
            socialLinksContainer.style.display = 'none';
            return;
        }

        const socialHtml = socialLinks.map(link => `
            <a href="${link.url}" class="social-link ${link.type}" target="_blank" rel="noopener">
                <i class="${link.icon}"></i>
                <span>${link.text}</span>
            </a>
        `).join('');

        socialLinksContainer.innerHTML = socialHtml;
    }

    renderStats() {
        const statsContainer = document.getElementById('statsGrid');
        if (!this.profile.stats) {
            statsContainer.style.display = 'none';
            return;
        }

        const stats = this.profile.stats;
        const statsData = [
            {
                icon: 'fas fa-book',
                number: stats.verified_books || 0,
                label: 'Published Books'
            },
            {
                icon: 'fas fa-star',
                number: stats.avg_rating ? stats.avg_rating.toFixed(1) : 'N/A',
                label: 'Average Rating'
            },
            {
                icon: 'fas fa-chart-line',
                number: stats.best_bsr ? `#${stats.best_bsr.toLocaleString()}` : 'N/A',
                label: 'Best BSR'
            },
            {
                icon: 'fas fa-comments',
                number: stats.total_reviews || 0,
                label: 'Total Reviews'
            }
        ];

        const statsHtml = statsData.map(stat => `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="${stat.icon}"></i>
                </div>
                <div class="stat-number">${typeof stat.number === 'number' ? stat.number.toLocaleString() : stat.number}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');

        statsContainer.innerHTML = statsHtml;
    }

    renderNextMilestone() {
        const milestoneContainer = document.getElementById('nextMilestone');
        const contentContainer = document.getElementById('milestoneContent');
        
        if (!this.profile.next_milestone) {
            milestoneContainer.style.display = 'none';
            return;
        }

        const milestone = this.profile.next_milestone;
        
        contentContainer.innerHTML = `
            <div class="progress-text">
                ${milestone.current} / ${milestone.target} books (${milestone.remaining} remaining)
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${milestone.progress_percent}%"></div>
            </div>
            <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                Reward: ${milestone.reward}
            </div>
        `;

        milestoneContainer.style.display = 'block';
    }

    renderBooks() {
        const booksGrid = document.getElementById('booksGrid');
        
        if (!this.profile.books || this.profile.books.length === 0) {
            booksGrid.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">No published books to display</p>';
            return;
        }

        const booksHtml = this.profile.books.map(book => `
            <div class="book-card" onclick="window.open('${book.amazon_url}', '_blank')">
                <img src="${book.cover_image_url || '/images/book-placeholder.png'}" 
                     alt="${book.title}" class="book-cover"
                     onerror="this.src='/images/book-placeholder.png'">
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(book.title)}</div>
                    <div class="book-author">by ${this.escapeHtml(book.author)}</div>
                    <div class="book-metrics">
                        <div class="book-rating">
                            ${book.rating_average ? `⭐ ${book.rating_average.toFixed(1)}` : ''}
                            ${book.rating_count ? ` (${book.rating_count})` : ''}
                        </div>
                        ${book.bestseller_rank ? `<div class="book-rank">#${book.bestseller_rank.toLocaleString()}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        booksGrid.innerHTML = booksHtml;
    }

    renderRankings() {
        const rankingsContainer = document.getElementById('rankingsContainer');
        
        if (!this.profile.rankings || Object.keys(this.profile.rankings).length === 0) {
            rankingsContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">Not yet ranked</p>';
            return;
        }

        const rankingTitles = {
            'most_published': 'Most Published',
            'rising_stars': 'Rising Stars',
            'best_sellers': 'Best Sellers',
            'most_reviewed': 'Most Reviewed',
            'velocity_leaders': 'Velocity Leaders'
        };

        const rankingsHtml = Object.entries(this.profile.rankings).map(([type, ranking]) => `
            <div class="ranking-item">
                <div class="ranking-category">${rankingTitles[type] || type}</div>
                <div class="ranking-position">#${ranking.rank}</div>
            </div>
        `).join('');

        rankingsContainer.innerHTML = rankingsHtml;
    }

    renderAchievements() {
        const achievementsContainer = document.getElementById('achievementsContainer');
        
        if (!this.profile.milestones || this.profile.milestones.length === 0) {
            achievementsContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">No achievements yet</p>';
            return;
        }

        const achievementsHtml = this.profile.milestones.map(milestone => {
            const badgeConfig = this.badges[milestone.badge_id];
            const achievedDate = new Date(milestone.achieved_date).toLocaleDateString();
            
            return `
                <div class="ranking-item">
                    <div class="ranking-category">
                        <span style="margin-right: 0.5rem;">${badgeConfig?.icon || '🏆'}</span>
                        ${milestone.type} Books
                    </div>
                    <div class="ranking-position">${achievedDate}</div>
                </div>
            `;
        }).join('');

        achievementsContainer.innerHTML = achievementsHtml;
    }

    checkIfOwner() {
        const teneoToken = localStorage.getItem('teneo_token');
        if (teneoToken) {
            // In a real implementation, decode JWT or make API call to check if current user owns this profile
            // For now, show edit button if user is logged in
            document.getElementById('editProfileSection').style.display = 'block';
        }
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('profileContent').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        const errorP = document.querySelector('#error p');
        if (errorP) {
            errorP.textContent = message;
        }
    }

    triggerCelebration() {
        const celebration = document.createElement('div');
        celebration.className = 'celebration';
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.backgroundColor = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'][Math.floor(Math.random() * 5)];
            celebration.appendChild(confetti);
        }
        
        document.getElementById('celebrationContainer').appendChild(celebration);
        
        setTimeout(() => {
            celebration.remove();
        }, 3000);
    }
}

// Global functions
function showSearch() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 2rem;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 500px; width: 100%;">
            <h3 style="margin-bottom: 1rem;">Search Publishers</h3>
            <input type="text" id="searchInput" placeholder="Search by username or name..." 
                   style="width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem;">
            <div id="searchResults" style="max-height: 300px; overflow-y: auto;"></div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="padding: 0.8rem 1.5rem; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            await performSearch(e.target.value);
        }, 300);
    });
    
    searchInput.focus();
}

async function performSearch(query) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/publishers/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.data.results.length > 0) {
            const resultsHtml = data.data.results.map(publisher => `
                <div onclick="window.location.href='/published/profile/${publisher.user_id}'" 
                     style="padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${publisher.display_name ? publisher.display_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                        <div style="font-weight: bold;">${publisher.display_name || publisher.username}</div>
                        <div style="color: #666; font-size: 0.9rem;">${publisher.verified_books} published books</div>
                    </div>
                </div>
            `).join('');
            
            resultsContainer.innerHTML = resultsHtml;
        } else {
            resultsContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 1rem;">No publishers found</div>';
        }
    } catch (error) {
        resultsContainer.innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 1rem;">Search failed</div>';
    }
}

function showLeaderboards() {
    window.location.href = '/published#leaderboards';
}

function showEditProfile() {
    // Implement edit profile modal
    alert('Edit profile functionality coming soon!');
}

// Initialize profile when page loads
let publisherProfile;
document.addEventListener('DOMContentLoaded', () => {
    publisherProfile = new PublisherProfile();
});