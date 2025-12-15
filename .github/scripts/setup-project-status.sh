#!/bin/bash
# Script to help set up project status options
# Note: This requires manual setup via GitHub UI or GraphQL API
# This script provides guidance and checks current status

set -e

PROJECT_OWNER="Stelth2000-Inc"
PROJECT_NUMBER=1

echo "🔍 Checking project status configuration..."
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "   Install it from: https://cli.github.com/"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is available and authenticated"
echo ""

# Get project details
echo "📋 Project Details:"
gh project view $PROJECT_NUMBER --owner $PROJECT_OWNER
echo ""

# List current fields
echo "📊 Current Project Fields:"
gh project field-list $PROJECT_NUMBER --owner $PROJECT_OWNER
echo ""

echo "📝 Recommended Status Options:"
echo "   1. Todo (or Backlog)"
echo "   2. In Progress"
echo "   3. In Review"
echo "   4. Done (or Completed)"
echo ""

echo "🔧 To configure status options:"
echo "   1. Visit: https://github.com/orgs/$PROJECT_OWNER/projects/$PROJECT_NUMBER"
echo "   2. Click on the 'Status' field header"
echo "   3. Click 'Edit' or 'Manage options'"
echo "   4. Add/edit status options as needed"
echo ""

echo "💡 The automated workflows will adapt to whatever status options you configure."
echo "   They use case-insensitive matching, so 'In Progress' and 'in progress' both work."
echo ""

echo "✅ Setup check complete!"
