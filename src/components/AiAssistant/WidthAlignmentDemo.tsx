import React, { useState, useEffect } from 'react';
import './widthAlignmentDemo.css';

const WidthAlignmentDemo: React.FC = () => {
  const [viewportWidth, setViewportWidth] = useState(390);
  const [showRuler, setShowRuler] = useState(true);
  const [activeTab, setActiveTab] = useState<'compare' | 'detail'>('compare');
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  useEffect(() => {
    const sizeMap = {
      mobile: 390,
      tablet: 768,
      desktop: 1200,
    };
    setViewportWidth(sizeMap[screenSize]);
  }, [screenSize]);

  const OrderListMock = ({ width }: { width: number }) => (
    <div className="wad-order-list" style={{ width: `${width}px` }}>
      <div className="wad-list-header">
        <div className="wad-list-title">我的订单</div>
        <div className="wad-list-tabs">
          <span className="wad-tab active">全部</span>
          <span className="wad-tab">待使用</span>
          <span className="wad-tab">待评价</span>
        </div>
      </div>
      <div className="wad-list-content">
        {[1, 2, 3].map((i) => (
          <div key={i} className="wad-order-card">
            <div className="wad-order-thumb">🍔</div>
            <div className="wad-order-info">
              <div className="wad-order-merchant">麦当劳(南山科技园店)</div>
              <div className="wad-order-product">巨无霸套餐 中薯 可乐(中)</div>
              <div className="wad-order-bottom">
                <span className="wad-order-price">¥38.0</span>
                <span className="wad-order-status">配送中</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="wad-width-label">订单列表页 · 宽度: {width}px</div>
    </div>
  );

  const AiAssistantMock = ({ width, isFixed, label }: { width: number; isFixed: boolean; label: string }) => (
    <div className={`wad-ai-panel ${isFixed ? 'fixed' : 'narrow'}`} style={{ width: `${width}px` }}>
      <div className="wad-ai-header">
        <div className="wad-ai-avatar">🤖</div>
        <div className="wad-ai-title">
          <div className="wad-ai-name">团小帮 AI</div>
          <div className="wad-ai-slogan">您的订单助手</div>
        </div>
      </div>
      <div className="wad-ai-body">
        <div className="wad-ai-message bot">
          <div className="wad-ai-msg-avatar">🤖</div>
          <div className="wad-ai-msg-bubble">
            <div className="wad-ai-msg-text">您好，我是团小帮，有什么可以帮您？</div>
          </div>
        </div>
        <div className="wad-ai-message user">
          <div className="wad-ai-msg-avatar user">我</div>
          <div className="wad-ai-msg-bubble user">
            <div className="wad-ai-msg-text">我的订单什么时候到？</div>
          </div>
        </div>
        <div className="wad-ai-message bot">
          <div className="wad-ai-msg-avatar">🤖</div>
          <div className="wad-ai-order-card">
            <div className="wad-ai-order-head">
              <span className="wad-ai-order-label">订单卡片</span>
              <span className="wad-ai-order-badge">配送中</span>
            </div>
            <div className="wad-ai-order-body">
              <div className="wad-ai-order-store">麦当劳(南山科技园店)</div>
              <div className="wad-ai-order-product">巨无霸套餐 中薯 可乐(中)</div>
              <div className="wad-ai-order-price">¥38.0</div>
            </div>
          </div>
        </div>
      </div>
      <div className="wad-ai-footer">
        <input className="wad-ai-input" placeholder="想知道什么？问问我吧" />
      </div>
      <div className="wad-width-label">{label} · 宽度: {width}px</div>
    </div>
  );

  const pageWidth = viewportWidth;
  const orderListWidth = Math.min(pageWidth, 390);
  const aiCurrentWidth = Math.min(pageWidth, 390) - 24;
  const aiFixedWidth = Math.min(pageWidth, 390);

  return (
    <div className="wad-demo-page">
      <div className="wad-demo-header">
        <h2 className="wad-demo-title">AI 助手宽度对齐修复 Demo</h2>
        <p className="wad-demo-subtitle">
          修复前：AI助手 366px vs 订单页 390px（差 24px）
          <br />
          修复后：AI助手 390px = 订单页 390px（完全对齐）
        </p>
      </div>

      <div className="wad-controls">
        <div className="wad-control-group">
          <label className="wad-control-label">屏幕尺寸模拟：</label>
          <div className="wad-size-buttons">
            <button
              className={`wad-size-btn ${screenSize === 'mobile' ? 'active' : ''}`}
              onClick={() => setScreenSize('mobile')}
            >
              手机 (390px)
            </button>
            <button
              className={`wad-size-btn ${screenSize === 'tablet' ? 'active' : ''}`}
              onClick={() => setScreenSize('tablet')}
            >
              平板 (768px)
            </button>
            <button
              className={`wad-size-btn ${screenSize === 'desktop' ? 'active' : ''}`}
              onClick={() => setScreenSize('desktop')}
            >
              桌面 (1200px)
            </button>
          </div>
        </div>

        <div className="wad-control-group">
          <label className="wad-control-label">视图模式：</label>
          <div className="wad-tab-buttons">
            <button
              className={`wad-tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveTab('compare')}
            >
              并排对比
            </button>
            <button
              className={`wad-tab-btn ${activeTab === 'detail' ? 'active' : ''}`}
              onClick={() => setActiveTab('detail')}
            >
              详细分析
            </button>
          </div>
        </div>

        <div className="wad-control-group">
          <label className="wad-control-label">
            <input
              type="checkbox"
              checked={showRuler}
              onChange={(e) => setShowRuler(e.target.checked)}
            />
            显示参考线
          </label>
        </div>
      </div>

      {activeTab === 'compare' ? (
        <div className="wad-compare-section">
          <div className="wad-compare-row">
            <div className="wad-compare-item">
              <div className="wad-compare-title">
                <span className="wad-badge before">修复前</span>
                <span className="wad-compare-subtitle">AI助手 366px · 订单页 390px</span>
              </div>
              <div className="wad-compare-viewport" style={{ width: `${pageWidth}px` }}>
                {showRuler && (
                  <div className="wad-ruler">
                    <div className="wad-ruler-left" style={{ width: `${orderListWidth}px` }}>
                      <span>订单页宽度</span>
                    </div>
                    <div className="wad-ruler-right" style={{ width: `${aiCurrentWidth}px` }}>
                      <span>AI助手宽度</span>
                    </div>
                    <div className="wad-ruler-diff" style={{ left: `${aiCurrentWidth}px`, width: `${orderListWidth - aiCurrentWidth}px` }}>
                      <span>-24px</span>
                    </div>
                  </div>
                )}
                <div className="wad-compare-stack">
                  <OrderListMock width={orderListWidth} />
                  <div className="wad-overlay-hint">
                    <span className="wad-arrow-down">↓</span>
                    AI助手浮层覆盖在订单页之上
                  </div>
                  <AiAssistantMock width={aiCurrentWidth} isFixed={false} label="当前AI助手" />
                </div>
              </div>
            </div>

            <div className="wad-compare-item">
              <div className="wad-compare-title">
                <span className="wad-badge after">修复后</span>
                <span className="wad-compare-subtitle">AI助手 390px = 订单页 390px</span>
              </div>
              <div className="wad-compare-viewport" style={{ width: `${pageWidth}px` }}>
                {showRuler && (
                  <div className="wad-ruler">
                    <div className="wad-ruler-left aligned" style={{ width: `${aiFixedWidth}px` }}>
                      <span>完全对齐 ✓</span>
                    </div>
                  </div>
                )}
                <div className="wad-compare-stack">
                  <OrderListMock width={orderListWidth} />
                  <div className="wad-overlay-hint success">
                    <span className="wad-arrow-down">↓</span>
                    宽度完全一致
                  </div>
                  <AiAssistantMock width={aiFixedWidth} isFixed={true} label="修复后AI助手" />
                </div>
              </div>
            </div>
          </div>

          <div className="wad-diff-summary">
            <div className="wad-diff-card">
              <div className="wad-diff-label">宽度差异</div>
              <div className="wad-diff-value before">24px</div>
              <div className="wad-diff-arrow">→</div>
              <div className="wad-diff-value after">0px</div>
            </div>
            <div className="wad-diff-card">
              <div className="wad-diff-label">AI助手可用宽度</div>
              <div className="wad-diff-value before">366px</div>
              <div className="wad-diff-arrow">→</div>
              <div className="wad-diff-value after">390px</div>
            </div>
            <div className="wad-diff-card">
              <div className="wad-diff-label">内容显示增加</div>
              <div className="wad-diff-value before">-</div>
              <div className="wad-diff-arrow">→</div>
              <div className="wad-diff-value after">+6.6%</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="wad-detail-section">
          <div className="wad-detail-card">
            <h3>问题分析</h3>
            <div className="wad-detail-grid">
              <div className="wad-detail-item">
                <h4>订单列表页宽度</h4>
                <div className="wad-detail-value">{orderListWidth}px</div>
                <p className="wad-detail-desc">
                  由 <code>.app</code> 容器的 <code>max-width: var(--mobile-page-width)</code> 控制
                </p>
              </div>
              <div className="wad-detail-item">
                <h4>当前AI助手宽度</h4>
                <div className="wad-detail-value warn">{aiCurrentWidth}px</div>
                <p className="wad-detail-desc">
                  由 <code>.ai-overlay-panel</code> 的 <code>max-width: calc(var(--mobile-page-width) - 24px)</code> 控制
                </p>
              </div>
              <div className="wad-detail-item">
                <h4>宽度差异</h4>
                <div className="wad-detail-value diff">{orderListWidth - aiCurrentWidth}px</div>
                <p className="wad-detail-desc">
                  左右各少 12px，导致视觉上AI助手比订单页窄
                </p>
              </div>
              <div className="wad-detail-item">
                <h4>修复后宽度</h4>
                <div className="wad-detail-value success">{aiFixedWidth}px</div>
                <p className="wad-detail-desc">
                  移除 -24px 偏移，与订单页宽度完全一致
                </p>
              </div>
            </div>
          </div>

          <div className="wad-detail-card">
            <h3>受影响的组件</h3>
            <div className="wad-affected-list">
              <div className="wad-affected-item">
                <span className="wad-affected-name">.ai-overlay-panel</span>
                <span className="wad-affected-desc">AI助手主面板</span>
              </div>
              <div className="wad-affected-item">
                <span className="wad-affected-name">.ai-order-selector-panel</span>
                <span className="wad-affected-desc">订单选择器面板</span>
              </div>
              <div className="wad-affected-item">
                <span className="wad-affected-name">.redeem-reminder-sheet</span>
                <span className="wad-affected-desc">使用提醒底部弹层</span>
              </div>
              <div className="wad-affected-item">
                <span className="wad-affected-name">.reservation-drawer</span>
                <span className="wad-affected-desc">预约功能抽屉</span>
              </div>
              <div className="wad-affected-item">
                <span className="wad-affected-name">.voucher-sheet</span>
                <span className="wad-affected-desc">券码弹层</span>
              </div>
            </div>
          </div>

          <div className="wad-detail-card">
            <h3>修复方案</h3>
            <div className="wad-solution-steps">
              <div className="wad-solution-step">
                <div className="wad-step-num">1</div>
                <div className="wad-step-content">
                  <h4>修改全局宽度强制规则</h4>
                  <p>
                    将 <code>.ai-overlay-panel</code> 等面板的宽度从 <code>calc(100% - 24px)</code> 改为 <code>100%</code>，
                    <br />
                    最大宽度从 <code>calc(var(--mobile-page-width) - 24px)</code> 改为 <code>var(--mobile-page-width)</code>
                  </p>
                </div>
              </div>
              <div className="wad-solution-step">
                <div className="wad-step-num">2</div>
                <div className="wad-step-content">
                  <h4>保持内边距不变</h4>
                  <p>
                    面板内部的内容区域（header、body、footer）已通过 padding 控制内边距，
                    <br />
                    因此不需要额外调整内部布局
                  </p>
                </div>
              </div>
              <div className="wad-solution-step">
                <div className="wad-step-num">3</div>
                <div className="wad-step-content">
                  <h4>响应式适配</h4>
                  <p>
                    在小于 390px 的屏幕上，两侧自动填满，保持 100% 宽度，
                    <br />
                    与订单列表页行为完全一致
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="wad-demo-footer">
        <div className="wad-footer-note">
          <strong>注意：</strong>此Demo仅展示宽度对齐效果，实际修复将在确认后应用到正式代码中。
        </div>
      </div>
    </div>
  );
};

export default WidthAlignmentDemo;
