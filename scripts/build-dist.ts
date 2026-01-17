#!/usr/bin/env bun
/**
 * Build script to prepare distribution files for npm publishing.
 *
 * This script:
 * 1. Copies Claude Code files from claude-code/ to dist/claude-code/
 * 2. Copies OpenCode files from opencode/ to dist/opencode/
 *
 * Run: bun scripts/build-dist.ts
 */

import { copyFile, readdir, mkdir, rm } from "fs/promises";
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
