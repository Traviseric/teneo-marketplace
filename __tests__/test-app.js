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

function withSilencedConsole(callback) {
    const original = {
        log: console.log,
        warn: console.warn,
        error: console.error,
    };

    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};

    try {
        return callback();
    } finally {
        console.log = original.log;
        console.warn = original.warn;
        console.error = original.error;
    }
}

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
        service: 'openbazaar-ai-api'
    });
});

// Routes under test
app.use('/api/auth', withSilencedConsole(() => require('../marketplace/backend/routes/auth')));
app.use('/api/brands', withSilencedConsole(() => require('../marketplace/backend/routes/brandRoutes')));
app.use('/api/coupons', withSilencedConsole(() => require('../marketplace/backend/routes/couponsRoutes')));
app.use('/api/apps', withSilencedConsole(() => require('../marketplace/backend/routes/appStore')));

module.exports = app;
