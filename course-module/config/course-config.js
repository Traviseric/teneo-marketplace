/**
 * Course Module Configuration
 * Environment-agnostic settings for course platform
 *
 * This file works in ANY Node.js project
 * Just update the environment variables
 */

module.exports = {
  // ==================
  // API Configuration
  // ==================

  // Base URL for API calls (frontend will use this)
  apiBaseUrl: process.env.COURSE_API_BASE_URL || '/api',

  // Full site URL (for emails, links)
  siteUrl: process.env.SITE_URL || 'http://localhost:3001',

  // ==================
  // Video Hosting
  // ==================

  videoProvider: process.env.VIDEO_PROVIDER || 'self', // 'bunny', 'self', 'vimeo', 'youtube'

  // Bunny Stream (recommended)
  bunnyStream: {
    apiKey: process.env.BUNNY_STREAM_API_KEY || '',
    libraryId: process.env.BUNNY_STREAM_LIBRARY_ID || '',
    cdnUrl: process.env.BUNNY_CDN_URL || ''
  },

  // Self-hosted video
  uploadDir: process.env.COURSE_UPLOAD_DIR || './uploads/courses',
  maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE) || 500 * 1024 * 1024, // 500MB default

  // ==================
  // Features
  // ==================

  features: {
    // Drip content (release lessons over time)
    drip: process.env.ENABLE_DRIP_CONTENT !== 'false',

    // Award certificates on completion
    certificates: process.env.ENABLE_CERTIFICATES !== 'false',

    // Discussion forums per course
    discussions: process.env.ENABLE_DISCUSSIONS !== 'false',

    // Quizzes
    quizzes: process.env.ENABLE_QUIZZES !== 'false',

    // Student notes
    notes: process.env.ENABLE_NOTES !== 'false',

    // Course reviews/ratings
    reviews: process.env.ENABLE_REVIEWS !== 'false',

    // Video download (allow students to download)
    videoDownload: process.env.ALLOW_VIDEO_DOWNLOAD === 'true',

    // Auto-advance to next lesson
    autoAdvance: process.env.AUTO_ADVANCE_DEFAULT === 'true'
  },

  // ==================
  // Database
  // ==================

  database: {
    // Table prefix (useful for multi-tenant or namespace separation)
    tablePrefix: process.env.COURSE_TABLE_PREFIX || '',

    // Database type
    type: process.env.DB_TYPE || 'sqlite', // 'sqlite', 'postgres', 'mysql'

    // Connection (for PostgreSQL/MySQL)
    url: process.env.DATABASE_URL || '',

    // SQLite path
    sqlitePath: process.env.COURSE_DB_PATH || './courses.db'
  },

  // ==================
  // Progress Tracking
  // ==================

  progress: {
    // How often to sync progress (ms)
    syncInterval: parseInt(process.env.PROGRESS_SYNC_INTERVAL) || 30000, // 30 seconds

    // Auto-complete threshold (% of video watched)
    autoCompleteThreshold: parseInt(process.env.AUTO_COMPLETE_THRESHOLD) || 90, // 90%

    // Save video position interval (ms)
    videoPositionSaveInterval: 5000 // 5 seconds
  },

  // ==================
  // UI/UX
  // ==================

  ui: {
    // Brand colors (can override in CSS)
    brandPrimary: process.env.BRAND_PRIMARY_COLOR || '#7C3AED',
    brandSecondary: process.env.BRAND_SECONDARY_COLOR || '#3B82F6',
    brandAccent: process.env.BRAND_ACCENT_COLOR || '#f7c948',

    // Sidebar width
    sidebarWidth: '300px',

    // Mobile breakpoint
    mobileBreakpoint: '768px'
  },

  // ==================
  // Email Notifications
  // ==================

  email: {
    // Send welcome email on enrollment
    sendWelcome: process.env.SEND_COURSE_WELCOME_EMAIL !== 'false',

    // Send completion email
    sendCompletion: process.env.SEND_COURSE_COMPLETION_EMAIL !== 'false',

    // Send progress reminders
    sendProgressReminders: process.env.SEND_PROGRESS_REMINDERS === 'true',

    // From name
    fromName: process.env.EMAIL_FROM_NAME || 'Course Platform',

    // From email
    fromEmail: process.env.EMAIL_FROM_ADDRESS || 'courses@example.com'
  },

  // ==================
  // Security
  // ==================

  security: {
    // Require authentication
    requireAuth: process.env.REQUIRE_COURSE_AUTH !== 'false',

    // Verify enrollment before access
    verifyEnrollment: process.env.VERIFY_ENROLLMENT !== 'false',

    // Token expiry for download links (hours)
    downloadTokenExpiry: parseInt(process.env.DOWNLOAD_TOKEN_EXPIRY) || 24,

    // Max download attempts
    maxDownloadAttempts: parseInt(process.env.MAX_DOWNLOAD_ATTEMPTS) || 5
  },

  // ==================
  // Analytics
  // ==================

  analytics: {
    // Track video watch time
    trackVideoProgress: process.env.TRACK_VIDEO_PROGRESS !== 'false',

    // Track lesson completion time
    trackCompletionTime: process.env.TRACK_COMPLETION_TIME !== 'false',

    // Track quiz scores
    trackQuizScores: process.env.TRACK_QUIZ_SCORES !== 'false'
  },

  // ==================
  // Development
  // ==================

  dev: {
    // Enable debug mode
    debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',

    // Use mock data
    useMockData: process.env.USE_MOCK_COURSE_DATA === 'true',

    // Log level
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

// Helper function to get config value
function getConfig(path) {
  const keys = path.split('.');
  let value = module.exports;

  for (const key of keys) {
    value = value[key];
    if (value === undefined) return null;
  }

  return value;
}

module.exports.get = getConfig;

// Example usage:
// const config = require('./course-config');
// config.get('features.drip') // returns true/false
// config.get('videoProvider') // returns 'bunny' or 'self'
