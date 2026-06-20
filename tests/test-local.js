/**
 * Local test runner for the Website Monitor.
 *
 * Runs the same monitoring logic used in production (monitor.js) against a URL
 * of your choice, writing screenshots + status.json into ./screenshots so you
 * don't disturb the tracked website-status/ folder.
 *
 * Usage:
 *   npm install && npx playwright install chromium
 *   WEBSITE_URL=https://your-site.com node tests/test-local.js
 *   node tests/test-local.js https://your-site.com
 */

const path = require('path');
const { runMonitor } = require(path.join(__dirname, '..', 'monitor.js'));

const url = process.argv[2] || process.env.WEBSITE_URL || 'https://example.com';

runMonitor({ url, outputDir: 'screenshots' })
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
