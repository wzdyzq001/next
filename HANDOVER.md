# AI 智能助手 V2.1 项目交接文档

> 版本：v2.1.0  
> 更新时间：2026-07-02  
> 项目名称：团小帮 AI 智能助手 · 生活服务订单中心

---

## 一、项目概述

### 1.1 项目定位
「团小帮」是生活服务订单中心的 AI 智能助手，基于自然语言对话，为用户提供订单全生命周期的陪伴式服务，覆盖预约、使用提醒、取餐码查询、配送进度查询、退款协助等核心场景。

### 1.2 技术栈

| 类别 | 技术选型 | 版本 |
|------|----------|------|
| 框架 | React | 18.3.1 |
| 语言 | TypeScript | 5.5.3 |
| 构建工具 | Vite | 5.4.0 |
| 测试框架 | Vitest + @testing-library/react | 4.1.9 |
| 二维码 | qrcode | 1.5.4 |

### 1.3 目录结构

```
src/
├── components/AiAssistant/          # AI 助手核心组件
│   ├── AiAssistantProvider.tsx      # 全局状态管理（Context + Provider）
│   ├── AiAssistantOverlay.tsx       # 助手浮层 UI
│   ├── types.ts                     # 类型定义
│   ├── constants.ts                 # 常量配置
│   ├── api.ts                       # API 请求封装
│   ├── useWebSocket.ts              # WebSocket 连接管理
│   ├── orderDataAdapter.ts          # 订单数据适配器
│   ├── FeatureCard/                 # 功能操作卡片（交互型）
│   │   ├── ReservationFeatureCard.tsx     # 帮我约预约卡片
│   │   ├── RedeemReminderFeatureCard.tsx  # 订单使用提醒卡片
│   │   ├── VoucherCodeCard.tsx            # 券码卡片
│   │   ├── RefundApplyCard.tsx            # 退款申请卡片
│   │   ├── ReorderCard.tsx                # 再来一单卡片
│   │   ├── UrgentRequestCard.tsx          # 催单卡片
│   │   ├── GuideCard.tsx                  # 攻略卡片
│   │   ├── FeatureCardRenderer.tsx        # 卡片渲染器
│   │   └── types.ts                       # FeatureCard 类型
│   ├── OrderCard/                   # 订单卡片组件
│   │   ├── FullOrderCard.tsx             # 完整订单卡片
│   │   ├── CompactOrderCard.tsx          # 紧凑订单卡片
│   │   ├── OrderCardBase.tsx             # 订单卡片基础信息
│   │   ├── OrderCardExtension.tsx        # 订单卡片扩展区
│   │   ├── OrderCardActions.tsx          # 订单卡片操作按钮
│   │   ├── OrderCardSuggestions.tsx      # 订单卡片建议操作
│   │   └── orderCardTypes.ts             # 订单卡片类型
│   ├── ReservationInfoCard.tsx       # 预约结果信息卡片
│   ├── ReservationPanel.tsx          # 预约时间选择浮层
│   ├── RedeemReminderCard.tsx        # 提醒结果信息卡片
│   ├── RedeemReminderSheet.tsx       # 提醒设置浮层
│   ├── VoucherCodeSheet.tsx          # 券码展示浮层
│   ├── OrderSelectorOverlay.tsx      # 订单选择器
│   ├── ConfirmDialog.tsx             # 二次确认弹窗
│   └── aiAssistant.css               # 主样式文件
├── App.tsx                          # 应用入口
├── OrderCenter.tsx                  # 订单中心页面
├── InteractionMap.tsx               # 全景交互图 DEMO
├── FeatureDemo.tsx                  # 功能演示页面
├── StatusFlowDemo.tsx               # 状态流转演示
├── mock.ts                          # Mock 数据
├── redeemReminder.ts                # 提醒工具函数
├── categoryMapping.ts               # 类目映射
├── types.ts                         # 全局类型定义
├── styles.css                       # 全局样式
└── main.tsx                         # React 入口
```

---

## 二、核心架构

### 2.1 状态管理

项目采用 **React Context API** 进行全局状态管理，核心是 `AiAssistantProvider`。

**状态分层：**
- **UI 状态**：浮层模式（全屏/最小化/关闭）、各种 Sheet/Panel 开关状态
- **会话状态**：消息列表、会话上下文、Session ID
- **业务状态**：当前订单、预约状态、提醒状态
- **系统状态**：降级级别、WebSocket 连接状态、Toast 提示

**关键持久化（localStorage）：**
| Key | 用途 |
|-----|------|
| `ai_assistant_chat_history` | 聊天历史消息 |
| `ai_assistant_reservations` | 预约状态（按订单维度） |
| `ai_assistant_collapse_state` | 历史消息折叠状态 |
| `ai_assistant_last_entry` | 上次进入来源 |
| `ai_fulfillment_redeem_reminders` | 订单使用提醒设置 |

### 2.2 数据流向

```
用户操作 → AiAssistantContext 方法 → 状态更新 → UI 重渲染
                                    ↓
                              持久化到 localStorage
```

**核心原则：**
- `reservationsByOrder` 是预约状态的唯一事实来源（Single Source of Truth）
- 打开助手时，从 localStorage 读取最新状态同步到消息列表
- 订单页与 AI 助手通过 localStorage 实现跨页面状态同步

---

## 三、四大核心功能模块

### 3.1 帮我约（预约功能）

**功能说明：** 用户通过自然语言或操作按钮发起预约，选择日期、时段、人数、联系电话，完成预约下单。

**状态流转：**
```
pending（预约中）→ accepted（预约成功）
                 → failed（预约失败）
                 → canceled（已取消）
```

**核心组件：**
| 组件 | 用途 |
|------|------|
| `ReservationFeatureCard` | 预约操作表单卡片（日期 Tab、时段网格、人数步进器、电话输入） |
| `ReservationPanel` | 预约时间选择浮层（从订单页唤起） |
| `ReservationInfoCard` | 预约结果展示卡片（展示预约详情） |

**关键逻辑：**
- 当日已过时段自动过滤并隐藏，保持界面整洁
- 日期 Tab 自动切换，当天无可用时段时自动隐藏"今天"
- 防重复提交：已有进行中预约时，弹出 Toast 提示
- 取消预约需二次确认，文案包含"取消预约后可能约不到热门时间"
- 预约状态通过 localStorage 持久化，订单页与 AI 助手双向同步

### 3.2 订单使用提醒

**功能说明：** 用户可设置订单到期提醒，支持快捷日期选择和自定义提前天数。

**状态流转：**
```
none（未设置）→ active（已设置提醒）
             → canceled（已取消提醒）
             → expired（已过期）
```

**核心组件：**
| 组件 | 用途 |
|------|------|
| `RedeemReminderFeatureCard` | 提醒设置卡片（快捷日期选项、自定义天数） |
| `RedeemReminderSheet` | 提醒设置浮层（从订单页唤起） |
| `RedeemReminderCard` | 提醒结果展示卡片 |

**关键逻辑：**
- 快捷日期选项去重规则：明天/后天 > 本周X > 下周X（重叠时优先展示前者）
- 有效期过滤：所有选项不得超过订单支付有效期
- 临期提醒气泡：订单卡片弹出后延迟 1.5s 触发，5s 后自动收起，临期阈值 7 天
- 提醒数据通过 localStorage 持久化（`ai_fulfillment_redeem_reminders`）

### 3.3 取餐码查询

**功能说明：** 用户查询订单取餐码，根据订单状态和履约方式返回不同结果。

**判断逻辑：**
```
订单状态
├── 待确认 → 询问是否需要立即点单
│          └── 是 → 模拟点单流程 → 生成取餐码
├── 备餐中/待取餐 → 展示取餐码
├── 已完成
│   ├── 点单核销 → 展示取餐码
│   ├── 券码核销
│   │   ├── 端内核销 → 展示券码
│   │   └── 端外核销 → 提示"通过原渠道查找取餐码"
│   └── 配送核销 → 展示配送完成信息
└── 其他状态 → 提示无法查询
```

**核心组件：**
- `FullOrderCard` + `extension.type = 'pickup_code'` 展示取餐码
- `VoucherCodeSheet` 券码大图展示（含二维码）

### 3.4 配送进度查询

**功能说明：** 用户查询订单配送进度，模拟配送全流程。

**判断逻辑：**
```
订单状态
├── 待确认 → 询问是否需要立即配送
│          └── 是 → 模拟配送流程 → 实时更新进度
├── 配送中 → 展示配送进度时间轴
├── 已完成 → 展示配送完成信息
└── 其他状态 → 提示无法查询
```

**核心组件：**
- `FullOrderCard` + `extension.type = 'progress'` 展示配送进度
- `extension.type = 'delivery_completed'` 展示配送完成

---

## 四、Mock 模拟流程

### 4.1 点单模拟（placeOrder）
**路径：** `AiAssistantProvider.tsx` → `placeOrder`

**状态流转：**
```
待确认 → 备餐中（1.5s）→ 待取餐（2s，生成取餐码）→ 已完成（2.5s）
```

**视觉反馈：**
- 状态变更时卡片脉冲缩放动画（`statusPulse` keyframes）
- 每个阶段 AI 自动发送进度提示消息

### 4.2 配送模拟（startDelivery）
**路径：** `AiAssistantProvider.tsx` → `startDelivery`

**状态流转：**
```
待确认 → 配送中（1.5s）→ 骑手已取餐 → 配送中 → 已送达（2.5s）
```

**扩展字段：**
- `deliveryRiderName`：骑手姓名
- `deliveryDistance`：配送距离
- `deliveryEta`：预计送达时间

---

## 五、订单卡片体系

### 5.1 卡片类型

| 类型 | 组件 | 使用场景 |
|------|------|----------|
| 完整订单卡片 | `FullOrderCard` | AI 对话中展示订单详情 |
| 紧凑订单卡片 | `CompactOrderCard` | 订单选择器、历史消息折叠展示 |
| 功能操作卡片 | `*FeatureCard` | 预约、提醒等交互操作 |
| 结果信息卡片 | `*InfoCard` / `*Card` | 展示已确认的结果 |

### 5.2 FullOrderCard 四层结构

```
FullOrderCard
├── OrderCardBase        # 基础信息（缩略图、标题、标签、价格、状态）
├── OrderCardExtension   # 扩展区（取餐码/配送进度/酒店信息等）
├── OrderCardActions     # 操作按钮区
└── OrderCardSuggestions # 建议操作区（引导用户下一步操作）
```

### 5.3 扩展区类型（extension.type）
| 类型 | 说明 |
|------|------|
| `pickup_code` | 取餐码 |
| `progress` | 配送进度时间轴 |
| `delivery_completed` | 配送完成 |
| `hotel_stay` | 酒店入住信息 |
| `scenic_entry` | 景区入园信息 |
| `payment_countdown` | 支付倒计时 |
| `refund` | 退款进度 |
| `refund_success` | 退款成功 |
| `travel_info` | 出行信息 |

---

## 六、交互设计要点

### 6.1 多轮对话中断机制
- 用户发送无关消息时，**不中断原流程**，按新意图响应
- Agent 自行回复无关消息，保持对话自然

### 6.2 动画与反馈
- 状态变更脉冲动画：`statusPulse`（0.3s 放大 1.02 倍再回弹）
- Toast 全局提示：`showToast` 函数（顶部滑入，2s 后消失）
- 气泡延迟出现：临期提醒在订单卡片展示 1.5s 后弹出

### 6.3 UI 对齐规范
- 助手面板宽度与订单页严格 1:1 对齐（390px）
- 卡片圆角 12px，按钮圆角 8px
- 快捷选项按钮间距 6px

---

## 七、全景交互图 DEMO

### 7.1 功能说明
`InteractionMap.tsx` 是全场景交互预览工具，用于在开发前验证 4 大模块共 23 个场景的逻辑。

### 7.2 模块与场景
| 模块 | 场景数 | 典型场景 |
|------|--------|----------|
| 帮我约 | 5 | 预约提示展示、信息收集、日期校验、生成预约卡片 |
| 订单使用提醒 | 5 | 临期提醒气泡、快捷日期选项、生成提醒卡片 |
| 取餐码查询 | 7 | 待确认时点单、备餐中取餐码、端外核销提示 |
| 配送进度查询 | 6 | 待确认时配送、配送中进度、配送完成 |

### 7.3 页面结构
- 顶部 Header：标题 + 4 个模块统计卡片
- 左侧 Sidebar：可折叠的模块场景导航树
- 右侧 Preview：场景标题、用户操作路径、系统响应逻辑、交互预览区

---

## 八、已知问题与注意事项

### 8.1 TypeScript 类型错误
项目中存在若干 TypeScript 类型错误（`tsc -b` 不通过），但不影响 Vite 构建和运行。主要集中在：
- `AiAssistantOverlay.tsx`：类型不匹配
- `AiAssistantProvider.tsx`：类型定义不一致
- 测试文件：`vi` 未声明

**处理方式：** 使用 `npx vite build` 验证构建，不使用 `npm run build`（包含 tsc 检查）。

### 8.2 缩略图渲染 Bug
**已修复：** 订单卡片缩略图原直接渲染 URL 字符串到 div 中，导致页面显示乱码。已改为 `<img>` 标签渲染。

**涉及文件：**
- `OrderCardBase.tsx`
- `CompactOrderCard.tsx`
- `orderCard.css`（新增 `.oc-card-thumb-img` / `.oc-compact-thumb-img` 样式）

### 8.3 API 服务依赖
- API 基础地址：`http://localhost:3001/api`
- WebSocket 地址：`ws://localhost:3001/ws`
- 默认无后端服务时，控制台会报 `ERR_CONNECTION_REFUSED`，不影响 Mock 数据运行

---

## 九、开发与调试

### 9.1 常用命令
```bash
# 启动开发服务器
npm run dev

# 构建生产版本（仅 vite，跳过类型检查）
npx vite build

# 运行测试
npm run test
```

### 9.2 调试入口
- `App.tsx` 中默认展示全景交互图（`showInteractionMap = true`）
- 点击右上角「📋 订单中心」可切换到订单中心页面
- 订单中心页面右下角有「团小帮」悬浮按钮，点击打开 AI 助手

### 9.3 Mock 数据
- Mock 数据集中在 `src/mock.ts`
- 全景交互图 Mock 数据在 `src/InteractionMap.tsx` 中
- 订单数据必须包含字段：`productType`、`orderStatus`、`payExpireAt`、`storeName`

---

## 十、关键文件速查

| 功能 | 文件路径 |
|------|----------|
| 全局状态管理 | [AiAssistantProvider.tsx](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/components/AiAssistant/AiAssistantProvider.tsx) |
| 助手 UI 浮层 | [AiAssistantOverlay.tsx](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/components/AiAssistant/AiAssistantOverlay.tsx) |
| 类型定义 | [types.ts](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/components/AiAssistant/types.ts) |
| 常量配置 | [constants.ts](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/components/AiAssistant/constants.ts) |
| 预约功能卡片 | [ReservationFeatureCard.tsx](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/components/AiAssistant/FeatureCard/ReservationFeatureCard.tsx) |
| 提醒功能卡片 | [RedeemReminderFeatureCard.tsx](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/components/AiAssistant/FeatureCard/RedeemReminderFeatureCard.tsx) |
| 完整订单卡片 | [FullOrderCard.tsx](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/components/AiAssistant/OrderCard/FullOrderCard.tsx) |
| 提醒工具函数 | [redeemReminder.ts](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/redeemReminder.ts) |
| 全景交互图 DEMO | [InteractionMap.tsx](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/InteractionMap.tsx) |
| 订单中心页面 | [OrderCenter.tsx](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/OrderCenter.tsx) |
| Mock 数据 | [mock.ts](file:///Users/bytedance/Downloads/AI智能助手V2.1/src/mock.ts) |

---

## 十一、后续迭代建议

1. **TypeScript 类型修复：** 逐步修复现有类型错误，确保 `tsc -b` 正常通过
2. **真实接口对接：** 当前 Mock 模拟完整流程，后续需对接真实后端 API
3. **单元测试覆盖：** 补充核心业务逻辑的单元测试（预约、提醒、状态流转）
4. **性能优化：** 大体积代码拆包，首屏加载优化
5. **多端适配：** 当前按 390px 移动端宽度设计，后续可考虑响应式适配

---

*本文档由 AI 助手生成，如有疑问请查阅对应代码文件。*
