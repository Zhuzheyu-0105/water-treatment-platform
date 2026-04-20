// 水质参数类型定义和常量

export interface WaterQualityParams {
  // 基础理化参数
  ph?: number;
  turbidity?: number; // 浊度 NTU
  sdi?: number; // 污染指数 SDI15
  conductivity?: number; // 电导率 μs/cm
  tss?: number; // 总悬浮固体 mg/L (不通过滤膜的部分)
  ss?: number; // 可滤残渣 mg/L (105°C过滤后残留，近似于溶解性固体)
  temperature?: number; // 水温 °C
  
  // 阳离子
  calcium?: number; // 钙 Ca²⁺ mg/L
  magnesium?: number; // 镁 Mg²⁺ mg/L
  sodium?: number; // 钠 Na⁺ mg/L
  potassium?: number; // 钾 K⁺ mg/L
  iron?: number; // 铁 Total Fe mg/L
  manganese?: number; // 锰 Mn²⁺ mg/L
  barium?: number; // 钡 Ba²⁺ mg/L
  strontium?: number; // 锶 Sr²⁺ mg/L
  
  // 阴离子
  chloride?: number; // 氯离子 Cl⁻ mg/L
  sulfate?: number; // 硫酸根 SO₄²⁻ mg/L
  nitrate?: number; // 硝酸根 NO₃⁻ mg/L
  fluoride?: number; // 氟离子 F⁻ mg/L
  bicarbonate?: number; // 重碳酸根 HCO₃⁻ mg/L
  silica?: number; // 二氧化硅 SiO₂ mg/L
  
  // 有机/生物指标
  cod?: number; // 化学需氧量 (CODcr) mg/L
  bod?: number; // BOD₅ mg/L
  toc?: number; // TOC 总有机碳 mg/L
  color?: number; // 色度 倍
  bacteria?: number; // 细菌总数 CFU/mL
  
  // 安全性指标
  chlorine?: number; // 余氯 Free Cl₂ mg/L
  orp?: number; // ORP 氧化还原电位 mV
  
  // 营养盐
  ammonia?: number; // 氨氮 NH₃-N mg/L
  tn?: number; // 总氮 TN mg/L
  tp?: number; // 总磷 TP mg/L
  
  // 其他
  tds?: number; // TDS mg/L（由电导率自动计算）
  hardness?: number; // 总硬度 mg/L (以CaCO₃计)
}

// 参数显示配置
export const waterQualityParamConfig = {
  // 基础理化
  ph: { label: 'pH值', unit: '', category: 'basic', icon: 'flask' },
  turbidity: { label: '浊度', unit: 'NTU', category: 'basic', icon: 'droplet' },
  sdi: { label: 'SDI₁₅', unit: '', category: 'basic', icon: 'chart' },
  conductivity: { label: '电导率', unit: 'μs/cm', category: 'basic', icon: 'zap' },
  tss: { label: 'TSS', unit: 'mg/L', category: 'basic', icon: 'layers' },
  ss: { label: 'SS', unit: 'mg/L', category: 'basic', icon: 'layers' },
  temperature: { label: '水温', unit: '°C', category: 'basic', icon: 'thermometer' },
  
  // 阳离子
  calcium: { label: '钙 Ca²⁺', unit: 'mg/L', category: 'cation', icon: 'plus' },
  magnesium: { label: '镁 Mg²⁺', unit: 'mg/L', category: 'cation', icon: 'plus' },
  sodium: { label: '钠 Na⁺', unit: 'mg/L', category: 'cation', icon: 'plus' },
  potassium: { label: '钾 K⁺', unit: 'mg/L', category: 'cation', icon: 'plus' },
  iron: { label: '铁 Fe', unit: 'mg/L', category: 'cation', icon: 'plus' },
  manganese: { label: '锰 Mn²⁺', unit: 'mg/L', category: 'cation', icon: 'plus' },
  barium: { label: '钡 Ba²⁺', unit: 'mg/L', category: 'cation', icon: 'plus' },
  strontium: { label: '锶 Sr²⁺', unit: 'mg/L', category: 'cation', icon: 'plus' },
  
  // 阴离子
  chloride: { label: '氯离子 Cl⁻', unit: 'mg/L', category: 'anion', icon: 'minus' },
  sulfate: { label: '硫酸根 SO₄²⁻', unit: 'mg/L', category: 'anion', icon: 'minus' },
  nitrate: { label: '硝酸根 NO₃⁻', unit: 'mg/L', category: 'anion', icon: 'minus' },
  fluoride: { label: '氟离子 F⁻', unit: 'mg/L', category: 'anion', icon: 'minus' },
  bicarbonate: { label: '重碳酸根 HCO₃⁻', unit: 'mg/L', category: 'anion', icon: 'minus' },
  silica: { label: '二氧化硅 SiO₂', unit: 'mg/L', category: 'anion', icon: 'minus' },
  
  // 有机/生物
  // 注：本字段统一标注为化学需氧量(CODcr)，代表水中有机物被氧化剂氧化的总量
  //     GB 5749-2022《生活饮用水》使用的是高锰酸盐指数(CODMn)，测定原理与CODcr不同
  //     但两者在数值上有一定相关性，工程上常将CODMn视作CODcr的近似值使用
  cod: { label: '化学需氧量(COD)', unit: 'mg/L', category: 'organic', icon: 'flask' },
  bod: { label: 'BOD₅', unit: 'mg/L', category: 'organic', icon: 'flask' },
  toc: { label: 'TOC', unit: 'mg/L', category: 'organic', icon: 'flask' },
  color: { label: '色度', unit: '倍', category: 'organic', icon: 'palette' },
  bacteria: { label: '细菌总数', unit: 'CFU/mL', category: 'organic', icon: 'bug' },
  
  // 安全性
  chlorine: { label: '余氯', unit: 'mg/L', category: 'safety', icon: 'shield' },
  orp: { label: 'ORP', unit: 'mV', category: 'safety', icon: 'zap' },
  
  // 营养盐
  ammonia: { label: '氨氮', unit: 'mg/L', category: 'nutrient', icon: 'atom' },
  tn: { label: '总氮 TN', unit: 'mg/L', category: 'nutrient', icon: 'atom' },
  tp: { label: '总磷 TP', unit: 'mg/L', category: 'nutrient', icon: 'atom' },
  
  // 其他
  tds: { label: 'TDS', unit: 'mg/L', category: 'other', icon: 'droplets', description: '由电导率自动计算' },
  hardness: { label: '总硬度', unit: 'mg/L', category: 'other', icon: 'gem' },
};

// 水质标准预设接口
export interface WaterQualityStandard {
  id: string;
  name: string;
  description: string;
  source: string; // 标准来源/编号
  category: 'drinking' | 'surface' | 'industrial' | 'membrane' | 'electronic';
  params: {
    [key: string]: {
      min?: number;
      max?: number;
      optimal?: number;
      unit?: string;
      description?: string;
    };
  };
}

// 水质标准预设 - 基于实际国家标准
export const waterQualityStandards: WaterQualityStandard[] = [
  // 生活饮用水卫生标准 GB 5749-2022
  {
    id: 'gb5749_2022',
    name: '生活饮用水卫生标准',
    description: '适用于各类生活饮用水，保证用户饮用安全',
    source: 'GB 5749-2022',
    category: 'drinking',
    params: {
      ph: { min: 6.5, max: 8.5, unit: '', description: 'pH值' },
      turbidity: { max: 1, unit: 'NTU', description: '浑浊度' },
      tds: { max: 1000, unit: 'mg/L', description: '溶解性总固体' },
      hardness: { max: 450, unit: 'mg/L', description: '总硬度(以CaCO₃计)' },
      chloride: { max: 250, unit: 'mg/L', description: '氯化物' },
      sulfate: { max: 250, unit: 'mg/L', description: '硫酸盐' },
      nitrate: { max: 10, unit: 'mg/L', description: '硝酸盐(以N计)' },
      fluoride: { max: 1.0, unit: 'mg/L', description: '氟化物' },
      iron: { max: 0.3, unit: 'mg/L', description: '铁' },
      manganese: { max: 0.1, unit: 'mg/L', description: '锰' },
      cod: { max: 3, unit: 'mg/L', description: '高锰酸盐指数(以O₂计)' },
      ammonia: { max: 0.5, unit: 'mg/L', description: '氨(以N计)' },
      sodium: { max: 200, unit: 'mg/L', description: '钠' },
      color: { max: 15, unit: '度', description: '色度' },
      bacteria: { max: 100, unit: 'CFU/mL', description: '菌落总数' },
    }
  },
  
  // 地表水I类标准
  {
    id: 'gb3838_class1',
    name: '地表水I类标准',
    description: '主要适用于源头水、国家自然保护区',
    source: 'GB 3838-2002',
    category: 'surface',
    params: {
      ph: { min: 6, max: 9, unit: '', description: 'pH值' },
      cod: { max: 15, unit: 'mg/L', description: '化学需氧量(COD)' },
      ammonia: { max: 0.15, unit: 'mg/L', description: '氨氮' },
      tn: { max: 0.2, unit: 'mg/L', description: '总氮' },
      tp: { max: 0.02, unit: 'mg/L', description: '总磷(湖库)' },
      conductivity: { max: 400, unit: 'μs/cm', description: '电导率参考值' },
      turbidity: { max: 3, unit: 'NTU', description: '浊度参考值' },
    }
  },
  
  // 地表水II类标准
  {
    id: 'gb3838_class2',
    name: '地表水II类标准',
    description: '集中式生活饮用水地表水源地一级保护区',
    source: 'GB 3838-2002',
    category: 'surface',
    params: {
      ph: { min: 6, max: 9, unit: '', description: 'pH值' },
      cod: { max: 15, unit: 'mg/L', description: '化学需氧量(COD)' },
      ammonia: { max: 0.5, unit: 'mg/L', description: '氨氮' },
      tn: { max: 0.5, unit: 'mg/L', description: '总氮' },
      tp: { max: 0.1, unit: 'mg/L', description: '总磷(湖库)' },
      conductivity: { max: 600, unit: 'μs/cm', description: '电导率参考值' },
      turbidity: { max: 5, unit: 'NTU', description: '浊度参考值' },
    }
  },
  
  // 地表水III类标准
  {
    id: 'gb3838_class3',
    name: '地表水III类标准',
    description: '集中式生活饮用水地表水源地二级保护区',
    source: 'GB 3838-2002',
    category: 'surface',
    params: {
      ph: { min: 6, max: 9, unit: '', description: 'pH值' },
      cod: { max: 20, unit: 'mg/L', description: '化学需氧量(COD)' },
      ammonia: { max: 1.0, unit: 'mg/L', description: '氨氮' },
      tn: { max: 1.0, unit: 'mg/L', description: '总氮' },
      tp: { max: 0.2, unit: 'mg/L', description: '总磷(湖库)' },
      conductivity: { max: 800, unit: 'μs/cm', description: '电导率参考值' },
      turbidity: { max: 10, unit: 'NTU', description: '浊度参考值' },
    }
  },
  
  // RO进水要求
  {
    id: 'ro_feed',
    name: 'RO进水要求',
    description: '反渗透膜系统进水水质要求，保障膜元件长期稳定运行',
    source: 'HJ579-2010 膜分离法污水处理工程技术规范',
    category: 'membrane',
    params: {
      sdi: { max: 5, optimal: 3, unit: '', description: '污染指数SDI₁₅' },
      turbidity: { max: 1, optimal: 0.2, unit: 'NTU', description: '浊度' },
      chlorine: { max: 0.1, optimal: 0, unit: 'mg/L', description: '游离氯(复合膜对氯敏感)' },
      iron: { max: 0.3, optimal: 0.1, unit: 'mg/L', description: '铁离子' },
      manganese: { max: 0.05, optimal: 0.02, unit: 'mg/L', description: '锰离子' },
      ph: { min: 3, max: 11, unit: '', description: 'pH值' },
      temperature: { min: 5, max: 45, unit: '°C', description: '水温' },
      silica: { max: 100, optimal: 50, unit: 'mg/L', description: '二氧化硅(高温高pH易结垢)' },
      barium: { max: 0.05, unit: 'mg/L', description: '钡离子(易形成BaSO₄垢)' },
      strontium: { max: 0.1, unit: 'mg/L', description: '锶离子(易形成SrSO₄垢)' },
      cod: { max: 1.5, unit: 'mg/L', description: '化学需氧量' },
      hardness: { max: 50, unit: 'mg/L', description: '硬度(建议加阻垢剂后)' },
    }
  },
  
  // UF超滤进水要求
  {
    id: 'uf_feed',
    name: 'UF超滤进水要求',
    description: '超滤膜系统进水水质要求',
    source: '行业标准',
    category: 'membrane',
    params: {
      turbidity: { max: 300, unit: 'NTU', description: '浊度' },
      tss: { max: 100, unit: 'mg/L', description: '总悬浮固体' },
      ph: { min: 2, max: 11, unit: '', description: 'pH值' },
      temperature: { min: 5, max: 40, unit: '°C', description: '水温' },
    }
  },
  
  // 电子级超纯水标准 EW-I
  {
    id: 'electronic_ew1',
    name: '电子级超纯水 EW-I级',
    description: '半导体、集成电路等高端电子工业清洗用水',
    source: 'GB/T 11446.1-2013',
    category: 'electronic',
    params: {
      conductivity: { max: 0.056, unit: 'μs/cm', description: '电阻率≥18MΩ·cm' },
      toc: { max: 0.02, unit: 'mg/L', description: '总有机碳' },
      silica: { max: 0.002, unit: 'mg/L', description: '全硅' },
      bacteria: { max: 0.01, unit: 'CFU/mL', description: '细菌个数' },
      sodium: { max: 0.0005, unit: 'mg/L', description: '钠' },
      potassium: { max: 0.0005, unit: 'mg/L', description: '钾' },
      chloride: { max: 0.001, unit: 'mg/L', description: '氯离子' },
      nitrate: { max: 0.001, unit: 'mg/L', description: '硝酸根' },
      sulfate: { max: 0.001, unit: 'mg/L', description: '硫酸根' },
      iron: { max: 0.0001, unit: 'mg/L', description: '铁' },
    }
  },
  
  // 电子级超纯水标准 EW-II
  {
    id: 'electronic_ew2',
    name: '电子级超纯水 EW-II级',
    description: '电子元器件清洗用水',
    source: 'GB/T 11446.1-2013',
    category: 'electronic',
    params: {
      conductivity: { max: 0.067, unit: 'μs/cm', description: '电阻率≥15MΩ·cm' },
      toc: { max: 0.1, unit: 'mg/L', description: '总有机碳' },
      silica: { max: 0.01, unit: 'mg/L', description: '全硅' },
      bacteria: { max: 0.1, unit: 'CFU/mL', description: '细菌个数' },
      sodium: { max: 0.002, unit: 'mg/L', description: '钠' },
      potassium: { max: 0.002, unit: 'mg/L', description: '钾' },
      chloride: { max: 0.001, unit: 'mg/L', description: '氯离子' },
      nitrate: { max: 0.001, unit: 'mg/L', description: '硝酸根' },
      sulfate: { max: 0.001, unit: 'mg/L', description: '硫酸根' },
    }
  },
  
  // 工业循环冷却水标准
  {
    id: 'industrial_cooling',
    name: '工业循环冷却水',
    description: '工业循环冷却水系统补充水水质要求',
    source: 'GB/T 50050-2017',
    category: 'industrial',
    params: {
      ph: { min: 6.8, max: 9.5, unit: '', description: 'pH值' },
      turbidity: { max: 10, unit: 'NTU', description: '浊度' },
      tds: { max: 2500, unit: 'mg/L', description: '溶解性总固体' },
      hardness: { max: 450, unit: 'mg/L', description: '总硬度' },
      chloride: { max: 500, unit: 'mg/L', description: '氯离子(不锈钢系统≤250)' },
      sulfate: { max: 500, unit: 'mg/L', description: '硫酸根' },
      iron: { max: 1.0, unit: 'mg/L', description: '总铁' },
    }
  },
  
  // 锅炉给水标准(低压锅炉)
  {
    id: 'boiler_low_pressure',
    name: '低压锅炉给水',
    description: '额定蒸汽压力≤2.5MPa的锅炉给水',
    source: 'GB/T 1576-2018',
    category: 'industrial',
    params: {
      ph: { min: 7, max: 10, unit: '', description: 'pH值(25℃)' },
      hardness: { max: 0.03, unit: 'mmol/L', description: '总硬度' },
      tds: { max: 4000, unit: 'mg/L', description: '溶解固形物' },
      iron: { max: 0.3, unit: 'mg/L', description: '全铁' },
      chloride: { max: 400, unit: 'mg/L', description: '氯离子' },
    }
  },
];

// 获取标准分类
export const standardCategories = [
  { id: 'drinking', name: '饮用水标准', icon: 'droplets' },
  { id: 'surface', name: '地表水标准', icon: 'waves' },
  { id: 'membrane', name: '膜系统进水', icon: 'filter' },
  { id: 'electronic', name: '电子级纯水', icon: 'cpu' },
  { id: 'industrial', name: '工业用水', icon: 'factory' },
];

// 根据ID获取标准
export function getStandardById(id: string): WaterQualityStandard | undefined {
  return waterQualityStandards.find(s => s.id === id);
}

// 根据分类获取标准列表
export function getStandardsByCategory(category: string): WaterQualityStandard[] {
  return waterQualityStandards.filter(s => s.category === category);
}

// RO进水限值（关键参数）
export const roFeedLimits = {
  sdi: { max: 5, optimal: 3, unit: '', description: '污染指数，必须<5' },
  turbidity: { max: 1, optimal: 0.2, unit: 'NTU', description: '浊度' },
  chlorine: { max: 0.1, optimal: 0, unit: 'mg/L', description: '游离氯，复合膜对氯敏感' },
  iron: { max: 0.3, optimal: 0.1, unit: 'mg/L', description: '铁离子' },
  manganese: { max: 0.05, optimal: 0.02, unit: 'mg/L', description: '锰离子' },
  silica: { max: 100, optimal: 50, unit: 'mg/L', description: '二氧化硅，高温高pH易结垢' },
  barium: { max: 0.05, optimal: 0.01, unit: 'mg/L', description: '钡离子，易形成BaSO4垢' },
  strontium: { max: 0.1, optimal: 0.05, unit: 'mg/L', description: '锶离子，易形成SrSO4垢' },
  orp: { max: 300, optimal: 200, unit: 'mV', description: '氧化还原电位' },
};

// LSI饱和指数计算相关
export const lsiConstants = {
  // CaCO3溶解度常数
  Ksp_CaCO3: 4.5e-9,
  // 温度系数
  tempCoefficients: [
    { temp: 0, A: 2.60 },
    { temp: 10, A: 2.20 },
    { temp: 20, A: 2.10 },
    { temp: 30, A: 2.00 },
    { temp: 40, A: 1.90 },
    { temp: 50, A: 1.80 },
    { temp: 60, A: 1.70 },
    { temp: 70, A: 1.60 },
    { temp: 80, A: 1.50 },
  ]
};

// 水质类型判断
export function classifyWaterQuality(params: WaterQualityParams): {
  type: string;
  tdsLevel: string;
  hardnessLevel: string;
  suitability: string[];
  warnings: string[];
} {
  const tds = params.tds || 0;
  const hardness = params.hardness || 0;
  const cod = params.cod || 0;
  const sdi = params.sdi || 0;
  const turbidity = params.turbidity || 0;
  const chlorine = params.chlorine || 0;
  const iron = params.iron || 0;
  const silica = params.silica || 0;
  
  // TDS分类
  let tdsLevel = '';
  if (tds < 500) tdsLevel = '低盐度 (<500 mg/L)';
  else if (tds < 2000) tdsLevel = '苦咸水 (500-2000 mg/L)';
  else if (tds < 5000) tdsLevel = '中盐度 (2000-5000 mg/L)';
  else if (tds < 15000) tdsLevel = '高盐度 (5000-15000 mg/L)';
  else if (tds < 35000) tdsLevel = '海水 (15000-35000 mg/L)';
  else tdsLevel = '高盐度海水 (>35000 mg/L)';
  
  // 硬度分类
  let hardnessLevel = '';
  if (hardness < 75) hardnessLevel = '软水 (<75 mg/L)';
  else if (hardness < 150) hardnessLevel = '中等硬度 (75-150 mg/L)';
  else if (hardness < 300) hardnessLevel = '硬水 (150-300 mg/L)';
  else hardnessLevel = '极硬水 (>300 mg/L)';
  
  // 水源类型判断
  let type = '地表水';
  if (tds > 1000 && tds < 5000) type = '苦咸水';
  else if (tds > 5000 && tds < 35000) type = '亚海水';
  else if (tds >= 35000) type = '海水';
  else if (cod < 5 && turbidity < 1) type = '自来水';
  else if (cod > 50 || sdi > 5) type = '废水';
  
  // 适用性分析
  const suitability: string[] = [];
  const warnings: string[] = [];
  
  // RO适用性
  if (sdi <= 5 && turbidity <= 1) {
    suitability.push('符合RO进水要求');
  } else {
    warnings.push(`RO前需预处理：SDI=${sdi}(需≤5)，浊度=${turbidity}NTU(需≤1)`);
  }
  
  if (chlorine > 0.1) {
    warnings.push(`余氯过高(${chlorine}mg/L)，需脱氯处理防止膜氧化`);
  }
  
  if (iron > 0.3) {
    warnings.push(`铁离子过高(${iron}mg/L)，可能导致膜污染`);
  }
  
  if (silica > 100) {
    warnings.push(`二氧化硅偏高(${silica}mg/L)，高温条件下易结垢`);
  }
  
  if (hardness > 150) {
    suitability.push('建议增加软化预处理');
  }
  
  return {
    type,
    tdsLevel,
    hardnessLevel,
    suitability,
    warnings
  };
}
