import type { IntentType } from './types';

const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  reservation: [
    '预约', '帮我约', '立即预约', '马上预约', '订座', '订位', '预定',
    '约一下', '约个时间', '帮我订', '我要预约', '可以预约吗',
  ],
  reminder: [
    '提醒', '设置提醒', '帮我提醒', '别忘了', '到期提醒',
    '提醒我', '记得提醒', '过期提醒', '使用提醒', '设个提醒',
  ],
  pickup_code: [
    '取餐码', '取餐', '取号', '号码', '凭号', '取餐号',
    '我的取餐码', '查看取餐码', '取餐码在哪', '怎么取餐',
  ],
  delivery: [
    '配送', '物流', '骑手', '外卖', '送到哪了', '什么时候到',
    '配送进度', '还有多久', '怎么还没到', '外卖到哪了',
    '送到哪', '多久到', '送来了吗', '配送状态',
  ],
  greeting: [
    '你好', '您好', 'hi', 'hello', '在吗', '在不在',
    '你好呀', '您好呀', '嗨', '哈喽',
  ],
  cancel: [
    '取消', '算了', '不用了', '不要了', '取消吧', '算了吧',
    '停止', '退出', '返回',
  ],
  unknown: [],
};

export function recognizeIntent(message: string): IntentType {
  const lowerMessage = message.toLowerCase().trim();

  const intentScores: Array<{ intent: IntentType; score: number }> = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'unknown') continue;

    let score = 0;
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }

    if (score > 0) {
      intentScores.push({ intent: intent as IntentType, score });
    }
  }

  if (intentScores.length === 0) {
    return 'unknown';
  }

  intentScores.sort((a, b) => b.score - a.score);
  return intentScores[0].intent;
}

export function isCancelIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  return INTENT_KEYWORDS.cancel.some(kw => lowerMessage.includes(kw.toLowerCase()));
}

export function isAffirmative(message: string): boolean {
  const affirmativeWords = [
    '是', '好', '对', '嗯', '可以', '行', '没问题', '好的',
    '确认', '确定', 'ok', 'OK', 'yes', 'YES', 'yeah',
  ];
  const lowerMessage = message.toLowerCase().trim();
  return affirmativeWords.some(word => lowerMessage.includes(word.toLowerCase()));
}

export function isNegative(message: string): boolean {
  const negativeWords = [
    '不', '不是', '不对', '不行', '不要', '不用', '算了',
    'no', 'NO', 'nope', '否', '拒绝',
  ];
  const lowerMessage = message.toLowerCase().trim();
  return negativeWords.some(word => lowerMessage.includes(word.toLowerCase()));
}
