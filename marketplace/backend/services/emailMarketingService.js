/**
 * Email Marketing Service
 * Handles subscriber management, email sending, template processing
 */

const crypto = require('crypto');
const emailService = require('./emailService');

class EmailMarketingService {
  constructor(db) {
    this.db = db;
  }

  // ================================================
  // SUBSCRIBER MANAGEMENT
  // ================================================

  /**
   * Add new subscriber with double opt-in
   */
  async addSubscriber(data) {
    const {
      email,
      name = null,
      source = 'unknown',
      ipAddress = null,
      userAgent = null
    } = data;

    // Generate tokens
    const confirmToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    try {
      const result = await this.db.run(
        `INSERT INTO subscribers
         (email, name, source, ip_address, user_agent, confirm_token, unsubscribe_token, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [email, name, source, ipAddress, userAgent, confirmToken, unsubscribeToken]
      );

      const subscriberId = result.lastID;

      // Send confirmation email (optional double opt-in)
      await this.sendConfirmationEmail(subscriberId, email, confirmToken);

      // Add to "All Subscribers" segment
      const allSubsSegment = await this.db.get(
        `SELECT id FROM segments WHERE name = 'All Subscribers'`
      );
      if (allSubsSegment) {
        await this.addSubscriberToSegment(subscriberId, allSubsSegment.id);
      }

      // Add to "Leads" segment (no purchase yet)
      const leadsSegment = await this.db.get(
        `SELECT id FROM segments WHERE name = 'Leads'`
      );
      if (leadsSegment) {
        await this.addSubscriberToSegment(subscriberId, leadsSegment.id);
      }

      // Initialize activity record
      await this.db.run(
        `INSERT INTO subscriber_activity (subscriber_id) VALUES (?)`,
        [subscriberId]
      );

      return {
        id: subscriberId,
        email,
        confirmToken,
        unsubscribeToken
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Email already subscribed');
      }
      throw error;
    }
  }

  /**
   * Confirm subscriber (double opt-in)
   */
  async confirmSubscriber(token) {
    const subscriber = await this.db.get(
      `SELECT id, email FROM subscribers WHERE confirm_token = ?`,
      [token]
    );

    if (!subscriber) {
      throw new Error('Invalid confirmation token');
    }

    await this.db.run(
      `UPDATE subscribers
       SET confirmed = 1, confirmed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [subscriber.id]
    );

    // Trigger welcome sequence
    await this.enrollInSequence(subscriber.id, 'Welcome Sequence');

    return subscriber;
  }

  /**
   * Unsubscribe
   */
  async unsubscribe(token) {
    const result = await this.db.run(
      `UPDATE subscribers
       SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP
       WHERE unsubscribe_token = ?`,
      [token]
    );

    if (result.changes === 0) {
      throw new Error('Invalid unsubscribe token');
    }

    return { success: true };
  }

  /**
   * Get subscriber by email
   */
  async getSubscriberByEmail(email) {
    return await this.db.get(
      `SELECT s.*, sa.*
       FROM subscribers s
       LEFT JOIN subscriber_activity sa ON s.id = sa.subscriber_id
       WHERE s.email = ?`,
      [email]
    );
  }

  /**
   * Update subscriber tags
   */
  async tagSubscriber(subscriberId, tagName) {
    // Get or create tag
    let tag = await this.db.get(
      `SELECT id FROM tags WHERE name = ?`,
      [tagName]
    );

    if (!tag) {
      const result = await this.db.run(
        `INSERT INTO tags (name) VALUES (?)`,
        [tagName]
      );
      tag = { id: result.lastID };
    }

    // Add tag to subscriber
    try {
      await this.db.run(
        `INSERT INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)`,
        [subscriberId, tag.id]
      );
    } catch (error) {
      // Already tagged, ignore
    }

    return tag;
  }

  /**
   * Add subscriber to segment
   */
  async addSubscriberToSegment(subscriberId, segmentId) {
    try {
      await this.db.run(
        `INSERT INTO subscriber_segments (subscriber_id, segment_id) VALUES (?, ?)`,
        [subscriberId, segmentId]
      );
    } catch (error) {
      // Already in segment, ignore
    }
  }

  /**
   * Move subscriber from Leads to Buyers segment
   */
  async markAsBuyer(subscriberId) {
    // Remove from Leads
    const leadsSegment = await this.db.get(
      `SELECT id FROM segments WHERE name = 'Leads'`
    );
    if (leadsSegment) {
      await this.db.run(
        `DELETE FROM subscriber_segments WHERE subscriber_id = ? AND segment_id = ?`,
        [subscriberId, leadsSegment.id]
      );
    }

    // Add to Buyers
    const buyersSegment = await this.db.get(
      `SELECT id FROM segments WHERE name = 'Buyers'`
    );
    if (buyersSegment) {
      await this.addSubscriberToSegment(subscriberId, buyersSegment.id);
    }

    // Trigger buyer sequence
    await this.enrollInSequence(subscriberId, 'Book Buyer Sequence');
  }

  // ================================================
  // SEQUENCE MANAGEMENT
  // ================================================

  /**
   * Enroll subscriber in email sequence
   */
  async enrollInSequence(subscriberId, sequenceName) {
    const sequence = await this.db.get(
      `SELECT id FROM email_sequences WHERE name = ? AND active = 1`,
      [sequenceName]
    );

    if (!sequence) {
      console.warn(`Sequence "${sequenceName}" not found or inactive`);
      return null;
    }

    // Check if already enrolled
    const existing = await this.db.get(
      `SELECT id FROM subscriber_sequences
       WHERE subscriber_id = ? AND sequence_id = ? AND status = 'active'`,
      [subscriberId, sequence.id]
    );

    if (existing) {
      return existing;
    }

    // Enroll
    const result = await this.db.run(
      `INSERT INTO subscriber_sequences (subscriber_id, sequence_id, status)
       VALUES (?, ?, 'active')`,
      [subscriberId, sequence.id]
    );

    return { id: result.lastID, sequenceId: sequence.id };
  }

  /**
   * Get pending sequence emails to send
   * Returns emails that should be sent based on delay settings
   */
  async getPendingSequenceEmails() {
    const pending = await this.db.all(
      `SELECT
         ss.id as subscriber_sequence_id,
         ss.subscriber_id,
         ss.started_at,
         s.email,
         s.name as subscriber_name,
         seq.id as sequence_id,
         seq.name as sequence_name,
         se.id as sequence_email_id,
         se.delay_days,
         se.delay_hours,
         se.template_id,
         se.subject_override,
         t.subject as template_subject,
         t.body_html,
         t.body_text,
         t.from_name,
         t.from_email,
         t.reply_to
       FROM subscriber_sequences ss
       JOIN subscribers s ON ss.subscriber_id = s.id
       JOIN email_sequences seq ON ss.sequence_id = seq.id
       JOIN sequence_emails se ON seq.id = se.sequence_id
       JOIN email_templates t ON se.template_id = t.id
       WHERE ss.status = 'active'
         AND s.status = 'active'
         AND se.active = 1
         AND NOT EXISTS (
           SELECT 1 FROM email_sends es
           WHERE es.subscriber_id = ss.subscriber_id
             AND es.sequence_email_id = se.id
         )
         AND datetime(ss.started_at, '+' || se.delay_days || ' days', '+' || se.delay_hours || ' hours') <= datetime('now')
       ORDER BY ss.started_at ASC`
    );

    return pending;
  }

  /**
   * Inject tracking pixel and wrapped click URLs into an HTML email body.
   * Returns the modified HTML.
   */
  injectTracking(html, sendId) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

    // Wrap absolute http/https links with click tracker
    const tracked = html.replace(
      /href="(https?:\/\/[^"]+)"/gi,
      (_, url) => `href="${baseUrl}/api/email/track/click/${sendId}?url=${encodeURIComponent(url)}"`
    );

    // Append 1×1 tracking pixel before </body>, or at end if no </body> tag
    const pixel = `<img src="${baseUrl}/api/email/track/open/${sendId}" width="1" height="1" alt="" style="display:none;border:0">`;
    return tracked.includes('</body>')
      ? tracked.replace('</body>', `${pixel}</body>`)
      : tracked + pixel;
  }

  /**
   * Send sequence email
   */
  async sendSequenceEmail(sequenceEmailData) {
    const {
      subscriber_sequence_id,
      subscriber_id,
      sequence_email_id,
      email,
      subscriber_name,
      subject_override,
      template_subject,
      body_html,
      body_text,
      from_name,
      from_email,
      reply_to,
      template_id
    } = sequenceEmailData;

    const subject = subject_override || template_subject;

    // Process template variables
    const processedHtml = this.processTemplateVariables(body_html, {
      SUBSCRIBER_NAME: subscriber_name || 'there',
      SUBSCRIBER_EMAIL: email
    });

    const processedText = this.processTemplateVariables(body_text || '', {
      SUBSCRIBER_NAME: subscriber_name || 'there',
      SUBSCRIBER_EMAIL: email
    });

    // Pre-insert send record so we have an ID to embed in tracking URLs
    const sendRecord = await this.db.run(
      `INSERT INTO email_sends
       (subscriber_id, email_type, sequence_email_id, template_id, subject, from_email, to_email, status, sent_at)
       VALUES (?, 'sequence', ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [subscriber_id, sequence_email_id, template_id, subject, from_email, email]
    );
    const sendId = sendRecord.lastID;

    // Inject open pixel and wrapped click URLs
    const trackedHtml = this.injectTracking(processedHtml, sendId);

    try {
      // Send via email service
      await emailService.sendEmail({
        to: email,
        subject,
        html: trackedHtml,
        text: processedText,
        from: `${from_name} <${from_email}>`,
        replyTo: reply_to
      });

      // Mark as sent
      await this.db.run(
        `UPDATE email_sends SET status = 'sent' WHERE id = ?`,
        [sendId]
      );

      // Update activity
      await this.db.run(
        `UPDATE subscriber_activity
         SET total_emails_sent = total_emails_sent + 1,
             last_email_sent_at = CURRENT_TIMESTAMP
         WHERE subscriber_id = ?`,
        [subscriber_id]
      );

      return { success: true, sendId };
    } catch (error) {
      // Mark as failed
      await this.db.run(
        `UPDATE email_sends SET status = 'failed', error_message = ? WHERE id = ?`,
        [error.message, sendId]
      ).catch(() => {});

      throw error;
    }
  }

  /**
   * Get open/click stats for a specific email send.
   * Returns open_count, click_count, unique_opens.
   */
  async getEmailStats(sendId) {
    const [send, openCount, clickCount, uniqueOpens] = await Promise.all([
      this.db.get(
        'SELECT id, to_email, subject, status, sent_at, opened_at, clicked_at FROM email_sends WHERE id = ?',
        [sendId]
      ),
      this.db.get(
        `SELECT COUNT(*) AS count FROM email_events WHERE send_id = ? AND event_type = 'open'`,
        [sendId]
      ),
      this.db.get(
        `SELECT COUNT(*) AS count FROM email_events WHERE send_id = ? AND event_type = 'click'`,
        [sendId]
      ),
      this.db.get(
        `SELECT COUNT(DISTINCT ip_address) AS count FROM email_events WHERE send_id = ? AND event_type = 'open'`,
        [sendId]
      )
    ]);

    return {
      sendId,
      send: send || null,
      stats: {
        open_count: openCount ? openCount.count : 0,
        click_count: clickCount ? clickCount.count : 0,
        unique_opens: uniqueOpens ? uniqueOpens.count : 0
      }
    };
  }

  // ================================================
  // BROADCAST CAMPAIGNS
  // ================================================

  /**
   * Create broadcast campaign
   */
  async createBroadcast(data) {
    const {
      name,
      templateId,
      segmentIds = [],
      tagIds = [],
      subjectOverride = null,
      scheduledAt = null
    } = data;

    const result = await this.db.run(
      `INSERT INTO email_broadcasts
       (name, template_id, segment_ids, tag_ids, subject_override, scheduled_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      [
        name,
        templateId,
        segmentIds.join(','),
        tagIds.join(','),
        subjectOverride,
        scheduledAt
      ]
    );

    return { id: result.lastID };
  }

  /**
   * Get recipients for broadcast
   */
  async getBroadcastRecipients(broadcastId) {
    const broadcast = await this.db.get(
      `SELECT * FROM email_broadcasts WHERE id = ?`,
      [broadcastId]
    );

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    const segmentIds = broadcast.segment_ids ? broadcast.segment_ids.split(',') : [];
    const tagIds = broadcast.tag_ids ? broadcast.tag_ids.split(',') : [];

    let query = `SELECT DISTINCT s.* FROM subscribers s WHERE s.status = 'active'`;
    const params = [];

    if (segmentIds.length > 0) {
      query += ` AND EXISTS (
        SELECT 1 FROM subscriber_segments ss
        WHERE ss.subscriber_id = s.id AND ss.segment_id IN (${segmentIds.map(() => '?').join(',')})
      )`;
      params.push(...segmentIds);
    }

    if (tagIds.length > 0) {
      query += ` AND EXISTS (
        SELECT 1 FROM subscriber_tags st
        WHERE st.subscriber_id = s.id AND st.tag_id IN (${tagIds.map(() => '?').join(',')})
      )`;
      params.push(...tagIds);
    }

    const recipients = await this.db.all(query, params);
    return recipients;
  }

  /**
   * Send broadcast
   */
  async sendBroadcast(broadcastId) {
    const broadcast = await this.db.get(
      `SELECT b.*, t.* FROM email_broadcasts b
       JOIN email_templates t ON b.template_id = t.id
       WHERE b.id = ?`,
      [broadcastId]
    );

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    const recipients = await this.getBroadcastRecipients(broadcastId);

    // Update broadcast status
    await this.db.run(
      `UPDATE email_broadcasts
       SET status = 'sending', total_recipients = ?, sent_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [recipients.length, broadcastId]
    );

    const subject = broadcast.subject_override || broadcast.subject;

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        const processedHtml = this.processTemplateVariables(broadcast.body_html, {
          SUBSCRIBER_NAME: recipient.name || 'there',
          SUBSCRIBER_EMAIL: recipient.email
        });

        await emailService.sendEmail({
          to: recipient.email,
          subject,
          html: processedHtml,
          text: broadcast.body_text,
          from: `${broadcast.from_name} <${broadcast.from_email}>`,
          replyTo: broadcast.reply_to
        });

        // Log send
        await this.db.run(
          `INSERT INTO email_sends
           (subscriber_id, email_type, broadcast_id, template_id, subject, from_email, to_email, status, sent_at)
           VALUES (?, 'broadcast', ?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)`,
          [recipient.id, broadcastId, broadcast.template_id, subject, broadcast.from_email, recipient.email]
        );

        // Update broadcast count
        await this.db.run(
          `UPDATE email_broadcasts SET sent_count = sent_count + 1 WHERE id = ?`,
          [broadcastId]
        );
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
      }
    }

    // Mark complete
    await this.db.run(
      `UPDATE email_broadcasts SET status = 'sent' WHERE id = ?`,
      [broadcastId]
    );

    return { sent: recipients.length };
  }

  // ================================================
  // TRANSACTIONAL EMAILS
  // ================================================

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderId, subscriberEmail) {
    // Get or create subscriber
    let subscriber = await this.getSubscriberByEmail(subscriberEmail);

    if (!subscriber) {
      // Auto-add as subscriber on purchase
      subscriber = await this.addSubscriber({
        email: subscriberEmail,
        source: 'purchase'
      });
    }

    // Move to Buyers segment
    await this.markAsBuyer(subscriber.id);

    // Get order confirmation template
    const template = await this.db.get(
      `SELECT * FROM email_templates WHERE category = 'transactional' AND name LIKE '%order%' LIMIT 1`
    );

    if (!template) {
      console.warn('Order confirmation template not found');
      return null;
    }

    // Send email (implement based on your order data structure)
    // This is a placeholder - you'll need to fetch order details
    const subject = template.subject.replace('{{ORDER_ID}}', orderId);

    await emailService.sendEmail({
      to: subscriberEmail,
      subject,
      html: this.processTemplateVariables(template.body_html, {
        ORDER_ID: orderId,
        SUBSCRIBER_EMAIL: subscriberEmail
      }),
      from: `${template.from_name} <${template.from_email}>`
    });

    // Log send
    await this.db.run(
      `INSERT INTO email_sends
       (subscriber_id, email_type, template_id, subject, from_email, to_email, status, sent_at)
       VALUES (?, 'transactional', ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)`,
      [subscriber.id, template.id, subject, template.from_email, subscriberEmail]
    );

    return { success: true };
  }

  /**
   * Send confirmation email
   */
  async sendConfirmationEmail(subscriberId, email, confirmToken) {
    const confirmUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/confirm/${confirmToken}`;

    const template = await this.db.get(
      `SELECT * FROM email_templates WHERE name = 'Double Opt-In Confirmation'`
    );

    if (!template) {
      console.warn('Confirmation template not found');
      return null;
    }

    const processedHtml = this.processTemplateVariables(template.body_html, {
      CONFIRM_URL: confirmUrl,
      SUBSCRIBER_EMAIL: email
    });

    await emailService.sendEmail({
      to: email,
      subject: template.subject,
      html: processedHtml,
      text: template.body_text,
      from: `${template.from_name} <${template.from_email}>`
    });
  }

  // ================================================
  // UTILITIES
  // ================================================

  /**
   * Process template variables
   */
  processTemplateVariables(template, variables) {
    let processed = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value || '');
    }

    return processed;
  }

  /**
   * Process pending sequence emails (run via cron)
   */
  async processPendingSequenceEmails() {
    const pending = await this.getPendingSequenceEmails();

    console.log(`Processing ${pending.length} pending sequence emails`);

    for (const email of pending) {
      try {
        await this.sendSequenceEmail(email);
      } catch (error) {
        console.error(`Failed to send sequence email:`, error);
      }
    }

    return { processed: pending.length };
  }
}

module.exports = EmailMarketingService;
