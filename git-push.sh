#!/bin/bash
# Git commit and push script for ALBA Finance v3

# Commit message argument
MESSAGE="${1:-Update: commit changes}"

echo "🚀 Git Commit & Push Script"
echo "=========================="

# Add all changes
echo "📁 Adding all changes..."
git add .

# Check if there's anything to commit
if git diff-index --quiet HEAD --; then
    echo "✅ No changes to commit"
    exit 0
fi

# Commit
echo "💾 Committing..."
git commit -m "$MESSAGE"

if [ $? -eq 0 ]; then
    echo "✅ Commit successful"
else
    echo "⚠️ No new commits (nothing changed)"
fi

# Push
echo "📤 Pushing to origin main..."
git push -u origin main

echo "✅ Done!"