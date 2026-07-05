import type {
  ReachConfig,
  ReachMatchContext,
  ReachMatchResult,
  ReachEngineOptions,
  FrequencyControlStrategy,
  FrequencyControlResult,
  ReachPointType,
} from './types';

const EXPOSURE_STORAGE_KEY = 'ai_assistant_reach_exposure';

const loadExposureMap = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(EXPOSURE_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
};

const saveExposureMap = (map: Record<string, number>): void => {
  try {
    localStorage.setItem(EXPOSURE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

export const defaultFrequencyStrategy: FrequencyControlStrategy = {
  check(): FrequencyControlResult {
    return { allowed: true };
  },
  recordExposure(reachId: string): void {
    const map = loadExposureMap();
    map[reachId] = (map[reachId] || 0) + 1;
    saveExposureMap(map);
  },
};

export function sortByPriority(configs: ReachConfig[]): ReachConfig[] {
  return [...configs].sort((a, b) => a.priority - b.priority);
}

export function matchReachConfigs(
  configs: ReachConfig[],
  pointType: ReachPointType,
  ctx: ReachMatchContext,
): ReachConfig[] {
  const filtered = configs.filter((config) => {
    if (config.pointType !== pointType) return false;
    if (config.match && !config.match(ctx)) return false;
    return true;
  });
  return sortByPriority(filtered);
}

export function getTopMatch(matched: ReachConfig[]): ReachConfig | null {
  if (matched.length === 0) return null;
  return matched[0];
}

export class ReachEngine {
  private configs: ReachConfig[] = [];
  private frequencyStrategy: FrequencyControlStrategy;

  constructor(options: ReachEngineOptions) {
    this.configs = [...options.configs];
    this.frequencyStrategy = options.frequencyStrategy || defaultFrequencyStrategy;
  }

  registerConfigs(configs: ReachConfig[]): void {
    this.configs = [...this.configs, ...configs];
  }

  clearConfigs(): void {
    this.configs = [];
  }

  getAllConfigs(): ReachConfig[] {
    return [...this.configs];
  }

  match(
    pointType: ReachPointType,
    ctx: ReachMatchContext,
  ): ReachMatchResult {
    const allMatched = matchReachConfigs(this.configs, pointType, ctx);
    const filteredByFrequency = allMatched.filter((config) => {
      const result = this.frequencyStrategy.check(config.reachId);
      return result.allowed;
    });
    return {
      matched: getTopMatch(filteredByFrequency),
      allMatched: filteredByFrequency,
    };
  }

  recordExposure(reachId: string): void {
    this.frequencyStrategy.recordExposure(reachId);
  }

  getConfigById(reachId: string): ReachConfig | undefined {
    return this.configs.find((c) => c.reachId === reachId);
  }

  frequencyControlCheck(reachId: string): FrequencyControlResult {
    return this.frequencyStrategy.check(reachId);
  }
}

let globalEngine: ReachEngine | null = null;

export function initGlobalReachEngine(configs: ReachConfig[]): ReachEngine {
  globalEngine = new ReachEngine({ configs });
  return globalEngine;
}

export function getGlobalReachEngine(): ReachEngine | null {
  return globalEngine;
}

export function resolveLongText(
  config: ReachConfig,
  ctx: ReachMatchContext,
): string {
  if (typeof config.longText === 'function') {
    return config.longText(ctx);
  }
  return config.longText;
}
