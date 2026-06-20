/**
 * Generic Website Monitor
 *
 * Checks any website's availability, captures full-page screenshots, writes a
 * status report (status.json), and optionally sends a Slack notification.
 *
 * Configuration (all optional except the URL):
 *   WEBSITE_URL            Target URL to monitor (or pass as the first CLI arg).
 *                          Default: https://example.com
 *   TIMEOUT_MS             Navigation timeout in ms. Default: 30000
 *   OUTPUT_DIR             Where screenshots + status.json are written.
 *                          Default: website-status
 *   EXPECTED_URL_CONTAINS  If the final URL (after redirects) contains this
 *                          substring, the site is treated as UP. Useful for
 *                          sites that redirect to a login/auth host. Optional.
 *   ERROR_PATTERNS         Comma-separated strings that mark the page as DOWN
 *                          if found in the body. Default:
 *                          "404 Not Found,NoSuchBucket,Code: NoSuchBucket"
 *   SLACK_BOT_TOKEN        Slack bot token (xoxb-...). Enables notifications.
 *   SLACK_CHANNEL          Slack channel (e.g. #alerts) or channel ID.
 *   SLACK_NOTIFY_ON_SUCCESS  Set to "true" to also notify when the site is UP.
 *
 * Usage:
 *   WEBSITE_URL=https://your-site.com node monitor.js
 *   node monitor.js https://your-site.com
 *
 * Exit code: 0 when the site is UP, 1 when DOWN or on a fatal error.
 */

const { chromium } = require('playwright');
const fs = require('fs');

function getConfig(overrides = {}) {
  const errorPatterns =
    overrides.errorPatterns ||
    process.env.ERROR_PATTERNS ||
    '404 Not Found,NoSuchBucket,Code: NoSuchBucket';

  return {
    url: overrides.url || process.env.WEBSITE_URL || process.argv[2] || 'https://example.com',
    timeout: Number(overrides.timeout || process.env.TIMEOUT_MS || 30000),
    outputDir: overrides.outputDir || process.env.OUTPUT_DIR || 'website-status',
    expectedUrlContains:
      overrides.expectedUrlContains ?? process.env.EXPECTED_URL_CONTAINS ?? '',
    errorPatterns: errorPatterns.split(',').map((s) => s.trim()).filter(Boolean),
    slack: {
      token: process.env.SLACK_BOT_TOKEN || '',
      channel: process.env.SLACK_CHANNEL || '',
      notifyOnSuccess: process.env.SLACK_NOTIFY_ON_SUCCESS === 'true',
    },
  };
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch (e) {
    return '';
  }
}

/**
 * Run a single monitoring check. Writes screenshots + status.json into
 * config.outputDir and returns the status report object. Does not call
 * process.exit — the caller decides what to do with report.isUp.
 */
async function runMonitor(overrides = {}) {
  const config = getConfig(overrides);
  const { url: WEBSITE_URL, timeout: TIMEOUT, outputDir: SCREENSHOT_DIR } = config;

  let browser;
  let statusCode = 0;
  let statusText = '';
  let loadTime = null;
  let title = '';
  let errorMessage = '';
  let isUp = false;
  let finalUrl = '';
  let redirected = false;
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });

  try {
    console.log(`🔍 Checking website: ${WEBSITE_URL}`);
    console.log(`⏱️  Timeout: ${TIMEOUT}ms`);

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: false,
    });

    const page = await context.newPage();

    page.on('pageerror', (error) => console.warn(`⚠️  Page error: ${error.message}`));
    page.on('requestfailed', (request) =>
      console.warn(`⚠️  Request failed: ${request.url()} - ${request.failure()?.errorText}`)
    );

    // Navigate with comprehensive error handling
    let response;
    try {
      response = await page.goto(WEBSITE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
      loadTime = Date.now() - startTime;
      statusCode = response.status();
      statusText = response.statusText();
      console.log(`✓ Status Code: ${statusCode} ${statusText}`);
      console.log(`✓ Load Time: ${loadTime}ms`);
    } catch (navError) {
      loadTime = Date.now() - startTime;
      if (navError.message.includes('timeout') || navError.message.includes('Navigation timeout')) {
        errorMessage = `Navigation timeout after ${TIMEOUT}ms`;
      } else if (navError.message.includes('net::ERR_SSL') || navError.message.includes('SSL')) {
        errorMessage = `SSL/TLS error: ${navError.message}`;
      } else if (navError.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        errorMessage = `DNS resolution failed: ${navError.message}`;
      } else if (navError.message.includes('net::ERR_CONNECTION_REFUSED')) {
        errorMessage = `Connection refused: ${navError.message}`;
      } else {
        errorMessage = `Navigation error: ${navError.message}`;
      }
      console.error(`❌ ${errorMessage}`);
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

    // Final URL after redirects
    try {
      finalUrl = page.url();
      redirected = !!finalUrl && hostOf(finalUrl) !== hostOf(WEBSITE_URL);
      console.log(`✓ Final URL: ${finalUrl}${redirected ? ' (redirected)' : ''}`);
    } catch (e) {
      finalUrl = WEBSITE_URL;
    }

    // Page title
    try {
      title = await page.title();
      console.log(`✓ Page Title: ${title || '(empty)'}`);
    } catch (e) {
      console.warn(`⚠️  Could not retrieve page title: ${e.message}`);
    }

    // Page body for error detection
    let bodyText = '';
    try {
      bodyText = (await page.textContent('body', { timeout: 5000 })) || '';
      console.log(`✓ Page content retrieved (${bodyText.length} characters)`);
    } catch (e) {
      console.warn(`⚠️  Could not retrieve page content: ${e.message}`);
    }

    // Decide UP/DOWN
    if (statusCode >= 200 && statusCode < 400) {
      let foundError = false;
      for (const pattern of config.errorPatterns) {
        if (pattern && bodyText.includes(pattern)) {
          isUp = false;
          errorMessage = `Page contains error: "${pattern}"`;
          console.error(`❌ ${errorMessage}`);
          foundError = true;
          break;
        }
      }

      if (!foundError) {
        if (config.expectedUrlContains && finalUrl.includes(config.expectedUrlContains)) {
          // Redirected to an expected destination (e.g. a login/auth host)
          isUp = true;
          console.log(`✅ Final URL matches EXPECTED_URL_CONTAINS — site is accessible`);
        } else if (!bodyText || bodyText.trim().length === 0) {
          isUp = false;
          errorMessage = 'Page loaded but appears to be empty (no body content)';
          console.error(`❌ ${errorMessage}`);
        } else {
          isUp = true;
          console.log(`✅ HTTP status indicates website is accessible`);
        }
      }
    } else if (statusCode >= 400) {
      isUp = false;
      errorMessage = errorMessage || `HTTP ${statusCode} ${statusText}`;
      console.error(`❌ HTTP error status: ${statusCode} ${statusText}`);
    } else {
      isUp = false; // statusCode === 0, error already set
    }

    // Screenshots
    const screenshotTimestamp = timestamp.replace(/[:.]/g, '-');
    await page
      .screenshot({ path: `${SCREENSHOT_DIR}/screenshot-${screenshotTimestamp}.png`, fullPage: true })
      .catch((e) => console.error(`❌ Timestamped screenshot failed: ${e.message}`));
    await page
      .screenshot({ path: `${SCREENSHOT_DIR}/latest.png`, fullPage: true })
      .catch((e) => console.error(`❌ Latest screenshot failed: ${e.message}`));

    await browser.close();
    browser = null;
  } catch (error) {
    console.error(`❌ Critical error during monitoring: ${error.message}`);
    isUp = false;
    errorMessage = errorMessage || error.message;
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }

  const report = {
    timestamp,
    url: WEBSITE_URL,
    finalUrl: finalUrl || WEBSITE_URL,
    isUp,
    status: isUp ? 'UP' : 'DOWN',
    statusCode,
    statusText: statusText || 'N/A',
    loadTime,
    title: title || 'N/A',
    redirected,
    error: errorMessage || null,
    checkDuration: Date.now() - startTime,
  };

  try {
    await fs.promises.writeFile(`${SCREENSHOT_DIR}/status.json`, JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(`Failed to write status report: ${e.message}`);
  }

  console.log(`\n📊 Status Report:`);
  console.log(JSON.stringify(report, null, 2));

  await maybeNotifySlack(config, report);

  return report;
}

/**
 * Send a Slack message via chat.postMessage when configured. Silently skips
 * when no token/channel is set. Notifies on DOWN always, on UP only when
 * SLACK_NOTIFY_ON_SUCCESS=true.
 */
async function maybeNotifySlack(config, report) {
  const { token, channel, notifyOnSuccess } = config.slack;
  if (!token || !channel) return;
  if (report.isUp && !notifyOnSuccess) return;

  const headline = report.isUp ? '✅ Website Status: UP' : '🚨 Website Down';
  const lines = [
    `*Website:* ${report.url}`,
    `*Status:* ${report.status}`,
    `*Final URL:* ${report.finalUrl}`,
    report.loadTime != null ? `*Load Time:* ${report.loadTime}ms` : null,
    report.error ? `*Error:* ${report.error}` : null,
    `*Time:* ${report.timestamp}`,
  ].filter(Boolean);

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text: headline,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: headline } },
          { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
        ],
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`Slack notification failed: ${data.error}`);
    } else {
      console.log('✓ Slack notification sent');
    }
  } catch (e) {
    console.error(`Slack notification error: ${e.message}`);
  }
}

module.exports = { runMonitor, getConfig };

// Run directly: node monitor.js [url]
if (require.main === module) {
  runMonitor()
    .then((report) => {
      if (!report.isUp) {
        console.error(`\n❌ Website Check Failed: ${report.error || 'Unknown error'}`);
        process.exit(1);
      }
      console.log(`\n✅ Website is healthy and accessible!`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Unhandled error: ${error.message}`);
      process.exit(1);
    });
}
