# 📧 Email Marketing System - Implementation Guide

**Transform Teneo Marketplace from transactional emails → full marketing automation platform**

---

## 🎯 Goals

1. **List Management:** Build, segment, and maintain subscriber lists
2. **Campaigns:** Create and send broadcast emails to segments
3. **Automation:** Trigger-based email sequences (welcome, cart abandonment, post-purchase)
4. **Analytics:** Track opens, clicks, conversions, revenue attribution

---

## 📊 Current State

### What We Have ✅

**Email Service** (`marketplace/backend/services/emailService.js`)
- ✅ Transactional emails (order confirmations, downloads, refunds)
- ✅ Beautiful HTML templates
- ✅ Nodemailer integration
- ✅ Gmail/SMTP support

**Email Types Supported:**
- Order confirmation
- Download links
- Payment failures
- Refund confirmations
- Print status updates
- Shipping notifications

### What We Need 🔨

1. **Subscriber Management**
   - Database tables for subscribers
   - Import/export functionality
   - Segmentation & tagging
   - GDPR compliance (double opt-in, unsubscribe)

2. **Campaign Builder**
   - Visual email editor
   - Template library
   - Personalization
   - Scheduling

3. **Automation Engine**
   - Trigger definitions
   - Multi-email sequences
   - Conditional logic
   - A/B testing

4. **Analytics Dashboard**
   - Open/click tracking
   - Conversion attribution
   - Revenue reporting
   - List growth metrics

---

## 🗄️ Database Schema

### New Tables Needed

```sql
-- subscribers.sql

-- Core subscriber table
CREATE TABLE email_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, active, unsubscribed, bounced
  source TEXT, -- checkout, landing_page, import, manual
  confirmed_at DATETIME,
  unsubscribed_at DATETIME,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX idx_email_subscribers_status ON email_subscribers(status);

-- Tags for segmentation
CREATE TABLE email_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT, -- hex color for UI
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscriber tags (many-to-many)
CREATE TABLE email_subscriber_tags (
  subscriber_id INTEGER,
  tag_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES email_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (subscriber_id, tag_id)
);

-- Custom fields for personalization
CREATE TABLE email_custom_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscriber_id INTEGER,
  field_name TEXT NOT NULL,
  field_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE
);

CREATE INDEX idx_custom_fields_subscriber ON email_custom_fields(subscriber_id);
```

```sql
-- campaigns.sql

-- Email campaigns (broadcasts)
CREATE TABLE email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  from_name TEXT,
  from_email TEXT,
  reply_to TEXT,
  template_id INTEGER,
  html_content TEXT NOT NULL,
  text_content TEXT,
  status TEXT DEFAULT 'draft', -- draft, scheduled, sending, sent, paused
  segment_filter TEXT, -- JSON filter for segmentation
  scheduled_at DATETIME,
  sent_at DATETIME,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Campaign sends (tracking individual sends)
CREATE TABLE email_campaign_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,
  subscriber_id INTEGER,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  opened_at DATETIME,
  clicked_at DATETIME,
  unsubscribed_at DATETIME,
  bounced_at DATETIME,
  bounce_reason TEXT,
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaign_sends_campaign ON email_campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_subscriber ON email_campaign_sends(subscriber_id);

-- Campaign link clicks (for analytics)
CREATE TABLE email_campaign_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,
  subscriber_id INTEGER,
  url TEXT NOT NULL,
  clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaign_clicks_campaign ON email_campaign_clicks(campaign_id);
CREATE INDEX idx_campaign_clicks_url ON email_campaign_clicks(url);
```

```sql
-- automations.sql

-- Email automation workflows
CREATE TABLE email_automations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- new_subscriber, abandoned_cart, post_purchase, tag_added, custom
  trigger_config TEXT, -- JSON config for trigger
  status TEXT DEFAULT 'active', -- active, paused, archived
  total_entered INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual emails in automation sequence
CREATE TABLE email_automation_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation_id INTEGER,
  step_order INTEGER NOT NULL,
  delay_value INTEGER, -- delay before sending (in minutes)
  delay_unit TEXT, -- minutes, hours, days
  subject TEXT NOT NULL,
  from_name TEXT,
  from_email TEXT,
  html_content TEXT NOT NULL,
  text_content TEXT,
  condition_config TEXT, -- JSON for conditional logic (e.g., only send if opened previous)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (automation_id) REFERENCES email_automations(id) ON DELETE CASCADE
);

-- Tracks subscribers in automation workflows
CREATE TABLE email_automation_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation_id INTEGER,
  subscriber_id INTEGER,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, completed, exited
  entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  exited_at DATETIME,
  exit_reason TEXT,
  FOREIGN KEY (automation_id) REFERENCES email_automations(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE
);

CREATE INDEX idx_automation_subs_automation ON email_automation_subscribers(automation_id);
CREATE INDEX idx_automation_subs_subscriber ON email_automation_subscribers(subscriber_id);
CREATE INDEX idx_automation_subs_status ON email_automation_subscribers(status);

-- Individual automation email sends
CREATE TABLE email_automation_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation_id INTEGER,
  step_id INTEGER,
  subscriber_id INTEGER,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  opened_at DATETIME,
  clicked_at DATETIME,
  FOREIGN KEY (automation_id) REFERENCES email_automations(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES email_automation_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE
);
```

```sql
-- templates.sql

-- Email template library
CREATE TABLE email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT, -- newsletter, promotion, transactional, automation
  thumbnail TEXT, -- preview image
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables TEXT, -- JSON array of customizable variables
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Backend Implementation

### 1. Email Marketing Routes

**File:** `marketplace/backend/routes/emailMarketing.js`

```javascript
const express = require('express');
const router = express.Router();
const emailMarketingService = require('../services/emailMarketingService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ==================
// SUBSCRIBER MANAGEMENT
// ==================

// Get all subscribers
router.get('/subscribers', requireAdmin, async (req, res) => {
  try {
    const { status, tag, search, page = 1, limit = 50 } = req.query;

    const subscribers = await emailMarketingService.getSubscribers({
      status,
      tag,
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({ success: true, data: subscribers });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add subscriber
router.post('/subscribers', async (req, res) => {
  try {
    const { email, first_name, last_name, tags, source } = req.body;

    const subscriber = await emailMarketingService.addSubscriber({
      email,
      first_name,
      last_name,
      tags,
      source: source || 'manual'
    });

    res.json({ success: true, data: subscriber });
  } catch (error) {
    console.error('Error adding subscriber:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Import subscribers from CSV
router.post('/subscribers/import', requireAdmin, async (req, res) => {
  try {
    const { csv_data, tags } = req.body;

    const result = await emailMarketingService.importSubscribers(csv_data, tags);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error importing subscribers:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Export subscribers to CSV
router.get('/subscribers/export', requireAdmin, async (req, res) => {
  try {
    const { status, tag } = req.query;

    const csv = await emailMarketingService.exportSubscribers({ status, tag });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting subscribers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unsubscribe (public endpoint)
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email, token } = req.body;

    await emailMarketingService.unsubscribe(email, token);

    res.json({ success: true, message: 'Successfully unsubscribed' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================
// CAMPAIGNS
// ==================

// Get all campaigns
router.get('/campaigns', requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const campaigns = await emailMarketingService.getCampaigns({
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create campaign
router.post('/campaigns', requireAdmin, async (req, res) => {
  try {
    const campaignData = req.body;

    const campaign = await emailMarketingService.createCampaign(campaignData);

    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Send campaign
router.post('/campaigns/:id/send', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { send_now, schedule_at } = req.body;

    const result = await emailMarketingService.sendCampaign(id, {
      send_now,
      schedule_at
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get campaign analytics
router.get('/campaigns/:id/analytics', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const analytics = await emailMarketingService.getCampaignAnalytics(id);

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// AUTOMATIONS
// ==================

// Get all automations
router.get('/automations', requireAdmin, async (req, res) => {
  try {
    const automations = await emailMarketingService.getAutomations();

    res.json({ success: true, data: automations });
  } catch (error) {
    console.error('Error fetching automations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create automation
router.post('/automations', requireAdmin, async (req, res) => {
  try {
    const automationData = req.body;

    const automation = await emailMarketingService.createAutomation(automationData);

    res.json({ success: true, data: automation });
  } catch (error) {
    console.error('Error creating automation:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Trigger automation for subscriber
router.post('/automations/:id/trigger', async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriber_id, email } = req.body;

    const result = await emailMarketingService.triggerAutomation(id, {
      subscriber_id,
      email
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error triggering automation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// TEMPLATES
// ==================

// Get all templates
router.get('/templates', requireAdmin, async (req, res) => {
  try {
    const { category } = req.query;

    const templates = await emailMarketingService.getTemplates(category);

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create template
router.post('/templates', requireAdmin, async (req, res) => {
  try {
    const templateData = req.body;

    const template = await emailMarketingService.createTemplate(templateData);

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================
// TRACKING (Public Endpoints)
// ==================

// Track email open (pixel)
router.get('/track/open/:campaign_id/:subscriber_id/:token', async (req, res) => {
  try {
    const { campaign_id, subscriber_id, token } = req.params;

    await emailMarketingService.trackOpen(campaign_id, subscriber_id, token);

    // Return 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.send(pixel);
  } catch (error) {
    console.error('Error tracking open:', error);
    res.status(500).send();
  }
});

// Track link click
router.get('/track/click/:campaign_id/:subscriber_id/:token', async (req, res) => {
  try {
    const { campaign_id, subscriber_id, token } = req.params;
    const { url } = req.query;

    await emailMarketingService.trackClick(campaign_id, subscriber_id, url, token);

    // Redirect to actual URL
    res.redirect(url);
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 2. Email Marketing Service

**File:** `marketplace/backend/services/emailMarketingService.js`

```javascript
const db = require('../database/db');
const emailService = require('./emailService');
const crypto = require('crypto');

class EmailMarketingService {

  // ==================
  // SUBSCRIBER MANAGEMENT
  // ==================

  async addSubscriber({ email, first_name, last_name, tags = [], source = 'manual' }) {
    // Check if subscriber exists
    const existing = await db.get('SELECT * FROM email_subscribers WHERE email = ?', [email]);

    if (existing) {
      throw new Error('Email already subscribed');
    }

    // Insert subscriber
    const result = await db.run(
      `INSERT INTO email_subscribers (email, first_name, last_name, status, source)
       VALUES (?, ?, ?, 'pending', ?)`,
      [email, first_name, last_name, source]
    );

    const subscriber_id = result.lastID;

    // Add tags
    for (const tagName of tags) {
      await this.addTagToSubscriber(subscriber_id, tagName);
    }

    // Send double opt-in email
    await this.sendConfirmationEmail(subscriber_id);

    return { id: subscriber_id, email, first_name, last_name, status: 'pending' };
  }

  async confirmSubscriber(email, token) {
    // Verify token
    const expected_token = this.generateConfirmationToken(email);
    if (token !== expected_token) {
      throw new Error('Invalid confirmation token');
    }

    await db.run(
      `UPDATE email_subscribers
       SET status = 'active', confirmed_at = CURRENT_TIMESTAMP
       WHERE email = ?`,
      [email]
    );

    // Trigger welcome automation
    await this.triggerAutomationByType('new_subscriber', email);
  }

  async unsubscribe(email, token) {
    const expected_token = this.generateUnsubscribeToken(email);
    if (token !== expected_token) {
      throw new Error('Invalid unsubscribe token');
    }

    await db.run(
      `UPDATE email_subscribers
       SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP
       WHERE email = ?`,
      [email]
    );
  }

  async getSubscribers({ status, tag, search, page = 1, limit = 50 }) {
    let query = 'SELECT * FROM email_subscribers WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (tag) {
      query += ` AND id IN (
        SELECT subscriber_id FROM email_subscriber_tags
        JOIN email_tags ON email_subscriber_tags.tag_id = email_tags.id
        WHERE email_tags.name = ?
      )`;
      params.push(tag);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const subscribers = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM email_subscribers WHERE 1=1';
    const count = await db.get(countQuery, params.slice(0, -2));

    return {
      subscribers,
      pagination: {
        page,
        limit,
        total: count.total,
        pages: Math.ceil(count.total / limit)
      }
    };
  }

  async importSubscribers(csvData, tags = []) {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};

        headers.forEach((header, index) => {
          row[header.toLowerCase()] = values[index];
        });

        await this.addSubscriber({
          email: row.email,
          first_name: row.first_name || row.firstname,
          last_name: row.last_name || row.lastname,
          tags,
          source: 'import'
        });

        imported++;
      } catch (error) {
        skipped++;
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { imported, skipped, errors };
  }

  async exportSubscribers({ status, tag }) {
    const subscribers = await this.getSubscribers({ status, tag, limit: 100000 });

    let csv = 'email,first_name,last_name,status,created_at\n';

    subscribers.subscribers.forEach(sub => {
      csv += `${sub.email},${sub.first_name || ''},${sub.last_name || ''},${sub.status},${sub.created_at}\n`;
    });

    return csv;
  }

  // ==================
  // CAMPAIGNS
  // ==================

  async createCampaign(campaignData) {
    const {
      name,
      subject,
      preview_text,
      from_name,
      from_email,
      reply_to,
      html_content,
      text_content,
      segment_filter
    } = campaignData;

    const result = await db.run(
      `INSERT INTO email_campaigns
       (name, subject, preview_text, from_name, from_email, reply_to, html_content, text_content, segment_filter)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, subject, preview_text, from_name, from_email, reply_to, html_content, text_content, JSON.stringify(segment_filter)]
    );

    return { id: result.lastID, ...campaignData };
  }

  async sendCampaign(campaign_id, { send_now = false, schedule_at = null }) {
    const campaign = await db.get('SELECT * FROM email_campaigns WHERE id = ?', [campaign_id]);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (send_now) {
      // Send immediately
      await this.processCampaignSend(campaign_id);
    } else if (schedule_at) {
      // Schedule for later
      await db.run(
        'UPDATE email_campaigns SET status = ?, scheduled_at = ? WHERE id = ?',
        ['scheduled', schedule_at, campaign_id]
      );
    }

    return { campaign_id, status: send_now ? 'sending' : 'scheduled' };
  }

  async processCampaignSend(campaign_id) {
    const campaign = await db.get('SELECT * FROM email_campaigns WHERE id = ?', [campaign_id]);

    await db.run('UPDATE email_campaigns SET status = ? WHERE id = ?', ['sending', campaign_id]);

    // Get recipients based on segment filter
    const recipients = await this.getRecipientsForCampaign(campaign);

    let sent_count = 0;

    for (const subscriber of recipients) {
      try {
        // Personalize content
        const personalizedHTML = this.personalizeContent(campaign.html_content, subscriber);
        const personalizedText = this.personalizeContent(campaign.text_content, subscriber);

        // Add tracking pixel and link tracking
        const trackedHTML = this.addTracking(personalizedHTML, campaign_id, subscriber.id);

        // Send email
        await emailService.transporter.sendMail({
          from: `${campaign.from_name} <${campaign.from_email}>`,
          to: subscriber.email,
          replyTo: campaign.reply_to,
          subject: this.personalizeContent(campaign.subject, subscriber),
          html: trackedHTML,
          text: personalizedText
        });

        // Record send
        await db.run(
          'INSERT INTO email_campaign_sends (campaign_id, subscriber_id) VALUES (?, ?)',
          [campaign_id, subscriber.id]
        );

        sent_count++;
      } catch (error) {
        console.error(`Error sending to ${subscriber.email}:`, error);
      }
    }

    // Update campaign stats
    await db.run(
      `UPDATE email_campaigns
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP, total_recipients = ?, total_sent = ?
       WHERE id = ?`,
      [recipients.length, sent_count, campaign_id]
    );

    return { sent: sent_count, total: recipients.length };
  }

  async getRecipientsForCampaign(campaign) {
    // If no segment filter, send to all active subscribers
    if (!campaign.segment_filter) {
      return await db.all('SELECT * FROM email_subscribers WHERE status = ?', ['active']);
    }

    // Apply segment filter (tags, custom fields, etc.)
    const filter = JSON.parse(campaign.segment_filter);

    // TODO: Implement advanced segmentation logic

    return await db.all('SELECT * FROM email_subscribers WHERE status = ?', ['active']);
  }

  personalizeContent(content, subscriber) {
    if (!content) return '';

    return content
      .replace(/{{FIRST_NAME}}/g, subscriber.first_name || 'there')
      .replace(/{{LAST_NAME}}/g, subscriber.last_name || '')
      .replace(/{{EMAIL}}/g, subscriber.email);
  }

  addTracking(html, campaign_id, subscriber_id) {
    const token = this.generateTrackingToken(campaign_id, subscriber_id);

    // Add tracking pixel
    const trackingPixel = `<img src="${process.env.BASE_URL}/api/email-marketing/track/open/${campaign_id}/${subscriber_id}/${token}" width="1" height="1" style="display:none;" />`;

    // Wrap links with click tracking
    html = html.replace(/<a\s+href="([^"]+)"/gi, (match, url) => {
      const trackingUrl = `${process.env.BASE_URL}/api/email-marketing/track/click/${campaign_id}/${subscriber_id}/${token}?url=${encodeURIComponent(url)}`;
      return `<a href="${trackingUrl}"`;
    });

    return html + trackingPixel;
  }

  // ==================
  // AUTOMATIONS
  // ==================

  async createAutomation(automationData) {
    const { name, description, trigger_type, trigger_config, steps } = automationData;

    const result = await db.run(
      `INSERT INTO email_automations (name, description, trigger_type, trigger_config)
       VALUES (?, ?, ?, ?)`,
      [name, description, trigger_type, JSON.stringify(trigger_config)]
    );

    const automation_id = result.lastID;

    // Add steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      await db.run(
        `INSERT INTO email_automation_steps
         (automation_id, step_order, delay_value, delay_unit, subject, html_content, text_content)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [automation_id, i + 1, step.delay_value, step.delay_unit, step.subject, step.html_content, step.text_content]
      );
    }

    return { id: automation_id, ...automationData };
  }

  async triggerAutomation(automation_id, { subscriber_id, email }) {
    // Get subscriber
    let subscriber;
    if (subscriber_id) {
      subscriber = await db.get('SELECT * FROM email_subscribers WHERE id = ?', [subscriber_id]);
    } else if (email) {
      subscriber = await db.get('SELECT * FROM email_subscribers WHERE email = ?', [email]);
    }

    if (!subscriber) {
      throw new Error('Subscriber not found');
    }

    // Add to automation
    await db.run(
      'INSERT INTO email_automation_subscribers (automation_id, subscriber_id) VALUES (?, ?)',
      [automation_id, subscriber.id]
    );

    // Process first step immediately (if delay is 0)
    await this.processAutomationStep(automation_id, subscriber.id, 1);

    return { automation_id, subscriber_id: subscriber.id };
  }

  async processAutomationStep(automation_id, subscriber_id, step_order) {
    const step = await db.get(
      'SELECT * FROM email_automation_steps WHERE automation_id = ? AND step_order = ?',
      [automation_id, step_order]
    );

    if (!step) return; // No more steps

    const subscriber = await db.get('SELECT * FROM email_subscribers WHERE id = ?', [subscriber_id]);

    // Send email
    const personalizedHTML = this.personalizeContent(step.html_content, subscriber);
    const personalizedSubject = this.personalizeContent(step.subject, subscriber);

    await emailService.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: personalizedSubject,
      html: personalizedHTML,
      text: this.personalizeContent(step.text_content, subscriber)
    });

    // Record send
    await db.run(
      'INSERT INTO email_automation_sends (automation_id, step_id, subscriber_id) VALUES (?, ?, ?)',
      [automation_id, step.id, subscriber_id]
    );

    // Schedule next step
    if (step.delay_value && step.delay_value > 0) {
      // TODO: Implement delayed job queue (use node-cron or bull)
      // For now, we'll need to call this manually or set up a cron job
    } else {
      // Send next step immediately
      await this.processAutomationStep(automation_id, subscriber_id, step_order + 1);
    }
  }

  // ==================
  // TRACKING
  // ==================

  async trackOpen(campaign_id, subscriber_id, token) {
    // Verify token
    const expected_token = this.generateTrackingToken(campaign_id, subscriber_id);
    if (token !== expected_token) return;

    await db.run(
      `UPDATE email_campaign_sends
       SET opened_at = CURRENT_TIMESTAMP
       WHERE campaign_id = ? AND subscriber_id = ? AND opened_at IS NULL`,
      [campaign_id, subscriber_id]
    );

    // Update campaign stats
    await db.run(
      `UPDATE email_campaigns
       SET total_opened = (SELECT COUNT(*) FROM email_campaign_sends WHERE campaign_id = ? AND opened_at IS NOT NULL)
       WHERE id = ?`,
      [campaign_id, campaign_id]
    );
  }

  async trackClick(campaign_id, subscriber_id, url, token) {
    const expected_token = this.generateTrackingToken(campaign_id, subscriber_id);
    if (token !== expected_token) return;

    await db.run(
      'INSERT INTO email_campaign_clicks (campaign_id, subscriber_id, url) VALUES (?, ?, ?)',
      [campaign_id, subscriber_id, url]
    );

    // Mark as clicked
    await db.run(
      `UPDATE email_campaign_sends
       SET clicked_at = CURRENT_TIMESTAMP
       WHERE campaign_id = ? AND subscriber_id = ? AND clicked_at IS NULL`,
      [campaign_id, subscriber_id]
    );

    // Update campaign stats
    await db.run(
      `UPDATE email_campaigns
       SET total_clicked = (SELECT COUNT(DISTINCT subscriber_id) FROM email_campaign_sends WHERE campaign_id = ? AND clicked_at IS NOT NULL)
       WHERE id = ?`,
      [campaign_id, campaign_id]
    );
  }

  // ==================
  // UTILITIES
  // ==================

  generateConfirmationToken(email) {
    return crypto.createHash('sha256').update(email + process.env.SESSION_SECRET).digest('hex');
  }

  generateUnsubscribeToken(email) {
    return crypto.createHash('sha256').update(email + 'unsubscribe' + process.env.SESSION_SECRET).digest('hex');
  }

  generateTrackingToken(campaign_id, subscriber_id) {
    return crypto.createHash('sha256').update(`${campaign_id}:${subscriber_id}:${process.env.SESSION_SECRET}`).digest('hex');
  }

  async addTagToSubscriber(subscriber_id, tagName) {
    // Get or create tag
    let tag = await db.get('SELECT * FROM email_tags WHERE name = ?', [tagName]);

    if (!tag) {
      const result = await db.run('INSERT INTO email_tags (name) VALUES (?)', [tagName]);
      tag = { id: result.lastID, name: tagName };
    }

    // Add to subscriber
    await db.run(
      'INSERT OR IGNORE INTO email_subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)',
      [subscriber_id, tag.id]
    );
  }

  async sendConfirmationEmail(subscriber_id) {
    const subscriber = await db.get('SELECT * FROM email_subscribers WHERE id = ?', [subscriber_id]);
    const token = this.generateConfirmationToken(subscriber.email);
    const confirmUrl = `${process.env.BASE_URL}/confirm-email?email=${encodeURIComponent(subscriber.email)}&token=${token}`;

    await emailService.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: 'Please confirm your email subscription',
      html: `
        <h1>Confirm Your Subscription</h1>
        <p>Hi ${subscriber.first_name || 'there'},</p>
        <p>Please confirm your email subscription by clicking the link below:</p>
        <a href="${confirmUrl}">Confirm Subscription</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `
    });
  }
}

module.exports = new EmailMarketingService();
```

---

## 🎨 Frontend Implementation

### Admin Email Marketing Dashboard

**File:** `marketplace/frontend/admin-email-marketing.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Marketing - Admin Dashboard</title>
  <link rel="stylesheet" href="css/admin.css">
  <link rel="stylesheet" href="css/email-marketing.css">
</head>
<body>
  <div class="admin-container">
    <nav class="admin-sidebar">
      <h2>Email Marketing</h2>
      <ul>
        <li><a href="#dashboard" class="active">Dashboard</a></li>
        <li><a href="#subscribers">Subscribers</a></li>
        <li><a href="#campaigns">Campaigns</a></li>
        <li><a href="#automations">Automations</a></li>
        <li><a href="#templates">Templates</a></li>
      </ul>
    </nav>

    <main class="admin-main">
      <!-- Dashboard Section -->
      <section id="dashboard-section" class="active">
        <h1>Email Marketing Dashboard</h1>

        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Subscribers</h3>
            <p class="stat-number" id="total-subscribers">0</p>
            <span class="stat-change positive">+12% this month</span>
          </div>

          <div class="stat-card">
            <h3>Campaigns Sent</h3>
            <p class="stat-number" id="campaigns-sent">0</p>
            <span class="stat-change">This month</span>
          </div>

          <div class="stat-card">
            <h3>Avg Open Rate</h3>
            <p class="stat-number" id="avg-open-rate">0%</p>
            <span class="stat-change positive">+3% from last month</span>
          </div>

          <div class="stat-card">
            <h3>Revenue from Emails</h3>
            <p class="stat-number" id="email-revenue">$0</p>
            <span class="stat-change positive">+25% this month</span>
          </div>
        </div>

        <div class="recent-campaigns">
          <h2>Recent Campaigns</h2>
          <table id="recent-campaigns-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Sent</th>
                <th>Opens</th>
                <th>Clicks</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              <!-- Populated by JS -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- Subscribers Section -->
      <section id="subscribers-section">
        <div class="section-header">
          <h1>Subscribers</h1>
          <div class="actions">
            <button id="import-subscribers-btn">Import CSV</button>
            <button id="export-subscribers-btn">Export</button>
            <button id="add-subscriber-btn" class="primary">Add Subscriber</button>
          </div>
        </div>

        <div class="filters">
          <input type="search" id="subscriber-search" placeholder="Search by email or name...">
          <select id="status-filter">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <select id="tag-filter">
            <option value="">All Tags</option>
            <!-- Populated by JS -->
          </select>
        </div>

        <table id="subscribers-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Status</th>
              <th>Tags</th>
              <th>Subscribed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Populated by JS -->
          </tbody>
        </table>

        <div class="pagination" id="subscriber-pagination">
          <!-- Populated by JS -->
        </div>
      </section>

      <!-- Campaigns Section -->
      <section id="campaigns-section">
        <div class="section-header">
          <h1>Email Campaigns</h1>
          <button id="create-campaign-btn" class="primary">Create Campaign</button>
        </div>

        <div class="campaigns-list" id="campaigns-list">
          <!-- Populated by JS -->
        </div>
      </section>

      <!-- Automations Section -->
      <section id="automations-section">
        <div class="section-header">
          <h1>Email Automations</h1>
          <button id="create-automation-btn" class="primary">Create Automation</button>
        </div>

        <div class="automations-list" id="automations-list">
          <!-- Populated by JS -->
        </div>
      </section>
    </main>
  </div>

  <!-- Modals -->
  <div id="campaign-modal" class="modal">
    <!-- Campaign builder UI -->
  </div>

  <div id="automation-modal" class="modal">
    <!-- Automation builder UI -->
  </div>

  <script src="js/email-marketing-dashboard.js"></script>
</body>
</html>
```

---

## 📈 Analytics & Reporting

### Key Metrics to Track

1. **List Growth**
   - New subscribers (daily/weekly/monthly)
   - Unsubscribe rate
   - Bounce rate
   - Source breakdown (checkout, landing page, import)

2. **Campaign Performance**
   - Send rate (successfully delivered)
   - Open rate (opens / delivered)
   - Click-through rate (clicks / delivered)
   - Click-to-open rate (clicks / opens)
   - Conversion rate (purchases / clicks)
   - Revenue per email (total revenue / sent)

3. **Automation Performance**
   - Enrollment rate
   - Completion rate
   - Revenue per subscriber
   - Drop-off analysis

4. **Email Health**
   - Bounce rate (hard vs soft)
   - Complaint rate
   - Spam score
   - Deliverability issues

---

## 🚀 Deployment Checklist

### Email Provider Setup

**Recommended Providers:**

1. **SendGrid** (Free tier: 100 emails/day)
   - Pros: Easy setup, good deliverability, webhook support
   - Cons: Daily limits on free tier

2. **Mailgun** (Free tier: 5,000 emails/month)
   - Pros: Developer-friendly, robust API
   - Cons: Requires DNS configuration

3. **Amazon SES** (Pay as you go: $0.10/1000 emails)
   - Pros: Extremely cheap, scalable
   - Cons: Requires AWS account, verification process

**Setup Steps:**

1. Sign up for provider
2. Verify domain (SPF, DKIM, DMARC records)
3. Get API credentials
4. Add to `.env`:
   ```
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.xxxxx
   EMAIL_FROM_NAME=Teneo Books
   EMAIL_FROM_ADDRESS=hello@teneobooks.com
   ```

---

## 🎯 Pre-Built Automations to Include

### 1. Welcome Sequence (New Subscriber)
```
Day 0: Welcome + introduce brand
Day 2: Share most popular book
Day 5: Free sample chapter
Day 7: Limited-time discount (10% off)
```

### 2. Abandoned Cart Recovery
```
1 hour: "Still thinking?"
24 hours: "Don't miss out" + testimonial
48 hours: "Last chance" + discount
```

### 3. Post-Purchase Upsell
```
Day 1: Thank you + reading tips
Day 3: "Enjoying the book?" (request review)
Day 7: "Readers also bought..." (related books)
Day 14: Exclusive offer on next book
```

### 4. Re-Engagement (Inactive Subscribers)
```
30 days inactive: "We miss you" + new releases
60 days: Survey (why haven't you purchased?)
90 days: "Final goodbye" + unsubscribe option
```

---

## ✅ Success Criteria

**MVP Launch (2 weeks):**
- ✅ Subscriber database
- ✅ Import/export CSV
- ✅ Basic campaign builder
- ✅ Send broadcast emails
- ✅ Open/click tracking
- ✅ Welcome automation

**Full Launch (4-6 weeks):**
- ✅ All automations built
- ✅ Visual email editor
- ✅ Advanced segmentation
- ✅ A/B testing
- ✅ Revenue attribution
- ✅ Complete analytics dashboard

**Long-term:**
- ✅ AI email copy generation
- ✅ Predictive send times
- ✅ Behavioral triggers
- ✅ SMS marketing integration

---

**Next:** [SALES_FUNNELS_IMPLEMENTATION.md](./SALES_FUNNELS_IMPLEMENTATION.md)
