#!/bin/bash

# ===========================================
# ENEOS Sales Automation - Environment Setup Script
# ===========================================

set -e

echo "🔧 Setting up environment..."

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Skipping..."
else
    # Copy template
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

echo ""
echo "📋 Please configure these environment variables in .env:"
echo ""
echo "=== Required ==="
echo "BREVO_WEBHOOK_SECRET     - Get from Brevo webhook settings"
echo "SUPABASE_URL             - From Supabase project settings"
echo "SUPABASE_SERVICE_ROLE_KEY - From Supabase API settings"
echo "GEMINI_API_KEY           - From Google AI Studio"
echo "LINE_CHANNEL_ACCESS_TOKEN - From LINE Developers Console"
echo "LINE_CHANNEL_SECRET      - From LINE Developers Console"
echo "LINE_GROUP_ID            - Get from webhook event logs"
echo ""
echo "=== Optional ==="
echo "NODE_ENV                 - development | production"
echo "PORT                     - Default: 3000"
echo "LOG_LEVEL               - error | warn | info | debug"
echo ""
echo "🔗 Resources:"
echo "   - Supabase: https://supabase.com/dashboard"
echo "   - Gemini API: https://aistudio.google.com/apikey"
echo "   - LINE Developers: https://developers.line.biz"
echo "   - Brevo: https://app.brevo.com"
