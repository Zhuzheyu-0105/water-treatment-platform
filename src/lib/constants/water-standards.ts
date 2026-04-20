/**
 * 水质标准常量
 * 定义各类水质标准及对应的工艺适用性
 * 
 * 数据来源与校准（v3.5, 2026-04-13）：
 * - GB 5749-2022《生活饮用水卫生标准》（2023-04-01实施）
 * - GB/T 1576-2018《工业锅炉水质》（硬度单位mmol/L，换算：1mmol/L≈100mg/L CaCO₃）
 * - 中国药典2020版 通则0681/0682（纯化水≤5.1μS/cm，注射用水≤1.3μS/cm，25℃）
 * - SEMI F63-0918《半导体超纯水指南》（电阻率>18 MΩ·cm，TOC<2 ppb）
 * - Lenntech/ASTM D1141 标准海水成分（TDS≈34,483 mg/L）
 * - GB/T 19249-2017《反渗透水处理设备》
 */

// 水质标准接口
export interface WaterQualityStandard {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  standards: {
    tds?: number;           // mg/L
    turbidity?: number;     // NTU
    cod?: number;           // mg/L
    hardness?: number;      // mg/L CaCO₃
    ph?: { min: number; max: number };
    conductivity?: number;   // μS/cm
    bacteria?: number;       // CFU/mL
    silica?: number;        // mg/L SiO₂
    endotoxin?: number;     // EU/mL
    chloride?: number;      // mg/L
    sdi?: number;           // SDI值
  };
  applicableProcesses: string[];  // 适用工艺
  typicalApplication: string;      // 典型应用
}

// 水质标准数据库
export const waterQualityStandards: WaterQualityStandard[] = [
  // ==================== 生活饮用水标准 ====================
  {
    id: 'gb5749',
    name: 'GB 5749-2022 生活饮用水',
    description: '《生活饮用水卫生标准》（2023-04-01实施），代替GB 5749-2006',
    standards: {
      tds: 1000,          // ≤1000 mg/L（感官性状指标）
      turbidity: 1,       // ≤1 NTU（小型集中式供水≤2 NTU）
      cod: 3,             // 高锰酸盐指数(CODMn)≤3 mg/L（以O₂计），GB 5749-2022专用指标
      hardness: 450,      // 总硬度（以CaCO₃计）≤450 mg/L
      ph: { min: 6.5, max: 8.5 },
      bacteria: 100       // 总大肠菌群：不得检出（MPN/100mL）；菌落总数≤100 CFU/mL
    },
    applicableProcesses: ['filter_media', 'filter_carbon', 'softener', 'disinfection', 'uv'],
    typicalApplication: '居民生活饮用水'
  },
  
  // ==================== RO产水标准 ====================
  {
    id: 'ro_standard',
    name: 'RO产水标准（一级）',
    description: '一级反渗透产水典型水质，进水TDS 500-2000 mg/L，脱盐率95-98%',
    standards: {
      tds: 50,            // 典型值：进水TDS 1000 mg/L × (1-97%) ≈ 30；保守取50
      turbidity: 0.1,     // RO产水浊度极低，典型<0.1 NTU
      cod: 1,             // 化学需氧量(CODcr)，有机物去除率>95%，通常<1-2 mg/L
      hardness: 2,        // 脱盐率>97%，硬度<2 mg/L（以CaCO₃计）
      ph: { min: 5.5, max: 7.0 },   // RO产水偏酸性（CO₂不被截留）
      conductivity: 80,   // 典型电导率50-100 μS/cm（视进水和脱盐率）
      bacteria: 10        // 微生物截留率>3 log，出水<10 CFU/mL
    },
    applicableProcesses: ['ro'],
    typicalApplication: '工业用水、锅炉补水、市政回用'
  },
  
  {
    id: 'ro_high_purity',
    name: 'RO高纯水标准（两级）',
    description: '两级反渗透产水，脱盐率>99.5%，适用于电子和制药预处理',
    standards: {
      tds: 5,             // 两级RO累积脱盐率>99.5%，TDS通常2-5 mg/L
      turbidity: 0.05,    // 极低浊度
      cod: 0.5,           // 化学需氧量(CODcr)，有机物去除率>99%
      hardness: 0.1,      // 硬度极低
      ph: { min: 5.5, max: 7.0 },
      conductivity: 10,   // 电导率5-10 μS/cm
      bacteria: 1         // 微生物极低
    },
    applicableProcesses: ['ro', 'ro', 'edi'],
    typicalApplication: '电子工业进水、制药行业预处理'
  },
  
  // ==================== 锅炉补给水标准（GB/T 1576-2018） ====================
  {
    id: 'boiler_feed_low',
    name: '低压锅炉补给水（P≤1.0MPa）',
    description: 'GB/T 1576-2018，额定蒸汽压力≤1.0MPa工业锅炉给水要求',
    standards: {
      tds: 1000,          // GB/T 1576锅水TDS≤4000，给水无硬性TDS规定，参考软化后水质
      turbidity: 5,       // 锅炉给水浊度≤5 NTU（工程经验值）
      hardness: 3,        // 硬度≤0.030 mmol/L × 100 ≈ 3 mg/L（以CaCO₃计）
      ph: { min: 7.0, max: 9.0 }    // 给水pH 7.0-9.0（防腐蚀）
    },
    applicableProcesses: ['softener', 'ro'],
    typicalApplication: '低压工业蒸汽锅炉'
  },
  
  {
    id: 'boiler_feed_medium',
    name: '中高压锅炉补给水（1.0-3.8MPa）',
    description: 'GB/T 1576-2018，额定蒸汽压力1.0-3.8MPa锅炉给水，需脱盐处理',
    standards: {
      tds: 100,           // 中压锅炉给水TDS通常<100 mg/L（RO处理后）
      turbidity: 1,
      hardness: 0.5,      // 硬度≤0.005 mmol/L（高压）≈ 0.5 mg/L（以CaCO₃计）
      cod: 2,             // 化学需氧量(CODcr) mg/L
      ph: { min: 7.0, max: 9.0 },
      conductivity: 150   // 贯流/直流锅炉 P>2.5MPa 电导率≤150 μS/cm
    },
    applicableProcesses: ['ro', 'edi'],
    typicalApplication: '中高压工业锅炉、热电联产'
  },
  
  {
    id: 'boiler_feed_high',
    name: '超高压/超临界锅炉给水',
    description: '电厂级高压锅炉纯水，需RO+混床深度除盐',
    standards: {
      tds: 0.1,           // 超高纯度，TDS<0.1 mg/L
      hardness: 0.01,     // 硬度极低
      cod: 0.5,            // 化学需氧量(CODcr) mg/L
      silica: 0.02,       // 硅≤0.02 mg/L（防硅垢）
      ph: { min: 7.0, max: 8.5 },
      conductivity: 0.2   // 电导率≤0.2 μS/cm（≈5 MΩ·cm）
    },
    applicableProcesses: ['ro', 'edi', 'mixed_bed'],
    typicalApplication: '火电厂超高压、超临界、超超临界锅炉'
  },
  
  // ==================== 工业纯水标准 ====================
  {
    id: 'industrial_pure',
    name: '工业纯水（一级RO产水）',
    description: '一级RO处理的工业纯水，脱盐率95-99%',
    standards: {
      tds: 20,            // 进水TDS 500 mg/L，脱盐率97% → 产水约15-20 mg/L
      turbidity: 0.1,
      hardness: 1,
      cod: 1,             // 化学需氧量(CODcr) mg/L
      ph: { min: 5.5, max: 7.5 },
      conductivity: 30    // 典型电导率20-50 μS/cm
    },
    applicableProcesses: ['ro'],
    typicalApplication: '清洗、冷却、一般工艺用水'
  },
  
  {
    id: 'electronicsGrade',
    name: '电子级超纯水（SEMI F63）',
    description: 'SEMI F63-0918标准，18.2 MΩ·cm电阻率，TOC<2 ppb，用于半导体制造',
    standards: {
      tds: 0.001,         // 电阻率>18 MΩ·cm，TDS<0.002 mg/L（约0.001 mg/L）
      turbidity: 0.001,   // 颗粒极少，浊度<0.001 NTU
      cod: 0.002,         // TOC <2 ppb（0.002 mg/L）
      silica: 0.0005,     // 硅 <0.5 ppb（0.0005 mg/L），SEMI F63规定
      bacteria: 0.001,    // 微生物控制极严，<0.001 CFU/mL（1/1000 CFU/mL）
      conductivity: 0.055 // 理论纯水电导率0.0548 μS/cm，实际<0.065 μS/cm
    },
    applicableProcesses: ['uf', 'ro', 'edi', 'mixed_bed', 'uv'],
    typicalApplication: '半导体晶圆清洗、集成电路制造、LCD生产'
  },
  
  // ==================== 制药用水标准（中国药典2020版） ====================
  {
    id: 'pharmaceutical_pure',
    name: '药典纯化水（ChP 2020）',
    description: '中国药典2020版纯化水标准（通则0261），25℃电导率≤5.1μS/cm',
    standards: {
      tds: 3,             // 由电导率5.1μS/cm换算：TDS≈电导率×0.5≈2.6 mg/L，取3
      hardness: 0.1,      // 无直接限值，由钙镁离子检查控制，参考≤0.1 mg/L
      cod: 0.5,           // 化学需氧量(CODcr) mg/L（药典标准实际测TOC，TOC≤500 ppb≈0.5 mg/L）
      bacteria: 100,      // 微生物限度：需氧菌总数≤100 CFU/mL（药典2020版）
      ph: { min: 5.0, max: 7.0 },   // pH 5.0-7.0（药典规定范围）
      conductivity: 5.1   // 25℃电导率≤5.1μS/cm（药典0681通则核心限值）
    },
    applicableProcesses: ['ro', 'edi'],
    typicalApplication: '制药生产、医疗器械清洗、非注射剂配制'
  },
  
  {
    id: 'pharmaceutical_water',
    name: '药典注射用水（ChP 2020）',
    description: '中国药典2020版注射用水，25℃电导率≤1.3μS/cm，内毒素≤0.25EU/mL',
    standards: {
      tds: 0.7,           // 由电导率1.3μS/cm换算：TDS≈0.65 mg/L，取0.7
      hardness: 0,
      cod: 0.05,         // 化学需氧量(CODcr) mg/L（药典标准实际测TOC，<50 ppb≈0.05 mg/L）
      bacteria: 10,       // 微生物限度：需氧菌总数≤10 CFU/100mL（药典2020版）
      endotoxin: 0.25,    // 细菌内毒素≤0.25EU/mL（药典规定）
      ph: { min: 5.0, max: 7.0 },
      conductivity: 1.3   // 25℃电导率≤1.3μS/cm（药典0681通则核心限值）
    },
    applicableProcesses: ['ro', 'edi', 'mixed_bed', 'uv', 'distillation'],
    typicalApplication: '注射剂制备、无菌制剂生产'
  },
  
  // ==================== 冷却水标准（GB/T 50050-2017） ====================
  {
    id: 'cooling_tower',
    name: '敞开式循环冷却水',
    description: 'GB/T 50050-2017循环冷却水设计规范，浓缩倍数3-5倍',
    standards: {
      tds: 2500,          // 循环水TDS通常不超过2500 mg/L（浓缩3-5倍）
      turbidity: 10,      // 循环水浊度≤10 NTU（旁流过滤控制）
      hardness: 450,      // 总硬度（以CaCO₃计）≤450 mg/L（防结垢）
      cod: 5,             // 化学需氧量(CODcr)，工程参考值；循环冷却水实际常测CODMn≈5 mg/L
      chloride: 250       // 氯离子≤250 mg/L（防腐蚀，碳钢材质）
    },
    applicableProcesses: ['filter_media', 'softener', 'acidification'],
    typicalApplication: '工业循环冷却水系统'
  }
];

/**
 * 根据工艺流程判断能达到的水质标准
 * @param processTypes 工艺单元类型数组
 * @returns 可达到的水质标准推荐
 */
export function getRecommendedStandards(processTypes: string[]): WaterQualityStandard[] {
  const recommendations: WaterQualityStandard[] = [];
  
  // 检查工艺流程复杂度
  const hasRO = processTypes.includes('ro');
  const hasNF = processTypes.includes('nf');
  const hasUF = processTypes.includes('uf');
  const hasEDI = processTypes.includes('edi');
  const hasMixedBed = processTypes.includes('mixed_bed');
  const hasUV = processTypes.includes('uv');
  const hasDistillation = processTypes.includes('distillation');
  
  // 统计膜处理单元数量（RO/NF）
  const membraneStages = processTypes.filter(t => t === 'ro' || t === 'nf').length;
  
  // 根据工艺组合推荐水质标准
  // 1. 一级RO
  if (hasRO && membraneStages === 1 && !hasEDI) {
    recommendations.push(waterQualityStandards.find(s => s.id === 'ro_standard')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'industrial_pure')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'boiler_feed_low')!);
  }
  
  // 2. 两级RO
  if (hasRO && membraneStages >= 2 && !hasEDI) {
    recommendations.push(waterQualityStandards.find(s => s.id === 'ro_high_purity')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'pharmaceutical_pure')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'boiler_feed_medium')!);
  }
  
  // 3. RO + EDI
  if (hasRO && hasEDI && !hasMixedBed) {
    recommendations.push(waterQualityStandards.find(s => s.id === 'pharmaceutical_pure')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'boiler_feed_medium')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'electronicsGrade')!);
  }
  
  // 4. RO + EDI + 混床（最高纯度）
  if (hasRO && hasEDI && hasMixedBed) {
    recommendations.push(waterQualityStandards.find(s => s.id === 'electronicsGrade')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'boiler_feed_high')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'pharmaceutical_water')!);
  }
  
  // 5. 仅NF（纳滤）
  if (hasNF && !hasRO) {
    recommendations.push(waterQualityStandards.find(s => s.id === 'industrial_pure')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'cooling_tower')!);
  }
  
  // 6. 仅UF + 消毒
  if (hasUF && !hasRO) {
    recommendations.push(waterQualityStandards.find(s => s.id === 'gb5749')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'industrial_pure')!);
  }
  
  // 7. 无膜工艺（仅预处理）
  if (!hasRO && !hasNF && !hasUF) {
    recommendations.push(waterQualityStandards.find(s => s.id === 'gb5749')!);
    recommendations.push(waterQualityStandards.find(s => s.id === 'cooling_tower')!);
  }
  
  return recommendations.slice(0, 3); // 最多返回3个推荐
}

/**
 * 根据水质标准生成出水目标
 * @param standard 水质标准
 * @returns 出水目标对象
 */
export function generateOutletTarget(standard: WaterQualityStandard): Record<string, number> {
  const target: Record<string, number> = {};
  
  if (standard.standards.tds !== undefined) {
    target.tds = standard.standards.tds;
  }
  if (standard.standards.turbidity !== undefined) {
    target.turbidity = standard.standards.turbidity;
  }
  if (standard.standards.cod !== undefined) {
    target.cod = standard.standards.cod;
  }
  if (standard.standards.hardness !== undefined) {
    target.hardness = standard.standards.hardness;
  }
  if (standard.standards.conductivity !== undefined) {
    target.conductivity = standard.standards.conductivity;
  }
  
  return target;
}

/**
 * 评估出水水质符合哪些标准
 * @param waterQuality 实测水质
 * @returns 符合的标准列表
 */
export function assessCompliance(
  waterQuality: { 
    tds?: number; 
    turbidity?: number; 
    cod?: number; 
    hardness?: number; 
    conductivity?: number;
    silica?: number;
    endotoxin?: number;
    chloride?: number;
  }
): { standard: WaterQualityStandard; compliance: 'full' | 'partial' | 'fail'; issues: string[] }[] {
  const results: { standard: WaterQualityStandard; compliance: 'full' | 'partial' | 'fail'; issues: string[] }[] = [];
  
  for (const standard of waterQualityStandards) {
    const issues: string[] = [];
    let compliant = true;
    
    const s = standard.standards;
    
    if (s.tds !== undefined && waterQuality.tds !== undefined && waterQuality.tds > s.tds) {
      issues.push(`TDS ${waterQuality.tds} > ${s.tds}`);
      compliant = false;
    }
    
    if (s.turbidity !== undefined && waterQuality.turbidity !== undefined && waterQuality.turbidity > s.turbidity) {
      issues.push(`浊度 ${waterQuality.turbidity} > ${s.turbidity}`);
      compliant = false;
    }
    
    if (s.cod !== undefined && waterQuality.cod !== undefined && waterQuality.cod > s.cod) {
      issues.push(`COD ${waterQuality.cod} > ${s.cod}`);
      compliant = false;
    }
    
    if (s.hardness !== undefined && waterQuality.hardness !== undefined && waterQuality.hardness > s.hardness) {
      issues.push(`硬度 ${waterQuality.hardness} > ${s.hardness}`);
      compliant = false;
    }
    
    if (s.conductivity !== undefined && waterQuality.conductivity !== undefined && waterQuality.conductivity > s.conductivity) {
      issues.push(`电导率 ${waterQuality.conductivity} > ${s.conductivity}`);
      compliant = false;
    }

    if (s.chloride !== undefined && waterQuality.chloride !== undefined && waterQuality.chloride > s.chloride) {
      issues.push(`氯离子 ${waterQuality.chloride} > ${s.chloride}`);
      compliant = false;
    }
    
    results.push({
      standard,
      compliance: compliant ? 'full' : issues.length > 0 ? 'partial' : 'full',
      issues
    });
  }
  
  return results.sort((a, b) => {
    // 优先返回完全符合的标准
    if (a.compliance === 'full' && b.compliance !== 'full') return -1;
    if (a.compliance !== 'full' && b.compliance === 'full') return 1;
    return 0;
  });
}
