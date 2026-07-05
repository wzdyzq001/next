import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReservationInfoCard, ReservationInfoCardData } from './ReservationInfoCard';

const baseReservation: ReservationInfoCardData = {
  storeName: '测试桌游馆',
  storeAddress: '测试地址',
  businessHours: '09:00-22:30',
  arrivalTime: '7.1 09:30',
  pax: 2,
  phone: '158****8127',
  acceptStatus: 'pending',
  estimatedAcceptTime: '5分钟内',
  acceptDeadlineAt: Date.now() + 5 * 60 * 1000,
};

describe('ReservationInfoCard', () => {
  describe('状态显示', () => {
    it('pending 状态显示"预约确认中"和倒计时', () => {
      render(<ReservationInfoCard data={baseReservation} now={Date.now()} />);
      expect(screen.getByText(/预约确认中/)).toBeInTheDocument();
      expect(screen.getByText(/等待商家接单/)).toBeInTheDocument();
    });

    it('accepted 状态显示"预约成功"', () => {
      const data = { ...baseReservation, acceptStatus: 'accepted' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} />);
      expect(screen.getByText(/预约成功/)).toBeInTheDocument();
      expect(screen.getAllByText(/商家已接单/).length).toBeGreaterThan(0);
    });

    it('failed 状态显示"预约失败"', () => {
      const data = { ...baseReservation, acceptStatus: 'failed' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} />);
      expect(screen.getByText(/预约失败/)).toBeInTheDocument();
      expect(screen.getByText(/可重新预约/)).toBeInTheDocument();
    });

    it('canceled 状态显示"预约已取消"', () => {
      const data = { ...baseReservation, acceptStatus: 'canceled' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} />);
      expect(screen.getAllByText(/预约已取消/).length).toBeGreaterThan(0);
    });
  });

  describe('按钮文案', () => {
    it('pending 状态显示"取消预约"按钮', () => {
      const onCancel = vi.fn();
      render(<ReservationInfoCard data={baseReservation} now={Date.now()} onCancel={onCancel} />);
      const btn = screen.getByRole('button', { name: /取消预约/ });
      expect(btn).toBeInTheDocument();
    });

    it('accepted 状态显示"取消预约"按钮', () => {
      const onCancel = vi.fn();
      const data = { ...baseReservation, acceptStatus: 'accepted' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} onCancel={onCancel} />);
      const btn = screen.getByRole('button', { name: /取消预约/ });
      expect(btn).toBeInTheDocument();
    });

    it('failed 状态显示"重新预约"按钮', () => {
      const onRebook = vi.fn();
      const data = { ...baseReservation, acceptStatus: 'failed' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} onRebook={onRebook} />);
      const btn = screen.getByRole('button', { name: /重新预约/ });
      expect(btn).toBeInTheDocument();
    });

    it('canceled 状态显示"重新预约"按钮', () => {
      const onRebook = vi.fn();
      const data = { ...baseReservation, acceptStatus: 'canceled' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} onRebook={onRebook} />);
      const btn = screen.getByRole('button', { name: /重新预约/ });
      expect(btn).toBeInTheDocument();
    });

    it('failed 状态不显示"取消预约"按钮', () => {
      const onCancel = vi.fn();
      const data = { ...baseReservation, acceptStatus: 'failed' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} onCancel={onCancel} />);
      expect(screen.queryByRole('button', { name: /取消预约/ })).not.toBeInTheDocument();
    });

    it('canceled 状态不显示"取消预约"按钮', () => {
      const onCancel = vi.fn();
      const data = { ...baseReservation, acceptStatus: 'canceled' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} onCancel={onCancel} />);
      expect(screen.queryByRole('button', { name: /取消预约/ })).not.toBeInTheDocument();
    });

    it('pending 状态不显示"重新预约"按钮', () => {
      const onRebook = vi.fn();
      render(<ReservationInfoCard data={baseReservation} now={Date.now()} onRebook={onRebook} />);
      expect(screen.queryByRole('button', { name: /重新预约/ })).not.toBeInTheDocument();
    });
  });

  describe('失败原因提示', () => {
    it('商家拒绝时显示"商家拒绝了预约"', () => {
      const data = { ...baseReservation, acceptStatus: 'failed' as const, failReason: 'rejected' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} />);
      expect(screen.getByText(/商家拒绝了预约/)).toBeInTheDocument();
    });

    it('超时未接单时显示"商家未接单"', () => {
      const data = { ...baseReservation, acceptStatus: 'failed' as const, failReason: 'timeout' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} />);
      expect(screen.getByText(/商家未接单/)).toBeInTheDocument();
    });
  });

  describe('倒计时', () => {
    it('pending 状态显示倒计时', () => {
      const deadline = Date.now() + 3 * 60 * 1000;
      const data = { ...baseReservation, acceptDeadlineAt: deadline };
      render(<ReservationInfoCard data={data} now={Date.now()} />);
      expect(screen.getByText(/03:00/)).toBeInTheDocument();
    });

    it('非 pending 状态不显示倒计时', () => {
      const data = { ...baseReservation, acceptStatus: 'accepted' as const };
      render(<ReservationInfoCard data={data} now={Date.now()} />);
      expect(document.querySelector('.reservation-countdown')).toBeNull();
    });
  });

  describe('门店信息', () => {
    it('正确显示门店名称', () => {
      render(<ReservationInfoCard data={baseReservation} now={Date.now()} />);
      expect(screen.getByText('测试桌游馆')).toBeInTheDocument();
    });

    it('正确显示营业时间', () => {
      render(<ReservationInfoCard data={baseReservation} now={Date.now()} />);
      expect(screen.getByText(/营业时间 09:00-22:30/)).toBeInTheDocument();
    });
  });

  describe('预约信息网格', () => {
    it('正确显示到店时间', () => {
      render(<ReservationInfoCard data={baseReservation} now={Date.now()} />);
      expect(screen.getByText('7.1 09:30')).toBeInTheDocument();
    });

    it('正确显示人数', () => {
      render(<ReservationInfoCard data={baseReservation} now={Date.now()} />);
      expect(screen.getByText('2 人')).toBeInTheDocument();
    });

    it('正确显示手机号', () => {
      render(<ReservationInfoCard data={baseReservation} now={Date.now()} />);
      expect(screen.getByText('158****8127')).toBeInTheDocument();
    });
  });
});
