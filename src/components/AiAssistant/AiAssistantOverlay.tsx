import React, { useRef, useEffect, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAiAssistantContext } from './AiAssistantProvider';
import { BRAND_NAME, BRAND_SLOGAN } from './constants';
import AIAssistantIcon from './AIAssistantIcon';
import OrderSelectorOverlay from './OrderSelectorOverlay';
import RedeemReminderSheet from './RedeemReminderSheet';
import ReservationPanel from './ReservationPanel';
import { AiOrderCardDemo } from './AiOrderCardDemo';
import { FullOrderCard } from './OrderCard';
import { FeatureCardRenderer } from './FeatureCard';
import type { OrderListItem } from '../../types';

const AiAssistantOverlay: React.FC = () => {
  const {
    overlayMode,
    closeAssistant,
    toggleFullscreen,
    messages,
    isLoading,
    sendMessage,
    currentOrderId,
    executeAction,
    reminderSheetOpen,
    reminderSheetOrderId,
    reminderSheetProductName,
    reminderSheetValidDate,
    reservationPanelOpen,
    reservationStoreName,
    reservationBusinessHours,
    closeReminderSheet,
    confirmReminder,
    closeReservationPanel,
    confirmReservation,
    submitFeatureCard,
    cancelFeatureCard,
  } = useAiAssistantContext();
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMoveTimeRef = useRef<number>(0);
  const lastMoveYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState(0);
  const dragHeightRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [orderSelectorOpen, setOrderSelectorOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<any>(null);

  const isOpen = overlayMode !== 'closed';
  const isFullscreen = overlayMode === 'fullscreen';

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    dragHeightRef.current = dragHeight;
  }, [dragHeight]);

  useEffect(() => {
    if (!isOpen) return;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setOrderSelectorOpen(false);
      setSelectedOrder(null);
    }
  }, [isOpen]);

  const handleOpenOrderSelector = useCallback(() => {
    if (!isFullscreen) {
      toggleFullscreen();
    }
    setTimeout(() => {
      setOrderSelectorOpen(true);
    }, 100);
  }, [isFullscreen, toggleFullscreen]);

  const handleCloseOrderSelector = useCallback(() => {
    setOrderSelectorOpen(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const viewportHeight = window.innerHeight;
    const minimizedHeight = viewportHeight * 0.9;
    const fullscreenHeight = viewportHeight;

    startYRef.current = e.clientY;
    startHeightRef.current = isFullscreen ? fullscreenHeight : minimizedHeight;
    currentYRef.current = startYRef.current;
    lastMoveYRef.current = startYRef.current;
    lastMoveTimeRef.current = Date.now();
    velocityRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragHeight(startHeightRef.current);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const mouseY = e.clientY;
      const deltaY = startYRef.current - mouseY;
      currentYRef.current = mouseY;

      const now = Date.now();
      const dt = now - lastMoveTimeRef.current;
      if (dt > 0) {
        velocityRef.current = (lastMoveYRef.current - mouseY) / dt;
      }
      lastMoveYRef.current = mouseY;
      lastMoveTimeRef.current = now;

      const viewportHeight = window.innerHeight;
      const minimizedHeight = viewportHeight * 0.9;
      const fullscreenHeight = viewportHeight;

      let newHeight = startHeightRef.current + deltaY;

      if (newHeight > fullscreenHeight) {
        newHeight = fullscreenHeight + (newHeight - fullscreenHeight) * 0.3;
      }
      if (newHeight < minimizedHeight * 0.9) {
        newHeight = minimizedHeight * 0.9 + (newHeight - minimizedHeight * 0.9) * 0.3;
      }

      setDragHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      const viewportHeight = window.innerHeight;
      const minimizedHeight = viewportHeight * 0.9;
      const fullscreenHeight = viewportHeight;
      const midpoint = (minimizedHeight + fullscreenHeight) / 2;

      const currentHeight = dragHeightRef.current;
      const velocity = velocityRef.current;

      let shouldGoFullscreen = false;

      if (Math.abs(velocity) > 0.5) {
        shouldGoFullscreen = velocity > 0;
      } else {
        shouldGoFullscreen = currentHeight > midpoint;
      }

      if (shouldGoFullscreen !== isFullscreen) {
        toggleFullscreen();
      }

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isFullscreen, toggleFullscreen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const viewportHeight = window.innerHeight;
    const minimizedHeight = viewportHeight * 0.9;
    const fullscreenHeight = viewportHeight;

    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = isFullscreen ? fullscreenHeight : minimizedHeight;
    currentYRef.current = startYRef.current;
    lastMoveYRef.current = startYRef.current;
    lastMoveTimeRef.current = Date.now();
    velocityRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragHeight(startHeightRef.current);
  }, [isFullscreen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const touchY = e.touches[0].clientY;
    const deltaY = startYRef.current - touchY;
    currentYRef.current = touchY;

    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    if (dt > 0) {
      velocityRef.current = (lastMoveYRef.current - touchY) / dt;
    }
    lastMoveYRef.current = touchY;
    lastMoveTimeRef.current = now;

    const viewportHeight = window.innerHeight;
    const minimizedHeight = viewportHeight * 0.9;
    const fullscreenHeight = viewportHeight;

    let newHeight = startHeightRef.current + deltaY;

    if (newHeight > fullscreenHeight) {
      newHeight = fullscreenHeight + (newHeight - fullscreenHeight) * 0.3;
    }
    if (newHeight < minimizedHeight * 0.9) {
      newHeight = minimizedHeight * 0.9 + (newHeight - minimizedHeight * 0.9) * 0.3;
    }

    setDragHeight(newHeight);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    const viewportHeight = window.innerHeight;
    const minimizedHeight = viewportHeight * 0.9;
    const fullscreenHeight = viewportHeight;
    const midpoint = (minimizedHeight + fullscreenHeight) / 2;

    const currentHeight = dragHeightRef.current;
    const velocity = velocityRef.current;

    let shouldGoFullscreen = false;

    if (Math.abs(velocity) > 0.5) {
      shouldGoFullscreen = velocity > 0;
    } else {
      shouldGoFullscreen = currentHeight > midpoint;
    }

    if (shouldGoFullscreen !== isFullscreen) {
      toggleFullscreen();
    }
  }, [isFullscreen, toggleFullscreen]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() && !selectedOrder) return;
    const content = selectedOrder
      ? `【订单】${selectedOrder.merchant} - ${selectedOrder.product}\n${inputValue.trim()}`
      : inputValue.trim();
    sendMessage(content);
    setInputValue('');
    setSelectedOrder(null);
  }, [inputValue, sendMessage, selectedOrder]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSelectOrder = useCallback((order: OrderListItem) => {
    setSelectedOrder(order);
  }, []);

  const handleRemoveOrder = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  const handleVoiceModeToggle = useCallback(() => {
    setVoiceMode(prev => !prev);
    setVoiceError(null);
    if (isListening) {
      stopListeningAndSend();
    }
  }, [isListening]);

  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const normalized = Math.min(average / 128, 1);
    setVolumeLevel(normalized);
    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  const startListening = useCallback(async () => {
    setVoiceError(null);
    setVolumeLevel(0);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    if (!SpeechRecognition && !hasGetUserMedia) {
      setVoiceError('当前浏览器不支持语音识别');
      setIsListening(true);
      setInputValue('语音识别功能演示');
      return;
    }

    try {
      if (hasGetUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          audioContextRef.current = audioContext;
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;
          source.connect(analyser);
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      }

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;

        let finalTranscript = '';

        recognition.onstart = () => {
          setIsListening(true);
          setInputValue('');
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          setInputValue(finalTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setVoiceError('麦克风权限被拒绝，请在浏览器设置中开启');
          } else if (event.error === 'no-speech') {
            setVoiceError('未检测到语音，请再次尝试');
          } else if (event.error === 'audio-capture') {
            setVoiceError('无法访问麦克风，请检查设备');
          } else if (event.error === 'network') {
            setVoiceError('网络错误，请检查网络连接');
          } else {
            setVoiceError(`语音识别错误: ${event.error}`);
          }
          setIsListening(false);
          cleanupAudio();
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (isListening) {
            stopListeningAndSend();
          }
        }, 30000);
      } else {
        setIsListening(true);
        setInputValue('');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setInputValue('语音识别功能演示文本');
          stopListeningAndSend();
        }, 2000);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('麦克风权限被拒绝，请在浏览器设置中开启');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setVoiceError('未找到麦克风设备');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setVoiceError('麦克风被其他应用占用');
      } else {
        setVoiceError(`启动录音失败: ${err.message || err.name}`);
      }
      setIsListening(false);
      cleanupAudio();
    }
  }, [updateVolume]);

  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolumeLevel(0);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopListeningAndSend = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    cleanupAudio();
    setTimeout(() => {
      if (inputValue.trim() || selectedOrder) {
        handleSend();
      }
    }, 100);
  }, [inputValue, selectedOrder, handleSend, cleanupAudio]);

  const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    startListening();
  }, [startListening]);

  const handlePressEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    stopListeningAndSend();
  }, [stopListeningAndSend]);

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [cleanupAudio]);

  if (!mounted) return null;

  const overlay = (
    <div
      className={`ai-overlay-mask ${isOpen ? 'open' : ''}`}
      onClick={closeAssistant}
      role="dialog"
      aria-modal="true"
      aria-label={BRAND_NAME}
    >
      <div
        ref={overlayRef}
        className={`ai-overlay-panel ${isFullscreen && !isDragging ? 'fullscreen' : 'minimized'} ${isDragging ? 'dragging' : ''}`}
        style={isDragging ? {
          height: `${dragHeight}px`,
        } : undefined}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="ai-overlay-grabber" />

        <div className="ai-overlay-header">
          <div className="ai-overlay-avatar">
            <div className="ai-avatar-pulse-ring" />
            <div className="ai-avatar-rotate-ring" />
            <div className="ai-avatar-glow" />
            <AIAssistantIcon size={36} />
          </div>
          <div className="ai-overlay-title-group">
            <div className="ai-overlay-title-row">
              <div className="ai-overlay-title">{BRAND_NAME}</div>
              <span className="ai-overlay-title-badge">AI</span>
            </div>
            <div className="ai-overlay-subtitle">{BRAND_SLOGAN}</div>
          </div>
          <div className="ai-overlay-actions">
            <button
              className="ai-overlay-action-btn demo-toggle-btn"
              onClick={() => setDemoMode(!demoMode)}
              aria-label={demoMode ? '退出Demo' : '进入Demo'}
              title={demoMode ? '退出Demo' : '订单卡片Demo'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              className="ai-overlay-action-btn close-btn"
              onClick={closeAssistant}
              aria-label="关闭"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="ai-overlay-body">
          {demoMode ? (
            <AiOrderCardDemo />
          ) : (
            <div className="ai-message-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ai-message ${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="ai-message-avatar">
                      <AIAssistantIcon size={24} />
                    </div>
                  )}
                  <div className="ai-message-bubble">
                    {msg.content && <div className="ai-message-text">{msg.content}</div>}
                    {msg.orderCard && (
                      <div className="ai-message-order-card">
                        <FullOrderCard
                          order={msg.orderCard}
                          onActionClick={(label) => {
                            executeAction({ label, kind: 'custom' as any });
                          }}
                          onSuggestionClick={(suggestion) => {
                            sendMessage(suggestion);
                          }}
                        />
                      </div>
                    )}
                    {msg.featureCard && (
                      <div className="ai-message-feature-card">
                        <FeatureCardRenderer
                          data={msg.featureCard}
                          onConfirm={(data) => submitFeatureCard(msg.featureCard!.type, data || {})}
                          onCancel={() => cancelFeatureCard()}
                        />
                      </div>
                    )}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="ai-message-actions">
                        {msg.actions.map((action, idx) => (
                          <button
                            key={idx}
                            className="ai-action-btn"
                            onClick={() => executeAction(action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="ai-message-avatar user">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="ai-message assistant">
                  <div className="ai-message-avatar">
                    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <circle cx="32" cy="32" r="30" fill="#0D4A75" />
                      <ellipse cx="25" cy="30" rx="3" ry="6" fill="#4DD0E1" />
                      <ellipse cx="41" cy="33" rx="3" ry="6" fill="#4DD0E1" />
                    </svg>
                  </div>
                  <div className="ai-message-bubble">
                    <div className="ai-typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="ai-overlay-footer">
          {selectedOrder && (
            <div className="ai-selected-order">
              <div className="ai-selected-order-info">
                <div className="ai-selected-order-merchant">{selectedOrder.merchant}</div>
                <div className="ai-selected-order-product">{selectedOrder.product}</div>
              </div>
              <button className="ai-selected-order-remove" onClick={handleRemoveOrder} aria-label="移除订单">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="ai-input-area">
            <button
              className="ai-voice-btn"
              onClick={handleVoiceModeToggle}
              aria-label={voiceMode ? '键盘输入' : '语音输入'}
            >
              {voiceMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h.01M18 14h.01" />
                  <path d="M9 18h6" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>

            {voiceMode ? (
              <div className="ai-voice-input-area">
                {isListening && (
                  <div className="ai-volume-indicator">
                    {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="ai-volume-bar"
                      style={{
                        height: `${Math.max(4, volumeLevel * (20 + Math.random() * 8))}px`,
                        opacity: 0.3 + volumeLevel * 0.7,
                      }}
                    />
                  ))}
                  </div>
                )}
                <button
                  className={`ai-hold-to-talk ${isListening ? 'listening' : ''}`}
                  onMouseDown={handlePressStart}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={(e) => { if (isListening) handlePressEnd(e); }}
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
                >
                  {isListening ? '松开 发送' : '按住 说话'}
                </button>
                {voiceError && (
                  <div className="ai-voice-error">{voiceError}</div>
                )}
              </div>
            ) : (
              <input
                className="ai-input"
                type="text"
                placeholder="想知道什么？问问我吧"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            )}

            <button
              className="ai-add-order-btn"
              onClick={handleOpenOrderSelector}
              aria-label="选择订单"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {ReactDOM.createPortal(overlay, document.body)}
      <OrderSelectorOverlay
        isOpen={orderSelectorOpen}
        onClose={handleCloseOrderSelector}
        onSelectOrder={handleSelectOrder}
      />
      <RedeemReminderSheet
        orderId={reminderSheetOrderId}
        productName={reminderSheetProductName}
        validDate={reminderSheetValidDate}
        open={reminderSheetOpen}
        onClose={closeReminderSheet}
        onConfirm={confirmReminder}
      />
      <ReservationPanel
        open={reservationPanelOpen}
        onClose={closeReservationPanel}
        onConfirm={confirmReservation}
        storeName={reservationStoreName}
        businessHours={reservationBusinessHours}
      />
    </>
  );
};

export default AiAssistantOverlay;
