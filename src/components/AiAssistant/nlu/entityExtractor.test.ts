import { describe, it, expect } from 'vitest';
import { extractDate, extractTime, extractPeopleCount, extractPhone, parseDateToTimestamp, extractEntities } from './entityExtractor';

describe('extractDate', () => {
  it('五月一日 → 5月1日', () => {
    const result = extractDate('五月一日');
    expect(result?.value).toBe('5月1日');
  });

  it('三月十五号 → 3月15日', () => {
    const result = extractDate('三月十五号');
    expect(result?.value).toBe('3月15日');
  });

  it('2026-07-10 → 7月10日', () => {
    const result = extractDate('2026-07-10');
    expect(result?.value).toBe('7月10日');
  });

  it('2026.07.10 → 7月10日', () => {
    const result = extractDate('2026.07.10');
    expect(result?.value).toBe('7月10日');
  });

  it('7.10 → 7月10日', () => {
    const result = extractDate('7.10');
    expect(result?.value).toBe('7月10日');
  });

  it('昨天 → 昨天', () => {
    const result = extractDate('昨天');
    expect(result?.value).toBe('昨天');
  });

  it('前天 → 前天', () => {
    const result = extractDate('前天');
    expect(result?.value).toBe('前天');
  });

  it('大前天 → 大前天', () => {
    const result = extractDate('大前天');
    expect(result?.value).toBe('大前天');
  });

  it('2026/07/10 → 7月10日', () => {
    const result = extractDate('2026/07/10');
    expect(result?.value).toBe('7月10日');
  });

  it('7/10 → 7月10日', () => {
    const result = extractDate('7/10');
    expect(result?.value).toBe('7月10日');
  });

  it('今天 → 今天', () => {
    const result = extractDate('今天');
    expect(result?.value).toBe('今天');
  });

  it('明天 → 明天', () => {
    const result = extractDate('明天');
    expect(result?.value).toBe('明天');
  });

  it('后天 → 后天', () => {
    const result = extractDate('后天');
    expect(result?.value).toBe('后天');
  });

  it('大后天 → 大后天', () => {
    const result = extractDate('大后天');
    expect(result?.value).toBe('大后天');
  });

  it('5月1日 → 5月1日', () => {
    const result = extractDate('5月1日');
    expect(result?.value).toBe('5月1日');
  });

  it('12月25号 → 12月25日', () => {
    const result = extractDate('12月25号');
    expect(result?.value).toBe('12月25日');
  });

  it('周一 → 周一', () => {
    const result = extractDate('周一');
    expect(result?.value).toBe('周一');
  });

  it('本周五 → 本周五', () => {
    const result = extractDate('本周五');
    expect(result?.value).toBe('本周五');
  });

  it('下周日 → 下周日', () => {
    const result = extractDate('下周日');
    expect(result?.value).toBe('下周日');
  });

  it('过期前3天 → 过期前3天', () => {
    const result = extractDate('过期前3天');
    expect(result?.value).toBe('过期前3天');
  });

  it('过期前1天 → 过期前1天', () => {
    const result = extractDate('过期前1天');
    expect(result?.value).toBe('过期前1天');
  });

  it('最后一天 → 最后一天', () => {
    const result = extractDate('最后一天');
    expect(result?.value).toBe('最后一天');
  });

  it('过期前一天 → 过期前1天', () => {
    const result = extractDate('过期前一天');
    expect(result?.value).toBe('过期前1天');
  });
});

describe('extractTime', () => {
  it('3 点 10 分 → 03:10', () => {
    const result = extractTime('3 点 10 分');
    expect(result?.value).toBe('03:10');
  });

  it('6 点半 → 06:30', () => {
    const result = extractTime('6 点半');
    expect(result?.value).toBe('06:30');
  });

  it('14 点 → 14:00', () => {
    const result = extractTime('14 点');
    expect(result?.value).toBe('14:00');
  });

  it('18.30 → 18:30', () => {
    const result = extractTime('18.30');
    expect(result?.value).toBe('18:30');
  });

  it('中午12点 → 12:00', () => {
    const result = extractTime('中午12点');
    expect(result?.value).toBe('12:00');
  });

  it('三点十分 → 03:10', () => {
    const result = extractTime('三点十分');
    expect(result?.value).toBe('03:10');
  });

  it('晚上 7 点 → 19:00', () => {
    const result = extractTime('晚上 7 点');
    expect(result?.value).toBe('19:00');
  });

  it('中午十二点半 → 12:30', () => {
    const result = extractTime('中午十二点半');
    expect(result?.value).toBe('12:30');
  });

  it('14.00 → 14:00', () => {
    const result = extractTime('14.00');
    expect(result?.value).toBe('14:00');
  });

  it('9.05 → 09:05', () => {
    const result = extractTime('9.05');
    expect(result?.value).toBe('09:05');
  });

  it('六点半 → 06:30', () => {
    const result = extractTime('六点半');
    expect(result?.value).toBe('06:30');
  });

  it('九点钟 → 09:00', () => {
    const result = extractTime('九点钟');
    expect(result?.value).toBe('09:00');
  });

  it('五点 → 05:00', () => {
    const result = extractTime('五点');
    expect(result?.value).toBe('05:00');
  });

  it('三点半 → 03:30', () => {
    const result = extractTime('三点半');
    expect(result?.value).toBe('03:30');
  });

  it('3点10分 → 03:10', () => {
    const result = extractTime('3点10分');
    expect(result?.value).toBe('03:10');
  });

  it('下午3点 → 15:00', () => {
    const result = extractTime('下午3点');
    expect(result?.value).toBe('15:00');
  });

  it('上午10点半 → 10:30', () => {
    const result = extractTime('上午10点半');
    expect(result?.value).toBe('10:30');
  });

  it('14点 → 14:00', () => {
    const result = extractTime('14点');
    expect(result?.value).toBe('14:00');
  });

  it('早上8点 → 08:00', () => {
    const result = extractTime('早上8点');
    expect(result?.value).toBe('08:00');
  });

  it('上午9点 → 09:00', () => {
    const result = extractTime('上午9点');
    expect(result?.value).toBe('09:00');
  });

  it('晚上8点 → 20:00', () => {
    const result = extractTime('晚上8点');
    expect(result?.value).toBe('20:00');
  });

  it('14:30 → 14:30', () => {
    const result = extractTime('14:30');
    expect(result?.value).toBe('14:30');
  });

  it('09:05 → 09:05', () => {
    const result = extractTime('09:05');
    expect(result?.value).toBe('09:05');
  });
});

describe('extractEntities - 日期时间混合', () => {
  it('明天下午3点 → 日期=明天, 时间=15:00', () => {
    const result = extractEntities('明天下午3点');
    const dateEntity = result.find(e => e.type === 'date');
    const timeEntity = result.find(e => e.type === 'time');
    expect(dateEntity?.value).toBe('明天');
    expect(timeEntity?.value).toBe('15:00');
  });

  it('下午3点明天 → 日期=明天, 时间=15:00', () => {
    const result = extractEntities('下午3点明天');
    const dateEntity = result.find(e => e.type === 'date');
    const timeEntity = result.find(e => e.type === 'time');
    expect(dateEntity?.value).toBe('明天');
    expect(timeEntity?.value).toBe('15:00');
  });

  it('本周五18:30 → 日期=本周五, 时间=18:30', () => {
    const result = extractEntities('本周五18:30');
    const dateEntity = result.find(e => e.type === 'date');
    const timeEntity = result.find(e => e.type === 'time');
    expect(dateEntity?.value).toBe('本周五');
    expect(timeEntity?.value).toBe('18:30');
  });

  it('18:30下周一 → 日期=下周一, 时间=18:30', () => {
    const result = extractEntities('18:30下周一');
    const dateEntity = result.find(e => e.type === 'date');
    const timeEntity = result.find(e => e.type === 'time');
    expect(dateEntity?.value).toBe('下周一');
    expect(timeEntity?.value).toBe('18:30');
  });

  it('5月1日上午十点半 → 日期=5月1日, 时间=10:30', () => {
    const result = extractEntities('5月1日上午十点半');
    const dateEntity = result.find(e => e.type === 'date');
    const timeEntity = result.find(e => e.type === 'time');
    expect(dateEntity?.value).toBe('5月1日');
    expect(timeEntity?.value).toBe('10:30');
  });

  it('晚上七点半后天 → 日期=后天, 时间=19:30', () => {
    const result = extractEntities('晚上七点半后天');
    const dateEntity = result.find(e => e.type === 'date');
    const timeEntity = result.find(e => e.type === 'time');
    expect(dateEntity?.value).toBe('后天');
    expect(timeEntity?.value).toBe('19:30');
  });
});

describe('parseDateToTimestamp', () => {
  const baseDate = new Date('2026-07-15T12:00:00Z').getTime();

  it('今天 → 2026-07-15 00:00:00', () => {
    const result = parseDateToTimestamp('今天', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('明天 → 2026-07-16 00:00:00', () => {
    const result = parseDateToTimestamp('明天', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDate()).toBe(16);
  });

  it('后天 → 2026-07-17 00:00:00', () => {
    const result = parseDateToTimestamp('后天', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDate()).toBe(17);
  });

  it('大后天 → 2026-07-18 00:00:00', () => {
    const result = parseDateToTimestamp('大后天', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDate()).toBe(18);
  });

  it('昨天 → 2026-07-14 00:00:00', () => {
    const result = parseDateToTimestamp('昨天', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDate()).toBe(14);
  });

  it('前天 → 2026-07-13 00:00:00', () => {
    const result = parseDateToTimestamp('前天', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDate()).toBe(13);
  });

  it('大前天 → 2026-07-12 00:00:00', () => {
    const result = parseDateToTimestamp('大前天', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDate()).toBe(12);
  });

  it('8月1日 → 2026-08-01 00:00:00 (当年)', () => {
    const result = parseDateToTimestamp('8月1日', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });

  it('1月1日 → 2027-01-01 00:00:00 (已过则下一年)', () => {
    const result = parseDateToTimestamp('1月1日', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it('过期前3天 (有效期范围格式) → 2026-09-27', () => {
    const result = parseDateToTimestamp('过期前3天', '2026-08-31至2026-09-30', baseDate);
    const d = new Date(result!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(27);
  });

  it('最后一天 (有效期至格式) → 2026-08-31', () => {
    const result = parseDateToTimestamp('最后一天', '有效期至 2026-08-31', baseDate);
    const d = new Date(result!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(31);
  });

  it('过期前1天 (纯日期格式) → 2026-08-30', () => {
    const result = parseDateToTimestamp('过期前1天', '2026-08-31', baseDate);
    const d = new Date(result!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(30);
  });

  it('周一 → 下一个周一 (2026-07-20)', () => {
    const result = parseDateToTimestamp('周一', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDay()).toBe(1);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(20);
  });

  it('本周三 → 本周三 (2026-07-15)', () => {
    const result = parseDateToTimestamp('本周三', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDay()).toBe(3);
    expect(d.getDate()).toBe(15);
  });

  it('下周一 → 下周一 (2026-07-20)', () => {
    const result = parseDateToTimestamp('下周一', undefined, baseDate);
    const d = new Date(result!);
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(20);
  });

  it('无 validDate 的过期前N天 → null', () => {
    const result = parseDateToTimestamp('过期前3天', undefined, baseDate);
    expect(result).toBeNull();
  });

  it('无效日期字符串 → null', () => {
    const result = parseDateToTimestamp('无效日期', undefined, baseDate);
    expect(result).toBeNull();
  });
});

describe('extractPeopleCount', () => {
  it('两位 → 2', () => {
    const result = extractPeopleCount('两位');
    expect(result?.value).toBe('2');
  });

  it('三位 → 3', () => {
    const result = extractPeopleCount('三位');
    expect(result?.value).toBe('3');
  });

  it('5个 → 5', () => {
    const result = extractPeopleCount('5个');
    expect(result?.value).toBe('5');
  });

  it('三个 → 3', () => {
    const result = extractPeopleCount('三个');
    expect(result?.value).toBe('3');
  });

  it('五位 → 5', () => {
    const result = extractPeopleCount('五位');
    expect(result?.value).toBe('5');
  });
});

describe('extractPhone', () => {
  it('13812345678 → 13812345678', () => {
    const result = extractPhone('13812345678');
    expect(result?.value).toBe('13812345678');
    expect(result?.type).toBe('phone');
  });

  it('12345 → null', () => {
    const result = extractPhone('12345');
    expect(result).toBeNull();
  });

  it('abc → null', () => {
    const result = extractPhone('abc');
    expect(result).toBeNull();
  });

  it('13812345678 带前后空格 → 13812345678', () => {
    const result = extractPhone('  13812345678  ');
    expect(result?.value).toBe('13812345678');
  });

  it('长文本中的手机号 → null', () => {
    const result = extractPhone('我的手机号是13812345678');
    expect(result).toBeNull();
  });
});
