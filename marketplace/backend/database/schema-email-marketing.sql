-- ================================================
-- IN-HOUSE EMAIL MARKETING & AUTOMATION SYSTEM
-- Complete database schema for Teneo Marketplace
-- ================================================

-- Subscribers (email list)
CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    source TEXT, -- which page/funnel they came from
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'active', -- active, unsubscribed, bounced, complained
    confirmed BOOLEAN DEFAULT 0, -- double opt-in confirmation
    confirm_token TEXT,
    unsubscribe_token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    unsubscribed_at DATETIME
);

CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_created ON subscribers(created_at);

-- Segments (groups for targeting)
CREATE TABLE IF NOT EXISTS segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'manual', -- manual, auto, dynamic
    rules JSON, -- JSON rules for dynamic segments
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate common segments
INSERT OR IGNORE INTO segments (name, description, type) VALUES
    ('All Subscribers', 'Everyone on the list', 'auto'),
    ('Leads', 'Gave email, no purchase yet', 'auto'),
    ('Buyers', 'Made at least one purchase', 'auto'),
    ('High Value Customers', '3+ purchases or $100+ spent', 'auto'),
    ('VIP', '10+ purchases or $500+ spent', 'auto'),
    ('Abandoned Cart', 'Added to cart, didnt buy', 'auto'),
    ('Recently Active', 'Engaged in last 30 days', 'auto'),
    ('Inactive', 'No engagement in 90+ days', 'auto');

-- Subscriber-Segment mapping
CREATE TABLE IF NOT EXISTS subscriber_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER NOT NULL,
    segment_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
    FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE,
    UNIQUE(subscriber_id, segment_id)
);

CREATE INDEX idx_subscriber_segments_subscriber ON subscriber_segments(subscriber_id);
CREATE INDEX idx_subscriber_segments_segment ON subscriber_segments(segment_id);

-- Tags (flexible categorization)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6', -- hex color for UI
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate common tags
INSERT OR IGNORE INTO tags (name, color) VALUES
    ('book_buyer', '#10B981'),
    ('territory_interest', '#F59E0B'),
    ('high_intent', '#EF4444'),
    ('irs_books', '#6366F1'),
    ('medical_books', '#EC4899'),
    ('student_loan_books', '#8B5CF6'),
    ('email_engaged', '#14B8A6'),
    ('email_inactive', '#9CA3AF');

-- Subscriber-Tag mapping
CREATE TABLE IF NOT EXISTS subscriber_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(subscriber_id, tag_id)
);

CREATE INDEX idx_subscriber_tags_subscriber ON subscriber_tags(subscriber_id);
CREATE INDEX idx_subscriber_tags_tag ON subscriber_tags(tag_id);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT, -- plain text fallback
    preview_text TEXT, -- email preview/snippet
    from_name TEXT DEFAULT 'Teneo Marketplace',
    from_email TEXT DEFAULT 'noreply@teneo.io',
    reply_to TEXT,
    category TEXT, -- transactional, marketing, sequence
    variables JSON, -- {{VARIABLE}} placeholders used
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email Sequences (automated drip campaigns)
CREATE TABLE IF NOT EXISTS email_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    trigger_event TEXT, -- signup, purchase, abandoned_cart, tag_added
    trigger_value TEXT, -- specific tag, product ID, etc.
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate common sequences
INSERT OR IGNORE INTO email_sequences (name, description, trigger_event, active) VALUES
    ('Welcome Sequence', 'New subscriber welcome series', 'signup', 1),
    ('Book Buyer Sequence', 'Post-purchase nurture', 'purchase', 1),
    ('Abandoned Cart Sequence', 'Cart recovery emails', 'abandoned_cart', 1),
    ('Territory Interest', 'Publisher funnel nurture', 'tag_added:territory_interest', 1),
    ('Re-engagement', 'Win back inactive subscribers', 'inactive', 1);

-- Sequence Emails (individual emails in a sequence)
CREATE TABLE IF NOT EXISTS sequence_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id INTEGER NOT NULL,
    order_number INTEGER NOT NULL, -- 1, 2, 3, etc.
    delay_days INTEGER DEFAULT 0, -- send X days after trigger
    delay_hours INTEGER DEFAULT 0, -- additional hour offset
    template_id INTEGER NOT NULL,
    subject_override TEXT, -- override template subject
    active BOOLEAN DEFAULT 1,
    FOREIGN KEY (sequence_id) REFERENCES email_sequences(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES email_templates(id),
    UNIQUE(sequence_id, order_number)
);

CREATE INDEX idx_sequence_emails_sequence ON sequence_emails(sequence_id);

-- Subscriber Sequences (track who's in what sequence)
CREATE TABLE IF NOT EXISTS subscriber_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER NOT NULL,
    sequence_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- active, completed, paused, cancelled
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    paused_at DATETIME,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
    FOREIGN KEY (sequence_id) REFERENCES email_sequences(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriber_sequences_subscriber ON subscriber_sequences(subscriber_id);
CREATE INDEX idx_subscriber_sequences_sequence ON subscriber_sequences(sequence_id);
CREATE INDEX idx_subscriber_sequences_status ON subscriber_sequences(status);

-- Email Broadcasts (one-time campaigns)
CREATE TABLE IF NOT EXISTS email_broadcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    template_id INTEGER NOT NULL,
    segment_ids TEXT, -- comma-separated segment IDs
    tag_ids TEXT, -- comma-separated tag IDs
    subject_override TEXT,
    scheduled_at DATETIME,
    status TEXT DEFAULT 'draft', -- draft, scheduled, sending, sent
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

CREATE INDEX idx_broadcasts_status ON email_broadcasts(status);
CREATE INDEX idx_broadcasts_scheduled ON email_broadcasts(scheduled_at);

-- Email Sends (log of all emails sent)
CREATE TABLE IF NOT EXISTS email_sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER NOT NULL,
    email_type TEXT NOT NULL, -- transactional, sequence, broadcast
    sequence_email_id INTEGER, -- if from sequence
    broadcast_id INTEGER, -- if from broadcast
    template_id INTEGER,
    subject TEXT NOT NULL,
    from_email TEXT,
    to_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, failed, bounced
    error_message TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivered_at DATETIME,
    opened_at DATETIME,
    clicked_at DATETIME,
    complained_at DATETIME,
    bounced_at DATETIME,
    unsubscribed_at DATETIME,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
    FOREIGN KEY (sequence_email_id) REFERENCES sequence_emails(id),
    FOREIGN KEY (broadcast_id) REFERENCES email_broadcasts(id),
    FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

CREATE INDEX idx_email_sends_subscriber ON email_sends(subscriber_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);
CREATE INDEX idx_email_sends_sent ON email_sends(sent_at);
CREATE INDEX idx_email_sends_type ON email_sends(email_type);

-- Email Links (track clicks)
CREATE TABLE IF NOT EXISTS email_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    send_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    first_clicked_at DATETIME,
    last_clicked_at DATETIME,
    FOREIGN KEY (send_id) REFERENCES email_sends(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_links_send ON email_links(send_id);

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- page_view, cta_click, email_submit, purchase, etc.
    subscriber_id INTEGER,
    session_id TEXT,
    user_id INTEGER,
    page_url TEXT,
    referrer TEXT,
    ip_address TEXT,
    user_agent TEXT,
    data JSON, -- flexible event data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE SET NULL
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_subscriber ON analytics_events(subscriber_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

-- Conversion Funnels
CREATE TABLE IF NOT EXISTS funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    steps JSON, -- array of step definitions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate common funnels
INSERT OR IGNORE INTO funnels (name, description, steps) VALUES
    ('Book Sales Funnel', 'Standard book purchase flow',
     '[{"name":"Page View","event":"page_view"},{"name":"Email Capture","event":"email_submit"},{"name":"Add to Cart","event":"add_to_cart"},{"name":"Purchase","event":"purchase"}]'),
    ('Territory Claim Funnel', 'Publisher recruitment flow',
     '[{"name":"Territory View","event":"territory_view"},{"name":"Email Capture","event":"email_submit"},{"name":"Application Start","event":"application_start"},{"name":"Application Complete","event":"application_complete"}]');

-- Funnel Conversions (track user progress through funnels)
CREATE TABLE IF NOT EXISTS funnel_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funnel_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    subscriber_id INTEGER,
    current_step INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    data JSON,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id),
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE SET NULL
);

CREATE INDEX idx_funnel_conversions_funnel ON funnel_conversions(funnel_id);
CREATE INDEX idx_funnel_conversions_session ON funnel_conversions(session_id);
CREATE INDEX idx_funnel_conversions_completed ON funnel_conversions(completed);

-- Subscriber Activity (consolidated view of engagement)
CREATE TABLE IF NOT EXISTS subscriber_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER NOT NULL UNIQUE,
    total_emails_sent INTEGER DEFAULT 0,
    total_emails_opened INTEGER DEFAULT 0,
    total_emails_clicked INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    last_email_sent_at DATETIME,
    last_email_opened_at DATETIME,
    last_email_clicked_at DATETIME,
    last_purchase_at DATETIME,
    last_active_at DATETIME,
    engagement_score INTEGER DEFAULT 0, -- 0-100 calculated score
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriber_activity_subscriber ON subscriber_activity(subscriber_id);
CREATE INDEX idx_subscriber_activity_score ON subscriber_activity(engagement_score);
CREATE INDEX idx_subscriber_activity_last_active ON subscriber_activity(last_active_at);

-- ================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================

-- Active subscribers count by segment
CREATE VIEW IF NOT EXISTS v_segment_counts AS
SELECT
    s.id,
    s.name,
    s.description,
    COUNT(DISTINCT ss.subscriber_id) as subscriber_count
FROM segments s
LEFT JOIN subscriber_segments ss ON s.id = ss.segment_id
LEFT JOIN subscribers sub ON ss.subscriber_id = sub.id AND sub.status = 'active'
GROUP BY s.id;

-- Email performance summary
CREATE VIEW IF NOT EXISTS v_email_performance AS
SELECT
    template_id,
    t.name as template_name,
    COUNT(*) as total_sent,
    COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as total_opened,
    COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as total_clicked,
    ROUND(100.0 * COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) / COUNT(*), 2) as open_rate,
    ROUND(100.0 * COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) / COUNT(*), 2) as click_rate
FROM email_sends es
JOIN email_templates t ON es.template_id = t.id
WHERE es.status = 'sent'
GROUP BY template_id;

-- Top performing subscribers (engaged customers)
CREATE VIEW IF NOT EXISTS v_top_subscribers AS
SELECT
    s.id,
    s.email,
    s.name,
    sa.total_purchases,
    sa.total_revenue,
    sa.engagement_score,
    sa.last_active_at
FROM subscribers s
JOIN subscriber_activity sa ON s.id = sa.subscriber_id
WHERE s.status = 'active'
ORDER BY sa.engagement_score DESC, sa.total_revenue DESC
LIMIT 100;

-- ================================================
-- TRIGGERS FOR AUTO-UPDATING
-- ================================================

-- Auto-update subscriber updated_at
CREATE TRIGGER IF NOT EXISTS update_subscriber_timestamp
AFTER UPDATE ON subscribers
BEGIN
    UPDATE subscribers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-update template updated_at
CREATE TRIGGER IF NOT EXISTS update_template_timestamp
AFTER UPDATE ON email_templates
BEGIN
    UPDATE email_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-update sequence updated_at
CREATE TRIGGER IF NOT EXISTS update_sequence_timestamp
AFTER UPDATE ON email_sequences
BEGIN
    UPDATE email_sequences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ================================================
-- SUCCESS!
-- ================================================
-- Run this file to create the complete email marketing system
-- Usage: sqlite3 marketplace.db < schema-email-marketing.sql
