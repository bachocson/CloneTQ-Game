// Nạp config/game-config.json cho các công cụ chạy bằng Node (bot, test).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setConfig } from '../core/src/index.js';
import type { GameConfig } from '../core/src/index.js';

export const CONFIG_PATH = fileURLToPath(new URL('../config/game-config.json', import.meta.url));

export function loadConfig(path = CONFIG_PATH): GameConfig {
  const cfg = JSON.parse(readFileSync(path, 'utf8')) as GameConfig;
  setConfig(cfg);
  return cfg;
}
