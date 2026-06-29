/**
 * ============================================================================
 * 统一行业类目归属映射关系体系
 * Unified Industry Category Mapping System
 * ============================================================================
 *
 * 本文件定义了生活服务订单的统一类目映射体系，包含：
 * 1. 标准一级类目（6个）
 * 2. 一级类目别名 → 标准类目 的映射
 * 3. 二级子类目层级
 * 4. 各类目支持的商品类型
 * 5. 旧类目枚举值 → 新标准类目 的兼容映射
 *
 * 设计原则：
 * - 所有别名/历史枚举值 → 唯一标准一级类目（一对多映射）
 * - 二级类目作为一级类目的细分，保留层级结构
 * - 每个标准类目明确声明支持的商品类型范围
 * - 向下兼容：原有 OrderCategory 枚举值均可找到对应归属
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 标准一级类目标识 */
export type StandardCategory =
  | 'food'       // 餐饮
  | 'hotel'      // 酒店
  | 'scenic'     // 景区
  | 'travel'     // 旅行社
  | 'transport'  // 大交通
  | 'general';   // 综合

/** 标准一级类目中文名称 */
export type StandardCategoryName =
  | '餐饮'
  | '酒店'
  | '景区'
  | '旅行社'
  | '大交通'
  | '综合';

/** 二级子类目 */
export type SubCategory =
  // 餐饮二级
  | 'formal_meal'   // 正餐
  | 'light_meal'    // 轻餐（含饮品、快餐）
  // 轻餐细分
  | 'drink'         // 饮品
  | 'fast_food'     // 快餐
  // 酒店二级
  | 'presale_voucher_hotel' // 酒店预售券
  | 'calendar_room'         // 日历房
  // 景区二级
  | 'group_ticket'          // 团购票
  | 'calendar_ticket'       // 日历票
  | 'scenic_presale'        // 景区预售券
  // 旅行社二级
  | 'travel_presale'        // 旅行社预售券
  // 大交通二级
  | 'airline'               // 航司
  | 'other_transport'       // 其他交通
  // 综合二级
  | 'fun'                   // 休闲娱乐
  | 'show'                  // 演出
  | 'vacation'              // 度假
  | 'other_general';        // 其他综合

/** 商品类型 */
export type ProductType =
  | 'group_buy'      // 团购
  | 'multi_card'     // 次卡
  | 'voucher'        // 代金券
  | 'presale_voucher'// 预售券
  | 'calendar_room'  // 日历房
  | 'calendar_ticket';// 日历票

/** 单个类目配置 */
export interface CategoryConfig {
  /** 标准类目键 */
  key: StandardCategory;
  /** 标准类目中文名称 */
  name: StandardCategoryName;
  /** 别名列表（所有可映射到此类目的名称） */
  aliases: readonly string[];
  /** 二级子类目列表 */
  subCategories: readonly {
    key: SubCategory;
    name: string;
    /** 二级类目的细分 */
    children?: readonly {
      key: SubCategory;
      name: string;
    }[];
  }[];
  /** 支持的商品类型 */
  supportedProductTypes: readonly ProductType[];
  /** 旧类目枚举值映射（兼容历史数据） */
  legacyKeys: readonly string[];
}

// ============================================================================
// 一级类目映射关系表
// ============================================================================

/**
 * 映射关系总表
 * 维度：标准类目名称 | 别名列表 | 二级类目 | 支持商品类型
 */
export const CATEGORY_MAPPING_TABLE: readonly CategoryConfig[] = [
  {
    key: 'food',
    name: '餐饮',
    aliases: ['餐饮', '美食', '餐饮美食'] as const,
    subCategories: [
      {
        key: 'formal_meal',
        name: '正餐',
      },
      {
        key: 'light_meal',
        name: '轻餐',
        children: [
          { key: 'drink', name: '饮品' },
          { key: 'fast_food', name: '快餐' },
        ],
      },
    ] as const,
    supportedProductTypes: ['group_buy', 'multi_card', 'voucher'] as const,
    legacyKeys: ['food'] as const,
  },
  {
    key: 'hotel',
    name: '酒店',
    aliases: ['住宿', '酒店', '住宿酒店', '酒店住宿'] as const,
    subCategories: [
      { key: 'presale_voucher_hotel', name: '预售券' },
      { key: 'calendar_room', name: '日历房' },
    ] as const,
    supportedProductTypes: ['presale_voucher', 'calendar_room'] as const,
    legacyKeys: ['hotel'] as const,
  },
  {
    key: 'scenic',
    name: '景区',
    aliases: ['游玩', '景区', '游玩景区', '景区游玩'] as const,
    subCategories: [
      { key: 'group_ticket', name: '团购票' },
      { key: 'calendar_ticket', name: '日历票' },
      { key: 'scenic_presale', name: '预售券' },
    ] as const,
    supportedProductTypes: ['group_buy', 'calendar_ticket', 'presale_voucher'] as const,
    legacyKeys: ['play', 'scenic'] as const,
  },
  {
    key: 'travel',
    name: '旅行社',
    aliases: ['旅行社', '旅行'] as const,
    subCategories: [
      { key: 'travel_presale', name: '预售券' },
    ] as const,
    supportedProductTypes: ['presale_voucher'] as const,
    legacyKeys: ['travel'] as const,
  },
  {
    key: 'transport',
    name: '大交通',
    aliases: ['交通', '大交通'] as const,
    subCategories: [
      { key: 'airline', name: '航司' },
      { key: 'other_transport', name: '其他交通' },
    ] as const,
    supportedProductTypes: ['group_buy', 'multi_card', 'voucher', 'presale_voucher'] as const,
    legacyKeys: [] as const,
  },
  {
    key: 'general',
    name: '综合',
    aliases: ['综合', '休闲娱乐', '演出', '度假'] as const,
    subCategories: [
      { key: 'fun', name: '休闲娱乐' },
      { key: 'show', name: '演出' },
      { key: 'vacation', name: '度假' },
      { key: 'other_general', name: '其他' },
    ] as const,
    supportedProductTypes: ['group_buy', 'multi_card', 'voucher'] as const,
    legacyKeys: ['fun', 'show', 'vacation', 'general'] as const,
  },
] as const;

// ============================================================================
// 查找索引（构建内部使用的快速查找表）
// ============================================================================

/** 别名 → 标准类目键 的映射 */
const aliasMap: ReadonlyMap<string, StandardCategory> = (() => {
  const map = new Map<string, StandardCategory>();
  for (const cat of CATEGORY_MAPPING_TABLE) {
    for (const alias of cat.aliases) {
      map.set(alias, cat.key);
    }
    // 中文名称本身也作为别名
    map.set(cat.name, cat.key);
  }
  return map;
})();

/** 旧类目枚举 → 标准类目键 的映射 */
const legacyKeyMap: ReadonlyMap<string, StandardCategory> = (() => {
  const map = new Map<string, StandardCategory>();
  for (const cat of CATEGORY_MAPPING_TABLE) {
    for (const legacy of cat.legacyKeys) {
      map.set(legacy, cat.key);
    }
  }
  return map;
})();

/** 标准类目键 → 类目配置 的映射 */
const keyMap: ReadonlyMap<StandardCategory, CategoryConfig> = (() => {
  const map = new Map<StandardCategory, CategoryConfig>();
  for (const cat of CATEGORY_MAPPING_TABLE) {
    map.set(cat.key, cat);
  }
  return map;
})();

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据别名/中文名称/旧枚举值解析为标准一级类目
 * @param input 待解析的类目字符串（别名、中文名、或旧枚举值）
 * @returns 标准类目键，若无法匹配则返回 'general'（综合）作为兜底
 */
export function resolveCategory(input: string | null | undefined): StandardCategory {
  if (!input) return 'general';
  const trimmed = String(input).trim();
  // 先直接匹配标准类目 key
  if (keyMap.has(trimmed as StandardCategory)) return trimmed as StandardCategory;
  // 再匹配别名
  const byAlias = aliasMap.get(trimmed);
  if (byAlias) return byAlias;
  // 再匹配旧枚举值
  const byLegacy = legacyKeyMap.get(trimmed);
  if (byLegacy) return byLegacy;
  // 兜底为综合
  return 'general';
}

/**
 * 获取标准类目的中文名称
 */
export function getCategoryName(key: StandardCategory): StandardCategoryName {
  return keyMap.get(key)?.name ?? '综合';
}

/**
 * 获取标准类目的完整配置
 */
export function getCategoryConfig(key: StandardCategory): CategoryConfig {
  return keyMap.get(key) ?? keyMap.get('general')!;
}

/**
 * 判断某个类目是否支持指定商品类型
 */
export function isProductTypeSupported(
  category: StandardCategory,
  productType: ProductType,
): boolean {
  const config = keyMap.get(category);
  if (!config) return false;
  return config.supportedProductTypes.includes(productType);
}

/**
 * 获取某个类目支持的所有商品类型
 */
export function getSupportedProductTypes(category: StandardCategory): CategoryConfig['supportedProductTypes'] {
  return keyMap.get(category)?.supportedProductTypes ?? [];
}

/**
 * 获取某个类目的别名列表
 */
export function getCategoryAliases(key: StandardCategory): CategoryConfig['aliases'] {
  return keyMap.get(key)?.aliases ?? [];
}

/**
 * 获取某个类目的二级子类目
 */
export function getSubCategories(key: StandardCategory): CategoryConfig['subCategories'] {
  return keyMap.get(key)?.subCategories ?? [];
}

/**
 * 获取所有标准类目键列表
 */
export function getAllStandardCategories(): readonly StandardCategory[] {
  return CATEGORY_MAPPING_TABLE.map(c => c.key);
}

/**
 * 校验映射规则：检查是否有别名冲突
 * @returns 冲突列表，空数组表示无冲突
 */
export function validateMappingConflicts(): {
  alias: string;
  conflicts: StandardCategory[];
}[] {
  const seen = new Map<string, StandardCategory>();
  const conflicts: { alias: string; conflicts: StandardCategory[] }[] = [];

  for (const cat of CATEGORY_MAPPING_TABLE) {
    for (const alias of [...cat.aliases, cat.name]) {
      const existing = seen.get(alias);
      if (existing && existing !== cat.key) {
        conflicts.push({ alias, conflicts: [existing, cat.key] });
      } else {
        seen.set(alias, cat.key);
      }
    }
  }

  return conflicts;
}

/**
 * 校验旧枚举值是否全部映射（无遗漏）
 * @param allLegacyKeys 系统中所有使用过的旧类目枚举值
 * @returns 未映射的旧类目列表
 */
export function findUnmappedLegacyKeys(allLegacyKeys: readonly string[]): string[] {
  return allLegacyKeys.filter(k => !legacyKeyMap.has(k));
}

// ============================================================================
// 旧系统兼容：旧 OrderCategory 到新 StandardCategory 的映射
// ============================================================================

/**
 * 旧版 OrderCategory 枚举值列表（用于校验无遗漏）
 * 对应 types.ts 中的 OrderCategory（不含 'all'）
 */
export const LEGACY_ORDER_CATEGORIES = [
  'food', 'fun', 'travel', 'hotel', 'play', 'vacation', 'show', 'scenic', 'general', 'transport',
] as const;

/**
 * 将旧版 OrderCategory 转换为新的 StandardCategory
 * 确保所有旧类目都能找到对应的标准归属
 */
export function fromLegacyCategory(legacy: string): StandardCategory {
  return resolveCategory(legacy);
}

/** 二级类目中文名称映射（用于标签显示） */
const SUB_CATEGORY_LABEL: Readonly<Record<string, string>> = {
  fun: '休闲娱乐',
  show: '演出',
  vacation: '度假',
  other_general: '综合',
  formal_meal: '正餐',
  light_meal: '轻餐',
  drink: '饮品',
  fast_food: '快餐',
  presale_voucher_hotel: '酒店预售',
  calendar_room: '日历房',
  group_ticket: '团购票',
  calendar_ticket: '日历票',
  scenic_presale: '景区预售',
  travel_presale: '旅行预售',
  airline: '航司',
  other_transport: '其他交通',
};

/**
 * 旧类目 key → 对应二级类目 key 的映射
 * 用于从旧枚举值（如 fun/show/vacation）直接获取二级类目信息
 */
const legacyToSubCategory: Readonly<Record<string, SubCategory>> = {
  fun: 'fun',
  show: 'show',
  vacation: 'vacation',
};

/**
 * 解析适合标签显示的类目信息
 * 对于综合类目下的可区分子类目（fun/show/vacation），返回二级类目信息；
 * 对于其他类目，返回一级类目信息。
 * @param rawCategory 订单的原始 category 字段值
 * @returns { label: 显示名称, stdCategory: 标准一级类目key, colorKey: 用于CSS颜色的key }
 */
export function resolveDisplayCategory(rawCategory: string | null | undefined): {
  label: string;
  stdCategory: StandardCategory;
  colorKey: string;
} {
  const stdCat = resolveCategory(rawCategory);

  if (stdCat === 'general' && rawCategory) {
    const trimmed = String(rawCategory).trim();
    const subKey = legacyToSubCategory[trimmed];
    if (subKey) {
      return {
        label: SUB_CATEGORY_LABEL[subKey] ?? '综合',
        stdCategory: stdCat,
        colorKey: `general-${subKey}`,
      };
    }
  }

  return {
    label: getCategoryName(stdCat),
    stdCategory: stdCat,
    colorKey: stdCat,
  };
}

// ============================================================================
// 商品类型中文标签映射
// ============================================================================

export const PRODUCT_TYPE_LABEL: Readonly<Record<ProductType, string>> = {
  group_buy: '团购',
  multi_card: '次卡',
  voucher: '代金券',
  presale_voucher: '预售券',
  calendar_room: '日历房',
  calendar_ticket: '日历票',
};

/**
 * 将商品类型键转换为中文标签
 */
export function getProductTypeLabel(type: ProductType): string {
  return PRODUCT_TYPE_LABEL[type] ?? type;
}

// ============================================================================
// 导出结构化映射表（Markdown 格式）
// ============================================================================

/**
 * 生成 Markdown 格式的映射关系表
 * 可用于文档输出
 */
export function generateMappingTableMarkdown(): string {
  const header = '| 标准类目 | 别名列表 | 二级类目 | 支持商品类型 | 兼容旧枚举值 |\n| --- | --- | --- | --- | --- |\n';
  const rows = CATEGORY_MAPPING_TABLE.map(cat => {
    const aliasList = cat.aliases.join('、');
    const subList = cat.subCategories.map(s =>
      s.children ? `${s.name}(${s.children.map(c => c.name).join('/')})` : s.name,
    ).join('、');
    const productList = cat.supportedProductTypes.map(t => PRODUCT_TYPE_LABEL[t]).join('、');
    const legacyList = cat.legacyKeys.length > 0 ? cat.legacyKeys.join('、') : '—';
    return `| ${cat.name} | ${aliasList} | ${subList} | ${productList} | ${legacyList} |`;
  }).join('\n');
  return header + rows;
}
