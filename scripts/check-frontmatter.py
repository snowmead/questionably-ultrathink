#!/usr/bin/env python3
"""Validate YAML frontmatter in Claude Code plugin markdown files."""

import re
import sys
from pathlib import Path
from typing import Any

import yaml


def extract_frontmatter(content: str) -> dict[str, Any]:
    """Extract YAML frontmatter from markdown content."""
    pattern = r"^---\s*\n(.*?)\n---\s*\n"
    match = re.match(pattern, content, re.DOTALL)

    if not match:
        return {}

    try:
        return yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML in frontmatter: {e}") from e


def validate_skill_frontmatter(frontmatter: dict[str, Any], file_path: Path) -> list[str]:
    """Validate skill file frontmatter."""
    errors = []

    required_fields = {"name", "description"}
    for field in required_fields:
        if field not in frontmatter:
            errors.append(f"Missing required field '{field}'")
        elif not isinstance(frontmatter[field], str) or not frontmatter[field].strip():
            errors.append(f"Field '{field}' must be a non-empty string")

    return errors


def validate_command_frontmatter(
    frontmatter: dict[str, Any], file_path: Path
) -> list[str]:
    """Validate command file frontmatter."""
    errors = []

    if "description" not in frontmatter:
        errors.append("Missing required field 'description'")
    elif (
        not isinstance(frontmatter["description"], str)
        or not frontmatter["description"].strip()
    ):
        errors.append("Field 'description' must be a non-empty string")

    # Validate allowed-tools if present
    if "allowed-tools" in frontmatter:
        tools = frontmatter["allowed-tools"]
        if not isinstance(tools, list):
            errors.append("Field 'allowed-tools' must be a list")
        elif not all(isinstance(tool, str) for tool in tools):
            errors.append("All items in 'allowed-tools' must be strings")

    return errors


def validate_agent_frontmatter(
    frontmatter: dict[str, Any], file_path: Path
) -> list[str]:
    """Validate agent file frontmatter."""
    errors = []

    # Agents should have name and description
    if "name" not in frontmatter:
        errors.append("Missing required field 'name'")
    elif (
        not isinstance(frontmatter["name"], str) or not frontmatter["name"].strip()
    ):
        errors.append("Field 'name' must be a non-empty string")

    if "description" not in frontmatter:
        errors.append("Missing required field 'description'")
    elif (
        not isinstance(frontmatter["description"], str)
        or not frontmatter["description"].strip()
    ):
        errors.append("Field 'description' must be a non-empty string")

    return errors


def get_file_type(file_path: Path) -> str | None:
    """Determine the type of file based on its directory."""
    parts = file_path.parts
    for i, part in enumerate(parts):
        if part == "skills":
            return "skill"
        elif part == "commands":
            return "command"
        elif part == "agents":
            return "agent"
    return None


def main() -> int:
    """Main validation function."""
    exit_code = 0

    if len(sys.argv) < 2:
        print("Usage: check-frontmatter.py <file1.md> [file2.md ...]")
        return 1

    for arg in sys.argv[1:]:
        file_path = Path(arg)

        if not file_path.exists():
            print(f"Warning: {file_path}: File not found, skipping")
            continue

        if not file_path.suffix == ".md":
            continue

        file_type = get_file_type(file_path)
        if file_type is None:
            # Not in a known directory, skip
            continue

        try:
            content = file_path.read_text(encoding="utf-8")
            frontmatter = extract_frontmatter(content)

            if not frontmatter:
                print(f"ERROR: {file_path}: No frontmatter found")
                exit_code = 1
                continue

            # Validate based on file type
            if file_type == "skill":
                errors = validate_skill_frontmatter(frontmatter, file_path)
            elif file_type == "command":
                errors = validate_command_frontmatter(frontmatter, file_path)
            elif file_type == "agent":
                errors = validate_agent_frontmatter(frontmatter, file_path)
            else:
                continue

            if errors:
                print(f"ERROR: {file_path}:")
                for error in errors:
                    print(f"  - {error}")
                exit_code = 1
            else:
                print(f"OK: {file_path}: Frontmatter valid")

        except ValueError as e:
            print(f"ERROR: {file_path}: {e}")
            exit_code = 1
        except Exception as e:
            print(f"ERROR: {file_path}: Error processing file - {e}")
            exit_code = 1

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
