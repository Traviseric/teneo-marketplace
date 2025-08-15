const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Configure email transporter based on environment
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      } else {
        console.warn('Email not configured. Set EMAIL_USER and EMAIL_PASS environment variables.');
      }
    } catch (error) {
      console.error('Error initializing email transporter:', error);
      this.transporter = null;
    }
  }

  async sendDownloadEmail(orderData) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { 
        userEmail, 
        bookTitle, 
        bookAuthor,
        downloadUrl, 
        orderId,
        expiresIn = '24 hours',
        maxDownloads = 5
      } = orderData;

      const htmlContent = this.generateDownloadEmailHTML({
        bookTitle,
        bookAuthor,
        downloadUrl,
        orderId,
        expiresIn,
        maxDownloads
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `📚 Your book "${bookTitle}" is ready for download`,
        html: htmlContent,
        text: this.generateDownloadEmailText({
          bookTitle,
          bookAuthor,
          downloadUrl,
          orderId,
          expiresIn,
          maxDownloads
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`Download email sent to ${userEmail} for order ${orderId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };

    } catch (error) {
      console.error('Error sending download email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateDownloadEmailHTML({ bookTitle, bookAuthor, downloadUrl, orderId, expiresIn, maxDownloads }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Book is Ready for Download</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #7C3AED;
            margin: 0;
            font-size: 28px;
        }
        .book-info {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #7C3AED;
        }
        .book-title {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 5px;
        }
        .book-author {
            color: #6b7280;
            font-size: 16px;
        }
        .download-button {
            display: inline-block;
            background-color: #7C3AED;
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
        }
        .download-button:hover {
            background-color: #6D28D9;
        }
        .important-info {
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
        }
        .important-info h3 {
            color: #92400e;
            margin-top: 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .order-details {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .order-details strong {
            color: #374151;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Your Book is Ready!</h1>
            <p>Thank you for your purchase. Your book is now available for download.</p>
        </div>

        <div class="book-info">
            <div class="book-title">${bookTitle}</div>
            <div class="book-author">by ${bookAuthor}</div>
        </div>

        <div style="text-align: center;">
            <a href="${downloadUrl}" class="download-button">
                📥 Download Your Book
            </a>
        </div>

        <div class="important-info">
            <h3>⚠️ Important Information</h3>
            <ul>
                <li><strong>Expires:</strong> This download link expires in ${expiresIn}</li>
                <li><strong>Download Limit:</strong> You can download this book up to ${maxDownloads} times</li>
                <li><strong>Save Your Book:</strong> Please save the PDF to your device after downloading</li>
            </ul>
        </div>

        <div class="order-details">
            <strong>Order ID:</strong> ${orderId}<br>
            <strong>Download URL:</strong> <a href="${downloadUrl}">${downloadUrl}</a>
        </div>

        <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px;">
            <h3 style="color: #1e40af; margin-top: 0;">📖 Reading Tips</h3>
            <ul>
                <li>Use Adobe Acrobat Reader for the best reading experience</li>
                <li>Enable bookmarks and highlights for note-taking</li>
                <li>Adjust text size and contrast for comfortable reading</li>
                <li>Consider printing important sections for reference</li>
            </ul>
        </div>

        <div class="footer">
            <p>Questions? Reply to this email or visit our support page.</p>
            <p>© 2024 Teneo Books. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  generateDownloadEmailText({ bookTitle, bookAuthor, downloadUrl, orderId, expiresIn, maxDownloads }) {
    return `
📚 Your Book is Ready for Download!

Thank you for your purchase. Your book is now available for download.

Book: ${bookTitle}
Author: ${bookAuthor}
Order ID: ${orderId}

Download Link: ${downloadUrl}

IMPORTANT INFORMATION:
- This download link expires in ${expiresIn}
- You can download this book up to ${maxDownloads} times
- Please save the PDF to your device after downloading

READING TIPS:
- Use Adobe Acrobat Reader for the best reading experience
- Enable bookmarks and highlights for note-taking
- Adjust text size and contrast for comfortable reading
- Consider printing important sections for reference

Questions? Reply to this email or visit our support page.

© 2024 Teneo Books. All rights reserved.
    `;
  }

  async sendOrderConfirmation(orderData) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { 
        userEmail, 
        bookTitle, 
        bookAuthor,
        price,
        orderId,
        paymentMethod = 'Credit Card'
      } = orderData;

      const htmlContent = this.generateOrderConfirmationHTML({
        bookTitle,
        bookAuthor,
        price,
        orderId,
        paymentMethod
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `✅ Order Confirmed: "${bookTitle}" - Order #${orderId}`,
        html: htmlContent,
        text: this.generateOrderConfirmationText({
          bookTitle,
          bookAuthor,
          price,
          orderId,
          paymentMethod
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`Order confirmation sent to ${userEmail} for order ${orderId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };

    } catch (error) {
      console.error('Error sending order confirmation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateOrderConfirmationHTML({ bookTitle, bookAuthor, price, orderId, paymentMethod }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #059669;
            margin: 0;
            font-size: 28px;
        }
        .checkmark {
            font-size: 48px;
            color: #059669;
            margin-bottom: 10px;
        }
        .order-summary {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #059669;
        }
        .order-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .order-item:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="checkmark">✅</div>
            <h1>Order Confirmed!</h1>
            <p>Thank you for your purchase. Your order has been successfully processed.</p>
        </div>

        <div class="order-summary">
            <h3>Order Summary</h3>
            <div class="order-item">
                <span><strong>${bookTitle}</strong><br>by ${bookAuthor}</span>
                <span>$${price}</span>
            </div>
            <div class="order-item">
                <span><strong>Total</strong></span>
                <span><strong>$${price}</strong></span>
            </div>
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">📧 What's Next?</h3>
            <p>You will receive a separate email with your download link within the next few minutes. The download link will be valid for 24 hours and allow up to 5 downloads.</p>
        </div>

        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Order Details:</strong><br>
            Order ID: ${orderId}<br>
            Payment Method: ${paymentMethod}<br>
            Date: ${new Date().toLocaleDateString()}
        </div>

        <div class="footer">
            <p>Questions about your order? Reply to this email or visit our support page.</p>
            <p>© 2024 Teneo Books. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  generateOrderConfirmationText({ bookTitle, bookAuthor, price, orderId, paymentMethod }) {
    return `
✅ Order Confirmed!

Thank you for your purchase. Your order has been successfully processed.

ORDER SUMMARY:
- Book: ${bookTitle}
- Author: ${bookAuthor}
- Price: $${price}
- Total: $${price}

ORDER DETAILS:
- Order ID: ${orderId}
- Payment Method: ${paymentMethod}
- Date: ${new Date().toLocaleDateString()}

WHAT'S NEXT:
You will receive a separate email with your download link within the next few minutes. The download link will be valid for 24 hours and allow up to 5 downloads.

Questions about your order? Reply to this email or visit our support page.

© 2024 Teneo Books. All rights reserved.
    `;
  }

  async sendPaymentFailureEmail(data) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { userEmail, bookTitle, orderId, errorMessage } = data;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #ef4444;
            margin: 0;
            font-size: 28px;
        }
        .alert-box {
            background-color: #fee2e2;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #ef4444;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Payment Failed</h1>
            <p>We couldn't process your payment for "${bookTitle}"</p>
        </div>

        <div class="alert-box">
            <h3>What happened?</h3>
            <p>${errorMessage || 'Your payment could not be processed. This might be due to insufficient funds, an expired card, or a temporary issue with your payment method.'}</p>
        </div>

        <div style="margin: 30px 0;">
            <h3>What can you do?</h3>
            <ul>
                <li>Check your card details and try again</li>
                <li>Try a different payment method</li>
                <li>Contact your bank if the issue persists</li>
                <li>Reach out to our support team for assistance</li>
            </ul>
        </div>

        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Order Details:</strong><br>
            Order ID: ${orderId}<br>
            Book: ${bookTitle}<br>
            Date: ${new Date().toLocaleDateString()}
        </div>

        <div class="footer">
            <p>Need help? Reply to this email or visit our support page.</p>
            <p>© 2024 Teneo Books. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Payment Failed: "${bookTitle}"`,
        html: htmlContent,
        text: `Payment Failed\n\nWe couldn't process your payment for "${bookTitle}".\n\nError: ${errorMessage || 'Payment processing failed'}\n\nPlease check your payment details and try again.\n\nOrder ID: ${orderId}`
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('Error sending payment failure email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendRefundConfirmationEmail(data) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { userEmail, bookTitle, orderId, refundAmount, currency = 'USD' } = data;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Processed</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #10b981;
            margin: 0;
            font-size: 28px;
        }
        .refund-box {
            background-color: #d1fae5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
            text-align: center;
        }
        .refund-amount {
            font-size: 32px;
            font-weight: bold;
            color: #065f46;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Refund Processed</h1>
            <p>Your refund has been successfully processed</p>
        </div>

        <div class="refund-box">
            <div class="refund-amount">$${refundAmount.toFixed(2)} ${currency}</div>
            <p>Will be credited to your original payment method</p>
        </div>

        <div style="margin: 30px 0;">
            <h3>Refund Details</h3>
            <p><strong>Book:</strong> ${bookTitle}</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)} ${currency}</p>
            <p><strong>Processing Time:</strong> 5-10 business days</p>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>⚠️ Important:</strong> Your download access for this book has been revoked. The refund will appear on your statement within 5-10 business days, depending on your bank.
        </div>

        <div class="footer">
            <p>Questions about your refund? Reply to this email.</p>
            <p>© 2024 Teneo Books. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Refund Processed: $${refundAmount.toFixed(2)} for "${bookTitle}"`,
        html: htmlContent,
        text: `Refund Processed\n\nYour refund of $${refundAmount.toFixed(2)} ${currency} has been processed.\n\nBook: ${bookTitle}\nOrder ID: ${orderId}\n\nThe refund will appear on your statement within 5-10 business days.\n\nNote: Your download access for this book has been revoked.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('Error sending refund email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Print status update email
  async sendPrintStatusUpdate(emailData) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { userEmail, orderId, bookTitle, status, message, estimatedTime } = emailData;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .status-badge { display: inline-block; padding: 10px 20px; border-radius: 5px; font-weight: bold; }
        .status-preparing { background: #FEF3C7; color: #92400E; }
        .status-printing { background: #DBEAFE; color: #1E40AF; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Print Status Update</h1>
        <div class="status-badge status-${status}">${status.toUpperCase()}</div>
        
        <h2>${bookTitle}</h2>
        <p>${message}</p>
        
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <strong>Estimated Time:</strong> ${estimatedTime}
        </div>
        
        <p>Order ID: ${orderId}</p>
        <p>We'll send you another update when your book ships!</p>
    </div>
</body>
</html>`;

      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `📚 Print Status Update - ${bookTitle}`,
        html: htmlContent
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending print status update:', error);
      return { success: false, error: error.message };
    }
  }

  // Shipping confirmation email
  async sendShippingConfirmation(emailData) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { userEmail, orderId, bookTitle, trackingUrl, trackingId, estimatedDelivery } = emailData;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .track-button { display: inline-block; background: #7C3AED; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚚 Your Book Has Shipped!</h1>
        
        <h2>${bookTitle}</h2>
        <p>Great news! Your book is on its way to you.</p>
        
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <strong>Tracking Number:</strong> ${trackingId}<br>
            <strong>Estimated Delivery:</strong> ${estimatedDelivery}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingUrl}" class="track-button">Track Your Package</a>
        </div>
        
        <p>Order ID: ${orderId}</p>
    </div>
</body>
</html>`;

      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `🚚 Shipped! Track order ${trackingId}`,
        html: htmlContent
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending shipping confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Print cancellation email
  async sendPrintCancellation(emailData) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { userEmail, orderId, bookTitle, reason, refundInfo } = emailData;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #FEE2E2; color: #991B1B; padding: 15px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Print Order Cancelled</h1>
        
        <div class="alert">
            <strong>Order Cancelled:</strong> ${bookTitle}
        </div>
        
        <p><strong>Reason:</strong> ${reason}</p>
        <p>${refundInfo}</p>
        
        <p>Order ID: ${orderId}</p>
        <p>If you have any questions, please reply to this email.</p>
    </div>
</body>
</html>`;

      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Order Cancelled - ${bookTitle}`,
        html: htmlContent
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending cancellation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Print failure email
  async sendPrintFailure(emailData) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { userEmail, orderId, bookTitle, errorMessage, supportInfo } = emailData;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #FEE2E2; color: #991B1B; padding: 15px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ Issue with Print Order</h1>
        
        <div class="alert">
            <strong>Print Issue:</strong> ${bookTitle}
        </div>
        
        <p><strong>Issue:</strong> ${errorMessage}</p>
        <p>${supportInfo}</p>
        
        <p>Order ID: ${orderId}</p>
        <p>We apologize for the inconvenience and are working to resolve this quickly.</p>
    </div>
</body>
</html>`;

      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `⚠️ Print Order Issue - ${bookTitle}`,
        html: htmlContent
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending print failure email:', error);
      return { success: false, error: error.message };
    }
  }

  // Mixed order confirmation email
  async sendMixedOrderConfirmation(emailData) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { userEmail, orderId, digitalItems, physicalItems } = emailData;

      const digitalSection = digitalItems.length > 0 ? `
        <h3>📱 Digital Items (Ready Now)</h3>
        <ul>
          ${digitalItems.map(item => `<li>${item.title} - ${item.format} - ${item.status}</li>`).join('')}
        </ul>
        <p>Check your email for download links!</p>
      ` : '';

      const physicalSection = physicalItems.length > 0 ? `
        <h3>📦 Physical Items (Shipping Soon)</h3>
        <ul>
          ${physicalItems.map(item => `<li>${item.title} - ${item.format} (Qty: ${item.quantity}) - ${item.status}</li>`).join('')}
        </ul>
        <p>We'll email you tracking information when your items ship.</p>
      ` : '';

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .section { background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ Order Confirmed!</h1>
        
        <p>Thank you for your order! Here's what you ordered:</p>
        
        <div class="section">
          ${digitalSection}
        </div>
        
        <div class="section">
          ${physicalSection}
        </div>
        
        <p>Order ID: ${orderId}</p>
    </div>
</body>
</html>`;

      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `✅ Order Confirmed - Mixed Digital & Physical Items`,
        html: htmlContent
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending mixed order confirmation:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();