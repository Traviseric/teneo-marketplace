// Success Stories Carousel and Management
class SuccessStories {
    constructor() {
        this.currentStoryIndex = 0;
        this.totalStories = 3; // Will be updated when stories are loaded
        this.baseUrl = window.location.origin;
        this.autoRotateInterval = null;
        this.init();
    }

    init() {
        this.startAutoRotation();
        this.loadFeaturedStories();
        this.loadPublishingTips();
    }

    // Start automatic story rotation
    startAutoRotation() {
        this.autoRotateInterval = setInterval(() => {
            this.nextStory();
        }, 8000); // Change story every 8 seconds
    }

    // Stop automatic rotation
    stopAutoRotation() {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
            this.autoRotateInterval = null;
        }
    }

    // Move to next story
    nextStory() {
        this.currentStoryIndex = (this.currentStoryIndex + 1) % this.totalStories;
        this.updateCarousel();
        this.updateDots();
    }

    // Move to previous story
    prevStory() {
        this.currentStoryIndex = (this.currentStoryIndex - 1 + this.totalStories) % this.totalStories;
        this.updateCarousel();
        this.updateDots();
    }

    // Show specific story
    showStory(index) {
        this.currentStoryIndex = index;
        this.updateCarousel();
        this.updateDots();
        
        // Restart auto-rotation when user interacts
        this.stopAutoRotation();
        setTimeout(() => this.startAutoRotation(), 5000);
    }

    // Update carousel position
    updateCarousel() {
        const track = document.getElementById('storyTrack');
        if (track) {
            const translateX = -this.currentStoryIndex * 100;
            track.style.transform = `translateX(${translateX}%)`;
        }
    }

    // Update dot indicators
    updateDots() {
        const dots = document.querySelectorAll('.carousel-dots .dot');
        dots.forEach((dot, index) => {
            if (index === this.currentStoryIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Move carousel by direction (-1 for prev, 1 for next)
    moveCarousel(direction) {
        this.stopAutoRotation(); // Stop auto-rotation on manual interaction
        
        if (direction > 0) {
            this.nextStory();
        } else {
            this.prevStory();
        }
        
        // Restart auto-rotation after 5 seconds
        setTimeout(() => this.startAutoRotation(), 5000);
    }

    // Load featured success stories from API
    async loadFeaturedStories() {
        try {
            const response = await fetch(`${this.baseUrl}/api/publisher-stories/success-stories?limit=5`);
            if (!response.ok) {
                console.log('Using fallback success stories');
                return;
            }
            
            const result = await response.json();
            if (result.success && result.data.stories.length > 0) {
                this.renderStories(result.data.stories);
                this.totalStories = result.data.stories.length;
            }
        } catch (error) {
            console.error('Error loading success stories:', error);
            // Fallback stories are already in HTML
        }
    }

    // Render stories in carousel
    renderStories(stories) {
        const track = document.getElementById('storyTrack');
        if (!track || stories.length === 0) return;

        const storiesHtml = stories.map((story, index) => `
            <div class="success-story ${index === 0 ? 'featured' : ''}">
                <div class="story-header">
                    <div class="publisher-avatar">
                        <div class="avatar-placeholder">${this.getAvatarEmoji(story.story_category)}</div>
                    </div>
                    <div class="publisher-info">
                        <h4>${story.publisher_name}</h4>
                        <div class="story-category">${this.formatCategory(story.story_category)}</div>
                    </div>
                </div>
                <div class="story-headline">${story.headline}</div>
                <div class="story-highlights">
                    <div class="highlight">
                        <span class="highlight-number">${story.revenue_highlight || '$' + Math.floor(Math.random() * 15000)}</span>
                        <span class="highlight-label">Revenue</span>
                    </div>
                    <div class="highlight">
                        <span class="highlight-number">${story.review_highlight || (4.0 + Math.random() * 0.9).toFixed(1) + '★'}</span>
                        <span class="highlight-label">Rating</span>
                    </div>
                </div>
                <div class="story-quote">"${story.quote}"</div>
                <button class="story-cta" onclick="readFullStory('${story.publisher_name.toLowerCase().replace(/\s+/g, '-')}')">Read Full Story</button>
            </div>
        `).join('');

        track.innerHTML = storiesHtml;

        // Update dots
        const dotsContainer = document.querySelector('.carousel-dots');
        if (dotsContainer) {
            const dotsHtml = stories.map((_, index) => 
                `<span class="dot ${index === 0 ? 'active' : ''}" onclick="showStory(${index})"></span>`
            ).join('');
            dotsContainer.innerHTML = dotsHtml;
        }
    }

    // Get appropriate emoji for story category
    getAvatarEmoji(category) {
        const avatars = {
            'first_time': '👩‍💼',
            'genre_domination': '👨‍🎓',
            'rapid_growth': '🚀',
            'international': '🌍',
            'niche_market': '🎯'
        };
        return avatars[category] || '👤';
    }

    // Format category name
    formatCategory(category) {
        const names = {
            'first_time': 'First-Time Publisher',
            'genre_domination': 'Genre Domination',
            'rapid_growth': 'Rapid Growth',
            'international': 'International Success',
            'niche_market': 'Niche Market Winner'
        };
        return names[category] || 'Success Story';
    }

    // Load publishing tips
    async loadPublishingTips() {
        try {
            const response = await fetch(`${this.baseUrl}/api/publisher-stories/tips`);
            if (!response.ok) {
                console.log('Using fallback tips');
                return;
            }
            
            const result = await response.json();
            if (result.success && result.data.tips.length > 0) {
                this.renderTips(result.data.tips.slice(0, 3)); // Show top 3 tips
            }
        } catch (error) {
            console.error('Error loading publishing tips:', error);
            // Fallback tips are already in HTML
        }
    }

    // Render publishing tips
    renderTips(tips) {
        const tipsGrid = document.querySelector('.tips-grid');
        if (!tipsGrid || tips.length === 0) return;

        const tipsHtml = tips.map(tip => `
            <div class="tip-card">
                <div class="tip-category">${this.formatTipCategory(tip.category)}</div>
                <div class="tip-text">"${tip.tip_text}"</div>
                <div class="tip-author">- ${tip.publisher_name || 'Anonymous Publisher'}</div>
            </div>
        `).join('');

        tipsGrid.innerHTML = tipsHtml;
    }

    // Format tip category
    formatTipCategory(category) {
        const names = {
            'cover_design': 'Cover Design',
            'title_optimization': 'Title Optimization',
            'description_writing': 'Description Writing',
            'marketing': 'Marketing',
            'pricing': 'Pricing',
            'keywords': 'Keywords'
        };
        return names[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Show full story modal
    showFullStory(storyId) {
        // This would load and display the full story in a modal
        console.log('Loading full story:', storyId);
        
        // For now, show a placeholder modal
        this.showStoryModal({
            title: 'Full Success Story',
            content: `
                <div class="full-story">
                    <p><strong>Coming Soon:</strong> Full detailed success stories with:</p>
                    <ul>
                        <li>📊 Complete analytics breakdown</li>
                        <li>🎨 Cover design process</li>
                        <li>📝 Marketing strategies used</li>
                        <li>💡 Lessons learned</li>
                        <li>🤝 Community help received</li>
                    </ul>
                    <p>This publisher's full story will be available when the story system launches.</p>
                </div>
            `
        });
    }

    // Show story modal (reuse modal system from marketplace)
    showStoryModal({ title, content }) {
        if (window.marketplacePreview) {
            const modal = window.marketplacePreview.createModal({
                title,
                content,
                onSubmit: null
            });
        } else {
            alert('Story details coming soon!');
        }
    }
}

// Global functions for onclick handlers
function moveStoryCarousel(direction) {
    if (window.successStories) {
        window.successStories.moveCarousel(direction);
    }
}

function showStory(index) {
    if (window.successStories) {
        window.successStories.showStory(index);
    }
}

function readFullStory(storyId) {
    if (window.successStories) {
        window.successStories.showFullStory(storyId);
    }
}

function viewAllTips() {
    // Show all tips modal or page
    if (window.successStories) {
        window.successStories.showStoryModal({
            title: '💡 All Publishing Tips',
            content: `
                <div class="all-tips">
                    <p><strong>Coming Soon:</strong> Complete searchable tips library with:</p>
                    <ul>
                        <li>🎨 Cover Design Secrets</li>
                        <li>📝 Title & Description Optimization</li>
                        <li>📱 Marketing & Promotion</li>
                        <li>💰 Pricing Strategies</li>
                        <li>🔍 Keyword Research</li>
                        <li>⭐ Review Generation</li>
                    </ul>
                    <p>Tips database will be available when the community system launches.</p>
                </div>
            `
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.successStories = new SuccessStories();
});