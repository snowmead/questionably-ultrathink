#!/bin/bash
# Validate Claude Code plugin structure
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() { echo -e "${RED}ERROR: $1${NC}" >&2; }
warn() { echo -e "${YELLOW}WARNING: $1${NC}" >&2; }
success() { echo -e "${GREEN}$1${NC}"; }

# Change to plugin root directory
cd "$(dirname "$0")/.."

validate_plugin_json() {
    echo "Validating plugin.json..."

    if [[ ! -f ".claude-plugin/plugin.json" ]]; then
        error "Missing .claude-plugin/plugin.json"
        exit 1
    fi

    # Check JSON syntax
    if ! python3 -c "import json; json.load(open('.claude-plugin/plugin.json'))" 2>/dev/null; then
        error "Invalid JSON syntax in plugin.json"
        exit 1
    fi

    # Validate required fields
    local required_fields=("name" "version" "description")
    for field in "${required_fields[@]}"; do
        if ! python3 -c "import json; d=json.load(open('.claude-plugin/plugin.json')); assert '$field' in d and d['$field']" 2>/dev/null; then
            error "Missing or empty required field '$field' in plugin.json"
            exit 1
        fi
    done

    # Validate semver version format
    local version
    version=$(python3 -c "import json; print(json.load(open('.claude-plugin/plugin.json'))['version'])")
    if ! [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        error "Invalid version format '$version'. Use semantic versioning (x.y.z)"
        exit 1
    fi

    # Validate plugin name format (kebab-case)
    local name
    name=$(python3 -c "import json; print(json.load(open('.claude-plugin/plugin.json'))['name'])")
    if ! [[ $name =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]] && ! [[ $name =~ ^[a-z0-9]$ ]]; then
        warn "Plugin name '$name' should be kebab-case (lowercase letters, numbers, hyphens)"
    fi

    success "  plugin.json is valid"
}

validate_marketplace_json() {
    echo "Validating marketplace.json..."

    if [[ ! -f ".claude-plugin/marketplace.json" ]]; then
        warn "Missing .claude-plugin/marketplace.json (optional for private plugins)"
        return 0
    fi

    # Check JSON syntax
    if ! python3 -c "import json; json.load(open('.claude-plugin/marketplace.json'))" 2>/dev/null; then
        error "Invalid JSON syntax in marketplace.json"
        exit 1
    fi

    # Validate required fields
    local required_fields=("name" "owner" "plugins")
    for field in "${required_fields[@]}"; do
        if ! python3 -c "import json; d=json.load(open('.claude-plugin/marketplace.json')); assert '$field' in d" 2>/dev/null; then
            error "Missing required field '$field' in marketplace.json"
            exit 1
        fi
    done

    # Validate owner has name
    if ! python3 -c "import json; d=json.load(open('.claude-plugin/marketplace.json')); assert 'name' in d['owner']" 2>/dev/null; then
        error "Missing 'name' in marketplace.json owner field"
        exit 1
    fi

    # Validate plugins array has entries with name and source
    if ! python3 -c "
import json
d = json.load(open('.claude-plugin/marketplace.json'))
plugins = d.get('plugins', [])
assert len(plugins) > 0, 'plugins array is empty'
for p in plugins:
    assert 'name' in p and p['name'], 'plugin missing name'
    assert 'source' in p and p['source'], 'plugin missing source'
" 2>/dev/null; then
        error "Each plugin in marketplace.json must have 'name' and 'source'"
        exit 1
    fi

    success "  marketplace.json is valid"
}

validate_directory_structure() {
    echo "Validating directory structure..."

    local has_content=false

    # Check for required content directories
    for dir in "commands" "skills" "agents"; do
        if [[ -d "$dir" ]]; then
            local md_count
            md_count=$(find "$dir" -maxdepth 1 -name "*.md" | wc -l)
            if [[ $md_count -gt 0 ]]; then
                has_content=true
                echo "  Found $md_count .md file(s) in $dir/"
            fi
        fi
    done

    if [[ "$has_content" == "false" ]]; then
        error "Plugin must have at least one of: commands/, skills/, or agents/ with .md files"
        exit 1
    fi

    success "  Directory structure is valid"
}

validate_yaml_json_syntax() {
    echo "Validating YAML/JSON file syntax..."

    local errors=0

    # Validate all YAML files
    while IFS= read -r -d '' file; do
        if ! python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
            error "Invalid YAML syntax in '$file'"
            errors=$((errors + 1))
        fi
    done < <(find . -type f \( -name "*.yml" -o -name "*.yaml" \) -not -path "./.git/*" -print0)

    # Validate all JSON files
    while IFS= read -r -d '' file; do
        if ! python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
            error "Invalid JSON syntax in '$file'"
            errors=$((errors + 1))
        fi
    done < <(find . -type f -name "*.json" -not -path "./.git/*" -not -path "./node_modules/*" -print0)

    if [[ $errors -gt 0 ]]; then
        exit 1
    fi

    success "  All YAML/JSON files have valid syntax"
}

main() {
    echo ""
    echo "Validating Claude Code plugin structure..."
    echo ""

    validate_plugin_json
    validate_marketplace_json
    validate_directory_structure
    validate_yaml_json_syntax

    # Note: Secret detection handled by prek's detect-private-key hook

    echo ""
    success "Plugin validation passed!"
    echo ""
}

main "$@"
