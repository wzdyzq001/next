import React, { useState } from 'react';
import './cardMarginDemo.css';

const demoOrder = {
  id: 'demo-order-1',
  productName: '巨无霸套餐 中薯 可乐(中) 三人餐',
  price: 88.0,
  thumbnail: '🍔',
  tags: ['随时退', '免预约'],
  storeName: '麦当劳(南山科技园店)',
  distance: '1.2km',
  statusText: '配送中',
  statusColor: 'blue',
};

interface DemoOption {
  id: string;
  label: string;
  desc: string;
  cardWidth: string;
  cardMarginRight?: string;
  messageListPadding?: string;
}

const demoOptions: DemoOption[] = [
  {
    id: 'current',
    label: '当前效果',
    desc: '宽度 92%，右边距偏小',
    cardWidth: '92%',
  },
  {
    id: 'width-93',
    label: '宽度 93%',
    desc: '接近全屏，右边距约 16px',
    cardWidth: '93%',
  },
  {
    id: 'width-90',
    label: '宽度 90%',
    desc: '略小于当前，右边距适中',
    cardWidth: '90%',
  },
  {
    id: 'option1',
    label: '方案一：宽度 88%',
    desc: '减小卡片宽度百分比，左右边距更均衡',
    cardWidth: '88%',
  },
  {
    id: 'option2',
    label: '方案二：宽度 85%',
    desc: '进一步减小宽度，右边距更宽松',
    cardWidth: '85%',
  },
  {
    id: 'option3',
    label: '方案三：固定右边距 24px',
    desc: '宽度自适应，保证右边距固定 24px',
    cardWidth: 'auto',
    cardMarginRight: '24px',
  },
  {
    id: 'option4',
    label: '方案四：消息列表右padding 24px',
    desc: '调整消息列表内边距，统一右侧留白',
    cardWidth: '92%',
    messageListPadding: '0 16px 0 16px',
  },
];

const DemoCard: React.FC<{ option: DemoOption; showLabels?: boolean }> = ({ option, showLabels = true }) => {
  const messageListStyle: React.CSSProperties = option.messageListPadding
    ? { padding: option.messageListPadding }
    : {};

  const cardStyle: React.CSSProperties = {
    width: option.cardWidth,
    maxWidth: option.cardWidth,
    ...(option.cardMarginRight ? { marginRight: option.cardMarginRight } : {}),
  };

  return (
    <div className="cm-demo-container">
      {showLabels && (
        <div className="cm-demo-label">
          <span className="cm-demo-label-title">{option.label}</span>
          <span className="cm-demo-label-desc">{option.desc}</span>
        </div>
      )}
      <div className="cm-message-list" style={messageListStyle}>
        <div className="cm-message assistant has-order-card">
          <div className="cm-message-avatar">
            <span className="cm-avatar-icon">🤖</span>
          </div>
          <div className="cm-order-card" style={cardStyle}>
            <div className="cm-card-base">
              <div className="cm-card-thumb">{demoOrder.thumbnail}</div>
              <div className="cm-card-info">
                <div className="cm-card-title-row">
                  <div className="cm-card-title-main">
                    <div className="cm-card-name">{demoOrder.productName}</div>
                    <div className="cm-card-tags">
                      {demoOrder.tags.map((tag, i) => (
                        <span key={i} className="cm-tag">
                          {tag}
                          {i < demoOrder.tags.length - 1 && <span className="cm-tag-sep"> · </span>}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="cm-card-right">
                    <span className={`cm-card-status status-${demoOrder.statusColor}`}>
                      {demoOrder.statusText}
                    </span>
                    <div className="cm-card-price">
                      <span className="cm-price-symbol">¥</span>
                      <span className="cm-price-num">{demoOrder.price.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="cm-card-store">
                  <span className="cm-store-distance">{demoOrder.distance}</span>
                  <span className="cm-store-name">{demoOrder.storeName}</span>
                </div>
              </div>
            </div>
            <div className="cm-card-actions">
              <button className="cm-action-btn secondary">查看详情</button>
              <button className="cm-action-btn primary">联系商家</button>
            </div>
          </div>
        </div>

        <div className="cm-message assistant">
          <div className="cm-message-avatar">
            <span className="cm-avatar-icon">🤖</span>
          </div>
          <div className="cm-message-bubble cm-text-bubble">
            <div className="cm-message-text">
              您好，我是团小帮，有什么可以帮您的？您可以问我订单相关的问题，或者查看订单详情。
            </div>
          </div>
        </div>

        <div className="cm-message user">
          <div className="cm-message-avatar user">
            <span className="cm-avatar-icon">我</span>
          </div>
          <div className="cm-message-bubble cm-text-bubble">
            <div className="cm-message-text">还有多久送达？</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CardMarginDemo: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('current');
  const [compareMode, setCompareMode] = useState<'single' | 'compare'>('compare');

  const selectedOption = demoOptions.find((o) => o.id === selectedId) || demoOptions[0];

  return (
    <div className="cm-demo-page">
      <div className="cm-demo-header">
        <h2 className="cm-demo-title">卡片右边距优化 Demo</h2>
        <p className="cm-demo-subtitle">对比不同方案的卡片右边距效果</p>
      </div>

      <div className="cm-demo-controls">
        <div className="cm-mode-switch">
          <button
            className={`cm-mode-btn ${compareMode === 'compare' ? 'active' : ''}`}
            onClick={() => setCompareMode('compare')}
          >
            全部对比
          </button>
          <button
            className={`cm-mode-btn ${compareMode === 'single' ? 'active' : ''}`}
            onClick={() => setCompareMode('single')}
          >
            单选查看
          </button>
        </div>
      </div>

      {compareMode === 'single' && (
        <div className="cm-option-selector">
          {demoOptions.map((opt) => (
            <button
              key={opt.id}
              className={`cm-option-chip ${selectedId === opt.id ? 'active' : ''}`}
              onClick={() => setSelectedId(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className={`cm-demo-content ${compareMode === 'compare' ? 'compare-mode' : 'single-mode'}`}>
        {compareMode === 'compare' ? (
          <div className="cm-compare-grid">
            {demoOptions.map((opt) => (
              <DemoCard key={opt.id} option={opt} />
            ))}
          </div>
        ) : (
          <div className="cm-single-demo">
            <DemoCard option={selectedOption} showLabels={false} />
            <div className="cm-single-info">
              <div className="cm-info-row">
                <span className="cm-info-label">当前方案：</span>
                <span className="cm-info-value">{selectedOption.label}</span>
              </div>
              <div className="cm-info-row">
                <span className="cm-info-label">说明：</span>
                <span className="cm-info-value">{selectedOption.desc}</span>
              </div>
              <div className="cm-info-row">
                <span className="cm-info-label">卡片宽度：</span>
                <span className="cm-info-value">{selectedOption.cardWidth}</span>
              </div>
              {selectedOption.cardMarginRight && (
                <div className="cm-info-row">
                  <span className="cm-info-label">右边距：</span>
                  <span className="cm-info-value">{selectedOption.cardMarginRight}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="cm-demo-footer">
        <div className="cm-recommend">
          <h4>推荐方案</h4>
          <p>
            建议使用<strong>方案一（宽度 88%）</strong>或
            <strong>方案三（固定右边距 24px）</strong>，
            在保证视觉舒适度的同时，不会过多损失卡片内容宽度。
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardMarginDemo;
