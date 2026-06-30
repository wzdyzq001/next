// ===========================================================================
// AI 智能履约助手 · Skill 决策引擎
// 输入：订单数据
// 输出：诊断结果 + 推理路径，由 UI 层渲染对应话术与卡片
// ===========================================================================

import type { DiagnoseResult, OrderData } from './types';

const REDEEM_LABEL: Record<OrderData['redeemMethod'], string> = {
  self_order: '点单核销',
  delivery: '配送核销',
  voucher: '券码核销',
  manual: '门店人工核销',
  none: '未核销',
};

const CHANNEL_LABEL: Record<OrderData['channel'], string> = {
  miniprogram_self_order: '小程序闭环点单',
  miniprogram_other: '小程序（非点单）',
  third_party: '三方平台',
  pos: '门店 POS',
  unknown: '未知渠道',
};

/**
 * 主决策函数 —— 完整复刻产品需求中的判断流程：
 *
 *  1. 是否为小程序闭环点单 (channel)
 *     ├── 否 → 友好引导，不展开取餐码逻辑
 *     └── 是 → 进入下一步
 *  2. 订单是否已核销 (status)
 *     ├── 未核销 → 按商家支持的核销能力区分点单/券码话术
 *     └── 已核销 → 进入下一步
 *  3. 核销方式 (redeemMethod)
 *     ├── 非 self_order 且非 delivery → 提示"非点单核销无取餐码"
 *     ├── delivery → 提示"无取餐码，并展示当前配送进度"
 *     └── self_order → 查询并展示取餐码 + 制作进度
 */
export function diagnose(order: OrderData): DiagnoseResult {
  const trace: string[] = [];

  trace.push(`接收到订单 ${order.orderId}`);
  trace.push(`下单渠道 = ${CHANNEL_LABEL[order.channel]}`);

  if (order.status === 'pending_payment') {
    trace.push('结论：订单待支付，展示支付倒计时与收银台入口');
    return {
      order,
      template: 'food_pending_payment',
      trace,
    };
  }

  if (order.status === 'canceled') {
    trace.push('结论：订单已取消，展示复购入口');
    return {
      order,
      template: 'food_canceled',
      trace,
    };
  }

  // ---- 新增退款咨询判断 ----
  if (order.status === 'refunding' || order.status === 'refunded' || order.status === 'refund_failed') {
    trace.push('结论：查询到退款状态，展示退款进度与规则');
    return {
      order,
      template: 'refund_info',
      trace
    };
  }

  // ---- 订单品类特化判断：如果是非餐饮订单（住宿、游玩等） ----
  // 对于住宿、游玩等，主要查询商品信息或门店信息
  if (order.status === 'unredeemed' || order.status === 'redeemed') {
    if (order.hotelInfo) {
      trace.push('结论：检测到住宿订单，展示入离时间、设施及酒店政策');
      return {
        order,
        template: 'hotel_info',
        trace
      };
    }
    if (order.vacationInfo) {
      trace.push('结论：检测到度假订单，展示行程与集合信息');
      return {
        order,
        template: 'vacation_info',
        trace
      };
    }
    if (order.showInfo) {
      trace.push('结论：检测到演出订单，展示时间与座位信息');
      return {
        order,
        template: 'show_info',
        trace
      };
    }
    if (order.travelInfo) {
      trace.push('结论：检测到旅行订单，展示行程与交通信息');
      return {
        order,
        template: 'travel_info',
        trace
      };
    }
    if (order.channel === 'third_party' && order.productRules) {
      if (order.productRules.playStrategy) {
        trace.push('结论：检测到游玩订单，展示游玩攻略及一键生成选项');
        return {
          order,
          template: 'play_strategy',
          trace
        };
      }
      trace.push('结论：检测到本地生活服务订单（住宿/游玩等），展示商品与门店信息');
      return {
        order,
        template: 'product_info',
        trace
      };
    }
  }

  // ---- Step 1: 是否小程序闭环点单 ----
  const isSelfOrderChannel = order.channel === 'miniprogram_self_order';
  if (!isSelfOrderChannel) {
    trace.push('结论：非小程序闭环点单');
    return {
      order,
      template: 'not_self_or_delivery',
      trace,
    };
  }

  // ---- Step 2: 订单是否已核销 ----
  trace.push(`订单状态 = ${order.status === 'redeemed' ? '交易完成' : '未核销'}`);
  if (order.status === 'unredeemed') {
    const supported = order.supportedRedeemMethods ?? ['self_order', 'voucher'];
    const supportsSelfOrder = supported.includes('self_order');
    const supportsVoucher = supported.includes('voucher');
    const supportsDelivery = supported.includes('delivery');

    trace.push(`商家履约能力 = ${supported.map((m) => (m === 'self_order' ? '点单核销' : m === 'delivery' ? '配送到家' : '券码核销')).join(' / ')}`);

    if (supportsSelfOrder && supportsDelivery) {
      trace.push('结论：订单待使用，同时支持点单与配送');
      return {
        order,
        template: 'unredeemed_self_order_and_voucher',
        trace,
      };
    }

    if (supportsDelivery) {
      trace.push('结论：订单待使用，支持配送和券码核销');
      return {
        order,
        template: 'unredeemed_delivery_only',
        trace,
      };
    }

    if (supportsSelfOrder) {
      trace.push('结论：订单待使用，仅支持点单核销');
      return {
        order,
        template: 'unredeemed_self_order_only',
        trace,
      };
    }

    if (supportsVoucher) {
      trace.push('结论：订单待使用，仅支持券码核销');
      return {
        order,
        template: 'unredeemed_voucher_only',
        trace,
      };
    }

    trace.push('结论：订单待使用，未配置核销能力，默认引导到订单详情页');
    return {
      order,
      template: 'unredeemed_voucher_only',
      trace,
    };
  }

  // ---- Step 3: 核销方式判断 ----
  trace.push(`核销方式 = ${REDEEM_LABEL[order.redeemMethod]}`);

  if (order.redeemMethod === 'delivery') {
    trace.push('结论：配送核销，展示当前配送进度');
    return {
      order,
      template: 'delivery_show_entrance',
      trace,
    };
  }

  if (order.redeemMethod !== 'self_order') {
    trace.push('结论：非点单核销，无取餐码');
    return {
      order,
      template: 'not_self_or_delivery',
      trace,
    };
  }

  // ---- Step 4: 点单核销 → 展示取餐码 ----
  if (!order.pickupCode) {
    trace.push('警告：点单核销但取餐码缺失，按未分配处理');
    return {
      order,
      template: 'unredeemed_self_order_only',
      trace,
    };
  }

  trace.push(`查询到取餐码 = ${order.pickupCode.replace(/\s+/g, '')}`);
  trace.push('结论：渲染取餐信息（门店 / 取餐码 / 制作进度）');
  return {
    order,
    template: 'self_order_show_code',
    trace,
  };
}

/** 将诊断结果转化为给用户的自然语言话术 */
export function renderReply(d: DiagnoseResult): string {
  const o = d.order;
  switch (d.template) {
    case 'food_pending_payment':
      return [
        `已为您查到订单 <code>${o.orderId}</code>，当前<strong>待支付</strong>。`,
        `请在倒计时结束前完成支付，超时后订单会自动取消。`,
      ].join('<br/>');

    case 'food_canceled':
      return [
        `已为您查到订单 <code>${o.orderId}</code>，当前订单已取消。`,
        `您可以点击下方「再来一单」重新提交订单。`,
      ].join('<br/>');

    case 'unredeemed_self_order_only':
      return [
        `已为您查到订单 <code>${o.orderId}</code>，目前状态为「<strong>待使用</strong>」。`,
        `可提前点单到店免排队。`,
      ].join('<br/>');

    case 'unredeemed_self_order_and_voucher':
      return [
        `已为您查到订单 <code>${o.orderId}</code>，目前状态为「<strong>待使用</strong>」。`,
        `可提前点单到店免排队，或配送到家好省心。`,
      ].join('<br/>');

    case 'unredeemed_delivery_only':
      return [
        `已为您查到订单 <code>${o.orderId}</code>，目前状态为「<strong>待使用</strong>」。`,
        `可以配送到家好省心，也可到店出示券码完成核销。`,
      ].join('<br/>');

    case 'unredeemed_voucher_only':
      return [
        `已为您查到订单 <code>${o.orderId}</code>，目前状态为「<strong>待使用</strong>」。`,
        `您可前往<strong>订单详情页</strong>，到店之后展示券码核销。`,
      ].join('<br/>');

    case 'not_self_or_delivery':
      return [
        `订单 <code>${o.orderId}</code> 的核销方式为「<strong>${REDEEM_LABEL[o.redeemMethod] || '其他渠道'}</strong>」。`,
        `您可凭订单凭证直接到店使用，或联系店员协助核销。`,
      ].join('<br/>');

    case 'delivery_show_entrance':
      return [
        `订单 <code>${o.orderId}</code> 已通过「<strong>配送核销</strong>」完成下单。`,
        `已经帮您查询到当前订单配送进度，详情请见下方卡片。`,
      ].join('<br/>');

    case 'self_order_show_code':
      return `已为您找到取餐信息，请到 <strong>${o.store}</strong> 凭以下取餐码取餐：`;

    case 'product_info':
      const reservable = o.storeInfo?.reservable;
      const isCrowded = o.storeInfo?.crowdLevel === 'high';
      const isCompleted = o.status === 'redeemed';
      const isFoodCategory = o.category === 'food';
      const showReservePrompt = !isCompleted && !isFoodCategory && isCrowded && reservable;

      return [
        `已为您查到订单 <code>${o.orderId}</code> 的使用规则：`,
        o.productRules?.validDate ? `• 可用日期：${o.productRules.validDate}` : '',
        o.productRules?.refundRule ? `• 退款规则：${o.productRules.refundRule}` : '',
        `您可凭订单凭证直接到店使用。`,
        showReservePrompt ? `<br/>⚠️ <strong>温馨提示：</strong>当前门店客流量较大，可能需要排队等候。是否需要我帮您提前预约？` : `是否需要查看更多商品或门店信息？`
      ].filter(Boolean).join('<br/>');

    case 'play_strategy':
      return [
        `已为您查到游玩订单 <code>${o.orderId}</code> 的信息。这里有该景区的入园与游玩详情，您可以仔细看看：`,
        o.productRules?.entryTime ? `• 入园时间：${o.productRules.entryTime}` : '',
        `我还为您准备了【周边一站式游玩攻略】，是否需要为您生成？`
      ].filter(Boolean).join('<br/>');

    case 'hotel_info':
      return [
        `已为您查到住宿订单 <code>${o.orderId}</code> 的信息，详情请见下方卡片。`,
        `您可凭预订人身份证直接到店办理入住。`
      ].filter(Boolean).join('<br/>');

    case 'vacation_info':
      return [
        `已为您查到度假订单 <code>${o.orderId}</code> 的行程信息，详情请见下方卡片。`,
        `请注意保持手机畅通，导游会在出发前与您联系。`
      ].filter(Boolean).join('<br/>');

    case 'show_info':
      return [
        `已为您查到演出订单 <code>${o.orderId}</code> 的场次信息，详情请见下方卡片。`,
        `请凭电子票或实体票提前入场，祝您观演愉快！`
      ].filter(Boolean).join('<br/>');

    case 'travel_info':
      return [
        `已为您查到出行订单 <code>${o.orderId}</code> 的信息，详情请见下方卡片。`,
        `请提前到达场馆办理手续，以免耽误您的行程。`
      ].filter(Boolean).join('<br/>');

    case 'refund_info':
      if (o.status === 'refunded') {
        return [
          `您的订单 <code>${o.orderId}</code> 已退款成功。`,
          `钱款已原路退回<strong>${o.refundInfo?.paymentMethod || '原支付方式'}</strong>。`,
          o.refundInfo?.amount ? `退款金额：¥${(o.refundInfo.amount / 100).toFixed(2)}` : '',
          `如银行或支付机构入账有延迟，请以支付账户实际到账时间为准。`,
        ].filter(Boolean).join('<br/>');
      }

      if (o.status === 'refunding') {
        return [
          `您的订单 <code>${o.orderId}</code> 退款申请已提交，当前<strong>待商家审核</strong>。`,
          o.refundInfo?.amount ? `退款金额：¥${(o.refundInfo.amount / 100).toFixed(2)}` : '',
          `审核通过后，钱款将原路退回${o.refundInfo?.paymentMethod ? `至<strong>${o.refundInfo.paymentMethod}</strong>` : '原支付方式'}。`,
          `我已为您同步退款审核进度；如果商家长时间未处理，可以点击【催退款】，我会自动电话联系商家并及时反馈审核结果。`,
        ].filter(Boolean).join('<br/>');
      }

      if (o.status === 'refund_failed') {
        return [
          `您的订单 <code>${o.orderId}</code> 退款失败。`,
          o.refundInfo?.failReason ? `失败原因：${o.refundInfo.failReason}` : `可能是订单不满足退款规则或商家审核未通过。`,
          `您可以联系<strong>抖音生活服务客服</strong>，会有客服人员继续帮您核实原因并协助处理。`,
        ].filter(Boolean).join('<br/>');
      }

      return `您的订单 <code>${o.orderId}</code> 当前处于退款状态，我已为您查询到下方进度。`;

    case 'no_order_found':
    default:
      return '抱歉，没有找到这笔订单，您可在小程序「我的订单」中复制订单号再发给我哦。';
  }
}

export { REDEEM_LABEL, CHANNEL_LABEL };

export function canShowReservationEntry(order: Pick<OrderData, 'status' | 'category' | 'storeInfo'>) {
  if (order.status !== 'unredeemed') return false;
  if (order.category === 'food') return false;
  return Boolean(order.storeInfo?.reservable);
}

export function canShowVoucherRedeemPanel(
  order: Pick<OrderData, 'status' | 'category' | 'supportedRedeemMethods' | 'voucherCode'>,
) {
  const supported = order.supportedRedeemMethods ?? [];
  return (
    order.status === 'unredeemed' &&
    supported.includes('voucher') &&
    Boolean(order.voucherCode)
  );
}

export function buildActions(result: DiagnoseResult): import('./types').MessageAction[] | undefined {
  const order = result.order;

  if (order.category === 'food') {
    const actions: import('./types').MessageAction[] = [];

    const isMaking =
      order.status === 'redeemed' &&
      order.redeemMethod === 'self_order' &&
      Boolean(order.pickupCode) &&
      Boolean(order.progress?.some((s) => s.key === 'making' && s.state === 'active'));

    if (isMaking) {
      actions.push({ label: '催一下', kind: 'urge_order', orderId: order.orderId });
    }

    if (order.status === 'unredeemed') {
      actions.push({ label: '订单使用提醒', kind: 'set_redeem_reminder', orderId: order.orderId });
    }

    return actions.length > 0 ? actions : undefined;
  }

  if (result.template === 'play_strategy') {
    return [
      { label: '生成一站式攻略', kind: 'generate_play_strategy', orderId: result.order.orderId }
    ];
  }
  if (result.template === 'refund_info') {
    if (result.order.status === 'refunding') {
      return [
        { label: '催退款', kind: 'urge_merchant', orderId: result.order.orderId }
      ];
    }
    if (result.order.status === 'refund_failed') {
      return [
        { label: '联系生活服务客服', kind: 'contact_service', orderId: result.order.orderId }
      ];
    }
  }
  if (result.template === 'product_info' && result.order.storeInfo?.reservable) {
    if (canShowReservationEntry(result.order)) {
      return [
        { label: '提前预约免排队', kind: 'open_reservation', orderId: result.order.orderId }
      ];
    }
  }
  if (result.order.status === 'unredeemed') {
    const actions: import('./types').MessageAction[] = [];
    if (canShowReservationEntry(result.order)) {
      actions.push({ label: '提前预约免排队', kind: 'open_reservation', orderId: result.order.orderId });
    }
    actions.push({ label: '订单使用提醒', kind: 'set_redeem_reminder', orderId: result.order.orderId });
    return actions;
  }
  return undefined;
}
