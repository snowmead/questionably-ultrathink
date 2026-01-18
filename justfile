# Default recipe
default:
    @just --list

# Build dist/ for npm publishing
build:
    bun run build

# Bump version and publish to npm
# Usage: just publish 1.0.5
publish version:
    #!/usr/bin/env bash
    set -euo pipefail

    echo "Bumping version to {{version}}..."
    # Update package.json version
    bun -e "
      const pkg = await Bun.file('package.json').json();
      pkg.version = '{{version}}';
      await Bun.write('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "

    echo "Building dist/..."
    bun run build

    echo "Committing and tagging..."
    git add -A
    git commit -m "Bump version to {{version}}"
    git tag "v{{version}}"

    echo "Pushing to remote..."
    git push && git push --tags

    echo "Publishing to npm..."
    npm publish

    echo "Done! Published v{{version}}"

# Publish without git operations (for testing)
publish-only:
    npm publish

# Dry run publish (shows what would be published)
publish-dry:
    npm publish --dry-run

# Login to npm
npm-login:
    npm login

# Check current npm user
npm-whoami:
    npm whoami
