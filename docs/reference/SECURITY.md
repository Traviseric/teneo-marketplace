# Security Policy

## 🔒 Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

- **Email**: security@teneo.ai
- **Subject**: Security Vulnerability Report
- **Include**: Detailed description, steps to reproduce, potential impact

### What to Expect

- Response within 24 hours
- Regular updates on progress
- Credit in security advisory (if desired)
- Coordinated disclosure timeline

## 🛡️ Security Best Practices

### Environment Variables

**Never commit these to Git:**
- Stripe secret keys (`STRIPE_SECRET_KEY`)
- Email passwords (`EMAIL_PASS`)
- Database passwords
- JWT secrets
- Webhook secrets

**Always use:**
- Test keys during development
- Live keys only in production
- Separate staging environment
- Environment variable validation

### Production Checklist

- [ ] Use HTTPS in production
- [ ] Set strong JWT secrets (64+ characters)
- [ ] Configure CORS properly
- [ ] Enable Stripe webhook signature verification
- [ ] Use environment variables for all secrets
- [ ] Regularly rotate API keys
- [ ] Monitor error logs for security issues
- [ ] Keep dependencies updated

### Database Security

- [ ] Regular backups (encrypted)
- [ ] Use parameterized queries (already implemented)
- [ ] Limit database permissions
- [ ] Monitor for unusual access patterns

### File Upload Security

- [ ] Validate PDF file types
- [ ] Scan for malware
- [ ] Limit file sizes
- [ ] Use secure file storage

## 🔍 Security Features

### Already Implemented

- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **Stripe Webhook Verification**: Signature validation
- **Download Token Security**: Time-limited, single-use
- **Rate Limiting Ready**: Infrastructure in place
- **CORS Configuration**: Configurable origins

### Recommended Additions

- Content Security Policy (CSP)
- Helmet.js for security headers
- Rate limiting middleware
- Input validation middleware
- File upload scanning
- Audit logging

## 📋 Security Monitoring

### Monitor These Events

- Failed login attempts
- Unusual download patterns
- Multiple payment failures
- Large file uploads
- API rate limit hits
- Database access errors

### Log Analysis

- Use centralized logging
- Set up alerts for security events
- Regular log review
- Compliance with data retention policies

## 🚨 Incident Response

### In Case of Breach

1. **Immediate**: Revoke compromised credentials
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Notification**: Contact users if required
5. **Recovery**: Restore from clean backups
6. **Post-mortem**: Document and improve

### Emergency Contacts

- **Security Team**: security@teneo.ai
- **Platform Support**: Your hosting provider
- **Payment Processor**: Stripe support

## 🔐 Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |
| 0.x     | ❌ No     |

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Stripe Security Guide](https://stripe.com/docs/security)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Remember**: Security is everyone's responsibility. When in doubt, ask!