# Local Testing Guide

Test the website monitor locally before pushing to GitHub.

## Prerequisites

Install Node.js and Playwright:

```bash
# Install Node.js dependencies
npm install playwright

# Install Chromium browser
npx playwright install chromium
```

## Test 1: Monitor Website (Main Script)

Test the core monitoring functionality:

```bash
node tests/test-local.js
```

**What it does:**
- ✅ Checks if website is accessible
- ✅ Takes screenshots
- ✅ Generates status.json
- ✅ Shows detailed logs

**Expected output:**
```
🔍 Starting website monitoring check...
📍 URL: https://start.screencloud.com/
⏱️  Timeout: 30000ms
✓ Response received
✓ Status Code: 200 OK
✓ Load Time: 1234ms
✅ HTTP status indicates website is accessible
✓ Page Title: ScreenCloud - Start
✓ Page content verified (12345 characters)
✓ Timestamped screenshot saved: screenshots/screenshot-2024-01-01T12-00-00-000Z.png
✓ Latest screenshot saved: screenshots/latest.png

📊 Status Report:
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "url": "https://start.screencloud.com/",
  "isUp": true,
  "status": "UP",
  "statusCode": 200,
  ...
}

✅ Website is healthy and accessible!
```

**Check results:**
- Look in `screenshots/` folder for:
  - `latest.png` - Latest screenshot
  - `status.json` - Status report
  - `screenshot-*.png` - Timestamped screenshots

## Test 2: Slack Notification

Test Slack integration:

### Using Bot Token (Recommended)

```bash
# Set your credentials
export SLACK_BOT_TOKEN="xoxb-your-token-here"
export SLACK_CHANNEL="#alerts"

# Make script executable
chmod +x tests/test-slack.sh

# Run test
./tests/test-slack.sh
```

### Using Webhook URL

```bash
# Set webhook URL
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Run test
./tests/test-slack.sh
```

**Expected output:**
```
🧪 Testing Slack Notification...
📤 Using Bot Token method...
Token: xoxb-1234... (hidden)
Channel: #alerts

Response: {"ok":true,"ts":"1234567890.123456","channel":"C1234567890",...}
✅ Success! Check your Slack channel for the test message.
```

**Check Slack:**
- You should see a test message in your channel
- If you see it, your integration is working! ✅

## Test 3: Simulate Website Down

Test error handling by checking a non-existent site:

```bash
# Temporarily modify tests/test-local.js to use a bad URL
# Change: const WEBSITE_URL = 'https://start.screencloud.com/';
# To:     const WEBSITE_URL = 'https://this-site-does-not-exist-12345.com/';

node tests/test-local.js
```

**Expected output:**
```
❌ DNS resolution failed: net::ERR_NAME_NOT_RESOLVED
❌ Website Check Failed: DNS resolution failed
```

This verifies error handling works correctly.

## Test 4: Full Workflow Simulation

Test the complete flow:

```bash
# 1. Run monitoring
node tests/test-local.js

# 2. Check if website is down (exit code 1 = down, 0 = up)
if [ $? -ne 0 ]; then
  echo "Website is down - would trigger notifications"
  # 3. Test Slack notification
  ./tests/test-slack.sh
else
  echo "Website is up - no notifications needed"
fi
```

## Troubleshooting

### Playwright Installation Issues

```bash
# If npx playwright install fails, try:
npm install -g playwright
playwright install chromium

# Or use system package manager:
# macOS
brew install --cask chromium

# Linux
sudo apt-get install chromium-browser
```

### Screenshots Not Saving

- Check `screenshots/` directory exists
- Verify write permissions: `chmod 755 screenshots/`
- Check disk space: `df -h`

### Slack Test Fails

**Bot Token Issues:**
- Verify token starts with `xoxb-`
- Check bot has `chat:write` permission
- Ensure bot is invited to channel (or has `chat:write.public`)

**Webhook Issues:**
- Verify URL format: `https://hooks.slack.com/services/T.../B.../...`
- Check webhook is still active in Slack app settings

## What to Check Before Pushing

✅ **Monitoring script works:**
```bash
node tests/test-local.js
# Should complete successfully and create screenshots
```

✅ **Slack notification works:**
```bash
./tests/test-slack.sh
# Should send test message to Slack
```

✅ **Error handling works:**
- Test with invalid URL (should handle gracefully)
- Check error screenshots are created

✅ **Files are correct:**
- `.github/workflows/website-monitor.yml` exists
- `README.md` is up to date
- No sensitive data in code (use secrets)

## Ready to Push!

Once all tests pass:
1. Commit your changes
2. Push to GitHub
3. Add secrets in GitHub (Settings → Secrets → Actions)
4. Test workflow manually in GitHub Actions tab

