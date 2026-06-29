import {
  resolveCategory,
  getCategoryName,
  getCategoryConfig,
  isProductTypeSupported,
  getSupportedProductTypes,
  getCategoryAliases,
  getSubCategories,
  getAllStandardCategories,
  validateMappingConflicts,
  findUnmappedLegacyKeys,
  fromLegacyCategory,
  getProductTypeLabel,
  CATEGORY_MAPPING_TABLE,
  LEGACY_ORDER_CATEGORIES,
  generateMappingTableMarkdown,
} from './src/categoryMapping';
import {
  toStandardCategory,
  getStandardCategoryName,
  legacyToStandard,
  CATEGORY_LABEL,
} from './src/types';
import type { StandardCategory } from './src/categoryMapping';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    const msg = detail ? `${name} — ${detail}` : name;
    failures.push(msg);
    console.log(`  ❌ ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, name: string) {
  const ok = actual === expected;
  assert(ok, name, ok ? undefined : `期望 ${JSON.stringify(expected)}, 实际 ${JSON.stringify(actual)}`);
}

function section(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ================================================================
// 1. 标准类目基础校验
// ================================================================
section('1. 标准类目基础校验');

const expectedCategories: StandardCategory[] = ['food', 'hotel', 'scenic', 'travel', 'transport', 'general'];
const allCats = getAllStandardCategories();
assertEqual(allCats.length, 6, '应有且仅有6个标准一级类目');
for (const cat of expectedCategories) {
  assert(allCats.includes(cat), `包含标准类目: ${cat}`);
}

for (const cat of expectedCategories) {
  const config = getCategoryConfig(cat);
  assert(!!config, `getCategoryConfig('${cat}') 能获取配置`);
  assertEqual(config.key, cat, `配置 key 与请求一致: ${cat}`);
  assert(config.name.length > 0, `${cat} 有中文名称`);
  assert(config.aliases.length > 0, `${cat} 有别名列表`);
  assert(config.supportedProductTypes.length > 0, `${cat} 声明了支持的商品类型`);
}

// ================================================================
// 2. 别名 → 标准类目 映射测试
// ================================================================
section('2. 别名解析测试');

const aliasTests: [string, StandardCategory][] = [
  ['餐饮', 'food'],
  ['美食', 'food'],
  ['餐饮美食', 'food'],
  ['住宿', 'hotel'],
  ['酒店', 'hotel'],
  ['住宿酒店', 'hotel'],
  ['酒店住宿', 'hotel'],
  ['游玩', 'scenic'],
  ['景区', 'scenic'],
  ['游玩景区', 'scenic'],
  ['景区游玩', 'scenic'],
  ['旅行社', 'travel'],
  ['旅行', 'travel'],
  ['交通', 'transport'],
  ['大交通', 'transport'],
  ['综合', 'general'],
  ['休闲娱乐', 'general'],
  ['演出', 'general'],
  ['度假', 'general'],
];

for (const [input, expected] of aliasTests) {
  assertEqual(resolveCategory(input), expected, `别名 "${input}" → ${expected}`);
}

// ================================================================
// 3. 中文名称自身解析
// ================================================================
section('3. 标准类目中文名称自解析');

const nameMap: [StandardCategory, string][] = [
  ['food', '餐饮'],
  ['hotel', '酒店'],
  ['scenic', '景区'],
  ['travel', '旅行社'],
  ['transport', '大交通'],
  ['general', '综合'],
];

for (const [key, name] of nameMap) {
  assertEqual(resolveCategory(name), key, `"${name}" 解析为 ${key}`);
  assertEqual(getCategoryName(key), name, `getCategoryName('${key}') = "${name}"`);
}

// ================================================================
// 4. 旧枚举值兼容测试
// ================================================================
section('4. 旧枚举值兼容映射');

const legacyTests: [string, StandardCategory][] = [
  ['food', 'food'],
  ['fun', 'general'],
  ['play', 'scenic'],
  ['hotel', 'hotel'],
  ['travel', 'travel'],
  ['vacation', 'general'],
  ['show', 'general'],
  ['scenic', 'scenic'],
  ['general', 'general'],
];

for (const [legacy, expected] of legacyTests) {
  assertEqual(fromLegacyCategory(legacy), expected, `旧枚举 "${legacy}" → ${expected}`);
  assertEqual(legacyToStandard(legacy), expected, `legacyToStandard("${legacy}") → ${expected}`);
  assertEqual(toStandardCategory(legacy), expected, `toStandardCategory("${legacy}") → ${expected}`);
}

// ================================================================
// 5. 边界情况：null/undefined/空字符串/未知值
// ================================================================
section('5. 边界情况处理');

assertEqual(resolveCategory(null as any), 'general', 'null → general(兜底)');
assertEqual(resolveCategory(undefined as any), 'general', 'undefined → general(兜底)');
assertEqual(resolveCategory(''), 'general', '空字符串 → general(兜底)');
assertEqual(resolveCategory('未知类目XYZ'), 'general', '未知值 → general(兜底)');

assertEqual(toStandardCategory(null as any), 'general', 'toStandardCategory(null) → general');
assertEqual(toStandardCategory(undefined as any), 'general', 'toStandardCategory(undefined) → general');
assertEqual(toStandardCategory(''), 'general', 'toStandardCategory("") → general');
assertEqual(toStandardCategory('xyz'), 'general', 'toStandardCategory("xyz") → general');

// ================================================================
// 6. 商品类型支持测试
// ================================================================
section('6. 商品类型支持校验');

const productTypeTests: [StandardCategory, string, boolean][] = [
  ['food', 'group_buy', true],
  ['food', 'multi_card', true],
  ['food', 'voucher', true],
  ['food', 'presale_voucher', false],
  ['food', 'calendar_room', false],
  ['food', 'calendar_ticket', false],
  ['hotel', 'presale_voucher', true],
  ['hotel', 'calendar_room', true],
  ['hotel', 'group_buy', false],
  ['hotel', 'calendar_ticket', false],
  ['scenic', 'group_buy', true],
  ['scenic', 'calendar_ticket', true],
  ['scenic', 'presale_voucher', true],
  ['scenic', 'calendar_room', false],
  ['travel', 'presale_voucher', true],
  ['travel', 'group_buy', false],
  ['travel', 'calendar_room', false],
  ['transport', 'group_buy', true],
  ['transport', 'multi_card', true],
  ['transport', 'voucher', true],
  ['transport', 'presale_voucher', true],
  ['transport', 'calendar_room', false],
  ['transport', 'calendar_ticket', false],
  ['general', 'group_buy', true],
  ['general', 'multi_card', true],
  ['general', 'voucher', true],
  ['general', 'presale_voucher', false],
  ['general', 'calendar_room', false],
];

for (const [cat, pt, expected] of productTypeTests) {
  const result = isProductTypeSupported(cat, pt as any);
  assertEqual(result, expected, `${cat} ${pt} 支持=${expected}`);
}

// ================================================================
// 7. 商品类型中文标签
// ================================================================
section('7. 商品类型中文标签');

const ptLabels: [string, string][] = [
  ['group_buy', '团购'],
  ['multi_card', '次卡'],
  ['voucher', '代金券'],
  ['presale_voucher', '预售券'],
  ['calendar_room', '日历房'],
  ['calendar_ticket', '日历票'],
];
for (const [key, label] of ptLabels) {
  assertEqual(getProductTypeLabel(key as any), label, `${key} → "${label}"`);
}

// ================================================================
// 8. 二级类目校验
// ================================================================
section('8. 二级类目结构');

const subCategoryTests: [StandardCategory, number][] = [
  ['food', 2],
  ['hotel', 2],
  ['scenic', 3],
  ['travel', 1],
  ['transport', 2],
  ['general', 4],
];
for (const [cat, expectedCount] of subCategoryTests) {
  const subs = getSubCategories(cat);
  assertEqual(subs.length, expectedCount, `${cat} 有 ${expectedCount} 个二级类目`);
}

const foodSubs = getSubCategories('food');
const lightMeal = foodSubs.find(s => s.key === 'light_meal');
assert(!!lightMeal, '餐饮包含轻餐二级类目');
assert((lightMeal as any)?.children?.length === 2, '轻餐下有2个细分(饮品/快餐)');

// ================================================================
// 9. 别名冲突校验
// ================================================================
section('9. 别名冲突检测');

const conflicts = validateMappingConflicts();
assertEqual(conflicts.length, 0, `无别名冲突 (发现 ${conflicts.length} 个冲突)`);
if (conflicts.length > 0) {
  for (const c of conflicts) {
    console.log(`  ⚠️  别名 "${c.alias}" 冲突于: ${c.conflicts.join(', ')}`);
  }
}

// ================================================================
// 10. 旧枚举值全部映射（无遗漏）
// ================================================================
section('10. 旧枚举值全覆盖检查');

const unmapped = findUnmappedLegacyKeys(LEGACY_ORDER_CATEGORIES as unknown as string[]);
assertEqual(unmapped.length, 0, `所有旧枚举值均已映射 (未映射: ${unmapped.join(', ') || '无'})`);

// ================================================================
// 11. 别名列表完整性
// ================================================================
section('11. 别名列表内容校验');

for (const cat of expectedCategories) {
  const aliases = getCategoryAliases(cat);
  assert(aliases.length >= 2, `${cat} 至少有2个别名`);
  for (const alias of aliases) {
    assert(alias.length > 0, `${cat} 别名不为空字符串`);
  }
}

// ================================================================
// 12. getSupportedProductTypes 返回值校验
// ================================================================
section('12. getSupportedProductTypes 返回值');

for (const cat of expectedCategories) {
  const types = getSupportedProductTypes(cat);
  assert(types.length > 0, `${cat} 支持至少1种商品类型`);
  for (const pt of types) {
    assert(isProductTypeSupported(cat, pt), `${cat} 的支持列表中 ${pt} 校验一致`);
  }
}

// ================================================================
// 13. CATEGORY_LABEL（types.ts 兼容层）校验
// ================================================================
section('13. CATEGORY_LABEL 兼容层校验');

const expectedLabels: Record<string, string> = {
  food: '餐饮',
  fun: '休闲娱乐',
  play: '景区',
  hotel: '酒店',
  travel: '旅行社',
  vacation: '度假',
  show: '演出',
  scenic: '景区',
  general: '综合',
};
for (const [key, label] of Object.entries(expectedLabels)) {
  assertEqual(CATEGORY_LABEL[key as keyof typeof CATEGORY_LABEL], label, `CATEGORY_LABEL.${key} = "${label}"`);
}

// ================================================================
// 14. 模拟真实业务场景：从订单数据推断标准类目
// ================================================================
section('14. 业务场景模拟');

interface MockOrder {
  orderId: string;
  merchant: string;
  rawCategory: string;
  expectedStd: StandardCategory;
  scenario: string;
}

const mockOrders: MockOrder[] = [
  { orderId: 'F001', merchant: '海底捞火锅', rawCategory: 'food', expectedStd: 'food', scenario: '餐饮-正餐订单' },
  { orderId: 'F002', merchant: '瑞幸咖啡', rawCategory: 'food', expectedStd: 'food', scenario: '餐饮-饮品(轻餐)' },
  { orderId: 'FN01', merchant: '桌游馆', rawCategory: 'fun', expectedStd: 'general', scenario: '休闲娱乐归入综合' },
  { orderId: 'H001', merchant: '希尔顿酒店', rawCategory: 'hotel', expectedStd: 'hotel', scenario: '酒店预售券/日历房' },
  { orderId: 'P001', merchant: '迪士尼乐园', rawCategory: 'play', expectedStd: 'scenic', scenario: '游玩归入景区' },
  { orderId: 'S001', merchant: '故宫博物院', rawCategory: 'scenic', expectedStd: 'scenic', scenario: '景区直接匹配' },
  { orderId: 'T001', merchant: '中国国旅', rawCategory: 'travel', expectedStd: 'travel', scenario: '旅行社订单' },
  { orderId: 'V001', merchant: '三亚度假村', rawCategory: 'vacation', expectedStd: 'general', scenario: '度假归入综合' },
  { orderId: 'SH01', merchant: '国家大剧院', rawCategory: 'show', expectedStd: 'general', scenario: '演出归入综合' },
  { orderId: 'G001', merchant: '生活服务超市', rawCategory: 'general', expectedStd: 'general', scenario: '综合类订单' },
];

for (const order of mockOrders) {
  const std = toStandardCategory(order.rawCategory);
  assertEqual(std, order.expectedStd, `[${order.scenario}] ${order.merchant}(${order.rawCategory}) → ${order.expectedStd}`);
}

// ================================================================
// 15. 输出映射关系总表（Markdown）
// ================================================================
section('15. 映射关系总表预览');
console.log(generateMappingTableMarkdown());

// ================================================================
// 总结
// ================================================================
console.log('\n' + '='.repeat(60));
console.log('  测试总结');
console.log('='.repeat(60));
console.log(`  通过: ${passed}`);
console.log(`  失败: ${failed}`);
if (failures.length > 0) {
  console.log('\n  失败详情:');
  for (const f of failures) {
    console.log(`    - ${f}`);
  }
} else {
  console.log('\n  🎉 所有测试用例全部通过！');
}
console.log('='.repeat(60));

if (typeof process !== 'undefined') {
  process.exit(failed > 0 ? 1 : 0);
}
