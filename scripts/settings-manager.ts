/**
 * Settings Manager for Claude Code configuration files.
 *
 * Handles reading/writing:
 * - ~/.claude/settings.json - enabled plugins
 * - ~/.claude/plugins/known_marketplaces.json - marketplace registry
 * - ~/.claude/plugins/installed_plugins.json - installed plugins
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ============================================================================
// Types
// ============================================================================

export interface MarketplaceSource {
  source: "directory" | "github";
  path?: string;
  owner?: string;
  repo?: string;
  branch?: string;
}

export interface MarketplaceEntry {
  source: MarketplaceSource;
  installLocation: string;
  lastUpdated: string;
}

export interface KnownMarketplaces {
  [marketplaceId: string]: MarketplaceEntry;
}

export interface InstalledPluginEntry {
  scope: "user" | "project";
  installPath: string;
  version: string;
  installedAt: string;
}

export interface InstalledPluginsFile {
  version?: number;
  plugins: {
    [pluginId: string]: InstalledPluginEntry[];
  };
}

export interface ClaudeSettings {
  enabledPlugins?: {
    [pluginId: string]: boolean;
  };
  [key: string]: unknown;
}

// ============================================================================
// Paths
// ============================================================================

const CLAUDE_DIR = join(homedir(), ".claude");
const PLUGINS_DIR = join(CLAUDE_DIR, "plugins");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");
const KNOWN_MARKETPLACES_PATH = join(PLUGINS_DIR, "known_marketplaces.json");
const INSTALLED_PLUGINS_PATH = join(PLUGINS_DIR, "installed_plugins.json");

// ============================================================================
// Utilities
// ============================================================================

async function ensureDir(path: string): Promise<void> {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true });
  }
}

async function readJsonFile<T>(path: string, defaultValue: T): Promise<T> {
  try {
    if (!existsSync(path)) {
      return defaultValue;
    }
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile<T>(path: string, data: T): Promise<void> {
  const dir = join(path, "..");
  await ensureDir(dir);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ============================================================================
// Settings Manager
// ============================================================================

export async function readSettings(): Promise<ClaudeSettings> {
  return readJsonFile<ClaudeSettings>(SETTINGS_PATH, {});
}

export async function writeSettings(settings: ClaudeSettings): Promise<void> {
  await ensureDir(CLAUDE_DIR);
  await writeJsonFile(SETTINGS_PATH, settings);
}

export async function readKnownMarketplaces(): Promise<KnownMarketplaces> {
  return readJsonFile<KnownMarketplaces>(KNOWN_MARKETPLACES_PATH, {});
}

export async function writeKnownMarketplaces(
  marketplaces: KnownMarketplaces,
): Promise<void> {
  await ensureDir(PLUGINS_DIR);
  await writeJsonFile(KNOWN_MARKETPLACES_PATH, marketplaces);
}

export async function readInstalledPlugins(): Promise<InstalledPluginsFile> {
  return readJsonFile<InstalledPluginsFile>(INSTALLED_PLUGINS_PATH, {
    version: 2,
    plugins: {},
  });
}

export async function writeInstalledPlugins(
  pluginsFile: InstalledPluginsFile,
): Promise<void> {
  await ensureDir(PLUGINS_DIR);
  await writeJsonFile(INSTALLED_PLUGINS_PATH, pluginsFile);
}

// ============================================================================
// Plugin Registration
// ============================================================================

const PLUGIN_NAME = "questionably-ultrathink";
const MARKETPLACE_ID = "questionably-ultrathink";
const PLUGIN_ID = `${PLUGIN_NAME}@${MARKETPLACE_ID}`;

export interface RegisterOptions {
  marketplacePath: string;
  pluginPath: string;
  version: string;
}

/**
 * Register the plugin with Claude Code's configuration files.
 *
 * Claude Code expects marketplaces to have this structure:
 *   ~/.claude/plugins/marketplaces/<marketplace-name>/
 *   ├── .claude-plugin/
 *   │   └── marketplace.json
 *   └── plugins/
 *       └── <plugin-name>/
 *           └── .claude-plugin/
 *               └── plugin.json
 *
 * The marketplace source path should point to the marketplace root,
 * and the plugin installPath should point to the plugin subdirectory.
 */
export async function registerPlugin(options: RegisterOptions): Promise<void> {
  const { marketplacePath, pluginPath, version } = options;
  const now = new Date().toISOString();

  // 1. Add to known_marketplaces.json (points to marketplace root)
  const marketplaces = await readKnownMarketplaces();
  marketplaces[MARKETPLACE_ID] = {
    source: {
      source: "directory",
      path: marketplacePath,
    },
    installLocation: marketplacePath,
    lastUpdated: now,
  };
  await writeKnownMarketplaces(marketplaces);

  // 2. Add to installed_plugins.json (points to plugin inside marketplace)
  const pluginsFile = await readInstalledPlugins();
  if (!pluginsFile.plugins) {
    pluginsFile.plugins = {};
  }
  if (!pluginsFile.version) {
    pluginsFile.version = 2;
  }
  pluginsFile.plugins[PLUGIN_ID] = [
    {
      scope: "user",
      installPath: pluginPath,
      version: version,
      installedAt: now,
    },
  ];
  await writeInstalledPlugins(pluginsFile);

  // 3. Enable in settings.json
  const settings = await readSettings();
  if (!settings.enabledPlugins) {
    settings.enabledPlugins = {};
  }
  settings.enabledPlugins[PLUGIN_ID] = true;
  await writeSettings(settings);
}

/**
 * Unregister the plugin from Claude Code's configuration files.
 */
export async function unregisterPlugin(): Promise<void> {
  // 1. Remove from known_marketplaces.json
  const marketplaces = await readKnownMarketplaces();
  delete marketplaces[MARKETPLACE_ID];
  await writeKnownMarketplaces(marketplaces);

  // 2. Remove from installed_plugins.json
  const pluginsFile = await readInstalledPlugins();
  if (pluginsFile.plugins) {
    delete pluginsFile.plugins[PLUGIN_ID];
  }
  await writeInstalledPlugins(pluginsFile);

  // 3. Disable in settings.json
  const settings = await readSettings();
  if (settings.enabledPlugins) {
    delete settings.enabledPlugins[PLUGIN_ID];
  }
  await writeSettings(settings);
}

/**
 * Check if the plugin is currently registered.
 */
export async function isPluginRegistered(): Promise<boolean> {
  const pluginsFile = await readInstalledPlugins();
  return pluginsFile.plugins && PLUGIN_ID in pluginsFile.plugins;
}

/**
 * Get the plugin ID for display purposes.
 */
export function getPluginId(): string {
  return PLUGIN_ID;
}

/**
 * Get the marketplace ID for display purposes.
 */
export function getMarketplaceId(): string {
  return MARKETPLACE_ID;
}
