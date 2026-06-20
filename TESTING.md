# Local Testing Guide

Run the monitor against any URL on your machine before wiring it into a schedule.

## Prerequisites

```bash
# Installs Playwright and (via postinstall) the Chromium browser
npm install

# If the browser didn't install automatically:
npx playwright install chromium
```

## Test 1: Check a website

`tests/test-local.js` runs the same logic as `monitor.js`, but writes to
`./screenshots` so it doesn't touch the tracked `website-status/` folder.

```bash
WEBSITE_URL=https://your-site.com node tests/test-local.js
# or
node tests/test-local.js https://your-site.com
```

**What it does:**
- Checks the site is reachable
- Captures screenshots
- Writes `screenshots/status.json`
- Prints detailed logs

**Expected output (UP):**
```
🔍 Checking website: https://your-site.com
✓ Status Code: 200 OK
✓ Load Time: 1234ms
✓ Final URL: https://your-site.com/
✅ HTTP status indicates website is accessible

📊 Status Report:
{ "url": "https://your-site.com", "isUp": true, "status": "UP", ... }

✅ Website is healthy and accessible!
```

Check the `screenshots/` folder for `latest.png`, the timestamped PNG, and `status.json`.

## Test 2: Simulate a site that's down

Point it at a host that doesn't resolve to confirm error handling:

```bash
node tests/test-local.js https://this-site-does-not-exist-12345.example
```

**Expected output:**
```
❌ DNS resolution failed: net::ERR_NAME_NOT_RESOLVED
❌ Website Check Failed: DNS resolution failed ...
```

Exit code will be `1`.

## Test 3: Detect content errors

Use `ERROR_PATTERNS` to flag a page that returns `200` but renders an error
(e.g. a broken static host):

```bash
ERROR_PATTERNS="404 Not Found,NoSuchBucket" \
  node tests/test-local.js https://your-site.com
```

If any pattern appears in the page body, the site is reported as DOWN.

## Test 4: Slack notification

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_CHANNEL="#alerts"

# Notify on down (default) — point at a dead host to trigger it
node tests/test-local.js https://this-site-does-not-exist-12345.example

# Or confirm the happy path too
SLACK_NOTIFY_ON_SUCCESS=true node tests/test-local.js https://your-site.com
```

A standalone Slack smoke test is also available:

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_CHANNEL="#alerts"
./tests/test-slack.sh
```

## Troubleshooting

### Playwright install issues
```bash
npm install -g playwright
playwright install chromium
# macOS: brew install --cask chromium
# Linux: sudo apt-get install chromium-browser
```

### Screenshots not saving
- Verify the output directory is writable
- Check available disk space: `df -h`

### Slack test fails
- Bot token must start with `xoxb-`
- Bot needs the `chat:write` scope and must be invited to the channel
  (or have `chat:write.public`)
