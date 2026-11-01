# Website Monitor & Screenshot

A small, generic website uptime monitor. Point it at **any URL** and it will:

- check the site is reachable (HTTP status, redirects, content),
- capture full-page screenshots,
- write a machine-readable status report (`status.json`),
- optionally send a Slack alert when the site is down.

It's a plain Node.js + [Playwright](https://playwright.dev/) script — run it locally, from cron, or from any CI/scheduler you like. No service or paid dependency required.

## Table of Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [How status is decided](#how-status-is-decided)
- [Scheduling](#scheduling)
- [Slack alerts (optional)](#slack-alerts-optional)
- [Testing](#testing)
- [License](#license)
- [About](#about)

## Quick start

```bash
# 1. Install Node dependencies
npm install

# 2. Install the Chromium browser binary (one-time, ~150 MB)
npm run playwright:install

# 3. Run a check against your URL
WEBSITE_URL=https://your-site.com node monitor.js

# …or pass the URL as an argument
node monitor.js https://your-site.com
```

Copy `.env.example` to `.env` if you prefer to manage config there.

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

## Testing

Two suites, split by what they need:

```bash
# Offline unit tests for config parsing — no Chromium required.
npm test

# Live end-to-end check against a real URL — needs Chromium installed.
WEBSITE_URL=https://your-site.com npm run test:live
```

`tests/test-local.js` runs the exact same logic as `monitor.js` against a URL of your choice, writing to `./screenshots` so it doesn't touch the tracked `website-status/` folder. See [TESTING.md](TESTING.md).

## License

MIT — see [LICENSE](LICENSE).

---

## About

I'm Sudarshan Chaudhari, a Senior Quality Engineer, Test Automation specialist, and AI systems builder based in Bangkok, Thailand.

I have 13+ years of experience in software quality engineering, working across SaaS, fintech, gaming, web, mobile, cloud, and digital signage platforms. My background combines hands-on test automation with QA leadership, test strategy, CI/CD, release quality, production investigation, and cross-platform validation.

Alongside my professional QA career, I run [SudarshanTechLabs](https://sudarshantechlabs.com/), my independent engineering and product lab where I design, build, test, and ship software across Android, web, AI, cybersecurity, developer tooling, and cross-platform applications.

### What I work on

- ⚙️ **Quality Engineering & Test Automation** — Playwright, Selenium, Cypress, Appium, API testing, automation frameworks, end-to-end testing, CI/CD, release gates, GitHub Actions, risk-based testing, and production validation
- 🤖 **AI Systems & Automation** — AI agents, multi-agent orchestration, MCP servers, AI-assisted QA, prompt tooling, developer workflows, automation systems, and Claude Code plugins
- 📱 **Mobile & Cross-Platform Applications** — Android applications built with Kotlin and Jetpack Compose, Google Play releases, automated build and publishing pipelines, and cross-platform development spanning iOS, web, Windows, and macOS
- 🌐 **Web Applications & Platforms** — Full-stack applications using Next.js, TypeScript, Firebase, Cloudflare, REST APIs, and modern web infrastructure
- 🛠️ **Developer Tooling & CLI Engineering** — Rust, Python, TypeScript, CLI utilities, multi-repository tooling, build automation, release tooling, and engineering productivity systems
- 🛡️ **Cybersecurity & Observability** — Threat detection, log analysis, security auditing, vulnerability assessment, monitoring, and security-focused developer tools
- 📺 **Digital Signage & Device Platforms** — Content validation, playback testing, device compatibility, production investigation, monitoring, and QA across diverse hardware and operating-system environments

My work sits at the intersection of quality engineering, automation, AI, and software development. I approach products with a QA mindset from the beginning: understanding failure modes, designing for testability, automating repetitive work, and building release confidence into the engineering process.

Through SudarshanTechLabs, I also build products and tools from idea to production, covering architecture, development, testing, CI/CD, release automation, monitoring, and ongoing maintenance.

🌐 [sudarshantechlabs.com](https://sudarshantechlabs.com/) · 💼 [LinkedIn](https://linkedin.com/in/sudarshan-chaudhari) · 🐙 [GitHub](https://github.com/SUDARSHANCHAUDHARI) · ✉️ [sunny.sudarshan@gmail.com](mailto:sunny.sudarshan@gmail.com)
