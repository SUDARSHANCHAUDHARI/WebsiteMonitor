# Website Monitor & Screenshot

A small, generic website uptime monitor. Point it at **any URL** and it will:

- check the site is reachable (HTTP status, redirects, content),
- capture full-page screenshots,
- write a machine-readable status report (`status.json`),
- optionally send a Slack alert when the site is down.

It's a plain Node.js + [Playwright](https://playwright.dev/) script — run it locally, from cron, or from any CI/scheduler you like. No service or paid dependency required.

## Quick start

```bash
# 1. Install dependencies (Playwright + Chromium)
npm install

# 2. Run a check against your URL
WEBSITE_URL=https://your-site.com node monitor.js

# …or pass the URL as an argument
node monitor.js https://your-site.com
```

Exit code is `0` when the site is **UP** and `1` when it's **DOWN**, so it slots straight into scripts and schedulers.

Results are written to `website-status/`:

- `latest.png` — most recent screenshot
- `screenshot-<timestamp>.png` — timestamped history
- `status.json` — full status report (see below)

## Configuration

All configuration is via environment variables. Only the URL is required.

| Variable | Default | Description |
|---|---|---|
| `WEBSITE_URL` | `https://example.com` | Target URL (or pass as the first CLI arg). |
| `TIMEOUT_MS` | `30000` | Navigation timeout in milliseconds. |
| `OUTPUT_DIR` | `website-status` | Where screenshots + `status.json` are written. |
| `EXPECTED_URL_CONTAINS` | _(empty)_ | If the final URL after redirects contains this substring, treat the site as UP. Handy for sites that redirect to a login/auth host. |
| `ERROR_PATTERNS` | `404 Not Found,NoSuchBucket,Code: NoSuchBucket` | Comma-separated strings that mark the page as DOWN if found in the body. |
| `SLACK_BOT_TOKEN` | _(empty)_ | Slack bot token (`xoxb-…`). Enables Slack alerts. |
| `SLACK_CHANNEL` | _(empty)_ | Slack channel (e.g. `#alerts`) or channel ID. |
| `SLACK_NOTIFY_ON_SUCCESS` | _(unset)_ | Set to `true` to also notify when the site is UP. |

### Example: a site that redirects to a login host

```bash
WEBSITE_URL=https://app.your-site.com \
EXPECTED_URL_CONTAINS=auth.your-site.com \
node monitor.js
```

## How status is decided

1. **Navigate** to `WEBSITE_URL` (follows redirects, honours `TIMEOUT_MS`).
2. **HTTP status:** `2xx`/`3xx` → candidate UP, `4xx`/`5xx` → DOWN, `0` → network/DNS/SSL/timeout error → DOWN.
3. **Content checks** (only when status is `2xx`/`3xx`):
   - if the body contains any `ERROR_PATTERNS` string → DOWN;
   - else if `EXPECTED_URL_CONTAINS` is set and the final URL matches → UP;
   - else if the body is empty → DOWN;
   - else → UP.
4. **Screenshots** are captured and `status.json` is written either way.

### status.json

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "url": "https://example.com/",
  "finalUrl": "https://example.com/",
  "isUp": true,
  "status": "UP",
  "statusCode": 200,
  "statusText": "OK",
  "loadTime": 1234,
  "title": "Example Domain",
  "redirected": false,
  "error": null,
  "checkDuration": 1500
}
```

## Scheduling

The script is a one-shot check; schedule it however you prefer.

**cron (every 15 minutes):**

```cron
*/15 * * * * cd /path/to/website-monitor && WEBSITE_URL=https://your-site.com /usr/bin/node monitor.js >> monitor.log 2>&1
```

**systemd timer, Docker, a cloud scheduler, or a CI cron** all work the same way — set `WEBSITE_URL` (and any optional vars) and run `node monitor.js`.

## Slack alerts (optional)

1. Create a Slack app at <https://api.slack.com/apps> → add the `chat:write` bot scope → install to your workspace → copy the bot token (`xoxb-…`).
2. Invite the bot to your channel (`/invite @YourBot`).
3. Set the env vars and run:

```bash
export SLACK_BOT_TOKEN="xoxb-…"
export SLACK_CHANNEL="#alerts"
WEBSITE_URL=https://your-site.com node monitor.js
```

By default Slack is notified only when the site is **down**. Set `SLACK_NOTIFY_ON_SUCCESS=true` to also get UP confirmations.

## Local testing

`tests/test-local.js` runs the exact same logic against a URL of your choice, writing to `./screenshots` so it doesn't touch the tracked `website-status/` folder. See [TESTING.md](TESTING.md).

```bash
WEBSITE_URL=https://your-site.com node tests/test-local.js
```

## License

MIT — see [LICENSE](LICENSE).
