#!/bin/bash

# ===========================================
# ENEOS Sales Automation - Render Deploy Script
# ===========================================

set -e

echo "🚀 Deploying to Render..."

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found!"
    exit 1
fi

echo "📋 Render deployment options:"
echo ""
echo "Option 1: Deploy via Git (Recommended)"
echo "   1. Push code to GitHub/GitLab"
echo "   2. Go to https://dashboard.render.com"
echo "   3. Click 'New' > 'Blueprint'"
echo "   4. Connect your repository"
echo "   5. Render will auto-deploy from render.yaml"
echo ""
echo "Option 2: Deploy via Render CLI"
echo "   1. Install: npm install -g render-cli"
echo "   2. Login: render login"
echo "   3. Deploy: render blueprint apply"
echo ""
echo "⚠️  Important: Set these secrets in Render dashboard:"
echo "   - BREVO_WEBHOOK_SECRET"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - GEMINI_API_KEY"
echo "   - LINE_CHANNEL_ACCESS_TOKEN"
echo "   - LINE_CHANNEL_SECRET"
echo "   - LINE_GROUP_ID"
echo ""
echo "🔗 Dashboard: https://dashboard.render.com"
