#!/bin/bash

# Test Slack Notification Locally
# 
# Usage:
#   chmod +x test-slack.sh
#   ./test-slack.sh
#
# Or set environment variables:
#   export SLACK_BOT_TOKEN="xoxb-your-token"
#   export SLACK_CHANNEL="#alerts"
#   ./test-slack.sh

echo "🧪 Testing Slack Notification..."
echo ""

# Check if using bot token or webhook
if [ -n "$SLACK_BOT_TOKEN" ] && [ -n "$SLACK_CHANNEL" ]; then
  echo "📤 Using Bot Token method..."
  echo "Token: ${SLACK_BOT_TOKEN:0:10}... (hidden)"
  echo "Channel: $SLACK_CHANNEL"
  echo ""
  
  RESPONSE=$(curl -s -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{
      \"channel\": \"$SLACK_CHANNEL\",
      \"text\": \"🧪 Test message from website monitor\",
      \"blocks\": [
        {
          \"type\": \"header\",
          \"text\": {
            \"type\": \"plain_text\",
            \"text\": \"🧪 Test Alert\"
          }
        },
        {
          \"type\": \"section\",
          \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"This is a *test message* from the website monitor setup.\n\nIf you see this, your Slack integration is working! ✅\"
          }
        }
      ]
    }")
  
  echo "Response: $RESPONSE"
  echo ""
  
  if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Success! Check your Slack channel for the test message."
  else
    echo "❌ Failed! Check the error message above."
    echo "Common issues:"
    echo "  - Invalid token (should start with xoxb-)"
    echo "  - Bot not invited to channel"
    echo "  - Missing chat:write permission"
  fi

elif [ -n "$SLACK_WEBHOOK_URL" ]; then
  echo "📤 Using Webhook URL method..."
  echo "Webhook: ${SLACK_WEBHOOK_URL:0:30}... (hidden)"
  echo ""
  
  RESPONSE=$(curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d '{
      "text": "🧪 Test message from website monitor",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "This is a *test message* from the website monitor setup.\n\nIf you see this, your Slack integration is working! ✅"
          }
        }
      ]
    }')
  
  if [ $? -eq 0 ]; then
    echo "✅ Success! Check your Slack channel for the test message."
  else
    echo "❌ Failed! Check your webhook URL."
  fi

else
  echo "❌ No Slack credentials found!"
  echo ""
  echo "Set one of these options:"
  echo ""
  echo "Option 1: Bot Token (Recommended)"
  echo "  export SLACK_BOT_TOKEN='xoxb-your-token'"
  echo "  export SLACK_CHANNEL='#alerts'"
  echo ""
  echo "Option 2: Webhook URL"
  echo "  export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/...'"
  echo ""
  exit 1
fi

