# Production Deployment Checklist

**Use this checklist before deploying to production to ensure everything is configured correctly.**

---

## 🔒 Security

- [ ] **Environment Variables Secured**
  - [ ] `.env` file not in git repository
  - [ ] No default/demo passwords in use
  - [ ] `SESSION_SECRET` is random and unique (64+ characters)
  - [ ] `ADMIN_PASSWORD_HASH` uses bcrypt with salt rounds >= 10

- [ ] **Stripe Configuration**
  - [ ] Using **live** keys (not test keys)
  - [ ] `STRIPE_SECRET_KEY` starts with `sk_live_`
  - [ ] `STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`
  - [ ] Webhook endpoint configured in Stripe dashboard
  - [ ] Webhook secret added to `.env`

- [ ] **HTTPS Enforced**
  - [ ] SSL certificate installed and valid
  - [ ] All HTTP traffic redirects to HTTPS
  - [ ] `secure` flag set on cookies (automatic in production mode)
  - [ ] HSTS headers configured

- [ ] **CORS Configured**
  - [ ] Production domain added to allowed origins
  - [ ] Wildcard (`*`) origins removed
  - [ ] `credentials: true` only for trusted domains

- [ ] **Rate Limiting Active**
  - [ ] API endpoints have rate limits
  - [ ] Admin routes have stricter limits
  - [ ] Checkout endpoints protected against abuse

- [ ] **CSRF Protection**
  - [ ] CSRF middleware active
  - [ ] Webhook endpoints properly excluded
  - [ ] Frontend sends CSRF tokens

---

## 🗄️ Database

- [ ] **Database Initialized**
  - [ ] `marketplace.db` exists and has correct schema
  - [ ] `orders.db` initialized
  - [ ] All tables created with correct indexes

- [ ] **Backup Strategy**
  - [ ] Automated backups configured (daily minimum)
  - [ ] Backup script tested and working
  - [ ] Backup retention policy set (7 days minimum)
  - [ ] Backup restoration tested

- [ ] **Data Migration**
  - [ ] Any existing data migrated successfully
  - [ ] Database schema version documented
  - [ ] Migration rollback plan prepared

---

## 📧 Email Configuration

- [ ] **SMTP Configured**
  - [ ] `EMAIL_USER` set to valid SMTP account
  - [ ] `EMAIL_PASSWORD` or app password configured
  - [ ] `EMAIL_HOST` and `EMAIL_PORT` correct
  - [ ] Test email sent successfully

- [ ] **Email Templates**
  - [ ] Order confirmation email tested
  - [ ] Download link email tested
  - [ ] Contact form email tested (if applicable)

---

## 💳 Payment Processing

- [ ] **Stripe Integration**
  - [ ] Test purchase completed successfully
  - [ ] Webhook receiving events
  - [ ] Failed payment handling tested
  - [ ] Refund process tested

- [ ] **Crypto Payments** (if enabled)
  - [ ] Bitcoin address configured
  - [ ] Payment verification process tested
  - [ ] Manual order processing workflow documented

---

## 🌐 Domain & Hosting

- [ ] **Domain Configuration**
  - [ ] DNS records point to production server
  - [ ] A record configured correctly
  - [ ] SSL certificate covers domain
  - [ ] `FRONTEND_URL` in `.env` matches production domain

- [ ] **Server Resources**
  - [ ] Adequate RAM allocated (minimum 1GB)
  - [ ] Disk space sufficient for database growth
  - [ ] CPU resources appropriate for expected traffic
  - [ ] Swap space configured

- [ ] **Firewall**
  - [ ] Only necessary ports open (22, 80, 443)
  - [ ] SSH key authentication enabled
  - [ ] Password authentication disabled
  - [ ] Fail2ban configured

---

## 📚 Content

- [ ] **Books Catalog**
  - [ ] At least one brand configured
  - [ ] Book metadata complete (title, author, description, price)
  - [ ] Cover images uploaded and accessible
  - [ ] PDF files uploaded to correct locations
  - [ ] File permissions correct (readable by application)

- [ ] **Brand Configuration**
  - [ ] `config.json` validated for each brand
  - [ ] Theme colors set appropriately
  - [ ] Payment methods configured per brand
  - [ ] Legal disclaimers in place

---

## 🔧 Application

- [ ] **Node.js Version**
  - [ ] Node.js v14+ installed
  - [ ] npm dependencies installed with `--production` flag
  - [ ] No security vulnerabilities (`npm audit`)

- [ ] **Process Management**
  - [ ] PM2 installed and configured
  - [ ] Application starts on boot
  - [ ] Auto-restart enabled
  - [ ] Log rotation configured

- [ ] **Environment Variables**
  - [ ] `NODE_ENV=production`
  - [ ] `PORT` configured (default 3001)
  - [ ] All required variables present
  - [ ] No development/test values in production

---

## 🧪 Testing

- [ ] **End-to-End Tests**
  - [ ] Homepage loads correctly
  - [ ] Books display properly
  - [ ] Search functionality works
  - [ ] Add to cart works
  - [ ] Checkout flow completes
  - [ ] Payment processing works
  - [ ] Download links generated
  - [ ] Admin panel accessible

- [ ] **Cross-Browser Testing**
  - [ ] Chrome/Edge tested
  - [ ] Firefox tested
  - [ ] Safari tested (if applicable)
  - [ ] Mobile browsers tested

- [ ] **Performance Testing**
  - [ ] Page load times acceptable (< 3 seconds)
  - [ ] API response times good (< 500ms)
  - [ ] Images optimized
  - [ ] Database queries efficient

---

## 📊 Monitoring

- [ ] **Logging**
  - [ ] Application logs configured
  - [ ] Error logging active
  - [ ] Log rotation enabled
  - [ ] Sensitive data not logged

- [ ] **Uptime Monitoring**
  - [ ] Uptime monitoring service configured (optional)
  - [ ] Health check endpoint accessible
  - [ ] Alert notifications configured

- [ ] **Performance Monitoring**
  - [ ] PM2 monitoring active
  - [ ] Server resource monitoring (optional)
  - [ ] Database size monitoring

---

## 🔐 Admin Access

- [ ] **Admin Panel**
  - [ ] Admin password changed from default
  - [ ] Admin panel accessible at `/admin`
  - [ ] Admin authentication working
  - [ ] Audit logging enabled

- [ ] **Access Control**
  - [ ] Admin credentials secured
  - [ ] Session timeout configured
  - [ ] Admin actions logged

---

## 📝 Documentation

- [ ] **Deployment Documentation**
  - [ ] Deployment process documented
  - [ ] Server access credentials secured
  - [ ] Emergency procedures documented
  - [ ] Rollback plan prepared

- [ ] **User Documentation**
  - [ ] Purchase instructions clear
  - [ ] Download instructions provided
  - [ ] Support contact information visible

---

## 🌐 Network Federation (Optional)

- [ ] **Network Configuration**
  - [ ] Store registered in network (if applicable)
  - [ ] Network API accessible
  - [ ] Cross-store search tested
  - [ ] Revenue sharing configured

---

## 🚨 Emergency Preparedness

- [ ] **Backup & Recovery**
  - [ ] Recent backup available
  - [ ] Backup restoration tested
  - [ ] Recovery time objective (RTO) documented
  - [ ] Recovery point objective (RPO) documented

- [ ] **Incident Response**
  - [ ] Emergency contact list prepared
  - [ ] Rollback procedure documented
  - [ ] Communication plan for downtime
  - [ ] Customer notification template ready

---

## ✅ Final Pre-Launch Steps

1. **Run Pre-flight Check**
   ```bash
   node scripts/preflight-check.js production
   ```

2. **Verify All Services Running**
   ```bash
   pm2 status
   systemctl status nginx
   ```

3. **Test Critical User Journeys**
   - [ ] Browse catalog
   - [ ] Complete purchase
   - [ ] Receive confirmation email
   - [ ] Download purchased book

4. **Verify SSL Certificate**
   ```bash
   curl -I https://your-domain.com
   ```

5. **Check Logs for Errors**
   ```bash
   pm2 logs teneo-marketplace --lines 100
   tail -n 100 /var/log/nginx/error.log
   ```

6. **Perform Manual Backup**
   ```bash
   ./scripts/backup.sh
   ```

---

## 🎉 Post-Launch Monitoring (First 24 Hours)

- [ ] Monitor error logs every 2 hours
- [ ] Check payment processing success rate
- [ ] Verify email delivery
- [ ] Watch server resource usage
- [ ] Test critical features again
- [ ] Respond to any user reports

---

## 📞 Emergency Contacts

**Technical Issues:**
- Server provider support
- Payment processor support

**Business Critical:**
- [Your contact information]
- [Backup contact]

---

## 🔄 Regular Maintenance Schedule

**Daily:**
- Review error logs
- Verify backup success

**Weekly:**
- Check for security updates
- Review performance metrics
- Test backup restoration (monthly)

**Monthly:**
- Update dependencies
- Review and rotate logs
- Security audit
- Performance optimization

---

**Last Updated:** [Date]
**Next Review:** [Date]

---

**⚠️ DO NOT DEPLOY WITHOUT COMPLETING ALL CRITICAL ITEMS**

Critical items are security, database, and payment processing checks.
