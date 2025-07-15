# 🛒 Test Purchase Guide

This guide walks you through making a test purchase on the Teneo Marketplace to verify the complete checkout flow.

## 📋 Prerequisites

- Deployed frontend URL: `https://teneo-marketplace.vercel.app`
- Stripe test mode enabled (default for development)
- A working email address for order confirmation

## 💳 Stripe Test Cards

Use these test card numbers for different scenarios:

### ✅ Successful Payment
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

### ❌ Declined Payment
- **Card Number**: `4000 0000 0000 0002`
- **Details**: Same as above

### 🔐 3D Secure Authentication
- **Card Number**: `4000 0025 0000 3155`
- **Details**: Same as above (will prompt for authentication)

## 🚀 Step-by-Step Purchase Process

### Step 1: Browse the Marketplace
1. Navigate to `https://teneo-marketplace.vercel.app`
2. Verify the page loads correctly
3. Check that books are displayed with:
   - Cover images
   - Titles and authors
   - Prices
   - "Buy Now" buttons

### Step 2: Select a Book
1. Click on any book or its "Buy Now" button
2. Verify the book details page shows:
   - Full book information
   - Price clearly displayed
   - "Purchase" or "Buy Now" button
   - Book description

### Step 3: Initiate Checkout
1. Click the "Purchase" button
2. You should see a checkout form with fields for:
   - Email address
   - Name
   - Payment information

### Step 4: Enter Customer Details
1. **Email**: Use a real email you can check
   - Example: `test@example.com`
2. **Name**: Any test name
   - Example: `Test Customer`

### Step 5: Enter Payment Information
1. **Card Number**: `4242 4242 4242 4242`
2. **Expiry**: `12/34` (or any future date)
3. **CVC**: `123`
4. **Billing ZIP**: `12345`

### Step 6: Complete Purchase
1. Click "Pay" or "Complete Purchase"
2. Wait for processing (usually 2-5 seconds)
3. Look for success indicators:
   - ✅ Success message
   - Order confirmation displayed
   - Download link or button appears

### Step 7: Verify Download
1. Click the download link/button
2. Verify the PDF downloads correctly
3. Open the PDF to ensure it's valid
4. Check file name matches the book title

### Step 8: Check Email Confirmation
1. Check the email address you provided
2. Look for an order confirmation email containing:
   - Order details
   - Book title and price
   - Download link (if implemented)
   - Order ID or reference number

## 🔍 What to Check at Each Step

### ✅ Frontend Checks
- [ ] Page loads without errors
- [ ] All images display correctly
- [ ] Responsive design works on mobile
- [ ] No console errors in browser dev tools

### ✅ Checkout Flow Checks
- [ ] Stripe Elements load correctly
- [ ] Form validation works
- [ ] Error messages display properly
- [ ] Loading states show during processing

### ✅ Backend Integration Checks
- [ ] API calls succeed (check Network tab)
- [ ] Proper error handling for failures
- [ ] CORS headers configured correctly
- [ ] Payment intent created successfully

### ✅ Post-Purchase Checks
- [ ] Download link works immediately
- [ ] PDF is complete and readable
- [ ] Order saved in database
- [ ] Email sent (if configured)

## 🐛 Common Issues & Solutions

### Issue: Stripe Elements Not Loading
**Solution**: Check that Stripe publishable key is configured in frontend environment

### Issue: CORS Errors
**Solution**: Verify backend allows frontend origin in CORS configuration

### Issue: Payment Fails
**Solution**: 
- Check Stripe keys are correct
- Verify backend payment endpoint is working
- Check for validation errors

### Issue: Download Fails
**Solution**:
- Verify PDF files exist in `/public/books/`
- Check file permissions
- Ensure correct file paths in database

### Issue: No Email Received
**Solution**:
- Check spam folder
- Verify email service is configured
- Check backend logs for email errors

## 📊 Test Scenarios

### 1. Happy Path Test
- Browse → Select Book → Checkout → Payment → Download
- Everything should work smoothly

### 2. Network Search Test
1. Use the search bar to find books
2. Verify search results appear
3. Complete purchase from search results

### 3. Mobile Test
1. Access site on mobile device/responsive mode
2. Complete full purchase flow
3. Verify download works on mobile

### 4. Error Recovery Test
1. Use declined card: `4000 0000 0000 0002`
2. Verify error message appears
3. Try again with valid card
4. Ensure purchase completes

### 5. Multiple Purchase Test
1. Buy one book successfully
2. Return to marketplace
3. Buy a different book
4. Verify both downloads work

## 📝 Test Checklist

```
[ ] Frontend loads correctly
[ ] Books display with images and prices
[ ] Search functionality works
[ ] Checkout form appears
[ ] Stripe Elements load
[ ] Test payment succeeds
[ ] Success message displays
[ ] Download link works
[ ] PDF downloads correctly
[ ] Email confirmation sent
[ ] Mobile responsive design works
[ ] Error handling works properly
```

## 🎯 Success Criteria

Your marketplace is ready when:
- ✅ All test scenarios pass
- ✅ Payment processing works smoothly
- ✅ Downloads complete successfully
- ✅ No console errors or warnings
- ✅ Mobile experience is smooth
- ✅ Email confirmations arrive (if configured)

## 📞 Troubleshooting Resources

- **Stripe Testing Guide**: https://stripe.com/docs/testing
- **Browser Console**: Press F12 to check for errors
- **Network Tab**: Monitor API calls and responses
- **Backend Logs**: Check Render dashboard for server logs

---

🎉 **Congratulations!** If all tests pass, your Teneo Marketplace is ready for real customers!