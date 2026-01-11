#!/bin/bash

# ===========================================
# ENEOS Sales Automation - Webhook Test Script
# ===========================================

# Default values
BASE_URL="${1:-http://localhost:3000}"

echo "🧪 Testing ENEOS Sales Automation API"
echo "📍 Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s "$BASE_URL/health" | jq .
echo ""

# Test 2: Ready Check
echo "2️⃣  Testing Ready Check..."
curl -s "$BASE_URL/ready" | jq .
echo ""

# Test 3: API Info
echo "3️⃣  Testing API Info..."
curl -s "$BASE_URL/" | jq .
echo ""

# Test 4: Brevo Webhook Verification
echo "4️⃣  Testing Brevo Webhook (GET)..."
curl -s "$BASE_URL/webhook/brevo" | jq .
echo ""

# Test 5: Brevo Webhook with Mock Data
echo "5️⃣  Testing Brevo Webhook (POST - Click Event)..."
curl -s -X POST "$BASE_URL/webhook/brevo" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "click",
    "email": "test@example.com",
    "id": 99999,
    "date": "2024-01-15T10:30:00.000Z",
    "message-id": "test-msg-123",
    "subject": "Test Email",
    "campaign_id": 99999,
    "campaign_name": "Test Campaign",
    "contact_id": 12345,
    "FIRSTNAME": "Test",
    "LASTNAME": "User",
    "PHONE": "0812345678",
    "COMPANY": "Test Company"
  }' | jq .
echo ""

# Test 6: Test Open Event (should be ignored)
echo "6️⃣  Testing Brevo Webhook (POST - Open Event, should be ignored)..."
curl -s -X POST "$BASE_URL/webhook/brevo" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "opened",
    "email": "test@example.com",
    "campaign_id": 99999
  }' | jq .
echo ""

echo "✅ All tests completed!"
echo ""
echo "📝 Note: Some tests may fail if services are not configured."
echo "   Check .env file and ensure all API keys are set."
