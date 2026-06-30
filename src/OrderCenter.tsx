import { useState, useMemo, useEffect, useRef } from 'react';
import { ORDER_LIST, fetchOrderById } from './mock';
import {
  addHotelLocalDays,
  formatHotelLocalDate,
  getHotelStayDateLabels,
  getHotelCountdownText,
  getHotelStatusColor,
  getHotelStatusView,
  HOTEL_PRODUCT_TYPE_LABEL,
  isValidChinaMobile,
  isHotelOrder,
  refreshHotelReservationByTime,
  transitionHotelReservation,
  type HotelReservationState,
} from './hotelOrderState';
import {
  createOrderListPositionSnapshot,
  readOrderListPositionSnapshot,
  resolveOrderListRestoreTarget,
  writeOrderListPositionSnapshot,
  type OrderListPositionSnapshot,
} from './orderListPositionMemory';
import type { HotelOrderStatusText, OrderData, OrderListItem } from './types';
import { toStandardCategory, getDisplayCategory } from './types';
import { getReminderByOrder, formatReminderBubbleText, getDaysUntilExpiry, setReminder, cancelReminder, getQuickOptions, formatExpiryDateTime, formatExpiryStatusText, getValidityEndDate, subscribeReminders, buildNoticeTags } from './redeemReminder';
import { useAiAssistantContext, AIAssistantIcon } from './components/AiAssistant';

export interface ReservationInfoCardData {
  orderId?: string;
  storeName: string;
  storeAddress: string;
  businessHours: string;
  arrivalTime: string;
  pax: number;
  phone: string;
  acceptStatus: 'pending' | 'accepted' | 'failed' | 'canceled';
  estimatedAcceptTime: string;
  acceptDeadlineAt?: number;
  merchantAcceptAt?: number;
}

interface HotelStayDates {
  checkInDate: string;
  checkOutDate: string;
}

function createDefaultHotelStayDates(now: number, offsetDays = 0): HotelStayDates {
  const checkInDate = addHotelLocalDays(formatHotelLocalDate(now), offsetDays);
  return {
    checkInDate,
    checkOutDate: addHotelLocalDays(checkInDate, 3),
  };
}

type HotelCancelRule = 'free' | 'fee_review' | 'not_cancelable';

function resolveCalendarCancelRule(stayDates: HotelStayDates, now: number): HotelCancelRule {
  const checkInAt = new Date(`${stayDates.checkInDate}T12:00:00`).getTime();
  const hoursBeforeCheckIn = (checkInAt - now) / (60 * 60 * 1000);
  if (hoursBeforeCheckIn >= 48) return 'free';
  if (hoursBeforeCheckIn >= 24) return 'fee_review';
  return 'not_cancelable';
}

function formatReservationCountdown(deadlineAt: number | undefined, now: number) {
  const remaining = Math.max(0, (deadlineAt ?? now) - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatPaymentCountdown(deadlineAt: number, now: number) {
  const remaining = Math.max(0, deadlineAt - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ============================================================================
// OrderDetail: Detailed view based on order status and category
// ============================================================================

function OrderReservationCard({
  data,
  now,
  onCancel,
  onRebook,
}: {
  data: ReservationInfoCardData;
  now: number;
  onCancel?: () => void;
  onRebook?: () => void;
}) {
  const isAccepted = data.acceptStatus === 'accepted';
  const isFailed = data.acceptStatus === 'failed';
  const isCanceled = data.acceptStatus === 'canceled';
  const isPending = data.acceptStatus === 'pending';
  const countdownText = formatReservationCountdown(data.acceptDeadlineAt, now);
  const statusText = isAccepted ? '预约成功' : isFailed ? '预约失败' : isCanceled ? '预约已取消' : '预约确认中';
  return (
    <div className={`oc-reservation-card-v3 ${isFailed || isCanceled ? 'failed' : ''}`}>
      <div className="oc-reservation-card-head">
        <div className="oc-reservation-title-wrap">
          <div className="oc-reservation-title">
            {statusText}
            {isPending && <span>{countdownText}</span>}
          </div>
          <div className="oc-reservation-sub">
            {isCanceled ? '当前预约已取消，可重新发起预约' : isFailed ? '商家暂未接单，可重新发起预约' : isAccepted ? '商家已接单，到店前可取消预约' : '预约结果将在订单展示并以短信通知，可随时取消'}
          </div>
        </div>
      </div>

      <div className="oc-reservation-info-box">
        <div className="oc-reservation-row">
          <div className="oc-reservation-row-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
              <path d="M9 9h1M9 13h1M9 17h1" />
            </svg>
          </div>
          <div className="oc-reservation-row-main">
            <div className="oc-reservation-store-name">{data.storeName}</div>
          </div>
        </div>
        <div className="oc-reservation-row">
          <div className="oc-reservation-row-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className="oc-reservation-row-main">
            <div className="oc-reservation-time">{data.arrivalTime} {data.pax}人到店</div>
          </div>
        </div>
      </div>

      <div className="oc-reservation-action-row">
        <button>联系商家</button>
        <button>地图导航</button>
        {(isFailed || isCanceled) && onRebook ? <button className="rebook" onClick={onRebook}>重新预约</button> : onCancel && <button onClick={onCancel}>取消预约</button>}
      </div>
    </div>
  );
}

const DETAIL_RECOMMENDATIONS = [
  {
    id: 'coffee', cat: 'food',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20minimal%20product%20photo%20of%20a%20takeaway%20hot%20latte%20coffee%20cup%20on%20a%20light%20beige%20background%2C%20clean%20commercial%20food%20photography%2C%20soft%20studio%20lighting&image_size=square',
    merchant: 'Seesaw', title: '纯享咖啡',
    distance: '距你3.2km', area: '近漕河泾印象城', sold: '已售1000+',
    tags: ['新店特惠', '口感香气浓郁'],
    price: '16', originalPrice: '40', heat: '4.2折热销中',
  },
  {
    id: 'tea', cat: 'food',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20product%20photo%20of%20a%20milk%20tea%20drink%20with%20red%20tea%20and%20cream%2C%20warm%20shop%20counter%20background%2C%20appetizing%20beverage%20photography%2C%20soft%20lighting&image_size=square',
    merchant: '霸王茶姬', title: '一骑红尘',
    distance: '距你1.8km', area: '热门商圈可用', sold: '已售5000+',
    tags: ['今日爆款', '门店通用'],
    price: '15', originalPrice: '30', heat: '5.0折热销中',
  },
  {
    id: 'dessert', cat: 'food',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20photo%20of%20a%20strawberry%20cream%20cake%20slice%20and%20dessert%20set%20on%20a%20small%20cafe%20table%2C%20bright%20clean%20food%20photography%2C%20soft%20natural%20lighting&image_size=square',
    merchant: 'Lady M', title: '草莓千层套餐',
    distance: '距你2.1km', area: '商场B1可用', sold: '已售800+',
    tags: ['甜品下午茶', '双人优选'],
    price: '39', originalPrice: '68', heat: '5.7折热销中',
  },
  {
    id: 'hotpot', cat: 'food',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20top%20view%20commercial%20photo%20of%20Chinese%20hotpot%20set%20with%20fresh%20beef%20vegetables%20and%20spicy%20soup%2C%20restaurant%20table%2C%20appetizing%20food%20photography&image_size=square',
    merchant: '捞王', title: '双人火锅套餐',
    distance: '距你4.5km', area: '近万象城', sold: '已售3000+',
    tags: ['周末可用', '无需预约'],
    price: '128', originalPrice: '198', heat: '6.5折热销中',
  },
  {
    id: 'sushi', cat: 'food',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20food%20photo%20of%20a%20fresh%20sushi%20platter%20with%20salmon%20tuna%20and%20shrimp%20on%20a%20dark%20stone%20plate%2C%20Japanese%20restaurant%20lighting&image_size=square',
    merchant: '鮨鲜', title: '精选寿司拼盘',
    distance: '距你3.4km', area: '日料人气店', sold: '已售2200+',
    tags: ['双人套餐', '新鲜现做'],
    price: '88', originalPrice: '138', heat: '6.4折热销中',
  },
  {
    id: 'noodle', cat: 'food',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20photo%20of%20a%20bowl%20of%20Chinese%20beef%20noodle%20soup%20with%20green%20onions%2C%20warm%20steam%2C%20restaurant%20food%20photography&image_size=square',
    merchant: '和府捞面', title: '招牌牛肉面',
    distance: '距你900m', area: '午晚餐可用', sold: '已售8800+',
    tags: ['单人刚需', '出餐快'],
    price: '29', originalPrice: '39', heat: '7.4折热销中',
  },
  {
    id: 'burger', cat: 'food',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20food%20photo%20of%20a%20gourmet%20beef%20burger%20with%20fries%20and%20cola%2C%20clean%20fast%20casual%20restaurant%20background&image_size=square',
    merchant: 'Shake Shack', title: '牛肉堡单人餐',
    distance: '距你1.5km', area: '近地铁站', sold: '已售2600+',
    tags: ['午餐特惠', '快速取餐'],
    price: '42', originalPrice: '58', heat: '7.2折热销中',
  },
  {
    id: 'ktv', cat: 'general',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20modern%20KTV%20private%20room%20with%20sofa%20microphones%20and%20ambient%20neon%20lighting%2C%20clean%20commercial%20interior%20photo%2C%20entertainment%20venue&image_size=square',
    merchant: '纯K', title: '欢唱3小时',
    distance: '距你3.8km', area: '夜间场可用', sold: '已售1200+',
    tags: ['可预约', '朋友聚会'],
    price: '68', originalPrice: '128', heat: '5.3折热销中',
  },
  {
    id: 'spa', cat: 'general',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20photo%20of%20a%20clean%20spa%20massage%20room%20with%20warm%20lighting%20towels%20and%20aroma%20diffuser%2C%20relaxing%20wellness%20interior%20photography&image_size=square',
    merchant: '宜生到家', title: '肩颈舒缓护理',
    distance: '距你2.6km', area: '多门店可用', sold: '已售900+',
    tags: ['随时退', '技师好评'],
    price: '99', originalPrice: '168', heat: '5.9折热销中',
  },
  {
    id: 'cinema', cat: 'general',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20photo%20of%20a%20modern%20cinema%20hall%20with%20red%20seats%20and%20large%20screen%2C%20clean%20entertainment%20venue%20photography&image_size=square',
    merchant: '寰映影城', title: '双人观影票',
    distance: '距你2.4km', area: '黄金场可用', sold: '已售3200+',
    tags: ['情侣优选', '可退改'],
    price: '69', originalPrice: '120', heat: '5.8折热销中',
  },
  {
    id: 'gym', cat: 'general',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20photo%20of%20a%20modern%20fitness%20gym%20with%20treadmills%20weights%20and%20clean%20lighting%2C%20wellness%20venue%20photography&image_size=square',
    merchant: '超级猩猩', title: '燃脂团课体验',
    distance: '距你3.6km', area: '多时段可约', sold: '已售760+',
    tags: ['新人体验', '可预约'],
    price: '49', originalPrice: '99', heat: '4.9折热销中',
  },
  {
    id: 'escape', cat: 'general',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20photo%20of%20an%20immersive%20escape%20room%20scene%20with%20mysterious%20lighting%20and%20props%2C%20indoor%20entertainment%20venue%20photography&image_size=square',
    merchant: '谜城', title: '沉浸密室体验',
    distance: '距你4.2km', area: '热门主题', sold: '已售600+',
    tags: ['多人更划算', '需预约'],
    price: '98', originalPrice: '168', heat: '5.8折热销中',
  },
  {
    id: 'hotel-boutique', cat: 'hotel',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20luxury%20boutique%20hotel%20room%20interior%20with%20king%20bed%20soft%20lighting%20city%20view%20window%20warm%20modern%20decoration%20commercial%20photography&image_size=square',
    merchant: '亚朵S酒店', title: '城景大床房2晚',
    distance: '距你2.8km', area: '近市中心·含双早', sold: '已售2100+',
    tags: ['周末可用', '免费取消'],
    price: '598', originalPrice: '998', heat: '6.0折热销中',
  },
  {
    id: 'hotel-resort', cat: 'hotel',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20resort%20hotel%20swimming%20pool%20and%20tropical%20garden%20view%20sunny%20day%20vacation%20destination%20commercial%20photography&image_size=square',
    merchant: '三亚海棠湾君悦', title: '海景房3晚连住',
    distance: '海南三亚', area: '含双早+下午茶', sold: '已售380+',
    tags: ['度假优选', '不约可退'],
    price: '1999', originalPrice: '3680', heat: '5.4折热销中',
  },
  {
    id: 'hotel-budget', cat: 'hotel',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20clean%20modern%20budget%20hotel%20room%20with%20comfortable%20bed%20and%20minimalist%20decoration%20commercial%20interior%20photography&image_size=square',
    merchant: '全季酒店', title: '商务大床房1晚',
    distance: '距你1.2km', area: '近地铁站·含早', sold: '已售5600+',
    tags: ['差旅首选', '免费取消'],
    price: '299', originalPrice: '459', heat: '6.5折热销中',
  },
  {
    id: 'hotel-afternoon-tea', cat: 'hotel',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20photo%20of%20luxury%20hotel%20afternoon%20tea%20set%20with%20desserts%20and%20tea%20cups%2C%20elegant%20lounge%20background%2C%20soft%20lighting&image_size=square',
    merchant: '柏悦酒店', title: '双人下午茶',
    distance: '距你7.0km', area: '高空景观位', sold: '已售450+',
    tags: ['节日优选', '需预约'],
    price: '268', originalPrice: '398', heat: '6.7折热销中',
  },
  {
    id: 'scenic-disney', cat: 'scenic',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20colorful%20theme%20park%20castle%20with%20blue%20sky%20and%20visitors%20Shanghai%20Disneyland%20commercial%20tourism%20photography&image_size=square',
    merchant: '上海迪士尼', title: '1日票（含预约）',
    distance: '距你25km', area: '平日/周末通用', sold: '已售12000+',
    tags: ['官方授权', '快速入园'],
    price: '435', originalPrice: '599', heat: '7.3折热销中',
  },
  {
    id: 'scenic-huangshan', cat: 'scenic',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20Huangshan%20Yellow%20Mountain%20peaks%20above%20sea%20of%20clouds%20at%20sunrise%20Chinese%20landscape%20famous%20tourist%20attraction&image_size=square',
    merchant: '黄山风景区', title: '大门票+索道套票',
    distance: '安徽黄山', area: '指定日预约', sold: '已售3500+',
    tags: ['5A景区', '未约可退'],
    price: '320', originalPrice: '420', heat: '7.6折热销中',
  },
  {
    id: 'scenic-waterpark', cat: 'scenic',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20colorful%20water%20park%20slides%20and%20pools%20on%20a%20sunny%20summer%20day%20family%20fun%20commercial%20photography&image_size=square',
    merchant: '玛雅海滩水公园', title: '双人全天票',
    distance: '距你18km', area: '暑期开放', sold: '已售2800+',
    tags: ['亲子优选', '随买随用'],
    price: '258', originalPrice: '460', heat: '5.6折热销中',
  },
  {
    id: 'scenic-zoo', cat: 'scenic',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20giant%20panda%20eating%20bamboo%20in%20a%20zoo%20natural%20habitat%20wildlife%20park%20commercial%20photography&image_size=square',
    merchant: '上海野生动物园', title: '大门票（含车入区）',
    distance: '距你32km', area: '当日可订', sold: '已售8600+',
    tags: ['亲子必去', '未用可退'],
    price: '130', originalPrice: '165', heat: '7.9折热销中',
  },
  {
    id: 'travel-sanya', cat: 'travel',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20tropical%20beach%20vacation%20scene%20with%20palm%20trees%20white%20sand%20turquoise%20water%20Sanya%20China%20travel%20photography&image_size=square',
    merchant: '中青旅', title: '三亚5天4晚跟团游',
    distance: '海南三亚', area: '含机票+五星酒店', sold: '已售680+',
    tags: ['纯玩无购物', '可预约'],
    price: '3680', originalPrice: '5280', heat: '7.0折热销中',
  },
  {
    id: 'travel-yunnan', cat: 'travel',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20ancient%20Chinese%20town%20Lijiang%20Yunnan%20with%20traditional%20architecture%20and%20mountains%20travel%20destination%20photography&image_size=square',
    merchant: '携程旅游', title: '云南昆大丽6日游',
    distance: '云南', area: '含机票+住宿', sold: '已售420+',
    tags: ['经典线路', '不约可退'],
    price: '2999', originalPrice: '4699', heat: '6.4折热销中',
  },
  {
    id: 'travel-japan', cat: 'travel',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20Mount%20Fuji%20with%20cherry%20blossoms%20and%20traditional%20Japanese%20pagoda%20in%20spring%20travel%20photography&image_size=square',
    merchant: '春秋旅游', title: '日本东京大阪6日',
    distance: '日本', area: '含机票+签证', sold: '已售260+',
    tags: ['出境游', '需提前预约'],
    price: '5999', originalPrice: '8599', heat: '7.0折热销中',
  },
  {
    id: 'transport-flight', cat: 'transport',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20airplane%20flying%20above%20clouds%20at%20sunset%20aviation%20travel%20photography%20clear%20sky&image_size=square',
    merchant: '中国国航', title: '上海-北京机票券',
    distance: '直飞2h15m', area: '多航班可选', sold: '已售12000+',
    tags: ['不约可退', '全时段通用'],
    price: '580', originalPrice: '880', heat: '6.6折热销中',
  },
  {
    id: 'transport-train', cat: 'transport',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20Chinese%20high%20speed%20bullet%20train%20on%20railway%20tracks%20modern%20transportation%20commercial%20photography&image_size=square',
    merchant: '12306', title: '高铁次卡·京沪线',
    distance: '30天有效', area: '多车次可用', sold: '已售5800+',
    tags: ['5次卡', '免排队取票'],
    price: '2399', originalPrice: '2800', heat: '8.6折热销中',
  },
  {
    id: 'bakery', cat: 'food',
    image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20commercial%20photo%20of%20fresh%20croissants%20and%20artisan%20bread%20in%20a%20bakery%20display%2C%20warm%20morning%20light%2C%20food%20photography&image_size=square',
    merchant: 'Ole Bakery', title: '欧包早餐组合',
    distance: '距你1.2km', area: '早餐可用', sold: '已售1900+',
    tags: ['新鲜烘焙', '外带方便'],
    price: '22', originalPrice: '36', heat: '6.1折热销中',
  },
];

const RECOMMEND_TITLE_MAP: Record<string, string> = {
  food: '为你推荐·附近美食',
  hotel: '为你推荐·优选住宿',
  scenic: '为你推荐·热门景点',
  travel: '为你推荐·精选线路',
  transport: '为你推荐·出行优惠',
  general: '为你推荐·休闲娱乐',
};

function DetailRecommendations({ category }: { category?: string }) {
  const stdCat = category || 'general';
  const sameCat = DETAIL_RECOMMENDATIONS.filter(r => r.cat === stdCat);
  const otherCats = DETAIL_RECOMMENDATIONS.filter(r => r.cat !== stdCat);
  const list = [...sameCat, ...otherCats].slice(0, 4);
  return (
    <div className="oc-recommend-card-v3">
      <div className="oc-recommend-title-v3">{RECOMMEND_TITLE_MAP[stdCat] || '为你推荐'}</div>
      <div className="oc-recommend-list-v3">
        {list.map((item) => (
          <div className="oc-recommend-item-v3" key={item.id}>
            <div className="oc-recommend-img-v3" style={{ backgroundImage: `url(${item.image})` }} />
            <div className="oc-recommend-main-v3">
              <div className="oc-recommend-name-v3">
                <span>{item.merchant}</span>
                <strong>{item.title}</strong>
              </div>
              <div className="oc-recommend-meta-v3">
                <span>{item.distance}</span>
                <span>{item.area}</span>
                <span>{item.sold}</span>
              </div>
              <div className="oc-recommend-tags-v3">
                {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <div className="oc-recommend-bottom-v3">
                <div className="oc-recommend-price-v3">
                  <strong>¥{item.price}</strong>
                  <del>¥{item.originalPrice}</del>
                  <span>{item.heat}</span>
                </div>
                <button>抢购</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewGuideCard() {
  return (
    <div className="oc-review-guide-card">
      <button className="oc-review-close" aria-label="关闭评价引导">×</button>
      <div className="oc-review-reward">
        <span>写评就有礼</span>
        <strong>写评价得最高12元券</strong>
      </div>
      <div className="oc-review-title">评价一下，帮助更多用户选店</div>
      <div className="oc-review-hearts" aria-label="评价星级">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index}>♥</span>
        ))}
      </div>
    </div>
  );
}

function ReminderSettingSheet({
  open,
  validDate,
  productName,
  initialDays,
  hasActiveReminder,
  onClose,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  validDate?: string;
  productName?: string;
  initialDays?: number;
  hasActiveReminder?: boolean;
  onClose: () => void;
  onConfirm: (days: number) => void;
  onCancel?: () => void;
}) {
  const [customDays, setCustomDays] = useState(3);
  const [selectedQuickIndex, setSelectedQuickIndex] = useState<number | null>(null);
  const [showMaxToast, setShowMaxToast] = useState(false);
  const [now, setNow] = useState(Date.now());

  const endDate = getValidityEndDate(validDate);
  const hasExpiry = endDate !== null;
  const expiryDays = hasExpiry ? getDaysUntilExpiry(validDate, now) : 30;
  const isExpired = hasExpiry && expiryDays <= 0;
  const maxDays = isExpired ? 0 : expiryDays;
  const expiryDateTimeText = formatExpiryDateTime(validDate);
  const expiryStatusText = formatExpiryStatusText(validDate, now);

  const DEFAULT_DAYS = 3;
  const defaultDays = Math.min(DEFAULT_DAYS, Math.max(0, maxDays));

  const filteredQuickOptions = useMemo(() => {
    const allOptions = getQuickOptions(new Date(now));
    if (isExpired) return [];
    if (!hasExpiry) return allOptions;
    return allOptions.filter((opt) => opt.daysLater <= maxDays);
  }, [now, maxDays, isExpired, hasExpiry]);

  const quickCount = filteredQuickOptions.length;

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setNow(Date.now());
      const init = initialDays !== undefined && initialDays >= 0
        ? Math.min(initialDays, maxDays)
        : defaultDays;
      setCustomDays(init);
      setSelectedQuickIndex(null);
    }
  }, [open, defaultDays, initialDays, maxDays]);

  useEffect(() => {
    if (!open) return;
    setCustomDays((prev) => Math.min(prev, Math.max(0, maxDays)));
    setSelectedQuickIndex((prev) => {
      if (prev === null) return null;
      const opt = filteredQuickOptions[prev];
      return opt && opt.daysLater <= maxDays ? prev : null;
    });
  }, [maxDays, filteredQuickOptions, open]);

  if (!open) return null;

  const handleDecrease = () => {
    setCustomDays((prev) => Math.max(0, prev - 1));
    setSelectedQuickIndex(null);
  };

  const handleIncrease = () => {
    if (customDays >= maxDays) {
      setShowMaxToast(true);
      setTimeout(() => setShowMaxToast(false), 1800);
      return;
    }
    setCustomDays((prev) => Math.min(maxDays, prev + 1));
    setSelectedQuickIndex(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setCustomDays(0);
      setSelectedQuickIndex(null);
      return;
    }
    const val = parseInt(raw, 10);
    const clamped = Math.max(0, Math.min(maxDays, isNaN(val) ? 0 : val));
    setCustomDays(clamped);
    setSelectedQuickIndex(null);
  };

  const handleInputBlur = () => {
    setCustomDays((prev) => Math.max(0, Math.min(maxDays, prev)));
  };

  const handleQuickSelect = (index: number) => {
    const opt = filteredQuickOptions[index];
    if (!opt || opt.daysLater > maxDays) return;
    setSelectedQuickIndex(index);
    setCustomDays(opt.daysLater);
  };

  const handleConfirm = () => {
    if (isExpired) return;
    onConfirm(customDays);
    onClose();
  };

  const handleCancelReminder = () => {
    onCancel?.();
    onClose();
  };

  return (
    <div
      className={`reminder-sheet-overlay ${open ? 'open' : ''}`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className={`reminder-sheet ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="设置使用提醒"
        onClick={(event) => event.stopPropagation()}
      >
        {showMaxToast && (
          <div className="reminder-max-toast">使用提醒不可晚于有效期</div>
        )}
        <div className="reminder-sheet-grabber" />
        <div className="reminder-sheet-header">
          <div>
            <div className="reminder-sheet-title">设置使用提醒</div>
            <div className="reminder-sheet-product">{productName}</div>
          </div>
          <button
            className="reminder-sheet-close"
            onClick={onClose}
            aria-label="关闭提醒设置"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="reminder-sheet-body">
          {hasExpiry && (
            <div className={`reminder-expiry-info ${isExpired ? 'is-expired' : ''}`}>
              <div className="reminder-expiry-row">
                <div className="reminder-expiry-row-label">有效期至</div>
                <div className="reminder-expiry-row-value">{expiryDateTimeText}</div>
              </div>
              <div className="reminder-expiry-row">
                <div className="reminder-expiry-row-label">剩余时间</div>
                <div className={`reminder-expiry-row-value ${isExpired ? 'text-expired' : 'text-active'}`}>
                  {expiryStatusText}
                </div>
              </div>
            </div>
          )}

          {isExpired ? (
            <div className="reminder-expired-card">
              <div className="reminder-expired-icon">⌛</div>
              <div className="reminder-expired-title">订单已过期</div>
              <div className="reminder-expired-desc">
                无法设置使用提醒
              </div>
            </div>
          ) : (
            <>
              <div className="reminder-section">
                <div className="reminder-section-label">
                  提前提醒天数
                  {hasExpiry && (
                    <span className="reminder-section-hint">（最多 {maxDays} 天）</span>
                  )}
                </div>
                <div className="reminder-custom-row">
                  <button
                    className="reminder-day-btn"
                    onClick={handleDecrease}
                    disabled={customDays <= 0}
                  >
                    −
                  </button>
                  <div className="reminder-days-input">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="reminder-days-input-field"
                      value={customDays}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                    />
                    <span>天后提醒</span>
                  </div>
                  <button
                    className="reminder-day-btn"
                    onClick={handleIncrease}
                    disabled={customDays >= maxDays}
                  >
                    +
                  </button>
                </div>
              </div>

              {quickCount > 0 && (
                <div className="reminder-section">
                  <div className="reminder-section-label">快捷选择</div>
                  <div className={`reminder-quick-grid count-${quickCount}`}>
                    {filteredQuickOptions.map((option, index) => (
                      <button
                        key={index}
                        className={`reminder-quick-item ${selectedQuickIndex === index ? 'selected' : ''}`}
                        onClick={() => handleQuickSelect(index)}
                      >
                        <div className="quick-item-label">{option.label}</div>
                        <div className="quick-item-desc">{option.daysLater}天后</div>
                        {selectedQuickIndex === index && (
                          <div className="quick-item-check">✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="reminder-sheet-footer">
          {hasActiveReminder ? (
            <>
              <button className="reminder-cancel-btn" onClick={handleCancelReminder}>
                取消提醒
              </button>
              <button
                className="reminder-confirm-btn"
                onClick={handleConfirm}
                disabled={isExpired}
              >
                更新提醒
              </button>
            </>
          ) : (
            <>
              <button className="reminder-cancel-btn" onClick={onClose}>
                取消
              </button>
              <button
                className="reminder-confirm-btn"
                onClick={handleConfirm}
                disabled={isExpired}
              >
                确定
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HotelReservationFlowSheet({
  order,
  open,
  step,
  now,
  onStepChange,
  onClose,
  onComplete,
}: {
  order: OrderListItem;
  open: boolean;
  step: number;
  now: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onComplete: (stayDates: HotelStayDates) => void;
}) {
  const [store, setStore] = useState('万豪酒店·深圳湾店');
  const [room, setRoom] = useState(order.product.includes('大床') ? '高级大床房' : '豪华海景大床房');
  const baseDate = formatHotelLocalDate(now);
  const [monthOffset, setMonthOffset] = useState(0);
  const [guestName, setGuestName] = useState('江海强');
  const [guestPhone, setGuestPhone] = useState('13922920002');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const storePrefix = order.hotelProductType === 'calendar_room'
    ? order.merchant.replace(/\(.*?\)/g, '')
    : '上海中心酒店';
  const storeOptions = [
    {
      name: `${storePrefix}·旗舰店`,
      distance: '距你3km',
      address: '近外滩核心区',
      price: '¥2630起',
      stock: '4.6 非常棒',
      image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20modern%20luxury%20hotel%20exterior%20in%20Shanghai%2C%20golden%20building%2C%20travel%20booking%20thumbnail%2C%20commercial%20photo&image_size=square',
    },
    {
      name: `${storePrefix}·陆家嘴店`,
      distance: '距你3km',
      address: '近陆家嘴商圈',
      price: '¥2630起',
      stock: '4.6 非常棒',
      image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20boutique%20hotel%20lobby%20entrance%2C%20warm%20wood%20facade%2C%20travel%20booking%20thumbnail%2C%20commercial%20photo&image_size=square',
    },
    {
      name: `${storePrefix}·滨江店`,
      distance: '距你3km',
      address: '近浦东滨江',
      price: '¥2630起',
      stock: '4.6 非常棒',
      image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20resort%20hotel%20villa%20exterior%20with%20garden%2C%20travel%20booking%20thumbnail%2C%20commercial%20photo&image_size=square',
    },
  ];
  const roomOptions = [
    {
      name: '瑰丽双床房',
      desc: '2张单人床 42m² 有窗',
      stock: 25,
      priceDiff: 0,
      image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20hotel%20twin%20room%20with%20two%20beds%2C%20bright%20linen%2C%20travel%20booking%20room%20thumbnail&image_size=square',
    },
    {
      name: '瑰丽大床房',
      desc: '特大床 42m² 有窗',
      stock: 18,
      priceDiff: 300,
      image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20premium%20hotel%20king%20bed%20room%2C%20warm%20wood%20interior%2C%20travel%20booking%20room%20thumbnail&image_size=square',
    },
    {
      name: '瑰丽行政房',
      desc: '1张大床 42m² 有窗',
      stock: 0,
      priceDiff: 600,
      image: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20luxury%20hotel%20executive%20room%2C%20city%20view%2C%20travel%20booking%20room%20thumbnail&image_size=square',
    },
  ];
  const selectedRoom = roomOptions.find((item) => item.name === room) ?? roomOptions[0];
  const dateOptions = useMemo(() => {
    const offsets = [0, 1, 3, 7];
    return offsets.map((offset) => {
      const checkInDate = addHotelLocalDays(baseDate, offset);
      const checkOutDate = addHotelLocalDays(checkInDate, 3);
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      return {
        label: `${start.getMonth() + 1}.${start.getDate()}-${end.getMonth() + 1}.${end.getDate()}`,
        checkInDate,
        checkOutDate,
      };
    });
  }, [baseDate]);
  const [date, setDate] = useState(dateOptions[0]);
  const steps = ['选酒店', '选房型/日期', '确认信息'];
  const monthDate = useMemo(() => {
    const [year, month] = baseDate.split('-').map(Number);
    return new Date(year, month - 1 + monthOffset, 1);
  }, [baseDate, monthOffset]);
  const monthDays = useMemo(() => {
    const firstDay = monthDate.getDay();
    const totalDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const todayTime = new Date(`${baseDate}T00:00:00`).getTime();
    const cells: {
      key: string;
      day?: number;
      label?: string;
      dateValue?: string;
      disabled?: boolean;
      selected?: boolean;
      stock?: number;
    }[] = Array.from({ length: firstDay }, (_, index) => ({ key: `blank-${index}` }));

    for (let day = 1; day <= totalDays; day += 1) {
      const current = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const dateValue = formatHotelLocalDate(current);
      const currentTime = current.getTime();
      const disabled = currentTime < todayTime || day % 7 === 0 || day % 11 === 0 || selectedRoom.stock <= 0;
      const stock = disabled ? 0 : Math.max(1, selectedRoom.stock - (day % 5));
      const diffDays = Math.round((currentTime - todayTime) / (24 * 60 * 60 * 1000));
      cells.push({
        key: dateValue,
        day,
        label: diffDays === 0 ? '今天' : stock > 0 ? '可约' : '满房',
        dateValue,
        disabled,
        selected: date.checkInDate === dateValue,
        stock,
      });
    }

    return cells;
  }, [baseDate, date.checkInDate, monthDate, selectedRoom.stock]);
  const monthTitle = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`;
  const staySummary = getHotelStayDateLabels({ checkInDate: date.checkInDate, checkOutDate: date.checkOutDate, now });
  const canSubmit = Boolean(store && room && date.checkInDate && selectedRoom.stock > 0 && guestName.trim() && guestPhone.trim());

  useEffect(() => {
    if (!open) return;
    setStore(storeOptions[0].name);
    setRoom(roomOptions[0].name);
    setDate(dateOptions[0]);
    setMonthOffset(0);
    setGuestName('江海强');
    setGuestPhone('13922920002');
    setFormError('');
    setSubmitting(false);
  }, [dateOptions, open, order]);

  const selectCalendarDate = (dateValue: string | undefined, disabled?: boolean) => {
    if (!dateValue || disabled) return;
    setDate({
      label: dateValue.slice(5).replace('-', '.'),
      checkInDate: dateValue,
      checkOutDate: addHotelLocalDays(dateValue, 3),
    });
    setFormError('');
  };

  const handleNext = () => {
    if (submitting) return;
    if (step === 0) {
      if (!store) {
        setFormError('请选择预约门店');
        return;
      }
      setFormError('');
      onStepChange(1);
      return;
    }
    if (step === 1) {
      if (!room || selectedRoom.stock <= 0) {
        setFormError('当前房型暂无可预约库存，请选择其他房型');
        return;
      }
      if (!date.checkInDate) {
        setFormError('请选择入住日期');
        return;
      }
      setFormError('');
      onStepChange(2);
      return;
    }
    if (!guestName.trim()) {
      setFormError('请填写入住人姓名');
      return;
    }
    if (!isValidChinaMobile(guestPhone.trim())) {
      setFormError('请填写正确的预约人手机号');
      return;
    }
    setSubmitting(true);
    setFormError('');
    window.setTimeout(() => {
      onComplete({
        checkInDate: date.checkInDate,
        checkOutDate: date.checkOutDate,
      });
      setSubmitting(false);
    }, 450);
  };

  if (!open) return null;

  return (
    <div className="hotel-detail-reserve-mask">
      <div className="hotel-detail-reserve-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="hotel-detail-reserve-head">
          <button className="hotel-reserve-back" onClick={step === 0 ? onClose : () => onStepChange(step - 1)} aria-label="返回">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#20212b" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div>
            <h3>{steps[step]}</h3>
            <p>{steps.map((label, index) => <span key={label} className={index === step ? 'active' : ''}>{label}</span>)}</p>
          </div>
          <button className="hotel-reserve-close" onClick={onClose} aria-label="关闭预约流程">×</button>
        </div>

        <div className="hotel-detail-reserve-body">
          {step === 0 && (
            <div className="hotel-reserve-store-page">
              <div className="hotel-reserve-search">
                <span>全国</span>
                <input value="" readOnly placeholder="搜索门店名称" />
                <button type="button" aria-label="地图找店">地图</button>
              </div>
              <div className="hotel-reserve-filter">不限入离时间⌄</div>
              <div className="hotel-reserve-store-list">
                {storeOptions.map((item) => (
                  <button key={item.name + item.address} className={store === item.name ? 'active' : ''} onClick={() => setStore(item.name)}>
                    <img src={item.image} alt="" />
                    <div>
                      <strong>{item.name}<em>舒适型</em></strong>
                      <span>{item.stock} <b>上海市旗舰店限时...</b></span>
                      <p>{item.distance} · {item.address} · 近地铁/停车场</p>
                      <small>江景 山景 深夜服务 停车场</small>
                    </div>
                    <i />
                  </button>
                ))}
              </div>
              <div className="hotel-reserve-selected">已选 {store}</div>
            </div>
          )}

          {step === 1 && (
            <div className="hotel-reserve-room-page">
              <h4>选择房型</h4>
              <div className="hotel-reserve-room-list">
                {roomOptions.map((item) => (
                  <button
                    key={item.name}
                    className={`${room === item.name ? 'active' : ''} ${item.stock <= 0 ? 'disabled' : ''}`}
                    disabled={item.stock <= 0}
                    onClick={() => {
                      setRoom(item.name);
                      setFormError('');
                    }}
                  >
                    <img src={item.image} alt="" />
                    <strong>{item.name}</strong>
                    <span>{item.desc}</span>
                    <em>{item.stock > 0 ? `可约${item.stock}间` : '满房'}</em>
                  </button>
                ))}
              </div>

              <div className="hotel-reserve-calendar-head">
                <button type="button" disabled={monthOffset <= 0} onClick={() => setMonthOffset((value) => Math.max(0, value - 1))}>‹</button>
                <strong>{monthTitle}</strong>
                <button type="button" disabled={monthOffset >= 5} onClick={() => setMonthOffset((value) => Math.min(5, value + 1))}>›</button>
              </div>
              <div className="hotel-reserve-weekdays">
                {['日', '一', '二', '三', '四', '五', '六'].map((item) => <span key={item}>{item}</span>)}
              </div>
              <div className="hotel-reserve-calendar-grid">
                {monthDays.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${item.selected ? 'active' : ''} ${item.disabled ? 'disabled' : ''} ${!item.day ? 'empty' : ''}`}
                    disabled={!item.day || item.disabled}
                    onClick={() => selectCalendarDate(item.dateValue, item.disabled)}
                  >
                    {item.day && <strong>{item.day}</strong>}
                    {item.day && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
              <div className="hotel-reserve-date-summary">
                已选 {staySummary.checkInText} 入住，{staySummary.checkOutText} 离店，共{staySummary.nights}晚 · {selectedRoom.stock}间可约
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="hotel-reserve-confirm-page">
              <div className="hotel-reserve-confirm-product">
                <img src={selectedRoom.image} alt="" />
                <div>
                  <strong>北京瑰丽酒店-豪华客房赠送双人行政礼遇 双人早餐</strong>
                  <span>¥2688</span>
                </div>
              </div>

              <section>
                <h4>订房信息</h4>
                <div><span>预约门店</span><strong>{store}</strong></div>
                <div><span>入住离店</span><strong>{date.checkInDate} - {date.checkOutDate} 共{staySummary.nights}晚</strong></div>
                <div><span>房型</span><strong>{selectedRoom.name} 共1间 大床 有窗 23m²</strong></div>
              </section>

              <section>
                <h4>需填1位入住人</h4>
                <div className="hotel-reserve-guest-tabs">
                  {['江海强', '杨烨', '张晓洁'].map((name) => (
                    <button key={name} type="button" className={guestName === name ? 'active' : ''} onClick={() => setGuestName(name)}>{name}</button>
                  ))}
                  <button type="button">更多 ›</button>
                </div>
                <label>
                  <span>入住人</span>
                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="请填写入住人姓名" />
                </label>
                <label>
                  <span>手机号</span>
                  <input
                    value={guestPhone}
                    inputMode="numeric"
                    maxLength={11}
                    onChange={(event) => {
                      const nextPhone = event.target.value.replace(/\D/g, '').slice(0, 11);
                      setGuestPhone(nextPhone);
                      if (nextPhone.length === 11 && !isValidChinaMobile(nextPhone)) {
                        setFormError('手机号前三位不符合中国大陆真实号段');
                        return;
                      }
                      setFormError('');
                    }}
                    placeholder="请填写预约人手机号"
                  />
                </label>
              </section>

              <section className="hotel-reserve-rules">
                <h4>入住必读</h4>
                <p>· 办理入住须满足18–55岁 · 不可接待外宾</p>
                <p>· 不可携带5岁含以下儿童入住 · 不提供加婴儿床</p>
              </section>

              <section className="hotel-reserve-rules">
                <h4>预约须知</h4>
                <b>退改规则</b>
                <p>· 下单后若未预约酒店可随时全额退款。</p>
                <p>· 过期未预约自动全额退款。</p>
                <p>· 已入住或超时后未入住情况下不支持变更或取消订单，预约款将全额扣收。</p>
              </section>
            </div>
          )}

          {formError && <div className="hotel-reserve-error">{formError}</div>}
        </div>

        <div className="hotel-detail-reserve-foot">
          {step === 2 && <div className="hotel-reserve-price">差价 <strong>¥{selectedRoom.priceDiff}</strong></div>}
          <button
            className="primary"
            disabled={submitting || (step === 2 && !canSubmit)}
            onClick={handleNext}
          >
            {submitting ? '提交中...' : step === 2 ? '支付并预约' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScenicPresaleBookingFlow({
  order,
  step,
  selectedDate,
  visitorName,
  visitorPhone,
  visitorIdCard,
  errorMsg,
  submitting,
  confirmOpen,
  now,
  onDateSelect,
  onStepChange,
  onNameChange,
  onPhoneChange,
  onIdCardChange,
  onNext,
  onClose,
  onConfirm,
  onCancelConfirm,
}: {
  order: OrderListItem;
  step: 0 | 1 | 2;
  selectedDate: string;
  visitorName: string;
  visitorPhone: string;
  visitorIdCard: string;
  errorMsg: string;
  submitting: boolean;
  confirmOpen: boolean;
  now: number;
  onDateSelect: (iso: string) => void;
  onStepChange: (step: 0 | 1 | 2) => void;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onIdCardChange: (v: string) => void;
  onNext: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onCancelConfirm: () => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const baseDate = new Date(now);
  const monthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
  const monthTitle = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`;
  const todayTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime();
  const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
  const stepLabels = ['选择日期', '填写信息', '确认预约'];

  const monthDays = useMemo(() => {
    const firstDay = monthDate.getDay();
    const totalDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const cells: { key: string; day?: number; dateValue?: string; disabled?: boolean; selected?: boolean; isToday?: boolean; isWeekend?: boolean; stock?: number; label?: string }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ key: `blank-${i}` });
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const dateValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const t = d.getTime();
      const diffDays = Math.round((t - todayTime) / (24 * 60 * 60 * 1000));
      const disabled = diffDays < 1 || (day % 7 === 0 && diffDays > 3);
      const isToday = diffDays === 0;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const stock = disabled ? 0 : Math.max(0, 20 - (day % 13));
      let label = '';
      if (stock === 0 && !disabled) label = '已满';
      else if (stock > 0 && stock <= 5) label = `剩${stock}份`;
      cells.push({
        key: dateValue,
        day,
        dateValue,
        disabled: disabled || stock === 0,
        selected: selectedDate === dateValue,
        isToday,
        isWeekend,
        stock,
        label,
      });
    }
    return cells;
  }, [monthDate, selectedDate, todayTime]);

  const formatSelectedDate = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const weekDay = weekNames[dt.getDay()];
    return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} 周${weekDay}`;
  };

  const visitorPresets = ['江海强', '李平', '王胜凯'];

  return (
    <div className="spresale-mask">
      <div className="spresale-sheet">
        <div className="spresale-head">
          <button className="spresale-back" onClick={step === 0 ? onClose : () => onStepChange((step - 1) as 0 | 1)} aria-label="返回">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#20212b" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="spresale-title-group">
            <h3>{stepLabels[step]}</h3>
            <div className="spresale-steps">
              {stepLabels.map((label, idx) => (
                <span key={label} className={idx === step ? 'active' : idx < step ? 'done' : ''}>{idx < step ? '✓' : label}</span>
              ))}
            </div>
          </div>
          <button className="spresale-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="spresale-body">
          {step === 0 && (
            <div className="spresale-date-page">
              <div className="spresale-ticket-info">
                <div className="spresale-ticket-thumb">{order.thumbnail}</div>
                <div className="spresale-ticket-detail">
                  <div className="spresale-ticket-name">{order.product}</div>
                  <div className="spresale-ticket-merchant">{order.merchant}</div>
                </div>
              </div>
              <div className="spresale-calendar-head">
                <button type="button" disabled={monthOffset <= 0} onClick={() => setMonthOffset(v => Math.max(0, v - 1))}>‹</button>
                <strong>{monthTitle}</strong>
                <button type="button" disabled={monthOffset >= 3} onClick={() => setMonthOffset(v => Math.min(3, v + 1))}>›</button>
              </div>
              <div className="spresale-weekdays">
                {weekNames.map(w => <span key={w}>{w}</span>)}
              </div>
              <div className="spresale-calendar-grid">
                {monthDays.map(cell => (
                  <button
                    key={cell.key}
                    type="button"
                    className={`spresale-day ${cell.selected ? 'selected' : ''} ${cell.disabled ? 'disabled' : ''} ${cell.isToday ? 'today' : ''} ${!cell.day ? 'empty' : ''}`}
                    disabled={!cell.day || cell.disabled}
                    onClick={() => cell.dateValue && onDateSelect(cell.dateValue)}
                  >
                    {cell.day && (
                      <>
                        <span className="spresale-day-num">{cell.day}</span>
                        {cell.label && <span className="spresale-day-tag">{cell.label}</span>}
                      </>
                    )}
                  </button>
                ))}
              </div>
              <div className="spresale-calendar-legend">
                <span><i className="dot available" />可约</span>
                <span><i className="dot low" />紧张</span>
                <span><i className="dot full" />已满</span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="spresale-info-page">
              <div className="spresale-selected-date-card">
                <div className="spresale-sd-label">已选日期</div>
                <div className="spresale-sd-value">{formatSelectedDate(selectedDate)}</div>
                <button type="button" className="spresale-sd-change" onClick={() => onStepChange(0)}>修改</button>
              </div>

              <section className="spresale-form-section">
                <h4>游客信息 <em>需填写1位游客</em></h4>
                <div className="spresale-visitor-tabs">
                  {visitorPresets.map(name => (
                    <button key={name} type="button" className={visitorName === name ? 'active' : ''} onClick={() => onNameChange(name)}>{name}</button>
                  ))}
                  <button type="button" className="spresale-add-visitor">+ 添加游客</button>
                </div>
                <label className="spresale-form-item">
                  <span>姓名</span>
                  <input value={visitorName} onChange={e => onNameChange(e.target.value)} placeholder="请输入游客真实姓名" />
                </label>
                <label className="spresale-form-item">
                  <span>身份证号</span>
                  <input value={visitorIdCard} onChange={e => onIdCardChange(e.target.value)} placeholder="请输入身份证号（选填）" maxLength={18} />
                </label>
                <label className="spresale-form-item">
                  <span>手机号</span>
                  <input value={visitorPhone} onChange={e => onPhoneChange(e.target.value)} inputMode="numeric" placeholder="请输入接收预约短信的手机号" maxLength={11} />
                </label>
              </section>

              <section className="spresale-rules-section">
                <h4>预约须知</h4>
                <div className="spresale-rule-item">
                  <strong>使用规则</strong>
                  <p>· 需提前1天在线预约，预约成功后凭身份证原件或券码入园</p>
                  <p>· 预约后不可取消或修改，请谨慎选择出行日期</p>
                </div>
                <div className="spresale-rule-item">
                  <strong>退改说明</strong>
                  <p>· 未预约可随时全额退款</p>
                  <p>· 已预约订单不可退改</p>
                </div>
                <div className="spresale-rule-item">
                  <strong>入园须知</strong>
                  <p>· 开园时间 08:30-17:00（16:00停止入园）</p>
                  <p>· 需携带身份证原件核验入园</p>
                </div>
              </section>
            </div>
          )}

          {errorMsg && <div className="spresale-error">{errorMsg}</div>}
        </div>

        <div className="spresale-foot">
          {step === 0 && (
            <button className="spresale-primary-btn" disabled={!selectedDate} onClick={onNext}>
              {selectedDate ? `选择${formatSelectedDate(selectedDate).split(' ')[0]}` : '请选择预约日期'}
            </button>
          )}
          {step === 1 && (
            <button className="spresale-primary-btn" disabled={submitting} onClick={onNext}>
              {submitting ? '提交中...' : '确认预约'}
            </button>
          )}
        </div>

        {confirmOpen && (
          <div className="spresale-confirm-mask" onClick={onCancelConfirm}>
            <div className="spresale-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="spresale-confirm-title">确认预约信息</div>
              <div className="spresale-confirm-list">
                <div className="spresale-confirm-row">
                  <span>票种</span>
                  <strong>{order.product}</strong>
                </div>
                <div className="spresale-confirm-row">
                  <span>预约日期</span>
                  <strong>{formatSelectedDate(selectedDate)}</strong>
                </div>
                <div className="spresale-confirm-row">
                  <span>游客姓名</span>
                  <strong>{visitorName}</strong>
                </div>
                <div className="spresale-confirm-row">
                  <span>联系手机</span>
                  <strong>{visitorPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</strong>
                </div>
              </div>
              <div className="spresale-confirm-notice">预约提交后不可修改，请确认信息无误</div>
              <div className="spresale-confirm-actions">
                <button className="spresale-confirm-secondary" onClick={onCancelConfirm} disabled={submitting}>再想想</button>
                <button className="spresale-confirm-primary" onClick={onConfirm} disabled={submitting}>
                  {submitting ? '提交中...' : '确认预约'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TravelPresaleBookingFlow({
  order,
  step,
  startDate,
  endDate,
  travelers,
  contactPhone,
  contactEmail,
  errorMsg,
  submitting,
  confirmOpen,
  now,
  onStartDateSelect,
  onTravelerChange,
  onContactPhoneChange,
  onContactEmailChange,
  onStepChange,
  onNext,
  onClose,
  onConfirm,
  onCancelConfirm,
}: {
  order: OrderListItem;
  step: 0 | 1;
  startDate: string;
  endDate: string;
  travelers: {name: string; idCard: string; phone: string}[];
  contactPhone: string;
  contactEmail: string;
  errorMsg: string;
  submitting: boolean;
  confirmOpen: boolean;
  now: number;
  onStartDateSelect: (iso: string) => void;
  onTravelerChange: (index: number, field: 'name' | 'idCard' | 'phone', value: string) => void;
  onContactPhoneChange: (v: string) => void;
  onContactEmailChange: (v: string) => void;
  onStepChange: (step: 0 | 1) => void;
  onNext: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onCancelConfirm: () => void;
}) {
  const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
  const stepLabels = ['选日期', '填信息'];

  const extractTripDays = (productName: string): number => {
    const match = productName.match(/(\d+)\s*(日|天)/);
    return match ? parseInt(match[1], 10) : 4;
  };

  const tripDays = extractTripDays(order.product);

  const baseDate = new Date(now);
  const todayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime();

  const months = useMemo(() => {
    const result: {
      year: number;
      month: number;
      title: string;
      cells: { key: string; day?: number; dateValue?: string; disabled?: boolean; isToday?: boolean; isWeekend?: boolean; isSelected?: boolean; isInRange?: boolean; stock?: number; label?: string; labelType?: 'available' | 'low' | 'full' | 'rest' | 'holiday'; priceDiff?: number }[];
    }[] = [];
    for (let m = 0; m < 3; m++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + m, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDay = d.getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();
      const cells: { key: string; day?: number; dateValue?: string; disabled?: boolean; isToday?: boolean; isWeekend?: boolean; isSelected?: boolean; isInRange?: boolean; stock?: number; label?: string; labelType?: 'available' | 'low' | 'full' | 'rest' | 'holiday'; priceDiff?: number }[] = [];
      for (let i = 0; i < firstDay; i++) cells.push({ key: `blank-${m}-${i}` });
      for (let day = 1; day <= totalDays; day++) {
        const dateObj = new Date(year, month, day);
        const dateValue = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const t = dateObj.getTime();
        const diffDays = Math.round((t - todayStart) / (24 * 60 * 60 * 1000));
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const isToday = diffDays === 0;
        const disabled = diffDays < 1 || (day > 20 && m === 2);
        const stock = disabled ? 0 : Math.max(0, 8 - (day % 7));
        let label = '';
        let labelType: 'available' | 'low' | 'full' | 'rest' | 'holiday' | undefined;
        if (isToday) {
          label = '今天';
        } else if (stock === 0 && !disabled && day % 3 === 0) {
          label = '不可约';
          labelType = 'full';
        } else if (stock > 0 && stock <= 3) {
          label = `剩${stock}间`;
          labelType = 'low';
        } else if (day % 9 === 0 && !disabled) {
          label = '休';
          labelType = 'holiday';
        }
        const priceDiff = (!disabled && stock > 0 && isWeekend) ? 100 + (day % 5) * 50 : 0;
        let isSelected = false, isInRange = false;
        if (startDate && endDate) {
          isSelected = dateValue === startDate;
          isInRange = dateValue > startDate && dateValue < endDate;
        } else if (startDate) {
          isSelected = dateValue === startDate;
        }
        cells.push({
          key: dateValue,
          day,
          dateValue,
          disabled: disabled || (stock === 0 && labelType === 'full'),
          isToday,
          isWeekend,
          isSelected,
          isInRange,
          stock,
          label,
          labelType,
          priceDiff,
        });
      }
      result.push({ year, month, title: `${year}年${month + 1}月`, cells });
    }
    return result;
  }, [baseDate, todayStart, startDate, endDate]);

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    return `${sy}.${String(sm).padStart(2, '0')}.${String(sd).padStart(2, '0')}-${ey}.${String(em).padStart(2, '0')}.${String(ed).padStart(2, '0')}`;
  };

  const calcNights = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    return Math.round((e - s) / (24 * 60 * 60 * 1000));
  };

  const calcPriceDiff = () => {
    if (!startDate || !endDate) return 0;
    let total = 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    for (const m of months) {
      for (const c of m.cells) {
        if (!c.dateValue || !c.day) continue;
        const d = new Date(c.dateValue).getTime();
        if (d >= s.getTime() && d < e.getTime() && c.priceDiff) {
          total += c.priceDiff;
        }
      }
    }
    return total;
  };

  const travelerNames = travelers.filter(t => t.name.trim()).map(t => t.name).join('、');
  const nights = calcNights();
  const priceDiff = calcPriceDiff();

  return (
    <div className="tpresale-mask">
      <div className="tpresale-sheet">
        <div className="tpresale-head">
          <button className="tpresale-back" onClick={step === 0 ? onClose : () => onStepChange(0)} aria-label="返回">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#20212b" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="tpresale-steps">
            {stepLabels.map((label, idx) => (
              <span key={label} className={idx === step ? 'active' : idx < step ? 'done' : ''}>{label}</span>
            ))}
          </div>
          <button className="tpresale-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="tpresale-body">
          {step === 0 && (
            <div className="tpresale-date-page">
              <div className="tpresale-date-title">
                选择出游日期 <span className="tpresale-date-sub">共{tripDays}天{tripDays - 1}晚</span>
              </div>
              {months.map((m) => (
                <div key={`${m.year}-${m.month}`} className="tpresale-calendar-month">
                  <div className="tpresale-calendar-month-title">{m.title}</div>
                  <div className="tpresale-calendar-weekdays">
                    {weekNames.map((w, i) => <span key={w} className={i === 0 || i === 6 ? 'weekend' : ''}>{w}</span>)}
                  </div>
                  <div className="tpresale-calendar-grid">
                    {m.cells.map(cell => (
                      <button
                        key={cell.key}
                        type="button"
                        className={`tpresale-day ${cell.isSelected ? 'selected' : ''} ${cell.isInRange ? 'in-range' : ''} ${cell.disabled ? 'disabled' : ''} ${cell.isToday ? 'today' : ''} ${!cell.day ? 'empty' : ''}`}
                        disabled={!cell.day || cell.disabled}
                        onClick={() => cell.dateValue && onStartDateSelect(cell.dateValue)}
                      >
                        {cell.day && (
                          <>
                            <span className="tpresale-day-num">{cell.day}</span>
                            {cell.label && <span className={`tpresale-day-tag tag-${cell.labelType}`}>{cell.label}</span>}
                            {cell.isSelected && cell.priceDiff ? <span className="tpresale-day-price">+¥{cell.priceDiff}</span> : null}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="tpresale-calendar-legend">
                <span><i className="dot available" />可约</span>
                <span><i className="dot low" />紧张</span>
                <span><i className="dot full" />不可约</span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="tpresale-info-page">
              <div className="tpresale-product-card">
                <div className="tpresale-product-name">{order.product}</div>
                <div className="tpresale-info-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <span>{formatDateRange()} {tripDays}天{tripDays - 1}晚</span>
                  <button type="button" className="tpresale-info-edit" onClick={() => onStepChange(0)}>修改</button>
                </div>
                <div className="tpresale-info-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                  <span>共 <strong className="tpresale-accent">{travelers.filter(t => t.name.trim()).length || 2}</strong> 成人 <strong className="tpresale-accent">{Math.ceil((travelers.filter(t => t.name.trim()).length || 2) / 2)}</strong> 间房</span>
                  <button type="button" className="tpresale-info-add">增加人数/房间数 <span>&gt;</span></button>
                </div>
              </div>

              <section className="tpresale-form-section">
                <h4>入住人</h4>
                {travelers.map((t, idx) => (
                  <div key={idx} className="tpresale-traveler-row">
                    <span className="tpresale-traveler-label">入住人{idx + 1}</span>
                    <div className="tpresale-traveler-inputs">
                      {t.name ? (
                        <div className="tpresale-traveler-filled">{t.name}</div>
                      ) : (
                        <input
                          className="tpresale-traveler-placeholder"
                          value={t.name}
                          onChange={e => onTravelerChange(idx, 'name', e.target.value)}
                          placeholder={`点击添加入住人${idx + 1}信息`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </section>

              <section className="tpresale-form-section">
                <h4>联系方式</h4>
                <label className="tpresale-form-item">
                  <span>手机号码</span>
                  <input value={contactPhone} onChange={e => onContactPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" placeholder="用于接收订单信息" maxLength={11} />
                </label>
                <label className="tpresale-form-item">
                  <span>电子邮箱</span>
                  <input value={contactEmail} onChange={e => onContactEmailChange(e.target.value)} placeholder="选填 用于接收出行通知等" />
                </label>
              </section>

              <section className="tpresale-form-section">
                <h4>取消政策</h4>
                <p className="tpresale-cancel-policy">本次预约需商家确认，确认前可免费取消；确认后取消需联系商家，并可能收取手续费</p>
              </section>
            </div>
          )}

          {errorMsg && <div className="tpresale-error">{errorMsg}</div>}
        </div>

        <div className="tpresale-foot">
          {step === 0 && (
            <>
              <div className="tpresale-foot-left">
                {startDate && endDate ? (
                  <>
                    <strong>{formatDateRange().replace(/-/g, '–')}</strong>
                    <span>共{tripDays}天{tripDays - 1}晚</span>
                  </>
                ) : (
                  <span className="tpresale-foot-placeholder">请选择出游日期</span>
                )}
              </div>
              <div className="tpresale-foot-right">
                {priceDiff > 0 && (
                  <div className="tpresale-foot-diff">
                    需补日期差价 共¥{priceDiff}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  </div>
                )}
                <button className="tpresale-primary-btn" disabled={!startDate} onClick={onNext}>
                  下一步
                </button>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="tpresale-foot-left">
                <span className="tpresale-foot-diff-label">差价</span>
                <strong className="tpresale-foot-price">¥{priceDiff}</strong>
                <button type="button" className="tpresale-foot-detail">明细 <span>▾</span></button>
              </div>
              <div className="tpresale-foot-right">
                <button className="tpresale-primary-btn" disabled={submitting} onClick={onNext}>
                  {submitting ? '提交中...' : '提交并预约'}
                </button>
              </div>
            </>
          )}
        </div>

        {confirmOpen && (
          <div className="tpresale-confirm-mask" onClick={onCancelConfirm}>
            <div className="tpresale-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="tpresale-confirm-title">确认预约</div>
              <div className="tpresale-confirm-subtitle">预约成功后不可取消和修改</div>
              <div className="tpresale-confirm-list">
                <div className="tpresale-confirm-row">
                  <span className="tpresale-confirm-check">
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#34C759"/><path d="M8.5 12l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  </span>
                  <span className="tpresale-confirm-text">{order.product}</span>
                </div>
                <div className="tpresale-confirm-row">
                  <span className="tpresale-confirm-check">
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#34C759"/><path d="M8.5 12l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  </span>
                  <span className="tpresale-confirm-text">{startDate.replace(/-/g, '.')} – {endDate.split('-').slice(1).join('.')}</span>
                </div>
                <div className="tpresale-confirm-row">
                  <span className="tpresale-confirm-check">
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#34C759"/><path d="M8.5 12l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  </span>
                  <span className="tpresale-confirm-text">共{travelers.filter(t => t.name.trim()).length || 2}人 {Math.ceil((travelers.filter(t => t.name.trim()).length || 2) / 2)}间房</span>
                </div>
                <div className="tpresale-confirm-row">
                  <span className="tpresale-confirm-check">
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#34C759"/><path d="M8.5 12l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  </span>
                  <span className="tpresale-confirm-text">{travelerNames || '出行人信息'}</span>
                </div>
              </div>
              <div className="tpresale-confirm-actions">
                <button className="tpresale-confirm-secondary" onClick={onCancelConfirm} disabled={submitting}>再想想</button>
                <button className="tpresale-confirm-primary" onClick={onConfirm} disabled={submitting}>
                  {submitting ? '提交中...' : '支付并预约'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDetail({ orderId, onBack, onChatWithOrder, reservationInfo, reservationNow, onCancelReservation, onRebookReservation }: { orderId: string, onBack: () => void, onChatWithOrder: (payload: string | OrderListItem) => void, reservationInfo?: ReservationInfoCardData, reservationNow: number, onCancelReservation?: (orderId?: string) => void, onRebookReservation?: (reservation: ReservationInfoCardData) => void }) {
  const [detail, setDetail] = useState<OrderData | null>(null);
  const [listItem, setListItem] = useState<OrderListItem | null>(null);
  const [paymentDeadlineAt, setPaymentDeadlineAt] = useState(() => Date.now() + 28 * 60 * 1000 + 34 * 1000);
  const [localStatusText, setLocalStatusText] = useState<string | null>(null);
  const [hotelReservationState, setHotelReservationState] = useState<HotelReservationState | null>(null);
  const [hotelStayDates, setHotelStayDates] = useState<HotelStayDates>(() => createDefaultHotelStayDates(Date.now()));
  const [hotelReserveOpen, setHotelReserveOpen] = useState(false);
  const [hotelReserveStep, setHotelReserveStep] = useState(0);
  const [hotelCancelConfirmOpen, setHotelCancelConfirmOpen] = useState(false);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [reminderVersion, setReminderVersion] = useState(0);
  const [presaleBookingOpen, setPresaleBookingOpen] = useState(false);
  const [presaleBookingStep, setPresaleBookingStep] = useState<0 | 1 | 2>(0);
  const [presaleSelectedDate, setPresaleSelectedDate] = useState<string>('');
  const [presaleVisitorName, setPresaleVisitorName] = useState('');
  const [presaleVisitorPhone, setPresaleVisitorPhone] = useState('');
  const [presaleVisitorIdCard, setPresaleVisitorIdCard] = useState('');
  const [presaleBookingError, setPresaleBookingError] = useState('');
  const [presaleSubmitting, setPresaleSubmitting] = useState(false);
  const [presaleConfirmOpen, setPresaleConfirmOpen] = useState(false);
  const [presaleConfirmingDeadline, setPresaleConfirmingDeadline] = useState<number | null>(null);
  const [travelBookingOpen, setTravelBookingOpen] = useState(false);
  const [travelBookingStep, setTravelBookingStep] = useState<0 | 1>(0);
  const [travelStartDate, setTravelStartDate] = useState<string>('');
  const [travelEndDate, setTravelEndDate] = useState<string>('');
  const [travelTravelers, setTravelTravelers] = useState<{name: string; idCard: string; phone: string}[]>([
    { name: '', idCard: '', phone: '' },
    { name: '', idCard: '', phone: '' },
  ]);
  const [travelContactPhone, setTravelContactPhone] = useState('');
  const [travelContactEmail, setTravelContactEmail] = useState('');
  const [travelBookingError, setTravelBookingError] = useState('');
  const [travelBookingSubmitting, setTravelBookingSubmitting] = useState(false);
  const [travelConfirmOpen, setTravelConfirmOpen] = useState(false);
  const [travelConfirmingDeadline, setTravelConfirmingDeadline] = useState<number | null>(null);
  const [travelCancelConfirmOpen, setTravelCancelConfirmOpen] = useState(false);

  useEffect(() => {
    fetchOrderById(orderId).then(setDetail);
    const summary = ORDER_LIST.find(o => o.orderId === orderId) || null;
    setListItem(summary);
    setPaymentDeadlineAt(Date.now() + 28 * 60 * 1000 + 34 * 1000);
    setLocalStatusText(null);
    setHotelReserveOpen(false);
    setHotelReserveStep(0);
    setHotelCancelConfirmOpen(false);
    setHotelStayDates(createDefaultHotelStayDates(Date.now(), summary?.hotelProductType === 'calendar_room' ? 3 : 0));
    setPresaleBookingOpen(false);
    setPresaleBookingStep(0);
    setPresaleSelectedDate('');
    setPresaleVisitorName('');
    setPresaleVisitorPhone('');
    setPresaleVisitorIdCard('');
    setPresaleBookingError('');
    setPresaleSubmitting(false);
    setPresaleConfirmOpen(false);
    setPresaleConfirmingDeadline(null);
    setTravelBookingOpen(false);
    setTravelBookingStep(0);
    setTravelStartDate('');
    setTravelEndDate('');
    setTravelTravelers([{ name: '', idCard: '', phone: '' }, { name: '', idCard: '', phone: '' }]);
    setTravelContactPhone('');
    setTravelContactEmail('');
    setTravelBookingError('');
    setTravelBookingSubmitting(false);
    setTravelConfirmOpen(false);
    setTravelConfirmingDeadline(null);
    setTravelCancelConfirmOpen(false);
    if (summary && isHotelOrder(summary)) {
      const status = summary.statusText as HotelOrderStatusText;
      const needsCountdown = status === '预约确认中' || status === '预订确认中';
      setHotelReservationState({
        status,
        deadlineAt: needsCountdown ? Date.now() + 5 * 60 * 1000 : undefined,
        notice: needsCountdown ? '商家正在确认房态，请留意预约结果' : undefined,
      });
    } else {
      setHotelReservationState(null);
    }
  }, [orderId]);

  useEffect(() => {
    if (!listItem) return;
    const shouldCountdown = listItem.statusText === '待支付' && ['food', 'hotel', 'general'].includes(toStandardCategory(listItem.category));
    if (shouldCountdown && reservationNow >= paymentDeadlineAt) {
      setLocalStatusText('订单取消');
    }
  }, [listItem, paymentDeadlineAt, reservationNow]);

  useEffect(() => {
    const unsubscribe = subscribeReminders(() => {
      setReminderVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hotelReservationState) return;
    const refreshed = refreshHotelReservationByTime(hotelReservationState, reservationNow);
    if (refreshed !== hotelReservationState) {
      setHotelReservationState(refreshed);
    }
  }, [hotelReservationState, reservationNow]);

  useEffect(() => {
    if (!presaleConfirmingDeadline) return;
    if (reservationNow >= presaleConfirmingDeadline) {
      setLocalStatusText('预约成功');
      setPresaleConfirmingDeadline(null);
    }
  }, [presaleConfirmingDeadline, reservationNow]);

  useEffect(() => {
    if (!travelConfirmingDeadline) return;
    if (reservationNow >= travelConfirmingDeadline) {
      setLocalStatusText('待预约');
      setTravelConfirmingDeadline(null);
    }
  }, [travelConfirmingDeadline, reservationNow]);

  const openPresaleBooking = () => {
    setPresaleBookingOpen(true);
    setPresaleBookingStep(0);
    setPresaleSelectedDate('');
    setPresaleVisitorName(detail?.scenicInfo?.visitors?.[0]?.name ?? '江海强');
    setPresaleVisitorPhone('13922920002');
    setPresaleVisitorIdCard(detail?.scenicInfo?.visitors?.[0]?.idCard ?? '');
    setPresaleBookingError('');
  };

  const closePresaleBooking = () => {
    setPresaleBookingOpen(false);
    setPresaleConfirmOpen(false);
    setPresaleBookingError('');
    setPresaleSubmitting(false);
  };

  const handlePresaleNext = () => {
    if (presaleSubmitting) return;
    if (presaleBookingStep === 0) {
      if (!presaleSelectedDate) {
        setPresaleBookingError('请选择预约日期');
        return;
      }
      setPresaleBookingError('');
      setPresaleBookingStep(1);
      return;
    }
    if (presaleBookingStep === 1) {
      if (!presaleVisitorName.trim()) {
        setPresaleBookingError('请填写游客姓名');
        return;
      }
      if (!/^1[3-9]\d{9}$/.test(presaleVisitorPhone.trim())) {
        setPresaleBookingError('请填写正确的手机号');
        return;
      }
      if (presaleVisitorIdCard.trim() && !/^\d{17}[\dXx]$/.test(presaleVisitorIdCard.trim())) {
        setPresaleBookingError('请填写正确的身份证号');
        return;
      }
      setPresaleBookingError('');
      setPresaleConfirmOpen(true);
      return;
    }
  };

  const submitPresaleBooking = () => {
    setPresaleSubmitting(true);
    window.setTimeout(() => {
      setLocalStatusText('预约确认中');
      setPresaleConfirmingDeadline(Date.now() + 8000);
      setPresaleSubmitting(false);
      closePresaleBooking();
    }, 600);
  };

  const extractTripDays = (productName: string): number => {
    const match = productName.match(/(\d+)\s*(日|天)/);
    return match ? parseInt(match[1], 10) : 4;
  };

  const tripDays = extractTripDays(listItem?.product || '');

  const calculateEndDate = (startIso: string, days: number): string => {
    const d = new Date(startIso);
    d.setDate(d.getDate() + days - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const openTravelBooking = () => {
    const defaultTravelers = detail?.vacationInfo?.passengers?.length
      ? detail.vacationInfo.passengers.map(name => ({ name, idCard: '', phone: '' }))
      : [{ name: '', idCard: '', phone: '' }, { name: '', idCard: '', phone: '' }];
    setTravelBookingOpen(true);
    setTravelBookingStep(0);
    setTravelStartDate('');
    setTravelEndDate('');
    setTravelTravelers(defaultTravelers);
    setTravelContactPhone('13922920002');
    setTravelContactEmail('');
    setTravelBookingError('');
  };

  const closeTravelBooking = () => {
    setTravelBookingOpen(false);
    setTravelConfirmOpen(false);
    setTravelBookingError('');
    setTravelBookingSubmitting(false);
  };

  const handleTravelNext = () => {
    if (travelBookingSubmitting) return;
    if (travelBookingStep === 0) {
      if (!travelStartDate) {
        setTravelBookingError('请选择出行日期');
        return;
      }
      setTravelBookingError('');
      setTravelBookingStep(1);
      return;
    }
    if (travelBookingStep === 1) {
      const hasValidTraveler = travelTravelers.some(t => t.name.trim());
      if (!hasValidTraveler) {
        setTravelBookingError('请填写至少一位出行人姓名');
        return;
      }
      if (!/^1[3-9]\d{9}$/.test(travelContactPhone.trim())) {
        setTravelBookingError('请填写正确的联系手机号');
        return;
      }
      setTravelBookingError('');
      setTravelConfirmOpen(true);
      return;
    }
  };

  const submitTravelBooking = () => {
    setTravelBookingSubmitting(true);
    window.setTimeout(() => {
      setLocalStatusText('预约确认中');
      setTravelConfirmingDeadline(Date.now() + 30 * 60 * 1000);
      setDetail(prev => prev ? {
        ...prev,
        vacationInfo: {
          ...prev.vacationInfo,
          departureDate: travelStartDate,
          returnDate: travelEndDate,
          passengers: travelTravelers.filter(t => t.name.trim()).map(t => t.name),
          contactPhone: travelContactPhone,
          contactEmail: travelContactEmail,
        }
      } : prev);
      setTravelBookingSubmitting(false);
      closeTravelBooking();
    }, 800);
  };

  if (!detail || !listItem) {
    return (
      <div className="oc-detail-page">
        <div className="oc-detail-header-v3">
          <button className="oc-detail-back" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="oc-detail-title">加载中</div>
          <button className="icon-btn" style={{ border: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          </button>
        </div>
        <div className="oc-detail-scroll-v3" style={{ opacity: 0.6 }}>
          <div className="oc-skeleton-card" style={{ height: 100, marginBottom: 12, borderRadius: 12, background: '#fff' }}></div>
          <div className="oc-skeleton-card" style={{ height: 300, marginBottom: 12, borderRadius: 12, background: '#fff' }}></div>
          <div className="oc-skeleton-card" style={{ height: 150, marginBottom: 12, borderRadius: 12, background: '#fff' }}></div>
        </div>
        <div className="oc-detail-bottom-bar-v3">
          <div style={{ width: 100, height: 36, background: '#eee', borderRadius: 18 }}></div>
          <div style={{ width: 100, height: 36, background: '#eee', borderRadius: 18 }}></div>
        </div>
      </div>
    );
  }

  const hotelOrder = isHotelOrder(listItem);
  const hotelView = hotelOrder ? getHotelStatusView(listItem.hotelProductType!, localStatusText ?? hotelReservationState?.status ?? listItem.statusText) : null;
  const scenicOrder = toStandardCategory(listItem.category) === 'scenic';
  const isScenicGroupBuyDesignState = scenicOrder && listItem.scenicProductType === 'group_buy';
  const displayStatusText = hotelView?.status ?? localStatusText ?? listItem.statusText;
  const displayListItem = { ...listItem, statusText: displayStatusText, statusColor: hotelOrder ? getHotelStatusColor(displayStatusText as HotelOrderStatusText) : listItem.statusColor };
  const isUnpaid = displayStatusText === '待支付';
  const isFoodOrFunUnpaid = isUnpaid && ['food', 'general'].includes(toStandardCategory(listItem.category));
  const isScenicUnpaid = isUnpaid && isScenicGroupBuyDesignState;
  const isUnredeemed = ['待使用', '待预约', '预约确认中', '预约成功', '预订确认中', '预订成功'].includes(displayStatusText);
  const isScenicUnredeemed = isUnredeemed && isScenicGroupBuyDesignState;
  const isCompleted = displayStatusText === '交易完成';
  const isScenicCompleted = isCompleted && isScenicGroupBuyDesignState;
  const isCanceledOrRefunded = ['订单取消', '退款成功', '退款申请中', '退款失败'].includes(displayStatusText);
  const isScenicCanceled = displayStatusText === '订单取消' && isScenicGroupBuyDesignState;
  const isRefunding = displayStatusText === '退款申请中';
  const isRefunded = displayStatusText === '退款成功';
  const isRefundFailed = displayStatusText === '退款失败';
  const isScenicCalendarDesignState = scenicOrder && listItem.scenicProductType === 'calendar_ticket';
  const isScenicCalendarPaying = isScenicCalendarDesignState && isUnpaid;
  const isScenicCalendarPendingBook = isScenicCalendarDesignState && displayStatusText === '待预约';
  const isScenicCalendarConfirming = isScenicCalendarDesignState && (displayStatusText === '预订确认中' || displayStatusText === '预约确认中');
  const isScenicCalendarConfirmed = isScenicCalendarDesignState && (displayStatusText === '预订成功' || displayStatusText === '预约成功');
  const isScenicCalendarVisited = isScenicCalendarDesignState && displayStatusText === '已使用';
  const isScenicCalendarCanceled = isScenicCalendarDesignState && displayStatusText === '订单取消';
  const isScenicCalendarRefundRelated = isScenicCalendarDesignState && (isRefunded || isRefunding || isRefundFailed);
  const isScenicPresaleDesignState = scenicOrder && listItem.scenicProductType === 'presale_voucher';
  const isScenicPresalePaying = isScenicPresaleDesignState && isUnpaid;
  const isScenicPresalePendingBook = isScenicPresaleDesignState && displayStatusText === '待预约';
  const isScenicPresaleConfirming = isScenicPresaleDesignState && (displayStatusText === '预约确认中' || displayStatusText === '预订确认中');
  const isScenicPresaleConfirmed = isScenicPresaleDesignState && (displayStatusText === '预约成功' || displayStatusText === '预订成功');
  const isScenicPresaleVisited = isScenicPresaleDesignState && (displayStatusText === '已入园' || displayStatusText === '已使用');
  const isScenicPresaleCanceled = isScenicPresaleDesignState && displayStatusText === '订单取消';
  const isScenicPresaleCompleted = isScenicPresaleDesignState && isCompleted;
  const isScenicPresaleRefundRelated = isScenicPresaleDesignState && (isRefunded || isRefunding || isRefundFailed);
  const travelOrder = toStandardCategory(listItem.category) === 'travel';
  const isTravelPresaleDesignState = travelOrder && listItem.travelProductType === 'presale_voucher';
  const isTravelPresalePaying = isTravelPresaleDesignState && isUnpaid;
  const isTravelPresalePendingBook = isTravelPresaleDesignState && displayStatusText === '待预约';
  const isTravelPresaleConfirming = isTravelPresaleDesignState && displayStatusText === '预约确认中';
  const isTravelPresaleConfirmed = isTravelPresaleDesignState && displayStatusText === '预约成功';
  const isTravelPresaleCompleted = isTravelPresaleDesignState && isCompleted;
  const isTravelPresaleCanceled = isTravelPresaleDesignState && displayStatusText === '订单取消';
  const isTravelPresaleRefunding = isTravelPresaleDesignState && isRefunding;
  const isTravelPresaleRefunded = isTravelPresaleDesignState && isRefunded;
  const isTravelPresaleRefundFailed = isTravelPresaleDesignState && isRefundFailed;
  const isTravelPresaleRefundRelated = isTravelPresaleDesignState && (isRefunded || isRefunding || isRefundFailed);
  const isTravelPresaleV2State = isTravelPresaleDesignState;
  const foodOrder = toStandardCategory(listItem.category) === 'food';
  const foodFulfillModes = (foodOrder && listItem.fulfillmentModes) || ['code'];
  const foodHasCode = foodFulfillModes.includes('code');
  const foodHasOrder = foodFulfillModes.includes('order');
  const foodHasDelivery = foodFulfillModes.includes('delivery');
  const foodFulfillCombo = `${foodHasOrder ? 'O' : ''}${foodHasCode ? 'C' : ''}${foodHasDelivery ? 'D' : ''}`;
  const isFoodFulfillDesignState = foodOrder && isUnredeemed;
  const paymentCountdownText = formatPaymentCountdown(paymentDeadlineAt, reservationNow);
  const hotelCountdownText = hotelOrder && (displayStatusText === '预约确认中' || displayStatusText === '预订确认中')
    ? getHotelCountdownText(hotelReservationState?.deadlineAt, reservationNow)
    : '';
  const hotelStayLabels = getHotelStayDateLabels({
    checkInDate: hotelStayDates.checkInDate,
    checkOutDate: hotelStayDates.checkOutDate,
    now: reservationNow,
  });
  const payableAmount = Math.round(listItem.price / 100);
  const referenceAmount = payableAmount + 200;
  const groupDiscount = Math.max(0, referenceAmount - payableAmount - 20);
  const hotelPresaleDisplayPrice = 538;
  const hasMergedContentBelowNotice = isFoodOrFunUnpaid || Boolean(reservationInfo) || isUnredeemed || hotelOrder;
  const isPresaleWaitingReserve = hotelOrder && listItem.hotelProductType === 'presale_voucher' && displayStatusText === '待预约';
  const isHotelBookingReferenceState = hotelOrder && (displayStatusText === '预约确认中' || displayStatusText === '预约成功');
  const isHotelPresaleDesignState = hotelOrder && listItem.hotelProductType === 'presale_voucher' && ['待支付', '交易完成', '订单取消', '退款成功', '退款申请中', '退款失败'].includes(displayStatusText);
  const isHotelCalendarDesignState = hotelOrder && listItem.hotelProductType === 'calendar_room';
  const isHotelPresalePaying = isHotelPresaleDesignState && displayStatusText === '待支付';
  const isHotelCalendarPaying = isHotelCalendarDesignState && displayStatusText === '待支付';
  const hotelBrandImage = 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20night%20exterior%20photo%20of%20a%20Hilton%20Hampton%20hotel%20entrance%2C%20blue%20hotel%20sign%2C%20urban%20Beijing%2C%20commercial%20architecture%2C%20website%20product%20image%2C%20high%20detail&image_size=square';
  const hotelRoomImage = 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20hotel%20room%20product%20photo%2C%20premium%20king%20bed%2C%20dark%20wood%20bedside%20lamp%2C%20warm%20lighting%2C%20clean%20commercial%20travel%20booking%20image&image_size=square';
  const calendarCancelRule = resolveCalendarCancelRule(hotelStayDates, reservationNow);
  const calendarCancelRuleText = calendarCancelRule === 'free'
    ? '入住前48小时可免费取消'
    : calendarCancelRule === 'fee_review'
      ? '当前取消需扣除手续费，提交后等待商家确认'
      : '当前时段不可取消';
  const hotelReserveDates = [
    { week: '周三', date: '6/1', status: '可约' },
    { week: '周四', date: '6/2', status: '可约' },
    { week: '周五', date: '6/3', status: '可约' },
    { week: '周六', date: '6/4', status: '可约' },
    { week: '周日', date: '6/5', status: '可约' },
  ];
  const validUntil = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  })();
  const scenicExpireDate = detail.scenicInfo?.expireDate ?? validUntil;
  const scenicCouponCount = detail.scenicInfo?.coupons?.length ?? listItem.totalQuantity ?? 1;
  const scenicVisitDate = detail.scenicInfo?.visitDate ?? '2026-06-29';
  const scenicVisitTime = detail.scenicInfo?.visitTime ?? '08:30-12:00';
  const scenicTicketType = detail.scenicInfo?.ticketType ?? '上午场·成人票';
  const scenicCalendarVisitDateFormatted = scenicVisitDate.replace(/-/g, '.');
  const scenicStatusSubtitle = (() => {
    if (isScenicUnpaid) return '超过30分未支付，订单将自动取消';
    if (isScenicUnredeemed) return `请在 ${scenicExpireDate}(含)前办理入园`;
    if (isScenicCompleted) return '感谢购买，期待再次光临';
    if (isScenicCanceled) return '订单已取消';
    if (isRefunding) return '审核通过后，钱款预计1-2个自然日到账';
    if (isRefunded) return '钱款已退回';
    if (isRefundFailed) return '退款失败，请联系抖音客服咨询详情';
    return '订单信息已更新';
  })();
  const scenicCalendarStatusSubtitle = (() => {
    if (isScenicCalendarPaying) return '超过30分未支付，订单将自动取消';
    if (isScenicCalendarPendingBook) return `请在 ${scenicExpireDate}(含)前完成预约`;
    if (isScenicCalendarConfirming) return '商家将在5分钟内确认出票结果';
    if (isScenicCalendarConfirmed) return `请在 ${scenicCalendarVisitDateFormatted}(含)前办理入园`;
    if (isScenicCalendarVisited) return '感谢购买，期待再次光临';
    if (isScenicCalendarCanceled) return '订单已取消';
    if (isRefunding) return '审核通过后，钱款预计1-2个自然日到账';
    if (isRefunded) return '钱款已退回';
    if (isRefundFailed) return '退款失败，请联系抖音客服咨询详情';
    return '订单信息已更新';
  })();
  const scenicPresaleStatusSubtitle = (() => {
    if (isScenicPresalePaying) return '超过30分未支付，订单将自动取消';
    if (isScenicPresalePendingBook) return `请在 ${scenicExpireDate}(含)前完成预约`;
    if (isScenicPresaleConfirming) return '商家将在30分钟内确认预约结果';
    if (isScenicPresaleConfirmed) return `请在 ${scenicVisitDate.replace(/-/g, '.')}(含)前办理入园`;
    if (isScenicPresaleVisited) return '感谢购买，期待再次光临';
    if (isScenicPresaleCompleted) return '感谢购买，期待再次光临';
    if (isScenicPresaleCanceled) return '订单已取消';
    if (isRefunding) return '审核通过后，钱款预计1-2个自然日到账';
    if (isRefunded) return '钱款已退回';
    if (isRefundFailed) return '退款失败，请联系抖音客服咨询详情';
    return '订单信息已更新';
  })();
  const travelPresaleStatusSubtitle = (() => {
    if (isTravelPresalePaying) return '超过30分未支付，订单将自动取消';
    if (isTravelPresalePendingBook) return '请在有效期内完成预约，锁定出行日期';
    if (isTravelPresaleConfirming) return '商家将在30分钟内确认预约结果';
    if (isTravelPresaleConfirmed) return '预约成功，请按预约日期出行';
    if (isTravelPresaleCompleted) return '感谢购买，期待再次光临';
    if (isTravelPresaleCanceled) return '订单已取消';
    if (isTravelPresaleRefunding) return '审核通过后，钱款预计1-2个自然日到账';
    if (isTravelPresaleRefunded) return '钱款已退回';
    if (isTravelPresaleRefundFailed) return '退款失败，请联系抖音客服咨询详情';
    return '订单信息已更新';
  })();
  const statusSubtitle = (() => {
    if (isScenicGroupBuyDesignState) return scenicStatusSubtitle;
    if (isScenicCalendarDesignState) return scenicCalendarStatusSubtitle;
    if (isScenicPresaleDesignState) return scenicPresaleStatusSubtitle;
    if (isTravelPresaleDesignState) return travelPresaleStatusSubtitle;
    if (isHotelPresalePaying || isHotelCalendarPaying) return '超时未支付订单将自动取消';
    if (isHotelBookingReferenceState) {
      return displayStatusText === '预约成功' ? '请在 2024.09.23到店办理入住' : '商家将在3分钟内完成确认';
    }
    if (isHotelPresaleDesignState && hotelView) return hotelView.subtitle;
    if (hotelView) return hotelView.subtitle;
    if (isUnredeemed) return `请在 ${validUntil}(含) 前到店消费`;
    if (displayStatusText === '交易完成') return '感谢购买，期待再次光临';
    if (displayStatusText === '退款成功') return '钱款已退回';
    if (displayStatusText === '退款申请中') return '审核通过后，钱款预计1-2个自然日到账';
    if (displayStatusText === '退款失败') return '请联系抖音客服咨询详情';
    if (displayStatusText === '订单取消') return '订单已自动取消';
    return '订单信息已更新';
  })();
  const bottomActions = (() => {
    if (isScenicGroupBuyDesignState) {
      if (isScenicUnpaid) return [];
      if (isScenicUnredeemed) {
        return [
          { label: '申请退款', type: 'outline' as const },
          { label: '再来一单', type: 'solid' as const },
        ];
      }
      if (isScenicCompleted) {
        return [
          { label: '再来一单', type: 'outline' as const },
          { label: '去评价', type: 'solid' as const },
        ];
      }
      if (isScenicCanceled || isRefunded || isRefundFailed) return [{ label: '再来一单', type: 'solid' as const }];
      if (isRefunding) return [{ label: '帮我加急', type: 'solid' as const }];
      return [{ label: '再来一单', type: 'solid' as const }];
    }
    if (isScenicCalendarDesignState) {
      if (isScenicCalendarPaying) return [];
      if (isScenicCalendarPendingBook) {
        return [
          { label: '申请退款', type: 'outline' as const },
          { label: '立即预约', type: 'solid' as const },
        ];
      }
      if (isScenicCalendarConfirming) {
        return [
          { label: '申请退款', type: 'outline' as const, disabled: true },
          { label: '再来一单', type: 'solid' as const },
        ];
      }
      if (isScenicCalendarConfirmed) {
        return [
          { label: '申请退款', type: 'outline' as const },
          { label: '再来一单', type: 'solid' as const },
        ];
      }
      if (isScenicCalendarVisited) {
        return [
          { label: '再来一单', type: 'outline' as const },
          { label: '去评价', type: 'solid' as const },
        ];
      }
      if (isScenicCalendarCanceled || isRefunded || isRefundFailed) return [{ label: '再来一单', type: 'solid' as const }];
      if (isRefunding) return [{ label: '帮我加急', type: 'solid' as const }];
      return [{ label: '再来一单', type: 'solid' as const }];
    }
    if (isScenicPresaleDesignState) {
      if (isScenicPresalePaying) return [];
      if (isScenicPresalePendingBook) {
        return [
          { label: '申请退款', type: 'outline' as const },
          { label: '立即预约', type: 'solid' as const },
        ];
      }
      if (isScenicPresaleConfirming) {
        return [
          { label: '申请退款', type: 'outline' as const, disabled: true },
          { label: '帮我加急', type: 'solid' as const },
        ];
      }
      if (isScenicPresaleConfirmed || isScenicPresaleVisited) {
        return [
          { label: '申请退款', type: 'outline' as const },
          { label: '再来一单', type: 'solid' as const },
        ];
      }
      if (isScenicPresaleCompleted) {
        return [
          { label: '再来一单', type: 'outline' as const },
          { label: '去评价', type: 'solid' as const },
        ];
      }
      if (isScenicPresaleCanceled || isRefunded || isRefundFailed) return [{ label: '再来一单', type: 'solid' as const }];
      if (isRefunding) return [{ label: '帮我加急', type: 'solid' as const }];
      return [{ label: '再来一单', type: 'solid' as const }];
    }
    if (isTravelPresaleDesignState) {
      if (isTravelPresalePaying) return [];
      if (isTravelPresalePendingBook) {
        return [
          { label: '申请退款', type: 'outline' as const },
          { label: '预约出行', type: 'solid' as const, key: 'book' },
        ];
      }
      if (isTravelPresaleConfirming) {
        return [
          { label: '取消预约', type: 'outline' as const },
        ];
      }
      if (isTravelPresaleConfirmed) {
        return [
          { label: '取消预约', type: 'outline' as const },
          { label: '联系商家', type: 'solid' as const },
        ];
      }
      if (isTravelPresaleCompleted) {
        return [
          { label: '再来一单', type: 'outline' as const },
          { label: '去评价', type: 'solid' as const },
        ];
      }
      if (isTravelPresaleCanceled || isTravelPresaleRefunded || isTravelPresaleRefundFailed) return [{ label: '再来一单', type: 'solid' as const }];
      if (isTravelPresaleRefunding) return [{ label: '再来一单', type: 'solid' as const }];
      return [{ label: '再来一单', type: 'solid' as const }];
    }
    if (isHotelCalendarDesignState) {
      if (displayStatusText === '待支付') return [];
      if (displayStatusText === '待预约') {
        return [
          { label: '申请退款', type: 'outline' as const },
          { label: '继续预订', type: 'solid' as const },
        ];
      }
      if (displayStatusText === '预订确认中' || displayStatusText === '预约确认中') {
        return [
          { label: '取消预约', type: 'outline' as const },
          { label: '再来一单', type: 'solid' as const },
        ];
      }
      if (displayStatusText === '预订成功' || displayStatusText === '预约成功') {
        return calendarCancelRule === 'not_cancelable'
          ? [{ label: '再来一单', type: 'solid' as const }]
          : [
              { label: '取消预约', type: 'outline' as const },
              { label: '再来一单', type: 'solid' as const },
            ];
      }
      if (displayStatusText === '交易完成') {
        return [
          { label: '再来一单', type: 'outline' as const },
          { label: '去评价', type: 'solid' as const },
        ];
      }
      return [{ label: '再来一单', type: 'solid' as const }];
    }
    if (isHotelPresaleDesignState) {
      if (displayStatusText === '待支付') return [];
      if (displayStatusText === '交易完成') {
        return [
          { label: '再来一单', type: 'outline' as const },
          { label: '去评价', type: 'solid' as const },
        ];
      }
      return [{ label: '再来一单', type: 'solid' as const }];
    }
    if (hotelView) {
      if (displayStatusText === '待预约') return [{ label: hotelView.primaryAction ?? '立即预约', type: 'solid' as const }];
      if (displayStatusText === '预约确认中' || displayStatusText === '预约成功') {
        return [
          { label: '取消预约', type: 'outline' as const },
          { label: '再来一单', type: 'solid' as const },
        ];
      }
      if (displayStatusText === '预订确认中') {
        return [
          { label: '取消预约', type: 'outline' as const },
          { label: '再来一单', type: 'solid' as const },
        ];
      }
      if (displayStatusText === '预订成功') {
        return [
          { label: '取消预约', type: 'outline' as const },
          { label: '再来一单', type: 'solid' as const },
        ];
      }
      return [{ label: hotelView.primaryAction ?? '再来一单', type: 'solid' as const }];
    }
    if (isUnpaid) return [{ label: '立即支付', type: 'solid' as const }];
    if (isUnredeemed) {
      return [
        { label: '赠送好友', type: 'outline' as const },
        { label: '申请退款', type: 'outline' as const },
        { label: '再来一单', type: 'solid' as const },
      ];
    }
    if (isCompleted) {
      return [
        { label: '再来一单', type: 'outline' as const },
        { label: '去评价', type: 'solid' as const },
      ];
    }
    if (isCanceledOrRefunded) return [{ label: '再来一单', type: 'solid' as const }];
    return [{ label: '再来一单', type: 'solid' as const }];
  })();

  const submitHotelReservation = (stayDates: HotelStayDates) => {
    setHotelStayDates(stayDates);
    if (listItem.hotelProductType === 'calendar_room') {
      setHotelReservationState({
        status: '预订确认中',
        deadlineAt: reservationNow + 5 * 60 * 1000,
        notice: '酒店正在确认房态，请留意预订结果',
      });
    } else {
      setHotelReservationState(transitionHotelReservation({ status: '待预约' }, 'submit_reservation', reservationNow));
    }
    setHotelReserveOpen(false);
    setHotelReserveStep(0);
  };

  const handleBottomAction = (label: string) => {
    if (isScenicCalendarDesignState) {
      if (label === '立即预约') {
        openPresaleBooking();
        return;
      }
    }
    if (isScenicPresaleDesignState) {
      if (label === '立即预约') {
        openPresaleBooking();
        return;
      }
    }
    if (isTravelPresaleDesignState) {
      if (label === '预约出行') {
        openTravelBooking();
        return;
      }
      if (label === '取消预约') {
        setTravelCancelConfirmOpen(true);
        return;
      }
      if (label === '联系商家') {
        return;
      }
      if (label === '再来一单' || label === '去评价') {
        return;
      }
    }
    if (!hotelView || !hotelOrder) return;
    if (label === '立即预约' || label === '继续预订') {
      setHotelReserveOpen(true);
      setHotelReserveStep(0);
      return;
    }
    if (label === '取消预约') {
      if (listItem.hotelProductType === 'calendar_room' && ['预订成功', '预约成功'].includes(displayStatusText) && calendarCancelRule === 'not_cancelable') {
        setHotelReservationState((prev) => ({
          status: (prev?.status ?? displayStatusText) as HotelOrderStatusText,
          deadlineAt: prev?.deadlineAt,
          notice: '当前时段不可取消，如需协助请联系酒店客服',
        }));
        return;
      }
      setHotelCancelConfirmOpen(true);
      return;
    }
    if (label === '商家接单') {
      setHotelReservationState((prev) => transitionHotelReservation(prev ?? { status: displayStatusText as HotelOrderStatusText }, 'merchant_accept', reservationNow));
      return;
    }
    if (label === '拒绝预约') {
      setHotelReservationState((prev) => transitionHotelReservation(prev ?? { status: displayStatusText as HotelOrderStatusText }, 'merchant_reject', reservationNow));
    }
  };

  const confirmHotelCancelReservation = () => {
    if (listItem.hotelProductType === 'calendar_room') {
      if (displayStatusText === '预订确认中' || displayStatusText === '预约确认中' || calendarCancelRule === 'free') {
        setHotelReservationState({ status: '退款成功', notice: '取消成功，钱款已原路退回' });
      } else {
        setHotelReservationState({ status: '退款申请中', notice: '取消申请已提交，等待商家确认后退款' });
        window.setTimeout(() => {
          setHotelReservationState({ status: '退款成功', notice: '商家已确认取消，钱款已原路退回' });
        }, 1200);
      }
      setHotelCancelConfirmOpen(false);
      return;
    }
    setHotelReservationState((prev) => transitionHotelReservation(prev ?? { status: displayStatusText as HotelOrderStatusText }, 'cancel_reservation', reservationNow));
    setHotelCancelConfirmOpen(false);
  };

  const confirmTravelCancelReservation = () => {
    if (isTravelPresaleConfirming) {
      setLocalStatusText('订单取消');
      setTravelConfirmingDeadline(null);
    }
    setTravelCancelConfirmOpen(false);
  };

  const refundRecord = (() => {
    if (!['退款成功', '退款申请中', '退款失败'].includes(displayStatusText)) return null;
    const totalQuantity = Math.max(1, detail.refundInfo?.totalQuantity ?? listItem.totalQuantity ?? 1);
    const rawRefundQuantity = detail.refundInfo?.refundQuantity ?? listItem.refundQuantity ?? totalQuantity;
    const refundQuantity = Math.min(Math.max(1, rawRefundQuantity), totalQuantity);

    return {
      refundQuantity,
    };
  })();

  return (
    <div className={`oc-detail-page ${hotelView ? `hotel-detail-page tone-${hotelView.tone}` : ''} ${isScenicGroupBuyDesignState ? 'scenic-detail-page' : ''} ${isScenicCalendarDesignState ? 'scenic-detail-page scenic-calendar-detail-page' : ''} ${isScenicPresaleDesignState ? 'scenic-detail-page scenic-presale-detail-page' : ''} ${isTravelPresaleDesignState ? 'travel-presale-detail-page' : ''}`}>
      <div className="oc-detail-header-v3">
        <button className="oc-detail-back" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="oc-detail-title-wrap-v3">
          {isFoodOrFunUnpaid || isHotelPresalePaying || isHotelCalendarPaying || isScenicUnpaid || isScenicCalendarPaying || isScenicPresalePaying || isTravelPresalePaying ? (
            <>
              <h2 className="oc-pay-title">待支付，剩余 <span>{paymentCountdownText}</span></h2>
              <p>{(isScenicUnpaid || isScenicCalendarPaying || isScenicPresalePaying || isTravelPresalePaying) ? '超过30分未支付，订单将自动取消' : '超时未支付订单将自动取消'}</p>
            </>
          ) : (
            <>
              <h2>
                {isScenicGroupBuyDesignState ? (
                  <>
                    {displayStatusText}
                    {isScenicUnredeemed && <span className="scenic-count-badge"> {scenicCouponCount}份</span>}
                  </>
                ) : isScenicCalendarDesignState ? (
                  <>
                    {displayStatusText}
                    {(isScenicCalendarPendingBook || isScenicCalendarConfirmed || isScenicCalendarVisited) && <span className="scenic-count-badge"> {scenicCouponCount}份</span>}
                  </>
                ) : isScenicPresaleDesignState ? (
                  <>
                    {displayStatusText}
                    {(isScenicPresalePendingBook || isScenicPresaleConfirmed || isScenicPresaleVisited) && <span className="scenic-count-badge"> {scenicCouponCount}份</span>}
                  </>
                ) : isTravelPresaleDesignState ? (
                  <>
                    {isTravelPresalePendingBook && <svg className="travel-header-clock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
                    {displayStatusText}
                  </>
                ) : (hotelView?.title ?? displayStatusText)}
                {hotelCountdownText && <span className="hotel-header-countdown"> {hotelCountdownText}</span>}
              </h2>
              <p>{hotelReservationState?.notice ?? statusSubtitle}</p>
            </>
          )}
        </div>
        <div className="oc-detail-cs">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <path d="M12 2C6.48 2 2 6.48 2 12v6c0 1.1.9 2 2 2h3v-8H4v-1c0-4.41 3.59-8 8-8s8 3.59 8 8v1h-3v8h3c1.1 0 2-.9 2-2v-6c0-5.52-4.48-10-10-10z"/>
          </svg>
          <span>客服</span>
        </div>
      </div>

      <div className="oc-detail-scroll-v3">
        {/* Merged Card: Product + QR */}
        {isHotelPresaleDesignState && (
          <>
            <div className="hotel-presale-terminal-product-card">
              <div className="hotel-presale-terminal-product">
                <img src={hotelRoomImage} alt="" />
                <div className="hotel-presale-terminal-main">
                  <strong>1晚高级大/双床房+双人自助早餐+双人汤泉海气堡</strong>
                  <span>¥{hotelPresaleDisplayPrice}/份</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>

              <div className="hotel-presale-terminal-rule">
                <span>先买后约 · 不约可退 · 过期未约自动退</span>
                <b>须知/退改规则</b>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>

            <div className="hotel-presale-terminal-notice">
              <b>· 入住必读</b>
              <span>办理入住须满足18–55岁 · 不允许携带儿童...</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            <div className="hotel-presale-terminal-store">
              <div className="hotel-presale-terminal-store-head">
                <strong>适用门店(12)</strong>
                <span>全部门店 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
              </div>
              <div className="hotel-presale-terminal-store-body">
                <img src={hotelBrandImage} alt="" />
                <div>
                  <strong>{detail.store || '希尔顿欢朋酒店(北京小营北路店)'}</strong>
                  <span>营业中 00:00-24:00</span>
                  <em>距你488m {detail.storeAddress || '北京市朝阳区小营北路15号院A座'}</em>
                </div>
              </div>
            </div>

            {refundRecord && (
              <div className="oc-refund-record-card hotel-presale-refund-record">
                <strong>退款({refundRecord.refundQuantity})</strong>
                <div className="oc-refund-record-side">
                  <span>查看详情</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            )}

            <div className="hotel-presale-terminal-pay">
              <div className="hotel-presale-terminal-pay-title">
                <strong>实付金额&nbsp;&nbsp;¥{hotelPresaleDisplayPrice}</strong>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="hotel-presale-terminal-pay-row">
                <span>订单编号</span>
                <strong>{detail.orderId} · 复制</strong>
              </div>
              <div className="hotel-presale-terminal-pay-row">
                <span>交易快照</span>
                <strong>可作为交易争执的判断依据</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="hotel-presale-terminal-pay-row">
                <span>发票说明</span>
                <strong>提供增值税电子普通发票</strong>
                <em>去开票</em>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          </>
        )}

        {isHotelCalendarDesignState && (
          <>
            <div className="hotel-calendar-stay-card">
              <div className="hotel-calendar-booking-store-row">
                <img src={hotelBrandImage} alt="" />
                <div className="hotel-calendar-booking-store-copy">
                  <strong>{detail.store || '希尔顿欢朋酒店(北京小营北路店)'}</strong>
                  <span>{detail.storeAddress || '北京市朝阳区小营北路15号院A座-1398'}</span>
                </div>
                <div className="hotel-calendar-booking-actions">
                  <button type="button" aria-label="导航">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#30343b"><path d="M3 11.2 21 3l-8.2 18-2.1-7.7L3 11.2Z"/></svg>
                    <span>导航</span>
                  </button>
                  <button type="button" aria-label="联系商家">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#30343b"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.6c0 .7-.5 1.2-1.2 1.2C10.2 21.5 2.5 13.8 2.5 3.4c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.7.6 4 .1.4 0 .9-.3 1.2l-2.2 2.2Z"/></svg>
                    <span>联系商家</span>
                  </button>
                </div>
              </div>

              <div className="hotel-calendar-date-row">
                <div>
                  <strong>{hotelStayLabels.checkInText}</strong>
                  <span>14:00后入住</span>
                </div>
                <em>共{hotelStayLabels.nights}晚</em>
                <div>
                  <strong>{hotelStayLabels.checkOutText}</strong>
                  <span>12:00前离店</span>
                </div>
              </div>

              <div className="hotel-calendar-room-row">
                <div>
                  <strong>{listItem.product.includes('双床') ? '高级双床房' : '高级大床房'} 共1间</strong>
                  <span>双早 · 1张大床 · 23m² · 有窗 · 禁烟</span>
                </div>
                <button type="button">房型详情 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></button>
              </div>
            </div>

            <div className="hotel-calendar-rule-card">
              <div>
                <strong>取消规则</strong>
                <span>{calendarCancelRuleText}</span>
              </div>
              {calendarCancelRule === 'fee_review' && <p>提交取消申请后需等待商家确认，商家同意后钱款原路退回。</p>}
              {calendarCancelRule === 'not_cancelable' && <p>当前订单已进入不可取消时段，页面不展示取消入口。</p>}
            </div>

            {isCompleted && (
              <div className="hotel-calendar-review-card">
                <div className="hotel-calendar-review-badge">写评新人礼</div>
                <button type="button" className="hotel-calendar-review-close" aria-label="关闭">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
                <div className="hotel-calendar-review-content">
                  <div className="hotel-calendar-review-title">
                    <span className="hotel-calendar-review-badge-inline">写评价得最高12元券</span>
                  </div>
                  <div className="hotel-calendar-review-desc">评价一下，帮助更多用户选店</div>
                  <div className="hotel-calendar-review-hearts">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="hotel-calendar-info-card">
              <div className="hotel-calendar-info-title">
                <strong>{['退款成功', '退款申请中', '退款失败'].includes(displayStatusText) ? '退款信息' : '实付金额'} ¥{payableAmount}</strong>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              {refundRecord && (
                <div className="hotel-calendar-info-row emphasis">
                  <span>退款({refundRecord.refundQuantity})</span>
                  <strong>查看详情</strong>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
              <div className="hotel-calendar-info-row">
                <span>订单编号</span>
                <strong>{detail.orderId} · 复制</strong>
              </div>
              <div className="hotel-calendar-info-row">
                <span>入住人</span>
                <strong>江海强 139****0002</strong>
              </div>
              <div className="hotel-calendar-info-row">
                <span>交易快照</span>
                <strong>可作为交易争执的判断依据</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          </>
        )}

        {isScenicGroupBuyDesignState && (
          <>
            {/* 门票组：商品卡 + 核销凭证 + 入园信息 + 退改规则（连续拼接，虚线+撕口连接） */}
            <div className="scenic-ticket-group">
              {/* 商品信息 + 有效期/不可用日期/使用规则 */}
              <div className="scenic-card">
                <div className="scenic-product-row">
                  <strong className="scenic-product-name">{listItem.product}</strong>
                  <div className="scenic-product-detail">
                    <span>门票详情</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
                <div className="scenic-info-line">
                  <span className="scenic-info-k">有效期</span>
                  <span className="scenic-info-v">{detail.productRules?.validDate ?? '2023.09.11至2023.10.31 均可使用'}</span>
                </div>
                {detail.productRules?.invalidDate && (
                  <div className="scenic-info-line">
                    <span className="scenic-info-k">不可用日期</span>
                    <span className="scenic-info-v">{detail.productRules.invalidDate}</span>
                  </div>
                )}
                <div className="scenic-rule-tags-row">
                  {(detail.productRules?.usageRules ?? ['购买后2小时可用','免预约','无需取票']).map((tag, i) => {
                    const isOrange = i === 0 && tag.includes('购买后') && !isScenicCompleted;
                    return (
                      <span key={i} className={`scenic-rule-tag ${isOrange ? 'orange' : 'gray'}`}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isOrange ? '#FF6B35' : '#999'} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 核销凭证区（待使用/已使用） */}
              {(isScenicUnredeemed || isScenicCompleted) && (
                <div className="scenic-voucher-block">
                  <div className="scenic-voucher-title">凭「身份证件或券码」直接入园</div>
                  {/* 证件行 */}
                  {detail.scenicInfo?.visitors && detail.scenicInfo.visitors.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">证件</span>
                      <div className="scenic-voucher-content">
                        {isScenicCompleted ? (
                          <>
                            <div className="scenic-visitor-line active">
                              <span className="scenic-visitor-n">{detail.scenicInfo.visitors[0]?.name}</span>
                              <span className="scenic-visitor-i">{detail.scenicInfo.visitors[0]?.idCard}</span>
                            </div>
                            {detail.scenicInfo.visitors.length > 1 && detail.scenicInfo.visitors.slice(1).map((v, i) => (
                              <div key={i} className="scenic-visitor-line dimmed">
                                <span className="scenic-visitor-n">{v.name}</span>
                                <span className="scenic-visitor-i">{v.idCard}</span>
                              </div>
                            ))}
                            <button type="button" className="scenic-expand-all">展开全部<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
                          </>
                        ) : (
                          detail.scenicInfo.visitors.map((v, i) => (
                            <div key={i} className="scenic-visitor-line">
                              <span className="scenic-visitor-n">{v.name}</span>
                              <span className="scenic-visitor-i">{v.idCard || '证件待补填'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {/* 券码轮播（待使用） */}
                  {isScenicUnredeemed && detail.scenicInfo?.coupons && detail.scenicInfo.coupons.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">券码</span>
                      <div className="scenic-voucher-content qr-content">
                        <button type="button" className="scenic-qr-arrow left">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div className="scenic-qr-wrap">
                          <div className="scenic-qr-pager">1/{detail.scenicInfo.coupons.length}</div>
                          <div className="scenic-qr-box">
                            <svg viewBox="0 0 24 24"><path fill="#111" d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13 0h-2v2h2zm-2 2h-2v2h2zm2 2h-2v2h2zm-4 0h-2v2h2zm2 2h-2v2h2zm4-4h2v2h-2zm0 2h-2v2h2z"/></svg>
                          </div>
                        </div>
                        <button type="button" className="scenic-qr-arrow right">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {/* 券号（待使用） */}
                  {isScenicUnredeemed && detail.scenicInfo?.coupons && detail.scenicInfo.coupons.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">券号</span>
                      <div className="scenic-voucher-content">
                        {detail.scenicInfo.coupons.map((c, i) => (
                          <div key={i} className="scenic-coupon-line">
                            <span>{c.code}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 入园信息（待支付/待使用），独立行形式（无标题） */}
              {(isScenicUnpaid || isScenicUnredeemed) && detail.productRules && (
                <div className="scenic-card">
                  {detail.productRules.entryTime && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园时间</span>
                      <span className="scenic-info-v">{detail.productRules.entryTime}</span>
                    </div>
                  )}
                  {detail.productRules.entryAddress && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园地址</span>
                      <span className="scenic-info-v">{detail.productRules.entryAddress}</span>
                    </div>
                  )}
                  {detail.productRules.entryValidity && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园有效期</span>
                      <span className="scenic-info-v">{detail.productRules.entryValidity}</span>
                    </div>
                  )}
                  {detail.productRules.entryCount && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园次数</span>
                      <span className="scenic-info-v">{detail.productRules.entryCount}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 退改规则 */}
              <div className="scenic-card scenic-refund-rule-card">
                <div className="scenic-refund-row">
                  <span className="scenic-info-k">退改规则</span>
                  <span className="scenic-info-v">{detail.productRules?.refundRule ?? '随时退·过期退'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>

              {/* 展开全部（订单取消/退款状态下）—— 无缝衔接，无虚线无凹陷 */}
              {(isScenicCanceled || isRefunded || isRefunding || isRefundFailed) && (
                <div className="scenic-card scenic-expand-card scenic-ticket-seamless">
                  <button type="button" className="scenic-expand-all-btn">展开全部<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
                </div>
              )}
            </div>
            {/* /门票组 */}

            {/* 退款记录（退款成功/退款中/退款失败） */}
            {(isRefunded || isRefunding || isRefundFailed) && (
              <div className="scenic-card scenic-refund-card">
                <div className="scenic-refund-card-row">
                  <strong>退款({refundRecord?.refundQuantity ?? scenicCouponCount})</strong>
                  <div className="scenic-refund-card-side">
                    <span>查看详情</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </div>
            )}

            {/* 评价引导（已使用） */}
            {isScenicCompleted && (
              <div className="scenic-card scenic-review-card-v2">
                <div className="scenic-review-badge">写评新人礼</div>
                <div className="scenic-review-close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </div>
                <div className="scenic-review-content">
                  <div className="scenic-review-title-v2">
                    <span className="scenic-review-badge-inline">写评价得最高12元券</span>
                  </div>
                  <div className="scenic-review-desc-v2">评价一下，帮助更多用户选店</div>
                  <div className="scenic-hearts-row">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 适用门店 */}
            <div className="scenic-card scenic-store-card-v2">
              <div className="scenic-store-header">
                <strong>适用门店(12)</strong>
                <div className="scenic-store-all">
                  <span>全部门店</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
              <div className="scenic-store-row-v2">
                <div className="scenic-store-logo-v2">
                  {detail.storeInfo?.imageUrl ? (
                    <img src={detail.storeInfo.imageUrl} alt={detail.store} />
                  ) : (
                    <span>🎢</span>
                  )}
                </div>
                <div className="scenic-store-info-v2">
                  <div className="scenic-store-name-v2">{detail.store || '长隆欢乐世界'}</div>
                  <div className="scenic-store-meta-v2">
                    <span className="scenic-store-cat">游乐园</span>
                    <span className="scenic-store-brand">长隆</span>
                  </div>
                  <div className="scenic-store-addr-v2">距你3.4km &nbsp;广东省广州市...</div>
                </div>
                <div className="scenic-store-ops-v2">
                  <div className="scenic-op-cell">
                    <button type="button" className="scenic-op-circle" title="导航">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#222"><path d="M3 11.2 21 3l-8.2 18-2.1-7.7L3 11.2Z"/></svg>
                    </button>
                    <span className="scenic-op-label">导航</span>
                  </div>
                  <div className="scenic-op-cell">
                    <button type="button" className="scenic-op-circle" title="联系商家">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#222"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.6c0 .7-.5 1.2-1.2 1.2C10.2 21.5 2.5 13.8 2.5 3.4c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.7.6 4 .1.4 0 .9-.3 1.2l-2.2 2.2Z"/></svg>
                    </button>
                    <span className="scenic-op-label">联系</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NPS 推荐度（已使用/取消/退款） */}
            {(isScenicCompleted || isScenicCanceled || isRefunded || isRefunding || isRefundFailed) && (
              <div className="scenic-card scenic-nps-card-v2">
                <div className="scenic-nps-q">预订美食时，您愿意推荐亲友使用抖音吗？</div>
                <div className="scenic-nps-scale-labels">
                  <span>非常不愿意</span>
                  <span>非常愿意</span>
                </div>
                <div className="scenic-nps-dots">
                  {Array.from({length: 11}, (_, i) => (
                    <button key={i} type="button" className={`scenic-nps-dot ${i === 0 ? 'selected' : ''}`}>{i}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 金额信息卡 */}
            <div className="scenic-card scenic-pay-card-v2">
              <div className="scenic-pay-header">
                <strong>{isScenicUnpaid || isScenicCanceled ? '应付金额' : '实付金额'}&nbsp;&nbsp;¥{payableAmount}</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">游客信息</span>
                <span className="scenic-pay-v">{detail.scenicInfo?.visitors ? detail.scenicInfo.visitors.map(v => v.name).join(' ') : '王胜凯 刘铭心'}</span>
                {(isScenicUnredeemed || isScenicCompleted || isScenicUnpaid || isScenicCanceled) && (
                  <span className="scenic-pay-arrow">详情<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
                )}
              </div>
              {isScenicCompleted && (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">使用情况</span>
                  <span className="scenic-pay-v">已使用{scenicCouponCount}份</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
              {!isScenicCompleted && !isScenicUnpaid && !isScenicCanceled && (isRefunded || isRefunding || isRefundFailed) && (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">使用情况</span>
                  <span className="scenic-pay-v">未使用</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">订单编号</span>
                <span className="scenic-pay-v">{detail.orderId} · <i className="scenic-copy-link">复制</i></span>
                {(isScenicUnredeemed || isScenicCompleted || isRefunded) && (
                  <span className="scenic-pay-arrow">更多<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
                )}
              </div>
              {(isScenicUnredeemed || isScenicCompleted || isRefunded) && (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">交易快照</span>
                  <span className="scenic-pay-v">可作为交易争执的判断依据</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">游乐险</span>
                <span className="scenic-pay-v">
                  {isScenicUnpaid || isScenicCanceled
                    ? '支付成功后将自动投保'
                    : '商家已为你免费投保，消费后自动生效'}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">发票说明</span>
                <span className="scenic-pay-v">提供增值税电子普通发票</span>
                <span className="scenic-pay-arrow invoice">去开票<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
              </div>
              <button type="button" className="scenic-pay-more-btn">展开更多<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
            </div>
          </>
        )}

        {isScenicCalendarDesignState && (
          <>
            <div className="scenic-ticket-group">
              <div className="scenic-card scenic-cal-product-card">
                <div className="scenic-product-row">
                  <strong className="scenic-product-name">{listItem.product}</strong>
                  <div className="scenic-product-detail">
                    <span>门票详情</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
                <div className="scenic-cal-use-date">
                  <span className="scenic-cal-date-label">使用日期</span>
                  <span className="scenic-cal-date-value">{isScenicCalendarPendingBook ? '待预约选择' : `${scenicCalendarVisitDateFormatted} ${detail.productRules?.entryTime?.split(' ')[0] ?? '上午场'}`}</span>
                </div>
                <div className="scenic-cal-seat-level">
                  <span className="scenic-cal-seat-label">票种</span>
                  <span className="scenic-cal-seat-value">{scenicTicketType} · {detail.scenicInfo?.ticketCount ?? 2}张</span>
                </div>
                <div className="scenic-rule-tags-row">
                  {(detail.productRules?.usageRules ?? ['出票后不可改期','需携带身份证原件']).map((tag, i) => (
                    <span key={i} className="scenic-rule-tag gray">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {isScenicCalendarPendingBook && (
                <div className="scenic-presale-booking-card-v2 scenic-cal-booking-card" onClick={(e) => { e.stopPropagation(); openPresaleBooking(); }}>
                  <div className="scenic-presale-booking-hot">
                    <span className="scenic-presale-fire">🔥</span>
                    <span className="scenic-presale-hot-red">预约火爆</span>
                    <span className="scenic-presale-hot-dark">请尽早预约</span>
                  </div>
                  <div className="scenic-presale-booking-tip-v2">需提前1天预约·出票后不可改期</div>
                  <div className="scenic-presale-calendar-hint-v2" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const today = new Date(reservationNow);
                      const dates: { week: string; dayLabel: string; isoDate: string; tag: string; tagType: 'earliest' | 'available' | 'full' }[] = [];
                      const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                      let earliestSet = false;
                      for (let i = 1; i <= 7; i++) {
                        const d = new Date(today);
                        d.setDate(today.getDate() + i);
                        const weekDay = d.getDay();
                        const isDisabled = (i === 2 || i === 5);
                        let tagType: 'earliest' | 'available' | 'full' = 'available';
                        let tag = '可约';
                        if (isDisabled) { tagType = 'full'; tag = '已满'; }
                        else if (!earliestSet) { earliestSet = true; tagType = 'earliest'; tag = '最早可约'; }
                        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        dates.push({
                          week: weekNames[weekDay],
                          dayLabel: `${d.getMonth() + 1}/${d.getDate()}`,
                          isoDate: iso,
                          tag,
                          tagType,
                        });
                      }
                      return dates.map((d, idx) => (
                        <div key={idx} className={`scenic-presale-date-pill ${d.tagType === 'full' ? 'disabled' : ''} ${presaleSelectedDate === d.isoDate ? 'selected' : ''}`}
                          onClick={() => {
                            if (d.tagType !== 'full') {
                              setPresaleSelectedDate(d.isoDate);
                              openPresaleBooking();
                            }
                          }}>
                          <span className="spdp-week">{d.week}</span>
                          <span className="spdp-day">{d.dayLabel}</span>
                          <span className={`spdp-tag ${d.tagType}`}>{d.tag}</span>
                        </div>
                      ));
                    })()}
                    <div className="scenic-presale-date-all-v2" onClick={openPresaleBooking}>
                      <span>全部日期</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                  <button type="button" className="scenic-presale-book-btn" onClick={(e) => { e.stopPropagation(); openPresaleBooking(); }}>
                    立即预约
                  </button>
                </div>
              )}

              {(isScenicCalendarConfirmed || isScenicCalendarVisited) && (
                <div className="scenic-voucher-block">
                  <div className="scenic-voucher-title">凭「身份证件或券码」直接入园</div>
                  {detail.scenicInfo?.visitors && detail.scenicInfo.visitors.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">证件</span>
                      <div className="scenic-voucher-content">
                        {isScenicCalendarVisited ? (
                          <>
                            <div className="scenic-visitor-line active">
                              <span className="scenic-visitor-n">{detail.scenicInfo.visitors[0]?.name}</span>
                              <span className="scenic-visitor-i">{detail.scenicInfo.visitors[0]?.idCard}</span>
                            </div>
                            {detail.scenicInfo.visitors.length > 1 && detail.scenicInfo.visitors.slice(1).map((v, i) => (
                              <div key={i} className="scenic-visitor-line dimmed">
                                <span className="scenic-visitor-n">{v.name}</span>
                                <span className="scenic-visitor-i">{v.idCard}</span>
                              </div>
                            ))}
                            <button type="button" className="scenic-expand-all">展开全部<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
                          </>
                        ) : (
                          detail.scenicInfo.visitors.map((v, i) => (
                            <div key={i} className="scenic-visitor-line">
                              <span className="scenic-visitor-n">{v.name}</span>
                              <span className="scenic-visitor-i">{v.idCard || '证件待补填'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {isScenicCalendarConfirmed && detail.scenicInfo?.coupons && detail.scenicInfo.coupons.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">券码</span>
                      <div className="scenic-voucher-content qr-content">
                        <button type="button" className="scenic-qr-arrow left">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div className="scenic-qr-wrap">
                          <div className="scenic-qr-pager">1/{detail.scenicInfo.coupons.length}</div>
                          <div className="scenic-qr-box">
                            <svg viewBox="0 0 24 24"><path fill="#111" d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13 0h-2v2h2zm-2 2h-2v2h2zm2 2h-2v2h2zm-4 0h-2v2h2zm2 2h-2v2h2zm4-4h2v2h-2zm0 2h-2v2h2z"/></svg>
                          </div>
                        </div>
                        <button type="button" className="scenic-qr-arrow right">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {isScenicCalendarConfirmed && detail.scenicInfo?.coupons && detail.scenicInfo.coupons.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">券号</span>
                      <div className="scenic-voucher-content">
                        {detail.scenicInfo.coupons.map((c, i) => (
                          <div key={i} className="scenic-coupon-line">
                            <span>{c.code}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isScenicCalendarConfirming && (
                <div className="scenic-voucher-block scenic-cal-voucher-placeholder-block">
                  <div className="scenic-cal-voucher-placeholder">
                    <div className="scenic-cal-placeholder-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C0C4CC" strokeWidth="1.5">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <path d="M14 14h3v3M17 20h4M20 17v4" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p>凭证将在出票成功后展示</p>
                  </div>
                </div>
              )}

              {(isScenicCalendarPaying || isScenicCalendarPendingBook || isScenicCalendarConfirmed || isScenicCalendarConfirming) && detail.productRules && (
                <div className="scenic-card">
                  {detail.productRules.entryTime && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园时间</span>
                      <span className="scenic-info-v">{detail.productRules.entryTime}</span>
                    </div>
                  )}
                  {detail.productRules.entryAddress && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园地址</span>
                      <span className="scenic-info-v">{detail.productRules.entryAddress}</span>
                    </div>
                  )}
                  {detail.productRules.entryValidity && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园有效期</span>
                      <span className="scenic-info-v">{detail.productRules.entryValidity}</span>
                    </div>
                  )}
                  {detail.productRules.entryCount && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园次数</span>
                      <span className="scenic-info-v">{detail.productRules.entryCount}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="scenic-card scenic-refund-rule-card">
                <div className="scenic-refund-row">
                  <span className="scenic-info-k">退改规则</span>
                  <span className="scenic-info-v">{detail.productRules?.refundRule ?? '随时退·过期退'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>

              {(isScenicCalendarCanceled || isRefunded || isRefunding || isRefundFailed) && (
                <div className="scenic-card scenic-expand-card scenic-ticket-seamless">
                  <button type="button" className="scenic-expand-all-btn">展开全部<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
                </div>
              )}
            </div>

            {(isRefunded || isRefunding || isRefundFailed) && (
              <div className="scenic-card scenic-refund-card">
                <div className="scenic-refund-card-row">
                  <strong>退款({refundRecord?.refundQuantity ?? scenicCouponCount})</strong>
                  <div className="scenic-refund-card-side">
                    <span>查看详情</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </div>
            )}

            {isScenicCalendarVisited && (
              <div className="scenic-card scenic-review-card-v2">
                <div className="scenic-review-badge">写评新人礼</div>
                <div className="scenic-review-close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </div>
                <div className="scenic-review-content">
                  <div className="scenic-review-title-v2">
                    <span className="scenic-review-badge-inline">写评价得最高12元券</span>
                  </div>
                  <div className="scenic-review-desc-v2">评价一下，帮助更多用户选店</div>
                  <div className="scenic-hearts-row">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="scenic-card scenic-store-card-v2">
              <div className="scenic-store-header">
                <strong>适用景区(1)</strong>
                <div className="scenic-store-all">
                  <span>全部景区</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
              <div className="scenic-store-row-v2">
                <div className="scenic-store-logo-v2">
                  {detail.storeInfo?.imageUrl ? (
                    <img src={detail.storeInfo.imageUrl} alt={detail.store} />
                  ) : (
                    <span>🏯</span>
                  )}
                </div>
                <div className="scenic-store-info-v2">
                  <div className="scenic-store-name-v2">{detail.store || '故宫博物院'}</div>
                  <div className="scenic-store-meta-v2">
                    <span className="scenic-store-cat">文博院馆</span>
                    <span className="scenic-store-brand">5A景区</span>
                  </div>
                  <div className="scenic-store-addr-v2">距你12.3km &nbsp;北京市东城区景山前街4号</div>
                </div>
                <div className="scenic-store-ops-v2">
                  <div className="scenic-op-cell">
                    <button type="button" className="scenic-op-circle" title="导航">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#222"><path d="M3 11.2 21 3l-8.2 18-2.1-7.7L3 11.2Z"/></svg>
                    </button>
                    <span className="scenic-op-label">导航</span>
                  </div>
                  <div className="scenic-op-cell">
                    <button type="button" className="scenic-op-circle" title="联系商家">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#222"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.6c0 .7-.5 1.2-1.2 1.2C10.2 21.5 2.5 13.8 2.5 3.4c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.7.6 4 .1.4 0 .9-.3 1.2l-2.2 2.2Z"/></svg>
                    </button>
                    <span className="scenic-op-label">联系</span>
                  </div>
                </div>
              </div>
            </div>

            {(isScenicCalendarVisited || isScenicCalendarCanceled || isRefunded || isRefunding || isRefundFailed) && (
              <div className="scenic-card scenic-nps-card-v2">
                <div className="scenic-nps-q">预订景区门票时，您愿意推荐亲友使用抖音吗？</div>
                <div className="scenic-nps-scale-labels">
                  <span>非常不愿意</span>
                  <span>非常愿意</span>
                </div>
                <div className="scenic-nps-dots">
                  {Array.from({length: 11}, (_, i) => (
                    <button key={i} type="button" className={`scenic-nps-dot ${i === 0 ? 'selected' : ''}`}>{i}</button>
                  ))}
                </div>
              </div>
            )}

            <div className={`scenic-card scenic-pay-card-v2 ${isScenicCalendarVisited ? 'scenic-cal-pay-flat' : ''}`}>
              <div className="scenic-pay-header">
                <strong>{isScenicCalendarPaying || isScenicCalendarCanceled ? '应付金额' : '实付金额'}&nbsp;&nbsp;¥{payableAmount}</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">游客信息</span>
                <span className="scenic-pay-v">{detail.scenicInfo?.visitors ? detail.scenicInfo.visitors.map(v => v.name).join(' ') : '江海强 李平'}</span>
                <span className="scenic-pay-arrow">详情<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
              </div>
              {isScenicCalendarVisited && (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">使用情况</span>
                  <span className="scenic-pay-v">已使用{scenicCouponCount}份</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
              {!isScenicCalendarVisited && !isScenicCalendarPaying && !isScenicCalendarCanceled && (isRefunded || isRefunding || isRefundFailed) && (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">使用情况</span>
                  <span className="scenic-pay-v">未使用</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
              {isScenicCalendarVisited ? (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">订单编号</span>
                  <span className="scenic-pay-v">{detail.orderId} · <i className="scenic-copy-link">复制</i> · 交易快照</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ) : (
                <>
                  <div className="scenic-pay-line">
                    <span className="scenic-pay-k">订单编号</span>
                    <span className="scenic-pay-v">{detail.orderId} · <i className="scenic-copy-link">复制</i></span>
                    {(isScenicCalendarConfirmed || isScenicCalendarVisited || isRefunded) && (
                      <span className="scenic-pay-arrow">更多<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
                    )}
                  </div>
                  {(isScenicCalendarConfirmed || isScenicCalendarVisited || isRefunded) && (
                    <div className="scenic-pay-line">
                      <span className="scenic-pay-k">交易快照</span>
                      <span className="scenic-pay-v">可作为交易争执的判断依据</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  )}
                </>
              )}
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">游乐险</span>
                <span className="scenic-pay-v">
                  {isScenicCalendarPaying || isScenicCalendarCanceled
                    ? '支付成功后将自动投保'
                    : '商家已为你免费投保，消费后自动生效'}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">发票说明</span>
                <span className="scenic-pay-v">提供增值税电子普通发票</span>
                <span className="scenic-pay-arrow invoice">去开票<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
              </div>
              <button type="button" className="scenic-pay-more-btn">展开更多<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
            </div>
          </>
        )}

        {isScenicPresaleDesignState && (
          <>
            <div className="scenic-ticket-group">
              <div className="scenic-card">
                <div className="scenic-product-row">
                  <strong className="scenic-product-name">{listItem.product}</strong>
                  <div className="scenic-product-detail">
                    <span>门票详情</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
                {isScenicPresaleConfirmed || isScenicPresaleVisited ? (
                  <div className="scenic-info-line">
                    <span className="scenic-info-k">已约日期</span>
                    <span className="scenic-info-v">{scenicVisitDate.replace(/-/g, '.')} {detail.scenicInfo?.visitTime ?? ''}</span>
                  </div>
                ) : (
                  <div className="scenic-info-line">
                    <span className="scenic-info-k">有效期</span>
                    <span className="scenic-info-v">{detail.productRules?.validDate ?? '2026.07.01至2026.10.31 均可使用'}</span>
                  </div>
                )}
                <div className="scenic-info-line">
                  <span className="scenic-info-k">票种</span>
                  <span className="scenic-info-v">{scenicTicketType} × {detail.scenicInfo?.ticketCount ?? scenicCouponCount}</span>
                </div>
                <div className="scenic-rule-tags-row">
                  {(detail.productRules?.usageRules ?? ['需提前1天在线预约','不约可退','无需取票']).map((tag, i) => {
                    const isOrange = i === 0 && tag.includes('预约') && !isScenicPresaleCompleted && !isScenicPresaleCanceled && !isScenicPresaleRefundRelated;
                    return (
                      <span key={i} className={`scenic-rule-tag ${isOrange ? 'orange' : 'gray'}`}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isOrange ? '#FF6B35' : '#999'} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>

              {isScenicPresalePendingBook && (
                <div className="scenic-presale-booking-card-v2" onClick={(e) => { e.stopPropagation(); openPresaleBooking(); }}>
                  <div className="scenic-presale-booking-hot">
                    <span className="scenic-presale-fire">🔥</span>
                    <span className="scenic-presale-hot-red">预约火爆</span>
                    <span className="scenic-presale-hot-dark">请尽早预约</span>
                  </div>
                  <div className="scenic-presale-booking-tip-v2">需提前1天预约·预约后不可取消或修改</div>
                  <div className="scenic-presale-calendar-hint-v2" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const today = new Date(reservationNow);
                      const dates: { week: string; dayLabel: string; isoDate: string; tag: string; tagType: 'earliest' | 'available' | 'full' }[] = [];
                      const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                      let earliestSet = false;
                      for (let i = 1; i <= 7; i++) {
                        const d = new Date(today);
                        d.setDate(today.getDate() + i);
                        const weekDay = d.getDay();
                        const isDisabled = (i === 2 || i === 5);
                        let tagType: 'earliest' | 'available' | 'full' = 'available';
                        let tag = '可约';
                        if (isDisabled) { tagType = 'full'; tag = '已满'; }
                        else if (!earliestSet) { earliestSet = true; tagType = 'earliest'; tag = '最早可约'; }
                        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        dates.push({
                          week: weekNames[weekDay],
                          dayLabel: `${d.getMonth() + 1}/${d.getDate()}`,
                          isoDate: iso,
                          tag,
                          tagType,
                        });
                      }
                      return dates.map((d, idx) => (
                        <div key={idx} className={`scenic-presale-date-pill ${d.tagType === 'full' ? 'disabled' : ''} ${presaleSelectedDate === d.isoDate ? 'selected' : ''}`}
                          onClick={() => {
                            if (d.tagType !== 'full') {
                              setPresaleSelectedDate(d.isoDate);
                              openPresaleBooking();
                            }
                          }}>
                          <span className="spdp-week">{d.week}</span>
                          <span className="spdp-day">{d.dayLabel}</span>
                          <span className={`spdp-tag ${d.tagType}`}>{d.tag}</span>
                        </div>
                      ));
                    })()}
                    <div className="scenic-presale-date-all-v2" onClick={openPresaleBooking}>
                      <span>全部日期</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                  <button type="button" className="scenic-presale-book-btn" onClick={(e) => { e.stopPropagation(); openPresaleBooking(); }}>
                    立即预约
                  </button>
                </div>
              )}

              {isScenicPresaleConfirming && (
                <div className="scenic-card scenic-presale-confirming-card">
                  <div className="scenic-presale-confirm-row">
                    <span className="scenic-presale-confirm-label">入园时间</span>
                    <span className="scenic-presale-confirm-value scenic-date">{scenicVisitDate.replace(/-/g, '.')} {detail.scenicInfo?.visitTime ?? '08:30'}</span>
                  </div>
                  <div className="scenic-presale-confirm-tags">
                    <span className="scenic-rule-tag orange">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      预约确认中
                    </span>
                    <span className="scenic-rule-tag gray">
                      预计30分钟内确认
                    </span>
                  </div>
                </div>
              )}

              {(isScenicPresaleConfirmed || isScenicPresaleVisited) && (
                <div className="scenic-voucher-block">
                  <div className="scenic-voucher-title">凭「身份证件或券码」直接入园</div>
                  {detail.scenicInfo?.visitors && detail.scenicInfo.visitors.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">证件</span>
                      <div className="scenic-voucher-content">
                        {isScenicPresaleVisited ? (
                          <>
                            <div className="scenic-visitor-line active">
                              <span className="scenic-visitor-n">{detail.scenicInfo.visitors[0]?.name}</span>
                              <span className="scenic-visitor-i">{detail.scenicInfo.visitors[0]?.idCard}</span>
                            </div>
                            {detail.scenicInfo.visitors.length > 1 && detail.scenicInfo.visitors.slice(1).map((v, i) => (
                              <div key={i} className="scenic-visitor-line dimmed">
                                <span className="scenic-visitor-n">{v.name}</span>
                                <span className="scenic-visitor-i">{v.idCard}</span>
                              </div>
                            ))}
                            <button type="button" className="scenic-expand-all">展开全部<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
                          </>
                        ) : (
                          detail.scenicInfo.visitors.map((v, i) => (
                            <div key={i} className="scenic-visitor-line">
                              <span className="scenic-visitor-n">{v.name}</span>
                              <span className="scenic-visitor-i">{v.idCard || '证件待补填'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {isScenicPresaleConfirmed && detail.scenicInfo?.coupons && detail.scenicInfo.coupons.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">券码</span>
                      <div className="scenic-voucher-content qr-content">
                        <button type="button" className="scenic-qr-arrow left">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div className="scenic-qr-wrap">
                          <div className="scenic-qr-pager">1/{detail.scenicInfo.coupons.length}</div>
                          <div className="scenic-qr-box">
                            <svg viewBox="0 0 24 24"><path fill="#111" d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13 0h-2v2h2zm-2 2h-2v2h2zm2 2h-2v2h2zm-4 0h-2v2h2zm2 2h-2v2h2zm4-4h2v2h-2zm0 2h-2v2h2z"/></svg>
                          </div>
                        </div>
                        <button type="button" className="scenic-qr-arrow right">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {isScenicPresaleConfirmed && detail.scenicInfo?.coupons && detail.scenicInfo.coupons.length > 0 && (
                    <div className="scenic-voucher-section">
                      <span className="scenic-voucher-label">券号</span>
                      <div className="scenic-voucher-content">
                        {detail.scenicInfo.coupons.map((c, i) => (
                          <div key={i} className="scenic-coupon-line">
                            <span>{c.code}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(isScenicPresaleConfirmed || isScenicPresaleVisited || isScenicPresalePendingBook) && detail.productRules && (
                <div className="scenic-card">
                  {detail.productRules.entryTime && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园时间</span>
                      <span className="scenic-info-v">{detail.productRules.entryTime}</span>
                    </div>
                  )}
                  {detail.productRules.entryAddress && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园地址</span>
                      <span className="scenic-info-v">{detail.productRules.entryAddress}</span>
                    </div>
                  )}
                  {detail.productRules.entryValidity && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园有效期</span>
                      <span className="scenic-info-v">{detail.productRules.entryValidity}</span>
                    </div>
                  )}
                  {detail.productRules.entryCount && (
                    <div className="scenic-info-line">
                      <span className="scenic-info-k">入园次数</span>
                      <span className="scenic-info-v">{detail.productRules.entryCount}</span>
                    </div>
                  )}
                  {!detail.productRules.entryTime && !detail.productRules.entryAddress && (
                    <>
                      <div className="scenic-info-line">
                        <span className="scenic-info-k">换票时间</span>
                        <span className="scenic-info-v">09:00-15:30</span>
                      </div>
                      <div className="scenic-info-line">
                        <span className="scenic-info-k">换票地址</span>
                        <span className="scenic-info-v">景区西门游客服务中心</span>
                      </div>
                      <div className="scenic-info-line">
                        <span className="scenic-info-k">入园时间</span>
                        <span className="scenic-info-v">09:00-17:00</span>
                      </div>
                      <div className="scenic-info-line">
                        <span className="scenic-info-k">入园地址</span>
                        <span className="scenic-info-v">{detail.storeInfo?.address ?? '故宫博物院午门检票口'}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="scenic-card scenic-refund-rule-card">
                <div className="scenic-refund-row">
                  <span className="scenic-info-k">退改规则</span>
                  <span className="scenic-info-v">{detail.productRules?.refundRule ?? '随时退·过期退'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>

              {(isScenicPresaleCanceled || isRefunded || isRefunding || isRefundFailed) && (
                <div className="scenic-card scenic-expand-card scenic-ticket-seamless">
                  <button type="button" className="scenic-expand-all-btn">展开全部<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
                </div>
              )}
            </div>

            {(isRefunded || isRefunding || isRefundFailed) && (
              <div className="scenic-card scenic-refund-card">
                <div className="scenic-refund-card-row">
                  <strong>退款({refundRecord?.refundQuantity ?? scenicCouponCount})</strong>
                  <div className="scenic-refund-card-side">
                    <span>查看详情</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </div>
            )}

            {isScenicPresaleCompleted && (
              <div className="scenic-card scenic-review-card-v2">
                <div className="scenic-review-badge">写评新人礼</div>
                <div className="scenic-review-close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </div>
                <div className="scenic-review-content">
                  <div className="scenic-review-title-v2">
                    <span className="scenic-review-badge-inline">写评价得最高12元券</span>
                  </div>
                  <div className="scenic-review-desc-v2">评价一下，帮助更多用户选店</div>
                  <div className="scenic-hearts-row">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="scenic-card scenic-store-card-v2">
              <div className="scenic-store-header">
                <strong>适用门店({detail.productRules?.applicableStoreCount ?? 1})</strong>
                <div className="scenic-store-all">
                  <span>全部门店</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
              <div className="scenic-store-row-v2">
                <div className="scenic-store-logo-v2">
                  {detail.storeInfo?.imageUrl ? (
                    <img src={detail.storeInfo.imageUrl} alt={detail.store} />
                  ) : (
                    <span>🏯</span>
                  )}
                </div>
                <div className="scenic-store-info-v2">
                  <div className="scenic-store-name-v2">{detail.store || '故宫博物院'}</div>
                  <div className="scenic-store-meta-v2">
                    <span className="scenic-store-cat">名胜古迹</span>
                    <span className="scenic-store-brand">故宫</span>
                  </div>
                  <div className="scenic-store-addr-v2">距你5.6km &nbsp;{detail.storeInfo?.address ?? '北京市东城区景山前街'}</div>
                </div>
                <div className="scenic-store-ops-v2">
                  <div className="scenic-op-cell">
                    <button type="button" className="scenic-op-circle" title="导航">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#222"><path d="M3 11.2 21 3l-8.2 18-2.1-7.7L3 11.2Z"/></svg>
                    </button>
                    <span className="scenic-op-label">导航</span>
                  </div>
                  <div className="scenic-op-cell">
                    <button type="button" className="scenic-op-circle" title="联系商家">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#222"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.6c0 .7-.5 1.2-1.2 1.2C10.2 21.5 2.5 13.8 2.5 3.4c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.7.6 4 .1.4 0 .9-.3 1.2l-2.2 2.2Z"/></svg>
                    </button>
                    <span className="scenic-op-label">联系</span>
                  </div>
                </div>
              </div>
            </div>

            {(isScenicPresaleCompleted || isScenicPresaleCanceled || isRefunded || isRefunding || isRefundFailed) && (
              <div className="scenic-card scenic-nps-card-v2">
                <div className="scenic-nps-q">预订景区门票时，您愿意推荐亲友使用抖音吗？</div>
                <div className="scenic-nps-scale-labels">
                  <span>非常不愿意</span>
                  <span>非常愿意</span>
                </div>
                <div className="scenic-nps-dots">
                  {Array.from({length: 11}, (_, i) => (
                    <button key={i} type="button" className={`scenic-nps-dot ${i === 0 ? 'selected' : ''}`}>{i}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="scenic-card scenic-pay-card-v2">
              <div className="scenic-pay-header">
                <strong>{isScenicPresalePaying || isScenicPresaleCanceled ? '应付金额' : '实付金额'}&nbsp;&nbsp;¥{payableAmount}</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              {detail.scenicInfo?.visitors && detail.scenicInfo.visitors.length > 0 && detail.scenicInfo.visitors[0]?.name && (
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">游客信息</span>
                <span className="scenic-pay-v">{detail.scenicInfo.visitors.map(v => v.name).join(' ')}</span>
                {(isScenicPresaleConfirmed || isScenicPresaleVisited || isScenicPresaleCompleted || isScenicPresalePendingBook) && (
                  <span className="scenic-pay-arrow">详情<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
                )}
              </div>
              )}
              {isScenicPresaleCompleted && (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">使用情况</span>
                  <span className="scenic-pay-v">已使用{scenicCouponCount}份</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
              {!isScenicPresaleCompleted && !isScenicPresalePaying && !isScenicPresaleCanceled && isScenicPresaleRefundRelated && (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">使用情况</span>
                  <span className="scenic-pay-v">未使用</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
              {isScenicPresaleCompleted ? (
                <div className="scenic-pay-line">
                  <span className="scenic-pay-k">订单编号</span>
                  <span className="scenic-pay-v">{detail.orderId} · <i className="scenic-copy-link">复制</i> · 交易快照</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ) : (
                <>
                  <div className="scenic-pay-line">
                    <span className="scenic-pay-k">订单编号</span>
                    <span className="scenic-pay-v">{detail.orderId} · <i className="scenic-copy-link">复制</i></span>
                    {(isScenicPresaleConfirmed || isScenicPresaleVisited || isRefunded) && (
                      <span className="scenic-pay-arrow">更多<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
                    )}
                  </div>
                  {(isScenicPresaleConfirmed || isScenicPresaleVisited || isRefunded) && (
                    <div className="scenic-pay-line">
                      <span className="scenic-pay-k">交易快照</span>
                      <span className="scenic-pay-v">可作为交易争执的判断依据</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  )}
                </>
              )}
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">游乐险</span>
                <span className="scenic-pay-v">
                  {isScenicPresalePaying || isScenicPresaleCanceled
                    ? '支付成功后将自动投保'
                    : '商家已为你免费投保，消费后自动生效'}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="scenic-pay-line">
                <span className="scenic-pay-k">发票说明</span>
                <span className="scenic-pay-v">提供增值税电子普通发票</span>
                <span className="scenic-pay-arrow invoice">去开票<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
              </div>
              <button type="button" className="scenic-pay-more-btn">展开更多<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
            </div>
          </>
        )}

        {isTravelPresaleDesignState && (
          <div className="travel-ticket-group">
            {/* 预约进度条：仅预约确认中显示3步骤进度 */}
            {isTravelPresaleConfirming && (
              <div className="travel-card travel-progress-card">
                <div className="travel-progress-tip confirming">
                  预计 今天14:00～明天22:00间 <strong>确认</strong>
                  <span>商家可能与你确认预约细节，请保持电话畅通，感谢等待</span>
                </div>
                <div className="travel-progress-steps">
                  <div className="travel-progress-clouds">
                    <span className="tpc-cloud c1">☁️</span>
                    <span className="tpc-cloud c2">☁️</span>
                  </div>
                  <div className="tps-item done">
                    <div className="tps-dot">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                    <span>发起预约</span>
                  </div>
                  <div className="tps-line active" />
                  <div className="tps-item active">
                    <div className="tps-dot plane-dot">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                    </div>
                    <span>积极确认中</span>
                  </div>
                  <div className="tps-line" />
                  <div className="tps-item">
                    <div className="tps-dot"></div>
                    <span>完成确认</span>
                  </div>
                </div>
              </div>
            )}

            {/* 退款/取消/交易完成 状态提示卡片（居中图标+文案） */}
            {false && isTravelPresaleCanceled && isTravelPresaleRefundRelated && (
              <div className="travel-card travel-status-note-card"></div>
            )}

            {/* ===== 旅行社预售 v2设计（非待支付状态统一使用） ===== */}
            {isTravelPresaleV2State && (
              <>
                {/* 商品卡 */}
                <div className={`travel-card travel-product-card-v2 ${isTravelPresaleConfirming ? 'confirming-card' : 'unified-card'}`}>
                  <div className="tpc-v2-main">
                    <div className={`tpc-v2-thumb ${isTravelPresaleConfirming ? 'real-image' : 'emoji-thumb'}`}>
                      {isTravelPresaleConfirming ? (
                        <img src="https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=Sanya%20yacht%20sailing%20on%20blue%20ocean%20tropical%20island%20scenery%2C%20luxury%20catamaran%2C%20commercial%20travel%20photo%2C%20square%20thumbnail&image_size=square_hd" alt="" />
                      ) : listItem.thumbnail}
                    </div>
                    <div className="tpc-v2-info">
                      <div className="tpc-v2-name">{listItem.product}</div>
                      <div className="tpc-v2-tags-row">
                        <div className="tpc-v2-tags">
                          <span className="tpc-v2-tag">纯玩无购物
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                          </span>
                          <span className="tpc-v2-tag">价格含1成人</span>
                        </div>
                        <div className="tpc-v2-price">
                          <span className="tpc-v2-symbol">¥</span>
                          <span className="tpc-v2-num">{isTravelPresaleConfirming ? '3688' : (listItem.price / 100).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="tpc-v2-more">
                      <span>行程/费用</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                </div>

                {/* 安心游横幅 */}
                <div className={`travel-safety-banner-v2 ${isTravelPresaleConfirming ? 'confirming-banner' : 'unified-banner'}`}>
                  <div className="tsb-left">
                    <svg viewBox="0 0 24 24" fill="none" preserveAspectRatio="xMidYMid meet">
                      <path d="M12 2l8 4v6c0 5-3.5 9.3-8 10-4.5-.7-8-5-8-10V6l8-4z" fill="#2563EB"/>
                      <path d="M8.5 12l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    <span>安心游</span>
                  </div>
                  <div className="tsb-right">
                    <span>全程无购物·无隐形消费·退订无忧</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" preserveAspectRatio="xMidYMid meet"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>

                {/* 预约/出行信息：确认中/成功显示预约信息；完成/取消/退款显示出行信息；待支付/待预约不显示 */}
                {(isTravelPresaleConfirming || isTravelPresaleConfirmed || isTravelPresaleCompleted || isTravelPresaleRefundRelated || isTravelPresaleCanceled) && (
                  <div className="travel-card travel-info-card">
                    <div className="travel-card-title">
                      <strong>{isTravelPresaleConfirming || isTravelPresaleConfirmed ? '预约信息' : '出行信息'}</strong>
                      {(isTravelPresaleConfirming || isTravelPresaleConfirmed) && <span className="travel-card-tip">① 预约成功后，取消或修改需联系商家</span>}
                    </div>
                    {detail.vacationInfo?.departureDate && (
                      <div className="travel-info-line">
                        <span className="travel-info-k">{isTravelPresaleConfirming || isTravelPresaleConfirmed ? '行程日期' : '出行日期'}</span>
                        <span className="travel-info-v">{detail.vacationInfo.departureDate.replace(/-/g,'.')} - {detail.vacationInfo.returnDate?.replace(/-/g,'.')}</span>
                      </div>
                    )}
                    {(isTravelPresaleConfirming || isTravelPresaleConfirmed) && detail.vacationInfo?.passengers && (
                      <div className="travel-info-line">
                        <span className="travel-info-k">人数间数</span>
                        <span className="travel-info-v">共{detail.vacationInfo.passengers.length}人 {Math.ceil(detail.vacationInfo.passengers.length/2)}间房</span>
                      </div>
                    )}
                    {(isTravelPresaleConfirming || isTravelPresaleConfirmed) && (
                      <div className="travel-info-line">
                        <span className="travel-info-k">联 系 人</span>
                        <span className="travel-info-v">156****1600</span>
                      </div>
                    )}
                    {(isTravelPresaleCompleted || isTravelPresaleRefundRelated || isTravelPresaleCanceled) && detail.vacationInfo?.passengers && (
                      <div className="travel-info-line">
                        <span className="travel-info-k">联 系 人</span>
                        <span className="travel-info-v">{detail.vacationInfo.passengers[0]}</span>
                      </div>
                    )}
                    {(isTravelPresaleConfirming || isTravelPresaleConfirmed) && (
                      <div className="travel-info-line">
                        <span className="travel-info-k">偏好备注</span>
                        <span className="travel-info-v">尽量安排大床标；尽量安排高楼层、非电梯房、可吸烟的房间，感谢</span>
                      </div>
                    )}
                    {(isTravelPresaleCompleted || isTravelPresaleRefundRelated || isTravelPresaleCanceled) && (
                      <div className="travel-info-line">
                        <span className="travel-info-k">注意事项</span>
                        <span className="travel-info-v">请务必携带本人真实身份证件出行</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 入住信息（仅预约确认中显示） */}
                {isTravelPresaleConfirming && (
                  <div className="travel-card travel-guest-card">
                    <div className="travel-card-title"><strong>入住信息</strong></div>
                    {['易烊千玺','王一博'].map((name, idx) => (
                      <div className="travel-guest-block" key={idx}>
                        <div className="travel-guest-title">入住人{idx + 1}</div>
                        <div className="travel-info-line"><span className="travel-info-k">身份证</span><span className="travel-info-v guest-id">3206B2 19960601 6600</span></div>
                        <div className="travel-info-line"><span className="travel-info-k">手机号</span><span className="travel-info-v">156 **** 1681</span></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 旅游合同入口（预约成功） */}
                {isTravelPresaleConfirmed && (
                  <div className="travel-card travel-entry-card">
                    <span className="travel-entry-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    </span>
                    <strong>旅游合同</strong>
                    <span className="travel-entry-badge">①</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                )}

                {/* 评价引导（交易完成） */}
                {isTravelPresaleCompleted && (
                  <div className="travel-card travel-review-card">
                    <div className="travel-review-head">
                      <strong>告诉大家，体验怎么样？</strong>
                      <button type="button" className="travel-review-close" aria-label="关闭">×</button>
                    </div>
                    <div className="travel-review-options">
                      <button type="button" className="tro-btn">
                        <span className="tro-emoji">😐</span>
                        <span>推荐</span>
                      </button>
                      <button type="button" className="tro-btn">
                        <span className="tro-emoji">😐</span>
                        <span>一般</span>
                      </button>
                      <button type="button" className="tro-btn">
                        <span className="tro-emoji">😞</span>
                        <span>不推荐</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 出行记录入口（交易完成） */}
                {isTravelPresaleCompleted && (
                  <div className="travel-card travel-entry-card">
                    <span className="travel-entry-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"/></svg>
                    </span>
                    <strong>出行记录</strong>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                )}

                {/* 预约入口卡片（仅待预约状态显示） */}
                {isTravelPresalePendingBook && (
                <div className="travel-booking-card-v2">
                  <div className="tbc-v2-title">
                    <span className="tbc-v2-fire">🔥</span>
                    <span className="tbc-v2-red">预约火爆</span>
                    <span className="tbc-v2-dark">请尽早预约</span>
                  </div>
                  <div className="tbc-v2-tip">至少提前7天预约·预约后不可取消或修改</div>
                  <div className="tbc-v2-calendar">
                    {(() => {
                      const today = new Date();
                      const weekNames = ['周日','周一','周二','周三','周四','周五','周六'];
                      const dates: { week: string; dayLabel: string; tag: string; tagType: 'earliest'|'available' }[] = [];
                      let earliestSet = false;
                      for (let i = 2; i <= 6; i++) {
                        const d = new Date(today);
                        d.setDate(today.getDate() + i);
                        let tagType: 'earliest'|'available' = 'available';
                        let tag = '可约';
                        if (!earliestSet) { earliestSet = true; tagType = 'earliest'; tag = '最早可约'; }
                        dates.push({
                          week: weekNames[d.getDay()],
                          dayLabel: `${d.getMonth()+1}/${d.getDate()}`,
                          tag, tagType,
                        });
                      }
                      return dates.map((d, idx) => (
                        <div key={idx} className={`tbc-v2-pill ${d.tagType}`}>
                          <span className="tbc-v2-week">{d.week}</span>
                          <span className="tbc-v2-day">{d.dayLabel}</span>
                          <span className="tbc-v2-tag">{d.tag}</span>
                        </div>
                      ));
                    })()}
                    <div className="tbc-v2-all">
                      <span>全部<br/>日期</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                  <button type="button" className="tbc-v2-btn" onClick={(e) => { e.stopPropagation(); handleBottomAction('预约出行'); }}>预约出行</button>
                  <div className="tbc-v2-footer">
                    <span>预约遇到问题？点击</span>
                    <span className="tbc-v2-contact">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E6FFF" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z"/></svg>
                      咨询商家
                    </span>
                  </div>
                </div>
                )}

                {/* 商家信息卡 */}
                <div className="travel-merchant-card-v2">
                  <div className="tmc-v2-logo">
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                      <defs>
                        <linearGradient id="cytsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FF8C00"/>
                          <stop offset="100%" stopColor="#FF5722"/>
                        </linearGradient>
                      </defs>
                      <circle cx="28" cy="28" r="28" fill="url(#cytsGrad)"/>
                      <text x="28" y="26" fill="#fff" fontSize="13" fontWeight="800" textAnchor="middle" letterSpacing="0.5">CYTS</text>
                      <text x="28" y="38" fill="#fff" fontSize="8" fontWeight="600" textAnchor="middle">中青旅</text>
                    </svg>
                  </div>
                  <div className="tmc-v2-info">
                    <div className="tmc-v2-name">{listItem.merchant}</div>
                    <div className="tmc-v2-rating">
                      <span className="tmc-v2-hearts">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4D4F"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4D4F"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4D4F"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4D4F"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD6D7"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      </span>
                      <span className="tmc-v2-score">4.5</span>
                      <span className="tmc-v2-verdict">非常棒</span>
                    </div>
                    <div className="tmc-v2-stats">
                      <span>355商品</span>
                      <span className="tmc-v2-sep">|</span>
                      <span>10万+销量</span>
                      <span className="tmc-v2-sep">|</span>
                      <span>101.2万粉丝</span>
                    </div>
                    <div className="tmc-v2-badges">
                      <span className="tmc-v2-gold">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#D97706"><path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2l-5-4.9 6.9-1z"/></svg>
                        金牌商家
                      </span>
                      <span className="tmc-v2-gold-text">口碑保障·销量领先·服务优质</span>
                    </div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B0B4BD" strokeWidth="2" className="tmc-v2-arrow"><path d="M9 18l6-6-6-6"/></svg>
                </div>

                {/* 费用说明 */}
                <div className="travel-section-v2">
                  <div className="ts-v2-title">费用说明</div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">费用包含</div>
                    <div className="ts-v2-row">
                      <span className="ts-v2-label">大交通</span>
                      <span className="ts-v2-value">机票：往返经济舱机票</span>
                    </div>
                    <div className="ts-v2-row">
                      <span className="ts-v2-label">住宿</span>
                      <span className="ts-v2-value">标准双人间，9晚酒店住宿，含每日早餐，赠送接送机服务</span>
                    </div>
                    <div className="ts-v2-row">
                      <span className="ts-v2-label">餐饮</span>
                      <span className="ts-v2-value">成人：9次早餐，5次午餐，5次晚餐；儿童：9次早餐</span>
                    </div>
                    <div className="ts-v2-row">
                      <span className="ts-v2-label">地面交通</span>
                      <span className="ts-v2-value">安排专车和司机/导游提供接送及观光服务，安排旅游大巴或小型商务车服务</span>
                    </div>
                  </div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">费用不包含</div>
                    <div className="ts-v2-row">
                      <span className="ts-v2-label">项目</span>
                      <span className="ts-v2-value">行程中所列景点大门票（如：蜈支洲岛、南山文化旅游区等）</span>
                    </div>
                    <div className="ts-v2-row">
                      <span className="ts-v2-label">辅助人员</span>
                      <span className="ts-v2-value">仅安排中文司机与导游，不提供外语服务（可单聘英语/俄语等翻译）</span>
                    </div>
                  </div>
                </div>

                {/* 使用规则 */}
                <div className="travel-section-v2">
                  <div className="ts-v2-title">使用规则</div>
                  <div className="ts-v2-rule-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="ts-v2-rule-label">有效期</span>
                    <span className="ts-v2-rule-value">2026.05.15 至 2026.11.17</span>
                  </div>
                  <div className="ts-v2-rule-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    <span className="ts-v2-rule-label">预约时间限制</span>
                    <span className="ts-v2-rule-value">2026.06.16 至 2026.11.17</span>
                  </div>
                  <div className="ts-v2-rule-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    <span className="ts-v2-rule-label">适用人数</span>
                    <span className="ts-v2-rule-value">儿童：年龄0-12岁（含），以下身高23厘米（含）以下，须由成年人代订</span>
                  </div>
                  <div className="ts-v2-rule-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    <span className="ts-v2-rule-label">商品限制</span>
                    <span className="ts-v2-rule-value">每单限购9份</span>
                  </div>
                  <div className="ts-v2-rule-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    <span className="ts-v2-rule-label">其他规则</span>
                    <span className="ts-v2-rule-value">不可与其他平台优惠同享</span>
                  </div>
                </div>

                {/* 加价政策 */}
                <div className="travel-section-v2">
                  <div className="ts-v2-title">加价政策</div>
                  <div className="ts-v2-tip">如在同一订单内有不合年龄和人数，将按全价核算的规则进行计费，不会叠加补贴。</div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">热门日期加价</div>
                    <div className="ts-v2-sub-desc">加价金额按出行第一天为计算日期</div>
                    <div className="ts-v2-table">
                      <div className="ts-v2-tr ts-v2-thead">
                        <span className="ts-v2-td-name">节假日</span>
                        <span className="ts-v2-td-date">2026.07.01-08.31；<br/>2026.10.01-10.07</span>
                        <span className="ts-v2-td-price">¥500/套</span>
                      </div>
                    </div>
                  </div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">额外增加行人</div>
                    <div className="ts-v2-sub-desc">团购在默认行人人数外，额外增加出行人，需在预约时支付差价。加价金额按出行第一天为计算日期</div>
                    <div className="ts-v2-table">
                      <div className="ts-v2-tr ts-v2-thead">
                        <span className="ts-v2-td-name">成人</span>
                        <span className="ts-v2-td-date">2026.07.01-08.31期间，<br/>逢周六、周日<br/>2026.09.01-09.28；<br/>逢周日</span>
                        <span className="ts-v2-td-price">¥1680/人</span>
                      </div>
                      <div className="ts-v2-tr">
                        <span className="ts-v2-td-name"></span>
                        <span className="ts-v2-td-date">非加价日期</span>
                        <span className="ts-v2-td-price">¥1280/人</span>
                      </div>
                      <div className="ts-v2-tr">
                        <span className="ts-v2-td-name">儿童</span>
                        <span className="ts-v2-td-date">2026.07.01-08.31期间，<br/>逢周六、周日</span>
                        <span className="ts-v2-td-price">¥800/人</span>
                      </div>
                    </div>
                  </div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">房型差</div>
                    <div className="ts-v2-sub-desc">商品默认安排标准间/双床房入位，如需一人单独入住一间房，或升级入住为单房差，需额外支付费用，加价金额按出行第一天为计算日期</div>
                    <div className="ts-v2-table">
                      <div className="ts-v2-tr ts-v2-thead">
                        <span className="ts-v2-td-name">单间差</span>
                        <span className="ts-v2-td-date">2026.07.01-08.31期间，<br/>逢周六、周日</span>
                        <span className="ts-v2-td-price">¥800/人，<br/>入住期间</span>
                      </div>
                      <div className="ts-v2-tr">
                        <span className="ts-v2-td-name"></span>
                        <span className="ts-v2-td-date">非加价日期</span>
                        <span className="ts-v2-td-price">¥600/人，<br/>入住期间</span>
                      </div>
                    </div>
                  </div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">额外升级房型</div>
                    <div className="ts-v2-sub-desc">升级外面房型，需在预约时支付房型差</div>
                    <div className="ts-v2-table">
                      <div className="ts-v2-tr ts-v2-thead">
                        <span className="ts-v2-td-name">海景房</span>
                        <span className="ts-v2-td-date">加价日</span>
                        <span className="ts-v2-td-price">¥500/套</span>
                      </div>
                      <div className="ts-v2-tr">
                        <span className="ts-v2-td-name">套房</span>
                        <span className="ts-v2-td-date">非加价日</span>
                        <span className="ts-v2-td-price">¥800/套</span>
                      </div>
                    </div>
                  </div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">接送机</div>
                    <div className="ts-v2-sub-desc">默认以下机场和酒店地址接送服务，如需前往以下外省市，需额外付费</div>
                    <div className="ts-v2-table">
                      <div className="ts-v2-tr ts-v2-thead">
                        <span className="ts-v2-td-name">主要城市</span>
                        <span className="ts-v2-td-date">三亚、凤凰机场、海口、<br/>美兰、大理</span>
                        <span className="ts-v2-td-price">¥300～<br/>¥800/人</span>
                      </div>
                      <div className="ts-v2-tr">
                        <span className="ts-v2-td-name"></span>
                        <span className="ts-v2-td-date">儋州、海南、三亚</span>
                        <span className="ts-v2-td-price">¥800～<br/>¥1000/人</span>
                      </div>
                    </div>
                  </div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">航班保险</div>
                    <div className="ts-v2-table">
                      <div className="ts-v2-tr ts-v2-thead">
                        <span className="ts-v2-td-name">其他</span>
                        <span className="ts-v2-td-date">航空意外险40元/份，<br/>第二单起保险20元/份</span>
                        <span className="ts-v2-td-price"></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 退款说明 */}
                <div className="travel-section-v2">
                  <div className="ts-v2-title">退款说明</div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">用户退订违约</div>
                    <div className="ts-v2-sub-desc">预约后取消将产生违约金，退款规则如下：</div>
                    <div className="ts-v2-refund-table">
                      <div className="ts-v2-rt-head">
                        <span>时间窗口</span>
                        <span>违约金（占订单金额比例）</span>
                      </div>
                      <div className="ts-v2-rt-row"><span>预约出行7天以上</span><span>无</span></div>
                      <div className="ts-v2-rt-row"><span>出行前4-6天</span><span>20%</span></div>
                      <div className="ts-v2-rt-row"><span>出行前2-3天</span><span>40%</span></div>
                      <div className="ts-v2-rt-row"><span>出行前1天</span><span>60%</span></div>
                      <div className="ts-v2-rt-row"><span>出行开始当日</span><span>100%</span></div>
                    </div>
                    <div className="ts-v2-tip" style={{marginTop:'8px'}}>• 预约后如需变更出行时间，需先取消原预约；</div>
                    <div className="ts-v2-tip">• 如因不可抗力因素导致行程取消，将全额退款。</div>
                  </div>
                  <div className="ts-v2-block">
                    <div className="ts-v2-subtitle">商家违约退款</div>
                    <div className="ts-v2-sub-desc">如行程不能按预约日期入住将按以下规则进行赔付</div>
                    <div className="ts-v2-refund-table">
                      <div className="ts-v2-rt-head">
                        <span>时间窗口</span>
                        <span>赔付金额（占订单金额比例）</span>
                      </div>
                      <div className="ts-v2-rt-row"><span>预约出行7天以上</span><span>无</span></div>
                      <div className="ts-v2-rt-row"><span>出行前4-6天</span><span>20%</span></div>
                      <div className="ts-v2-rt-row"><span>出行前2-3天</span><span>40%</span></div>
                      <div className="ts-v2-rt-row"><span>出行前1天</span><span>60%</span></div>
                      <div className="ts-v2-rt-row"><span>出行开始当日</span><span>100%</span></div>
                    </div>
                  </div>
                </div>

                {/* 订单信息 */}
                <div className="travel-section-v2">
                  <div className="ts-v2-title">订单信息</div>
                  <div className="ts-v2-info-row">
                    <span className="ts-v2-info-label">订单号</span>
                    <span className="ts-v2-info-value">{listItem.orderId || 'CTS202606280014453'} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></span>
                  </div>
                  <div className="ts-v2-info-row">
                    <span className="ts-v2-info-label">下单时间</span>
                    <span className="ts-v2-info-value">2026-06-28 14:25</span>
                  </div>
                  <div className="ts-v2-info-row">
                    <span className="ts-v2-info-label">手机号</span>
                    <span className="ts-v2-info-value">138****8888</span>
                  </div>
                  <div className="ts-v2-info-row">
                    <span className="ts-v2-info-label">购买数量</span>
                    <span className="ts-v2-info-value">1份</span>
                  </div>
                  <div className="ts-v2-info-row">
                    <span className="ts-v2-info-label">订单金额</span>
                    <span className="ts-v2-info-value">¥512.00</span>
                  </div>
                  <div className="ts-v2-info-row">
                    <span className="ts-v2-info-label">优惠金额</span>
                    <span className="ts-v2-info-value" style={{color:'#FF2D55'}}>-¥60.50</span>
                  </div>
                  <div className="ts-v2-info-row">
                    <span className="ts-v2-info-label">实付金额</span>
                    <span className="ts-v2-info-value" style={{color:'#FF2D55',fontWeight:600}}>¥451.50</span>
                  </div>
                </div>
              </>
            )}

            {/* ===== 其他状态：旧版商品卡（v2状态不显示） ===== */}
            {!isTravelPresaleV2State && (
            <div className="travel-card travel-product-card">
              <div className="travel-product-main">
                <div className="travel-product-thumb">{listItem.thumbnail}</div>
                <div className="travel-product-info">
                  <div className="travel-product-name-row">
                    <strong className="travel-product-name">{listItem.product}</strong>
                  </div>
                  <div className="travel-product-meta">
                    <span className="tpm-tag">纯玩无购物</span>
                    <span className="tpm-tag">含机票·住宿</span>
                  </div>
                  <div className="travel-product-price">
                    <span className="tpp-symbol">¥</span>
                    <span className="tpp-num">{payableAmount}</span>
                    <span className="tpp-qty">x{listItem.totalQuantity ?? 1}</span>
                    <span className="travel-product-detail">
                      行程/费用
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </span>
                  </div>
                </div>
              </div>
              <div className="travel-product-dates">
                {isTravelPresaleConfirmed || isTravelPresaleCompleted ? (
                  <div className="travel-info-line"><span className="travel-info-k">出行日期</span><span className="travel-info-v">{(detail.vacationInfo?.departureDate ?? '').replace(/-/g, '.')} - {(detail.vacationInfo?.returnDate ?? '').replace(/-/g, '.')}</span></div>
                ) : (
                  <div className="travel-info-line"><span className="travel-info-k">有效期</span><span className="travel-info-v">{detail.productRules?.validDate ?? '2026.07.01至2026.12.31 均可使用'}</span></div>
                )}
                <div className="travel-info-line"><span className="travel-info-k">出行人数</span><span className="travel-info-v">{detail.vacationInfo?.passengers?.length ?? listItem.totalQuantity ?? 2}人</span></div>
              </div>
              {!(isTravelPresaleRefundRelated || isTravelPresaleCanceled) && (
                <div className="travel-rule-tags-row">
                  {(isTravelPresalePendingBook || isTravelPresalePaying
                    ? ['需提前预约','不约可退','安心游保障']
                    : isTravelPresaleConfirming
                    ? ['预约确认中','预计30分钟确认','安心游保障']
                    : isTravelPresaleConfirmed
                    ? ['预约成功','可联系导游','安心游保障']
                    : isTravelPresaleCompleted
                    ? ['已出行','安心游保障']
                    : ['需提前预约','不约可退','安心游保障']
                  ).map((tag, i) => {
                    const isBlue = i === 0 && ['需提前预约','预约确认中','预约成功','已出行'].some(k => tag.startsWith(k.slice(0,2))) && !isTravelPresaleRefundRelated && !isTravelPresaleCanceled;
                    return (
                      <span key={i} className={`travel-rule-tag ${isBlue ? 'blue' : 'gray'}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isBlue ? '#2563EB' : '#9CA3AF'} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* 待预约 - 日期选择预约入口（参考景区scenic-presale-booking-card-v2） */}
              {isTravelPresalePendingBook && (
                <div className="travel-booking-card">
                  <div className="travel-booking-hot">
                    <span className="travel-booking-fire">🔥</span>
                    <span className="travel-booking-red">预约火爆</span>
                    <span className="travel-booking-dark"> 限时早鸟价</span>
                  </div>
                  <div className="travel-booking-tip">至少提前7天预约 · 预约后签改期请电话咨询</div>
                  <div className="travel-booking-calendar">
                    {(() => {
                      const today = new Date();
                      const weekNames = ['周日','周一','周二','周三','周四','周五','周六'];
                      const dates: { week: string; dayLabel: string; tag: string; tagType: 'earliest'|'available'|'full' }[] = [];
                      let earliestSet = false;
                      for (let i = 1; i <= 7; i++) {
                        const d = new Date(today);
                        d.setDate(today.getDate() + i);
                        const isFull = (i === 2 || i === 5);
                        let tagType: 'earliest'|'available'|'full' = 'available';
                        let tag = '可约';
                        if (isFull) { tagType = 'full'; tag = '已满'; }
                        else if (!earliestSet) { earliestSet = true; tagType = 'earliest'; tag = '最早可约'; }
                        dates.push({
                          week: weekNames[d.getDay()],
                          dayLabel: `${d.getMonth()+1}/${d.getDate()}`,
                          tag, tagType,
                        });
                      }
                      return dates.map((d, idx) => (
                        <div key={idx} className={`travel-date-pill ${d.tagType === 'full' ? 'disabled' : ''}`}>
                          <span className="tdp-week">{d.week}</span>
                          <span className="tdp-day">{d.dayLabel}</span>
                          <span className={`tdp-tag ${d.tagType}`}>{d.tag}</span>
                        </div>
                      ));
                    })()}
                    <div className="travel-date-all">
                      <span>全部日期</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                  <button type="button" className="travel-book-btn" onClick={(e) => { e.stopPropagation(); handleBottomAction('立即预约'); }}>立即预约</button>
                  <div className="travel-booking-footer">
                    <span className="travel-booking-help">预约有疑问？点此 <span className="travel-booking-link">👉 电话咨询</span></span>
                    <span className="travel-booking-refund">预约后提前7天可无损退订</span>
                  </div>
                </div>
              )}

              {/* 预约确认中 - 紧凑确认提示 */}
              {isTravelPresaleConfirming && (
                <div className="travel-confirming-inline">
                  <span className="travel-ci-tag">预约确认中</span>
                  <span className="travel-ci-tip">预计30分钟内确认结果</span>
                </div>
              )}
            </div>
            )}

            {/* 安心游保障条（v2状态已在v2区块显示） */}
            {!isTravelPresaleV2State && (
            <div className="travel-safety-banner-v2">
              <div className="tsb-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563EB"><path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"/></svg>
                <span>安心游</span>
              </div>
              <div className="tsb-right">
                <span>全程无购物·无隐形消费·退订无忧</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
            )}

            {/* 退款记录条 */}
            {refundRecord && (
              <div className="travel-card travel-refund-record">
                <strong>退款·{refundRecord.refundQuantity}份</strong>
                <div className="travel-rr-side">
                  <span>查看详情</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            )}

            {/* 预约/出行信息：确认中/成功显示预约信息；完成/取消/退款显示出行信息；待支付/待预约不显示（v2状态已移至顶部） */}
            {!isTravelPresaleV2State && (isTravelPresaleConfirming || isTravelPresaleConfirmed || isTravelPresaleCompleted || isTravelPresaleRefundRelated || isTravelPresaleCanceled) && (
              <div className="travel-card travel-info-card">
                <div className="travel-card-title">
                  <strong>{isTravelPresaleConfirming || isTravelPresaleConfirmed ? '预约信息' : '出行信息'}</strong>
                  {(isTravelPresaleConfirming || isTravelPresaleConfirmed) && <span className="travel-card-tip">① 预约成功后，取消或修改需联系商家</span>}
                </div>
                {detail.vacationInfo?.departureDate && (
                  <div className="travel-info-line">
                    <span className="travel-info-k">{isTravelPresaleConfirming || isTravelPresaleConfirmed ? '行程日期' : '出行日期'}</span>
                    <span className="travel-info-v">{detail.vacationInfo.departureDate.replace(/-/g,'.')} - {detail.vacationInfo.returnDate?.replace(/-/g,'.')}</span>
                  </div>
                )}
                {(isTravelPresaleConfirming || isTravelPresaleConfirmed) && detail.vacationInfo?.passengers && (
                  <div className="travel-info-line">
                    <span className="travel-info-k">人数间数</span>
                    <span className="travel-info-v">共{detail.vacationInfo.passengers.length}人 {Math.ceil(detail.vacationInfo.passengers.length/2)}间房</span>
                  </div>
                )}
                {(isTravelPresaleConfirming || isTravelPresaleConfirmed) && (
                  <div className="travel-info-line">
                    <span className="travel-info-k">联 系 人</span>
                    <span className="travel-info-v">156****1600</span>
                  </div>
                )}
                {(isTravelPresaleCompleted || isTravelPresaleRefundRelated || isTravelPresaleCanceled) && detail.vacationInfo?.passengers && (
                  <div className="travel-info-line">
                    <span className="travel-info-k">联 系 人</span>
                    <span className="travel-info-v">{detail.vacationInfo.passengers[0]}</span>
                  </div>
                )}
                {(isTravelPresaleConfirming || isTravelPresaleConfirmed) && (
                  <div className="travel-info-line">
                    <span className="travel-info-k">偏好备注</span>
                    <span className="travel-info-v">尽量安排大床标；尽量安排高楼层、非电梯房、可吸烟的房间，感谢</span>
                  </div>
                )}
                {(isTravelPresaleCompleted || isTravelPresaleRefundRelated || isTravelPresaleCanceled) && (
                  <div className="travel-info-line">
                    <span className="travel-info-k">注意事项</span>
                    <span className="travel-info-v">请务必携带本人真实身份证件出行</span>
                  </div>
                )}
              </div>
            )}

            {/* 入住信息（仅预约确认中显示，v2状态已移至顶部） */}
            {!isTravelPresaleV2State && isTravelPresaleConfirming && (
              <div className="travel-card travel-guest-card">
                <div className="travel-card-title"><strong>入住信息</strong></div>
                {['易烊千玺','王一博'].map((name, idx) => (
                  <div className="travel-guest-block" key={idx}>
                    <div className="travel-guest-title">入住人{idx + 1}</div>
                    <div className="travel-info-line"><span className="travel-info-k">身份证</span><span className="travel-info-v guest-id">3206B2 19960601 6600</span></div>
                    <div className="travel-info-line"><span className="travel-info-k">手机号</span><span className="travel-info-v">156 **** 1681</span></div>
                  </div>
                ))}
              </div>
            )}

            {/* 旅游合同入口（预约成功，v2状态已移至顶部） */}
            {!isTravelPresaleV2State && isTravelPresaleConfirmed && (
              <div className="travel-card travel-entry-card">
                <span className="travel-entry-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                </span>
                <strong>旅游合同</strong>
                <span className="travel-entry-badge">①</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            )}

            {/* 使用凭证（预约成功：二维码+游客+景点券码） */}
            {isTravelPresaleConfirmed && (
              <div className="travel-card travel-voucher-card">
                <div className="travel-card-title"><strong>使用凭证</strong></div>
                <div className="travel-voucher-tip">提示：门票上行索道需同一天使用，下行索道三天内有效，请提前安排好行程，以免耽误您的行程</div>
                <div className="travel-scenic-block">
                  <div className="travel-scenic-head">
                    <strong>黄山风景区</strong>
                    <span className="travel-scenic-toggle">收起 ∧</span>
                  </div>
                  <div className="travel-scenic-sub">凭「身份证」或「券码」入园</div>
                  <div className="travel-voucher-visitors">
                    <div className="travel-info-line"><span className="travel-info-k">身份证</span><span className="travel-info-v">易烊千玺<br/>3206B2 19960601 6600<br/>王一博<br/>3206B2 19960601 6600<br/>张晓亮<br/>3206B2 19960801 6600</span></div>
                  </div>
                  <div className="travel-voucher-qr-section">
                    <div className="tvqs-label">券 码</div>
                    <div className="tvqs-page">1/3</div>
                    <div className="tvqs-arrows">
                      <button type="button" className="tvqs-arrow" aria-label="上一张">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                      <div className="tvqs-qr">
                        <svg width="110" height="110" viewBox="0 0 29 29" shapeRendering="crispEdges">
                          <rect width="29" height="29" fill="#fff"/>
                          {Array.from({length:29}).map((_,y)=>Array.from({length:29}).map((_,x)=>{const p=Math.sin(x*1.7+y*2.3)+Math.cos(x*0.9-y*1.1);return p>0.3?<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111"/>:null;}))}
                          <rect x="0" y="0" width="7" height="7" fill="#111"/><rect x="2" y="2" width="3" height="3" fill="#fff"/>
                          <rect x="22" y="0" width="7" height="7" fill="#111"/><rect x="24" y="2" width="3" height="3" fill="#fff"/>
                          <rect x="0" y="22" width="7" height="7" fill="#111"/><rect x="2" y="24" width="3" height="3" fill="#fff"/>
                        </svg>
                      </div>
                      <button type="button" className="tvqs-arrow" aria-label="下一张">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    </div>
                    <div className="tvqs-codes">
                      <div>券 号&nbsp;&nbsp;&nbsp;&nbsp;9001 1345 653 <i className="travel-copy-link">复制</i></div>
                      <div>9001 1345 653 <i className="travel-copy-link">复制</i></div>
                      <div>9001 1345 653 <i className="travel-copy-link">复制</i></div>
                    </div>
                  </div>
                </div>
                {['云谷上行索道成人票','玉屏下行索道成人票','南大门索道成人票'].map((name, i) => (
                  <div className="travel-scenic-block collapsed" key={i}>
                    <div className="travel-scenic-head">
                      <strong>{name}</strong>
                      <span className="travel-scenic-toggle">展开 ∨</span>
                    </div>
                    <div className="travel-scenic-sub">凭「身份证」或「券码」入园</div>
                  </div>
                ))}
              </div>
            )}

            {/* 评价引导（交易完成，v2状态已移至顶部） */}
            {!isTravelPresaleV2State && isTravelPresaleCompleted && (
              <div className="travel-card travel-review-card">
                <div className="travel-review-head">
                  <strong>告诉大家，体验怎么样？</strong>
                  <button type="button" className="travel-review-close" aria-label="关闭">×</button>
                </div>
                <div className="travel-review-options">
                  <button type="button" className="tro-btn">
                    <span className="tro-emoji">😐</span>
                    <span>推荐</span>
                  </button>
                  <button type="button" className="tro-btn">
                    <span className="tro-emoji">😐</span>
                    <span>一般</span>
                  </button>
                  <button type="button" className="tro-btn">
                    <span className="tro-emoji">😞</span>
                    <span>不推荐</span>
                  </button>
                </div>
              </div>
            )}

            {/* 出行记录入口（交易完成，v2状态已移至顶部） */}
            {!isTravelPresaleV2State && isTravelPresaleCompleted && (
              <div className="travel-card travel-entry-card">
                <span className="travel-entry-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"/></svg>
                </span>
                <strong>出行记录</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            )}

            {/* 旅行社信息（v2状态用v2商家卡替代） */}
            {!isTravelPresaleV2State && (
            <div className="travel-card travel-agency-card">
              <div className="travel-agency-row">
                <div className="travel-agency-logo">
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" fill="#FF6B00"/>
                    <text x="24" y="28" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">CYTS</text>
                  </svg>
                </div>
                <div className="travel-agency-info">
                  <div className="travel-agency-name">
                    {detail.vacationInfo?.agency ?? listItem.merchant}
                    <span className="travel-gold-badge">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#D97706"><path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2l-5-4.9 6.9-1z"/></svg>
                      金牌商家
                    </span>
                  </div>
                  <div className="travel-agency-rating">
                    <span className="travel-star">★★★★★ 4.5</span>
                    <span className="travel-rating-sep">|</span>
                    <span>30万+销量</span>
                    <span className="travel-rating-sep">|</span>
                    <span>101.2万粉丝</span>
                  </div>
                  <div className="travel-agency-tags">
                    <span className="travel-agency-tag">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2l-5-4.9 6.9-1z"/></svg>
                      金牌商家
                    </span>
                    <span className="travel-agency-tag">口碑保障·体验领先·服务优质</span>
                  </div>
                </div>
                <div className="travel-agency-ops">
                  <button type="button" className="travel-op-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563EB"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.6c0 .7-.5 1.2-1.2 1.2C10.2 21.5 2.5 13.8 2.5 3.4c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.7.6 4 .1.4 0 .9-.3 1.2l-2.2 2.2Z"/></svg>
                    <span>联系</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* 费用说明（v2状态用v2设计，不显示此模块） */}
            {!isTravelPresaleV2State && isTravelPresalePaying && (
            <div className="travel-card travel-fee-card">
              <div className="travel-card-title">
                <strong>费用说明</strong>
              </div>
              <div className="travel-fee-block">
                <div className="travel-fee-subtitle">费用包含</div>
                <div className="travel-fee-list">
                  <div className="travel-fee-item"><span className="travel-fee-check blue">✓</span>大交通：机票（往返经济舱机票）</div>
                  <div className="travel-fee-item"><span className="travel-fee-check blue">✓</span>住宿：标注2人/间，3晚酒店住宿，含2晚豪华型酒店，1晚舒适型酒店</div>
                  <div className="travel-fee-item"><span className="travel-fee-check blue">✓</span>餐食：成人8次餐食，含5次早餐、3次午餐；儿童8次餐食，含5次早餐、3次午餐</div>
                  <div className="travel-fee-item"><span className="travel-fee-check blue">✓</span>地面交通：安排当地专属用车（特殊路段因当地规定及安全考量会派遣小型车提供服务）</div>
                </div>
              </div>
              <div className="travel-fee-block">
                <div className="travel-fee-subtitle">费用不包含</div>
                <div className="travel-fee-list">
                  <div className="travel-fee-item"><span className="travel-fee-check gray">✗</span>行程外景点/汤堰大门门票（古北水镇、潘西湖及红螺寺）</div>
                  <div className="travel-fee-item"><span className="travel-fee-check gray">✗</span>随团人员：仅安排中文司机负责行程活动中提供服务（不含景区/场馆讲解）</div>
                </div>
              </div>
            </div>
            )}

            {/* 使用规则（v2状态用v2设计，不显示此模块） */}
            {!isTravelPresaleV2State && (
            <div className="travel-card travel-rules-card">
              <div className="travel-card-title">
                <strong>使用规则</strong>
              </div>
              <div className="travel-rule-line">
                <span className="travel-rule-k">预约规则</span>
                <span className="travel-rule-v">需提前7天在线预约</span>
              </div>
              <div className="travel-rule-line">
                <span className="travel-rule-k">有效期</span>
                <span className="travel-rule-v">{detail.productRules?.validDate ?? '2026.07.01至2026.12.31'}</span>
              </div>
              <div className="travel-rule-line">
                <span className="travel-rule-k">适用人数</span>
                <span className="travel-rule-v">每份{listItem.totalQuantity ?? 2}人使用</span>
              </div>
              <div className="travel-rule-line">
                <span className="travel-rule-k">限购规则</span>
                <span className="travel-rule-v">每单限拍1份</span>
              </div>
              <div className="travel-rule-line">
                <span className="travel-rule-k">其他规则</span>
                <span className="travel-rule-v">不可同时享受商家其他优惠</span>
              </div>
            </div>
            )}

            {/* 加价政策（v2状态用v2设计，不显示此模块） */}
            {!isTravelPresaleV2State && isTravelPresalePaying && (
            <div className="travel-card travel-surcharge-card">
              <div className="travel-card-title">
                <strong>加价政策</strong>
              </div>
              <div className="travel-surcharge-desc">如在同一加价项目内命中多条加价规则，将按金额较高的规则进行计费，不会重复收取</div>
              <div className="travel-surcharge-sub">热门日期加价</div>
              <div className="travel-surcharge-desc2">加价金额将以行程第一天为计算依据</div>
              <div className="travel-surcharge-table">
                <div className="travel-st-head">
                  <span>节假日</span>
                  <span>2022.03.28-03.31；劳动节<br/>2022.04.30-05.04</span>
                  <span>¥530/人</span>
                </div>
                <div className="travel-st-row">
                  <span>其他</span>
                  <span>2022.02.01-02.28期间，逢周六、周日</span>
                  <span>¥530/单</span>
                </div>
              </div>
            </div>
            )}

            {/* 退款说明（v2状态用v2设计，不显示此模块） */}
            {!isTravelPresaleV2State && (
            <div className="travel-card travel-refund-policy-card">
              <div className="travel-card-title">
                <strong>退款说明</strong>
              </div>
              <div className="travel-refund-section">
                <div className="travel-refund-sub">用户违约退款</div>
                <div className="travel-refund-desc">预约后如果用户发生退款，退款规则如下：</div>
                <div className="travel-refund-table">
                  <div className="travel-rt-head"><span>行程前</span><span>违约金（占订单成交价）</span></div>
                  <div className="travel-rt-row"><span>行程前7日及以上</span><span>无</span></div>
                  <div className="travel-rt-row"><span>行程前4-6日</span><span>20%</span></div>
                  <div className="travel-rt-row"><span>行程前3-1日</span><span>40%</span></div>
                  <div className="travel-rt-row"><span>行程开始当日</span><span>60%</span></div>
                </div>
                <div className="travel-refund-desc">· 预约后如果需要取消预约，联系客服处理</div>
              </div>
              <div className="travel-refund-section">
                <div className="travel-refund-sub">商家违约退款</div>
                <div className="travel-refund-desc">· 旅行社在行程开始前7日以内提出解除合同</div>
                <div className="travel-refund-table">
                  <div className="travel-rt-head"><span>行程前</span><span>违约金（占订单成交价）</span></div>
                  <div className="travel-rt-row"><span>行程前7日及以上</span><span>无</span></div>
                  <div className="travel-rt-row"><span>行程前4-6日</span><span>20%</span></div>
                  <div className="travel-rt-row"><span>行程前3-1日</span><span>40%</span></div>
                  <div className="travel-rt-row"><span>行程开始当日</span><span>60%</span></div>
                </div>
              </div>
            </div>
            )}

            {/* NPS评分（交易完成/退款相关） */}
            {(isTravelPresaleCompleted || isTravelPresaleCanceled || isTravelPresaleRefundRelated) && (
              <div className="travel-card travel-nps-card">
                <div className="travel-nps-q">您愿意推荐亲友使用抖音服务吗？</div>
                <div className="travel-nps-scale-labels">
                  <span>非常不愿意</span>
                  <span>非常愿意</span>
                </div>
                <div className="travel-nps-dots">
                  {Array.from({length: 11}, (_, i) => (
                    <button key={i} type="button" className={`travel-nps-dot ${i === 0 ? 'selected' : ''}`}>{i}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isHotelPresaleDesignState && !isHotelCalendarDesignState && !isScenicGroupBuyDesignState && !isScenicCalendarDesignState && !isScenicPresaleDesignState && !isTravelPresaleDesignState && <div className={`oc-merged-card ${isFoodOrFunUnpaid ? 'paying' : ''} ${hotelView ? `hotel-detail-card tone-${hotelView.tone}` : ''} ${isHotelBookingReferenceState ? 'hotel-booking-shell' : ''}`}>
          {isHotelBookingReferenceState ? (
            <div className="hotel-booking-snapshot">
              <div className="hotel-booking-store-row">
                <img src={hotelBrandImage} alt="" />
                <div className="hotel-booking-store-copy">
                  <strong>希尔顿欢朋酒店(北京...</strong>
                  <span>北京市朝阳区小营北路15号院A座-1398</span>
                </div>
                <div className="hotel-booking-actions">
                  <button type="button" aria-label="导航">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#30343b"><path d="M3 11.2 21 3l-8.2 18-2.1-7.7L3 11.2Z"/></svg>
                    <span>导航</span>
                  </button>
                  <button type="button" aria-label="联系商家">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#30343b"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.6c0 .7-.5 1.2-1.2 1.2C10.2 21.5 2.5 13.8 2.5 3.4c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.7.6 4 .1.4 0 .9-.3 1.2l-2.2 2.2Z"/></svg>
                    <span>联系商家</span>
                  </button>
                </div>
              </div>
              <div className="hotel-booking-date-row">
                <div>
                  <strong>{hotelStayLabels.checkInText}</strong>
                  <span>12:00后入住</span>
                </div>
                <em>共{hotelStayLabels.nights}晚</em>
                <div>
                  <strong>{hotelStayLabels.checkOutText}</strong>
                  <span>12:00前离店</span>
                </div>
              </div>
              <div className="hotel-booking-room-row">
                <div>
                  <strong>高级大床房 共2间</strong>
                  <span>双早 1张大床 28–25m² 可住2人 有窗 禁烟</span>
                </div>
                <button type="button">
                  套餐详情
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
              {displayStatusText === '预约成功' && (
                <div className="hotel-booking-benefits">
                  <div><b>餐</b><span>1项&nbsp;&nbsp;赠12岁以下免费儿童早餐</span></div>
                  <div><b>享</b><span>3项&nbsp;&nbsp;机场穿梭巴士+免税店穿梭巴士+草坪天幕和书和书...</span></div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="oc-merged-product">
                <div className="oc-merged-thumb">{listItem.thumbnail}</div>
                <div className="oc-merged-info">
                  <div className="oc-merged-title">
                    {listItem.product}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
                <div className="oc-merged-price-col">
                  <div className="oc-m-original-price">¥{((listItem.price + 2000) / 100).toFixed(0)}</div>
                  <div className="oc-m-count">x1</div>
                  <div className="oc-m-real-price">
                    实付 ¥{(listItem.price / 100).toFixed(0)}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </div>
              <div className={`oc-merged-tags ${hasMergedContentBelowNotice ? '' : 'no-extra-content'}`}>
                <div className="oc-m-tag-left">
                  {isPresaleWaitingReserve
                    ? '先买后约 · 不约可退 · 过期未约自动退'
                    : hotelView
                      ? `${HOTEL_PRODUCT_TYPE_LABEL[listItem.hotelProductType!]} · ${hotelView.headerHint}`
                      : (() => {
                          const tags = detail ? buildNoticeTags(detail) : [];
                          const displayTags = tags.length > 0 ? tags : ['全周可用', '随时退', '过期退'];
                          return displayTags.join(' · ');
                        })()}
                </div>
                <div className="oc-m-tag-right">{isPresaleWaitingReserve ? '须知/退改规则' : '使用须知'} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></div>
              </div>

              {hotelView && (
                isPresaleWaitingReserve ? (
                  <div className="hotel-presale-reserve-card">
                    <div className="hotel-presale-reserve-title">
                      <span>🔥 预约火爆</span>
                      <strong>请尽早预约</strong>
                    </div>
                    <p>至少提前7天预约 · 预约后不可取消和修改</p>
                    <div className="hotel-presale-date-list">
                      {hotelReserveDates.map((item) => (
                        <button key={item.date} type="button">
                          <span>{item.week}</span>
                          <strong>{item.date}</strong>
                          <em>{item.status}</em>
                        </button>
                      ))}
                      <button type="button" className="all">
                        <span>全部</span>
                        <strong>日期</strong>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    </div>
                    <button className="hotel-detail-main-action" onClick={() => handleBottomAction('立即预约')}>
                      立即预约
                    </button>
                  </div>
                ) : (
                  <div className="hotel-detail-status-card">
                    <div className="hotel-detail-status-top">
                      <div>
                        <span>{HOTEL_PRODUCT_TYPE_LABEL[listItem.hotelProductType!]}</span>
                        <strong>{hotelView.title}</strong>
                      </div>
                      {hotelCountdownText && <em>{hotelCountdownText}</em>}
                    </div>
                    <p>{hotelReservationState?.notice ?? hotelView.headerHint}</p>
                    <div className="hotel-detail-tags">
                      {hotelView.tags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    <div className="hotel-detail-info-grid">
                      <div><span>入住门店</span><strong>{detail.store}</strong></div>
                      <div><span>入住日期</span><strong>{listItem.hotelProductType === 'calendar_room' ? '2026.06.28 入住' : '待预约确认'}</strong></div>
                      <div><span>房型</span><strong>{listItem.product.includes('大床') ? '高级大床房' : '豪华海景房'}</strong></div>
                    </div>
                    {(displayStatusText === '预约确认中' || displayStatusText === '预订确认中') && (
                      <div className="hotel-detail-debug-actions">
                        <button onClick={() => handleBottomAction('拒绝预约')}>拒绝预约</button>
                        <button onClick={() => handleBottomAction('商家接单')}>商家接单</button>
                      </div>
                    )}
                  </div>
                )
              )}

              {isFoodOrFunUnpaid && (
                <div className="oc-pay-price-lines">
                  <div>
                    <span>参考价</span>
                    <strong>¥{referenceAmount}</strong>
                  </div>
                  <div>
                    <span>团购优惠</span>
                    <strong className="discount">- ¥{groupDiscount}</strong>
                  </div>
                  <div>
                    <span>限时秒杀</span>
                    <strong className="discount">- ¥20</strong>
                  </div>
                </div>
              )}

              {reservationInfo && (
                <OrderReservationCard
                  data={reservationInfo}
                  now={reservationNow}
                  onCancel={
                    onCancelReservation && (reservationInfo.acceptStatus === 'pending' || reservationInfo.acceptStatus === 'accepted')
                      ? () => onCancelReservation(orderId)
                      : undefined
                  }
                  onRebook={onRebookReservation ? () => onRebookReservation(reservationInfo) : undefined}
                />
              )}

              {isFoodFulfillDesignState && (
                <div className="food-fulfill-zone">
                  {/* 场景3：仅在线点单（无券码、无配送）—— 突出卡片样式 */}
                  {foodFulfillCombo === 'O' && (
                    <div className="food-order-only-card">
                      <div className="food-order-only-top">
                        <div>
                          <strong>在线点 到店取</strong>
                          <span>提前点单，到店免排队</span>
                        </div>
                        <span className="food-code-entry">券码信息 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
                      </div>
                      <button className="food-solid-order-btn" type="button">立即点单</button>
                    </div>
                  )}

                  {/* 可到店使用 区块标题（有券码或有配送+点单时显示，作为分组标题） */}
                  {(foodHasCode || foodFulfillCombo === 'OD' || foodFulfillCombo === 'OCD' || foodFulfillCombo === 'CD') && !(foodFulfillCombo === 'C') && (
                    <div className="food-fulfill-section-title">
                      <span className="food-fulfill-icon in-store">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.1 1.7 3.8 3.8 4v9h2.4v-9c2.1-.2 3.8-1.9 3.8-4V2h-2v7zm10-3v9h-2V6h-2V4h6v2z"/></svg>
                      </span>
                      <strong>可到店使用</strong>
                      {foodFulfillCombo === 'OD' && (
                        <span className="food-view-code-link">查看券码 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8B8F99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
                      )}
                    </div>
                  )}

                  {/* 场景6(OD)：仅在线点+配送 —— 单行点单入口（无方式徽章、无二维码） */}
                  {foodFulfillCombo === 'OD' && (
                    <div className="food-fulfill-single-row">
                      <div className="food-method-text">
                        <strong>在线点 到店取</strong>
                        <span>提前点单，到店免排队</span>
                      </div>
                      <button className="food-outline-btn" type="button">立即点单</button>
                    </div>
                  )}

                  {/* 场景2/5(OC/OCD)：方式1 在线点单 + 方式2 到店验券 + 二维码 */}
                  {(foodFulfillCombo === 'OC' || foodFulfillCombo === 'OCD') && (
                    <>
                      <div className="food-fulfill-method-row">
                        <span className="food-method-badge">方式1</span>
                        <div className="food-method-text">
                          <strong>在线点 到店取</strong>
                          <span>提前点单，到店免排队</span>
                        </div>
                        <button className="food-outline-btn" type="button">立即点单</button>
                      </div>
                      <div className="food-fulfill-method-row code-row">
                        <span className="food-method-badge">方式2</span>
                        <div className="food-method-text">
                          <strong>到店验券</strong>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 二维码 + 券号（有券码场景：C/OC/CD/OCD 全部居中显示） */}
                  {foodHasCode && (
                    <div className="food-qr-block">
                      <div className="food-qrcode-box">
                        <svg width="130" height="130" viewBox="0 0 24 24"><path fill="#111" d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13 0h-2v2h2zm-2 2h-2v2h2zm2 2h-2v2h2zm-4 0h-2v2h2zm2 2h-2v2h2zm4-4h2v2h-2zm0 2h-2v2h2z"/></svg>
                      </div>
                      <div className="food-qr-text">券号 9001 1345 653 · <span className="food-copy">复制</span></div>
                    </div>
                  )}

                  {/* 配送区（场景4/5/6：CD/OCD/OD） */}
                  {foodHasDelivery && (
                    <>
                      <div className="food-fulfill-divider" />
                      <div className="food-fulfill-section-title">
                        <span className="food-fulfill-icon delivery">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.7 1.3 3 3 3s3-1.3 3-3h6c0 1.7 1.3 3 3 3s3-1.3 3-3h2v-5l-3-4zM6 18.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm13.5-9 1.9 2.5H17V9.5h2.5zm-1.5 9c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"/></svg>
                        </span>
                        <strong>可预约配送</strong>
                        <span className="food-deadline">{listItem.deliveryDeadlineText}</span>
                      </div>
                      <div className="food-delivery-card">
                        <div className="food-delivery-row">
                          <div className="food-delivery-addr">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#20212B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>{listItem.deliveryAddress || '请选择收货地址'}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B0B4BD" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                          </div>
                          <button className="food-outline-btn" type="button">预约配送</button>
                        </div>
                        <div className="food-delivery-note">{listItem.deliveryNote || '最快30分钟送达·配送费¥1起'}</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isUnredeemed && (!hotelView || displayStatusText === '预约成功' || displayStatusText === '预订成功') && !isFoodFulfillDesignState && (
                <div className="oc-merged-qr">
                  <div className="oc-qrcode-box">
                    <svg width="160" height="160" viewBox="0 0 24 24"><path fill="#111" d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13 0h-2v2h2zm-2 2h-2v2h2zm2 2h-2v2h2zm-4 0h-2v2h2zm2 2h-2v2h2zm4-4h2v2h-2zm0 2h-2v2h2z"/></svg>
                  </div>
                  <div className="oc-qr-text">券号 9001 1345 653 · <span className="oc-copy">复制</span></div>
                </div>
              )}
            </>
          )}
        </div>}

        {isCompleted && !isHotelPresaleDesignState && !isHotelCalendarDesignState && !isScenicGroupBuyDesignState && !isScenicCalendarDesignState && !isScenicPresaleDesignState && !isTravelPresaleDesignState && <ReviewGuideCard />}

        {refundRecord && !isHotelPresaleDesignState && !isScenicGroupBuyDesignState && !isScenicCalendarDesignState && !isScenicPresaleDesignState && !isTravelPresaleDesignState && (
          <div className="oc-refund-record-card">
            <strong>退款({refundRecord.refundQuantity})</strong>
            <div className="oc-refund-record-side">
              <span>查看详情</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        )}

        {isHotelBookingReferenceState && (
          <>
            <div className="hotel-booking-rule-card">
              <div>
                <b>· 入住必读</b>
                <span>办理入住须满足18–55岁 · 不允许携带儿童...</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div>
                <b>· 退款规则</b>
                <span>不约可退 · 过期未约自动退</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>

            <div className="hotel-booking-pay-card">
              <div className="hotel-booking-pay-title">
                <strong>实付金额&nbsp;&nbsp;¥538</strong>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b8f99" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="hotel-booking-pay-row">
                <span>入住信息</span>
                <strong>王胜凯 刘铭心</strong>
                <em>详情</em>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              {displayStatusText === '预约成功' && (
                <div className="hotel-booking-pay-row">
                  <span>确认号</span>
                  <strong>78463233432343 · <i>复制</i></strong>
                </div>
              )}
              <div className="hotel-booking-pay-row">
                <span>订单编号</span>
                <strong>4326784632478463243 · <i>复制</i></strong>
              </div>
              <div className="hotel-booking-pay-row">
                <span>交易快照</span>
                <strong>可作为交易争执的判断依据</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <div className="hotel-booking-pay-row">
                <span>发票说明</span>
                <strong>提供增值税电子普通发票</strong>
                <em>去开票</em>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b4b8c0" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <button type="button">展开更多⌄</button>
            </div>
          </>
        )}

        {/* Store Card */}
        {!isHotelBookingReferenceState && !isHotelPresaleDesignState && !isHotelCalendarDesignState && !isScenicGroupBuyDesignState && !isScenicCalendarDesignState && !isScenicPresaleDesignState && !isTravelPresaleDesignState && <div className="oc-store-card-v3">
          <div className="oc-store-card-header">
            <div className="oc-store-title-v3">适用门店(625)</div>
            <div className="oc-store-all">全部门店 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></div>
          </div>
          <div className="oc-store-card-body">
            <div className="oc-store-logo">M</div>
            <div className="oc-store-main">
              <div className="oc-store-name-v3">{detail.store || '麦当劳(知春路店)'}</div>
              <div className="oc-store-status-v3">营业中 09:00-22:00</div>
              <div className="oc-store-addr-v3">距你488m {detail.storeAddress || '海淀区知春路76号京东大厦F1层102...'}</div>
            </div>
            <div className="oc-store-actions-v3">
              <div className="oc-icon-circle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>
              <div className="oc-icon-circle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
            </div>
          </div>
        </div>}

        {/* Order Info Card */}
        {!isHotelBookingReferenceState && !isHotelPresaleDesignState && !isHotelCalendarDesignState && !isScenicGroupBuyDesignState && !isScenicCalendarDesignState && !isScenicPresaleDesignState && !isTravelPresaleDesignState && <div className="oc-info-card-v3">
          <div className="oc-info-row-v3">
            <span className="oc-info-label-v3">交易快照</span>
            <span className="oc-info-val-v3">可作为交易争执的判断依据</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div className="oc-info-row-v3">
            <span className="oc-info-label-v3">订单详情</span>
            <span className="oc-info-val-v3">订单号:{detail.orderId}·<span className="oc-copy">复制</span></span>
            <span className="oc-info-more">更多 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></span>
          </div>
        </div>}
        
        <DetailRecommendations category={toStandardCategory(listItem.category)} />

        <div style={{height: 100}}></div>
      </div>

      <div className="oc-detail-bottom-bar-v3">
        {isFoodOrFunUnpaid || isHotelPresalePaying || isHotelCalendarPaying || isScenicUnpaid || isScenicCalendarPaying || isScenicPresalePaying || isTravelPresalePaying ? (
          <>
            <div className="oc-pay-footer-amount">
              <span>应付 <strong>¥{isHotelPresalePaying ? hotelPresaleDisplayPrice : payableAmount}</strong></span>
              <em>共优惠¥200 明细⌃</em>
            </div>
            <button className="oc-pay-continue-btn">{(isScenicUnpaid || isScenicCalendarPaying || isScenicPresalePaying || isTravelPresalePaying) ? '去支付' : '继续支付'}</button>
          </>
        ) : (
          <>
            <div className="oc-detail-bb-ai">
              <div className="oc-detail-ai-btn-wrapper">
                {(() => {
                  void reminderVersion;
                  const reminder = getReminderByOrder(orderId);
                  if (!reminder || reminder.status !== 'active') return null;
                  const now = Date.now();
                  const diffMs = reminder.remindAt - now;
                  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                  const bubbleText = formatReminderBubbleText(diffDays);
                  return (
                    <div
                      className="redeem-reminder-bubble clickable"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReminderSheetOpen(true);
                      }}
                    >
                      <span className="bubble-icon">⏰</span>
                      <span className="bubble-text">{bubbleText}</span>
                    </div>
                  );
                })()}
                <button className="oc-detail-ai-btn-v3" onClick={() => onChatWithOrder(displayListItem)}>
                  <AIAssistantIcon size={22} />
                  <span>团小帮</span>
                </button>
              </div>
            </div>
            {isTravelPresaleDesignState && !isTravelPresalePaying && (
              <button className="oc-detail-contact-btn-v3" onClick={() => handleBottomAction('联系商家')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  <path d="M14.05 7.52a4.8 4.8 0 011.43 1.41"/>
                </svg>
                <span>咨询商家</span>
              </button>
            )}
            <div className={`oc-detail-bb-actions ${isHotelBookingReferenceState || isHotelCalendarDesignState ? 'hotel-booking-bottom-actions' : ''}`}>
              {bottomActions.map((action) => (
                <button
                  key={action.label}
                  className={action.type === 'solid' ? 'oc-btn-solid-v3' : 'oc-btn-outline-v3'}
                  disabled={(action as any).disabled}
                  onClick={() => handleBottomAction(action.label)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {hotelOrder && (
        <HotelReservationFlowSheet
          order={listItem}
          open={hotelReserveOpen}
          step={hotelReserveStep}
          now={reservationNow}
          onStepChange={setHotelReserveStep}
          onClose={() => setHotelReserveOpen(false)}
          onComplete={submitHotelReservation}
        />
      )}
      {hotelCancelConfirmOpen && (
        <div className="reservation-confirm-overlay" onClick={() => setHotelCancelConfirmOpen(false)}>
          <div className="reservation-confirm-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="reservation-confirm-title">确认取消预约？</div>
            <div className="reservation-confirm-desc">
              {listItem.hotelProductType === 'calendar_room'
                ? (displayStatusText === '预订确认中' || displayStatusText === '预约确认中'
                    ? '取消后订单将直接退款，钱款原路退回。'
                    : calendarCancelRule === 'free'
                      ? '当前符合免费取消规则，确认后将直接退款。'
                      : '当前取消需等待商家确认，确认同意后钱款原路退回。')
                : '取消后订单将回到待预约状态，可重新选择入住日期并发起预约。'}
            </div>
            <div className="reservation-confirm-actions">
              <button className="reservation-confirm-secondary" onClick={() => setHotelCancelConfirmOpen(false)}>再想想</button>
              <button className="reservation-confirm-primary" onClick={confirmHotelCancelReservation}>确认取消</button>
            </div>
          </div>
        </div>
      )}

      {travelCancelConfirmOpen && (
        <div className="reservation-confirm-overlay" onClick={() => setTravelCancelConfirmOpen(false)}>
          <div className="reservation-confirm-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="reservation-confirm-title">确认取消预约？</div>
            <div className="reservation-confirm-desc">
              {isTravelPresaleConfirming
                ? '确认前可免费取消，取消后订单将回到待预约状态，可重新选择出行日期并发起预约。'
                : '取消后订单将回到待预约状态，可重新选择出行日期并发起预约。'}
            </div>
            <div className="reservation-confirm-actions">
              <button className="reservation-confirm-secondary" onClick={() => setTravelCancelConfirmOpen(false)}>再想想</button>
              <button className="reservation-confirm-primary" onClick={confirmTravelCancelReservation}>确认取消</button>
            </div>
          </div>
        </div>
      )}

      {presaleBookingOpen && (
        <ScenicPresaleBookingFlow
          order={listItem}
          step={presaleBookingStep}
          selectedDate={presaleSelectedDate}
          visitorName={presaleVisitorName}
          visitorPhone={presaleVisitorPhone}
          visitorIdCard={presaleVisitorIdCard}
          errorMsg={presaleBookingError}
          submitting={presaleSubmitting}
          confirmOpen={presaleConfirmOpen}
          now={reservationNow}
          onDateSelect={(iso) => setPresaleSelectedDate(iso)}
          onStepChange={setPresaleBookingStep}
          onNameChange={setPresaleVisitorName}
          onPhoneChange={(v) => setPresaleVisitorPhone(v.replace(/\D/g, '').slice(0, 11))}
          onIdCardChange={(v) => setPresaleVisitorIdCard(v.toUpperCase().replace(/[^\dX]/g, '').slice(0, 18))}
          onNext={handlePresaleNext}
          onClose={closePresaleBooking}
          onConfirm={submitPresaleBooking}
          onCancelConfirm={() => setPresaleConfirmOpen(false)}
        />
      )}

      {travelBookingOpen && isTravelPresaleDesignState && (
        <TravelPresaleBookingFlow
          order={listItem}
          step={travelBookingStep}
          startDate={travelStartDate}
          endDate={travelEndDate}
          travelers={travelTravelers}
          contactPhone={travelContactPhone}
          contactEmail={travelContactEmail}
          errorMsg={travelBookingError}
          submitting={travelBookingSubmitting}
          confirmOpen={travelConfirmOpen}
          now={reservationNow}
          onStartDateSelect={(iso) => {
            setTravelStartDate(iso);
            setTravelEndDate(calculateEndDate(iso, tripDays));
          }}
          onTravelerChange={(idx, field, val) => {
            setTravelTravelers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: val } : t));
          }}
          onContactPhoneChange={(v) => setTravelContactPhone(v)}
          onContactEmailChange={(v) => setTravelContactEmail(v)}
          onStepChange={setTravelBookingStep}
          onNext={handleTravelNext}
          onClose={closeTravelBooking}
          onConfirm={submitTravelBooking}
          onCancelConfirm={() => setTravelConfirmOpen(false)}
        />
      )}

      <ReminderSettingSheet
        open={reminderSheetOpen}
        validDate={detail?.productRules?.validDate}
        productName={listItem?.product}
        hasActiveReminder={(() => {
          const reminder = getReminderByOrder(orderId);
          return reminder?.status === 'active';
        })()}
        initialDays={(() => {
          const reminder = getReminderByOrder(orderId);
          if (reminder && reminder.status === 'active') {
            const now = Date.now();
            const diffMs = reminder.remindAt - now;
            return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          }
          return undefined;
        })()}
        onClose={() => {
          setReminderSheetOpen(false);
          setReminderVersion(v => v + 1);
        }}
        onConfirm={(days) => {
          const remindAt = Date.now() + days * 24 * 60 * 60 * 1000;
          setReminder(orderId, remindAt);
        }}
        onCancel={() => {
          cancelReminder(orderId);
        }}
      />

    </div>
  );
}

// ============================================================================
// OrderCenter Main List View
// ============================================================================

export default function OrderCenter({
  onChatWithOrder,
  reservationsByOrder = {},
  onCancelReservation,
  onRebookReservation,
  reservationNow,
  initialDetailOrder,
  onInitialDetailConsumed,
}: {
  onChatWithOrder: (payload: string | OrderListItem) => void;
  reservationsByOrder?: Record<string, ReservationInfoCardData>;
  onCancelReservation?: (orderId?: string) => void;
  onRebookReservation?: (reservation: ReservationInfoCardData) => void;
  reservationNow: number;
  initialDetailOrder?: OrderListItem | null;
  onInitialDetailConsumed?: () => void;
}) {
  const { hasUnread } = useAiAssistantContext();
  const storedPositionRef = useRef<OrderListPositionSnapshot | null>(
    typeof window === 'undefined' ? null : readOrderListPositionSnapshot(window.sessionStorage),
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const restoreFrameRef = useRef<number | null>(null);
  const initialFilter = storedPositionRef.current?.filter as 'all' | 'unpaid' | 'unredeemed' | 'unreviewed' | 'refunded' | undefined;
  const [view, setView] = useState<'list' | 'detail'>(initialDetailOrder ? 'detail' : 'list');
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(initialDetailOrder ?? null);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'unredeemed' | 'unreviewed' | 'refunded'>(initialFilter ?? 'unredeemed');

  const filteredOrders = useMemo(() => {
    return ORDER_LIST.filter(order => {
      if (order.category === 'show') return false;
      const text = order.statusText;
      if (filter === 'all') return true;
      if (filter === 'unpaid') return text === '待支付';
      if (filter === 'unredeemed') {
        return ['待使用', '待预约', '预约确认中', '预约成功', '预订确认中', '预订成功'].includes(text);
      }
      if (filter === 'unreviewed') return text === '交易完成';
      if (filter === 'refunded') return ['退款成功', '退款申请中', '退款失败'].includes(text);
      return true;
    });
  }, [filter]);

  useEffect(() => {
    if (!initialDetailOrder) return;
    setSelectedOrder(initialDetailOrder);
    setView('detail');
    onInitialDetailConsumed?.();
  }, [initialDetailOrder, onInitialDetailConsumed]);

  useEffect(() => {
    if (view !== 'list' || !listRef.current) return;
    const target = resolveOrderListRestoreTarget({
      snapshot: storedPositionRef.current,
      orders: filteredOrders,
      filter,
    });
    if (!target) return;

    if (restoreFrameRef.current !== null) {
      cancelAnimationFrame(restoreFrameRef.current);
    }
    restoreFrameRef.current = requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      list.scrollTop = target.scrollTop;
      const selector = target.orderId
        ? `[data-order-id="${target.orderId}"]`
        : `[data-order-index="${target.index}"]`;
      list.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: 'nearest' });
      restoreFrameRef.current = null;
    });

    return () => {
      if (restoreFrameRef.current !== null) {
        cancelAnimationFrame(restoreFrameRef.current);
        restoreFrameRef.current = null;
      }
    };
  }, [filter, filteredOrders, view]);

  const openOrderDetail = (order: OrderListItem, index: number) => {
    const snapshot = createOrderListPositionSnapshot({
      filter,
      orders: filteredOrders,
      orderId: order.orderId,
      index,
      scrollTop: listRef.current?.scrollTop ?? 0,
    });
    storedPositionRef.current = snapshot;
    if (typeof window !== 'undefined') {
      writeOrderListPositionSnapshot(window.sessionStorage, snapshot);
    }
    setSelectedOrder(order);
    setView('detail');
  };

  if (view === 'detail' && selectedOrder) {
    return (
      <OrderDetail
        orderId={selectedOrder.orderId}
        onBack={() => setView('list')}
        onChatWithOrder={onChatWithOrder}
        reservationInfo={reservationsByOrder[selectedOrder.orderId]}
        reservationNow={reservationNow}
        onCancelReservation={onCancelReservation}
        onRebookReservation={onRebookReservation}
      />
    );
  }

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'unpaid', label: '待支付' },
    { key: 'unredeemed', label: '待使用', count: ORDER_LIST.filter(o => o.category !== 'show' && ['待使用', '待预约', '预约确认中', '预约成功', '预订确认中', '预订成功'].includes(o.statusText)).length },
    { key: 'unreviewed', label: '待评价' },
    { key: 'refunded', label: '退款' },
  ];

  return (
    <div className="order-center-main list-view">
      <div className="oc-header-v2">
        <div className="oc-header-top">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" style={{cursor: 'pointer'}} onClick={() => {}}><path d="M15 18l-6-6 6-6"/></svg>
          <div className="oc-search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="搜索团购/外卖订单" />
          </div>
          <div className="oc-header-icons">
            {/* AI 助手入口 Icon */}
            <div className="oc-list-ai-btn" style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}} onClick={() => onChatWithOrder('')}>
              <AIAssistantIcon size={22} />
              {hasUnread && <span className="ai-entry-red-dot" />}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
          </div>
        </div>
        <div className="oc-tabs-v2">
          {tabs.map(tab => (
            <button 
              key={tab.key}
              className={`oc-tab-v2 ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key as any)}
              style={{ position: 'relative' }}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="oc-tab-badge">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="oc-list-v2" ref={listRef}>
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order, index) => (
            <div
              key={order.orderId}
              className="oc-card-v2"
              data-order-id={order.orderId}
              data-order-index={index}
              onClick={() => openOrderDetail(order, index)}
            >
              <div className="oc-card-head-v2">
                <div className="oc-card-merchant-v2">
                  {order.merchant}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                {(() => {
                  const disp = getDisplayCategory(order.category);
                  return <span className={`uoc-cat-tag uoc-cat-${disp.colorKey}`}>{disp.label}</span>;
                })()}
                <div className={`oc-card-status-v2 status-${order.statusColor}`}>{order.statusText}</div>
              </div>
              <div className="oc-card-body-v2">
                <div className="oc-card-thumb-v2">{order.thumbnail}</div>
                <div className="oc-card-info-v2">
                  <div className="oc-card-info-top">
                    <div className="oc-card-title-v2">
                      <span className="oc-product-name">{order.product}</span>
                      {(() => {
                        const stdCat = toStandardCategory(order.category);
                        const typeLabel = stdCat === 'scenic' && order.scenicProductType
                          ? (order.scenicProductType === 'group_buy' ? '团购票' : order.scenicProductType === 'calendar_ticket' ? '日历票' : '预售券')
                          : stdCat === 'hotel' && order.hotelProductType
                            ? (order.hotelProductType === 'calendar_room' ? '日历房' : '预售券')
                            : stdCat === 'travel' && order.travelProductType
                              ? '预售券'
                              : '';
                        if (!typeLabel) return null;
                        return <span className="oc-product-type-tag">{typeLabel}</span>;
                      })()}
                    </div>
                    <div className="oc-card-price-v2">¥{(order.price / 100).toFixed(2)}</div>
                  </div>
                  <div className="oc-card-tags-row">
                    <div className="oc-card-tags-v2">
                      {(() => {
                        const defaultProductRules = {
                          validDate: '2026-06-25 至 2026-07-25',
                          notice: ['周一至周日可用', '过期自动退', '免预约'],
                          refundRule: '过期自动退',
                        };
                        const effectiveRules = order.productRules ?? defaultProductRules;
                        const tags = buildNoticeTags({ productRules: effectiveRules, category: order.category });
                        return tags.slice(0, 3).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ));
                      })()}
                      {(() => {
                        const stdCat = toStandardCategory(order.category);
                        if (stdCat !== 'food' || order.statusText !== '待使用' || !order.fulfillmentModes) return null;
                        const fm = order.fulfillmentModes;
                        const labels: Array<{k: string; t: string}> = [];
                        if (fm.includes('code')) labels.push({k: 'code', t: '到店验券'});
                        if (fm.includes('order')) labels.push({k: 'order', t: '在线点单'});
                        if (fm.includes('delivery')) labels.push({k: 'delivery', t: '预约配送'});
                        return labels.map(l => <span key={l.k} className={`food-fulfill-list-tag food-ff-${l.k}`}>{l.t}</span>);
                      })()}
                    </div>
                    <div className="oc-card-count-v2">共1件</div>
                  </div>
                </div>
              </div>
              <div className="oc-card-foot-v2">
                <button className="oc-btn-v2" onClick={(e) => { e.stopPropagation(); }}>再来一单</button>
                <button className="oc-btn-v2" onClick={(e) => { e.stopPropagation(); onChatWithOrder(order.orderId); }}>去使用</button>
              </div>
            </div>
          ))
        ) : (
          <div className="oc-empty">暂无相关订单</div>
        )}
      </div>
    </div>
  );
}
