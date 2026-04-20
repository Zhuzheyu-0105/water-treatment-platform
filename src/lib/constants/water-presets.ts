/**
 * 水质参数预设模板系统
 * 
 * 提供常见水源的典型水质参数预设，方便用户快速选择和修改。
 * 数据来源与校准（v3.5, 2026-04-13）：
 * - 《水处理工程》（许保玖，第三版）
 * - GB 5749-2022《生活饮用水卫生标准》
 * - GB/T 50050-2017《工业循环冷却水处理设计规范》
 * - Lenntech/ASTM D1141标准海水成分（TDS 34,483 mg/L）
 * - 实际工程案例统计数据
 */

import { WaterQualityParams } from './water-quality';

/** 水质预设模板 */
export interface WaterPreset {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 水源描述 */
  description: string;
  /** 适用场景 */
  category: 'municipal' | 'industrial' | 'groundwater' | 'seawater' | 'wastewater' | 'special';
  /** 水质参数 */
  waterQuality: WaterQualityParams;
  /** 典型处理工艺建议 */
  recommendedProcess: string[];
  /** 推荐膜类型 */
  recommendedMembrane: string;
  /** 难度等级 */
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  /** 难度标签 */
  difficultyLabel: string;
}

/** 预设分类标签 */
export const presetCategories = [
  { id: 'municipal', name: '市政用水', icon: '🏭' },
  { id: 'groundwater', name: '地下水', icon: '💧' },
  { id: 'industrial', name: '工业用水', icon: '⚙️' },
  { id: 'seawater', name: '海水淡化', icon: '🌊' },
  { id: 'wastewater', name: '废水回用', icon: '♻️' },
  { id: 'special', name: '特殊场景', icon: '🔬' }
] as const;

/** 水质预设模板库 */
export const waterPresets: WaterPreset[] = [
  // ===== 市政用水 =====
  {
    id: 'municipal-tap-water',
    name: '市政自来水',
    description: '经过市政水厂处理的常规自来水，水质较好，适合直接进入RO系统',
    category: 'municipal',
    waterQuality: {
      ph: 7.2,
      tds: 150,
      conductivity: 230,
      turbidity: 0.5,
      temperature: 20,
      hardness: 120,
      calcium: 40,
      magnesium: 15,
      chloride: 25,
      sulfate: 30,
      bicarbonate: 90,
      silica: 8,
      cod: 2,
      chlorine: 0.3,
      iron: 0.02,
      manganese: 0.01,
      sdi: 2
    },
    recommendedProcess: ['活性炭过滤器', '精密过滤器(5μm)', '反渗透'],
    recommendedMembrane: 'BW30-400 (苦咸水膜)',
    difficulty: 'easy',
    difficultyLabel: '简单'
  },
  {
    id: 'municipal-river-water',
    name: '地表河水',
    description: '来自河流、湖泊的地表水，浊度和有机物较高，需要完善的预处理',
    category: 'municipal',
    waterQuality: {
      ph: 7.5,
      tds: 350,
      conductivity: 540,
      turbidity: 15,
      temperature: 25,
      hardness: 180,
      calcium: 55,
      magnesium: 25,
      chloride: 40,
      sulfate: 45,
      bicarbonate: 150,
      silica: 12,
      cod: 8,
      toc: 3,
      chlorine: 0.1,
      iron: 0.3,
      manganese: 0.05,
      bacteria: 500,
      sdi: 5
    },
    recommendedProcess: ['多介质过滤器', '活性炭过滤器', '超滤', '反渗透'],
    recommendedMembrane: 'BW30-400 (苦咸水膜)',
    difficulty: 'medium',
    difficultyLabel: '中等'
  },

  // ===== 地下水 =====
  {
    id: 'groundwater-brackish',
    name: '苦咸水 (TDS~2000)',
    description: '含盐量较高的地下水，TDS约2000mg/L，需要反渗透处理',
    category: 'groundwater',
    waterQuality: {
      ph: 7.5,
      tds: 2000,
      conductivity: 3200,
      turbidity: 2.5,
      temperature: 25,
      hardness: 350,
      calcium: 100,
      magnesium: 55,
      sodium: 280,
      chloride: 400,
      sulfate: 250,
      bicarbonate: 200,
      silica: 15,
      cod: 5,
      iron: 0.5,
      manganese: 0.2,
      sdi: 3
    },
    recommendedProcess: ['多介质过滤器', '软化器', '精密过滤器(5μm)', '反渗透'],
    recommendedMembrane: 'BW30-400 (苦咸水膜)',
    difficulty: 'medium',
    difficultyLabel: '中等'
  },
  {
    id: 'groundwater-hard',
    name: '高硬度地下水',
    description: '硬度极高的地下水，钙镁离子含量高，必须软化处理后才能进RO',
    category: 'groundwater',
    waterQuality: {
      ph: 7.8,
      tds: 800,
      conductivity: 1250,
      turbidity: 1.0,
      temperature: 18,
      hardness: 500,
      calcium: 150,
      magnesium: 40,
      chloride: 80,
      sulfate: 120,
      bicarbonate: 350,
      silica: 20,
      cod: 3,
      iron: 0.8,
      manganese: 0.3,
      sdi: 2
    },
    recommendedProcess: ['曝气除铁', '多介质过滤器', '软化器', '精密过滤器(5μm)', '反渗透'],
    recommendedMembrane: 'BW30-400 (苦咸水膜)',
    difficulty: 'hard',
    difficultyLabel: '较难'
  },
  {
    id: 'groundwater-high-iron',
    name: '高铁锰地下水',
    description: '铁锰含量超标的地下水，必须先除铁锰再进膜系统',
    category: 'groundwater',
    waterQuality: {
      ph: 6.8,
      tds: 600,
      conductivity: 920,
      turbidity: 3.0,
      temperature: 15,
      hardness: 200,
      calcium: 60,
      magnesium: 20,
      chloride: 50,
      sulfate: 80,
      bicarbonate: 180,
      silica: 10,
      cod: 4,
      iron: 5.0,
      manganese: 1.5,
      sdi: 4
    },
    recommendedProcess: ['曝气除铁锰', '锰砂过滤器', '多介质过滤器', '精密过滤器(5μm)', '反渗透'],
    recommendedMembrane: 'BW30-400 (苦咸水膜)',
    difficulty: 'hard',
    difficultyLabel: '较难'
  },

  // ===== 工业用水 =====
  {
    id: 'industrial-boiler-feed',
    name: '锅炉补给水',
    description: '工业锅炉用纯水制备，要求极高的出水水质，通常使用RO+EDI',
    category: 'industrial',
    waterQuality: {
      ph: 7.0,
      tds: 500,
      conductivity: 770,
      turbidity: 1.0,
      temperature: 25,
      hardness: 150,
      calcium: 45,
      magnesium: 15,
      sodium: 50,
      chloride: 60,
      sulfate: 80,
      bicarbonate: 130,
      silica: 12,
      cod: 5,
      toc: 2,
      chlorine: 0.2,
      sdi: 3
    },
    recommendedProcess: ['超滤', '反渗透', 'EDI'],
    recommendedMembrane: 'BW30LE-440i (低能耗膜)',
    difficulty: 'hard',
    difficultyLabel: '较难'
  },
  {
    id: 'industrial-electronics',
    name: '电子超纯水',
    description: '电子/半导体行业超纯水制备，要求18.2MΩ·cm电阻率',
    category: 'industrial',
    waterQuality: {
      ph: 7.0,
      tds: 300,
      conductivity: 460,
      turbidity: 0.5,
      temperature: 25,
      hardness: 100,
      calcium: 30,
      magnesium: 10,
      sodium: 30,
      chloride: 40,
      sulfate: 50,
      bicarbonate: 90,
      silica: 8,
      cod: 2,
      toc: 1,
      bacteria: 100,
      sdi: 2
    },
    recommendedProcess: ['超滤', '两级反渗透', 'EDI', '紫外消毒', '终端精密过滤'],
    recommendedMembrane: 'BW30LE-440i (低能耗膜) + 二级RO',
    difficulty: 'expert',
    difficultyLabel: '专业'
  },

  // ===== 海水淡化 =====
  {
    id: 'seawater-standard',
    name: '标准海水 (TDS~34500)',
    description: '标准海水淡化，高盐度，需要高压海水膜，回收率通常40-45%。数据来源：Lenntech/ASTM D1141',
    category: 'seawater',
    waterQuality: {
      ph: 8.1,            // 海水pH典型值8.0-8.3，取8.1
      tds: 34500,         // Lenntech标准海水TDS: 34,483 mg/L，取整34500
      conductivity: 53000, // 海水电导率约50,000-56,000 μS/cm
      turbidity: 5.0,
      temperature: 25,
      hardness: 6500,     // Ca²⁺(400)+Mg²⁺(1262)换算为CaCO₃：400/40.08×100+1262/24.31×100≈6190，取6500
      calcium: 400,       // ASTM D1141: Ca²⁺ 408 mg/L，Lenntech: 400 mg/L
      magnesium: 1262,    // Lenntech标准值: Mg²⁺ 1,262 mg/L（原1300偏高）
      sodium: 10556,      // Lenntech标准值: Na⁺ 10,556 mg/L
      potassium: 380,     // Lenntech标准值: K⁺ 380 mg/L（原390偏高）
      chloride: 18980,    // Lenntech标准值: Cl⁻ 18,980 mg/L
      sulfate: 2649,      // Lenntech标准值: SO₄²⁻ 2,649 mg/L（原2700偏高）
      bicarbonate: 140,   // Lenntech标准值: HCO₃⁻ 140 mg/L（原120偏低）
      silica: 5,
      cod: 3,
      bacteria: 1000,
      sdi: 5
    },
    recommendedProcess: ['多介质过滤器', '超滤', '高压泵', '海水反渗透', '能量回收'],
    recommendedMembrane: 'SW30HR-380 (海水膜)',
    difficulty: 'expert',
    difficultyLabel: '专业'
  },

  // ===== 废水回用 =====
  {
    id: 'wastewater-municipal-reuse',
    name: '市政污水回用',
    description: '市政污水处理后回用，COD和氨氮较高，需要深度处理',
    category: 'wastewater',
    waterQuality: {
      ph: 7.2,
      tds: 800,
      conductivity: 1230,
      turbidity: 10,
      temperature: 25,
      hardness: 200,
      calcium: 60,
      magnesium: 25,
      sodium: 100,
      chloride: 120,
      sulfate: 100,
      bicarbonate: 250,
      silica: 15,
      cod: 30,
      bod: 10,
      toc: 8,
      ammonia: 15,
      tn: 25,
      tp: 3,
      bacteria: 5000,
      sdi: 6
    },
    recommendedProcess: ['曝气生物滤池', '超滤(MBR)', '活性炭', '反渗透'],
    recommendedMembrane: 'BW30FR-365 (抗污染膜)',
    difficulty: 'hard',
    difficultyLabel: '较难'
  },

  // ===== 特殊场景 =====
  {
    id: 'special-drinking-water',
    name: '直饮水/桶装水',
    description: '饮用纯净水制备，需满足GB 19298标准',
    category: 'special',
    waterQuality: {
      ph: 7.0,
      tds: 200,
      conductivity: 310,
      turbidity: 1.0,
      temperature: 20,
      hardness: 130,
      calcium: 38,
      magnesium: 14,
      chloride: 30,
      sulfate: 35,
      bicarbonate: 100,
      silica: 8,
      cod: 3,
      bacteria: 200,
      sdi: 3
    },
    recommendedProcess: ['精密过滤器(5μm)', '活性炭', '反渗透', '紫外消毒/臭氧'],
    recommendedMembrane: 'BW30LE-440i (低能耗膜)',
    difficulty: 'easy',
    difficultyLabel: '简单'
  },
  {
    id: 'special-pharmaceutical',
    name: '制药用水 (纯化水)',
    description: '制药行业纯化水制备，需符合GMP和药典标准',
    category: 'special',
    waterQuality: {
      ph: 7.0,
      tds: 400,
      conductivity: 620,
      turbidity: 0.5,
      temperature: 25,
      hardness: 120,
      calcium: 35,
      magnesium: 12,
      sodium: 40,
      chloride: 50,
      sulfate: 60,
      bicarbonate: 110,
      silica: 10,
      cod: 2,
      toc: 1,
      bacteria: 50,
      sdi: 2
    },
    recommendedProcess: ['多介质过滤器', '活性炭', '软化器', '精密过滤器', '两级反渗透', 'EDI'],
    recommendedMembrane: 'BW30LE-440i (低能耗膜)',
    difficulty: 'expert',
    difficultyLabel: '专业'
  }
];

/**
 * 根据分类获取预设
 */
export function getPresetsByCategory(category: WaterPreset['category']): WaterPreset[] {
  return waterPresets.filter(p => p.category === category);
}

/**
 * 根据 ID 获取预设
 */
export function getPresetById(id: string): WaterPreset | undefined {
  return waterPresets.find(p => p.id === id);
}

/**
 * 根据水质参数推荐最接近的预设
 */
export function suggestPreset(waterQuality: WaterQualityParams): WaterPreset | null | undefined {
  if (!waterQuality.tds && !waterQuality.conductivity) return null;

  const tds = waterQuality.tds || (waterQuality.conductivity ? waterQuality.conductivity * 0.65 : 0);

  // 按 TDS 范围匹配
  if (tds > 20000) {
    return getPresetById('seawater-standard');
  } else if (tds > 5000) {
    return getPresetById('groundwater-brackish');
  } else if (tds > 1000) {
    // 检查是否高硬度
    if (waterQuality.hardness && waterQuality.hardness > 400) {
      return getPresetById('groundwater-hard');
    }
    // 检查是否高铁
    if (waterQuality.iron && waterQuality.iron > 2) {
      return getPresetById('groundwater-high-iron');
    }
    return getPresetById('groundwater-brackish');
  } else if (tds > 300) {
    return getPresetById('municipal-river-water');
  } else {
    return getPresetById('municipal-tap-water');
  }
}
