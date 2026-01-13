#!/bin/bash
# Development environment setup
# Run this once after cloning: ./setup.sh

set -e

echo "Setting up development environment..."

# Install lefthook if missing
if ! command -v lefthook &> /dev/null; then
    echo "Installing lefthook..."
    if command -v brew &> /dev/null; then
        brew install lefthook
    elif command -v cargo &> /dev/null; then
        cargo install lefthook
    else
        echo "Error: Need brew or cargo to install lefthook"
        echo "Install manually: https://github.com/evilmartians/lefthook"
        exit 1
    fi
fi

# Install comrak if missing
if ! command -v comrak &> /dev/null; then
    echo "Installing comrak..."
    if command -v cargo &> /dev/null; then
        cargo install comrak
    elif command -v brew &> /dev/null; then
        brew install comrak
    else
        echo "Error: Need cargo or brew to install comrak"
        exit 1
    fi
fi

# Set up git hooks
echo "Setting up git hooks..."
lefthook install

echo "Done! Git hooks are now active."
