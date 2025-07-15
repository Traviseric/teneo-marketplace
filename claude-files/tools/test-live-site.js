#!/usr/bin/env node

const https = require('https');
const http = require('http');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

const FRONTEND_URL = 'https://teneo-marketplace.vercel.app';
const BACKEND_URL = 'https://teneo-marketplace-api.onrender.com';

function log(success, message) {
  const icon = success ? `${colors.green}✅` : `${colors.red}❌`;
  console.log(`${icon} ${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log(`\n${colors.yellow}🔍 Testing Teneo Marketplace Live Deployment${colors.reset}\n`);
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend: ${BACKEND_URL}\n`);
  
  let passed = 0;
  let failed = 0;

  // Test 1: Frontend Accessibility
  console.log('1. Testing Frontend Accessibility...');
  try {
    const response = await makeRequest(FRONTEND_URL);
    const success = response.status === 200;
    log(success, `Frontend responds with status ${response.status}`);
    success ? passed++ : failed++;
  } catch (error) {
    log(false, `Frontend error: ${error.message}`);
    failed++;
  }

  // Test 2: Backend API Health
  console.log('\n2. Testing Backend API...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    const success = response.status === 200;
    log(success, `Backend API responds with status ${response.status}`);
    if (success) {
      const data = JSON.parse(response.data);
      log(true, `API Status: ${data.status || 'healthy'}`);
    }
    success ? passed++ : failed++;
  } catch (error) {
    log(false, `Backend API error: ${error.message}`);
    failed++;
  }

  // Test 3: Brands Loading
  console.log('\n3. Testing Brands Endpoint...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/brands`);
    const success = response.status === 200;
    log(success, `Brands endpoint responds with status ${response.status}`);
    if (success) {
      const brands = JSON.parse(response.data);
      log(true, `Found ${brands.length} brands`);
      if (brands.length > 0) {
        log(true, `First brand: ${brands[0].name}`);
      }
    }
    success ? passed++ : failed++;
  } catch (error) {
    log(false, `Brands endpoint error: ${error.message}`);
    failed++;
  }

  // Test 4: Books Loading
  console.log('\n4. Testing Books Endpoint...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/books`);
    const success = response.status === 200;
    log(success, `Books endpoint responds with status ${response.status}`);
    if (success) {
      const books = JSON.parse(response.data);
      log(true, `Found ${books.length} books`);
      if (books.length > 0) {
        log(true, `First book: "${books[0].title}" by ${books[0].author}`);
      }
    }
    success ? passed++ : failed++;
  } catch (error) {
    log(false, `Books endpoint error: ${error.message}`);
    failed++;
  }

  // Test 5: Network Search
  console.log('\n5. Testing Network Search...');
  try {
    const searchQuery = 'test';
    const response = await makeRequest(`${BACKEND_URL}/api/network/search?q=${searchQuery}`);
    const success = response.status === 200;
    log(success, `Network search responds with status ${response.status}`);
    if (success) {
      const results = JSON.parse(response.data);
      log(true, `Search returned ${results.results?.length || 0} results`);
    }
    success ? passed++ : failed++;
  } catch (error) {
    log(false, `Network search error: ${error.message}`);
    failed++;
  }

  // Test 6: CORS Headers
  console.log('\n6. Testing CORS Configuration...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`, {
      headers: {
        'Origin': FRONTEND_URL
      }
    });
    const corsHeader = response.headers['access-control-allow-origin'];
    const success = corsHeader !== undefined;
    log(success, `CORS headers ${success ? 'present' : 'missing'}`);
    if (success) {
      log(true, `Access-Control-Allow-Origin: ${corsHeader}`);
    }
    success ? passed++ : failed++;
  } catch (error) {
    log(false, `CORS test error: ${error.message}`);
    failed++;
  }

  // Summary
  console.log(`\n${colors.yellow}📊 Test Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${passed + failed}\n`);

  if (failed === 0) {
    console.log(`${colors.green}🎉 All tests passed! Your marketplace is ready!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}⚠️  Some tests failed. Please check the deployment.${colors.reset}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});