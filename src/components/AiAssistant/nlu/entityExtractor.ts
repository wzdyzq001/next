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

  const phoneEntity = extractPhone(message);
  if (phoneEntity) entities.push(phoneEntity);

  return entities;
}

export function extractDate(message: string): Entity | null {
  const messageNoSpaces = message.replace(/\s+/g, '');

  const patterns: Array<{ regex: RegExp; type: string; parse: (match: RegExpMatchArray) => string; useNoSpaces?: boolean }> = [
    {
      regex: /(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/,
      type: 'date',
      parse: (match) => `${parseInt(match[2])}月${parseInt(match[3])}日`,
    },
    {
      regex: /([一二两三四五六七八九十]+)月([一二两三四五六七八九十]+)[日号]/,
      type: 'date',
      parse: (match) => `${parseChineseNumber(match[1])}月${parseChineseNumber(match[2])}日`,
    },
    {
      regex: /([一二两三四五六七八九十]+)月([一二两三四五六七八九十]+)[日号]/,
      type: 'date',
      parse: (match) => `${parseChineseNumber(match[1])}月${parseChineseNumber(match[2])}日`,
      useNoSpaces: true,
    },
    {
      regex: /大前天/,
      type: 'date',
      parse: () => '大前天',
    },
    {
      regex: /前天/,
      type: 'date',
      parse: () => '前天',
    },
    {
      regex: /昨天/,
      type: 'date',
      parse: () => '昨天',
    },
    {
      regex: /今天/,
      type: 'date',
      parse: () => '今天',
    },
    {
      regex: /大后天/,
      type: 'date',
      parse: () => '大后天',
    },
    {
      regex: /后天/,
      type: 'date',
      parse: () => '后天',
    },
    {
      regex: /明天/,
      type: 'date',
      parse: () => '明天',
    },
    {
      regex: /(\d+)\s*天前/,
      type: 'date',
      parse: (match) => `${match[1]}天前`,
    },
    {
      regex: /(\d+)\s*天后/,
      type: 'date',
      parse: (match) => `${match[1]}天后`,
    },
    {
      regex: /([一二两三四五六七八九十]+)\s*天前/,
      type: 'date',
      parse: (match) => `${parseChineseNumber(match[1])}天前`,
    },
    {
      regex: /([一二两三四五六七八九十]+)\s*天后/,
      type: 'date',
      parse: (match) => `${parseChineseNumber(match[1])}天后`,
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
      regex: /周(一|二|三|四|五|六|日|天)/,
      type: 'date',
      parse: (match) => `周${match[1]}`,
    },
    {
      regex: /(\d{1,2})月(\d{1,2})[日号]/,
      type: 'date',
      parse: (match) => `${match[1]}月${match[2]}日`,
    },
    {
      regex: /(\d{1,2})月(\d{1,2})[日号]/,
      type: 'date',
      parse: (match) => `${match[1]}月${match[2]}日`,
      useNoSpaces: true,
    },
    {
      regex: /(\d{1,2})[\/\.](\d{1,2})[日号]?/,
      type: 'date',
      parse: (match) => `${parseInt(match[1])}月${parseInt(match[2])}日`,
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
    const target = pattern.useNoSpaces ? messageNoSpaces : message;
    const match = target.match(pattern.regex);
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

function formatTime(hour: number | string, minute: number | string): string {
  const h = typeof hour === 'string' ? parseInt(hour) : hour;
  const m = typeof minute === 'string' ? parseInt(minute) : minute;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeStr(timeStr: string): string {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return formatTime(parts[0], parts[1]);
  }
  return timeStr;
}

export function extractTime(message: string): Entity | null {
  let messageNoPeople = message.replace(/[0-9一二两三四五六七八九十]+\s*个?\s*[人位]/g, '');
  messageNoPeople = messageNoPeople.replace(/[0-9一二两三四五六七八九十]+\s*个/g, '');
  const messageWithSpaces = messageNoPeople;
  const messageNoSpaces = messageNoPeople.replace(/\s+/g, '');

  const spacedPatterns: Array<{ regex: RegExp; parse: (match: RegExpMatchArray) => string }> = [
    {
      regex: /(早上|上午|中午|下午|晚上)\s*(\d{1,2})\s*点\s*(\d{1,2})\s*分/,
      parse: (match) => {
        const period = match[1];
        let hour = parseInt(match[2]);
        const minute = match[3];
        if ((period === '下午' || period === '晚上') && hour < 12) hour += 12;
        return `${hour}:${minute}`;
      },
    },
    {
      regex: /(早上|上午|中午|下午|晚上)\s*(\d{1,2})\s*点半/,
      parse: (match) => {
        const period = match[1];
        let hour = parseInt(match[2]);
        if ((period === '下午' || period === '晚上') && hour < 12) hour += 12;
        return `${hour}:30`;
      },
    },
    {
      regex: /(早上|上午|中午|下午|晚上)\s*(\d{1,2})\s*点/,
      parse: (match) => {
        const period = match[1];
        let hour = parseInt(match[2]);
        if ((period === '下午' || period === '晚上') && hour < 12) hour += 12;
        return `${hour}:00`;
      },
    },
    {
      regex: /(\d{1,2})\s*点\s*(\d{1,2})\s*分/,
      parse: (match) => `${match[1]}:${match[2]}`,
    },
    {
      regex: /(\d{1,2})\s*点半/,
      parse: (match) => `${match[1]}:30`,
    },
    {
      regex: /(\d{1,2})\s*点/,
      parse: (match) => `${match[1]}:00`,
    },
  ];

  for (const pattern of spacedPatterns) {
    const match = messageWithSpaces.match(pattern.regex);
    if (match) {
      return {
        type: 'time' as const,
        value: parseTimeStr(pattern.parse(match)),
        raw: match[0],
      };
    }
  }

  const patterns: Array<{ regex: RegExp; parse: (match: RegExpMatchArray) => string }> = [
    {
      regex: /(\d{1,2})[:：](\d{2})/,
      parse: (match) => `${parseInt(match[1])}:${match[2]}`,
    },
    {
      regex: /(\d{1,2})\.(\d{2})/,
      parse: (match) => `${parseInt(match[1])}:${match[2]}`,
    },
    {
      regex: /早上([一二两三四五六七八九十]+)点半/,
      parse: (match) => `${parseChineseNumber(match[1])}:30`,
    },
    {
      regex: /上午([一二两三四五六七八九十]+)点半/,
      parse: (match) => `${parseChineseNumber(match[1])}:30`,
    },
    {
      regex: /中午([一二两三四五六七八九十]+)点半/,
      parse: (match) => `${parseChineseNumber(match[1])}:30`,
    },
    {
      regex: /下午([一二两三四五六七八九十]+)点半/,
      parse: (match) => `${parseChineseNumber(match[1]) + 12}:30`,
    },
    {
      regex: /晚上([一二两三四五六七八九十]+)点半/,
      parse: (match) => `${parseChineseNumber(match[1]) + 12}:30`,
    },
    {
      regex: /早上([一二两三四五六七八九十]+)点([一二两三四五六七八九十]+)分/,
      parse: (match) => `${parseChineseNumber(match[1])}:${parseChineseNumber(match[2])}`,
    },
    {
      regex: /上午([一二两三四五六七八九十]+)点([一二两三四五六七八九十]+)分/,
      parse: (match) => `${parseChineseNumber(match[1])}:${parseChineseNumber(match[2])}`,
    },
    {
      regex: /中午([一二两三四五六七八九十]+)点([一二两三四五六七八九十]+)分/,
      parse: (match) => `${parseChineseNumber(match[1])}:${parseChineseNumber(match[2])}`,
    },
    {
      regex: /下午([一二两三四五六七八九十]+)点([一二两三四五六七八九十]+)分/,
      parse: (match) => `${parseChineseNumber(match[1]) + 12}:${parseChineseNumber(match[2])}`,
    },
    {
      regex: /晚上([一二两三四五六七八九十]+)点([一二两三四五六七八九十]+)分/,
      parse: (match) => `${parseChineseNumber(match[1]) + 12}:${parseChineseNumber(match[2])}`,
    },
    {
      regex: /早上([一二两三四五六七八九十]+)点?(\d{1,2})分?/,
      parse: (match) => `${parseChineseNumber(match[1])}:${match[2]}`,
    },
    {
      regex: /上午([一二两三四五六七八九十]+)点?(\d{1,2})分?/,
      parse: (match) => `${parseChineseNumber(match[1])}:${match[2]}`,
    },
    {
      regex: /中午([一二两三四五六七八九十]+)点?(\d{1,2})分?/,
      parse: (match) => `${parseChineseNumber(match[1])}:${match[2]}`,
    },
    {
      regex: /下午([一二两三四五六七八九十]+)点?(\d{1,2})分?/,
      parse: (match) => `${parseChineseNumber(match[1]) + 12}:${match[2]}`,
    },
    {
      regex: /晚上([一二两三四五六七八九十]+)点?(\d{1,2})分?/,
      parse: (match) => `${parseChineseNumber(match[1]) + 12}:${match[2]}`,
    },
    {
      regex: /早上([一二两三四五六七八九十]+)点钟?/,
      parse: (match) => `${parseChineseNumber(match[1])}:00`,
    },
    {
      regex: /上午([一二两三四五六七八九十]+)点钟?/,
      parse: (match) => `${parseChineseNumber(match[1])}:00`,
    },
    {
      regex: /中午([一二两三四五六七八九十]+)点钟?/,
      parse: (match) => `${parseChineseNumber(match[1])}:00`,
    },
    {
      regex: /下午([一二两三四五六七八九十]+)点钟?/,
      parse: (match) => `${parseChineseNumber(match[1]) + 12}:00`,
    },
    {
      regex: /晚上([一二两三四五六七八九十]+)点钟?/,
      parse: (match) => `${parseChineseNumber(match[1]) + 12}:00`,
    },
    {
      regex: /早上(\d{1,2})点半/,
      parse: (match) => `${parseInt(match[1])}:30`,
    },
    {
      regex: /上午(\d{1,2})点半/,
      parse: (match) => `${parseInt(match[1])}:30`,
    },
    {
      regex: /中午(\d{1,2})点半/,
      parse: (match) => `${parseInt(match[1])}:30`,
    },
    {
      regex: /下午(\d{1,2})点半/,
      parse: (match) => `${parseInt(match[1]) + 12}:30`,
    },
    {
      regex: /晚上(\d{1,2})点半/,
      parse: (match) => `${parseInt(match[1]) + 12}:30`,
    },
    {
      regex: /早上(\d{1,2})点?(\d{1,2})分?/,
      parse: (match) => `${parseInt(match[1])}:${match[2]}`,
    },
    {
      regex: /上午(\d{1,2})点?(\d{1,2})分?/,
      parse: (match) => `${parseInt(match[1])}:${match[2]}`,
    },
    {
      regex: /中午(\d{1,2})点?(\d{1,2})分?/,
      parse: (match) => `${parseInt(match[1])}:${match[2]}`,
    },
    {
      regex: /下午(\d{1,2})点?(\d{1,2})分?/,
      parse: (match) => `${parseInt(match[1]) + 12}:${match[2]}`,
    },
    {
      regex: /晚上(\d{1,2})点?(\d{1,2})分?/,
      parse: (match) => `${parseInt(match[1]) + 12}:${match[2]}`,
    },
    {
      regex: /早上(\d{1,2})点钟?/,
      parse: (match) => `${parseInt(match[1])}:00`,
    },
    {
      regex: /上午(\d{1,2})点钟?/,
      parse: (match) => `${parseInt(match[1])}:00`,
    },
    {
      regex: /中午(\d{1,2})点钟?/,
      parse: (match) => `${parseInt(match[1])}:00`,
    },
    {
      regex: /下午(\d{1,2})点钟?/,
      parse: (match) => `${parseInt(match[1]) + 12}:00`,
    },
    {
      regex: /晚上(\d{1,2})点钟?/,
      parse: (match) => `${parseInt(match[1]) + 12}:00`,
    },
    {
      regex: /(\d{1,2})点(\d{1,2})分/,
      parse: (match) => `${parseInt(match[1])}:${match[2]}`,
    },
    {
      regex: /(\d{1,2})点半/,
      parse: (match) => `${parseInt(match[1])}:30`,
    },
    {
      regex: /(\d{1,2})点钟?/,
      parse: (match) => `${parseInt(match[1])}:00`,
    },
    {
      regex: /([一二两三四五六七八九十]+)点([一二两三四五六七八九十]+)分/,
      parse: (match) => `${parseChineseNumber(match[1])}:${parseChineseNumber(match[2])}`,
    },
    {
      regex: /([一二两三四五六七八九十]+)点半/,
      parse: (match) => `${parseChineseNumber(match[1])}:30`,
    },
    {
      regex: /([一二两三四五六七八九十]+)点钟?/,
      parse: (match) => `${parseChineseNumber(match[1])}:00`,
    },
  ];

  for (const pattern of patterns) {
    const match = messageNoSpaces.match(pattern.regex);
    if (match) {
      return {
        type: 'time' as const,
        value: parseTimeStr(pattern.parse(match)),
        raw: match[0],
      };
    }
  }

  return null;
}

export function extractPeopleCount(message: string): Entity | null {
  const patterns: Array<{ regex: RegExp; parse: (match: RegExpMatchArray) => string }> = [
    {
      regex: /(\d+)\s*个\s*(人|位)/,
      parse: (match) => match[1],
    },
    {
      regex: /(\d+)\s*(人|位)/,
      parse: (match) => match[1],
    },
    {
      regex: /([一二两三四五六七八九十]+)\s*个\s*(人|位)/,
      parse: (match) => parseChineseNumber(match[1]).toString(),
    },
    {
      regex: /([一二两三四五六七八九十]+)\s*(人|位)/,
      parse: (match) => parseChineseNumber(match[1]).toString(),
    },
    {
      regex: /(\d+)\s*个/,
      parse: (match) => match[1],
    },
    {
      regex: /([一二两三四五六七八九十]+)\s*个/,
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

export function extractPhone(message: string): Entity | null {
  const trimmed = message.trim();
  const match = trimmed.match(/^1(3[0-9]|4[5-9]|5[0-35-9]|6[2567]|7[0-8]|8[0-9]|9[0-35-9])\d{8}$/);
  if (match) {
    return {
      type: 'phone' as const,
      value: match[0],
      raw: match[0],
    };
  }
  return null;
}

function parseValidDateEnd(validDate: string): Date | null {
  const rangeMatch = validDate.match(/(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})\s*至\s*(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (rangeMatch) {
    const year = parseInt(rangeMatch[4]);
    const month = parseInt(rangeMatch[5]);
    const day = parseInt(rangeMatch[6]);
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const singleMatch = validDate.match(/(?:有效期至|至)\s*(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (singleMatch) {
    const year = parseInt(singleMatch[1]);
    const month = parseInt(singleMatch[2]);
    const day = parseInt(singleMatch[3]);
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const pureDateMatch = validDate.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
  if (pureDateMatch) {
    const year = parseInt(pureDateMatch[1]);
    const month = parseInt(pureDateMatch[2]);
    const day = parseInt(pureDateMatch[3]);
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  return null;
}

export function parseDateToTimestamp(
  dateStr: string,
  validDate?: string,
  now?: number
): number | null {
  const nowDate = now ? new Date(now) : new Date();
  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());

  const relativeDayMap: Record<string, number> = {
    '大前天': -3,
    '前天': -2,
    '昨天': -1,
    '今天': 0,
    '明天': 1,
    '后天': 2,
    '大后天': 3,
  };

  if (dateStr in relativeDayMap) {
    const d = new Date(today);
    d.setDate(d.getDate() + relativeDayMap[dateStr]);
    return d.getTime();
  }

  const daysAfterMatch = dateStr.match(/^(\d+)天后$/);
  if (daysAfterMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(daysAfterMatch[1]));
    return d.getTime();
  }

  const daysBeforeMatch = dateStr.match(/^(\d+)天前$/);
  if (daysBeforeMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() - parseInt(daysBeforeMatch[1]));
    return d.getTime();
  }

  const lastDayMatch = dateStr === '最后一天';
  const expireBeforeMatch = dateStr.match(/^过期前(\d+)天$/);
  if (lastDayMatch || expireBeforeMatch) {
    if (!validDate) return null;
    const endDate = parseValidDateEnd(validDate);
    if (!endDate) return null;
    const daysBefore = lastDayMatch ? 0 : parseInt(expireBeforeMatch![1]);
    const d = new Date(endDate);
    d.setDate(d.getDate() - daysBefore);
    return d.getTime();
  }

  const weekDayMap: Record<string, number> = {
    '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '天': 0,
  };

  const thisWeekMatch = dateStr.match(/^本周(一|二|三|四|五|六|日|天)$/);
  if (thisWeekMatch) {
    const targetDay = weekDayMap[thisWeekMatch[1]];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d.getTime();
  }

  const nextWeekMatch = dateStr.match(/^下周(一|二|三|四|五|六|日|天)$/);
  if (nextWeekMatch) {
    const targetDay = weekDayMap[nextWeekMatch[1]];
    const currentDay = today.getDay();
    const diff = targetDay - currentDay + 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d.getTime();
  }

  const weekMatch = dateStr.match(/^周(一|二|三|四|五|六|日|天)$/);
  if (weekMatch) {
    const targetDay = weekDayMap[weekMatch[1]];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d.getTime();
  }

  const monthDayMatch = dateStr.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2]);
    let year = today.getFullYear();
    let d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    if (d < today) {
      year += 1;
      d = new Date(year, month - 1, day);
      d.setHours(0, 0, 0, 0);
    }
    return d.getTime();
  }

  return null;
}
