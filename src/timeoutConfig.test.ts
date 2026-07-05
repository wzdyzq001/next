import { describe, it, expect } from 'vitest';
import { getReservationTimeout, getReservationTimeoutMinutes } from './src/redeemReminder';

describe('getReservationTimeout', () => {
  it('餐饮（food）返回 5 分钟', () => {
    expect(getReservationTimeout('food')).toBe(5 * 60 * 1000);
  });

  it('酒店（hotel）返回 30 分钟', () => {
    expect(getReservationTimeout('hotel')).toBe(30 * 60 * 1000);
  });

  it('景区（scenic）返回 15 分钟', () => {
    expect(getReservationTimeout('scenic')).toBe(15 * 60 * 1000);
  });

  it('景区别名（play）返回 15 分钟', () => {
    expect(getReservationTimeout('play')).toBe(15 * 60 * 1000);
  });

  it('旅行社（travel）返回默认 5 分钟', () => {
    expect(getReservationTimeout('travel')).toBe(5 * 60 * 1000);
  });

  it('无品类返回默认 5 分钟', () => {
    expect(getReservationTimeout(undefined)).toBe(5 * 60 * 1000);
  });

  it('未知品类返回默认 5 分钟', () => {
    expect(getReservationTimeout('unknown')).toBe(5 * 60 * 1000);
  });
});

describe('getReservationTimeoutMinutes', () => {
  it('餐饮返回 5 分钟', () => {
    expect(getReservationTimeoutMinutes('food')).toBe(5);
  });

  it('酒店返回 30 分钟', () => {
    expect(getReservationTimeoutMinutes('hotel')).toBe(30);
  });

  it('景区返回 15 分钟', () => {
    expect(getReservationTimeoutMinutes('scenic')).toBe(15);
  });

  it('默认返回 5 分钟', () => {
    expect(getReservationTimeoutMinutes()).toBe(5);
  });
});
