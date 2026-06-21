# Status — WebsiteMonitor

**Last updated:** 2026-06-21
**Maturity:** 🟢 `status-production-ready`

## What's done

- `monitor.js` — point at any URL, returns a status report
- HTTP status / redirect / SSL / network / timeout error handling
- Full-page screenshots (timestamped history + `latest.png`)
- Machine-readable `status.json` with all key fields
- Configurable error patterns (default: `404 Not Found`, `NoSuchBucket`, `Code: NoSuchBucket`)
- `EXPECTED_URL_CONTAINS` for sites that redirect to a login host
- Optional Slack alerts (down by default; opt-in for UP too)
- 30-second navigation timeout (configurable)
- Pure `getConfig()` helper with sane defaults
- Test suite split into:
  - **`npm test`** — 9 offline `node:test` unit tests (config overrides vs env, ERROR_PATTERNS trimming, Slack settings, etc.) — runs without Chromium
  - **`npm run test:live`** — original Playwright check against a real URL
- Removed the brittle `postinstall: playwright install chromium` hook in favor of an explicit `npm run playwright:install` step
- Complete `.env.example` covering all 8 env vars
- Exit code 0/1 for scheduler integration
- README updated with new install + testing flow

## What's left

- **Schedule it somewhere** to be useful continuously: cron, systemd timer, GitHub Actions cron, Docker + your container scheduler, or any cloud scheduler. README covers all of these.
- Optional: more notification destinations beyond Slack (Discord, email, PagerDuty, etc.)
- Optional: persisted history view (currently each run overwrites latest)

## Quality gates

| Gate | Status |
|---|---|
| Build | n/a (Node script) |
| Tests | ✅ 9 offline + 1 live integration |
| Behavior preserved | ✅ `monitor.js` unchanged in the production-ready PR |

## Deployment

N/A in the traditional web-service sense — it's a **scheduled job**. Run via cron, GitHub Actions cron, or any scheduler. See README "Scheduling" section.

## File-by-file checklist

### Source
- [x] `monitor.js` — entire app: `getConfig()`, `hostOf()`, `runMonitor()`, `maybeNotifySlack()`. Pure helpers exported for testing.

### Tests
- [x] `tests/unit.test.js` — 9 offline `node:test` units (overrides vs env, default timeout, ERROR_PATTERNS parsing, Slack settings, notifyOnSuccess flag)
- [x] `tests/test-local.js` — original live Playwright check (`npm run test:live`)

### Tooling
- [x] `package.json` — scripts split (`test` offline, `test:live` browser, `playwright:install` explicit)
- [x] Removed brittle `postinstall: playwright install chromium` hook
- [x] `.env.example` covering all 8 env vars with defaults

### Output
- [x] Writes `latest.png`, `screenshot-<timestamp>.png`, `status.json` to `OUTPUT_DIR`

### Quality
- [x] 9 offline tests pass
- [x] Live test passes once Chromium is installed (`npm run playwright:install`)

### Not done
- [ ] Schedule it (cron / systemd / GitHub Actions cron / Docker scheduler — README covers all options)
- [ ] Optional: notification destinations beyond Slack (Discord, email, PagerDuty)
- [ ] Optional: persisted history view (each run overwrites `latest.png`)
