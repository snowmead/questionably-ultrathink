#!/usr/bin/env bun
/**
 * Build script to prepare distribution files for npm publishing.
 *
 * This script:
 * 1. Copies Claude Code files from claude-code/ to dist/claude-code/
 * 2. Copies OpenCode files from opencode/ to dist/opencode/
 * 3. Syncs version from package.json to all plugin.json files
 *
 * Run: bun scripts/build-dist.ts
 */

import { copyFile, readFile, writeFile, readdir, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// ============================================================================
// Configuration
// ============================================================================

const ROOT_DIR = process.cwd();
const DIST_DIR = join(ROOT_DIR, "dist");
const DIST_CLAUDE_CODE = join(DIST_DIR, "claude-code");
const DIST_OPENCODE = join(DIST_DIR, "opencode");

// Source directories (separate sources for each platform)
const CLAUDE_CODE_DIR = join(ROOT_DIR, "claude-code");
const OPENCODE_DIR = join(ROOT_DIR, "opencode");

// ============================================================================
// Utilities
// ============================================================================

async function copyDir(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function getPackageVersion(): Promise<string> {
  const pkgPath = join(ROOT_DIR, "package.json");
  const content = await readFile(pkgPath, "utf-8");
  const pkg = JSON.parse(content);
  return pkg.version || "1.0.0";
}

async function updatePluginJsonVersion(
  filePath: string,
  version: string,
): Promise<void> {
  if (!existsSync(filePath)) {
    return;
  }

  const content = await readFile(filePath, "utf-8");
  const json = JSON.parse(content);
  json.version = version;
  await writeFile(filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
}

async function updateMarketplaceJsonVersion(
  filePath: string,
  version: string,
): Promise<void> {
  if (!existsSync(filePath)) {
    return;
  }

  const content = await readFile(filePath, "utf-8");
  const json = JSON.parse(content);
  if (json.metadata) {
    json.metadata.version = version;
  }
  await writeFile(filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
}

// ============================================================================
// Build Functions
// ============================================================================

async function cleanDist(): Promise<void> {
  console.log("Cleaning dist/...");
  if (existsSync(DIST_DIR)) {
    await rm(DIST_DIR, { recursive: true });
  }
  await mkdir(DIST_DIR, { recursive: true });
  console.log("  ✓ Done");
}

async function buildClaudeCode(): Promise<void> {
  console.log("\nBuilding Claude Code distribution...");

  if (!existsSync(CLAUDE_CODE_DIR)) {
    console.log("  ⚠ claude-code/ not found.");
    return;
  }

  await copyDir(CLAUDE_CODE_DIR, DIST_CLAUDE_CODE);
  console.log("  ✓ Copied claude-code/ → dist/claude-code/");
}

async function buildOpenCode(): Promise<void> {
  console.log("\nBuilding OpenCode distribution...");

  if (!existsSync(OPENCODE_DIR)) {
    console.log("  ⚠ opencode/ not found.");
    return;
  }

  await copyDir(OPENCODE_DIR, DIST_OPENCODE);
  console.log("  ✓ Copied opencode/ → dist/opencode/");
}

async function syncVersions(): Promise<void> {
  console.log("\nSyncing versions from package.json...");

  const version = await getPackageVersion();
  console.log(`  Version: ${version}`);

  // Update dist/claude-code/.claude-plugin/plugin.json
  const distPluginJson = join(DIST_CLAUDE_CODE, ".claude-plugin", "plugin.json");
  if (existsSync(distPluginJson)) {
    await updatePluginJsonVersion(distPluginJson, version);
    console.log("  ✓ Updated dist/claude-code/.claude-plugin/plugin.json");
  }

  // Also update source files to keep them in sync
  const sourcePluginJson = join(CLAUDE_CODE_DIR, ".claude-plugin", "plugin.json");
  if (existsSync(sourcePluginJson)) {
    await updatePluginJsonVersion(sourcePluginJson, version);
    console.log("  ✓ Updated claude-code/.claude-plugin/plugin.json");
  }

  const rootPluginJson = join(ROOT_DIR, ".claude-plugin", "plugin.json");
  if (existsSync(rootPluginJson)) {
    await updatePluginJsonVersion(rootPluginJson, version);
    console.log("  ✓ Updated .claude-plugin/plugin.json");
  }

  const marketplaceJson = join(ROOT_DIR, ".claude-plugin", "marketplace.json");
  if (existsSync(marketplaceJson)) {
    await updateMarketplaceJsonVersion(marketplaceJson, version);
    console.log("  ✓ Updated .claude-plugin/marketplace.json");
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("Build Script - Distribution Preparation");
  console.log("========================================\n");

  try {
    await cleanDist();
    await buildClaudeCode();
    await buildOpenCode();
    await syncVersions();

    console.log("\n✅ Build complete!");
    console.log("\nDistribution structure:");
    console.log("  dist/");
    console.log("    claude-code/");
    console.log("      agents/");
    console.log("      commands/");
    console.log("      skills/");
    console.log("      .claude-plugin/");
    console.log("    opencode/");
    console.log("      agent/");
    console.log("      command/");
  } catch (error) {
    console.error("\n❌ Build failed:", error);
    process.exit(1);
  }
}

main();
