import React, { useState } from 'react';
import ReservationInfoCard, { type ReservationInfoCardData } from './components/AiAssistant/ReservationInfoCard';
import RedeemReminderCard from './components/AiAssistant/RedeemReminderCard';
import type { RedeemReminder } from './types';
import './statusFlowDemo.css';

type DemoTab = 'reservation' | 'reminder';
type ResSection = 'flow' | 'states' | 'ui' | 'pages' | 'entries';
type RemSection = 'flow' | 'states' | 'ui' | 'pages' | 'entries' | 'logic';

const baseReservation: ReservationInfoCardData = {
  storeName: '海底捞火锅(南山店)',
  storeAddress: '南山区海德二道288号',
  businessHours: '09:00-22:30',
  arrivalTime: '7.5 18:30',
  pax: 4,
  phone: '158****8127',
  acceptStatus: 'pending',
  estimatedAcceptTime: '等待商家接单',
  acceptDeadlineAt: Date.now() + 5 * 60 * 1000,
  orderId: 'MT2026061800101',
  reservationNo: 'YY1234567890',
  serviceType: '堂食预约',
};

const baseReminder: RedeemReminder = {
  id: 'rem_1234567890',
  orderId: 'MT2026061800101',
  remindAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
  createdAt: Date.now() - 24 * 60 * 60 * 1000,
  status: 'active',
};

const reservationStates = [
  { key: 'pending', name: '预约确认中', description: '用户提交预约后，等待商家接单', badgeText: '等待商家接单', badgeClass: 'pending', note: '商家接单后会通过短信及时同步。', actions: ['取消预约'], trigger: '用户在预约面板确认预约 → 发送预约请求', autoTransition: '3-8秒后自动流转（60%成功/25%拒绝/15%超时）' },
  { key: 'accepted', name: '预约成功', description: '商家确认接单，预约生效', badgeText: '商家已接单', badgeClass: 'accepted', note: '商家已接单。', actions: ['取消预约'], trigger: '商家确认接单（模拟：随机3-8秒后）', autoTransition: '无，保持成功状态' },
  { key: 'failed_rejected', name: '预约失败-商家拒绝', description: '商家拒绝了预约请求', badgeText: '可重新预约', badgeClass: 'failed', note: '商家拒绝了预约，可重新发起预约。', actions: ['重新预约'], trigger: '商家拒绝接单（模拟：随机）', failReason: 'rejected' as const, autoTransition: '无，等待用户操作' },
  { key: 'failed_timeout', name: '预约失败-超时未接', description: '商家超时未接单（默认5分钟超时）', badgeText: '可重新预约', badgeClass: 'failed', note: '商家未接单，可重新发起预约。', actions: ['重新预约'], trigger: '超过接单截止时间（acceptDeadlineAt）', failReason: 'timeout' as const, autoTransition: '无，等待用户操作' },
  { key: 'canceled', name: '预约已取消', description: '用户主动取消了预约', badgeText: '预约已取消', badgeClass: 'canceled', note: '预约已取消，可重新预约。', actions: ['重新预约'], trigger: '用户点击"取消预约"按钮', autoTransition: '无，等待用户操作' },
];

const reminderStates = [
  { key: 'none', name: '无提醒', description: '订单未设置使用提醒', cardType: 'none', trigger: '初始状态', autoTransition: '无' },
  { key: 'setting_sheet', name: '设置面板-打开中', description: '用户正在设置使用提醒', cardType: 'sheet', subStates: ['快捷日期选择', '自定义天数输入', '有效期校验'], trigger: '用户从订单卡片/功能卡片点击设置提醒', autoTransition: '无，等待用户操作' },
  { key: 'active', name: '提醒生效中', description: '提醒已设置，等待触发', cardType: 'active', actions: ['修改提醒时间', '取消提醒'], trigger: '用户在设置面板点击"确定"', autoTransition: '到达提醒时间后触发通知（需后端）' },
  { key: 'modify', name: '修改提醒中', description: '用户正在修改已有的提醒时间', cardType: 'sheet', subStateNote: '复用设置面板，预填充当前提醒时间', trigger: '用户点击"修改提醒时间"按钮', autoTransition: '无，等待用户操作' },
  { key: 'canceled', name: '提醒已取消', description: '用户取消了使用提醒', cardType: 'canceled', actions: ['重新设置提醒'], trigger: '用户点击"取消提醒"按钮', autoTransition: '无，等待用户操作' },
  { key: 'expired', name: '订单已过期', description: '订单已过期，无法设置提醒', cardType: 'expired', note: '有效期已过，提醒设置入口禁用', trigger: '订单有效期结束', autoTransition: '自动生效（基于validDate判断）' },
];

const reservationFlowEdges = [
  { from: 0, to: 1, label: '用户确认', color: '#10b981' },
  { from: 1, to: 2, label: '商家接单 (60%)', color: '#10b981' },
  { from: 1, to: 3, label: '商家拒绝 (25%)', color: '#ef4444' },
  { from: 1, to: 4, label: '超时未接 (15%)', color: '#f59e0b' },
  { from: 1, to: 5, label: '用户取消', color: '#6b7280' },
  { from: 2, to: 5, label: '用户取消', color: '#6b7280' },
  { from: 3, to: 1, label: '重新预约', color: '#3b82f6', dashed: true },
  { from: 4, to: 1, label: '重新预约', color: '#3b82f6', dashed: true },
  { from: 5, to: 1, label: '重新预约', color: '#3b82f6', dashed: true },
];

const reminderFlowEdges = [
  { from: 0, to: 1, label: '点击设置提醒', color: '#10b981' },
  { from: 1, to: 2, label: '确认设置', color: '#10b981' },
  { from: 2, to: 3, label: '修改时间', color: '#3b82f6' },
  { from: 3, to: 2, label: '确认修改', color: '#10b981' },
  { from: 2, to: 4, label: '取消提醒', color: '#ef4444' },
  { from: 4, to: 1, label: '重新设置', color: '#3b82f6', dashed: true },
  { from: 0, to: 5, label: '有效期结束', color: '#6b7280' },
  { from: 2, to: 5, label: '有效期结束', color: '#6b7280' },
];

const reservationPanelUI = [
  { area: '顶部成功提示条', elements: ['★ 成功徽章', '近期98%用户成功预约本店'], position: '悬浮顶部' },
  { area: '头部区域', elements: ['"帮我约"标题', '"提前约7日热门时间·可随时取消"副标题', '关闭按钮'], position: '顶部' },
  { area: '门店选择区', elements: ['"选择门店"标签', '门店头像', '门店名称', '距离+地址描述', '切换按钮（带上下箭头图标）'], position: '卡片上部' },
  { area: '日期选择区', elements: ['"选择时间"标签', '7天日期Tab（今天/明天/周X + 月.日）', '选中态高亮'], position: '卡片中部' },
  { area: '时间段选择区', elements: ['时间网格（30分钟间隔）', '"可约"状态（可点击）', '"繁忙"状态（禁用态）', '选中态高亮'], position: '卡片中部' },
  { area: '到店人数行', elements: ['"到店人数"标签', '减号按钮', '人数数字', '加号按钮'], position: '卡片下部' },
  { area: '联系电话行', elements: ['"联系电话"标签', '脱敏手机号（158****8127）'], position: '卡片下部' },
  { area: '预约须知', elements: ['预约需商家确认说明', '结果通知方式说明', '成功后可取消说明', '失败可重约说明'], position: '底部提示' },
  { area: '底部确定按钮', elements: ['"确定"主按钮（禁用态：未选时间时）', '固定底部'], position: '底部固定' },
  { area: '门店切换弹窗', elements: ['返回按钮', '"选择门店"标题', '门店列表（名称+距离+营业时间+地址）', '当前门店勾选标记'], position: '底部弹出Sheet' },
  { area: '确认对话框', elements: ['"确认预约"标题', '确认文案（日期+时间+人数）', '"确认预约"主按钮', '"取消"次按钮'], position: '居中弹窗' },
];

const reservationInfoCardUI = [
  { area: '头部状态区', elements: ['"RESERVATION · 预约信息"小字标签', '状态标题（4种）', '倒计时（仅pending状态）', '状态徽标（4种）'], position: '顶部' },
  { area: '门店信息区', elements: ['门店首字头像', '门店名称', '营业时间'], position: '上部' },
  { area: '预约信息网格', elements: ['到店时间', '人数', '联系电话'], position: '中部三列' },
  { area: '状态说明文案', elements: ['pending: 商家接单后会通过短信及时同步', 'accepted: 商家已接单', 'failed rejected: 商家拒绝了预约，可重新发起预约', 'failed timeout: 商家未接单，可重新发起预约', 'canceled: 预约已取消，可重新预约'], position: '下部' },
  { area: '操作按钮区', elements: ['取消预约按钮（pending/accepted时显示）', '重新预约按钮（failed/canceled时显示）'], position: '底部' },
];

const reminderSheetUI = [
  { area: '顶部提示Toast', elements: ['"使用提醒不可晚于有效期"提示', '1.8秒自动消失'], position: '悬浮顶部' },
  { area: '头部区域', elements: ['"设置使用提醒"标题', '商品名称（小字）', '关闭按钮'], position: '顶部' },
  { area: '有效期信息区', elements: ['"有效期至"标签 + 具体日期时间', '"剩余时间"标签 + 状态（已过期用红色）', '过期态整体变灰'], position: '上部' },
  { area: '已过期状态', elements: ['⌛ 过期图标', '"订单已过期"标题', '"无法设置使用提醒"描述'], position: '中部（仅过期时显示）' },
  { area: '提前提醒天数区', elements: ['"提前提醒天数"标题', '减号按钮', '数字输入框（可直接输入）', '"天后提醒"文字', '加号按钮'], position: '中部' },
  { area: '快捷选择区', elements: ['"快捷选择"标题', '快捷选项卡片（本周五六日/下周五六日）', '选中态高亮', '已过期日期自动过滤隐藏'], position: '中下部' },
  { area: '底部确定按钮', elements: ['"确定"主按钮（过期时禁用）', '固定底部'], position: '底部固定' },
];

const reminderCardUI = [
  { area: '头部信息区', elements: ['提醒状态图标（⏰生效中 / ⚠️已取消）', '提醒状态标题（2种）', '具体日期+星期', '商品名称'], position: '左侧+右侧' },
  { area: '操作按钮区', elements: ['修改提醒时间按钮（active时）', '取消提醒按钮（active时）', '重新设置提醒按钮（canceled时）'], position: '底部' },
];

function StatusFlowDemo() {
  const [activeTab, setActiveTab] = useState<DemoTab>('reservation');
  const [resSection, setResSection] = useState<ResSection>('flow');
  const [remSection, setRemSection] = useState<RemSection>('flow');
  const [selectedResState, setSelectedResState] = useState(0);
  const [selectedRemState, setSelectedRemState] = useState(0);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getReservationData = (idx: number): ReservationInfoCardData => {
    const state = reservationStates[idx];
    if (state.key === 'pending') return { ...baseReservation, acceptStatus: 'pending', acceptDeadlineAt: Date.now() + 5 * 60 * 1000 };
    if (state.key === 'accepted') return { ...baseReservation, acceptStatus: 'accepted', merchantAcceptAt: Date.now() - 60000 };
    if (state.key === 'failed_rejected') return { ...baseReservation, acceptStatus: 'failed', failReason: 'rejected' };
    if (state.key === 'failed_timeout') return { ...baseReservation, acceptStatus: 'failed', failReason: 'timeout' };
    return { ...baseReservation, acceptStatus: 'canceled' };
  };

  const getReminderData = (idx: number): RedeemReminder | null => {
    const state = reminderStates[idx];
    if (state.key === 'none' || state.key === 'setting_sheet' || state.key === 'modify' || state.key === 'expired') return null;
    if (state.key === 'canceled') return { ...baseReminder, status: 'canceled' };
    return { ...baseReminder, status: 'active' };
  };

  const resSectionConfig: { key: ResSection; label: string; icon: string }[] = [
    { key: 'flow', label: '状态流转图', icon: '🔄' },
    { key: 'states', label: '状态清单', icon: '📋' },
    { key: 'ui', label: '界面梳理', icon: '🎨' },
    { key: 'pages', label: '各页面表现', icon: '📱' },
    { key: 'entries', label: '入口触发点', icon: '🔌' },
  ];

  const remSectionConfig: { key: RemSection; label: string; icon: string }[] = [
    { key: 'flow', label: '状态流转图', icon: '🔄' },
    { key: 'states', label: '状态清单', icon: '📋' },
    { key: 'ui', label: '界面梳理', icon: '🎨' },
    { key: 'pages', label: '各页面表现', icon: '📱' },
    { key: 'entries', label: '入口触发点', icon: '🔌' },
    { key: 'logic', label: '核心算法', icon: '⚙️' },
  ];

  return (
    <div className="status-flow-demo">
      <div className="sfd-header">
        <h1>📊 功能状态流转全景图</h1>
        <p className="sfd-subtitle">帮我约 & 订单使用提醒 · 全状态枚举 · 界面结构 · 流转路径</p>
      </div>

      <div className="sfd-tabs">
        <button className={`sfd-tab ${activeTab === 'reservation' ? 'active' : ''}`} onClick={() => setActiveTab('reservation')}>
          📅 帮我约功能
        </button>
        <button className={`sfd-tab ${activeTab === 'reminder' ? 'active' : ''}`} onClick={() => setActiveTab('reminder')}>
          ⏰ 订单使用提醒
        </button>
      </div>

      {activeTab === 'reservation' && (
        <div className="sfd-content">
          <div className="sfd-sub-tabs">
            {resSectionConfig.map((s) => (
              <button key={s.key} className={`sfd-sub-tab ${resSection === s.key ? 'active' : ''}`} onClick={() => setResSection(s.key)}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {resSection === 'flow' && (
            <div className="sfd-section">
              <h2>🔄 状态流转图（共 5 种状态 · 9 条流转路径）</h2>
              <div className="flow-diagram-horizontal">
                <div className="flow-h-nodes">
                  {['提交预约', '预约确认中 (pending)', '预约成功 (accepted)', '预约失败-拒绝 (failed)', '预约失败-超时 (failed)', '预约已取消 (canceled)'].map((node, i) => (
                    <div key={i} className={`flow-h-node flow-h-node-${i}`}>
                      <span>{node}</span>
                    </div>
                  ))}
                </div>
                <svg className="flow-h-edges" viewBox="0 0 900 350">
                  {reservationFlowEdges.map((edge, i) => {
                    const yPositions = [30, 80, 130, 180, 230, 280, 300, 310, 320];
                    const y = yPositions[i] || 30 + i * 35;
                    return (
                      <g key={i}>
                        <line x1="80" y1={y} x2="820" y2={y} stroke={edge.color} strokeWidth="2" strokeDasharray={edge.dashed ? "6,4" : "none"} />
                        <polygon points={`820,${y} 812,${y - 4} 812,${y + 4}`} fill={edge.color} />
                        <text x="450" y={y - 5} textAnchor="middle" fill={edge.color} fontSize="11" fontWeight="500">{edge.label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="flow-legend">
                <span className="legend-item"><span className="legend-dot" style={{background: '#10b981'}}></span>正向流转</span>
                <span className="legend-item"><span className="legend-dot" style={{background: '#ef4444'}}></span>失败路径</span>
                <span className="legend-item"><span className="legend-dot" style={{background: '#6b7280'}}></span>用户取消</span>
                <span className="legend-item"><span className="legend-dot" style={{background: '#3b82f6', borderStyle: 'dashed'}}></span>重新预约</span>
              </div>
            </div>
          )}

          {resSection === 'states' && (
            <>
              <div className="sfd-section">
                <h2>📋 状态清单（共 {reservationStates.length} 种状态）</h2>
                <div className="state-list">
                  {reservationStates.map((state, idx) => (
                    <div key={state.key} className={`state-item ${selectedResState === idx ? 'selected' : ''}`} onClick={() => setSelectedResState(idx)}>
                      <div className="state-badge-wrap"><span className={`state-badge ${state.badgeClass}`}>{state.badgeText}</span></div>
                      <div className="state-info">
                        <div className="state-name">{idx + 1}. {state.name}</div>
                        <div className="state-desc">{state.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sfd-section">
                <h2>👁️ 状态实时预览：{reservationStates[selectedResState].name}</h2>
                <div className="preview-area">
                  <div className="preview-card">
                    <h3>预约信息卡片（AI对话内）</h3>
                    <div className="preview-container">
                      <ReservationInfoCard data={getReservationData(selectedResState)} now={now} onCancel={() => {}} onRebook={() => {}} />
                    </div>
                  </div>
                  <div className="preview-details">
                    <h3>状态详情</h3>
                    <div className="detail-grid">
                      <div className="detail-item"><span className="detail-label">状态枚举值</span><span className="detail-value code">{reservationStates[selectedResState].key}</span></div>
                      <div className="detail-item"><span className="detail-label">展示文案</span><span className="detail-value">{reservationStates[selectedResState].name}</span></div>
                      <div className="detail-item"><span className="detail-label">徽标文案</span><span className="detail-value">{reservationStates[selectedResState].badgeText}</span></div>
                      <div className="detail-item"><span className="detail-label">说明文案</span><span className="detail-value">{reservationStates[selectedResState].note}</span></div>
                      <div className="detail-item full"><span className="detail-label">可用操作</span><div className="action-tags">{reservationStates[selectedResState].actions.map((a, i) => (<span key={i} className="action-tag">{a}</span>))}</div></div>
                      <div className="detail-item full"><span className="detail-label">触发条件</span><span className="detail-value">{reservationStates[selectedResState].trigger}</span></div>
                      <div className="detail-item full"><span className="detail-label">自动流转</span><span className="detail-value">{reservationStates[selectedResState].autoTransition}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {resSection === 'ui' && (
            <div className="sfd-section">
              <h2>🎨 界面结构梳理</h2>
              
              <div className="ui-section">
                <h3>📝 预约面板 (ReservationPanel) - 11个区域 / 35+ UI元素</h3>
                <div className="ui-wireframe">
                  <div className="wireframe-header">
                    <div className="wireframe-success-bar">★ 近期98%用户成功预约本店</div>
                  </div>
                  <div className="wireframe-body">
                    <div className="wireframe-section">
                      <div className="wireframe-label">头部区域</div>
                      <div className="wireframe-row">
                        <div className="wireframe-block large"><span>帮我约<br/><small>提前约7日热门时间</small></span></div>
                        <div className="wireframe-block small"><span>✕</span></div>
                      </div>
                    </div>
                    <div className="wireframe-section">
                      <div className="wireframe-label">门店选择区</div>
                      <div className="wireframe-card">
                        <div className="wireframe-row">
                          <div className="wireframe-avatar"><span>海</span></div>
                          <div className="wireframe-block flex-1"><span>海底捞火锅(南山店)<br/><small>距你2.5km | 南山区...</small></span></div>
                          <div className="wireframe-block small"><span>切换</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="wireframe-section">
                      <div className="wireframe-label">日期选择区</div>
                      <div className="wireframe-tabs">
                        {['今天', '明天', '周三', '周四', '周五', '周六', '周日'].map((d, i) => (
                          <div key={i} className={`wireframe-tab ${i === 0 ? 'active' : ''}`}><span>{d}</span></div>
                        ))}
                      </div>
                    </div>
                    <div className="wireframe-section">
                      <div className="wireframe-label">时间段选择区</div>
                      <div className="wireframe-time-grid">
                        {Array.from({length: 8}).map((_, i) => (
                          <div key={i} className={`wireframe-time ${i === 3 ? 'busy' : ''} ${i === 5 ? 'active' : ''}`}>
                            <span>{9 + Math.floor(i/2)}:{i%2 === 0 ? '00' : '30'}</span>
                            <small>{i === 3 ? '繁忙' : '可约'}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="wireframe-section">
                      <div className="wireframe-row two-col">
                        <div className="wireframe-block flex-1"><span>到店人数</span></div>
                        <div className="wireframe-stepper"><span>− 4 +</span></div>
                      </div>
                      <div className="wireframe-row two-col">
                        <div className="wireframe-block flex-1"><span>联系电话</span></div>
                        <div className="wireframe-block small"><span>158****8127</span></div>
                      </div>
                    </div>
                    <div className="wireframe-tips">预约需商家确认，预约结果视门店繁忙程度决定...</div>
                  </div>
                  <div className="wireframe-footer">
                    <div className="wireframe-btn primary"><span>确定</span></div>
                  </div>
                </div>
              </div>

              <div className="ui-section">
                <h3>📋 UI元素清单 - 预约面板</h3>
                <div className="ui-element-list">
                  {reservationPanelUI.map((item, idx) => (
                    <div key={idx} className="ui-element-item">
                      <div className="ui-element-area">{idx + 1}. {item.area}</div>
                      <div className="ui-element-elements">
                        {item.elements.map((el, i) => (
                          <span key={i} className="ui-element-tag">{el}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ui-section">
                <h3>💬 预约信息卡片 (ReservationInfoCard) - 5个区域 / 20+ UI元素</h3>
                <div className="ui-card-demo">
                  <div className="ui-card-demo-left">
                    <h4>实时预览</h4>
                    <ReservationInfoCard data={getReservationData(selectedResState)} now={now} onCancel={() => {}} onRebook={() => {}} />
                  </div>
                  <div className="ui-card-demo-right">
                    <h4>状态对比（点击切换）</h4>
                    <div className="state-compare-tabs">
                      {reservationStates.map((s, i) => (
                        <button key={i} className={`state-compare-tab ${selectedResState === i ? 'active' : ''} ${s.badgeClass}`} onClick={() => setSelectedResState(i)}>
                          {s.name.split('-')[0]}
                        </button>
                      ))}
                    </div>
                    <div className="ui-element-list compact">
                      {reservationInfoCardUI.map((item, idx) => (
                        <div key={idx} className="ui-element-item compact">
                          <div className="ui-element-area small">{item.area}</div>
                          <div className="ui-element-elements">
                            {item.elements.slice(0, 3).map((el, i) => (
                              <span key={i} className="ui-element-tag small">{el.split(':')[0]}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {resSection === 'pages' && (
            <div className="sfd-section">
              <h2>📱 各页面表现</h2>
              <div className="page-matrix three-col">
                <div className="page-col">
                  <h4>🎨 预约面板 (ReservationPanel)</h4>
                  <div className="page-feature-list">
                    {[
                      { name: '门店选择+切换', desc: '4家模拟门店，底部Sheet切换' },
                      { name: '7天日期选择', desc: '今天/明天/周X格式展示' },
                      { name: '智能时间段生成', desc: '30分钟间隔，基于营业时间' },
                      { name: '繁忙/可约状态', desc: '繁忙态禁用可点击' },
                      { name: '人数增减器', desc: '最小1人，无上限' },
                      { name: '联系电话展示', desc: '脱敏手机号展示' },
                      { name: '预约须知提示', desc: '底部灰色说明文案' },
                      { name: '二次确认对话框', desc: '确认预约前弹窗确认' },
                      { name: '98%成功率展示', desc: '顶部悬浮成功提示条' },
                    ].map((f, i) => (
                      <div key={i} className="page-feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <div className="feature-name">{f.name}</div>
                          <div className="feature-desc">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="page-col">
                  <h4>💬 AI对话内 (ReservationInfoCard)</h4>
                  <div className="page-feature-list">
                    {[
                      { name: '状态标题+倒计时', desc: 'pending状态显示倒计时' },
                      { name: '4种状态徽标', desc: 'pending/accepted/failed/canceled' },
                      { name: '门店信息展示', desc: '名称+营业时间+头像' },
                      { name: '三列信息网格', desc: '时间/人数/电话' },
                      { name: '动态说明文案', desc: '5种状态对应5种文案' },
                      { name: '取消预约按钮', desc: 'pending/accepted状态显示' },
                      { name: '重新预约按钮', desc: 'failed/canceled状态显示' },
                      { name: '整卡片置灰效果', desc: 'canceled/failed时整体灰度' },
                    ].map((f, i) => (
                      <div key={i} className="page-feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <div className="feature-name">{f.name}</div>
                          <div className="feature-desc">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="page-col">
                  <h4>🏠 订单详情页 (OrderCenter)</h4>
                  <div className="page-feature-list">
                    {[
                      { name: '预约信息卡片', desc: '与AI内卡片样式一致' },
                      { name: '酒店预约流程', desc: '3步式：选日期→填信息→确认' },
                      { name: '景区预售预约', desc: '日期选择+游客信息填写' },
                      { name: '旅行预约流程', desc: '套餐选择+出行人信息' },
                      { name: '预约须知展示', desc: '详细预约规则说明' },
                      { name: '取消政策说明', desc: '不同阶段取消规则' },
                      { name: '预约人信息表单', desc: '姓名/手机号/身份证等' },
                      { name: '提交中状态', desc: 'loading按钮状态' },
                    ].map((f, i) => (
                      <div key={i} className="page-feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <div className="feature-name">{f.name}</div>
                          <div className="feature-desc">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {resSection === 'entries' && (
            <div className="sfd-section">
              <h2>🔌 入口 & 触发点（共 5 个）</h2>
              <div className="entry-grid">
                {[
                  { icon: '💬', name: 'AI对话 - 引导问题', desc: '"帮我约" / "提前预约免排队"快捷问题', location: 'AI助手聊天界面' },
                  { icon: '🃏', name: '功能卡片 (FeatureCard)', desc: 'reservation_form 类型功能卡片', location: 'AI对话消息流' },
                  { icon: '📋', name: '订单卡片操作按钮', desc: 'FullOrderCard 中的"提前预约免排队"按钮', location: '订单详情/订单列表' },
                  { icon: '🏠', name: '订单详情页', desc: '酒店/景区/旅行类订单的预约入口', location: '订单详情页主体区域' },
                  { icon: '🔄', name: '重新预约', desc: '失败/取消状态下的"重新预约"按钮', location: '预约信息卡片底部' },
                ].map((item, idx) => (
                  <div key={idx} className="entry-card">
                    <div className="entry-card-icon">{item.icon}</div>
                    <div className="entry-card-content">
                      <div className="entry-card-name">{item.name}</div>
                      <div className="entry-card-desc">{item.desc}</div>
                      <div className="entry-card-loc">📍 {item.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reminder' && (
        <div className="sfd-content">
          <div className="sfd-sub-tabs">
            {remSectionConfig.map((s) => (
              <button key={s.key} className={`sfd-sub-tab ${remSection === s.key ? 'active' : ''}`} onClick={() => setRemSection(s.key)}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {remSection === 'flow' && (
            <div className="sfd-section">
              <h2>🔄 状态流转图（共 6 种状态 · 8 条流转路径）</h2>
              <div className="flow-diagram-horizontal">
                <div className="flow-h-nodes">
                  {['无提醒', '设置面板', '提醒生效中 (active)', '修改提醒中', '提醒已取消 (canceled)', '订单已过期'].map((node, i) => (
                    <div key={i} className={`flow-h-node flow-h-node-rem-${i}`}>
                      <span>{node}</span>
                    </div>
                  ))}
                </div>
                <svg className="flow-h-edges" viewBox="0 0 900 300">
                  {reminderFlowEdges.map((edge, i) => {
                    const yPositions = [30, 70, 120, 160, 200, 240, 260, 275];
                    const y = yPositions[i] || 30 + i * 35;
                    return (
                      <g key={i}>
                        <line x1="80" y1={y} x2="820" y2={y} stroke={edge.color} strokeWidth="2" strokeDasharray={edge.dashed ? "6,4" : "none"} />
                        <polygon points={`820,${y} 812,${y - 4} 812,${y + 4}`} fill={edge.color} />
                        <text x="450" y={y - 5} textAnchor="middle" fill={edge.color} fontSize="11" fontWeight="500">{edge.label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="flow-legend">
                <span className="legend-item"><span className="legend-dot" style={{background: '#10b981'}}></span>正向流转</span>
                <span className="legend-item"><span className="legend-dot" style={{background: '#3b82f6'}}></span>修改操作</span>
                <span className="legend-item"><span className="legend-dot" style={{background: '#ef4444'}}></span>取消路径</span>
                <span className="legend-item"><span className="legend-dot" style={{background: '#6b7280'}}></span>过期自动</span>
              </div>
            </div>
          )}

          {remSection === 'states' && (
            <>
              <div className="sfd-section">
                <h2>📋 状态清单（共 {reminderStates.length} 种状态）</h2>
                <div className="state-list">
                  {reminderStates.map((state, idx) => (
                    <div key={state.key} className={`state-item ${selectedRemState === idx ? 'selected' : ''}`} onClick={() => setSelectedRemState(idx)}>
                      <div className="state-badge-wrap"><span className={`state-badge reminder-${state.cardType}`}>{state.name}</span></div>
                      <div className="state-info">
                        <div className="state-name">{idx + 1}. {state.name}</div>
                        <div className="state-desc">{state.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sfd-section">
                <h2>👁️ 状态实时预览：{reminderStates[selectedRemState].name}</h2>
                <div className="preview-area">
                  <div className="preview-card">
                    <h3>提醒卡片（AI对话内）</h3>
                    <div className="preview-container">
                      {getReminderData(selectedRemState) ? (
                        <RedeemReminderCard reminder={getReminderData(selectedRemState)!} productName="海底捞火锅(南山店) 4人餐" onCancel={() => {}} onModify={() => {}} onReset={() => {}} />
                      ) : (
                        <div className="no-card-placeholder">
                          <div className="placeholder-text">
                            <span className="placeholder-icon">
                              {reminderStates[selectedRemState].key === 'none' && '📝'}
                              {(reminderStates[selectedRemState].key === 'setting_sheet' || reminderStates[selectedRemState].key === 'modify') && '📋'}
                              {reminderStates[selectedRemState].key === 'expired' && '⌛'}
                            </span>
                            <p>{reminderStates[selectedRemState].name}</p>
                            <p className="placeholder-sub">{reminderStates[selectedRemState].description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="preview-details">
                    <h3>状态详情</h3>
                    <div className="detail-grid">
                      <div className="detail-item"><span className="detail-label">状态枚举值</span><span className="detail-value code">{reminderStates[selectedRemState].key}</span></div>
                      <div className="detail-item"><span className="detail-label">卡片类型</span><span className="detail-value">{reminderStates[selectedRemState].cardType || '-'}</span></div>
                      <div className="detail-item full"><span className="detail-label">触发条件</span><span className="detail-value">{reminderStates[selectedRemState].trigger}</span></div>
                      <div className="detail-item full"><span className="detail-label">自动流转</span><span className="detail-value">{reminderStates[selectedRemState].autoTransition}</span></div>
                      {(reminderStates[selectedRemState] as any).actions && (
                        <div className="detail-item full"><span className="detail-label">可用操作</span><div className="action-tags">{(reminderStates[selectedRemState] as any).actions.map((a: string, i: number) => (<span key={i} className="action-tag">{a}</span>))}</div></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {remSection === 'ui' && (
            <div className="sfd-section">
              <h2>🎨 界面结构梳理</h2>
              
              <div className="ui-section">
                <h3>📝 提醒设置面板 (RedeemReminderSheet) - 7个区域 / 30+ UI元素</h3>
                <div className="ui-wireframe reminder-wireframe">
                  <div className="wireframe-toast">使用提醒不可晚于有效期</div>
                  <div className="wireframe-body">
                    <div className="wireframe-section">
                      <div className="wireframe-row">
                        <div className="wireframe-block large"><span>设置使用提醒<br/><small>海底捞火锅(南山店) 4人餐</small></span></div>
                        <div className="wireframe-block small"><span>✕</span></div>
                      </div>
                    </div>
                    <div className="wireframe-section">
                      <div className="wireframe-expiry-card">
                        <div className="wireframe-row two-col">
                          <span>有效期至</span>
                          <span className="value">2026-07-31 23:59:59</span>
                        </div>
                        <div className="wireframe-row two-col">
                          <span>剩余时间</span>
                          <span className="value active">29天后过期</span>
                        </div>
                      </div>
                    </div>
                    <div className="wireframe-section">
                      <div className="wireframe-label">提前提醒天数</div>
                      <div className="wireframe-stepper-row">
                        <div className="wireframe-stepper-btn"><span>−</span></div>
                        <div className="wireframe-stepper-input"><span>3 <small>天后提醒</small></span></div>
                        <div className="wireframe-stepper-btn"><span>+</span></div>
                      </div>
                    </div>
                    <div className="wireframe-section">
                      <div className="wireframe-label">快捷选择</div>
                      <div className="wireframe-quick-grid">
                        {['本周五', '本周六', '本周日', '下周五', '下周六', '下周日'].map((d, i) => (
                          <div key={i} className={`wireframe-quick-option ${i === 2 ? 'active' : ''}`}>
                            <span className="day">{d}</span>
                            <span className="days">{i + 3}天后</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="wireframe-footer">
                    <div className="wireframe-btn primary"><span>确定</span></div>
                  </div>
                </div>
              </div>

              <div className="ui-section">
                <h3>📋 UI元素清单 - 提醒设置面板</h3>
                <div className="ui-element-list">
                  {reminderSheetUI.map((item, idx) => (
                    <div key={idx} className="ui-element-item">
                      <div className="ui-element-area">{idx + 1}. {item.area}</div>
                      <div className="ui-element-elements">
                        {item.elements.map((el, i) => (
                          <span key={i} className="ui-element-tag">{el}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ui-section">
                <h3>💬 提醒卡片 (RedeemReminderCard) - 2个区域 / 10+ UI元素</h3>
                <div className="ui-card-demo">
                  <div className="ui-card-demo-left">
                    <h4>实时预览（点击切换状态）</h4>
                    <div className="state-compare-tabs">
                      {reminderStates.filter(s => s.cardType === 'active' || s.cardType === 'canceled').map((s, i) => {
                        const realIdx = reminderStates.findIndex(r => r.key === s.key);
                        return (
                          <button key={i} className={`state-compare-tab ${selectedRemState === realIdx ? 'active' : ''} reminder-${s.cardType}`} onClick={() => setSelectedRemState(realIdx)}>
                            {s.name.slice(0, 4)}
                          </button>
                        );
                      })}
                    </div>
                    {getReminderData(selectedRemState) ? (
                      <RedeemReminderCard reminder={getReminderData(selectedRemState)!} productName="海底捞火锅(南山店) 4人餐" onCancel={() => {}} onModify={() => {}} onReset={() => {}} />
                    ) : (
                      <div className="no-card-placeholder small">
                        <p className="placeholder-sub">选择有卡片的状态查看预览</p>
                      </div>
                    )}
                  </div>
                  <div className="ui-card-demo-right">
                    <h4>UI元素清单</h4>
                    <div className="ui-element-list compact">
                      {reminderCardUI.map((item, idx) => (
                        <div key={idx} className="ui-element-item compact">
                          <div className="ui-element-area small">{item.area}</div>
                          <div className="ui-element-elements">
                            {item.elements.map((el, i) => (
                              <span key={i} className="ui-element-tag small">{el.split('（')[0]}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {remSection === 'pages' && (
            <div className="sfd-section">
              <h2>📱 各页面表现</h2>
              <div className="page-matrix three-col">
                <div className="page-col">
                  <h4>🎨 设置面板 (RedeemReminderSheet)</h4>
                  <div className="page-feature-list">
                    {[
                      { name: '商品名称展示', desc: '面板顶部展示对应商品' },
                      { name: '有效期信息', desc: '到期时间 + 剩余天数' },
                      { name: '已过期状态', desc: '整体变灰，按钮禁用' },
                      { name: '自定义天数', desc: '增减器 + 输入框双模式' },
                      { name: '快捷日期选项', desc: '本周五六日/下周五六日' },
                      { name: '超出有效期Toast', desc: '顶部提示，1.8秒自动消失' },
                      { name: '智能日期过滤', desc: '已过日期自动隐藏' },
                      { name: '最大天数限制', desc: '不超过订单有效期' },
                      { name: '默认3天', desc: '取min(3, 有效期剩余)' },
                    ].map((f, i) => (
                      <div key={i} className="page-feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <div className="feature-name">{f.name}</div>
                          <div className="feature-desc">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="page-col">
                  <h4>💬 AI对话内 (RedeemReminderCard)</h4>
                  <div className="page-feature-list">
                    {[
                      { name: '提醒图标', desc: '⏰ 生效中 / ⚠️ 已取消' },
                      { name: '状态标题', desc: '2种：生效中/已取消' },
                      { name: '日期+星期', desc: '具体月日 + 周几' },
                      { name: '商品名称', desc: '对应订单商品名' },
                      { name: '修改提醒时间', desc: 'active状态显示' },
                      { name: '取消提醒', desc: 'active状态显示' },
                      { name: '重新设置提醒', desc: 'canceled状态显示' },
                      { name: '已取消置灰', desc: 'canceled时整体灰度' },
                    ].map((f, i) => (
                      <div key={i} className="page-feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <div className="feature-name">{f.name}</div>
                          <div className="feature-desc">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="page-col">
                  <h4>🏠 订单详情页 (ReminderSettingSheet)</h4>
                  <div className="page-feature-list">
                    {[
                      { name: '独立设置面板', desc: '与AI内面板样式一致' },
                      { name: '有效期展示', desc: '详细有效期信息' },
                      { name: '天数选择器', desc: '增减器调整天数' },
                      { name: '快捷选项', desc: '周末快捷选择' },
                      { name: '取消提醒按钮', desc: '已设置提醒时显示' },
                      { name: '更新提醒按钮', desc: '修改后确认更新' },
                      { name: '订单卡片联动', desc: '设置后订单卡片显示状态' },
                      { name: '本地持久化', desc: 'localStorage存储' },
                    ].map((f, i) => (
                      <div key={i} className="page-feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <div className="feature-name">{f.name}</div>
                          <div className="feature-desc">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {remSection === 'entries' && (
            <div className="sfd-section">
              <h2>🔌 入口 & 触发点（共 5 个）</h2>
              <div className="entry-grid">
                {[
                  { icon: '💬', name: 'AI对话 - 引导问题', desc: '"订单使用提醒"快捷问题', location: 'AI助手聊天界面' },
                  { icon: '🃏', name: '功能卡片 (FeatureCard)', desc: 'redeem_reminder 类型功能卡片', location: 'AI对话消息流' },
                  { icon: '📋', name: '订单卡片操作按钮', desc: 'FullOrderCard 中的"订单使用提醒"按钮', location: '订单详情/订单列表' },
                  { icon: '🏠', name: '订单详情页', desc: '订单详情中的提醒设置入口', location: '订单详情页主体区域' },
                  { icon: '🔔', name: '气泡提醒 (Bubble)', desc: '从气泡点击进入，自动带入订单上下文', location: '全局悬浮气泡' },
                ].map((item, idx) => (
                  <div key={idx} className="entry-card">
                    <div className="entry-card-icon">{item.icon}</div>
                    <div className="entry-card-content">
                      <div className="entry-card-name">{item.name}</div>
                      <div className="entry-card-desc">{item.desc}</div>
                      <div className="entry-card-loc">📍 {item.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {remSection === 'logic' && (
            <div className="sfd-section">
              <h2>⚙️ 核心算法逻辑</h2>
              <div className="logic-grid">
                {[
                  { title: '快捷日期生成 (getQuickOptions)', desc: '智能生成周末快捷选项', rules: [
                    '本周选项：周五、周六、周日（按时间顺序）',
                    '下周选项：周五、周六、周日（始终显示）',
                    '过滤规则：本周已过去的日期（含今日）自动隐藏',
                    '提醒时间：默认统一设置为上午10:00',
                    '有效期约束：所有选项不超过订单有效期截止日',
                    '周日特殊处理：周日=0是JS一周第一天，业务上是本周最后一天',
                  ]},
                  { title: '有效期解析 (parseValidDate)', desc: '解析订单有效期字符串', rules: [
                    '支持"至"和"~"两种分隔符',
                    '开始时间：当日00:00:00',
                    '结束时间：当日23:59:59',
                    '解析失败返回null（容错处理）',
                  ]},
                  { title: '剩余天数计算 (getDaysUntilExpiry)', desc: '计算距离过期的天数', rules: [
                    '基于当前时间与有效期结束时间比较',
                    '向上取整（Math.ceil），不足1天算1天',
                    '已过期返回0',
                    '无有效期返回0',
                  ]},
                  { title: '到期状态文案 (formatExpiryStatusText)', desc: '智能生成到期描述', rules: [
                    '已过期："已过期"',
                    '今天过期："今天过期"（当天23:59:59前）',
                    '1天后过期："1天后过期"',
                    '其他："X天后过期"',
                  ]},
                  { title: '提醒文案格式化 (formatReminderText)', desc: '根据距今天数生成友好文案', rules: [
                    '今天："今天"',
                    '明天："明天"',
                    '后天："后天"',
                    '3-6天："X天后"',
                    '一周左右："下周X"',
                    '更远："X月X日"',
                  ]},
                  { title: '持久化存储 (localStorage)', desc: '提醒数据本地存储', rules: [
                    '存储key: ai_fulfillment_redeem_reminders',
                    '数据结构：Record<orderId, RedeemReminder>',
                    '支持订阅监听（subscribeReminders）',
                    '变更时自动通知所有订阅者',
                  ]},
                ].map((item, idx) => (
                  <div key={idx} className="logic-card">
                    <div className="logic-card-header">{item.title}</div>
                    <div className="logic-card-desc">{item.desc}</div>
                    <div className="logic-card-rules">
                      {item.rules.map((r, i) => (
                        <div key={i} className="logic-rule">
                          <span className="logic-rule-dot">•</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="sfd-footer">
        <p>📌 数据存储：预约状态由 AiAssistantProvider 管理（内存 + localStorage聊天历史）；提醒状态由 redeemReminder.ts 管理（localStorage持久化）</p>
      </div>
    </div>
  );
}

export default StatusFlowDemo;
