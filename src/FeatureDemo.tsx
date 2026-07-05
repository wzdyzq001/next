import { useState } from 'react';
import { AiAssistantProvider, useAiAssistantContext, AiAssistantOverlay } from './components/AiAssistant';
import { FullOrderCard } from './components/AiAssistant/OrderCard';
import { convertOrderListItemToCardData } from './components/AiAssistant/orderDataAdapter';
import { ORDER_LIST, SCENARIOS } from './mock';
import ReservationInfoCard from './components/AiAssistant/ReservationInfoCard';
import './components/AiAssistant/aiAssistant.css';

type FeatureCategory = 'overview' | 'reservation' | 'reminder' | 'orderDetail' | 'aiInterface' | 'orderCard';

interface FeatureItem {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'partial' | 'planned';
  component?: string;
}

const FEATURES: Record<FeatureCategory, { title: string; icon: string; items: FeatureItem[] }> = {
  overview: {
    title: '项目总览',
    icon: '🏗️',
    items: [
      { id: 'arch-1', name: 'React + TypeScript 技术栈', description: '使用 React 18 + TypeScript + Vite 构建', status: 'completed' },
      { id: 'arch-2', name: 'AI 助手 Context 架构', description: '基于 Context API 的全局状态管理', status: 'completed' },
      { id: 'arch-3', name: '订单数据统一模型', description: 'OrderData 统一类型定义，支持多品类', status: 'completed' },
      { id: 'arch-4', name: 'Mock 数据层', description: '完整的模拟数据和场景配置', status: 'completed' },
      { id: 'arch-5', name: '单元测试覆盖', description: 'Vitest + Testing Library', status: 'partial' },
    ],
  },
  reservation: {
    title: '帮我约功能',
    icon: '📅',
    items: [
      { id: 'res-1', name: '预约面板组件', description: 'ReservationPanel - 门店选择、日期时间选择、人数选择', status: 'completed', component: 'ReservationPanel.tsx' },
      { id: 'res-2', name: '预约信息卡片', description: 'ReservationInfoCard - 展示预约状态、门店信息、倒计时', status: 'completed', component: 'ReservationInfoCard.tsx' },
      { id: 'res-3', name: '预约状态流转', description: 'pending → accepted/failed/canceled 状态机', status: 'completed' },
      { id: 'res-4', name: '门店切换功能', description: '多门店列表展示与切换', status: 'completed' },
      { id: 'res-5', name: '预约确认弹窗', description: 'ConfirmDialog 二次确认组件', status: 'completed' },
      { id: 'res-6', name: '重新预约', description: '预约失败/取消后可重新预约', status: 'completed' },
      { id: 'res-7', name: '预约超时自动失败', description: '5分钟超时未接单自动标记失败', status: 'completed' },
    ],
  },
  reminder: {
    title: '订单使用提醒',
    icon: '⏰',
    items: [
      { id: 'rem-1', name: '提醒设置面板', description: 'RedeemReminderSheet - 天数选择、快捷选项', status: 'completed', component: 'RedeemReminderSheet.tsx' },
      { id: 'rem-2', name: '提醒数据存储', description: 'localStorage 持久化存储', status: 'completed', component: 'redeemReminder.ts' },
      { id: 'rem-3', name: '有效期计算', description: '自动解析有效期并限制最大提醒天数', status: 'completed' },
      { id: 'rem-4', name: '快捷日期选项', description: '本周五/六/日 + 下周五/六/日 智能生成', status: 'completed' },
      { id: 'rem-5', name: '提醒状态管理', description: 'active/canceled/triggered 三态', status: 'completed' },
      { id: 'rem-6', name: '提醒卡片展示', description: 'RedeemReminderCard - 消息流中的提醒展示', status: 'completed' },
      { id: 'rem-7', name: '订单详情页提醒', description: 'OrderCenter 中的提醒设置入口', status: 'completed' },
    ],
  },
  orderDetail: {
    title: '订单详情页',
    icon: '📋',
    items: [
      { id: 'od-1', name: '订单列表展示', description: '多品类订单列表（餐饮/酒店/景区/旅行等）', status: 'completed', component: 'OrderCenter.tsx' },
      { id: 'od-2', name: '品类筛选', description: '全部/餐饮/酒店/景区/旅行/休闲娱乐 分类Tab', status: 'completed' },
      { id: 'od-3', name: '订单状态展示', description: '待支付/待使用/退款中/已完成/已取消 等多状态', status: 'completed' },
      { id: 'od-4', name: '酒店预约流程', description: 'HotelReservationFlowSheet - 三步式预约', status: 'completed' },
      { id: 'od-5', name: '景区预约流程', description: 'ScenicPresaleBookingFlow - 日期选择+游客信息', status: 'completed' },
      { id: 'od-6', name: '退款进度展示', description: '退款申请/审核/到账 三步进度', status: 'completed' },
      { id: 'od-7', name: '推荐商品', description: '同类目推荐商品列表', status: 'completed' },
      { id: 'od-8', name: '评价引导卡片', description: 'ReviewGuideCard - 写评价得券', status: 'completed' },
      { id: 'od-9', name: '预约信息卡片', description: 'OrderReservationCard - 订单详情内预约展示', status: 'completed' },
    ],
  },
  aiInterface: {
    title: 'AI 助手界面',
    icon: '🤖',
    items: [
      { id: 'ai-1', name: 'AI 助手浮层', description: 'AiAssistantOverlay - 最小化/全屏切换', status: 'completed', component: 'AiAssistantOverlay.tsx' },
      { id: 'ai-2', name: '对话消息流', description: '用户消息/助手消息/快捷回复', status: 'completed' },
      { id: 'ai-3', name: '消息折叠功能', description: '历史消息折叠/展开，支持入口溯源', status: 'completed' },
      { id: 'ai-4', name: '气泡通知', description: 'Bubble 气泡推送，未读红点提示', status: 'completed' },
      { id: 'ai-5', name: '订单选择器', description: 'OrderSelectorOverlay - 多订单切换', status: 'completed' },
      { id: 'ai-6', name: '功能卡片系统', description: 'FeatureCard - 7种功能卡片类型', status: 'completed', component: 'FeatureCard/' },
      { id: 'ai-7', name: '语音输入', description: '语音识别 + 音量可视化（演示模式）', status: 'partial' },
      { id: 'ai-8', name: '券码展示页', description: 'VoucherCodeSheet - 券码全屏展示', status: 'completed' },
      { id: 'ai-9', name: '降级机制', description: 'L1/L2/L3 三级降级策略', status: 'completed' },
      { id: 'ai-10', name: '转人工客服', description: 'transferHuman 三态流转', status: 'completed' },
      { id: 'ai-11', name: 'WebSocket 连接', description: '实时消息推送，自动重连', status: 'partial' },
      { id: 'ai-12', name: '会话持久化', description: '聊天历史 localStorage 保存', status: 'completed' },
    ],
  },
  orderCard: {
    title: '订单卡片系统',
    icon: '🎴',
    items: [
      { id: 'oc-1', name: '完整订单卡片', description: 'FullOrderCard - 基础信息+扩展+操作+建议', status: 'completed', component: 'FullOrderCard.tsx' },
      { id: 'oc-2', name: '紧凑订单卡片', description: 'CompactOrderCard - 精简展示', status: 'completed', component: 'CompactOrderCard.tsx' },
      { id: 'oc-3', name: '卡片基础组件', description: 'OrderCardBase - 商品信息、状态、标签', status: 'completed' },
      { id: 'oc-4', name: '卡片扩展区域', description: 'OrderCardExtension - 进度/酒店/退款等扩展', status: 'completed' },
      { id: 'oc-5', name: '操作按钮区', description: 'OrderCardActions - 主/次操作按钮', status: 'completed' },
      { id: 'oc-6', name: '建议问题区', description: 'OrderCardSuggestions - 快捷提问入口', status: 'completed' },
      { id: 'oc-7', name: '数据适配器', description: 'orderDataAdapter - 统一数据转换', status: 'completed' },
      { id: 'oc-8', name: '多品类适配', description: '餐饮/酒店/景区/旅行/休闲娱乐', status: 'completed' },
      { id: 'oc-9', name: '消息合并发送', description: '订单卡片+使用提醒合并发送', status: 'completed' },
      { id: 'oc-10', name: '宽度对齐一致性', description: '390px 统一宽度，与订单页严格对齐', status: 'completed' },
    ],
  },
};

const INITIAL_RESERVATIONS = {
  'MT2026061800101': {
    orderId: 'MT2026061800101',
    reservationNo: 'YY20260618001',
    serviceType: '堂食预约',
    storeName: '海底捞火锅(陆家嘴店)',
    storeAddress: '浦东新区陆家嘴环路1000号',
    businessHours: '10:00-22:00',
    arrivalTime: '2026-06-20 18:30',
    pax: 4,
    phone: '138****8888',
    acceptStatus: 'accepted' as const,
    estimatedAcceptTime: '5分钟内',
    merchantAcceptAt: Date.now() - 3600 * 1000,
  },
};

function DemoContent() {
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>('overview');
  const [showAiDemo, setShowAiDemo] = useState(false);
  const { openAssistant } = useAiAssistantContext();

  const sampleOrder = ORDER_LIST.find(o => o.category === 'food' && o.statusText === '待使用') || ORDER_LIST[0];
  const orderCardData = convertOrderListItemToCardData(sampleOrder);

  const totalFeatures = Object.values(FEATURES).reduce((sum, cat) => sum + cat.items.length, 0);
  const completedFeatures = Object.values(FEATURES).reduce(
    (sum, cat) => sum + cat.items.filter(i => i.status === 'completed').length,
    0
  );

  const openAiWithOrder = (orderId: string, source: 'order_detail' | 'order_list' = 'order_detail') => {
    setShowAiDemo(true);
    setTimeout(() => {
      openAssistant(orderId, source);
    }, 100);
  };

  return (
    <div className="feature-demo-page">
      <header className="demo-header">
        <div className="demo-header-inner">
          <h1>
            <span className="demo-logo">🤖</span>
            AI 智能助手 V2.1 - 功能梳理与演示
          </h1>
          <div className="demo-stats">
            <div className="stat-item">
              <span className="stat-value">{totalFeatures}</span>
              <span className="stat-label">功能总数</span>
            </div>
            <div className="stat-item completed">
              <span className="stat-value">{completedFeatures}</span>
              <span className="stat-label">已完成</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{Math.round((completedFeatures / totalFeatures) * 100)}%</span>
              <span className="stat-label">完成度</span>
            </div>
          </div>
        </div>
      </header>

      <div className="demo-container">
        <aside className="demo-sidebar">
          {(Object.keys(FEATURES) as FeatureCategory[]).map((key) => {
            const cat = FEATURES[key];
            const completed = cat.items.filter(i => i.status === 'completed').length;
            return (
              <button
                key={key}
                className={`sidebar-item ${activeCategory === key ? 'active' : ''}`}
                onClick={() => setActiveCategory(key)}
              >
                <span className="sidebar-icon">{cat.icon}</span>
                <span className="sidebar-title">{cat.title}</span>
                <span className="sidebar-count">
                  {completed}/{cat.items.length}
                </span>
              </button>
            );
          })}

          <div className="sidebar-divider">快速演示</div>

          <button
            className="sidebar-item demo-action"
            onClick={() => openAiWithOrder('RX2026061700123', 'order_detail')}
          >
            <span className="sidebar-icon">💬</span>
            <span className="sidebar-title">AI助手演示</span>
          </button>

          <button
            className="sidebar-item demo-action"
            onClick={() => openAiWithOrder('MT2026061800101', 'order_list')}
          >
            <span className="sidebar-icon">📋</span>
            <span className="sidebar-title">订单列表入口</span>
          </button>
        </aside>

        <main className="demo-main">
          <div className="demo-section-header">
            <h2>
              <span>{FEATURES[activeCategory].icon}</span>
              {FEATURES[activeCategory].title}
            </h2>
            <span className="section-count">
              {FEATURES[activeCategory].items.filter(i => i.status === 'completed').length}
              / {FEATURES[activeCategory].items.length} 已完成
            </span>
          </div>

          <div className="feature-grid">
            {FEATURES[activeCategory].items.map((item) => (
              <div key={item.id} className={`feature-card ${item.status}`}>
                <div className="feature-card-head">
                  <div className="feature-status">
                    <span className={`status-badge ${item.status}`}>
                      {item.status === 'completed' ? '✅ 已完成' : item.status === 'partial' ? '🔶 部分完成' : '📌 规划中'}
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                </div>
                <p className="feature-desc">{item.description}</p>
                {item.component && (
                  <div className="feature-component">
                    <span className="comp-label">组件:</span>
                    <code>{item.component}</code>
                  </div>
                )}
              </div>
            ))}
          </div>

          {activeCategory === 'orderCard' && (
            <div className="demo-preview">
              <h3>📱 订单卡片预览</h3>
              <div className="order-card-demo-wrapper">
                <FullOrderCard order={orderCardData} />
              </div>
            </div>
          )}

          {activeCategory === 'reservation' && (
            <div className="demo-preview">
              <h3>📱 预约信息卡片预览</h3>
              <div className="reservation-demo-wrapper">
                <ReservationInfoCard
                  data={{
                    storeName: '海底捞火锅(陆家嘴店)',
                    storeAddress: '浦东新区陆家嘴环路1000号',
                    businessHours: '10:00-22:00',
                    arrivalTime: '2026-06-20 18:30',
                    pax: 4,
                    phone: '138****8888',
                    acceptStatus: 'pending',
                    estimatedAcceptTime: '5分钟内',
                    acceptDeadlineAt: Date.now() + 5 * 60 * 1000,
                  }}
                  now={Date.now()}
                />
              </div>
            </div>
          )}

          {activeCategory === 'aiInterface' && (
            <div className="demo-preview">
              <h3>💡 功能卡片类型</h3>
              <div className="feature-types-grid">
                {[
                  { type: '使用提醒', icon: '⏰', desc: '设置订单到期提醒' },
                  { type: '预约服务', icon: '📅', desc: '帮我约 - 门店预约' },
                  { type: '加急请求', icon: '⚡', desc: '催单/加急处理' },
                  { type: '再来一单', icon: '🔄', desc: '快速复购' },
                  { type: '退款申请', icon: '💰', desc: '在线申请退款' },
                  { type: '攻略指引', icon: '📖', desc: '酒店/景区/出行指引' },
                  { type: '券码展示', icon: '🎫', desc: '核销券码展示' },
                ].map((item) => (
                  <div key={item.type} className="feature-type-card">
                    <span className="ft-icon">{item.icon}</span>
                    <span className="ft-name">{item.type}</span>
                    <span className="ft-desc">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {showAiDemo && <AiAssistantOverlay />}

      <style>{`
        .feature-demo-page {
          min-height: 100vh;
          background: #f7f7f8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .demo-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 32px 24px;
        }
        .demo-header-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .demo-header h1 {
          margin: 0 0 20px 0;
          font-size: 24px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .demo-logo {
          font-size: 32px;
        }
        .demo-stats {
          display: flex;
          gap: 32px;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
        }
        .stat-label {
          font-size: 13px;
          opacity: 0.85;
        }
        .stat-item.completed .stat-value {
          color: #a8f0c6;
        }
        .demo-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
        }
        .demo-sidebar {
          position: sticky;
          top: 24px;
          height: fit-content;
        }
        .sidebar-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: none;
          background: white;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
          margin-bottom: 6px;
          transition: all 0.15s;
          color: #333;
        }
        .sidebar-item:hover {
          background: #f0f0f2;
        }
        .sidebar-item.active {
          background: #eef2ff;
          color: #4f46e5;
          font-weight: 500;
        }
        .sidebar-icon {
          font-size: 18px;
        }
        .sidebar-title {
          flex: 1;
        }
        .sidebar-count {
          font-size: 12px;
          color: #999;
          background: #f0f0f2;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .sidebar-item.active .sidebar-count {
          background: #e0e7ff;
          color: #4f46e5;
        }
        .sidebar-divider {
          font-size: 12px;
          color: #999;
          padding: 16px 14px 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sidebar-item.demo-action {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .sidebar-item.demo-action:hover {
          opacity: 0.9;
        }
        .demo-main {
          min-width: 0;
        }
        .demo-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .demo-section-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-count {
          font-size: 13px;
          color: #666;
          background: white;
          padding: 6px 12px;
          border-radius: 20px;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
          margin-bottom: 32px;
        }
        .feature-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #eaeaea;
        }
        .feature-card.completed {
          border-color: #dcfce7;
        }
        .feature-card.partial {
          border-color: #fef3c7;
        }
        .feature-card-head {
          margin-bottom: 10px;
        }
        .feature-status {
          margin-bottom: 8px;
        }
        .status-badge {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        .status-badge.completed {
          background: #dcfce7;
          color: #166534;
        }
        .status-badge.partial {
          background: #fef3c7;
          color: #92400e;
        }
        .status-badge.planned {
          background: #f1f5f9;
          color: #475569;
        }
        .feature-card h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
        }
        .feature-desc {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }
        .feature-component {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .comp-label {
          color: #9ca3af;
        }
        .feature-component code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          color: #4b5563;
        }
        .demo-preview {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #eaeaea;
        }
        .demo-preview h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .order-card-demo-wrapper,
        .reservation-demo-wrapper {
          max-width: 390px;
        }
        .feature-types-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }
        .feature-type-card {
          background: #f9fafb;
          border-radius: 10px;
          padding: 16px 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ft-icon {
          font-size: 28px;
        }
        .ft-name {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
        }
        .ft-desc {
          font-size: 11px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

export default function FeatureDemo() {
  return (
    <AiAssistantProvider initialReservations={INITIAL_RESERVATIONS}>
      <DemoContent />
    </AiAssistantProvider>
  );
}
