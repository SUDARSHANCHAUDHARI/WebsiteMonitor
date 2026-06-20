/**
 * Offline unit tests for monitor.js pure helpers.
 *
 * Uses node:test so it runs without Playwright's browser binary installed —
 * the live, browser-driven check lives in tests/test-local.js (npm run test:live).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { getConfig } = require(path.join(__dirname, '..', 'monitor.js'));

// hostOf isn't exported; verify URL host parsing indirectly via getConfig
// and via the public surface. We focus tests on the config layer because
// that's where most regressions actually land.

function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test('getConfig overrides win over env vars', () => {
  withEnv({ WEBSITE_URL: 'https://from-env.example' }, () => {
    const cfg = getConfig({ url: 'https://from-override.example' });
    assert.equal(cfg.url, 'https://from-override.example');
  });
});

test('getConfig falls back to env vars when no overrides given', () => {
  withEnv({ WEBSITE_URL: 'https://from-env.example', TIMEOUT_MS: '5000' }, () => {
    const cfg = getConfig({});
    assert.equal(cfg.url, 'https://from-env.example');
    assert.equal(cfg.timeout, 5000);
  });
});

test('getConfig defaults timeout to 30000 when nothing is set', () => {
  withEnv({ TIMEOUT_MS: undefined }, () => {
    const cfg = getConfig({});
    assert.equal(cfg.timeout, 30000);
  });
});

test('getConfig parses ERROR_PATTERNS into a trimmed, non-empty array', () => {
  withEnv({ ERROR_PATTERNS: '404 Not Found, NoSuchBucket , ,Banned' }, () => {
    const cfg = getConfig({});
    assert.deepEqual(cfg.errorPatterns, ['404 Not Found', 'NoSuchBucket', 'Banned']);
  });
});

test('getConfig uses the default error patterns when ERROR_PATTERNS unset', () => {
  withEnv({ ERROR_PATTERNS: undefined }, () => {
    const cfg = getConfig({});
    assert.deepEqual(cfg.errorPatterns, ['404 Not Found', 'NoSuchBucket', 'Code: NoSuchBucket']);
  });
});

test('getConfig surfaces Slack settings from env (token, channel, notifyOnSuccess flag)', () => {
  withEnv(
    {
      SLACK_BOT_TOKEN: 'xoxb-test',
      SLACK_CHANNEL: '#alerts',
      SLACK_NOTIFY_ON_SUCCESS: 'true',
    },
    () => {
      const cfg = getConfig({});
      assert.equal(cfg.slack.token, 'xoxb-test');
      assert.equal(cfg.slack.channel, '#alerts');
      assert.equal(cfg.slack.notifyOnSuccess, true);
    }
  );
});

test('getConfig.notifyOnSuccess is false when the env flag is anything other than "true"', () => {
  withEnv({ SLACK_NOTIFY_ON_SUCCESS: '1' }, () => {
    assert.equal(getConfig({}).slack.notifyOnSuccess, false);
  });
  withEnv({ SLACK_NOTIFY_ON_SUCCESS: undefined }, () => {
    assert.equal(getConfig({}).slack.notifyOnSuccess, false);
  });
});

test('getConfig defaults outputDir to website-status', () => {
  withEnv({ OUTPUT_DIR: undefined }, () => {
    assert.equal(getConfig({}).outputDir, 'website-status');
  });
});

test('getConfig defaults expectedUrlContains to empty string', () => {
  withEnv({ EXPECTED_URL_CONTAINS: undefined }, () => {
    assert.equal(getConfig({}).expectedUrlContains, '');
  });
});
