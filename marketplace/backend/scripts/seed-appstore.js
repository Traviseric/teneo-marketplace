// Seed the Agent App Store with the TE Code ecosystem launch catalog
// Run: node marketplace/backend/scripts/seed-appstore.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'marketplace.db');
const schemaPath = path.join(__dirname, '..', 'database', 'schema-appstore.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

const db = new sqlite3.Database(dbPath);
const PUBLISHER = 'travis-eric';

const APPS = [
    {
        id: 'te-image-engine',
        name: 'Image Engine',
        description: 'AI-powered image generation. Book covers, logos, app icons, game assets, social graphics. Multi-provider routing (Ideogram, Google Gemini).',
        category: 'image',
        icon: 'paint',
        endpoint_url: 'https://bookcovergenerator.ai',
        auth_method: 'service_key',
        pricing_model: 'per_call',
        pricing_config: JSON.stringify({ per_call_sats: 300, per_call_usd: 0.03, free_tier: 5 }),
        source_url: 'https://github.com/traviseric/image-engine',
        verification_tier: 'official',
        trust_score: 9.0,
        caps: [
            ['image.generate', 'Generate images from text prompts'],
            ['image.cover.book', 'Generate book covers with title/author text'],
            ['image.logo', 'Generate logos and brand marks'],
            ['image.icon.app', 'Generate app icons (iOS/Android)'],
            ['image.asset.game', 'Generate game assets (sprites, backgrounds, characters)']
        ],
        eps: [['generate', 'POST', '/api/ai-invoke/generate', 'image.generate', 300,
            '{"prompt":"string","style":"string","dimensions":"string"}',
            '{"url":"string","format":"string"}']]
    },
    {
        id: 'te-profile-engine',
        name: 'ProfileEngine',
        description: 'Personality intelligence API. 5-layer psychological analysis, Big Five inference, MI/IFS detection from conversation text.',
        category: 'intelligence',
        icon: 'brain',
        endpoint_url: 'https://profile-engine.com',
        auth_method: 'service_key',
        pricing_model: 'per_call',
        pricing_config: JSON.stringify({ per_call_sats: 500, per_call_usd: 0.05 }),
        source_url: 'https://github.com/traviseric/ProfileEngine',
        verification_tier: 'official',
        trust_score: 9.0,
        caps: [
            ['personality.analyze', 'Analyze personality from conversation text'],
            ['personality.big5', 'Infer Big Five (OCEAN) traits with evidence'],
            ['personality.ifs', 'Detect IFS parts (protectors, exiles, managers)'],
            ['conversation.adapt', 'Get communication style recommendations']
        ],
        eps: [['understand', 'POST', '/api/ai-invoke/understand', 'personality.analyze', 500,
            '{"messages":"array","session_id":"string"}',
            '{"profile":"object","big_five":"object","confidence":"number"}']]
    },
    {
        id: 'te-trend-os',
        name: 'TrendOS',
        description: 'Market intelligence. Detect trending topics, score app ideas, find grants, analyze SEO keywords, game market gaps.',
        category: 'market-intelligence',
        icon: 'chart',
        endpoint_url: 'https://api.trend-os.io',
        auth_method: 'service_key',
        pricing_model: 'per_call',
        pricing_config: JSON.stringify({ per_call_sats: 500, per_call_usd: 0.05 }),
        source_url: 'https://github.com/traviseric/TrendOS',
        verification_tier: 'official',
        trust_score: 8.5,
        caps: [
            ['market.trends', 'Discover trending topics across Reddit, HN, Google Trends'],
            ['market.app_ideas', 'Score app ideas by pain, volume, competition'],
            ['market.game_gaps', 'Find indie game market opportunities'],
            ['seo.keywords', 'Keyword research and competition analysis'],
            ['grants.discover', 'Find and classify government grants']
        ],
        eps: [['trends', 'GET', '/api/trends', 'market.trends', 500,
            '{"query":"string","sources":"array"}',
            '{"trends":"array","scores":"object"}']]
    },
    {
        id: 'te-ai-trust',
        name: 'AI Trust Gateway',
        description: 'Complete AI trust layer. Content quality scoring, PII/PHI detection, model routing, fact verification. GDPR/HIPAA scanning.',
        category: 'security',
        icon: 'shield',
        endpoint_url: 'https://ai-trust-gateway.vercel.app',
        auth_method: 'service_key',
        pricing_model: 'per_call',
        pricing_config: JSON.stringify({ per_call_sats: 200, per_call_usd: 0.02 }),
        source_url: 'https://github.com/traviseric/ai-trust-stack',
        verification_tier: 'official',
        trust_score: 9.5,
        caps: [
            ['content.quality_score', 'Multi-dimensional content quality scoring'],
            ['content.pii_scan', 'Detect PII/PHI/credentials with GDPR/HIPAA compliance'],
            ['model.route', 'Intelligent AI model selection from 20+ models'],
            ['claim.verify', 'Fact-check claims against 7 free API sources']
        ],
        eps: [['analyze', 'POST', '/v1/analyze', 'content.quality_score', 200,
            '{"content":"string","checks":"array"}',
            '{"quality":"object","pii":"object","claims":"array"}']]
    },
    {
        id: 'te-formforge',
        name: 'FormForge',
        description: 'Form submission and email service. Collect form data, send templated emails, spam detection. 90% cheaper than Resend.',
        category: 'communication',
        icon: 'mail',
        endpoint_url: 'https://form-forge.io',
        auth_method: 'api_key',
        pricing_model: 'freemium',
        pricing_config: JSON.stringify({ free_tier: 100, per_call_sats: 10, per_call_usd: 0.001 }),
        source_url: 'https://github.com/traviseric/formforge',
        verification_tier: 'official',
        trust_score: 8.0,
        caps: [
            ['form.submit', 'Process form submissions with validation'],
            ['email.send', 'Send templated transactional emails'],
            ['email.template', 'Render email templates with variables'],
            ['spam.detect', 'Advanced spam detection (keywords, caps, links)']
        ],
        eps: [['submit', 'POST', '/api/forms/{formId}', 'form.submit', 10,
            '{"fields":"object"}',
            '{"success":"boolean","submission_id":"string"}']]
    },
    {
        id: 'te-conversos',
        name: 'Conversos',
        description: 'Personality-intelligent conversation platform. 8 pre-built missions (Brand Generator, Sales Agent, Career Architect, Legal Navigator).',
        category: 'conversation',
        icon: 'chat',
        endpoint_url: 'https://conversos.ai',
        auth_method: 'service_key',
        pricing_model: 'per_call',
        pricing_config: JSON.stringify({ per_call_sats: 1000, per_call_usd: 0.10 }),
        source_url: null,
        verification_tier: 'official',
        trust_score: 8.5,
        caps: [
            ['conversation.mission', 'Run a structured conversation mission'],
            ['conversation.brand_gen', 'Generate complete brand identity via conversation'],
            ['conversation.sales', 'AI sales agent with personality adaptation'],
            ['conversation.support', 'Customer support with personality intelligence']
        ],
        eps: [['converse', 'POST', '/api/converse', 'conversation.mission', 1000,
            '{"mission":"string","message":"string","session_id":"string"}',
            '{"response":"string","stage":"object","profile":"object"}']]
    },
    {
        id: 'te-detection-lab',
        name: 'Detection Lab',
        description: 'AI content detection and deepfake analysis. Classify AI-generated text, images, and audio. Trust scoring for content authenticity.',
        category: 'security',
        icon: 'search',
        endpoint_url: 'https://detectionlab.ai',
        auth_method: 'api_key',
        pricing_model: 'per_call',
        pricing_config: JSON.stringify({ per_call_sats: 500, per_call_usd: 0.05 }),
        source_url: 'https://github.com/traviseric/detection-lab',
        verification_tier: 'official',
        trust_score: 9.0,
        caps: [
            ['security.ai_detect', 'Detect AI-generated content (text, image, audio)'],
            ['security.deepfake_score', 'Score media for deepfake probability'],
            ['security.content_classify', 'Classify content authenticity and provenance']
        ],
        eps: [['detect', 'POST', '/api/detect', 'security.ai_detect', 500,
            '{"content":"string or base64","type":"text|image|audio"}',
            '{"ai_probability":"number","classification":"string","evidence":"array"}']]
    },
    {
        id: 'te-pras',
        name: 'PRAS',
        description: 'Production-Ready Audit System. AST-based code quality scanning, security analysis, architecture review. Automated quality gates.',
        category: 'developer-tools',
        icon: 'check',
        endpoint_url: 'https://pras.teneo.io',
        auth_method: 'service_key',
        pricing_model: 'per_call',
        pricing_config: JSON.stringify({ per_call_sats: 1000, per_call_usd: 0.10 }),
        source_url: 'https://github.com/traviseric/pras',
        verification_tier: 'official',
        trust_score: 8.5,
        caps: [
            ['code.audit', 'Full code quality audit with AST analysis'],
            ['code.security_scan', 'Security vulnerability scanning (OWASP top 10)'],
            ['code.quality_report', 'Generate quality report with actionable findings']
        ],
        eps: [['audit', 'POST', '/api/audit', 'code.audit', 1000,
            '{"repo_url":"string","branch":"string"}',
            '{"score":"number","findings":"array","report_url":"string"}']]
    }
];

db.serialize(() => {
    // Create schema
    db.exec(schema, (err) => {
        if (err) {
            console.error('Schema error:', err.message);
            process.exit(1);
        }
        console.log('App Store schema created.\n');
    });

    // Use IGNORE to avoid cascade-delete issues with OR REPLACE
    const appStmt = db.prepare(
        `INSERT OR IGNORE INTO apps (id, publisher_id, name, description, category, capabilities, endpoint_url, auth_method, pricing_model, pricing_config, source_url, icon, verification_tier, trust_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // Update existing apps
    const appUpdateStmt = db.prepare(
        `UPDATE apps SET name=?, description=?, category=?, capabilities=?, endpoint_url=?, auth_method=?, pricing_model=?, pricing_config=?, source_url=?, icon=?, verification_tier=?, trust_score=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    );

    const capStmt = db.prepare('INSERT OR IGNORE INTO app_capabilities (app_id, capability, description) VALUES (?, ?, ?)');
    const epStmt = db.prepare(
        'INSERT OR IGNORE INTO app_endpoints (app_id, name, method, path, capability, cost_sats, input_schema, output_schema) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const app of APPS) {
        const capNames = JSON.stringify(app.caps.map(c => c[0]));

        appStmt.run(
            app.id, PUBLISHER, app.name, app.description, app.category, capNames,
            app.endpoint_url, app.auth_method, app.pricing_model, app.pricing_config,
            app.source_url, app.icon, app.verification_tier, app.trust_score
        );
        appUpdateStmt.run(
            app.name, app.description, app.category, capNames,
            app.endpoint_url, app.auth_method, app.pricing_model, app.pricing_config,
            app.source_url, app.icon, app.verification_tier, app.trust_score, app.id
        );

        for (const [name, desc] of app.caps) {
            capStmt.run(app.id, name, desc);
        }

        for (const [name, method, epath, cap, cost, input, output] of app.eps) {
            epStmt.run(app.id, name, method, epath, cap, cost, input, output);
        }

        console.log(`  [${app.verification_tier.toUpperCase()}] ${app.name} (${app.id}) — ${app.caps.length} capabilities`);
    }

    appStmt.finalize();
    appUpdateStmt.finalize();
    capStmt.finalize();
    epStmt.finalize(() => {
        // Verify counts after all statements are finalized
        db.get('SELECT COUNT(*) as c FROM apps', (e, r) => {
            console.log(`\nVerification: ${r ? r.c : 0} apps`);
        });
        db.get('SELECT COUNT(*) as c FROM app_capabilities', (e, r) => {
            console.log(`Verification: ${r ? r.c : 0} capabilities`);
        });
        db.get('SELECT COUNT(*) as c FROM app_endpoints', (e, r) => {
            console.log(`Verification: ${r ? r.c : 0} endpoints`);
            console.log('\nTest endpoints:');
            console.log('  GET http://localhost:3001/api/apps');
            console.log('  GET http://localhost:3001/api/apps/discover?capability=image.generate');
            console.log('  GET http://localhost:3001/api/apps/te-image-engine/manifest');
            db.close(() => process.exit(0));
            // Force exit after 2s if close callback doesn't fire (Windows sqlite3 quirk)
            setTimeout(() => process.exit(0), 2000);
        });
    });

    console.log(`\nSeeded ${APPS.length} apps into the Agent App Store.`);
});
