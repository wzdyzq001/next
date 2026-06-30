# 订单卡片规则文档细化与更新 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 第七章 — 订单卡片四层架构与多维度矩阵更新
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 更新第七章"AI 助手订单卡片设计"的 7.1-7.5 节
  - 补充四层架构的详细定义（基础层/扩展层/操作层/引导问题层）
  - 更新多维度组合矩阵（行业/商品类型/履约方式/订单状态的枚举值对齐 Demo）
  - 补充 9 种扩展层类型的完整列表与适用场景说明
  - 更新门店行显示规则的统一描述
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 四层架构每层均有清晰定义（必选/可选、组成元素、渲染条件）
  - `human-judgement` TR-1.2: 9 种扩展层类型（progress/hotel_stay/refund/payment_countdown/travel_info/pickup_code/delivery_completed/scenic_entry/refund_success）均有定义
  - `human-judgement` TR-1.3: 门店行显示规则包含 hotel_stay/scenic_entry/travel_info 扩展层存在时隐藏的逻辑
  - `programmatic` TR-1.4: 行业枚举包含 food/hotel/scenic/general/travel_agency 五类
- **Notes**: 原文档第七章位于 L514-L591

---

## [ ] Task 2: 第八章 — 餐饮行业操作层规则更新
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 更新餐饮行业订单状态机（6种核销方式组合）
  - 更新各子状态的扩展层与操作层配置
  - 补充配送进度/取餐进度的图标说明（骑手线条/手提袋线条，黑色）
  - 更新交易完成状态按钮：再来一单（primary）+ 去评价（secondary）
  - 补充按钮尺寸规范引用
- **Acceptance Criteria Addressed**: [AC-2, AC-5, AC-8]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 餐饮 6 种核销方式（纯券码/纯点单/券码+点单/券码+配送/点单+配送/点单+配送+券码）均有对应操作层配置
  - `human-judgement` TR-2.2: 配送进度图标为骑手线条图标（黑色），取餐进度图标为手提袋线条图标（黑色）
  - `human-judgement` TR-2.3: 交易完成状态按钮为"再来一单（primary）+ 去评价（secondary）"
- **Notes**: 原文档餐饮章节位于 L657-L695

---

## [ ] Task 3: 第八章 — 酒店行业操作层规则更新
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 更新酒店预售券和日历房的状态机表格
  - 补充催用理由功能定义（待预约状态，库存紧张/仅剩X间等）
  - 更新门店行显示规则（有 HotelStayInfo 时隐藏）
  - 更新交易完成状态按钮：再来一单（primary）+ 去评价（secondary）
  - 更新"再次预订"从操作层移除，改为引导问题
- **Acceptance Criteria Addressed**: [AC-2, AC-5, AC-6, AC-4]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 酒店预售券待预约状态有催用理由说明
  - `human-judgement` TR-3.2: 有 HotelStayInfo 扩展层时门店行隐藏
  - `human-judgement` TR-3.3: 交易完成按钮为"再来一单（primary）+ 去评价（secondary）"
  - `human-judgement` TR-3.4: "再次预订"不在操作层，在引导问题中
- **Notes**: 原文档酒店章节位于 L697-L726

---

## [ ] Task 4: 第八章 — 景区行业操作层规则更新
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 更新景区团购券、预售券、日历票三种子类型的状态机表格
  - 补充景区入园信息（scenic_entry）统一为专门样式定义：景区名称行+日期行，替代 info-list
  - 更新景区日历票门店行规则：有入园信息时隐藏，无入园信息时（交易完成/已取消/退款失败）展示
  - 更新退款进度样式（退款中/退款成功，对齐其他行业）
  - 更新交易完成状态按钮：再来一单（primary）+ 去评价（secondary）
  - 补充催用理由功能（预售券待预约状态）
- **Acceptance Criteria Addressed**: [AC-2, AC-5, AC-7, AC-4, AC-6]
- **Test Requirements**:
  - `human-judgement` TR-4.1: scenic_entry 扩展层明确定义为景区专门样式（景区名称行+日期行），非 info-list
  - `human-judgement` TR-4.2: 景区日历票 9 个状态的门店行显示规则准确（待支付/预订确认中/预订成功/已入园/退款中/退款成功有入园信息时隐藏；交易完成/已取消/退款失败无入园信息时展示）
  - `human-judgement` TR-4.3: 退款中/退款成功展示退款进度，样式与其他行业一致
  - `human-judgement` TR-4.4: 交易完成按钮为"再来一单（primary）+ 去评价（secondary）"
- **Notes**: 原文档景区章节位于 L728-L777

---

## [ ] Task 5: 第八章 — 综合与旅行社行业操作层规则更新
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 更新综合行业团购券的状态机表格
  - 更新旅行社预售券的状态机表格
  - 补充旅行社差异化规则：无导航图标、无距离信息、无预约单号
  - 补充旅行社催用理由功能（待预约状态）
  - 更新交易完成状态按钮：再来一单（primary）+ 去评价（secondary）
  - 更新"查看完整行程"从操作层移除，改为引导问题
- **Acceptance Criteria Addressed**: [AC-2, AC-5, AC-9, AC-6]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 旅行社门店行明确无导航图标、无距离信息
  - `human-judgement` TR-5.2: 旅行社出行信息明确无预约单号字段
  - `human-judgement` TR-5.3: 旅行社交易完成按钮为"再来一单（primary）+ 去评价（secondary）"
  - `human-judgement` TR-5.4: "查看完整行程"不在操作层，在引导问题中
  - `human-judgement` TR-5.5: 综合行业交易完成按钮为"再来一单（primary）+ 去评价（secondary）"
- **Notes**: 原文档综合章节 L779-L789，旅行社章节 L791-L811

---

## [ ] Task 6: 第十二章 — 通用组件规则更新
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 更新履约进度条组件说明（配送/取餐进度的图标类型）
  - 补充景区入园信息组件（ScenicEntryInfo）的结构定义
  - 更新退款信息组件（RefundingInfo/RefundSuccessInfo）说明
  - 补充催用理由组件定义
  - 更新取餐码/配送地图等组件说明
- **Acceptance Criteria Addressed**: [AC-3, AC-7, AC-6]
- **Test Requirements**:
  - `human-judgement` TR-6.1: ScenicEntryInfo 组件有明确定义（景区名称行+导航/电话 + 日期行）
  - `human-judgement` TR-6.2: 催用理由组件有定义（红色12px，主按钮左侧）
  - `human-judgement` TR-6.3: 进度条组件包含配送（骑手图标）和取餐（手提袋图标）说明
- **Notes**: 原文档第十二章位于 L1331-L1401

---

## [ ] Task 7: 第十三章 — UI/UX 设计规范更新
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 更新状态角标/标签样式：移除背景色块，统一红色文字（#ff6b6b）
  - 更新按钮规范：高度30px、padding 0 12px、圆角15px、字体12px、图标14px、间距8px
  - 补充按钮一行展示规则（flex-wrap: nowrap，最多3个按钮）
  - 更新价格样式：黑色不加粗
  - 更新图标规范：配送骑手线条图标（黑色）、取餐手提袋线条图标（黑色）
  - 催用理由样式：红色12px、font-weight 500
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `human-judgement` TR-7.1: 状态标签样式：红色文字 #ff6b6b，无背景色
  - `human-judgement` TR-7.2: 按钮尺寸：高度30px、padding 0 12px、圆角15px、字体12px
  - `human-judgement` TR-7.3: 按钮图标尺寸 14px，按钮间距 8px
  - `human-judgement` TR-7.4: 配送进度图标为骑手线条（黑色），取餐进度图标为手提袋线条（黑色）
  - `human-judgement` TR-7.5: 价格样式：黑色，不加粗
- **Notes**: 原文档第十三章位于 L1404-L1449

---

## [ ] Task 8: 文档版本信息与整体一致性检查
- **Priority**: medium
- **Depends On**: Task 2, 3, 4, 5, 6, 7
- **Description**:
  - 更新文档版本号为 v2.6
  - 更新日期为当前日期
  - 更新版本记录章节（第二十六章）
  - 通读全文，检查术语一致性（按钮文案、状态名称等）
  - 确保所有章节引用的规则互相一致，无矛盾
- **Acceptance Criteria Addressed**: [AC-10]
- **Test Requirements**:
  - `programmatic` TR-8.1: 文档版本号为 v2.6
  - `programmatic` TR-8.2: 更新日期为最新日期
  - `human-judgement` TR-8.3: 全文术语一致，无矛盾
  - `programmatic` TR-8.4: 仅更新 1-2975 行范围内的内容
- **Notes**: 版本记录章节位于文档末尾
