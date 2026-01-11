#!/bin/bash

# ===========================================
# ENEOS Sales Automation - Railway Deploy Script
# ===========================================

set -e

echo "🚂 Deploying to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

# Link to project (first time only)
if [ ! -f ".railway" ]; then
    echo "🔗 Linking to Railway project..."
    echo "   Run: railway link"
    railway link
fi

# Deploy
echo "📦 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Go to Railway dashboard"
echo "   2. Set environment variables (API keys, secrets)"
echo "   3. Check deployment logs"
echo "   4. Test webhook endpoints"
echo ""
echo "🔗 Dashboard: https://railway.app/dashboard"
