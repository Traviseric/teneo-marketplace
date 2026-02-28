// Newsletter subscription functionality

// Function to handle newsletter form submission
async function handleNewsletterSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const emailInput = document.getElementById('email-input');
    const nameInput = document.getElementById('newsletter-name');
    const submitBtn = form.querySelector('.submit-btn');

    const email = emailInput.value.trim();
    const name = nameInput ? nameInput.value.trim() : '';

    if (!email) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing...';

    try {
        const response = await fetch('/api/email/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, source: 'newsletter_widget' })
        });
        const data = await response.json();

        if (data.success) {
            showMessage('Thank you for subscribing! Check your email for confirmation.', 'success');
            emailInput.value = '';
            if (nameInput) nameInput.value = '';
        } else {
            showMessage(data.error || 'Subscription failed. Please try again.', 'error');
        }
    } catch (err) {
        showMessage('Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Subscribe';
    }
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

// Initialize newsletter functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const newsletterForm = document.getElementById('newsletter-form');
    const emailInput = document.getElementById('email-input');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);

        if (emailInput) {
            // Suppress native browser validation bubble; show accessible error instead
            emailInput.addEventListener('invalid', function(e) {
                e.preventDefault();
                emailInput.setAttribute('aria-invalid', 'true');
                const errorSpan = document.getElementById('newsletter-email-error');
                if (errorSpan) errorSpan.hidden = false;
            });

            emailInput.addEventListener('blur', function() {
                const email = this.value.trim();
                if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                    showMessage('Please enter a valid email format.', 'error');
                } else {
                    showMessage('', '');
                }
            });

            emailInput.addEventListener('input', function() {
                const messageDiv = document.getElementById('newsletter-message');
                if (messageDiv && messageDiv.classList.contains('error')) {
                    showMessage('', '');
                }
                if (emailInput.validity.valid) {
                    emailInput.setAttribute('aria-invalid', 'false');
                    const errorSpan = document.getElementById('newsletter-email-error');
                    if (errorSpan) errorSpan.hidden = true;
                }
            });
        }
    }
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleNewsletterSubmit, showMessage };
}