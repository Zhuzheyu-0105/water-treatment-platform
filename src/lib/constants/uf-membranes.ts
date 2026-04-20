// 超滤膜数据类型和常量

export interface UFMembrane {
  brand: string;
  model: string;
  material: 'PVDF' | 'PES' | 'PS' | 'PAN';
  area: number; // 膜面积 m²
  mwco: number; // 截留分子量 kDa
  flux: number; // 典型通量 LMH
  poreSize?: string; // 孔径
  type: 'outside-in' | 'inside-out'; // 外压式/内压式
  description: string;
  length?: number; // 长度 mm
  diameter?: number; // 直径 mm
  weight?: number; // 重量 kg
  maxTemp?: number; // 最高温度 °C
  maxPressure?: number; // 最高工作压力 bar
  phRange?: string;
  cleaningPh?: string;
  maxChlorine?: number; // 耐氯能力 mg/L
  typicalTurbidity?: string;
  typicalSDI?: string;
}

// 超滤膜数据库 - 基于DuPont、Toray等厂商技术参数
export const ufMembranes: UFMembrane[] = [
  // ==================== DuPont SFP系列 - 外压式PVDF ====================
  {
    brand: 'DuPont',
    model: 'SFP-2880',
    material: 'PVDF',
    area: 77,
    mwco: 150,
    flux: 65,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: '外压式超滤膜，膜面积77m²，适合大型水处理系统',
    length: 2360,
    diameter: 225,
    weight: 52,
    maxTemp: 40,
    maxPressure: 6.25,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },
  {
    brand: 'DuPont',
    model: 'SFP-2860',
    material: 'PVDF',
    area: 51,
    mwco: 150,
    flux: 65,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: '外压式超滤膜，膜面积51m²，中等规模系统',
    length: 1860,
    diameter: 225,
    weight: 39,
    maxTemp: 40,
    maxPressure: 6.25,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },
  {
    brand: 'DuPont',
    model: 'SFP-2660',
    material: 'PVDF',
    area: 33,
    mwco: 150,
    flux: 65,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: '外压式超滤膜，膜面积33m²，小型系统',
    length: 1860,
    diameter: 165,
    weight: 24,
    maxTemp: 40,
    maxPressure: 6.25,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },
  // DuPont SFP-XP系列 - 增强型
  {
    brand: 'DuPont',
    model: 'SFP-2880XP',
    material: 'PVDF',
    area: 77,
    mwco: 150,
    flux: 80,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: '增强型外压式，更高通量80 LMH，适合优质进水',
    length: 2360,
    diameter: 225,
    weight: 52,
    maxTemp: 40,
    maxPressure: 6.25,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },
  // DuPont SFD系列 - 内压式PVDF
  {
    brand: 'DuPont',
    model: 'SFD-2880',
    material: 'PVDF',
    area: 77,
    mwco: 150,
    flux: 65,
    poreSize: '0.03μm',
    type: 'inside-out',
    description: '内压式超滤膜，膜面积77m²，适合高浊度进水',
    length: 2360,
    diameter: 225,
    weight: 52,
    maxTemp: 40,
    maxPressure: 6.25,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },
  {
    brand: 'DuPont',
    model: 'SFD-2860',
    material: 'PVDF',
    area: 51,
    mwco: 150,
    flux: 65,
    poreSize: '0.03μm',
    type: 'inside-out',
    description: '内压式超滤膜，膜面积51m²',
    length: 1860,
    diameter: 225,
    weight: 39,
    maxTemp: 40,
    maxPressure: 6.25,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },

  // ==================== Toray HFU系列 - PVDF ====================
  {
    brand: 'Toray',
    model: 'HFU-2020',
    material: 'PVDF',
    area: 50,
    mwco: 150,
    flux: 55,
    poreSize: '0.01μm',
    type: 'outside-in',
    description: '外压式超滤膜，膜面积50m²',
    length: 1860,
    diameter: 200,
    weight: 35,
    maxTemp: 40,
    maxPressure: 5.0,
    phRange: '2-11',
    cleaningPh: '1-13',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },
  {
    brand: 'Toray',
    model: 'HFU-1020',
    material: 'PVDF',
    area: 25,
    mwco: 150,
    flux: 55,
    poreSize: '0.01μm',
    type: 'outside-in',
    description: '外压式超滤膜，膜面积25m²，小型系统',
    length: 1860,
    diameter: 165,
    weight: 18,
    maxTemp: 40,
    maxPressure: 5.0,
    phRange: '2-11',
    cleaningPh: '1-13',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },

  // ==================== Pentair X-Flow系列 - PES ====================
  {
    brand: 'Pentair',
    model: 'X-Flow HFS60',
    material: 'PES',
    area: 50,
    mwco: 100,
    flux: 50,
    poreSize: '0.02-0.05μm',
    type: 'inside-out',
    description: 'PES材质，截留分子量100kDa，适合蛋白质分离',
    length: 1170,
    diameter: 200,
    weight: 28,
    maxTemp: 40,
    maxPressure: 4.0,
    phRange: '2-10',
    cleaningPh: '1-13',
    maxChlorine: 500,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },
  {
    brand: 'Pentair',
    model: 'X-Flow HFW60',
    material: 'PES',
    area: 50,
    mwco: 100,
    flux: 50,
    poreSize: '0.02-0.05μm',
    type: 'inside-out',
    description: 'PES材质，适合食品和饮料应用',
    length: 1170,
    diameter: 200,
    weight: 28,
    maxTemp: 40,
    maxPressure: 4.0,
    phRange: '2-10',
    cleaningPh: '1-13',
    maxChlorine: 500,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },

  // ==================== Asahi Kasei Microza系列 - PS ====================
  {
    brand: 'Asahi Kasei',
    model: 'Microza UNA-620A',
    material: 'PS',
    area: 60,
    mwco: 50,
    flux: 45,
    poreSize: '0.01μm',
    type: 'outside-in',
    description: 'PS材质，截留分子量50kDa，高精度过滤',
    length: 1250,
    diameter: 200,
    weight: 32,
    maxTemp: 45,
    maxPressure: 3.0,
    phRange: '2-13',
    cleaningPh: '1-14',
    maxChlorine: 1000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<3'
  },

  // ==================== 海南立升 Litree ====================
  {
    brand: 'Litree',
    model: 'LH3-1060-V',
    material: 'PVDF',
    area: 35,
    mwco: 100,
    flux: 60,
    poreSize: '0.02μm',
    type: 'outside-in',
    description: '国产PVDF超滤膜，性价比高',
    length: 1710,
    diameter: 160,
    weight: 22,
    maxTemp: 40,
    maxPressure: 5.0,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 1500,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<3'
  },
  {
    brand: 'Litree',
    model: 'LH3-2060-V',
    material: 'PVDF',
    area: 45,
    mwco: 100,
    flux: 60,
    poreSize: '0.02μm',
    type: 'outside-in',
    description: '国产PVDF超滤膜，中型系统',
    length: 1710,
    diameter: 200,
    weight: 30,
    maxTemp: 40,
    maxPressure: 5.0,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 1500,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<3'
  },

  // ==================== 美能 Memstar ====================
  {
    brand: 'Memstar',
    model: 'SMM-1060',
    material: 'PVDF',
    area: 40,
    mwco: 150,
    flux: 55,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: '国产PVDF中空纤维超滤膜',
    length: 1710,
    diameter: 160,
    weight: 24,
    maxTemp: 40,
    maxPressure: 5.0,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 1500,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<3'
  },

  // ==================== v3.2新增：Inge Dizzer系列 ====================
  // Inge已被DuPont收购，但产品线独立运营
  // Multibore多孔纤维技术是其特色
  {
    brand: 'Inge',
    model: 'Dizzer XL 0.9 MB 60 W',
    material: 'PVDF',
    area: 60,
    mwco: 150,
    flux: 70,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: 'Inge Multibore多孔纤维技术，膜面积60m²，大型系统',
    length: 1860,
    diameter: 225,
    weight: 48,
    maxTemp: 40,
    maxPressure: 6.0,
    phRange: '2-11',
    cleaningPh: '1-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2'
  },
  {
    brand: 'Inge',
    model: 'Dizzer XL 0.9 MB 40 W',
    material: 'PVDF',
    area: 40,
    mwco: 150,
    flux: 70,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: 'Inge Multibore多孔纤维技术，膜面积40m²，中型系统',
    length: 1710,
    diameter: 200,
    weight: 35,
    maxTemp: 40,
    maxPressure: 6.0,
    phRange: '2-11',
    cleaningPh: '1-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2'
  },
  {
    brand: 'Inge',
    model: 'Dizzer XL 1.5 MB 40 W',
    material: 'PVDF',
    area: 40,
    mwco: 200,
    flux: 80,
    poreSize: '0.04μm',
    type: 'outside-in',
    description: 'Inge大孔径Multibore，MWCO 200kDa，产水量更高',
    length: 1710,
    diameter: 200,
    weight: 35,
    maxTemp: 40,
    maxPressure: 6.0,
    phRange: '2-11',
    cleaningPh: '1-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2'
  },

  // ==================== v3.2新增：国产高端品牌 ====================
  // 立升 Litree（扩展型号）
  {
    brand: 'Litree',
    model: 'LH3-2080-V',
    material: 'PVDF',
    area: 80,
    mwco: 100,
    flux: 55,
    poreSize: '0.02μm',
    type: 'outside-in',
    description: '立升大型PVDF超滤膜，膜面积80m²',
    length: 2360,
    diameter: 225,
    weight: 55,
    maxTemp: 40,
    maxPressure: 5.0,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 1500,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<3'
  },
  {
    brand: 'Litree',
    model: 'LH3-1060-V',
    material: 'PVDF',
    area: 60,
    mwco: 100,
    flux: 55,
    poreSize: '0.02μm',
    type: 'outside-in',
    description: '立升中型PVDF超滤膜，膜面积60m²',
    length: 1860,
    diameter: 200,
    weight: 38,
    maxTemp: 40,
    maxPressure: 5.0,
    phRange: '2-11',
    cleaningPh: '2-12',
    maxChlorine: 1500,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<3'
  },

  // ==================== v3.2新增：赛诺 Sino-EP ====================
  {
    brand: 'Sino-EP',
    model: 'UCT-MBR-8060',
    material: 'PVDF',
    area: 60,
    mwco: 150,
    flux: 50,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: '赛诺PVDF超滤/MBR膜组件',
    length: 1860,
    diameter: 200,
    weight: 40,
    maxTemp: 40,
    maxPressure: 5.0,
    phRange: '2-11',
    cleaningPh: '1-12',
    maxChlorine: 2000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2.5'
  },

  // ==================== v3.2新增：蓝星东丽 Toray（扩展） ====================
  {
    brand: 'Toray',
    model: 'HFU-2880',
    material: 'PVDF',
    area: 75,
    mwco: 150,
    flux: 65,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: '东丽大型PVDF超滤膜，膜面积75m²',
    length: 2360,
    diameter: 225,
    weight: 50,
    maxTemp: 40,
    maxPressure: 6.0,
    phRange: '2-11',
    cleaningPh: '1-13',
    maxChlorine: 5000, // 东丽PVDF耐氯性极强
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2'
  },
  {
    brand: 'Toray',
    model: 'HFU-2860',
    material: 'PVDF',
    area: 50,
    mwco: 150,
    flux: 65,
    poreSize: '0.03μm',
    type: 'outside-in',
    description: '东丽中型PVDF超滤膜，膜面积50m²',
    length: 1860,
    diameter: 200,
    weight: 35,
    maxTemp: 40,
    maxPressure: 6.0,
    phRange: '2-11',
    cleaningPh: '1-13',
    maxChlorine: 5000,
    typicalTurbidity: '<0.1 NTU',
    typicalSDI: '<2'
  },
];

// 超滤膜材质特性对比
export const ufMaterialProperties = {
  PVDF: {
    name: '聚偏氟乙烯',
    chlorineResistance: 'excellent',
    chemicalResistance: 'excellent',
    mechanicalStrength: 'excellent',
    typicalMWCO: [100, 200, 400],
    description: '耐氯性极佳，化学稳定性好，寿命长'
  },
  PES: {
    name: '聚醚砜',
    chlorineResistance: 'good',
    chemicalResistance: 'good',
    mechanicalStrength: 'good',
    typicalMWCO: [30, 50, 100],
    description: '亲水性好，适合生物/制药应用'
  },
  PS: {
    name: '聚砜',
    chlorineResistance: 'good',
    chemicalResistance: 'good',
    mechanicalStrength: 'good',
    typicalMWCO: [30, 50, 100],
    description: '热稳定性好，截留精度高'
  },
  PAN: {
    name: '聚丙烯腈',
    chlorineResistance: 'fair',
    chemicalResistance: 'good',
    mechanicalStrength: 'fair',
    typicalMWCO: [30, 50, 100],
    description: '亲水性好，耐溶剂性较差'
  }
};

// 根据进水水质推荐超滤膜
export function recommendUFMembrane(
  turbidity: number,
  tss: number,
  cod: number,
  flow: number // m³/h
): {
  membrane: UFMembrane | null;
  count: number;
  reasoning: string;
} {
  let reasoning = '';
  let recommendedMembrane: UFMembrane | null = null;
  
  // 根据浊度和TSS选择
  if (turbidity > 100 || tss > 50) {
    // 高浊度水，推荐内压式，容易清洗
    recommendedMembrane = ufMembranes.find(m => m.type === 'inside-out' && m.model === 'SFD-2880') || ufMembranes[0];
    reasoning = '进水浊度/SS较高，推荐内压式超滤膜，易于反洗和化学清洗';
  } else if (cod > 20) {
    // 有机物高，推荐PVDF材质
    recommendedMembrane = ufMembranes.find(m => m.material === 'PVDF' && m.model === 'SFP-2880XP') || ufMembranes[0];
    reasoning = '有机物含量较高，推荐PVDF材质超滤膜，耐氯性好，易于清洗有机污染';
  } else {
    // 普通水质，标准推荐
    recommendedMembrane = ufMembranes.find(m => m.model === 'SFP-2880') || ufMembranes[0];
    reasoning = '标准PVDF外压式超滤膜，适用范围广，性价比高';
  }
  
  // 计算膜组件数量
  const flux = recommendedMembrane.flux; // LMH
  const area = recommendedMembrane.area; // m²
  const singleCapacity = (flux * area) / 1000; // m³/h
  const count = Math.ceil(flow / singleCapacity);
  
  return {
    membrane: recommendedMembrane,
    count,
    reasoning
  };
}

// 计算超滤系统参数
export function calculateUFSystem(
  membrane: UFMembrane,
  count: number,
  designFlux?: number
): {
  totalArea: number;
  designFlux: number;
  permeateFlow: number;
  backwashFlow: number;
  cebFrequency: string;
  cipFrequency: string;
} {
  const flux = designFlux || membrane.flux;
  const totalArea = membrane.area * count;
  const permeateFlow = (flux * totalArea) / 1000; // m³/h
  
  // 反洗流量约为产水流量的1.5-2倍
  const backwashFlow = permeateFlow * 1.8;
  
  // 根据设计通量确定清洗频率
  let cebFrequency = '';
  let cipFrequency = '';
  
  if (flux <= 50) {
    cebFrequency = '每天1次';
    cipFrequency = '每30-60天';
  } else if (flux <= 70) {
    cebFrequency = '每天2次';
    cipFrequency = '每15-30天';
  } else {
    cebFrequency = '每天3-4次';
    cipFrequency = '每7-15天';
  }
  
  return {
    totalArea,
    designFlux: flux,
    permeateFlow: Math.round(permeateFlow * 100) / 100,
    backwashFlow: Math.round(backwashFlow * 100) / 100,
    cebFrequency,
    cipFrequency
  };
}
