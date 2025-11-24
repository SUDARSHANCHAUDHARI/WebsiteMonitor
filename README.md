# Website Monitor & Screenshot

Automated website monitoring for **https://start.screencloud.com/** using GitHub Actions. This solution provides comprehensive monitoring with screenshot capture, status tracking, and automated alerts - all within GitHub's free tier.

## Features

✅ **Automated Monitoring**
- Runs every 15 minutes (configurable)
- Checks HTTP status codes (2xx/3xx = success)
- Validates page content and load times
- Handles timeouts, SSL errors, and network failures
- **Detects specific errors**: "404 Not Found", "NoSuchBucket", "Code: NoSuchBucket"
- **Tracks redirects**: Validates redirects to `auth.screencloud.com/*` (expected behavior)

✅ **Screenshot Capture**
- Full-page screenshots on every check
- Timestamped screenshots for history
- Latest screenshot committed to repo
- Error screenshots on failures
- 30-day artifact retention

✅ **Smart Notifications**
- Automatic GitHub issue creation on failure
- Slack webhook notifications (Bot Token method)
- Email notifications (commented out, can be enabled)
- Prevents duplicate issue spam
- Detailed error information in alerts

✅ **Production Ready**
- Comprehensive error handling
- Detailed logging for debugging
- Works within GitHub Actions free tier
- No external dependencies or paid services

## Website Behavior

### When Working Correctly ✅

- `https://start.screencloud.com/` redirects to `https://auth.screencloud.com/`
- OR redirects to `https://auth.screencloud.com/organization`
- These redirects are **NORMAL** and indicate the site is working
- Status code: 2xx or 3xx
- No error messages on page

### When There's an Issue ❌

- Page shows "404 Not Found"
- Page contains "Code: NoSuchBucket" error
- Page shows AWS S3 bucket error
- HTTP status codes 400-599
- Timeouts (>30 seconds)
- SSL/TLS errors
- DNS resolution failures

## Quick Setup

### 1. Repository Structure

The workflow expects this structure:
```
website-monitor/
├── .github/
│   └── workflows/
│       └── website-monitor.yml    # GitHub Actions workflow
├── README.md
├── website-status/
│   ├── .gitkeep                   # Initial placeholder
│   ├── latest.png                 # Auto-generated (latest screenshot)
│   └── status.json                # Auto-generated (status data)
└── .gitignore
```

### 2. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on **Settings** → **Actions** → **General**
3. Under "Workflow permissions", select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
4. Click **Save**

### 3. Test the Workflow

1. Go to the **Actions** tab in your repository
2. Click **Website Monitor & Screenshot** in the left sidebar
3. Click **Run workflow** → **Run workflow** (green button)
4. Wait for the workflow to complete (~1-2 minutes)
5. Check the workflow run logs to verify it's working

### 4. Configure Notifications (Optional)

#### Option A: GitHub Issues (Default - No Setup Required)
- When website is down, an issue will automatically be created
- You'll get notifications via GitHub
- Prevents duplicate issues (checks for existing open issues)

#### Option B: Slack Notifications (Recommended)

**Method 1: Using Bot Token (Recommended)**

1. Create a Slack App:
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name it (e.g., "Website Monitor") and select your workspace
   - Click "Create App"

2. Add Bot Token Scopes:
   - Go to "OAuth & Permissions" in the left sidebar
   - Scroll to "Scopes" → "Bot Token Scopes"
   - Add `chat:write` scope
   - Click "Save Changes"

3. Install App to Workspace:
   - Scroll to top and click "Install to Workspace"
   - Review permissions and click "Allow"
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)

4. Add Secrets to GitHub:
   - Go to your repository → **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Add `SLACK_BOT_TOKEN`: Your bot token (starts with `xoxb-`)
   - Add `SLACK_CHANNEL`: Your channel name (e.g., `#alerts`) or channel ID (e.g., `C1234567890`)
   - Click **Add secret** for each

5. Invite Bot to Channel:
   - Go to your Slack channel
   - Type `/invite @YourBotName` or add the bot manually
   - The bot needs to be in the channel to send messages

**Method 2: Using Webhook URL (Alternative)**

1. Create a [Slack Incoming Webhook](https://api.slack.com/messaging/webhooks)
2. Add to repository secrets:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Add `SLACK_WEBHOOK_URL`: Your Slack webhook URL
   - Note: Webhook method is currently commented out in the workflow

#### Option C: Email Notifications (Currently Disabled)

Email notifications are currently commented out in the workflow. To enable:

1. Uncomment the email notification step in `.github/workflows/website-monitor.yml`
2. Add these secrets to your repository:
   - `EMAIL_USERNAME`: Your Gmail address
   - `EMAIL_PASSWORD`: Your Gmail App Password ([Create one here](https://support.google.com/accounts/answer/185833))
   - `ALERT_EMAIL`: Email address to receive alerts

## How It Works

### Monitoring Process

**Every 15 minutes, the workflow:**

1. **Launches Playwright browser** (headless Chromium)
2. **Navigates to https://start.screencloud.com/**
   - Waits for `networkidle` state
   - 30-second timeout
   - Handles SSL errors gracefully
3. **Tracks redirects**
   - Follows redirects automatically
   - Gets final URL after all redirects
   - Checks if redirected to `auth.screencloud.com/*` (expected)
4. **Checks HTTP status code**
   - 2xx/3xx = ✅ UP (if no error messages found)
   - 4xx/5xx = ❌ DOWN
   - 0 = Network/DNS error
5. **Validates page content**
   - Checks for error messages: "404 Not Found", "NoSuchBucket", "Code: NoSuchBucket"
   - Checks for non-empty body content
   - Retrieves page title
   - Measures load time
6. **Determines status**
   - ✅ **UP** if:
     - Redirected to `auth.screencloud.com/*` (expected behavior)
     - Status 2xx/3xx AND no error messages in content
   - ❌ **DOWN** if:
     - Contains "404 Not Found" or "NoSuchBucket" errors
     - HTTP 4xx/5xx status codes
     - Timeout or network errors
     - Empty page content
7. **Captures screenshots**
   - Timestamped: `screenshot-2024-01-01T12-00-00-000Z.png`
   - Latest: `latest.png` (overwritten each run)
   - Error: `error-screenshot.png` (on failures)
8. **Generates status report** (`status.json`)
9. **Commits results** to `website-status/` folder
10. **Uploads artifacts** (30-day retention)
11. **Sends notifications** (if website is down)

### Error Detection

The monitoring script detects these specific error types:

| Error Type | Detection Method | Example |
|------------|------------------|---------|
| **404 Not Found** | Text content check | Page contains "404 Not Found" |
| **NoSuchBucket** | Text content check | Page contains "NoSuchBucket" or "Code: NoSuchBucket" |
| **Timeout** | Navigation timeout after 30s | `Navigation timeout after 30000ms` |
| **SSL Error** | Certificate validation failure | `SSL/TLS error: net::ERR_CERT_AUTHORITY_INVALID` |
| **DNS Failure** | Name resolution error | `DNS resolution failed: net::ERR_NAME_NOT_RESOLVED` |
| **Connection Refused** | Server not accepting connections | `Connection refused: net::ERR_CONNECTION_REFUSED` |
| **HTTP Error** | 4xx/5xx status codes | `HTTP 500 Internal Server Error` |
| **Empty Page** | No body content | `Page loaded but appears to be empty` |

### HTTP Status Code Handling

- **2xx (Success)**: ✅ Website is UP (if no error messages in content)
- **3xx (Redirect)**: ✅ Website is UP (redirects are normal, especially to `auth.screencloud.com`)
- **4xx (Client Error)**: ❌ Website is DOWN
- **5xx (Server Error)**: ❌ Website is DOWN
- **0 (No Response)**: ❌ Network/DNS/Timeout error

### Redirect Handling

The workflow automatically:
- ✅ Follows redirects (Playwright handles this)
- ✅ Tracks final URL after all redirects
- ✅ Validates redirects to `auth.screencloud.com/*` as **expected behavior**
- ✅ Reports redirect status in `status.json` (`redirectedToAuth: true/false`)

**Expected Behavior:**
- `https://start.screencloud.com/` → `https://auth.screencloud.com/` ✅ UP
- `https://start.screencloud.com/` → `https://auth.screencloud.com/organization` ✅ UP

**Error Behavior:**
- `https://start.screencloud.com/` → Shows "404 Not Found" ❌ DOWN
- `https://start.screencloud.com/` → Shows "NoSuchBucket" ❌ DOWN

### When Website Goes Down

**Automatic actions:**
1. ❌ Workflow fails (exit code 1)
2. 📸 Error screenshot captured (if possible)
3. 📝 Status saved to `status.json` with error details
4. 🎫 GitHub issue created (if no open issues exist)
5. 💬 Slack notification sent (if configured)
6. 📧 Email notification (currently disabled - can be enabled)

## Accessing Screenshots & Status

### Method 1: Workflow Artifacts (Recommended)

**Best for:** Historical screenshots, debugging, full history

1. Go to **Actions** tab in your repository
2. Click on any workflow run
3. Scroll down to **Artifacts** section
4. Download `website-screenshots-XXX` (contains all screenshots from that run)
5. Extract the ZIP file to see:
   - `screenshot-YYYY-MM-DDTHH-MM-SS-sssZ.png` - Timestamped screenshots
   - `latest.png` - Latest screenshot from that run
   - `status.json` - Status report
   - `error-screenshot.png` - Error screenshot (if failure occurred)

**Retention:** 30 days (configurable in workflow)

### Method 2: Repository Files

**Best for:** Quick access, latest status only

Screenshots are automatically committed to `website-status/` folder:
- `latest.png` - Most recent successful screenshot
- `status.json` - Current status report with metadata

**View in GitHub:**
- Navigate to `website-status/` folder in your repo
- Click on `latest.png` to view the screenshot
- Click on `status.json` to see the status data

**Example status.json:**
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "url": "https://start.screencloud.com/",
  "finalUrl": "https://auth.screencloud.com/",
  "isUp": true,
  "status": "UP",
  "statusCode": 200,
  "statusText": "OK",
  "loadTime": 1234,
  "title": "ScreenCloud - Authentication",
  "redirectedToAuth": true,
  "error": null,
  "checkDuration": 1500
}
```

### Method 3: GitHub API

You can also access status programmatically:
```bash
# Get latest status
curl https://api.github.com/repos/YOUR_USERNAME/website-monitor/contents/website-status/status.json

# Get latest screenshot (requires authentication)
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/YOUR_USERNAME/website-monitor/contents/website-status/latest.png
```

## Customization

### Change Check Frequency

Edit the cron schedule in the workflow file:
```yaml
schedule:
  - cron: '*/15 * * * *'  # Every 15 minutes
  # - cron: '*/5 * * * *'   # Every 5 minutes
  # - cron: '0 * * * *'     # Every hour
  # - cron: '0 */6 * * *'   # Every 6 hours
```

### Add Content Checks

In the monitor.js script, add specific checks:
```javascript
// Check for specific text
const hasExpectedContent = await page.locator('text=ScreenCloud').isVisible();
if (!hasExpectedContent) {
  success = false;
  errorMessage = 'Expected content not found';
}
```

### Adjust Screenshot Settings

```javascript
await page.screenshot({ 
  path: screenshotPath,
  fullPage: true,        // Capture entire page
  // fullPage: false,    // Capture viewport only
  // clip: { x: 0, y: 0, width: 1920, height: 1080 } // Specific area
});
```

## Troubleshooting

### Workflow not running
- Check if Actions are enabled in repository settings
- Verify the workflow file is in `.github/workflows/` folder
- Check the Actions tab for error messages

### Email notifications not working
- Verify Gmail App Password (not regular password)
- Check secrets are correctly named
- Ensure 2FA is enabled on Gmail account

### Screenshots not appearing
- Check workflow artifacts in the Actions tab
- Verify the workflow completed successfully
- Look for error messages in the workflow logs

### Slack notifications not working

**If using Bot Token:**
1. ✅ Verify secrets are set: `SLACK_BOT_TOKEN` and `SLACK_CHANNEL`
2. ✅ Check token starts with `xoxb-` (Bot User OAuth Token)
3. ✅ Verify bot has `chat:write` permission in Slack app settings
4. ✅ Ensure bot is invited to channel OR has `chat:write.public` scope
5. ✅ Test manually:
   ```bash
   curl -X POST https://slack.com/api/chat.postMessage \
     -H "Authorization: Bearer YOUR_BOT_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"channel":"#your-channel","text":"Test"}'
   ```

**If using Webhook:**
1. ✅ Verify `SLACK_WEBHOOK_URL` secret is set
2. ✅ Check webhook URL format: `https://hooks.slack.com/services/T.../B.../...`
3. ✅ Test webhook manually:
   ```bash
   curl -X POST YOUR_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test message"}'
   ```

### GitHub Issues Not Created
- ✅ Verify `permissions: issues: write` in workflow
- ✅ Check if open issue already exists (prevents spam)
- ✅ Verify repository has Issues enabled
- ✅ Check workflow logs for permission errors

### Website Always Shows as Down (False Positives)

If the website is working but always shows as DOWN:

1. **Check redirects:**
   - Verify the website actually redirects to `auth.screencloud.com`
   - Check `status.json` for `finalUrl` and `redirectedToAuth` fields

2. **Check error detection:**
   - Review workflow logs for detected error messages
   - Verify the page doesn't contain "404 Not Found" or "NoSuchBucket"

3. **Check status code:**
   - Verify HTTP status is 2xx or 3xx
   - Check `status.json` for `statusCode` field

4. **Test manually:**
   - Visit `https://start.screencloud.com/` in your browser
   - Check what URL it redirects to
   - Check for any error messages on the page

## Technical Specifications

### Error Handling

The monitoring script handles all common failure scenarios:

| Error Type | Detection Method | Example |
|------------|------------------|---------|
| **404 Not Found** | Text content contains "404 Not Found" | Page shows "404 Not Found" |
| **NoSuchBucket** | Text content contains "NoSuchBucket" | Page shows "Code: NoSuchBucket" |
| **Timeout** | Navigation timeout after 30s | `Navigation timeout after 30000ms` |
| **SSL Error** | Certificate validation failure | `SSL/TLS error: net::ERR_CERT_AUTHORITY_INVALID` |
| **DNS Failure** | Name resolution error | `DNS resolution failed: net::ERR_NAME_NOT_RESOLVED` |
| **Connection Refused** | Server not accepting connections | `Connection refused: net::ERR_CONNECTION_REFUSED` |
| **HTTP Error** | 4xx/5xx status codes | `HTTP 500 Internal Server Error` |
| **Empty Page** | No body content | `Page loaded but appears to be empty` |

### Performance Metrics

- **Average check duration**: ~1-2 minutes
- **Screenshot size**: ~500KB - 2MB (depending on page size)
- **Network timeout**: 30 seconds
- **Browser viewport**: 1920x1080 pixels

### GitHub Actions Usage

**Free Tier Limits:**
- 2,000 minutes/month for private repos
- 500 minutes/month for free accounts (public repos unlimited)

**Usage Calculation:**
- Each check: ~1-2 minutes
- At 15-minute intervals: ~96 checks/day = ~2,880 checks/month
- Monthly usage: ~2,880 - 5,760 minutes/month

**Recommendations:**
- ✅ Works well within free tier for private repos
- ⚠️ For public repos, consider reducing frequency to every 30-60 minutes
- 💡 Monitor your usage in Settings → Billing → Actions

## Advanced Configuration

### Monitor Multiple Websites

To monitor multiple websites, create separate jobs:

```yaml
jobs:
  monitor-screencloud:
    runs-on: ubuntu-latest
    steps:
      # ... existing steps with https://start.screencloud.com/
  
  monitor-other-site:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      # ... same steps but change WEBSITE_URL in monitor.js
```

Or use a matrix strategy:

```yaml
jobs:
  monitor:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        site:
          - url: 'https://start.screencloud.com/'
            name: 'screencloud'
          - url: 'https://example.com/'
            name: 'example'
    steps:
      - name: Monitor ${{ matrix.site.name }}
        # Use ${{ matrix.site.url }} in your script
```

### Custom Content Validation

Add specific checks in the monitoring script:

```javascript
// Check for specific text on page
const hasExpectedText = await page.locator('text=ScreenCloud').isVisible();
if (!hasExpectedText) {
  success = false;
  errorMessage = 'Expected text "ScreenCloud" not found';
}

// Check for specific element
const logo = await page.locator('img[alt="ScreenCloud"]');
if (!(await logo.isVisible())) {
  success = false;
  errorMessage = 'Logo not found';
}

// Check page load performance
const performanceMetrics = await page.evaluate(() => {
  return JSON.stringify(window.performance.timing);
});
console.log('Performance:', performanceMetrics);
```

### Adjust Screenshot Quality

```javascript
await page.screenshot({ 
  path: screenshotPath,
  fullPage: true,           // Capture entire scrollable page
  // fullPage: false,       // Capture viewport only
  // quality: 80,           // JPEG quality (0-100, PNG ignores this)
  // type: 'png',           // 'png' or 'jpeg'
  // clip: {                // Capture specific area
  //   x: 0, 
  //   y: 0, 
  //   width: 1920, 
  //   height: 1080 
  // }
});
```

## Testing

### Manual Testing

1. **Test the workflow manually:**
   - Go to Actions tab
   - Click "Website Monitor & Screenshot"
   - Click "Run workflow" → "Run workflow"
   - Wait for completion and check results

2. **Verify screenshots:**
   - Check workflow artifacts
   - Verify `website-status/latest.png` in repository
   - Check `website-status/status.json` for status data

3. **Test Slack notifications:**
   - Temporarily modify the workflow to always fail
   - Or wait for an actual failure
   - Verify Slack message is received

### Simulate Website Down

To test error handling, you can:
1. Temporarily change the URL in the workflow to a non-existent site
2. Or wait for an actual failure
3. Check that error screenshots are captured
4. Verify GitHub issue is created
5. Verify Slack notification is sent

## Support & Resources

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Playwright Docs**: https://playwright.dev/
- **Workflow Logs**: Check Actions tab for detailed error messages
- **Cron Syntax**: https://crontab.guru/ (test your schedule)
- **Slack API Docs**: https://api.slack.com/

## License

MIT License - Feel free to use and modify for your needs.
