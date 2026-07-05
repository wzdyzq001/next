# AI 助手自然语言交互 Demo - 实施计划

## [ ] Task 1: 自然语言意图识别引擎
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 实现关键词匹配的意图识别模块
  - 支持四大类意图识别：预约（帮我约）、提醒（订单使用提醒）、取餐码查询、配送进度查询
  - 每类意图配置关键词列表，支持模糊匹配
  - 提供统一的 `detectIntent(text)` 接口，返回意图类型和置信度
- **Acceptance Criteria Addressed**: AC-2, AC-7, AC-10, AC-14
- **Test Requirements**:
  - `programmatic` TR-1.1: 输入"帮我约一下"，返回 reservation 意图
  - `programmatic` TR-1.2: 输入"设置一个提醒"，返回 reminder 意图
  - `programmatic` TR-1.3: 输入"我的取餐码是多少"，返回 pickup_code 意图
  - `programmatic` TR-1.4: 输入"外卖送到哪了"，返回 delivery 意图
  - `human-judgement` TR-1.5: 边界情况测试（模糊输入、混合关键词）能正确识别主意图
- **Notes**: 建议使用独立模块 `nlu/intentDetector.ts`，便于后续替换为真实 NLP 服务

## [ ] Task 2: 多轮对话状态管理
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 AiAssistantProvider 中添加多轮对话状态（conversationFlow）
  - 支持当前流程类型、已收集字段、缺失字段的状态追踪
  - 支持流程启动、信息更新、流程完成、流程取消等操作
  - 每条消息处理时先判断是否在多轮对话中，再决定是继续流程还是新意图
- **Acceptance Criteria Addressed**: AC-3, AC-5, AC-9, AC-15
- **Test Requirements**:
  - `programmatic` TR-2.1: 启动预约流程后，状态中 flowType='reservation'
  - `programmatic` TR-2.2: 提供日期后，状态中 collectedFields 包含 date
  - `programmatic` TR-2.3: 所有字段收集完成后，自动触发完成回调
  - `human-judgement` TR-2.4: 用户发送无关消息时，能正确判断是继续流程还是切换意图
- **Notes**: 状态结构建议：{ flowType, step, collectedData, missingFields, orderId }

## [ ] Task 3: 自然语言日期/时间/人数解析
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 实现日期解析：支持"明天"、"后天"、"这周五"、"下周一"、"6月15号"等表达
  - 实现时间解析：支持"下午3点"、"15:30"、"3点半"等表达
  - 实现人数解析：支持"3个人"、"五位"、"两人"等表达
  - 提供统一的解析工具函数
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-3.1: parseDate("明天") 返回明天的日期对象
  - `programmatic` TR-3.2: parseDate("这周五") 返回本周五的日期
  - `programmatic` TR-3.3: parseTime("下午3点") 返回 "15:00"
  - `programmatic` TR-3.4: parsePeople("五位") 返回 5
  - `human-judgement` TR-3.5: 常见模糊表达能正确解析
- **Notes**: 独立模块 `nlu/dateParser.ts`，纯函数便于测试

## [ ] Task 4: 帮我约 - 自然语言交互流程
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 订单卡片展示时，根据场景显示预约引导提示（3+ 种模板）
  - 识别预约意图后，回复引导语 + "帮我约"快捷按钮
  - 多轮对话收集日期、时间、人数，缺失则追问
  - 日期/时间不可预约时，提示并展示可约选项
  - 信息收集完成后，自动调用现有 confirmReservation 生成预约卡片
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 订单卡片下方显示预约引导提示语
  - `human-judgement` TR-4.2: 说"我想预约"后，AI 回复引导语并显示"帮我约"按钮
  - `human-judgement` TR-4.3: 只说"明天"，AI 追问时间和人数
  - `human-judgement` TR-4.4: 完整回答后，自动生成预约卡片
  - `human-judgement` TR-4.5: 选择已过期时间，提示不可约并展示可约时间
- **Notes**: 复用现有的预约面板和预约卡片组件

## [ ] Task 5: 订单使用提醒 - 临期气泡提醒
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 实现临期气泡组件（长文案 → 短文案收起动画）
  - 订单卡片展示后，延迟 1.5 秒判断是否临期（≤7天）
  - 临期则弹出气泡，5 秒后自动收起为"临期提醒"
  - 点击气泡可展开查看详情
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 订单卡片展示 1.5 秒后，临期订单旁显示气泡提醒
  - `human-judgement` TR-5.2: 5 秒后气泡收起为"临期提醒"短标签
  - `human-judgement` TR-5.3: 点击短标签可重新展开
  - `human-judgement` TR-5.4: 非临期订单不显示气泡
- **Notes**: 气泡样式参考现有设计规范，新增到 OrderCardBase 组件旁

## [ ] Task 6: 订单使用提醒 - 自然语言交互流程
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 5, Task 7
- **Description**:
  - 订单临期时，AI 消息中额外增加提醒引导文案
  - 识别提醒意图后，回复引导语 + 快捷日期选项
  - 快捷选项生成逻辑：
    - 选项池：明天、后天、本周五/六/日、下周五/六/日、最后一天、过期前1天、过期前3天
    - 去重规则：日期重叠时保留优先级高的表达（明天/后天 > 本周X > 下周X）
    - 有效期过滤：超出订单有效期的选项自动过滤不展示
  - 校验提醒日期是否超过有效期，超期则提示并建议过期前一天
  - 用户确认后，调用现有 setReminder 生成提醒卡片
- **Acceptance Criteria Addressed**: AC-7, AC-8, AC-9
- **Test Requirements**:
  - `human-judgement` TR-6.1: 说"设置提醒"后，显示快捷日期选项
  - `human-judgement` TR-6.2: 点击"明天"快捷选项，自动设置明天提醒
  - `human-judgement` TR-6.3: 选择超过有效期的日期，提示超期并建议过期前一天
  - `human-judgement` TR-6.4: 确认后生成提醒卡片
  - `human-judgement` TR-6.5: 明天与本周五重叠时，只显示"明天"不显示"本周五"
  - `human-judgement` TR-6.6: 订单 2 天后过期，"下周五"等超出有效期的选项不展示
- **Notes**: 复用现有提醒设置和提醒卡片组件

## [ ] Task 7: 快捷选项组件（QuickOptions）
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 复用现有 quickReplies 样式和交互
  - 支持文本按钮横向排列/换行排列
  - 支持预设选项配置（文本、值、类型）
  - 点击选项自动发送对应消息
- **Acceptance Criteria Addressed**: AC-7, AC-12, AC-15
- **Test Requirements**:
  - `human-judgement` TR-7.1: 快捷选项正确展示配置的选项
  - `human-judgement` TR-7.2: 点击选项自动发送消息
  - `human-judgement` TR-7.3: 选项排列整齐美观
- **Notes**: 组件名 `QuickOptions.tsx`，放在 AiAssistant 组件目录下

## [ ] Task 8: 取餐码查询 - 无前置订单场景
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 识别取餐码意图且无前置订单时，查询待取餐订单
  - 找到1个：回复文案 + 发送订单卡片（含取餐码）
  - 找到多个：展示多个简化订单卡片（仅基础信息+取餐码）
  - 未找到：回复提示 + "选择订单"按钮
  - "选择订单"按钮点击拉起订单选择浮层
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `human-judgement` TR-8.1: 无订单时说"取餐码"，查询后展示对应结果
  - `human-judgement` TR-8.2: 有多个待取餐订单时，展示多个简化卡片
  - `human-judgement` TR-8.3: 点击"选择订单"按钮能拉起订单选择浮层
- **Notes**: 复用现有订单选择浮层和 CompactOrderCard 组件

## [ ] Task 9: 取餐码查询 - 有前置订单场景
- **Priority**: high
- **Depends On**: Task 1, Task 7
- **Description**:
  - 有前置订单卡片时，判断订单类型和状态
  - 非餐饮：提示无取餐码 + "选择订单"按钮
  - 餐饮 + 取消/退款状态：提示无取餐码 + "选择订单"按钮
  - 餐饮 + 待使用：
    - 仅券码核销：提示 + "查看券码"按钮
    - 支持点单核销：提示 + "是否点单" 是/否选项；选择"是"则调用 placeOrder 模拟点单流程（待使用 → 已确认 → 备餐中 → 展示取餐码）
    - 仅配送：提示 + "是否预约配送" 是/否选项；选择"是"则调用 startDelivery 模拟配送流程
  - 餐饮 + 已完成：
    - 券码核销（抖音端内）：提示无取餐码 + "选择订单"按钮
    - 券码核销（端外，商家App/微信小程序）：提示"没有找到取餐码，如果在商家App/微信小程序核销，可通过原渠道查找取餐码"
    - 点单核销：展示取餐码 + 取餐进度
    - 配送核销：提示配送订单 + 配送进度
- **Acceptance Criteria Addressed**: AC-11, AC-12, AC-13
- **Test Requirements**:
  - `human-judgement` TR-9.1: 非餐饮订单查询取餐码，提示并显示"选择订单"
  - `human-judgement` TR-9.2: 餐饮待使用+仅券码，提示并显示"查看券码"
  - `human-judgement` TR-9.3: 餐饮已完成+点单核销，展示取餐码和进度
  - `human-judgement` TR-9.4: 餐饮已完成+配送核销，展示配送进度
  - `human-judgement` TR-9.5: 餐饮已完成+券码核销（端外），提示通过原渠道查找取餐码
- **Notes**: 复用现有取餐码展示和配送进度组件

## [ ] Task 10: 配送进度查询
- **Priority**: medium
- **Depends On**: Task 1, Task 9
- **Description**:
  - 识别配送查询意图（配送、物流、送到哪了、骑手等）
  - 参考取餐码查询逻辑，区分有无前置订单卡片
  - 有配送中订单时，展示配送进度（进度条、骑手信息、预计送达）
  - 无配送订单时，引导用户选择订单或提示
- **Acceptance Criteria Addressed**: AC-14
- **Test Requirements**:
  - `human-judgement` TR-10.1: 配送中订单查询配送，展示进度条和骑手信息
  - `human-judgement` TR-10.2: 非配送订单查询配送，引导选择订单
  - `human-judgement` TR-10.3: 无前置订单时查询配送，查询并展示结果
- **Notes**: 复用现有配送进度展示组件（OrderCardExtension 中的 delivery progress）

## [ ] Task 11: 集成测试与体验优化
- **Priority**: medium
- **Depends On**: Task 4, Task 6, Task 8, Task 9, Task 10
- **Description**:
  - 完整走通四大功能的所有分支流程
  - 优化 AI 回复延迟（模拟 300-800ms 思考时间）
  - 添加状态变更的视觉反馈
  - 确保所有快捷按钮可点击且响应正确
  - 修复发现的交互问题
- **Acceptance Criteria Addressed**: AC-1 ~ AC-15
- **Test Requirements**:
  - `human-judgement` TR-11.1: 帮我约完整流程可走通
  - `human-judgement` TR-11.2: 订单使用提醒完整流程可走通
  - `human-judgement` TR-11.3: 取餐码查询各分支可走通
  - `human-judgement` TR-11.4: 配送进度查询各分支可走通
  - `human-judgement` TR-11.5: 整体交互流畅自然，无明显卡顿
- **Notes**: 这是最终的集成测试和体验优化
