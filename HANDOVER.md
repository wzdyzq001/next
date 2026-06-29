# 景区日历票订单详情页 - 交接文档

## 一、项目概述

**项目名称**：AI 智能助手 V2.0（抖音本地生活订单中心模拟项目）
**技术栈**：React 18 + TypeScript + Vite
**开发服务器**：`http://localhost:5174/`
**当前任务**：景区日历票（calendar_ticket）订单详情页已完成开发和全状态验证

## 二、项目结构

```
src/
├── App.tsx                  # 应用入口，路由/状态管理
├── main.tsx                 # React挂载入口
├── OrderCenter.tsx          # 订单中心主组件（列表+详情，核心文件 ~2800行）
├── UnifiedOrderCard.tsx     # 订单列表卡片组件
├── types.ts                 # TypeScript类型定义
├── mock.ts                  # Mock数据（订单列表+详情fetchOrderById）
├── styles.css               # 全局样式
├── categoryMapping.ts       # 订单分类映射
├── hotelOrderState.ts       # 酒店订单状态管理
├── orderListPositionMemory.ts # 列表滚动位置记忆
└── redeemReminder.ts        # 核销提醒功能
```

## 三、已实现的业务线

本项目模拟抖音本地生活订单中心，已实现以下商品类型的订单详情页：

| 商品类型 | 标识字段 | 设计状态变量 | 状态数 |
|---------|---------|------------|-------|
| 餐饮/玩乐（团购外卖） | category: 'food'/'general' | （默认通用） | 5+ |
| 酒店预售券 | hotelProductType: 'presale_voucher' | `isHotelPresaleDesignState` | 8 |
| 酒店日历房 | hotelProductType: 'calendar_room' | `isHotelCalendarDesignState` | 8 |
| **景区团购票** | scenicProductType: 'group_buy' | `isScenicGroupBuyDesignState` | 8 |
| **景区日历票** ✅ | scenicProductType: 'calendar_ticket' | `isScenicCalendarDesignState` | 8 |

## 四、景区日历票实现详情

### 4.1 8种订单状态

| 状态 | statusText | 标志位 | 订单ID (mock) |
|------|-----------|--------|--------------|
| 待支付 | '待支付' | `isScenicCalendarPaying` | SC2026062800201 |
| 预订确认中 | '预订确认中' | `isScenicCalendarConfirming` | SC2026062800202 |
| 预订成功 | '预订成功' | `isScenicCalendarConfirmed` | SC2026062800203 |
| 已使用(交易完成) | '已使用' | `isScenicCalendarVisited` | SC2026062800204 |
| 订单取消 | '订单取消' | `isScenicCalendarCanceled` | SC2026062800205 |
| 退款申请中 | '退款申请中' | `isRefunding`（复用） | SC2026062800206 |
| 退款成功 | '退款成功' | `isRefunded`（复用） | SC2026062800207 |
| 退款失败 | '退款失败' | `isRefundFailed`（复用） | SC2026062800208 |

### 4.2 关键代码位置（OrderCenter.tsx）

**状态标志位定义**（L1310-1316）：
```ts
const isScenicCalendarDesignState = scenicOrder && listItem.scenicProductType === 'calendar_ticket';
const isScenicCalendarPaying = isScenicCalendarDesignState && isUnpaid;
const isScenicCalendarConfirming = isScenicCalendarDesignState && displayStatusText === '预订确认中';
const isScenicCalendarConfirmed = isScenicCalendarDesignState && displayStatusText === '预订成功';
const isScenicCalendarVisited = isScenicCalendarDesignState && displayStatusText === '已使用';
const isScenicCalendarCanceled = isScenicCalendarDesignState && displayStatusText === '订单取消';
const isScenicCalendarRefundRelated = isScenicCalendarDesignState && (isRefunded || isRefunding || isRefundFailed);
```

**状态副标题**（L1373-1383）：`scenicCalendarStatusSubtitle` 函数，为8种状态定义了副标题文案。

**底部操作按钮**（L1420-1443）：`bottomActions` 中日历票分支。注意：
- 待支付返回 `[]`（支付按钮在底部固定栏通过 `isScenicCalendarPaying` 条件渲染）
- 预订确认中"申请退款"按钮带 `disabled: true`
- 退款相关状态复用 `isRefunded/isRefunding/isRefundFailed` 标志位

**JSX模板**（L2091-2400）：`{isScenicCalendarDesignState && (...)}` 块，包含：
1. `scenic-ticket-group` 门票组：
   - 商品卡（scenic-cal-product-card）：使用日期橙色高亮 + 票种/座位等级 + 规则标签
   - 凭证区：
     - 预订确认中：灰色占位（scenic-cal-voucher-placeholder）"凭证将在出票成功后展示"
     - 预订成功/已使用：QR码轮播 + 证件信息 + 券号
   - 入园信息（仅待支付/确认中/预订成功显示）：入园时间/地址/有效期/次数
   - 退改规则
   - 展开全部（取消/退款态使用 `.scenic-ticket-seamless` 无缝衔接）
2. 退款记录卡（退款三态显示）
3. 评价引导卡（仅已使用状态）
4. 适用景区(门店)卡片：故宫博物院 + 文博院馆/5A景区标签
5. NPS推荐度卡片（已使用/取消/退款状态显示）
6. 金额信息卡（已使用状态加 `scenic-cal-pay-flat` 类实现flat样式：无加粗header、订单编号+交易快照合并行）

**页面容器className**（L1589）：`scenic-detail-page scenic-calendar-detail-page`

**头部标题**（L1608-1612）：日历票分支，预订成功/已使用显示红色份数badge（如"预订成功 2份"）

**待支付倒计时**（L1595, L1598）：`isScenicCalendarPaying` 条件

**底部固定栏**（L2684）：待支付状态通过 `isScenicCalendarPaying` 显示"应付¥158 + 去支付"

**通用详情排除条件**（5处）：
- L2402：通用合并商品卡
- L2580：评价引导卡
- L2582：退款记录
- L2645：通用门店卡
- L2665：通用订单信息卡
- L2678：DetailRecommendations 推荐列表

**按钮disabled支持**（L2728）：`disabled={(action as any).disabled}`

### 4.3 CSS差异样式（styles.css L12475-12576）

关键CSS类：
- `.scenic-calendar-detail-page`：页面背景色 #f5f6f8
- `.scenic-cal-product-card .scenic-cal-use-date`：使用日期行布局
- `.scenic-cal-date-value`：橙色高亮日期值（color: #FF6B35）
- `.scenic-cal-voucher-placeholder-block/.scenic-cal-voucher-placeholder`：灰色占位凭证区
- `.scenic-cal-pay-flat`：已使用状态flat金额卡样式
- `button[disabled].oc-btn-outline-v3`：置灰按钮样式（opacity:0.4）

### 4.4 Mock数据（mock.ts）

**8条日历票mock订单**（L1178-1285）：SC2026062800201~208，商品为"故宫博物院门票（上午场）"，单价¥158，2张。

**fetchOrderById fallback逻辑**（L644起）：
- `isScenicCalendar` 变量判断是否日历票
- L687-691：为日历票设置入园信息（午门检票口等）
- L701-717：门店信息（故宫博物院，北京市东城区景山前街4号）
- L746-774：scenicInfo完整数据块（visitDate/ticketType/visitors/coupons等）

visitors（游客）和 coupons（券码）按状态区分：
- 待支付/取消：证件号为空（未填写）
- 预订确认中：一人有证件号，一人为空
- 预订成功/已使用/退款态：两人都有带掩码的证件号
- 预订成功/已使用：有QR码券号
- 已使用：coupons.used = true

### 4.5 类型定义（types.ts）

- `ScenicProductType`（L66）：`'group_buy' | 'presale_voucher' | 'calendar_ticket'`
- `ScenicCalendarStatus`（L82-92）：日历票状态枚举
- `ScenicInfo`（L232-244）：景区门票信息，核心字段：
  - `productType`、`visitDate`、`visitTime`、`ticketType`、`ticketCount`
  - `visitors: ScenicVisitor[]`（游客列表）
  - `coupons: ScenicCoupon[]`（券码列表）
  - `insuranceIncluded`（是否含保险）

## 五、日历票 vs 团购票关键差异

| 维度 | 景区团购票 (group_buy) | 景区日历票 (calendar_ticket) |
|------|----------------------|---------------------------|
| 商品卡信息 | 有效期/不可用日期/规则标签 | **使用日期(橙色高亮)+票种/座位等级** |
| 待支付 | 无QR码，无证件 | 无QR码，无证件（同团购） |
| 预订确认中 | 有QR码（待使用态） | **灰色占位"凭证将在出票成功后展示"** |
| 预订成功/待使用 | QR码+证件+券号 | QR码+证件+券号（同团购） |
| 入园信息 | 不显示 | **待支付/确认中/预订成功显示** |
| 已使用金额卡 | 普通样式 | **flat样式（无加粗header）** |
| 确认中退款按钮 | 可点击 | **置灰disabled** |
| 头部badge | 无 | **预订成功/已使用显示"X份"红色badge** |

## 六、撕线效果实现

门票撕线效果通过CSS实现：
- `.scenic-ticket-group` 容器内的相邻卡片
- 使用 `::before/::after` 伪元素创建半圆凹陷
- 卡片之间使用虚线边框 `.scenic-ticket-group > div + div::before`
- `.scenic-ticket-seamless` 类：取消虚线和半圆凹陷，实现卡片无缝连接（用于取消/退款态的"展开全部"卡片）

## 七、已修复的问题

1. **多余闭合括号**：添加bottomActions日历时曾引入多余 `}`，已删除
2. **scenicInfo缺失**：原fallback中calendar_ticket的scenicInfo为undefined，已添加isScenicCalendar分支
3. **按钮disabled未传递**：底部按钮不支持disabled属性，已通过 `(action as any).disabled` 读取
4. **DetailRecommendations泄露**：推荐组件在景区页面未排除，已添加条件 `!isScenicGroupBuyDesignState && !isScenicCalendarDesignState`
5. **待支付无支付按钮**：底部支付栏条件缺少 `isScenicCalendarPaying`，已添加并正确显示"去支付"
6. **setTimeout在evaluate中失效**：浏览器自动化中setTimeout回调不执行，改用分步调用（wait_for + 单独evaluate）
7. **滚动容器识别**：列表页滚动容器是 `.oc-list-v2`（不是window），详情页滚动容器是 `.oc-detail-scroll-v3`

## 八、浏览器验证方法

开发服务器运行在 `http://localhost:5174/`，验证步骤：
1. 点击"全部"tab确保看到所有订单
2. 滚动到列表底部（.oc-list-v2容器，scrollTop约15900处有SC201~208）
3. 依次点击8个日历票订单，验证各状态UI
4. 关键验证点：
   - 待支付：底部"去支付"按钮+倒计时
   - 预订确认中：灰色占位凭证+申请退款按钮置灰
   - 预订成功：QR码+证件信息+份数badge
   - 已使用：flat金额卡+评价引导+NPS
   - 订单取消：无凭证/入园信息，seamless展开全部
   - 退款三态：退款记录卡+对应按钮

## 九、后续可能的优化方向

1. **列表卡片适配**：当前日历票在列表页仍使用通用的"再来一单/去使用"按钮，可以参考景区团购票的列表卡片样式进行适配
2. **QR码轮播交互**：预订成功状态的QR码左右切换箭头目前只有视觉，未绑定实际切换逻辑
3. **展开全部/收起**：凭证区"展开全部"按钮的交互逻辑
4. **退改规则下拉**：退改规则的展开/收起交互
5. **"展开更多"金额明细**：金额卡底部"展开更多"按钮的明细展开
6. **保险信息**：游乐险的详细信息弹窗
7. **响应式**：当前固定390px宽度预览，可考虑适配更大屏幕
8. **TypeScript编译检查**：由于环境限制，npx命令不可用，建议在本地运行 `npx tsc --noEmit` 再次确认无类型错误

## 十、开发约定

- CSS类名前缀：`.scenic-*`（团购票复用）/ `.scenic-cal-*`（日历票差异）
- 手机预览框架：`.oc-detail-scroll-v3`（固定宽度390px）
- 颜色规范：主色 #FF2D55（抖音红），橙色高亮 #FF6B35，文字 #1f2937/#6b7280/#9ca3af
- 圆角规范：卡片16px，按钮24px
- 景区商品图片URL：使用 `https://copilot-cn.bytedance.net/api/ide/v1/text_to_image` 生成
- 禁止添加emoji到代码文件中
- 不要主动创建README或文档文件（本文档为用户明确要求）
