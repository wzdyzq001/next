import React, { useState } from 'react';
import type { FeatureCardProps } from './types';

const VoucherQR = ({ value }: { value: string }) => {
  const size = 120;
  const modules = 21;
  const cellSize = size / modules;
  const cells: boolean[][] = [];

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) & 0xffffffff;
  }

  for (let r = 0; r < modules; r++) {
    cells[r] = [];
    for (let c = 0; c < modules; c++) {
      cells[r][c] = false;
    }
  }

  const fillCorner = (sr: number, sc: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isOuter || isInner) {
          cells[sr + r][sc + c] = true;
        }
      }
    }
  };

  fillCorner(0, 0);
  fillCorner(0, modules - 7);
  fillCorner(modules - 7, 0);

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (cells[r][c]) continue;
      if (r < 7 && c < 7) continue;
      if (r < 7 && c >= modules - 7) continue;
      if (r >= modules - 7 && c < 7) continue;
      const h = Math.abs(((r * 131 + c * 197 + hash) % 100));
      cells[r][c] = h > 48;
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="#fff" />
      {cells.map((row, r) =>
        row.map((v, c) =>
          v ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1a1410"
            />
          ) : null
        )
      )}
    </svg>
  );
};

export const VoucherCodeCard: React.FC<FeatureCardProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const voucherData = data.voucher;

  if (!voucherData) return null;

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="feature-card voucher-code-card">
      <div className="feature-card-header">
        <div className="feature-card-icon voucher">🎫</div>
        <div className="feature-card-title-group">
          <div className="feature-card-title">券码展示</div>
          <div className="feature-card-subtitle">到店出示核销</div>
        </div>
      </div>

      <div className="voucher-qr-wrapper">
        <div className="voucher-qr">
          <VoucherQR value={voucherData.code} />
        </div>
      </div>

      <div className="voucher-code-section">
        <div className="voucher-code-label">券码</div>
        <div
          className="voucher-code-value"
          onClick={() => handleCopy(voucherData.code)}
        >
          {voucherData.code}
          <span className="voucher-copy-btn">{copied ? '已复制' : '复制'}</span>
        </div>
      </div>

      <div className="voucher-info-row">
        <div className="voucher-info-item">
          <div className="voucher-info-label">券码编号</div>
          <div className="voucher-info-value">{voucherData.number}</div>
        </div>
        <div className="voucher-info-item">
          <div className="voucher-info-label">有效期</div>
          <div className="voucher-info-value">{voucherData.validDate}</div>
        </div>
      </div>

      <div className="voucher-notes">
        <div className="voucher-notes-title">使用说明</div>
        <ul className="voucher-notes-list">
          {voucherData.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default VoucherCodeCard;
