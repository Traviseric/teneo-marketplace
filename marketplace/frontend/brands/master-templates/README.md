# 🚀 Master Brand Template System

## Overview

This template system allows you to launch professional book brand websites in minutes, not days. Each brand gets:
- Lead capture landing page
- Book library with e-commerce
- Thank you pages with conversion tracking
- Complete analytics and marketing integration

## 📁 File Structure

```
master-template/
├── index.html              # Main landing page
├── library.html            # Book showcase & sales
├── thank-you.html          # Post email signup
├── purchase-success.html   # Post purchase confirmation
├── config.js              # All brand variables
├── main.js                # Utilities & tracking
├── assets/
│   └── images/           # Book covers, testimonials
└── README.md             # This file
```

## 🚀 Quick Start: Launch a New Brand

### 1. Copy the Template
```bash
cp -r master-template/ my-new-brand/
cd my-new-brand/
```

### 2. Edit config.js
Open `config.js` and update the brand variables:

```javascript
const brandConfig = {
    // Change these for your brand
    BRAND_NAME: "Success Books Co",
    PRIMARY_COLOR: "#059669",    // Green
    ACCENT_COLOR: "#DC2626",     // Red
    
    // Update content
    HERO_HEADLINE: "Transform Your Life with Our Books",
    // ... etc
};
```

### 3. Add Your Images
Place in `/assets/images/`:
- Book covers (300x450px recommended)
- Author photos
- Testimonial images
- Brand logo

### 4. Generate Your Site

**Option A: Use the Browser Console**
1. Open `config.js` in your browser
2. Open Developer Console (F12)
3. Run:
```javascript
generateAllTemplates(brandConfig);
```
This downloads all customized HTML files.

**Option B: Manual Process**
1. Open each HTML file
2. The {{VARIABLES}} are automatically replaced by config.js values
3. Save the processed files

### 5. Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Drag your brand folder to the deployment area
3. Your site is live in seconds!

## 📚 Adding Books to Your Library

Edit the book sections in `config.js`:

```javascript
// Book 1
BOOK_1_TITLE: "Your Book Title",
BOOK_1_AUTHOR: "Author Name",
BOOK_1_PRICE: "19.99",
BOOK_1_GUMROAD_ID: "your-gumroad-id",
BOOK_1_LULU_URL: "https://lulu.com/your-book",
```

## 💰 Payment Integration

### Digital Sales (Gumroad)
1. Create products on Gumroad
2. Get the product ID
3. Add to config: `BOOK_1_GUMROAD_ID: "your-id"`

### Print-on-Demand (Lulu)
1. Upload book to Lulu.com
2. Get the product URL
3. Add to config: `BOOK_1_LULU_URL: "https://..."`

## 📊 Analytics Setup

### Google Analytics
1. Get your GA4 tracking ID
2. Update in config: `ANALYTICS_ID: "G-XXXXXXXXXX"`

### Facebook Pixel
1. Get your Pixel ID from Facebook Business Manager
2. Update: `FACEBOOK_PIXEL_ID: "YOUR_PIXEL_ID"`

## 📧 Email Integration

### Using Netlify Forms (Free)
Your forms are already set up with `data-netlify="true"`. Just deploy and Netlify handles everything.

### Using ConvertKit/ActiveCampaign
Update the form action:
```javascript
FORM_ACTION: "https://app.convertkit.com/forms/YOUR_FORM_ID/subscriptions"
```

## 🎨 Customization Tips

### Colors
Change your brand colors in config.js:
```javascript
PRIMARY_COLOR: "#1E40AF",    // Main brand color
ACCENT_COLOR: "#F59E0B",      // CTAs and highlights
```

### Fonts
The template uses Google Fonts. To change:
1. Pick fonts from [fonts.google.com](https://fonts.google.com)
2. Update the `<link>` tags in each HTML file
3. Update CSS `font-family` properties

### Layout Changes
The templates use Tailwind CSS. You can:
- Add Tailwind classes directly in HTML
- Modify the existing structure
- Add new sections as needed

## 🔧 Advanced Features

### A/B Testing
Add variant classes to test different versions:
```html
<h1 class="variant-a">Original Headline</h1>
<h1 class="variant-b hidden">Test Headline</h1>
```

### Countdown Timers
Add to any element:
```html
<span data-countdown="2024-12-31T23:59:59">Loading...</span>
```

### Social Proof
Enable purchase notifications:
```html
<div data-social-proof="true"></div>
```

## 📝 Content Variables Reference

### Homepage (index.html)
- `HERO_HEADLINE` - Main headline
- `HERO_SUBHEADLINE` - Supporting text
- `BUTTON_TEXT` - CTA button text
- `FEATURE_1_TITLE` - First feature title
- etc...

### Library (library.html)
- `BOOK_1_TITLE` - Book title
- `BOOK_1_PRICE` - Digital price
- `BOOK_1_GUMROAD_ID` - Gumroad product ID
- etc...

### Thank You Page
- `THANK_YOU_HEADLINE` - Success message
- `OFFER_CODE` - Discount code for new subscribers
- etc...

## 🚨 Troubleshooting

### Images Not Showing
- Check file paths in config.js
- Ensure images are in `/assets/images/`
- Use relative paths: `images/book-1.jpg`

### Forms Not Working
- Ensure `data-netlify="true"` is present
- Check form `name` attribute is unique
- Verify email input has `type="email"`

### Tracking Not Working
- Verify Analytics ID is correct
- Check browser console for errors
- Ensure scripts are loading

## 💡 Pro Tips

1. **Test Locally First**: Open HTML files directly in browser to preview
2. **Use Browser Tools**: F12 console shows any JavaScript errors
3. **Start Simple**: Launch with 3-5 books, add more later
4. **Track Everything**: Use UTM parameters for all campaigns
5. **Optimize Images**: Keep under 200KB for fast loading

## 🎯 Launch Checklist

- [ ] Update all variables in config.js
- [ ] Add book covers and images
- [ ] Set up Gumroad products
- [ ] Configure Lulu print versions
- [ ] Add Analytics tracking codes
- [ ] Test all forms
- [ ] Check mobile responsiveness
- [ ] Deploy to Netlify
- [ ] Configure custom domain
- [ ] Test purchase flow
- [ ] Set up email sequences
- [ ] Launch! 🚀

## 📞 Need Help?

- **Netlify Docs**: https://docs.netlify.com
- **Gumroad Help**: https://help.gumroad.com
- **Tailwind CSS**: https://tailwindcss.com/docs

---

Remember: Each brand you launch makes the next one easier. Build, test, optimize, repeat!