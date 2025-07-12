// Newsletter subscription functionality

// Function to handle newsletter form submission
function handleNewsletterSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const emailInput = document.getElementById('email-input');
    const submitBtn = form.querySelector('.submit-btn');
    const messageDiv = document.getElementById('newsletter-message');
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }
    
    // Disable form while processing
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing...';
    
    // Simulate API call for newsletter subscription
    setTimeout(() => {
        // In a real application, you would send this to your backend
        console.log('Newsletter subscription:', email);
        
        // Simulate successful subscription
        showMessage('Thank you for subscribing! Check your email for confirmation.', 'success');
        
        // Reset form
        emailInput.value = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Subscribe';
        
        // Store subscription in localStorage for demo purposes
        const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
        if (!subscribers.includes(email)) {
            subscribers.push(email);
            localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));
        }
        
    }, 1500);
}

// Function to show messages to user
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('newsletter-message');
    if (!messageDiv) return;
    
    messageDiv.textContent = message;
    messageDiv.className = `newsletter-message ${type}`;
    
    // Clear message after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'newsletter-message';
        }, 5000);
    }
}

// Function to check if email is already subscribed (demo purposes)
function isEmailSubscribed(email) {
    const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
    return subscribers.includes(email);
}

// Initialize newsletter functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const newsletterForm = document.getElementById('newsletter-form');
    const emailInput = document.getElementById('email-input');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
        
        // Add real-time email validation
        if (emailInput) {
            emailInput.addEventListener('blur', function() {
                const email = this.value.trim();
                if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                    showMessage('Please enter a valid email format.', 'error');
                } else if (email && isEmailSubscribed(email)) {
                    showMessage('This email is already subscribed!', 'info');
                } else {
                    showMessage('', '');
                }
            });
            
            // Clear messages when user starts typing
            emailInput.addEventListener('input', function() {
                const messageDiv = document.getElementById('newsletter-message');
                if (messageDiv && messageDiv.classList.contains('error')) {
                    showMessage('', '');
                }
            });
        }
    }
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleNewsletterSubmit,
        showMessage,
        isEmailSubscribed
    };
}