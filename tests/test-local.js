/**
 * Local Testing Script for Website Monitor
 * 
 * Run this before pushing to GitHub to test the monitoring script locally
 * 
 * Usage:
 *   npm install playwright
 *   npx playwright install chromium
 *   node test-local.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEBSITE_URL = 'https://start.screencloud.com/';
const TIMEOUT = 30000; // 30 seconds
const SCREENSHOT_DIR = 'screenshots';

/**
 * Main monitoring function (same as in workflow)
 */
async function monitor() {
  let browser;
  let statusCode = 0;
  let statusText = '';
  let loadTime = null;
  let title = '';
  let errorMessage = '';
  let isUp = false;
  const timestamp = new Date().toISOString();
  
  // Ensure screenshots directory exists
  await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
  
  try {
    console.log(`🔍 Starting website monitoring check...`);
    console.log(`📍 URL: ${WEBSITE_URL}`);
    console.log(`⏱️  Timeout: ${TIMEOUT}ms`);
    
    const startTime = Date.now();
    
    // Launch browser with error handling
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: false
    });
    
    const page = await context.newPage();
    
    // Set up error handlers
    page.on('pageerror', (error) => {
      console.warn(`⚠️  Page error: ${error.message}`);
    });
    
    page.on('requestfailed', (request) => {
      console.warn(`⚠️  Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    // Navigate to website with comprehensive error handling
    let response;
    try {
      response = await page.goto(WEBSITE_URL, {
        waitUntil: 'networkidle',
        timeout: TIMEOUT
      });
      
      loadTime = Date.now() - startTime;
      statusCode = response.status();
      statusText = response.statusText();
      
      console.log(`✓ Response received`);
      console.log(`✓ Status Code: ${statusCode} ${statusText}`);
      console.log(`✓ Load Time: ${loadTime}ms`);
      
    } catch (navError) {
      loadTime = Date.now() - startTime;
      
      // Handle specific error types
      if (navError.message.includes('timeout') || navError.message.includes('Navigation timeout')) {
        errorMessage = `Navigation timeout after ${TIMEOUT}ms`;
        console.error(`❌ ${errorMessage}`);
      } else if (navError.message.includes('net::ERR_SSL') || navError.message.includes('SSL')) {
        errorMessage = `SSL/TLS error: ${navError.message}`;
        console.error(`❌ ${errorMessage}`);
      } else if (navError.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        errorMessage = `DNS resolution failed: ${navError.message}`;
        console.error(`❌ ${errorMessage}`);
      } else if (navError.message.includes('net::ERR_CONNECTION_REFUSED')) {
        errorMessage = `Connection refused: ${navError.message}`;
        console.error(`❌ ${errorMessage}`);
      } else {
        errorMessage = `Navigation error: ${navError.message}`;
        console.error(`❌ ${errorMessage}`);
      }
      
      // Try to get response if available
      try {
        response = navError.response;
        if (response) {
          statusCode = response.status();
          statusText = response.statusText();
        }
      } catch (e) {
        // No response available
      }
    }
    
    // Check HTTP status code (2xx and 3xx are considered successful)
    if (statusCode >= 200 && statusCode < 400) {
      isUp = true;
      console.log(`✅ HTTP status indicates website is accessible`);
    } else if (statusCode >= 400) {
      isUp = false;
      errorMessage = errorMessage || `HTTP ${statusCode} ${statusText}`;
      console.error(`❌ HTTP error status: ${statusCode} ${statusText}`);
    } else if (statusCode === 0) {
      isUp = false;
      // Error message already set above
    }
    
    // Try to get page title and content (even if navigation failed)
    try {
      title = await page.title();
      console.log(`✓ Page Title: ${title || '(empty)'}`);
    } catch (e) {
      console.warn(`⚠️  Could not retrieve page title: ${e.message}`);
    }
    
    // Check if page has content (only if we got a response)
    if (isUp && response) {
      try {
        const bodyText = await page.textContent('body', { timeout: 5000 });
        if (!bodyText || bodyText.trim().length === 0) {
          isUp = false;
          errorMessage = 'Page loaded but appears to be empty (no body content)';
          console.error(`❌ ${errorMessage}`);
        } else {
          console.log(`✓ Page content verified (${bodyText.length} characters)`);
        }
      } catch (e) {
        console.warn(`⚠️  Could not verify page content: ${e.message}`);
      }
    }
    
    // Take timestamped screenshot
    const screenshotTimestamp = timestamp.replace(/[:.]/g, '-');
    const timestampedScreenshot = `${SCREENSHOT_DIR}/screenshot-${screenshotTimestamp}.png`;
    
    try {
      await page.screenshot({ 
        path: timestampedScreenshot,
        fullPage: true 
      });
      console.log(`✓ Timestamped screenshot saved: ${timestampedScreenshot}`);
    } catch (screenshotError) {
      console.error(`❌ Failed to save timestamped screenshot: ${screenshotError.message}`);
    }
    
    // Save latest screenshot
    try {
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/latest.png`,
        fullPage: true 
      });
      console.log(`✓ Latest screenshot saved: ${SCREENSHOT_DIR}/latest.png`);
    } catch (screenshotError) {
      console.error(`❌ Failed to save latest screenshot: ${screenshotError.message}`);
    }
    
    await browser.close();
    
    // Create comprehensive status report
    const report = {
      timestamp: timestamp,
      url: WEBSITE_URL,
      isUp: isUp,
      status: isUp ? 'UP' : 'DOWN',
      statusCode: statusCode,
      statusText: statusText || 'N/A',
      loadTime: loadTime,
      title: title || 'N/A',
      error: errorMessage || null,
      checkDuration: Date.now() - startTime
    };
    
    await fs.promises.writeFile(
      `${SCREENSHOT_DIR}/status.json`,
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n📊 Status Report:`);
    console.log(JSON.stringify(report, null, 2));
    
    if (!isUp) {
      console.error(`\n❌ Website Check Failed: ${errorMessage || 'Unknown error'}`);
      process.exit(1);
    }
    
    console.log(`\n✅ Website is healthy and accessible!`);
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Critical error during monitoring: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
    
    // Try to capture error screenshot if browser is still available
    if (browser) {
      try {
        const errorPage = await browser.newPage();
        await errorPage.goto(WEBSITE_URL, { 
          timeout: 10000,
          waitUntil: 'domcontentloaded'
        }).catch(() => {
          console.warn('Could not navigate for error screenshot');
        });
        
        await errorPage.screenshot({ 
          path: `${SCREENSHOT_DIR}/error-screenshot.png`,
          fullPage: true 
        });
        console.log(`✓ Error screenshot saved: ${SCREENSHOT_DIR}/error-screenshot.png`);
        
        await browser.close();
      } catch (e) {
        console.error(`Could not capture error screenshot: ${e.message}`);
        try {
          await browser.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
    }
    
    // Save error status report
    const errorReport = {
      timestamp: timestamp,
      url: WEBSITE_URL,
      isUp: false,
      status: 'DOWN',
      statusCode: statusCode || 0,
      statusText: 'Error',
      loadTime: loadTime,
      title: title || 'N/A',
      error: error.message,
      checkDuration: Date.now() - (Date.now() - (loadTime || 0))
    };
    
    try {
      await fs.promises.writeFile(
        `${SCREENSHOT_DIR}/status.json`,
        JSON.stringify(errorReport, null, 2)
      );
    } catch (writeError) {
      console.error(`Failed to write error report: ${writeError.message}`);
    }
    
    process.exit(1);
  }
}

// Run monitoring
monitor().catch((error) => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

