/**
 * Minimal Express app for testing.
 * Only mounts the routes that tests actually exercise — avoids pulling in
 * heavy optional dependencies (puppeteer, puppeteer-core, etc.) that some
 * route services require but tests don't need.
 */
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');

const app = express();

// Session (required by auth routes)
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: 'strict' }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'teneo-marketplace-api'
    });
});

// Routes under test
app.use('/api/auth',    require('../marketplace/backend/routes/auth'));
app.use('/api/brands',  require('../marketplace/backend/routes/brandRoutes'));
app.use('/api/coupons', require('../marketplace/backend/routes/couponsRoutes'));

module.exports = app;
