import type { Entity } from './types';

const CHINESE_NUMBERS: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

export function extractEntities(message: string): Entity[] {
  const entities: Entity[] = [];

  const dateEntity = extractDate(message);
  if (dateEntity) entities.push(dateEntity);

  const timeEntity = extractTime(message);
  if (timeEntity) entities.push(timeEntity);

  const peopleCountEntity = extractPeopleCount(message);
  if (peopleCountEntity) entities.push(peopleCountEntity);

  return entities;
}

export function extractDate(message: string): Entity | null {
  const patterns: Array<{ regex: RegExp; type: string; parse: (match: RegExpMatchArray) => string }> = [
    {
      regex: /明天/,
      type: 'date',
      parse: () => '明天',
    },
    {
      regex: /后天/,
      type: 'date',
      parse: () => '后天',
    },
    {
      regex: /大后天/,
      type: 'date',
      parse: () => '大后天',
    },
    {
      regex: /今天/,
      type: 'date',
      parse: () => '今天',
    },
    {
      regex: /周(一|二|三|四|五|六|日|天)/,
      type: 'date',
      parse: (match) => `周${match[1]}`,
    },
    {
      regex: /下周(一|二|三|四|五|六|日|天)/,
      type: 'date',
      parse: (match) => `下周${match[1]}`,
    },
    {
      regex: /本周(一|二|三|四|五|六|日|天)/,
      type: 'date',
      parse: (match) => `本周${match[1]}`,
    },
    {
      regex: /(\d{1,2})月(\d{1,2})[日号]/,
      type: 'date',
      parse: (match) => `${match[1]}月${match[2]}日`,
    },
    {
      regex: /过期前(\d+)天/,
      type: 'date',
      parse: (match) => `过期前${match[1]}天`,
    },
    {
      regex: /最后一天/,
      type: 'date',
      parse: () => '最后一天',
    },
    {
      regex: /过期前一天/,
      type: 'date',
      parse: () => '过期前1天',
    },
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      return {
        type: 'date' as const,
        value: pattern.parse(match),
        raw: match[0],
      };
    }
  }

  return null;
}

export function extractTime(message: string): Entity | null {
  const patterns: Array<{ regex: RegExp; parse: (match: RegExpMatchArray) => string }> = [
    {
      regex: /(\d{1,2})[:：](\d{2})/,
      parse: (match) => `${match[1]}:${match[2]}`,
    },
    {
      regex: /(\d{1,2})点(\d{1,2})分?/,
      parse: (match) => `${match[1]}:${match[2]}`,
    },
    {
      regex: /(\d{1,2})点半/,
      parse: (match) => `${match[1]}:30`,
    },
    {
      regex: /(\d{1,2})点钟?/,
      parse: (match) => `${match[1]}:00`,
    },
    {
      regex: /早上(\d{1,2})点?/,
      parse: (match) => `${match[1]}:00`,
    },
    {
      regex: /中午(\d{1,2})点?/,
      parse: (match) => `${match[1]}:00`,
    },
    {
      regex: /下午(\d{1,2})点?/,
      parse: (match) => `${parseInt(match[1]) + 12}:00`,
    },
    {
      regex: /晚上(\d{1,2})点?/,
      parse: (match) => `${parseInt(match[1]) + 12}:00`,
    },
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      return {
        type: 'time' as const,
        value: pattern.parse(match),
        raw: match[0],
      };
    }
  }

  return null;
}

export function extractPeopleCount(message: string): Entity | null {
  const patterns: Array<{ regex: RegExp; parse: (match: RegExpMatchArray) => string }> = [
    {
      regex: /(\d+)个人?/,
      parse: (match) => match[1],
    },
    {
      regex: /(\d+)位/,
      parse: (match) => match[1],
    },
    {
      regex: /([一二两三四五六七八九十]+)个人?/,
      parse: (match) => parseChineseNumber(match[1]).toString(),
    },
    {
      regex: /([一二两三四五六七八九十]+)位/,
      parse: (match) => parseChineseNumber(match[1]).toString(),
    },
    {
      regex: /几个人/,
      parse: () => '',
    },
    {
      regex: /几位/,
      parse: () => '',
    },
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      const value = pattern.parse(match);
      if (value || pattern.regex.source.includes('几')) {
        return {
          type: 'people_count' as const,
          value: value,
          raw: match[0],
        };
      }
    }
  }

  return null;
}

function parseChineseNumber(chinese: string): number {
  if (chinese === '十') return 10;
  if (chinese.startsWith('十')) {
    return 10 + (CHINESE_NUMBERS[chinese[1]] || 0);
  }
  if (chinese.endsWith('十')) {
    return (CHINESE_NUMBERS[chinese[0]] || 0) * 10;
  }
  if (chinese.length === 2 && chinese[1] === '十') {
    return (CHINESE_NUMBERS[chinese[0]] || 0) * 10;
  }
  if (chinese.length === 3 && chinese[1] === '十') {
    return (CHINESE_NUMBERS[chinese[0]] || 0) * 10 + (CHINESE_NUMBERS[chinese[2]] || 0);
  }
  return CHINESE_NUMBERS[chinese] || 0;
}

export function extractNumber(message: string): Entity | null {
  const match = message.match(/\d+/);
  if (match) {
    return {
      type: 'number' as const,
      value: match[0],
      raw: match[0],
    };
  }
  return null;
}
