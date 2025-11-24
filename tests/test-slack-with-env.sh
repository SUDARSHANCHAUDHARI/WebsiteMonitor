#!/bin/bash

# Test Slack Notification with .env file support
# 
# Usage:
#   1. Create a .env file with your credentials:
#      SLACK_BOT_TOKEN=xoxb-your-token
#      SLACK_CHANNEL=#alerts
#   
#   2. Run: ./test-slack-with-env.sh
#
# Or set environment variables directly:
#   export SLACK_BOT_TOKEN="xoxb-your-token"
#   export SLACK_CHANNEL="#alerts"
#   ./test-slack-with-env.sh

# Load .env file if it exists (look in parent directory)
if [ -f ../.env ]; then
  echo "📁 Loading credentials from .env file..."
  export $(cat ../.env | grep -v '^#' | xargs)
  echo ""
fi

# Now run the original test script
./test-slack.sh

