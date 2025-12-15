#!/bin/bash
# Script to update labels for both repositories to match development workflow

set -e

# Color codes for labels
COLOR_BUG="#d73a4a"
COLOR_FEATURE="#1d76db"
COLOR_ENHANCEMENT="#a2eeef"
COLOR_DOCUMENTATION="#0075ca"
COLOR_SECURITY="#b60205"
COLOR_QUESTION="#d876e3"
COLOR_PRIORITY_HIGH="#ff0000"
COLOR_PRIORITY_MEDIUM="#ffa500"
COLOR_PRIORITY_LOW="#ffff00"
COLOR_WORKFLOW="#0e8a16"
COLOR_BLOCKED="#b60205"
COLOR_CI="#5319e7"
COLOR_DEPLOYMENT="#0e8a16"
COLOR_DEPENDENCIES="#0366d6"
COLOR_TECH="#168700"
COLOR_HELP="#008672"
COLOR_GOOD_FIRST="#7057ff"
COLOR_META="#cfd3d7"

# Function to create or update a label
create_or_update_label() {
    local repo=$1
    local name=$2
    local description=$3
    local color=$4
    
    echo "Updating label '$name' in $repo..."
    
    # Check if label exists
    if gh label list --repo "$repo" | grep -q "^$name"; then
        # Update existing label
        gh label edit "$name" --repo "$repo" --description "$description" --color "$color" 2>/dev/null || \
        gh label create "$name" --repo "$repo" --description "$description" --color "$color" --force
    else
        # Create new label
        gh label create "$name" --repo "$repo" --description "$description" --color "$color"
    fi
}

# Function to update labels for a repository
update_repo_labels() {
    local repo=$1
    local tech_label=$2
    local tech_color=$3
    
    echo ""
    echo "========================================="
    echo "Updating labels for: $repo"
    echo "========================================="
    
    # Type Labels
    create_or_update_label "$repo" "bug" "Something isn't working properly" "$COLOR_BUG"
    create_or_update_label "$repo" "feature" "A new feature request" "$COLOR_FEATURE"
    create_or_update_label "$repo" "enhancement" "Improvement to an existing feature" "$COLOR_ENHANCEMENT"
    create_or_update_label "$repo" "documentation" "Changes to documentation" "$COLOR_DOCUMENTATION"
    create_or_update_label "$repo" "security" "Security-related issue" "$COLOR_SECURITY"
    create_or_update_label "$repo" "question" "Further information is requested" "$COLOR_QUESTION"
    
    # Priority Labels
    create_or_update_label "$repo" "priority: high" "Needs immediate attention" "$COLOR_PRIORITY_HIGH"
    create_or_update_label "$repo" "priority: medium" "Needs to be worked on soon" "$COLOR_PRIORITY_MEDIUM"
    create_or_update_label "$repo" "priority: low" "Can be worked on later" "$COLOR_PRIORITY_LOW"
    
    # Workflow Labels
    create_or_update_label "$repo" "ready for review" "Ready for code review" "$COLOR_WORKFLOW"
    create_or_update_label "$repo" "blocked" "Blocked by another issue or dependency" "$COLOR_BLOCKED"
    create_or_update_label "$repo" "in progress" "Currently being worked on" "$COLOR_WORKFLOW"
    
    # CI/CD Labels
    create_or_update_label "$repo" "ci" "Continuous Integration and testing" "$COLOR_CI"
    create_or_update_label "$repo" "deployment" "Deployment and infrastructure setup" "$COLOR_DEPLOYMENT"
    create_or_update_label "$repo" "dependencies" "Dependency updates" "$COLOR_DEPENDENCIES"
    
    # Technology Labels
    create_or_update_label "$repo" "$tech_label" "Pull requests that update $tech_label code" "$tech_color"
    
    # Community Labels
    create_or_update_label "$repo" "help wanted" "Extra attention is needed" "$COLOR_HELP"
    create_or_update_label "$repo" "good first issue" "Good for newcomers" "$COLOR_GOOD_FIRST"
    
    # Meta Labels
    create_or_update_label "$repo" "wontfix" "This will not be worked on" "#ffffff"
    create_or_update_label "$repo" "duplicate" "This issue or pull request already exists" "$COLOR_META"
    create_or_update_label "$repo" "invalid" "This doesn't seem right" "#e4e669"
    
    echo ""
    echo "✅ Labels updated for $repo"
}

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    exit 1
fi

# Update labels for both repositories
update_repo_labels "Stelth2000-Inc/NightScoutMongoBackup" "python" "$COLOR_TECH"
update_repo_labels "Stelth2000-Inc/NightScoutMongoBackupSite" "typescript" "$COLOR_TECH"

echo ""
echo "========================================="
echo "✅ All labels updated successfully!"
echo "========================================="
