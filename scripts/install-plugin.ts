#!/usr/bin/env bun
/**
 * Interactive CLI to install questionably-ultrathink plugin to Claude Code and/or OpenCode.
 *
 * Usage:
 *   npx questionably-ultrathink           # Interactive mode
 *   questionably-ultrathink install       # Interactive mode
 *
 * Non-interactive flags (for CI/automation):
 *   --claude-code   Install only to Claude Code
 *   --opencode      Install only to OpenCode
 *   --both          Install to both platforms
 *   --auto, -y      Auto-detect and install without prompting
 *   --uninstall     Uninstall the plugin (removes files and config)
 *
 * This script copies plugin files to the appropriate config directories:
 *   Claude Code: ~/.claude/plugins/questionably-ultrathink/
 *   OpenCode: ~/.config/opencode/
 */

import { copyFile, readFile, writeFile, readdir, mkdir, stat, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as p from "@clack/prompts";
import {
  registerPlugin,
  unregisterPlugin,
  isPluginRegistered,
  getPluginId,
} from "./settings-manager.ts";

// ============================================================================
// Configuration
// ============================================================================

// Determine if we're running from installed package or development
const SCRIPT_DIR = import.meta.dir;
const ROOT_DIR = join(SCRIPT_DIR, "..");

// Plugin version (read from package.json)
async function getPluginVersion(): Promise<string> {
  try {
    const pkgPath = join(ROOT_DIR, "package.json");
    const content = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content);
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

// Check if dist/ exists (installed from npm) or use source files (development)
const DIST_DIR = join(ROOT_DIR, "dist");
const USE_DIST = existsSync(DIST_DIR);

// Source paths (development) - separate directories for each platform
const DEV_CLAUDE_CODE = join(ROOT_DIR, "claude-code");
const DEV_OPENCODE = join(ROOT_DIR, "opencode");

// Dist paths (installed)
const DIST_CLAUDE_CODE = join(DIST_DIR, "claude-code");
const DIST_OPENCODE = join(DIST_DIR, "opencode");

// Target paths
const CLAUDE_CODE_PLUGINS_DIR = join(
  homedir(),
  ".claude",
  "plugins",
  "questionably-ultrathink",
);
const OPENCODE_CONFIG_DIR = join(homedir(), ".config", "opencode");

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

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

// ============================================================================
// Platform Detection
// ============================================================================

type Platform = "claude-code" | "opencode";

interface DetectionResult {
  claudeCode: boolean;
  openCode: boolean;
}

async function detectPlatforms(): Promise<DetectionResult> {
  const claudeCodeExists = existsSync(join(homedir(), ".claude"));
  const openCodeExists = existsSync(join(homedir(), ".config", "opencode"));

  return {
    claudeCode: claudeCodeExists,
    openCode: openCodeExists,
  };
}

function getDetectedList(detected: DetectionResult): Platform[] {
  const platforms: Platform[] = [];
  if (detected.claudeCode) platforms.push("claude-code");
  if (detected.openCode) platforms.push("opencode");
  return platforms;
}

// ============================================================================
// Installation Functions
// ============================================================================

async function installClaudeCode(): Promise<boolean> {
  const sourceDir = USE_DIST ? DIST_CLAUDE_CODE : DEV_CLAUDE_CODE;

  if (!existsSync(sourceDir)) {
    return false;
  }

  try {
    // Clean existing installation for a fresh update
    if (existsSync(CLAUDE_CODE_PLUGINS_DIR)) {
      await rm(CLAUDE_CODE_PLUGINS_DIR, { recursive: true });
    }
    await mkdir(CLAUDE_CODE_PLUGINS_DIR, { recursive: true });

    // Copy agents
    const agentsDir = join(sourceDir, "agents");
    if (existsSync(agentsDir)) {
      await copyDir(agentsDir, join(CLAUDE_CODE_PLUGINS_DIR, "agents"));
    }

    // Copy commands
    const commandsDir = join(sourceDir, "commands");
    if (existsSync(commandsDir)) {
      await copyDir(commandsDir, join(CLAUDE_CODE_PLUGINS_DIR, "commands"));
    }

    // Copy skills
    const skillsDir = join(sourceDir, "skills");
    if (existsSync(skillsDir)) {
      await copyDir(skillsDir, join(CLAUDE_CODE_PLUGINS_DIR, "skills"));
    }

    // Copy plugin metadata
    const pluginDir = join(sourceDir, ".claude-plugin");
    if (existsSync(pluginDir)) {
      await copyDir(pluginDir, join(CLAUDE_CODE_PLUGINS_DIR, ".claude-plugin"));
    }

    // Create marketplace.json for Claude Code to recognize this as a valid marketplace
    const version = await getPluginVersion();
    const marketplaceJson = {
      name: "questionably-ultrathink",
      owner: { name: "snowmead" },
      metadata: {
        description: "UltraThink reasoning framework plugin",
        version: version,
      },
      plugins: [
        {
          name: "questionably-ultrathink",
          description:
            "Advanced reasoning plugin integrating Chain of Verification (CoVe) and Atom of Thoughts (AoT) frameworks",
          source: ".",
        },
      ],
    };
    await writeFile(
      join(CLAUDE_CODE_PLUGINS_DIR, ".claude-plugin", "marketplace.json"),
      JSON.stringify(marketplaceJson, null, 2) + "\n",
      "utf-8",
    );

    // Register with Claude Code's config files
    await registerPlugin({
      pluginPath: CLAUDE_CODE_PLUGINS_DIR,
      version: version,
    });

    return true;
  } catch {
    return false;
  }
}

async function uninstallClaudeCode(): Promise<boolean> {
  try {
    // Remove plugin files
    if (existsSync(CLAUDE_CODE_PLUGINS_DIR)) {
      await rm(CLAUDE_CODE_PLUGINS_DIR, { recursive: true });
    }

    // Unregister from Claude Code's config files
    await unregisterPlugin();

    return true;
  } catch {
    return false;
  }
}

async function uninstallOpenCode(): Promise<boolean> {
  try {
    const agentDir = join(OPENCODE_CONFIG_DIR, "agent");
    const commandDir = join(OPENCODE_CONFIG_DIR, "command");

    // Remove agent files
    const agentFiles = [
      "questionably-ultrathink.md",
      "aot-graph-generator.md",
      "aot-graph-maintainer.md",
      "cov-atomic-solver.md",
    ];
    for (const file of agentFiles) {
      const filePath = join(agentDir, file);
      if (existsSync(filePath)) {
        await rm(filePath);
      }
    }

    // Remove command files
    const commandFiles = [
      "questionably-ultrathink.md",
      "decompose.md",
      "verify.md",
    ];
    for (const file of commandFiles) {
      const filePath = join(commandDir, file);
      if (existsSync(filePath)) {
        await rm(filePath);
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function installOpenCode(): Promise<boolean> {
  const sourceDir = USE_DIST ? DIST_OPENCODE : DEV_OPENCODE;

  if (!existsSync(sourceDir)) {
    return false;
  }

  try {
    await mkdir(OPENCODE_CONFIG_DIR, { recursive: true });

    // Copy agent files (delete existing first for clean update)
    const agentDir = join(sourceDir, "agent");
    if (existsSync(agentDir)) {
      const destAgentDir = join(OPENCODE_CONFIG_DIR, "agent");
      await mkdir(destAgentDir, { recursive: true });

      const files = await readdir(agentDir);
      for (const file of files) {
        if (file.endsWith(".md")) {
          const destPath = join(destAgentDir, file);
          // Remove existing file first for clean update
          if (existsSync(destPath)) {
            await rm(destPath);
          }
          await copyFile(join(agentDir, file), destPath);
        }
      }
    }

    // Copy command files (delete existing first for clean update)
    const commandDir = join(sourceDir, "command");
    if (existsSync(commandDir)) {
      const destCommandDir = join(OPENCODE_CONFIG_DIR, "command");
      await mkdir(destCommandDir, { recursive: true });

      const files = await readdir(commandDir);
      for (const file of files) {
        if (file.endsWith(".md")) {
          const destPath = join(destCommandDir, file);
          // Remove existing file first for clean update
          if (existsSync(destPath)) {
            await rm(destPath);
          }
          await copyFile(join(commandDir, file), destPath);
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// CLI Modes
// ============================================================================

async function runInteractive(): Promise<void> {
  p.intro("UltraThink Plugin Installer");

  // Detect platforms
  const detectSpinner = p.spinner();
  detectSpinner.start("Detecting installed agents...");

  const detected = await detectPlatforms();
  const detectedList = getDetectedList(detected);

  if (detectedList.length > 0) {
    const foundStr = detectedList
      .map((p) => (p === "claude-code" ? "Claude Code" : "OpenCode"))
      .join(", ");
    detectSpinner.stop(`Found: ${foundStr}`);
  } else {
    detectSpinner.stop("No existing installations detected");
  }

  // Show multiselect with detected platforms pre-selected
  const platforms = await p.multiselect({
    message: "Select platforms to install to:",
    options: [
      {
        value: "claude-code" as Platform,
        label: "Claude Code",
        hint: "~/.claude/plugins/",
      },
      {
        value: "opencode" as Platform,
        label: "OpenCode",
        hint: "~/.config/opencode/",
      },
    ],
    initialValues:
      detectedList.length > 0 ? detectedList : ["claude-code", "opencode"],
    required: true,
  });

  // Handle cancellation
  if (p.isCancel(platforms)) {
    p.cancel("Installation cancelled.");
    process.exit(0);
  }

  await performInstallation(platforms as Platform[]);
}

async function runNonInteractive(
  installClaudeCodeFlag: boolean,
  installOpenCodeFlag: boolean,
): Promise<void> {
  console.log("UltraThink Plugin Installer");
  console.log("===========================");
  console.log(
    `Source: ${USE_DIST ? "dist/ (installed)" : "local (development)"}`,
  );

  const platforms: Platform[] = [];
  if (installClaudeCodeFlag) platforms.push("claude-code");
  if (installOpenCodeFlag) platforms.push("opencode");

  if (platforms.length === 0) {
    console.log(
      "\nNo platforms specified. Use --claude-code, --opencode, or --both.",
    );
    process.exit(1);
  }

  console.log("\nInstalling to:", platforms.join(", "));

  let success = true;

  if (platforms.includes("claude-code")) {
    console.log("\n📦 Installing to Claude Code...");
    const result = await installClaudeCode();
    if (result) {
      console.log(`  ✅ Installed to: ${CLAUDE_CODE_PLUGINS_DIR}`);
    } else {
      console.log("  ❌ Failed to install");
      success = false;
    }
  }

  if (platforms.includes("opencode")) {
    console.log("\n📦 Installing to OpenCode...");
    const result = await installOpenCode();
    if (result) {
      console.log(`  ✅ Installed to: ${OPENCODE_CONFIG_DIR}`);
    } else {
      console.log("  ❌ Failed to install");
      success = false;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(40));
  if (success) {
    console.log("✅ Installation complete!");
    printUsageInstructions(platforms);
  } else {
    console.log("⚠️ Installation completed with some issues.");
    process.exit(1);
  }
}

async function performInstallation(platforms: Platform[]): Promise<void> {
  const installSpinner = p.spinner();
  installSpinner.start("Installing...");

  const results: string[] = [];

  // Install to Claude Code
  if (platforms.includes("claude-code")) {
    const success = await installClaudeCode();
    if (success) {
      results.push("✓ Installed to Claude Code");
    } else {
      results.push("✗ Failed to install to Claude Code");
    }
  }

  // Install to OpenCode
  if (platforms.includes("opencode")) {
    const success = await installOpenCode();
    if (success) {
      results.push("✓ Installed to OpenCode");
    } else {
      results.push("✗ Failed to install to OpenCode");
    }
  }

  installSpinner.stop("Installation complete!");

  // Show results
  p.note(results.join("\n"), "Results");

  // Show usage instructions
  const usageLines: string[] = [];
  if (platforms.includes("claude-code")) {
    usageLines.push('Claude Code: /questionably-ultrathink "your question"');
  }
  if (platforms.includes("opencode")) {
    usageLines.push('OpenCode: @questionably-ultrathink "your question"');
  }

  p.note(usageLines.join("\n"), "Usage");

  p.outro("Done!");
}

function printUsageInstructions(platforms: Platform[]): void {
  console.log("\nUsage:");
  if (platforms.includes("claude-code")) {
    console.log('  Claude Code: /questionably-ultrathink "your question"');
  }
  if (platforms.includes("opencode")) {
    console.log('  OpenCode: @questionably-ultrathink "your question"');
  }
}

function printHelp(): void {
  console.log(`
questionably-ultrathink - Install plugin to Claude Code and/or OpenCode

Usage:
  npx questionably-ultrathink           # Interactive mode
  questionably-ultrathink install       # Interactive mode

Options:
  --claude-code   Install only to Claude Code (non-interactive)
  --opencode      Install only to OpenCode (non-interactive)
  --both          Install to both platforms (non-interactive)
  --auto, -y      Auto-detect and install without prompting
  --uninstall     Uninstall the plugin from all platforms

Examples:
  npx questionably-ultrathink           # Interactive platform selection
  npx questionably-ultrathink -y        # Auto-detect and install
  npx questionably-ultrathink --both    # Install to both platforms
  npx questionably-ultrathink --uninstall --both  # Uninstall from both
`);
}

// ============================================================================
// Main
// ============================================================================

async function runUninstall(
  uninstallClaudeCodeFlag: boolean,
  uninstallOpenCodeFlag: boolean,
): Promise<void> {
  console.log("UltraThink Plugin Uninstaller");
  console.log("=============================\n");

  let success = true;

  if (uninstallClaudeCodeFlag) {
    console.log("Uninstalling from Claude Code...");
    const result = await uninstallClaudeCode();
    if (result) {
      console.log(`  Removed from: ${CLAUDE_CODE_PLUGINS_DIR}`);
      console.log(`  Unregistered plugin: ${getPluginId()}`);
    } else {
      console.log("  Failed to uninstall (may not have been installed)");
      success = false;
    }
  }

  if (uninstallOpenCodeFlag) {
    console.log("\nUninstalling from OpenCode...");
    const result = await uninstallOpenCode();
    if (result) {
      console.log(`  Removed from: ${OPENCODE_CONFIG_DIR}`);
    } else {
      console.log("  Failed to uninstall (may not have been installed)");
      success = false;
    }
  }

  console.log("\n" + "=".repeat(40));
  if (success) {
    console.log("Uninstallation complete!");
  } else {
    console.log("Uninstallation completed with some issues.");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Filter out "install" if it's the first argument (from `bun run install`)
  const filteredArgs = args.filter((arg) => arg !== "install");

  // Check for help
  if (filteredArgs.includes("--help") || filteredArgs.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  // Determine mode based on flags
  const hasClaudeCodeFlag = filteredArgs.includes("--claude-code");
  const hasOpenCodeFlag = filteredArgs.includes("--opencode");
  const hasBothFlag = filteredArgs.includes("--both");
  const hasAutoFlag =
    filteredArgs.includes("--auto") || filteredArgs.includes("-y");
  const hasUninstallFlag = filteredArgs.includes("--uninstall");

  // Handle uninstall
  if (hasUninstallFlag) {
    const uninstallClaudeCode = hasClaudeCodeFlag || hasBothFlag || (!hasClaudeCodeFlag && !hasOpenCodeFlag);
    const uninstallOpenCode = hasOpenCodeFlag || hasBothFlag || (!hasClaudeCodeFlag && !hasOpenCodeFlag);
    await runUninstall(uninstallClaudeCode, uninstallOpenCode);
    return;
  }

  // Non-interactive modes
  if (hasClaudeCodeFlag || hasOpenCodeFlag || hasBothFlag) {
    await runNonInteractive(
      hasClaudeCodeFlag || hasBothFlag,
      hasOpenCodeFlag || hasBothFlag,
    );
    return;
  }

  if (hasAutoFlag) {
    // Auto-detect and install
    const detected = await detectPlatforms();
    const platforms: Platform[] = [];

    if (detected.claudeCode) platforms.push("claude-code");
    if (detected.openCode) platforms.push("opencode");

    // If nothing detected, install to both
    if (platforms.length === 0) {
      platforms.push("claude-code", "opencode");
    }

    await runNonInteractive(
      platforms.includes("claude-code"),
      platforms.includes("opencode"),
    );
    return;
  }

  // Interactive mode (default)
  await runInteractive();
}

// Run if called directly (not imported)
if (import.meta.main) {
  main();
}
