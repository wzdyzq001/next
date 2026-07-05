import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AiAssistantProvider, useAiAssistantContext, AiAssistantOverlay } from './components/AiAssistant';
import OrderCenter from './OrderCenter';
import type { OrderListItem } from './types';
import { ORDER_LIST } from './mock';
import type { ReservationInfoCardData } from './OrderCenter';
import type { GuideMessageConfig } from './components/AiAssistant/types';
import './styles.css';
import './components/AiAssistant/aiAssistant.css';

type ReachScenario = 'guide_weekend' | 'guide_holiday' | 'guide_peak' | 'progress_pending' | 'progress_accepted' | 'progress_failed';
type BubbleType = 'long' | 'short';
type ScreenWidth = 320 | 375 | 428;
type ViewType = 'list' | 'detail';

interface PhoneContentInnerProps {
  view: ViewType;
  scenario: ReachScenario;
  showReachBar: boolean;
  showBubble: boolean;
  isScrolling: boolean;
  detailOrder: OrderListItem | null;
  reachBarConfig: { type: 'guide' | 'info'; text: string; icon: string } | null;
  bubbleRenderer: React.ReactNode;
  mockReservations: Record<string, ReservationInfoCardData>;
  now: number;
  reachBarRenderer: (order: OrderListItem) => React.ReactNode;
  onLog: (msg: string) => void;
  autoOpenAssistant: { orderId: string; guideMessage: { text: string } } | null;
  onAutoOpenConsumed: () => void;
  onOrderClick?: (order: OrderListItem) => void;
}

const PhoneContentInner: React.FC<PhoneContentInnerProps> = ({
  view,
  scenario,
  showReachBar,
  isScrolling,
  detailOrder,
  bubbleRenderer,
  mockReservations,
  now,
  reachBarRenderer,
  onLog,
  autoOpenAssistant,
  onAutoOpenConsumed,
  onOrderClick,
}) => {
  const { openAssistant } = useAiAssistantContext();

  const handleChatWithOrder = useCallback((payload: string | OrderListItem) => {
    const orderId = typeof payload === 'string' ? payload : payload.orderId;
    const isGuide = scenario.startsWith('guide_');
    let guideText = '';
    if (scenario === 'guide_weekend') {
      guideText = '周末客流大，提前预约免排队～是否需要帮你预约？';
    } else if (scenario === 'guide_holiday') {
      guideText = '国庆节客流大，提前预约免排队～是否需要帮你预约？';
    } else if (scenario === 'guide_peak') {
      guideText = '用餐高峰期，提前预约免排队～是否需要帮你预约？';
    }

    if (isGuide && orderId) {
      const guideMessage: GuideMessageConfig = {
        text: guideText,
        actions: [
          {
            label: '立刻预约',
            kind: 'open_reservation',
            orderId: orderId,
            variant: 'guide_primary',
          } as any,
        ],
      };
      openAssistant(orderId, view === 'detail' ? 'order_detail' : 'bubble', guideMessage);
      onLog(`🤖 拉起 AI 助手 + 带入引导消息 (orderId: ${orderId})`);
    } else {
      openAssistant(orderId, view === 'detail' ? 'order_detail' : 'order_list');
      onLog(`🤖 拉起 AI 助手 (orderId: ${orderId || '无'})`);
    }
  }, [openAssistant, scenario, view, onLog]);

  useEffect(() => {
    if (!autoOpenAssistant) return;
    const { orderId, guideMessage } = autoOpenAssistant;
    const guideConfig: GuideMessageConfig = {
      text: guideMessage.text,
      actions: [
        {
          label: '立刻预约',
          kind: 'open_reservation',
          orderId: orderId,
          variant: 'guide_primary',
        } as any,
      ],
    };
    const timer = setTimeout(() => {
      openAssistant(orderId, 'order_detail', guideConfig);
      onLog(`📌 自动拉起 AI 助手 + 带入引导消息 (orderId: ${orderId})`);
      onAutoOpenConsumed();
    }, 300);
    return () => clearTimeout(timer);
  }, [autoOpenAssistant, openAssistant, onLog, onAutoOpenConsumed]);

  return (
    <>
      <OrderCenter
        key={`order-center-${view}-${scenario}`}
        onChatWithOrder={handleChatWithOrder}
        reservationsByOrder={mockReservations}
        reservationNow={now}
        initialDetailOrder={detailOrder}
        onInitialDetailConsumed={() => {}}
        reachBarRenderer={view === 'list' && showReachBar ? reachBarRenderer : undefined}
        onOrderClick={onOrderClick}
      />
      {view === 'detail' && bubbleRenderer && (
        <div className={`bubble-overlay-container${isScrolling ? ' bubble-hidden' : ''}`}>
          {bubbleRenderer}
        </div>
      )}
    </>
  );
};

interface ReachDemoProps {}

const ReachDemo: React.FC<ReachDemoProps> = () => {
  const [scenario, setScenario] = useState<ReachScenario>('guide_weekend');
  const [bubbleType, setBubbleType] = useState<BubbleType>('long');
  const [screenWidth, setScreenWidth] = useState<ScreenWidth>(375);
  const [showReachBar, setShowReachBar] = useState(true);
  const [showBubble, setShowBubble] = useState(true);
  const [bubbleAutoCollapse, setBubbleAutoCollapse] = useState(true);
  const [collapseCountdown, setCollapseCountdown] = useState(5);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [clickLog, setClickLog] = useState<string[]>([]);
  const [view, setView] = useState<ViewType>('list');
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [autoOpenAssistant, setAutoOpenAssistant] = useState<{ orderId: string; guideMessage: { text: string } } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expandBubble = useCallback(() => {
    setIsCollapsed(false);
    setCollapseCountdown(5);
  }, []);

  useEffect(() => {
    setIsCollapsed(true);
    setCollapseCountdown(5);
  }, [scenario, bubbleType, bubbleAutoCollapse, view]);

  useEffect(() => {
    if (!bubbleAutoCollapse || isCollapsed || bubbleType !== 'long') return;
    if (view !== 'detail') return;
    if (scenario.startsWith('progress_')) return;

    const timer = setInterval(() => {
      setCollapseCountdown(prev => {
        if (prev <= 1) {
          setIsCollapsed(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [bubbleAutoCollapse, isCollapsed, bubbleType, view, scenario]);

  useEffect(() => {
    if (view !== 'detail') return;
    const phoneContent = document.querySelector('.phone-content');
    if (!phoneContent) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        setIsScrolling(false);
      }, 200);
    };

    phoneContent.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      phoneContent.removeEventListener('scroll', handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [view]);

  const formatCountdown = (deadline: number) => {
    const diff = Math.max(0, deadline - now);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getReachBarText = () => {
    if (!showReachBar) return null;
    switch (scenario) {
      case 'guide_weekend':
        return { type: 'guide' as const, text: '周末客流大，提前预约免排队～', icon: '✦' };
      case 'guide_holiday':
        return { type: 'guide' as const, text: '国庆节客流大，提前预约免排队～', icon: '✦' };
      case 'guide_peak':
        return { type: 'guide' as const, text: '高峰期客流大，提前预约免排队～', icon: '✦' };
      case 'progress_pending':
        return { type: 'info' as const, text: `待商家接单 ${formatCountdown(now + 4 * 60 * 1000 + 32 * 1000)}`, icon: '✦' };
      case 'progress_accepted':
        return { type: 'info' as const, text: '预约成功，7月10日 18:30 3人', icon: '✦' };
      case 'progress_failed':
        return { type: 'info' as const, text: '预约失败，可重新预约', icon: '✦' };
      default:
        return null;
    }
  };

  const getBubbleConfig = () => {
    if (!showBubble) return null;
    if (scenario.startsWith('progress_')) return null;
    const isShort = bubbleType === 'short' || (bubbleAutoCollapse && isCollapsed);
    switch (scenario) {
      case 'guide_weekend':
        return {
          type: isShort ? 'short' as const : 'long' as const,
          text: isShort ? '预约免排队' : '周末客流大，提前预约免排队～',
          icon: '✦',
        };
      case 'guide_holiday':
        return {
          type: isShort ? 'short' as const : 'long' as const,
          text: isShort ? '预约免排队' : '国庆节客流大，提前预约免排队～',
          icon: '✦',
        };
      case 'guide_peak':
        return {
          type: isShort ? 'short' as const : 'long' as const,
          text: isShort ? '预约免排队' : '高峰期客流大，提前预约免排队～',
          icon: '✦',
        };
      default:
        return null;
    }
  };

  const reachBarConfig = getReachBarText();
  const bubbleConfig = getBubbleConfig();

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setClickLog(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20));
  };

  const scenarios: { key: ReachScenario; label: string; group: string }[] = [
    { key: 'guide_weekend', label: '引导预约·周末', group: '引导预约' },
    { key: 'guide_holiday', label: '引导预约·节假日', group: '引导预约' },
    { key: 'guide_peak', label: '引导预约·高峰期', group: '引导预约' },
    { key: 'progress_pending', label: '预约进度·确认中', group: '预约进度' },
    { key: 'progress_accepted', label: '预约进度·成功', group: '预约进度' },
    { key: 'progress_failed', label: '预约进度·失败', group: '预约进度' },
  ];

  const mockReservations = useMemo(() => {
    const result: Record<string, ReservationInfoCardData> = {};
    const baseOrder = {
      orderId: 'MT2026061800101',
      reservationNo: 'YY20260618001',
      serviceType: '堂食预约',
      storeName: '海底捞火锅(陆家嘴店)',
      storeAddress: '浦东新区陆家嘴环路1000号',
      businessHours: '10:00-22:00',
      arrivalTime: '2026-07-10 18:30',
      pax: 3,
      phone: '138****8888',
      estimatedAcceptTime: '5分钟内',
    };

    if (scenario === 'progress_pending') {
      result['MT2026061800101'] = {
        ...baseOrder,
        acceptStatus: 'pending',
        acceptDeadlineAt: now + 4 * 60 * 1000 + 32 * 1000,
      };
    } else if (scenario === 'progress_accepted') {
      result['MT2026061800101'] = {
        ...baseOrder,
        acceptStatus: 'accepted',
        acceptDeadlineAt: now + 4 * 60 * 1000 + 32 * 1000,
        merchantAcceptAt: now - 60 * 1000,
      };
    } else if (scenario === 'progress_failed') {
      result['MT2026061800101'] = {
        ...baseOrder,
        acceptStatus: 'failed',
      };
    }
    return result;
  }, [scenario, now]);

  const targetOrder = ORDER_LIST.find(o => o.orderId === 'MT2026061800101') || ORDER_LIST[0];

  const reachBarRenderer = useCallback((order: OrderListItem) => {
    if (!reachBarConfig) return null;
    if (order.orderId !== targetOrder.orderId) return null;
    return (
      <div
        className={`reach-demo-bar reach-demo-bar-${reachBarConfig.type}`}
        onClick={(e) => {
          e.stopPropagation();
          if (reachBarConfig.type === 'guide') {
            const guideText = scenario === 'guide_weekend'
              ? '周末客流大，提前预约免排队～是否需要帮你预约？'
              : scenario === 'guide_holiday'
                ? '国庆节客流大，提前预约免排队～是否需要帮你预约？'
                : '用餐高峰期，提前预约免排队～是否需要帮你预约？';
            addLog('📌 点击触达条 → 跳转订单详情页 + 自动拉起 AI 助手');
            setSelectedOrder(order);
            setView('detail');
            setAutoOpenAssistant({ orderId: order.orderId, guideMessage: { text: guideText } });
          }
        }}
      >
        <span className="reach-demo-icon">{reachBarConfig.icon}</span>
        <span className="reach-demo-text">{reachBarConfig.text}</span>
        {reachBarConfig.type === 'guide' && <span className="reach-demo-arrow">{'>'}</span>}
        {reachBarConfig.type === 'info' && <span className="reach-demo-space" />}
      </div>
    );
  }, [reachBarConfig, targetOrder.orderId, addLog, scenario, setAutoOpenAssistant]);

  const bubbleRenderer = useMemo(() => {
    if (!bubbleConfig || view !== 'detail') return null;
    const bubbleLeft = 14;
    const arrowTargetX = 38;
    const arrowOffset = arrowTargetX - bubbleLeft;
    
    let maxWidth: number;
    let textMaxWidth: number;
    if (bubbleConfig.type === 'long') {
      if (screenWidth <= 320) {
        maxWidth = screenWidth - bubbleLeft - 24;
        textMaxWidth = maxWidth - 14 * 2 - 8 - 10;
      } else {
        maxWidth = 288;
        textMaxWidth = 240;
      }
    } else {
      if (screenWidth <= 320) {
        maxWidth = 120;
        textMaxWidth = 80;
      } else {
        maxWidth = 144;
        textMaxWidth = 80;
      }
    }
    
    const style = {
      ['--bubble-left' as any]: `${bubbleLeft}px`,
      ['--arrow-offset' as any]: `${arrowOffset}px`,
      ['--bubble-max-width' as any]: `${maxWidth}px`,
      ['--bubble-text-max-width' as any]: `${textMaxWidth}px`,
    } as React.CSSProperties;
    
    return (
      <div
        className={`reach-demo-bubble reach-demo-bubble-${bubbleConfig.type}`}
        style={style}
      >
        <span className="reach-demo-bubble-icon">{bubbleConfig.icon}</span>
        <span className="reach-demo-bubble-text">{bubbleConfig.text}</span>
      </div>
    );
  }, [bubbleConfig, view, screenWidth]);

  const detailOrder = view === 'detail' ? targetOrder : null;

  return (
    <div className="reach-demo-page">
      <header className="reach-demo-header">
        <h1>
          <span className="demo-logo">🎯</span>
          AI 助手触达功能 - 交互 Demo
        </h1>
        <p className="demo-subtitle">订单卡片触达条 · 详情页气泡 · 预约进度 · 优先级机制</p>
      </header>

      <div className="reach-demo-body">
        <aside className="reach-demo-sidebar">
          <div className="sidebar-section">
            <h3>📱 演示场景</h3>

            <div className="tab-group">
              <button
                className={`tab-btn ${view === 'list' ? 'active' : ''}`}
                onClick={() => { setView('list'); addLog('切换到：订单中心场景'); }}
              >
                订单中心
              </button>
              <button
                className={`tab-btn ${view === 'detail' ? 'active' : ''}`}
                onClick={() => { setView('detail'); addLog('切换到：订单详情页场景'); }}
              >
                订单详情页
              </button>
            </div>

            <div className="section-label">引导预约场景</div>
            <div className="btn-group">
              {scenarios.filter(s => s.group === '引导预约').map(s => (
                <button
                  key={s.key}
                  className={`scenario-btn ${scenario === s.key ? 'active' : ''}`}
                  onClick={() => { setScenario(s.key); addLog(`切换场景：${s.label}`); }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="section-label">预约进度场景</div>
            <div className="btn-group">
              {scenarios.filter(s => s.group === '预约进度').map(s => (
                <button
                  key={s.key}
                  className={`scenario-btn ${scenario === s.key ? 'active' : ''}`}
                  onClick={() => { setScenario(s.key); addLog(`切换场景：${s.label}`); }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="priority-hint">
              <span className="hint-icon">💡</span>
              预约进度优先级 {'>'} 引导预约
            </div>
          </div>

          <div className="sidebar-section">
            <h3>🎛️ 显示控制</h3>

            <div className="control-row">
              <label>
                <input
                  type="checkbox"
                  checked={showReachBar}
                  onChange={e => { setShowReachBar(e.target.checked); addLog(`订单卡片触达条：${e.target.checked ? '显示' : '隐藏'}`); }}
                />
                显示订单卡片触达条
              </label>
            </div>

            {view === 'detail' && (
              <>
                <div className="control-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={showBubble}
                      onChange={e => { setShowBubble(e.target.checked); addLog(`AI助手气泡：${e.target.checked ? '显示' : '隐藏'}`); }}
                    />
                    显示 AI 助手气泡
                  </label>
                </div>

                <div className="control-row">
                  <span className="control-label">气泡类型</span>
                  <div className="segmented-control">
                    <button
                      className={`seg-btn ${bubbleType === 'long' ? 'active' : ''}`}
                      onClick={() => { setBubbleType('long'); addLog('气泡类型：长气泡'); }}
                    >
                      长气泡
                    </button>
                    <button
                      className={`seg-btn ${bubbleType === 'short' ? 'active' : ''}`}
                      onClick={() => { setBubbleType('short'); addLog('气泡类型：短气泡'); }}
                    >
                      短气泡
                    </button>
                  </div>
                </div>

                {bubbleType === 'long' && scenario.startsWith('guide_') && (
                  <div className="control-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={bubbleAutoCollapse}
                        onChange={e => { setBubbleAutoCollapse(e.target.checked); addLog(`自动收起：${e.target.checked ? '开启' : '关闭'}`); }}
                      />
                      3秒自动收起
                      {bubbleAutoCollapse && bubbleType === 'long' && !isCollapsed && scenario.startsWith('guide_') && view === 'detail' && (
                        <span className="countdown-tag">{collapseCountdown}s</span>
                      )}
                    </label>
                    {isCollapsed && bubbleAutoCollapse && (
                      <button className="reset-btn" onClick={expandBubble}>
                        重新展开
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="control-row">
              <span className="control-label">屏幕宽度</span>
              <div className="segmented-control">
                {([320, 375, 428] as ScreenWidth[]).map(w => (
                  <button
                    key={w}
                    className={`seg-btn ${screenWidth === w ? 'active' : ''}`}
                    onClick={() => { setScreenWidth(w); addLog(`屏幕宽度：${w}px`); }}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>

            {view === 'detail' && (
              <div className="control-row">
                <button className="back-btn" onClick={() => { setView('list'); addLog('← 返回订单列表'); }}>
                  ← 返回订单列表
                </button>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3>📋 交互日志</h3>
            <div className="log-panel">
              {clickLog.length === 0 ? (
                <div className="log-empty">点击上方按钮开始交互</div>
              ) : (
                clickLog.map((log, i) => (
                  <div key={i} className="log-item">{log}</div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="reach-demo-main">
          <div className="phone-frame" style={{ width: `${screenWidth}px` }}>
            <div className="phone-content">
              <AiAssistantProvider initialReservations={mockReservations}>
                <PhoneContentInner
                  view={view}
                  scenario={scenario}
                  showReachBar={showReachBar}
                  showBubble={showBubble}
                  isScrolling={isScrolling}
                  detailOrder={detailOrder}
                  reachBarConfig={reachBarConfig}
                  bubbleRenderer={bubbleRenderer}
                  mockReservations={mockReservations}
                  now={now}
                  reachBarRenderer={reachBarRenderer}
                  onLog={addLog}
                  autoOpenAssistant={autoOpenAssistant}
                  onAutoOpenConsumed={() => setAutoOpenAssistant(null)}
                  onOrderClick={(order) => {
                    addLog('📋 点击订单卡片 → 跳转订单详情页 + 显示气泡');
                    setSelectedOrder(order);
                    setView('detail');
                  }}
                />
                <AiAssistantOverlay />
              </AiAssistantProvider>
            </div>
          </div>

          <div className="demo-desc">
            <h3>📝 当前场景说明</h3>
            <div className="desc-content">
              {scenario === 'guide_weekend' && (
                <>
                  <p><strong>场景：</strong>引导预约 - 周末</p>
                  <p><strong>触发条件：</strong>待使用订单 + 无进行中预约 + 周四至周日17:00前</p>
                  <p><strong>触达条：</strong>引导点击型，icon + 周末文案 + 箭头</p>
                  <p><strong>气泡：</strong>长气泡初始展示，3秒后自动收起为短气泡</p>
                  <p><strong>交互：</strong>点击后拉起AI助手，带入预约引导话术 + 立即预约按钮</p>
                </>
              )}
              {scenario === 'guide_holiday' && (
                <>
                  <p><strong>场景：</strong>引导预约 - 节假日</p>
                  <p><strong>触发条件：</strong>待使用订单 + 无进行中预约 + 节假日前7天至最后一天17:00前</p>
                  <p><strong>触达条：</strong>引导点击型，icon + 节假日文案 + 箭头</p>
                  <p><strong>气泡：</strong>长气泡初始展示，3秒后自动收起为短气泡</p>
                  <p><strong>交互：</strong>点击后拉起AI助手，带入预约引导话术 + 立即预约按钮</p>
                </>
              )}
              {scenario === 'guide_peak' && (
                <>
                  <p><strong>场景：</strong>引导预约 - 高峰期</p>
                  <p><strong>触发条件：</strong>待使用订单 + 无进行中预约 + 非周末非节假日时段</p>
                  <p><strong>触达条：</strong>引导点击型，icon + 高峰期文案 + 箭头</p>
                  <p><strong>气泡：</strong>长气泡初始展示，3秒后自动收起为短气泡</p>
                  <p><strong>交互：</strong>点击后拉起AI助手，带入预约引导话术 + 立即预约按钮</p>
                </>
              )}
              {scenario === 'progress_pending' && (
                <>
                  <p><strong>场景：</strong>预约进度 - 确认中</p>
                  <p><strong>触发条件：</strong>待使用订单 + 有 pending 状态预约单 + 未超时</p>
                  <p><strong>触达条：</strong>信息展示型，icon + 待商家接单 + 实时倒计时</p>
                  <p><strong>气泡：</strong>不展示（仅订单卡片展示进度）</p>
                  <p><strong>交互：</strong>不可点击，无 hover 效果，纯信息展示</p>
                  <p><strong>优先级：</strong>高于引导预约，有进行中预约时优先展示</p>
                </>
              )}
              {scenario === 'progress_accepted' && (
                <>
                  <p><strong>场景：</strong>预约进度 - 成功</p>
                  <p><strong>触发条件：</strong>待使用订单 + 有 accepted 状态预约单 + 未到预约时间</p>
                  <p><strong>触达条：</strong>信息展示型，icon + 预约成功 + 日期时间人数</p>
                  <p><strong>气泡：</strong>不展示（仅订单卡片展示进度）</p>
                  <p><strong>交互：</strong>不可点击，无 hover 效果，纯信息展示</p>
                  <p><strong>优先级：</strong>高于引导预约，有进行中预约时优先展示</p>
                </>
              )}
              {scenario === 'progress_failed' && (
                <>
                  <p><strong>场景：</strong>预约进度 - 失败</p>
                  <p><strong>触发条件：</strong>待使用订单 + 有 failed 状态预约单</p>
                  <p><strong>触达条：</strong>信息展示型，icon + 预约失败，可重新预约</p>
                  <p><strong>气泡：</strong>不展示（仅订单卡片展示进度）</p>
                  <p><strong>交互：</strong>不可点击，无 hover 效果，纯信息展示</p>
                  <p><strong>优先级：</strong>高于引导预约，有进行中预约时优先展示</p>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .reach-demo-page {
          min-height: 100vh;
          background: #f7f7f8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .reach-demo-header {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 28px 24px;
        }
        .reach-demo-header h1 {
          margin: 0 0 8px 0;
          font-size: 22px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .demo-logo {
          font-size: 28px;
        }
        .demo-subtitle {
          margin: 0;
          font-size: 13px;
          opacity: 0.9;
        }
        .reach-demo-body {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
        }
        .reach-demo-sidebar {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .sidebar-section {
          background: white;
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .sidebar-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }
        .tab-group {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }
        .tab-btn {
          flex: 1;
          padding: 8px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.15s;
        }
        .tab-btn.active {
          background: #fdf2f8;
          border-color: #ec4899;
          color: #be185d;
          font-weight: 500;
        }
        .section-label {
          font-size: 11px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 4px 0 8px;
        }
        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .scenario-btn {
          padding: 8px 10px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          text-align: left;
          color: #374151;
          transition: all 0.15s;
        }
        .scenario-btn:hover {
          background: #f9fafb;
        }
        .scenario-btn.active {
          background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
          border-color: #f472b6;
          color: #9d174d;
          font-weight: 500;
        }
        .priority-hint {
          font-size: 12px;
          color: #92400e;
          background: #fef3c7;
          padding: 8px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .hint-icon {
          font-size: 14px;
        }
        .control-row {
          margin-bottom: 10px;
        }
        .control-row label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #374151;
          cursor: pointer;
          flex-wrap: wrap;
        }
        .control-row input[type="checkbox"] {
          cursor: pointer;
        }
        .control-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 6px;
          display: block;
        }
        .segmented-control {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          padding: 3px;
          border-radius: 8px;
        }
        .seg-btn {
          flex: 1;
          padding: 6px 8px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.15s;
        }
        .seg-btn.active {
          background: white;
          color: #1f2937;
          font-weight: 500;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        }
        .countdown-tag {
          background: #ec4899;
          color: white;
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: 500;
        }
        .reset-btn {
          margin-top: 4px;
          padding: 4px 10px;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          color: #6b7280;
        }
        .reset-btn:hover {
          background: #e5e7eb;
        }
        .back-btn {
          width: 100%;
          padding: 8px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          color: #374151;
          font-weight: 500;
        }
        .back-btn:hover {
          background: #e5e7eb;
        }
        .log-panel {
          max-height: 160px;
          overflow-y: auto;
          background: #fafbfc;
          border-radius: 8px;
          padding: 8px;
          font-size: 11px;
          line-height: 1.6;
        }
        .log-empty {
          color: #9ca3af;
          text-align: center;
          padding: 16px;
        }
        .log-item {
          color: #4b5563;
          padding: 2px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .log-item:last-child {
          border-bottom: none;
        }
        .reach-demo-main {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .phone-frame {
          background: #fff;
          border-radius: 32px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          overflow: hidden;
          flex-shrink: 0;
          margin: 0 auto;
          border: 8px solid #1f2937;
          position: relative;
          height: 680px;
        }
        .phone-content {
          height: 100%;
          overflow-y: auto;
          background: #f7f7f8;
          position: relative;
        }
        .bubble-overlay-container {
          position: absolute;
          bottom: 56px;
          left: 14px;
          z-index: 100;
          pointer-events: none;
          transition: opacity 0.2s ease-out, transform 0.2s ease-out;
        }
        .bubble-overlay-container.bubble-hidden {
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
        }
        .demo-desc {
          flex: 1;
          min-width: 0;
        }
        .demo-desc h3 {
          margin: 0 0 12px 0;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
        }
        .desc-content {
          background: white;
          border-radius: 12px;
          padding: 16px;
          font-size: 13px;
          line-height: 1.8;
          color: #374151;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .desc-content p {
          margin: 0 0 6px 0;
        }
        .desc-content strong {
          color: #1f2937;
          display: inline-block;
          min-width: 72px;
        }

        /* 订单卡片触达条样式 - 插入到真实订单卡片中 */
        .reach-demo-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          margin: 0;
          border-radius: 6px;
          position: relative;
          top: -4px;
          margin-bottom: 4px;
          box-sizing: border-box;
          width: 100%;
        }
        .reach-demo-bar-guide {
          background: #fff8f8;
          border: 0.5px solid #ffb3b3;
          cursor: pointer;
        }
        .reach-demo-bar-guide:hover {
          background: #ffecec;
        }
        .reach-demo-bar-info {
          background: #f7f8fa;
          border: 0.5px solid #e5e6eb;
          cursor: default;
        }
        .reach-demo-icon {
          font-size: 12px;
          color: #ff7875;
          flex-shrink: 0;
          font-weight: bold;
        }
        .reach-demo-bar-info .reach-demo-icon {
          color: #86909c;
        }
        .reach-demo-text {
          flex: 1;
          font-size: 11px;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 400;
          line-height: 1.4;
        }
        .reach-demo-bar-info .reach-demo-text {
          color: #4e5969;
        }
        .reach-demo-arrow {
          color: #ff7875;
          font-size: 11px;
          flex-shrink: 0;
          font-weight: 500;
        }
        .reach-demo-space {
          width: 11px;
          flex-shrink: 0;
        }

        /* 气泡样式 - 叠加在 AI 助手按钮上方 */
        .reach-demo-bubble {
          position: relative;
          background: white;
          border-radius: 12px;
          padding: 8px 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          bottom: 0;
          left: 0;
          transition: max-width 1s ease-out, width 1s ease-out, padding 0.3s ease-out, opacity 0.2s ease-out;
        }
        .reach-demo-bubble::after {
          content: '';
          position: absolute;
          top: 100%;
          left: var(--arrow-offset, 24px);
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: white;
        }
        @keyframes reachBubbleIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .reach-demo-bubble-long {
          max-width: var(--bubble-max-width, 288px);
          animation: reachBubbleIn 0.3s ease-out;
        }
        .reach-demo-bubble-short {
          max-width: var(--bubble-max-width, 144px);
          animation: reachBubbleIn 0.3s ease-out;
        }
        .reach-demo-bubble-icon {
          font-size: 13px;
          color: #ff4d4f;
          flex-shrink: 0;
          font-weight: bold;
        }
        .reach-demo-bubble-text {
          font-size: 12px;
          color: #1f2937;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
          line-height: 1.4;
        }
        .reach-demo-bubble-short .reach-demo-bubble-text {
          max-width: 80px;
        }
        .reach-demo-bubble-long .reach-demo-bubble-text {
          max-width: var(--bubble-text-max-width, 240px);
        }

        /* 响应式适配 */
        @media (max-width: 340px) {
          .bubble-overlay-container {
            bottom: 52px;
          }
          .reach-demo-bubble {
            padding: 6px 10px;
            gap: 6px;
          }
          .reach-demo-bubble-long {
            max-width: 220px;
          }
          .reach-demo-bubble-short {
            max-width: 120px;
          }
          .reach-demo-bubble-long .reach-demo-bubble-text {
            max-width: 180px;
          }
          .reach-demo-bubble-icon {
            font-size: 12px;
          }
          .reach-demo-bubble-text {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default function ReachDemoPage() {
  return <ReachDemo />;
}
