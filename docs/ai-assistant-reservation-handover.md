# AI 助手自然语言预约功能交接文档

> 版本：v3.x
> 日期：2026-07-05
> 模块：AI 助手 - 自然语言预约（NLU Reservation）

---

## 一、项目概述

### 1.1 模块定位

AI 助手自然语言预约功能是 AI 全景交互系统中的核心模块之一，用户通过自然语言对话即可完成订单预约全流程，无需跳转至订单详情页或预约面板。

### 1.2 技术栈

- **前端框架**：React 18 + TypeScript
- **状态管理**：React Context + useReducer（Provider 模式）
- **NLU 引擎**：本地自研，支持意图识别、实体提取、状态机对话管理
- **样式方案**：原生 CSS（aiAssistant.css）
- **数据存储**：localStorage（对话历史、手机号、预约记录）

### 1.3 涉及文件清单

| 文件路径 | 作用 | 改动程度 |
|---------|------|---------|
| `src/components/AiAssistant/nlu/handlers/reservationHandler.ts` | 预约处理器（核心逻辑） | 大幅重构 |
| `src/components/AiAssistant/nlu/entityExtractor.ts` | 实体提取器 | 功能增强 |
| `src/components/AiAssistant/nlu/nluEngine.ts` | NLU 引擎入口 | 小幅修改 |
| `src/components/AiAssistant/nlu/types.ts` | NLU 类型定义 | 类型扩展 |
| `src/components/AiAssistant/AiAssistantProvider.tsx` | 全局状态 Provider | 功能增强 |
| `src/components/AiAssistant/AiAssistantOverlay.tsx` | 助手浮层 UI | UI 扩展 |
| `src/components/AiAssistant/aiAssistant.css` | 全局样式 | 样式新增 |
| `src/components/AiAssistant/OrderSelectorOverlay.tsx` | 订单选择浮层 | 小幅扩展 |

---

## 二、核心架构

### 2.1 预约状态机

预约流程采用 6 步状态机管理，通过 `reservationStep` 字段标识当前步骤：

```
idle → selecting_order → validating_order → collecting_info → collecting_phone → confirming → completed
```

| 步骤 | reservationStep | 说明 |
|------|-----------------|------|
| 0 | `idle` | 空闲状态，未进入预约流程 |
| 1 | `selecting_order` | 等待用户选择订单 |
| 2 | `validating_order` | 校验订单是否可预约 |
| 3 | `collecting_info` | 收集日期、时间、人数 |
| 4 | `collecting_phone` | 确认/收集手机号 |
| 5 | `confirming` | 最终确认（第4步点击确认后直接跳过） |
| 6 | `completed` | 预约完成 |

> **注意**：当前第 4 步（collecting_phone）点击「确认」按钮后直接发起预约，跳过第 5 步最终确认。第 5 步逻辑保留，用于兜底场景。

### 2.2 数据流转

```
用户输入
    ↓
NLU Engine (processNluMessage)
    ├─ 意图识别 (recognizeIntent)
    ├─ 实体提取 (extractEntities)
    └─ 分发到对应处理器 (handleReservationIntent)
            ↓
    reservationHandler（状态机调度）
            ↓
    validateAndStartCollection（订单校验）
    handleReservationCollectInfo（信息收集）
    handleReservationCollectPhone（手机号确认）
    submitReservation（提交预约）
            ↓
    返回 NluResponse（消息 + 新状态）
            ↓
    sendNluResponse（渲染到 UI）
```

---

## 三、核心功能详解

### 3.1 订单可预约性校验

**入口函数**：`canOrderBeReserved(orderCard)`

**判断逻辑（两步法）**：

#### 第一步：订单状态判断

判断订单是否处于「待使用」状态，支持多字段兼容：

```typescript
function isOrderUnused(orderCard: any): boolean {
  // 优先级：mainStatus > orderStatus > statusText
  if (mainStatus === 'unused') return true;
  if (orderStatus === 'unused') return true;
  if (statusText === '待使用') return true;
  return false;
}
```

> **设计原因**：不同行业订单的状态字段不一致。
> - 餐饮订单：`orderStatus = 'unused'`
> - 酒店/景区订单：`mainStatus = 'unused'`，但 `orderStatus = 'to_book'`
> - 标签页过滤标准：`mainStatus === 'unused'`

#### 第二步：行业判断

```
综合行业（general） → ✅ 允许预约
餐饮行业（food）→ 检查核销方式
    ├─ 支持 self_order / delivery → ❌ 不允许
    └─ 仅 voucher（券码） → ✅ 允许
其他行业（酒店/景区/旅行社等） → ❌ 不允许
```

**行业判断辅助函数**：

| 函数 | 判定值（英文） | 判定值（中文标签） |
|------|---------------|-------------------|
| `isFoodCategory` | `food` | 餐饮、美食 |
| `isGeneralCategory` | `general` | 综合、休闲娱乐、丽人 |

**核销方式判断**：

检查字段：`redeemMethod`、`fulfillmentType`、`redeemTypes[]`

禁止值：`self_order`、`order`、`delivery`

#### 不通过提示文案

| 场景 | 提示文案 |
|------|---------|
| 状态不对 | `仅待使用订单支持预约，请选择其他订单` |
| 行业不对 | `该订单不支持预约，可选择正餐、休闲娱乐、丽人等订单预约` |

---

### 3.2 已有进行中预约前置检查

在 `validateAndStartCollection` 中，订单校验通过后，检查该订单是否已有进行中的预约：

```typescript
if (reservationsByOrder[orderId]) {
  const status = reservation.acceptStatus;
  if (status === 'pending' || status === 'accepted') {
    // 返回提示 + 预约卡片
  }
}
```

**状态映射**：
| 原始状态 | 显示文案 |
|---------|---------|
| `pending`（预约确认中） | `商家确认中` |
| `accepted`（预约成功） | `已预约成功` |

**完整文案**：`您的预约「{状态}」，可自行修改或取消预约`

**样式**：灰色（#86909c）+ 加粗（font-weight: 600），使用 `.ai-reservation-hint` 类名。

---

### 3.3 日期/时间/人数实体提取

**入口文件**：`entityExtractor.ts`

#### 支持的格式

**日期（extractDate）**：
- 相对时间：今天、明天、后天、大前天
- 汉字描述：五月一日、七月十号
- 数字格式：7.10、7/10、2026-07-10、2026.07.10
- 星期描述：周一、下周一、本周三

**时间（extractTime）**：
- 标准格式：11:00、18:30
- 汉字格式：三点十分、晚上七点、中午12点
- 混合格式：3点10分、14点、18.30
- 带空格：11 点 30 分

**人数（extractPeopleCount）**：
- 纯数字：3、5
- 数字+单位：3人、5位、5个
- 汉字描述：三人、五位
- 带空格：3 个人

**手机号（extractPhone）**：
- 正则：`/^1(3[0-9]|4[5-9]|5[0-35-9]|6[2567]|7[0-8]|8[0-9]|9[0-35-9])\d{8}$/`
- 支持主流手机号段（13x/14x/15x/16x/17x/18x/19x）

#### 校验规则

| 字段 | 规则 | 不通过处理 |
|------|------|-----------|
| 日期 | 未来 7 天内 | 提示可选日期列表 |
| 时间 | 09:00 - 22:30 | 提示可选时段 |
| 人数 | 1 - 10 人 | 提示人数范围 |

---

### 3.4 第 4 步（手机号确认）

这是预约流程的核心确认步骤，功能最丰富。

#### 展示内容

```
好的，您要预约【门店名】「日期」「时间」「人数」；是否留您的 135****0000 手机号进行预约？可回答是，如需变更手机号可直接输入

[确认]
```

- 门店名、日期、时间、人数全部加粗（`<strong>` 标签）
- 底部有「确认」快捷回复按钮
- 支持用户直接输入新信息进行修改

#### 支持的交互

1. **点击「确认」按钮** → 直接发起预约（跳过第 5 步）
2. **说"好的/对/是的"** → 直接发起预约
3. **输入新手机号** → 更新手机号，留在第 4 步重新确认
4. **输入新日期/时间/人数** → 更新对应字段，留在第 4 步重新确认
5. **同时修改多个字段** → 全部更新后重新确认

#### 手机号历史记忆

- 存储键：`ai_assistant_last_phone`
- 首次进入时读取，有历史则展示掩码确认
- 用户确认或输入新手机号后自动保存
- 掩码格式：中间 4 位 `****`（如 135****0000）

---

### 3.5 第 5 步（最终确认）

> 当前主流程已跳过此步骤（第 4 步确认后直接提交），但逻辑保留用于兜底。

展示完整预约信息供用户最终确认，支持在本步骤直接修改任意字段后重新确认。

---

### 3.6 预约提交与状态流转

#### 提交预约

调用 `submitReservation(entities, context)` 函数，生成预约信息卡片并返回。

#### 预约状态流转

```
用户确认 → pending（预约确认中/等待商家接单）
    ↓ 30 秒后（Mock 自动流转）
accepted（预约成功/商家已接单）
```

#### 倒计时机制

- 总倒计时：5 分钟（`acceptDeadlineAt`）
- 30 秒后自动接单（Mock 模拟）
- 倒计时每秒实时更新（通过 `now` state 驱动）
- 使用 `useEffect` 统一管理定时器，避免重复设置

#### 预约数据存储

- 存储位置：`reservationsByOrder`（以 orderId 为 key）
- 持久化：localStorage
- Provider 中通过 useEffect 监听变化，自动设置接单定时器

---

### 3.7 快捷回复按钮

#### 样式

- 右对齐（`justify-content: flex-end`）
- 自动换行（`flex-wrap: wrap`）
- 圆角 12px，字号 11px，灰色文字，白色背景
- hover/active 有视觉反馈

#### 常见快捷回复类型

| 按钮文案 | action | 触发逻辑 |
|---------|--------|---------|
| 选择订单 | `open_order_selector` | 打开订单选择浮层（默认待使用 tab） |
| 更换门店 | `open_reservation` | 打开帮我约浮层 |
| 自己预约 | `open_reservation` | 打开帮我约浮层 |
| 确认 | 无 | 发送"确认"文本，触发 NLU |
| 查看全部 | `open_reservation` | 打开帮我约浮层 |

---

### 3.8 订单选择浮层集成

#### 触发场景

1. 用户点击右下角「+」按钮 → 打开订单选择浮层
2. 快捷回复「选择订单」按钮 → 打开订单选择浮层（默认锚定「待使用」tab）

#### 订单选择后的行为

| 场景 | 行为 |
|------|------|
| 预约流程中 | 发送订单卡片 + 自动发送"帮我预约这个订单"触发校验 |
| 非预约流程 | 仅发送订单卡片，不自动触发预约 |

#### 技术实现

- 通过 `pendingOrderCardRef`（useRef）解决状态异步更新问题
- NLU 处理时优先从 ref 取最新订单卡片
- 确保订单卡片和 NLU 处理的是同一个订单

---

## 四、关键设计决策

### 4.1 为什么用 useRef 存待处理订单？

**问题**：React state 更新是异步的，`sendOrderCard` 后立即调用 `sendMessage`，`findLastOrderCard()` 可能还拿不到最新的订单。

**方案**：使用 `pendingOrderCardRef` 存储待处理订单，NLU 处理时优先从 ref 取值，使用后清空。

**优势**：绕过 React 状态更新的异步性和闭包问题，100% 确保订单卡片正确传递。

### 4.2 为什么 entities 要合并而不是覆盖？

**问题**：`nluEngine.ts` 中构建 `newContext` 时直接用 `entityMap` 覆盖 `dialogState.entities`，导致前一步设置的 `storeName`、`orderId` 等字段丢失。

**方案**：改为浅合并，保留旧值，新值覆盖同名字段。

```typescript
entities: {
  ...dialogState.entities,
  ...entityMap,
},
```

### 4.3 为什么第 4 步确认后直接发起预约？

**设计决策**：将第 5 步的最终确认合并到第 4 步，减少一次交互，提升效率。

**保留第 5 步的原因**：
- 兜底场景（如通过其他路径进入确认）
- 未来可能需要恢复两步确认
- 代码结构更清晰，便于维护

---

## 五、常见问题排查

### 5.1 订单选择后不触发预约校验？

**排查路径**：
1. 确认是否处于预约流程中（`currentIntent === 'reservation'`）
2. 检查 `pendingOrderCardRef` 是否正确设置
3. 检查 `canOrderBeReserved` 的返回值
4. 确认 `orderCard.mainStatus` 是否为 `'unused'`

### 5.2 行业判断不生效？

**排查路径**：
1. 打印 `orderCard.category` 和 `orderCard.categoryLabel`
2. 检查 `isFoodCategory` / `isGeneralCategory` 的判定结果
3. 餐饮订单检查 `redeemMethod` / `redeemTypes` 字段

### 5.3 实体提取不准确？

**排查路径**：
1. 时间和人数混在一起时，检查 extractTime 中的预处理逻辑是否正确移除了人数
2. 带空格的输入（如"3 个人"），检查正则是否支持 `\s*`
3. 日期识别失败时，检查 `parseDateValue` 的格式支持列表

### 5.4 预约信息不一致？

**排查路径**：
1. 检查 `entities` 是否在每一步正确传递和合并
2. 确认 `submitReservation` 使用的 entities 是最新的
3. 检查 localStorage 中的旧预约数据是否覆盖了新数据

---

## 六、版本迭代记录

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v3.0 | 2026-07-04 | 初始版本，6 步状态机预约流程 |
| v3.1 | 2026-07-05 | 修复订单识别、信息不一致、前置检查等问题 |
| v3.2 | 2026-07-05 | 实体识别增强、信息展示优化、字段加粗 |
| v3.3 | 2026-07-05 | 第 4 步交互优化、直接提交预约、倒计时优化 |
| v3.4 | 2026-07-05 | 订单可预约性校验逻辑重写、样式统一 |

---

## 七、后续优化建议

1. **多订单预约场景**：当前只支持单个订单的预约，可考虑支持批量预约
2. **预约修改/取消**：目前只支持在帮我约面板中修改，可增加自然语言修改支持
3. **时间推荐**：根据门店忙闲智能推荐最优预约时段
4. **异常处理**：增加网络异常、预约失败等场景的引导
5. **单元测试**：补充实体提取和状态机的单元测试，提升可维护性

---

## 八、联系人

- 产品：xxx
- 开发：xxx
- 测试：xxx

---

> 文档版本：v1.0
> 最后更新：2026-07-05
