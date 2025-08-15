const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

// Email configuration from environment variables
const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    from: `${process.env.EMAIL_FROM_NAME || process.env.MARKETPLACE_NAME || 'Book Marketplace'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'noreply@example.com'}>`
};

// Create reusable transporter object
let transporter;

// Initialize email transporter
function initializeTransporter() {
    // Skip initialization if credentials are not provided
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn('Email credentials not configured. Email sending will be simulated.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth
    });

    // Verify transporter configuration
    transporter.verify((error, success) => {
        if (error) {
            console.error('Email transporter verification failed:', error);
        } else {
            console.log('Email service ready to send messages');
        }
    });

    return transporter;
}

// Get marketplace configuration
function getMarketplaceConfig() {
    return {
        name: process.env.MARKETPLACE_NAME || 'Book Marketplace',
        tagline: process.env.MARKETPLACE_TAGLINE || 'Your Digital Bookstore',
        primaryColor: process.env.PRIMARY_COLOR || '#7C3AED',
        secondaryColor: process.env.SECONDARY_COLOR || '#6D28D9',
        logo: process.env.MARKETPLACE_LOGO || '📚',
        supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'support@example.com',
        websiteUrl: process.env.PUBLIC_URL || 'http://localhost:3001'
    };
}

// Create HTML email template
function createEmailTemplate(title, content) {
    const config = getMarketplaceConfig();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: ${config.primaryColor};
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .header .logo {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .header .tagline {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 5px;
        }
        .content {
            padding: 30px;
        }
        .button {
            display: inline-block;
            background: ${config.primaryColor};
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
            font-weight: 600;
        }
        .button:hover {
            background: ${config.secondaryColor};
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .book-item {
            background: #f8f9fa;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid ${config.primaryColor};
        }
        .book-title {
            font-weight: 600;
            color: ${config.primaryColor};
        }
        .download-info {
            background: #e8f4fd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border: 1px solid #bee5eb;
        }
        .warning {
            color: #e74c3c;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${config.logo}</div>
            <h1>${config.name}</h1>
            <div class="tagline">${config.tagline}</div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© ${process.env.COPYRIGHT_YEAR || new Date().getFullYear()} ${process.env.COPYRIGHT_HOLDER || config.name}. All rights reserved.</p>
            <p>Questions? Contact us at <a href="mailto:${config.supportEmail}">${config.supportEmail}</a></p>
            <p style="font-size: 10px; color: #999;">
                You received this email because you made a purchase at ${config.name}.
            </p>
        </div>
    </div>
</body>
</html>`;
}

// Send order confirmation email
async function sendOrderConfirmation(customerEmail, orderDetails) {
    const config = getMarketplaceConfig();
    
    const content = `
        <h2>Thank you for your order!</h2>
        <p>Hi ${orderDetails.customerName || 'Valued Customer'},</p>
        <p>Your order has been confirmed and your digital books are ready for download.</p>
        
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
        <p><strong>Date:</strong> ${new Date(orderDetails.date).toLocaleDateString()}</p>
        <p><strong>Total:</strong> $${orderDetails.total.toFixed(2)}</p>
        
        <h3>Your Books</h3>
        ${orderDetails.items.map(item => `
            <div class="book-item">
                <div class="book-title">${item.title}</div>
                <div>by ${item.author}</div>
                <div>Price: $${item.price.toFixed(2)}</div>
            </div>
        `).join('')}
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${orderDetails.downloadUrl}" class="button">Access Your Downloads</a>
        </div>
        
        <div class="download-info">
            <strong>Download Information:</strong>
            <ul>
                <li>Your download links will expire in 30 days</li>
                <li>Each book can be downloaded up to 5 times</li>
                <li>Save this email for future reference</li>
            </ul>
        </div>
        
        <p>Thank you for choosing ${config.name}!</p>
    `;
    
    const html = createEmailTemplate('Order Confirmation', content);
    
    const mailOptions = {
        from: emailConfig.from,
        to: customerEmail,
        subject: `Order Confirmation - ${orderDetails.orderId}`,
        html: html,
        text: stripHtml(content) // Plain text version
    };
    
    return sendEmail(mailOptions);
}

// Send download links email
async function sendDownloadLinks(customerEmail, books, downloadTokens) {
    const config = getMarketplaceConfig();
    
    const content = `
        <h2>Your Download Links Are Ready!</h2>
        <p>Thank you for your purchase. Your digital books are ready for immediate download.</p>
        
        <h3>Your Books</h3>
        ${books.map((book, index) => {
            const token = downloadTokens[index];
            return `
            <div class="book-item">
                <div class="book-title">${book.title}</div>
                <div>by ${book.author}</div>
                <div style="margin-top: 10px;">
                    <a href="${token.downloadUrl}" class="button" style="background: ${config.secondaryColor};">
                        Download PDF
                    </a>
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                    Downloads remaining: ${token.maxDownloads}
                </div>
            </div>
        `}).join('')}
        
        <div class="download-info">
            <strong>Important:</strong>
            <ul>
                <li>Download links expire in 24 hours</li>
                <li>Each book can be downloaded up to 5 times</li>
                <li>For security, links are unique to your email</li>
            </ul>
        </div>
        
        <p class="warning">⚠️ Do not share these download links with others.</p>
        
        <p>If you have any issues downloading your books, please contact our support team.</p>
    `;
    
    const html = createEmailTemplate('Your Download Links', content);
    
    const mailOptions = {
        from: emailConfig.from,
        to: customerEmail,
        subject: 'Your Download Links - ' + config.name,
        html: html,
        text: stripHtml(content)
    };
    
    return sendEmail(mailOptions);
}

// Send welcome email
async function sendWelcomeEmail(customerEmail, customerName) {
    const config = getMarketplaceConfig();
    
    const content = `
        <h2>Welcome to ${config.name}!</h2>
        <p>Hi ${customerName || 'Reader'},</p>
        <p>Thank you for joining our community of curious minds. We're thrilled to have you with us!</p>
        
        <h3>What's Next?</h3>
        <ul>
            <li><strong>Download Your Books:</strong> Check your email for download links</li>
            <li><strong>Join Our Community:</strong> Connect with fellow readers</li>
            <li><strong>Exclusive Offers:</strong> Watch for member-only discounts</li>
            <li><strong>New Releases:</strong> Be first to know about new books</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${config.websiteUrl}" class="button">
                Explore More Books
            </a>
        </div>
        
        <h3>Stay Connected</h3>
        <p>Follow us for updates, book recommendations, and exclusive content:</p>
        <ul>
            <li>Newsletter: Get weekly book recommendations</li>
            <li>Social Media: Join the conversation</li>
            <li>Blog: Read author interviews and insights</li>
        </ul>
        
        <p>We're here to help you on your journey of discovery!</p>
        
        <p>Happy reading,<br>The ${config.name} Team</p>
    `;
    
    const html = createEmailTemplate('Welcome!', content);
    
    const mailOptions = {
        from: emailConfig.from,
        to: customerEmail,
        subject: `Welcome to ${config.name}!`,
        html: html,
        text: stripHtml(content)
    };
    
    return sendEmail(mailOptions);
}

// Generic email sending function
async function sendEmail(mailOptions) {
    if (!transporter) {
        // Simulate email sending if not configured
        console.log('Simulating email send:', {
            to: mailOptions.to,
            subject: mailOptions.subject
        });
        return { 
            success: true, 
            messageId: 'simulated-' + Date.now(),
            simulated: true 
        };
    }
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { 
            success: true, 
            messageId: info.messageId,
            simulated: false 
        };
    } catch (error) {
        console.error('Email send error:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// Strip HTML tags for plain text version
function stripHtml(html) {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Initialize transporter when module loads
initializeTransporter();

module.exports = {
    sendOrderConfirmation,
    sendDownloadLinks,
    sendWelcomeEmail,
    sendEmail,
    initializeTransporter
};