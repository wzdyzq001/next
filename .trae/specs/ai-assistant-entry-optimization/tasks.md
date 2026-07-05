# AI 助手入口带入逻辑与聊天记录折叠优化 - Implementation Plan

## [x] Task 1: 重构 openAssistant 入口逻辑——订单卡片带入规则
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `AiAssistantProvider.tsx` 中的 `openAssistant` 函数，按入口来源区分订单卡片带入逻辑
  - 订单中心入口（`order_list`）：完全移除订单卡片带入逻辑，仅加载历史记录
  - 订单详情入口（`order_detail`）：保留订单同一性判断，不同则追加卡片，相同则不追加
  - 新增辅助函数：`findLastOrderCardOrderId(messages)` 用于获取最后一条订单卡片的 orderId
  - 订单中心入口虽然不带入卡片，但 `currentOrderId` 和 `orderContext` 仍需更新（如果有传入 orderId 的话）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: 从订单中心入口（无 orderId）打开 AI 助手，messages 数组长度与 localStorage 中历史记录长度一致（不新增）
  - `programmatic` TR-1.2: 从订单详情入口进入新订单，messages 末尾新增一条 orderCard 消息且 orderId 匹配
  - `programmatic` TR-1.3: 从订单详情入口重复进入同一订单，messages 数组长度不变
  - `human-judgement` TR-1.4: 订单卡片展示的状态、信息与订单详情页一致
- **Notes**: 注意 `currentOrderId` 和 `orderContext` 仍需更新，只是不发送新消息

## [x] Task 2: 实现带使用提醒订单的提醒卡片去重逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 `openAssistant` 中处理带活跃使用提醒的订单场景（适用于 `order_detail` 和有 orderId 的 `order_list` 入口）
  - 判断逻辑：通过 `getReminderByOrder(orderId)` 检查当前订单是否有活跃的使用提醒（status === 'active'）
  - 若有活跃提醒：检查最新 3 条消息内是否存在当前订单的使用提醒卡片（`redeemReminder` 存在且 `orderCard.id === orderId`）
  - 若不存在，则追加一条使用提醒卡片消息（带 orderCard 上下文）
  - 新增辅助函数：`hasReminderCardInLastN(messages, orderId, n)` 用于检查最近 N 条消息内是否有指定订单的提醒卡片
  - 在 `AiAssistantProvider` 中引入 `getReminderByOrder` 函数
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 最新 3 条消息内已有同订单提醒卡片时，进入不新增提醒卡片消息
  - `programmatic` TR-2.2: 最新 3 条消息内无同订单提醒卡片时，进入新增一条提醒卡片消息
  - `programmatic` TR-2.3: 第 4 条及更早的消息中有同订单提醒卡片时，仍视为"不存在"，需新增
  - `human-judgement` TR-2.4: 新带入的提醒卡片样式与现有提醒卡片一致

## [x] Task 3: 实现聊天记录折叠状态管理与持久化
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 `AiAssistantProvider.tsx` 中新增 `isHistoryCollapsed` 状态（boolean）
  - 新增 `toggleHistoryCollapsed` 方法
  - 新增折叠状态的 localStorage 持久化逻辑：
    - 存储 key：`ai_assistant_collapse_state`
    - 存储结构：`{ order_list: boolean, [orderId: string]: boolean }`
    - 分别记录订单中心入口和各订单详情入口的折叠状态
  - 在 `openAssistant` 中根据入口来源、订单变化和持久化状态计算初始折叠状态：
    - `order_list` 入口：优先读取持久化的 `order_list` 状态；若无持久化记录且消息数 > 2 条则默认折叠
    - `order_detail` 入口且为新订单：默认折叠（折叠订单卡片之前的所有历史消息）
    - `order_detail` 入口且为同订单：读取该订单的持久化折叠状态
  - 折叠状态变化时自动持久化到 localStorage
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8, AC-9
- **Test Requirements**:
  - `programmatic` TR-3.1: 订单中心入口首次进入且消息 > 2 条时，`isHistoryCollapsed` 初始为 true
  - `programmatic` TR-3.2: 订单中心入口且消息 ≤ 2 条时，`isHistoryCollapsed` 初始为 false
  - `programmatic` TR-3.3: 订单详情页新订单进入时，`isHistoryCollapsed` 初始为 true
  - `programmatic` TR-3.4: 订单详情页同订单重复进入时，`isHistoryCollapsed` 与持久化状态一致
  - `programmatic` TR-3.5: 手动切换折叠状态后，localStorage 中的值同步更新
- **Notes**: 折叠状态的持久化独立于聊天历史的持久化

## [x] Task 4: 实现消息列表折叠 UI 与展开交互
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - 修改 `AiAssistantOverlay.tsx` 中的消息列表渲染逻辑
  - 当 `isHistoryCollapsed` 为 true 时，根据入口来源计算可见消息范围：
    - 订单中心入口折叠：仅展示最后 2 条消息，折叠区域在消息列表顶部（折叠前 N-2 条）
    - 订单详情新订单折叠：找到本次带入的订单卡片消息位置，折叠该位置之前的所有消息，折叠区域在订单卡片上方
  - 折叠区域显示"还有 N 条历史消息"的提示文字，位于消息列表顶部
  - 点击折叠区域调用 `toggleHistoryCollapsed` 展开全部消息
  - 在 `aiAssistant.css` 中新增折叠区域样式（符合 Notion 风格、紧凑布局、文字灰色、点击有反馈）
  - 添加折叠/展开的平滑过渡动画
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-9, AC-10
- **Test Requirements**:
  - `programmatic` TR-4.1: 折叠状态下消息列表中仅渲染可见数量的消息元素
  - `programmatic` TR-4.2: 折叠区域显示正确的折叠条数
  - `programmatic` TR-4.3: 点击折叠区域后所有消息展开，折叠区域消失
  - `human-judgement` TR-4.4: 折叠区域样式与整体视觉风格一致，布局紧凑不突兀
  - `human-judgement` TR-4.5: 折叠/展开切换有平滑的过渡动画
  - `human-judgement` TR-4.6: 订单详情新订单折叠时，折叠区域在订单卡片上方（视觉上在历史消息和新订单卡片之间）

## [x] Task 5: 端到端功能验证与回归测试
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 验证所有入口场景的组合逻辑：
    - 订单中心 → 无历史/有历史/历史很多 → 折叠/展开 → 持久化
    - 订单详情 → 新订单/同订单 → 带卡片/不带卡片 → 折叠/展开 → 持久化
    - 有活跃使用提醒的订单 → 提醒卡片去重（已有/没有）
  - 回归验证：消息发送、浮层交互、订单选择器等现有功能不受影响
  - 验证移动端响应式布局下折叠区域展示正常
  - 验证折叠状态在刷新页面后保持一致
- **Acceptance Criteria Addressed**: AC-1 ~ AC-10
- **Test Requirements**:
  - `human-judgement` TR-5.1: 所有入口场景按需求正确执行
  - `human-judgement` TR-5.2: 现有功能无回归
  - `human-judgement` TR-5.3: 移动端布局正常
  - `human-judgement` TR-5.4: 刷新页面后折叠状态保持一致
- **Notes**: 建议在浏览器中手动测试所有主要场景
