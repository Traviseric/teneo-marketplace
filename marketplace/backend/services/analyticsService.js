/**
 * Analytics & Tracking Service
 * Handles event tracking, funnel analysis, conversion metrics
 */

class AnalyticsService {
  constructor(db) {
    this.db = db;
  }

  // ================================================
  // EVENT TRACKING
  // ================================================

  /**
   * Track analytics event
   */
  async trackEvent(data) {
    const {
      eventType,
      subscriberId = null,
      sessionId = null,
      userId = null,
      pageUrl = null,
      referrer = null,
      ipAddress = null,
      userAgent = null,
      eventData = {}
    } = data;

    const result = await this.db.run(
      `INSERT INTO analytics_events
       (event_type, subscriber_id, session_id, user_id, page_url, referrer, ip_address, user_agent, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventType,
        subscriberId,
        sessionId,
        userId,
        pageUrl,
        referrer,
        ipAddress,
        userAgent,
        JSON.stringify(eventData)
      ]
    );

    // Update subscriber last_active_at
    if (subscriberId) {
      await this.db.run(
        `UPDATE subscriber_activity
         SET last_active_at = CURRENT_TIMESTAMP
         WHERE subscriber_id = ?`,
        [subscriberId]
      );
    }

    // Handle specific event types
    await this.handleEventSideEffects(eventType, subscriberId, eventData);

    return { id: result.lastID };
  }

  /**
   * Handle side effects of events (segmentation, tagging, etc.)
   */
  async handleEventSideEffects(eventType, subscriberId, eventData) {
    if (!subscriberId) return;

    const SegmentationService = require('./segmentationService');
    const segService = new SegmentationService(this.db);

    const EmailMarketingService = require('./emailMarketingService');
    const emailService = new EmailMarketingService(this.db);

    switch (eventType) {
      case 'purchase':
        // Update purchase stats
        await this.db.run(
          `UPDATE subscriber_activity
           SET total_purchases = total_purchases + 1,
               total_revenue = total_revenue + ?,
               last_purchase_at = CURRENT_TIMESTAMP
           WHERE subscriber_id = ?`,
          [eventData.amount || 0, subscriberId]
        );

        // Tag from purchase
        if (eventData.bookTitle && eventData.bookCategory) {
          await segService.tagFromPurchase(subscriberId, eventData.bookTitle, eventData.bookCategory);
        }

        // Mark as buyer (moves from Leads to Buyers segment)
        await emailService.markAsBuyer(subscriberId);
        break;

      case 'email_open':
        await this.db.run(
          `UPDATE subscriber_activity
           SET total_emails_opened = total_emails_opened + 1,
               last_email_opened_at = CURRENT_TIMESTAMP
           WHERE subscriber_id = ?`,
          [subscriberId]
        );

        // Update email_sends record
        if (eventData.sendId) {
          await this.db.run(
            `UPDATE email_sends
             SET opened_at = CURRENT_TIMESTAMP
             WHERE id = ? AND opened_at IS NULL`,
            [eventData.sendId]
          );
        }
        break;

      case 'email_click':
        await this.db.run(
          `UPDATE subscriber_activity
           SET total_emails_clicked = total_emails_clicked + 1,
               last_email_clicked_at = CURRENT_TIMESTAMP
           WHERE subscriber_id = ?`,
          [subscriberId]
        );

        // Update email_sends record
        if (eventData.sendId) {
          await this.db.run(
            `UPDATE email_sends
             SET clicked_at = CURRENT_TIMESTAMP
             WHERE id = ? AND clicked_at IS NULL`,
            [eventData.sendId]
          );

          // Track link
          await this.db.run(
            `INSERT INTO email_links (send_id, url, clicks, unique_clicks, first_clicked_at, last_clicked_at)
             VALUES (?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT(send_id, url) DO UPDATE SET
               clicks = clicks + 1,
               last_clicked_at = CURRENT_TIMESTAMP`,
            [eventData.sendId, eventData.url]
          );
        }
        break;

      case 'add_to_cart':
        // Will be picked up by abandoned cart segmentation
        break;

      case 'territory_view':
        await emailService.tagSubscriber(subscriberId, 'territory_interest');
        break;

      case 'application_start':
        await emailService.tagSubscriber(subscriberId, 'high_intent');
        break;
    }
  }

  /**
   * Get subscriber event timeline
   */
  async getSubscriberTimeline(subscriberId, limit = 50) {
    return await this.db.all(
      `SELECT * FROM analytics_events
       WHERE subscriber_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [subscriberId, limit]
    );
  }

  // ================================================
  // FUNNEL TRACKING
  // ================================================

  /**
   * Track funnel progression
   */
  async trackFunnelStep(funnelId, sessionId, subscriberId, stepNumber, stepData = {}) {
    // Get or create funnel conversion
    let conversion = await this.db.get(
      `SELECT * FROM funnel_conversions
       WHERE funnel_id = ? AND session_id = ?`,
      [funnelId, sessionId]
    );

    if (!conversion) {
      // Create new conversion
      const result = await this.db.run(
        `INSERT INTO funnel_conversions
         (funnel_id, session_id, subscriber_id, current_step, data)
         VALUES (?, ?, ?, ?, ?)`,
        [funnelId, sessionId, subscriberId, stepNumber, JSON.stringify(stepData)]
      );

      conversion = { id: result.lastID };
    } else {
      // Update existing conversion
      const updatedData = { ...JSON.parse(conversion.data || '{}'), ...stepData };

      await this.db.run(
        `UPDATE funnel_conversions
         SET current_step = ?,
             subscriber_id = COALESCE(?, subscriber_id),
             data = ?
         WHERE id = ?`,
        [stepNumber, subscriberId, JSON.stringify(updatedData), conversion.id]
      );
    }

    // Check if funnel is complete
    const funnel = await this.db.get(
      `SELECT * FROM funnels WHERE id = ?`,
      [funnelId]
    );

    if (funnel) {
      const steps = JSON.parse(funnel.steps);
      if (stepNumber >= steps.length) {
        // Mark complete
        await this.db.run(
          `UPDATE funnel_conversions
           SET completed = 1, completed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [conversion.id]
        );
      }
    }

    return conversion;
  }

  /**
   * Get funnel conversion rates
   */
  async getFunnelAnalytics(funnelId, dateRange = 30) {
    const funnel = await this.db.get(
      `SELECT * FROM funnels WHERE id = ?`,
      [funnelId]
    );

    if (!funnel) {
      throw new Error('Funnel not found');
    }

    const steps = JSON.parse(funnel.steps);

    // Get step-by-step breakdown
    const analytics = await this.db.all(
      `SELECT
         current_step,
         COUNT(*) as count,
         COUNT(CASE WHEN completed = 1 THEN 1 END) as completed_count
       FROM funnel_conversions
       WHERE funnel_id = ?
         AND started_at >= datetime('now', '-' || ? || ' days')
       GROUP BY current_step
       ORDER BY current_step ASC`,
      [funnelId, dateRange]
    );

    // Calculate conversion rates
    const stepAnalytics = steps.map((step, index) => {
      const stepData = analytics.find(a => a.current_step === index) || { count: 0, completed_count: 0 };
      const prevStepData = index > 0
        ? analytics.find(a => a.current_step === index - 1)
        : null;

      const conversionRate = prevStepData && prevStepData.count > 0
        ? (stepData.count / prevStepData.count * 100).toFixed(2)
        : 100;

      return {
        step: index,
        name: step.name,
        event: step.event,
        visitors: stepData.count,
        completionRate: conversionRate,
        dropOff: prevStepData ? prevStepData.count - stepData.count : 0
      };
    });

    // Overall funnel stats
    const totalStarted = analytics.length > 0 ? analytics[0].count : 0;
    const totalCompleted = await this.db.get(
      `SELECT COUNT(*) as count FROM funnel_conversions
       WHERE funnel_id = ? AND completed = 1
         AND started_at >= datetime('now', '-' || ? || ' days')`,
      [funnelId, dateRange]
    );

    return {
      funnel: {
        id: funnelId,
        name: funnel.name,
        description: funnel.description
      },
      period: `Last ${dateRange} days`,
      totalStarted,
      totalCompleted: totalCompleted.count,
      overallConversionRate: totalStarted > 0
        ? (totalCompleted.count / totalStarted * 100).toFixed(2)
        : 0,
      steps: stepAnalytics
    };
  }

  /**
   * Get abandoned funnel sessions
   */
  async getAbandonedFunnels(funnelId, minStep = 1, limit = 100) {
    return await this.db.all(
      `SELECT
         fc.*,
         s.email,
         s.name as subscriber_name
       FROM funnel_conversions fc
       LEFT JOIN subscribers s ON fc.subscriber_id = s.id
       WHERE fc.funnel_id = ?
         AND fc.completed = 0
         AND fc.current_step >= ?
         AND fc.started_at >= datetime('now', '-7 days')
       ORDER BY fc.started_at DESC
       LIMIT ?`,
      [funnelId, minStep, limit]
    );
  }

  // ================================================
  // EMAIL CAMPAIGN ANALYTICS
  // ================================================

  /**
   * Get email campaign performance
   */
  async getEmailCampaignStats(dateRange = 30) {
    const stats = await this.db.get(
      `SELECT
         COUNT(*) as total_sent,
         COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as total_opened,
         COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as total_clicked,
         COUNT(CASE WHEN bounced_at IS NOT NULL THEN 1 END) as total_bounced,
         COUNT(CASE WHEN complained_at IS NOT NULL THEN 1 END) as total_complained,
         COUNT(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 END) as total_unsubscribed
       FROM email_sends
       WHERE sent_at >= datetime('now', '-' || ? || ' days')
         AND status = 'sent'`,
      [dateRange]
    );

    return {
      period: `Last ${dateRange} days`,
      totalSent: stats.total_sent,
      openRate: stats.total_sent > 0
        ? (stats.total_opened / stats.total_sent * 100).toFixed(2)
        : 0,
      clickRate: stats.total_opened > 0
        ? (stats.total_clicked / stats.total_opened * 100).toFixed(2)
        : 0,
      clickToOpenRate: stats.total_opened > 0
        ? (stats.total_clicked / stats.total_opened * 100).toFixed(2)
        : 0,
      bounceRate: stats.total_sent > 0
        ? (stats.total_bounced / stats.total_sent * 100).toFixed(2)
        : 0,
      complaintRate: stats.total_sent > 0
        ? (stats.total_complained / stats.total_sent * 100).toFixed(2)
        : 0,
      unsubscribeRate: stats.total_sent > 0
        ? (stats.total_unsubscribed / stats.total_sent * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Get email performance by template
   */
  async getTemplatePerformance(limit = 20) {
    return await this.db.all(
      `SELECT
         t.id,
         t.name as template_name,
         t.category,
         COUNT(es.id) as total_sent,
         COUNT(CASE WHEN es.opened_at IS NOT NULL THEN 1 END) as total_opened,
         COUNT(CASE WHEN es.clicked_at IS NOT NULL THEN 1 END) as total_clicked,
         ROUND(100.0 * COUNT(CASE WHEN es.opened_at IS NOT NULL THEN 1 END) / COUNT(es.id), 2) as open_rate,
         ROUND(100.0 * COUNT(CASE WHEN es.clicked_at IS NOT NULL THEN 1 END) / COUNT(es.id), 2) as click_rate
       FROM email_templates t
       LEFT JOIN email_sends es ON t.id = es.template_id AND es.status = 'sent'
       WHERE es.sent_at >= datetime('now', '-30 days')
       GROUP BY t.id
       HAVING total_sent > 0
       ORDER BY total_sent DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Get sequence performance
   */
  async getSequencePerformance() {
    return await this.db.all(
      `SELECT
         seq.id,
         seq.name as sequence_name,
         COUNT(DISTINCT ss.subscriber_id) as total_enrolled,
         COUNT(CASE WHEN ss.status = 'completed' THEN 1 END) as total_completed,
         ROUND(100.0 * COUNT(CASE WHEN ss.status = 'completed' THEN 1 END) / COUNT(DISTINCT ss.subscriber_id), 2) as completion_rate
       FROM email_sequences seq
       LEFT JOIN subscriber_sequences ss ON seq.id = ss.sequence_id
       WHERE seq.active = 1
       GROUP BY seq.id
       ORDER BY total_enrolled DESC`
    );
  }

  // ================================================
  // CONVERSION ANALYTICS
  // ================================================

  /**
   * Get order conversion rate from real orders data.
   * Conversion = orders with payment_status='paid' / total orders * 100
   */
  async getConversionRate(days = 30) {
    const result = await this.db.get(
      `SELECT
         COUNT(*) AS total_orders,
         COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS paid_orders
       FROM orders
       WHERE created_at >= datetime('now', '-' || ? || ' days')`,
      [days]
    );

    if (!result || result.total_orders === 0) {
      return { rate: 0, totalOrders: 0, paidOrders: 0, period: `Last ${days} days` };
    }

    const rate = (result.paid_orders / result.total_orders) * 100;
    return {
      rate: Math.round(rate * 10) / 10,
      totalOrders: result.total_orders,
      paidOrders: result.paid_orders,
      period: `Last ${days} days`
    };
  }

  /**
   * Get revenue metrics directly from orders table (authoritative source).
   * Supplements analytics_events-based revenue with guaranteed-accurate totals.
   */
  async getOrderRevenue(days = 30) {
    const result = await this.db.get(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(price) AS total_revenue,
         AVG(price) AS avg_order_value,
         COUNT(DISTINCT customer_email) AS unique_customers
       FROM orders
       WHERE payment_status = 'paid'
         AND created_at >= datetime('now', '-' || ? || ' days')`,
      [days]
    );

    return {
      period: `Last ${days} days`,
      totalOrders: result?.total_orders || 0,
      totalRevenue: result?.total_revenue || 0,
      avgOrderValue: result?.avg_order_value || 0,
      uniqueCustomers: result?.unique_customers || 0
    };
  }

  // ================================================
  // REVENUE ANALYTICS
  // ================================================

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(dateRange = 30) {
    const revenue = await this.db.get(
      `SELECT
         COUNT(DISTINCT subscriber_id) as unique_customers,
         COUNT(*) as total_purchases,
         SUM(CAST(json_extract(data, '$.amount') AS REAL)) as total_revenue,
         AVG(CAST(json_extract(data, '$.amount') AS REAL)) as avg_order_value
       FROM analytics_events
       WHERE event_type = 'purchase'
         AND created_at >= datetime('now', '-' || ? || ' days')`,
      [dateRange]
    );

    // Revenue by day
    const dailyRevenue = await this.db.all(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as purchases,
         SUM(CAST(json_extract(data, '$.amount') AS REAL)) as revenue
       FROM analytics_events
       WHERE event_type = 'purchase'
         AND created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [dateRange]
    );

    return {
      period: `Last ${dateRange} days`,
      totalRevenue: revenue.total_revenue || 0,
      totalPurchases: revenue.total_purchases || 0,
      uniqueCustomers: revenue.unique_customers || 0,
      avgOrderValue: revenue.avg_order_value || 0,
      dailyBreakdown: dailyRevenue
    };
  }

  /**
   * Get top products
   */
  async getTopProducts(limit = 10, dateRange = 30) {
    return await this.db.all(
      `SELECT
         json_extract(data, '$.bookTitle') as book_title,
         json_extract(data, '$.bookCategory') as category,
         COUNT(*) as purchases,
         SUM(CAST(json_extract(data, '$.amount') AS REAL)) as revenue
       FROM analytics_events
       WHERE event_type = 'purchase'
         AND created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY book_title
       ORDER BY purchases DESC
       LIMIT ?`,
      [dateRange, limit]
    );
  }

  // ================================================
  // DASHBOARD METRICS
  // ================================================

  /**
   * Get overview dashboard stats
   */
  async getDashboardStats() {
    const totalSubscribers = await this.db.get(
      `SELECT COUNT(*) as count FROM subscribers WHERE status = 'active'`
    );

    const newSubscribers = await this.db.get(
      `SELECT COUNT(*) as count FROM subscribers
       WHERE status = 'active' AND created_at >= datetime('now', '-30 days')`
    );

    const emailStats = await this.getEmailCampaignStats(30);
    const revenueStats = await this.getOrderRevenue(30);
    const conversionStats = await this.getConversionRate(30);

    const topSegments = await this.db.all(
      `SELECT s.name, COUNT(ss.subscriber_id) as count
       FROM segments s
       LEFT JOIN subscriber_segments ss ON s.id = ss.segment_id
       GROUP BY s.id
       ORDER BY count DESC
       LIMIT 5`
    );

    const recentEvents = await this.db.all(
      `SELECT event_type, COUNT(*) as count
       FROM analytics_events
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY event_type
       ORDER BY count DESC
       LIMIT 10`
    );

    return {
      subscribers: {
        total: totalSubscribers.count,
        new_30_days: newSubscribers.count
      },
      email: emailStats,
      revenue: {
        total_30_days: revenueStats.totalRevenue,
        purchases_30_days: revenueStats.totalOrders,
        avg_order_value: revenueStats.avgOrderValue,
        unique_customers_30_days: revenueStats.uniqueCustomers
      },
      conversion: {
        rate: conversionStats.rate,
        total_orders_30_days: conversionStats.totalOrders,
        paid_orders_30_days: conversionStats.paidOrders
      },
      topSegments,
      recentActivity: recentEvents
    };
  }

  // ================================================
  // COHORT ANALYSIS
  // ================================================

  /**
   * Get subscriber cohorts by signup month
   */
  async getCohortAnalysis() {
    return await this.db.all(
      `SELECT
         strftime('%Y-%m', s.created_at) as cohort,
         COUNT(DISTINCT s.id) as subscribers,
         COUNT(DISTINCT CASE WHEN sa.total_purchases > 0 THEN s.id END) as buyers,
         SUM(sa.total_revenue) as total_revenue,
         AVG(sa.engagement_score) as avg_engagement
       FROM subscribers s
       LEFT JOIN subscriber_activity sa ON s.id = sa.subscriber_id
       WHERE s.status = 'active'
       GROUP BY cohort
       ORDER BY cohort DESC
       LIMIT 12`
    );
  }

  // ================================================
  // A/B TEST TRACKING
  // ================================================

  /**
   * Track A/B test variant performance
   */
  async trackABTest(testName, variant, subscriberId, sessionId, converted = false) {
    await this.trackEvent({
      eventType: 'ab_test_view',
      subscriberId,
      sessionId,
      eventData: {
        test_name: testName,
        variant,
        converted
      }
    });

    if (converted) {
      await this.trackEvent({
        eventType: 'ab_test_conversion',
        subscriberId,
        sessionId,
        eventData: {
          test_name: testName,
          variant
        }
      });
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testName) {
    const results = await this.db.all(
      `SELECT
         json_extract(data, '$.variant') as variant,
         COUNT(*) as views,
         COUNT(CASE WHEN event_type = 'ab_test_conversion' THEN 1 END) as conversions
       FROM analytics_events
       WHERE json_extract(data, '$.test_name') = ?
         AND event_type IN ('ab_test_view', 'ab_test_conversion')
       GROUP BY variant`,
      [testName]
    );

    return results.map(r => ({
      variant: r.variant,
      views: r.views,
      conversions: r.conversions,
      conversionRate: r.views > 0 ? (r.conversions / r.views * 100).toFixed(2) : 0
    }));
  }
}

module.exports = AnalyticsService;
