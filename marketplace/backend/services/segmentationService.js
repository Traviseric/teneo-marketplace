/**
 * Customer Segmentation Service
 * Handles automatic segmentation based on behavior and purchase history
 */

class SegmentationService {
  constructor(db) {
    this.db = db;
  }

  // ================================================
  // AUTO-SEGMENTATION (Run periodically)
  // ================================================

  /**
   * Update all automatic segments
   * Run this daily via cron
   */
  async updateAllSegments() {
    await this.updateHighValueCustomers();
    await this.updateVIPCustomers();
    await this.updateAbandonedCart();
    await this.updateRecentlyActive();
    await this.updateInactive();

    return { success: true };
  }

  /**
   * High Value Customers: 3+ purchases OR $100+ spent
   */
  async updateHighValueCustomers() {
    const segment = await this.db.get(
      `SELECT id FROM segments WHERE name = 'High Value Customers'`
    );

    if (!segment) return;

    // Clear existing
    await this.db.run(
      `DELETE FROM subscriber_segments WHERE segment_id = ?`,
      [segment.id]
    );

    // Find high value subscribers
    const highValue = await this.db.all(
      `SELECT subscriber_id
       FROM subscriber_activity
       WHERE total_purchases >= 3 OR total_revenue >= 100`
    );

    // Add to segment
    for (const sub of highValue) {
      await this.db.run(
        `INSERT OR IGNORE INTO subscriber_segments (subscriber_id, segment_id)
         VALUES (?, ?)`,
        [sub.subscriber_id, segment.id]
      );
    }

    console.log(`Updated High Value Customers: ${highValue.length}`);
    return highValue.length;
  }

  /**
   * VIP Customers: 10+ purchases OR $500+ spent
   */
  async updateVIPCustomers() {
    const segment = await this.db.get(
      `SELECT id FROM segments WHERE name = 'VIP'`
    );

    if (!segment) return;

    await this.db.run(
      `DELETE FROM subscriber_segments WHERE segment_id = ?`,
      [segment.id]
    );

    const vips = await this.db.all(
      `SELECT subscriber_id
       FROM subscriber_activity
       WHERE total_purchases >= 10 OR total_revenue >= 500`
    );

    for (const sub of vips) {
      await this.db.run(
        `INSERT OR IGNORE INTO subscriber_segments (subscriber_id, segment_id)
         VALUES (?, ?)`,
        [sub.subscriber_id, segment.id]
      );
    }

    console.log(`Updated VIP Customers: ${vips.length}`);
    return vips.length;
  }

  /**
   * Abandoned Cart: Added to cart in last 7 days, didn't buy
   */
  async updateAbandonedCart() {
    const segment = await this.db.get(
      `SELECT id FROM segments WHERE name = 'Abandoned Cart'`
    );

    if (!segment) return;

    await this.db.run(
      `DELETE FROM subscriber_segments WHERE segment_id = ?`,
      [segment.id]
    );

    // Find subscribers who added to cart but didn't purchase
    const abandoned = await this.db.all(
      `SELECT DISTINCT ae.subscriber_id
       FROM analytics_events ae
       WHERE ae.event_type = 'add_to_cart'
         AND ae.created_at >= datetime('now', '-7 days')
         AND ae.subscriber_id NOT IN (
           SELECT subscriber_id FROM analytics_events
           WHERE event_type = 'purchase'
             AND created_at >= datetime('now', '-7 days')
         )`
    );

    for (const sub of abandoned) {
      if (sub.subscriber_id) {
        await this.db.run(
          `INSERT OR IGNORE INTO subscriber_segments (subscriber_id, segment_id)
           VALUES (?, ?)`,
          [sub.subscriber_id, segment.id]
        );
      }
    }

    console.log(`Updated Abandoned Cart: ${abandoned.length}`);
    return abandoned.length;
  }

  /**
   * Recently Active: Engaged in last 30 days
   */
  async updateRecentlyActive() {
    const segment = await this.db.get(
      `SELECT id FROM segments WHERE name = 'Recently Active'`
    );

    if (!segment) return;

    await this.db.run(
      `DELETE FROM subscriber_segments WHERE segment_id = ?`,
      [segment.id]
    );

    const active = await this.db.all(
      `SELECT subscriber_id
       FROM subscriber_activity
       WHERE last_active_at >= datetime('now', '-30 days')`
    );

    for (const sub of active) {
      await this.db.run(
        `INSERT OR IGNORE INTO subscriber_segments (subscriber_id, segment_id)
         VALUES (?, ?)`,
        [sub.subscriber_id, segment.id]
      );
    }

    console.log(`Updated Recently Active: ${active.length}`);
    return active.length;
  }

  /**
   * Inactive: No engagement in 90+ days
   */
  async updateInactive() {
    const segment = await this.db.get(
      `SELECT id FROM segments WHERE name = 'Inactive'`
    );

    if (!segment) return;

    await this.db.run(
      `DELETE FROM subscriber_segments WHERE segment_id = ?`,
      [segment.id]
    );

    const inactive = await this.db.all(
      `SELECT subscriber_id
       FROM subscriber_activity
       WHERE last_active_at < datetime('now', '-90 days')
         OR last_active_at IS NULL`
    );

    for (const sub of inactive) {
      await this.db.run(
        `INSERT OR IGNORE INTO subscriber_segments (subscriber_id, segment_id)
         VALUES (?, ?)`,
        [sub.subscriber_id, segment.id]
      );
    }

    console.log(`Updated Inactive: ${inactive.length}`);
    return inactive.length;
  }

  // ================================================
  // BEHAVIOR-BASED TAGGING
  // ================================================

  /**
   * Auto-tag subscriber based on purchase
   */
  async tagFromPurchase(subscriberId, bookTitle, bookCategory) {
    const emailMktService = require('./emailMarketingService');
    const ems = new emailMktService(this.db);

    // Tag by book category
    if (bookCategory) {
      await ems.tagSubscriber(subscriberId, `${bookCategory}_buyer`);
    }

    // Tag as book buyer
    await ems.tagSubscriber(subscriberId, 'book_buyer');

    // Tag specific interests based on book title
    if (bookTitle.toLowerCase().includes('irs')) {
      await ems.tagSubscriber(subscriberId, 'irs_books');
    }
    if (bookTitle.toLowerCase().includes('medical')) {
      await ems.tagSubscriber(subscriberId, 'medical_books');
    }
    if (bookTitle.toLowerCase().includes('student loan')) {
      await ems.tagSubscriber(subscriberId, 'student_loan_books');
    }
  }

  /**
   * Auto-tag based on email engagement
   */
  async updateEngagementTags() {
    // Find engaged subscribers (opened 3+ emails in last 30 days)
    const engaged = await this.db.all(
      `SELECT subscriber_id, COUNT(*) as open_count
       FROM email_sends
       WHERE opened_at >= datetime('now', '-30 days')
       GROUP BY subscriber_id
       HAVING open_count >= 3`
    );

    const emailMktService = require('./emailMarketingService');
    const ems = new emailMktService(this.db);

    for (const sub of engaged) {
      await ems.tagSubscriber(sub.subscriber_id, 'email_engaged');

      // Remove inactive tag if present
      await this.db.run(
        `DELETE FROM subscriber_tags
         WHERE subscriber_id = ?
           AND tag_id = (SELECT id FROM tags WHERE name = 'email_inactive')`,
        [sub.subscriber_id]
      );
    }

    // Find inactive subscribers (no opens in 60+ days)
    const inactive = await this.db.all(
      `SELECT DISTINCT sa.subscriber_id
       FROM subscriber_activity sa
       WHERE sa.last_email_opened_at < datetime('now', '-60 days')
         OR sa.last_email_opened_at IS NULL`
    );

    for (const sub of inactive) {
      await ems.tagSubscriber(sub.subscriber_id, 'email_inactive');

      // Remove engaged tag if present
      await this.db.run(
        `DELETE FROM subscriber_tags
         WHERE subscriber_id = ?
           AND tag_id = (SELECT id FROM tags WHERE name = 'email_engaged')`,
        [sub.subscriber_id]
      );
    }

    console.log(`Updated engagement tags: ${engaged.length} engaged, ${inactive.length} inactive`);
  }

  // ================================================
  // DYNAMIC SEGMENTS (Rule-based)
  // ================================================

  /**
   * Create dynamic segment with JSON rules
   */
  async createDynamicSegment(name, description, rules) {
    const result = await this.db.run(
      `INSERT INTO segments (name, description, type, rules)
       VALUES (?, ?, 'dynamic', ?)`,
      [name, description, JSON.stringify(rules)]
    );

    return { id: result.lastID };
  }

  /**
   * Evaluate dynamic segment rules
   *
   * Example rules:
   * {
   *   "conditions": [
   *     {"field": "total_purchases", "operator": ">", "value": 5},
   *     {"field": "tags", "operator": "contains", "value": "irs_books"}
   *   ],
   *   "logic": "AND"
   * }
   */
  async evaluateDynamicSegment(segmentId) {
    const segment = await this.db.get(
      `SELECT * FROM segments WHERE id = ? AND type = 'dynamic'`,
      [segmentId]
    );

    if (!segment || !segment.rules) {
      throw new Error('Invalid dynamic segment');
    }

    const rules = JSON.parse(segment.rules);
    const { conditions, logic = 'AND' } = rules;

    // Build SQL query from rules
    let whereClauses = [];
    let params = [];

    for (const condition of conditions) {
      const { field, operator, value } = condition;

      if (field === 'tags') {
        if (operator === 'contains') {
          whereClauses.push(`
            EXISTS (
              SELECT 1 FROM subscriber_tags st
              JOIN tags t ON st.tag_id = t.id
              WHERE st.subscriber_id = s.id AND t.name = ?
            )
          `);
          params.push(value);
        }
      } else {
        // Activity fields
        const sqlOperator = this.getSQLOperator(operator);
        whereClauses.push(`sa.${field} ${sqlOperator} ?`);
        params.push(value);
      }
    }

    const whereClause = whereClauses.join(` ${logic} `);

    const query = `
      SELECT s.id as subscriber_id
      FROM subscribers s
      JOIN subscriber_activity sa ON s.id = sa.subscriber_id
      WHERE s.status = 'active' AND (${whereClause})
    `;

    const matches = await this.db.all(query, params);

    // Clear and repopulate segment
    await this.db.run(
      `DELETE FROM subscriber_segments WHERE segment_id = ?`,
      [segmentId]
    );

    for (const match of matches) {
      await this.db.run(
        `INSERT INTO subscriber_segments (subscriber_id, segment_id)
         VALUES (?, ?)`,
        [match.subscriber_id, segmentId]
      );
    }

    console.log(`Evaluated dynamic segment "${segment.name}": ${matches.length} matches`);
    return matches.length;
  }

  /**
   * Helper: Convert operator to SQL
   */
  getSQLOperator(operator) {
    const map = {
      '>': '>',
      '>=': '>=',
      '<': '<',
      '<=': '<=',
      '=': '=',
      '!=': '!=',
      'equals': '=',
      'not_equals': '!='
    };
    return map[operator] || '=';
  }

  // ================================================
  // ENGAGEMENT SCORING
  // ================================================

  /**
   * Calculate engagement score (0-100) for all subscribers
   */
  async calculateEngagementScores() {
    const subscribers = await this.db.all(
      `SELECT id FROM subscribers WHERE status = 'active'`
    );

    for (const sub of subscribers) {
      const score = await this.calculateEngagementScore(sub.id);
      await this.db.run(
        `UPDATE subscriber_activity
         SET engagement_score = ?, updated_at = CURRENT_TIMESTAMP
         WHERE subscriber_id = ?`,
        [score, sub.id]
      );
    }

    console.log(`Updated engagement scores for ${subscribers.length} subscribers`);
  }

  /**
   * Calculate individual engagement score
   *
   * Scoring criteria:
   * - Email opens: 20 points
   * - Email clicks: 30 points
   * - Purchases: 40 points
   * - Recency: 10 points
   */
  async calculateEngagementScore(subscriberId) {
    const activity = await this.db.get(
      `SELECT * FROM subscriber_activity WHERE subscriber_id = ?`,
      [subscriberId]
    );

    if (!activity) return 0;

    let score = 0;

    // Email engagement (max 50 points)
    const openRate = activity.total_emails_sent > 0
      ? (activity.total_emails_opened / activity.total_emails_sent)
      : 0;
    const clickRate = activity.total_emails_opened > 0
      ? (activity.total_emails_clicked / activity.total_emails_opened)
      : 0;

    score += Math.min(openRate * 100, 20); // Max 20 for opens
    score += Math.min(clickRate * 150, 30); // Max 30 for clicks

    // Purchase behavior (max 40 points)
    score += Math.min(activity.total_purchases * 5, 20); // Max 20 for purchase count
    score += Math.min(activity.total_revenue / 10, 20); // Max 20 for revenue

    // Recency (max 10 points)
    if (activity.last_active_at) {
      const daysSinceActive = Math.floor(
        (Date.now() - new Date(activity.last_active_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActive <= 7) score += 10;
      else if (daysSinceActive <= 30) score += 7;
      else if (daysSinceActive <= 60) score += 4;
      else if (daysSinceActive <= 90) score += 2;
    }

    return Math.min(Math.round(score), 100);
  }

  // ================================================
  // ANALYTICS & REPORTING
  // ================================================

  /**
   * Get segment breakdown
   */
  async getSegmentBreakdown() {
    return await this.db.all(
      `SELECT
         s.id,
         s.name,
         s.description,
         COUNT(DISTINCT ss.subscriber_id) as subscriber_count,
         s.type
       FROM segments s
       LEFT JOIN subscriber_segments ss ON s.id = ss.segment_id
       LEFT JOIN subscribers sub ON ss.subscriber_id = sub.id AND sub.status = 'active'
       GROUP BY s.id
       ORDER BY subscriber_count DESC`
    );
  }

  /**
   * Get tag breakdown
   */
  async getTagBreakdown() {
    return await this.db.all(
      `SELECT
         t.id,
         t.name,
         t.color,
         COUNT(DISTINCT st.subscriber_id) as subscriber_count
       FROM tags t
       LEFT JOIN subscriber_tags st ON t.id = st.tag_id
       LEFT JOIN subscribers s ON st.subscriber_id = s.id AND s.status = 'active'
       GROUP BY t.id
       ORDER BY subscriber_count DESC`
    );
  }

  /**
   * Get subscribers by segment
   */
  async getSubscribersBySegment(segmentId, limit = 100, offset = 0) {
    return await this.db.all(
      `SELECT
         s.*,
         sa.engagement_score,
         sa.total_purchases,
         sa.total_revenue,
         sa.last_active_at
       FROM subscribers s
       JOIN subscriber_segments ss ON s.id = ss.subscriber_id
       LEFT JOIN subscriber_activity sa ON s.id = sa.subscriber_id
       WHERE ss.segment_id = ? AND s.status = 'active'
       ORDER BY sa.engagement_score DESC
       LIMIT ? OFFSET ?`,
      [segmentId, limit, offset]
    );
  }
}

module.exports = SegmentationService;
