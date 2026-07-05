import React from 'react';

export interface VoucherCodeSheetProps {
  open: boolean;
  onClose: () => void;
  storeName?: string;
  productName?: string;
  voucherCode?: string;
}

function VoucherQR({ value }: { value: string }) {
  const size = 156;
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
}

export function VoucherCodeSheet({
  open,
  onClose,
  storeName = '',
  productName = '',
  voucherCode = '882945612345',
}: VoucherCodeSheetProps) {
  if (!open) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(voucherCode.replace(/\s/g, ''));
    }
  };

  return (
    <div className="voucher-sheet-mask" onClick={onClose}>
      <div
        className="voucher-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="券码和券号"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="voucher-sheet-head">
          <div>
            <span>VOUCHER · 券码</span>
            <strong>{storeName || '门店名称'}</strong>
          </div>
          <button
            className="voucher-sheet-close"
            onClick={onClose}
            aria-label="关闭券码浮层"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="voucher-sheet-product">{productName}</div>
        <div className="voucher-sheet-qr">
          <VoucherQR value={voucherCode} />
        </div>
        <div className="voucher-sheet-code-label">券号</div>
        <div className="voucher-sheet-code" onClick={handleCopy} title="点击复制">
          {voucherCode}
        </div>
        <p>到店后向店员出示二维码或完整券号完成核销</p>
      </div>
    </div>
  );
}

export default VoucherCodeSheet;
