#!/usr/bin/env bash
# ============================================
# 🐍 Python Dependency Updater for FastAPI Projects
# ============================================

set -e  # stop on first error

# Optional: activate your virtual environment if needed
# source venv/bin/activate

echo "🔍 Checking for outdated packages..."
pip list --outdated

# Create a timestamp for backup
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Backup old requirements.txt if it exists
if [ -f requirements.txt ]; then
    echo "📦 Backing up existing requirements.txt -> requirements_backup_$TIMESTAMP.txt"
    cp requirements.txt requirements_backup_$TIMESTAMP.txt
fi

# Ensure pip-review is installed
if ! command -v pip-review &> /dev/null; then
    echo "⚙️ Installing pip-review..."
    pip install pip-review
fi

# Update all packages
echo "🚀 Updating all outdated packages..."
pip-review --auto

# Re-freeze dependencies
echo "🧊 Writing updated dependencies to requirements.txt"
pip freeze > requirements.txt

echo "✅ All packages updated successfully!"
echo "📄 New requirements.txt generated."