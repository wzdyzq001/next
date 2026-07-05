import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonType?: 'primary' | 'danger';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  confirmButtonType = 'primary',
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 0);
    } else if (lastFocusedElementRef.current) {
      lastFocusedElementRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="confirm-dialog-mask"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-content">
          <h3 id="confirm-dialog-title" className="confirm-dialog-title">
            {title}
          </h3>
          <p id="confirm-dialog-message" className="confirm-dialog-message">
            {message}
          </p>
        </div>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-dialog-btn cancel"
            onClick={onCancel}
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            className={`confirm-dialog-btn confirm ${confirmButtonType}`}
            onClick={onConfirm}
            aria-label={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
