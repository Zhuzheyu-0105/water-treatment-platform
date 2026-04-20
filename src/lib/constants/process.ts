// 水处理工艺相关常量和计算

// 预处理工艺选项
export const pretreatmentOptions = [
  { value: 'none', label: '无预处理', description: '直接进入主处理系统' },
  { value: 'multimedia', label: '多介质过滤', description: '去除悬浮物、浊度，保护后续膜系统' },
  { value: 'activated_carbon', label: '活性炭过滤', description: '去除有机物、余氯、色度' },
  { value: 'multimedia+carbon', label: '多介质+活性炭', description: '组合预处理，效果更好' },
  { value: 'softening', label: '软化处理', description: '去除硬度，防止结垢' },
  { value: 'iron_removal', label: '除铁锰', description: '氧化过滤去除铁锰离子' },
  { value: 'degassing', label: '脱气', description: '去除CO2、H2S等气体' },
];

// 精密过滤选项
export const precisionFilterOptions = [
  { value: 'none', label: '无', description: '' },
  { value: '100um', label: '100μm 袋式过滤', description: '粗过滤，保护超滤' },
  { value: '50um', label: '50μm 袋式过滤', description: '保护精密过滤器' },
  { value: '10um', label: '10μm 滤芯', description: '中等精度过滤' },
  { value: '5um', label: '5μm 保安过滤', description: 'RO进水标准配置' },
  { value: '1um', label: '1μm 精密过滤', description: '高精度预处理' },
  { value: '0.45um', label: '0.45μm 微滤', description: '超纯水预处理' },
];

// 主处理工艺选项
export const mainProcessOptions = [
  { value: 'ro', label: '反渗透 RO', description: '脱盐率>97%，产水TDS<50mg/L' },
  { value: 'nf', label: '纳滤 NF', description: '部分脱盐，保留矿物质' },
  { value: 'uf_only', label: '仅超滤', description: '去除浊度、细菌，不脱盐' },
  { value: 'ro+edi', label: 'RO + EDI', description: '超纯水系统，产水电阻率>15MΩ·cm' },
  { value: 'ro+mixed', label: 'RO + 混床', description: '除盐水系统，产水电阻率>10MΩ·cm' },
  { value: 'twopass_ro', label: '两级RO', description: '高脱盐要求，产水TDS<10mg/L' },
];

// 超滤系统选项
export const ufSystemOptions = [
  { value: 'none', label: '无超滤', description: '不使用超滤预处理' },
  { value: 'uf_pvdf', label: '超滤 (PVDF)', description: 'PVDF材质，耐氯性好' },
  { value: 'uf_pes', label: '超滤 (PES)', description: 'PES材质，亲水性好' },
  { value: 'uf_ps', label: '超滤 (PS)', description: 'PS材质，截留精度高' },
  { value: 'uf_pan', label: '超滤 (PAN)', description: 'PAN材质，成本低' },
];

// RO段式配置推荐
export function recommendStages(recovery: number, feedTDS: number): {
  stages: number;
  description: string;
  typicalArrangement: string;
} {
  if (recovery <= 50) {
    return {
      stages: 1,
      description: '一段式系统，适合低回收率',
      typicalArrangement: '单段布置，膜壳排列简单'
    };
  } else if (recovery <= 75) {
    return {
      stages: 2,
      description: '两段式系统，最常用配置',
      typicalArrangement: '第一段:第二段膜壳比约2:1'
    };
  } else {
    return {
      stages: 3,
      description: '三段式系统，高回收率配置',
      typicalArrangement: '第一段:第二段:第三段膜壳比约4:2:1'
    };
  }
}

// 计算段式膜壳配置
export function calculateStageVessels(
  totalVessels: number,
  stages: number
): number[] {
  const result: number[] = [];
  
  if (stages === 1) {
    result.push(totalVessels);
  } else if (stages === 2) {
    // 两段式，比例约2:1
    const stage1 = Math.ceil(totalVessels * 2 / 3);
    const stage2 = totalVessels - stage1;
    result.push(stage1, stage2);
  } else if (stages === 3) {
    // 三段式，比例约4:2:1
    const stage1 = Math.ceil(totalVessels * 4 / 7);
    const remaining = totalVessels - stage1;
    const stage2 = Math.ceil(remaining * 2 / 3);
    const stage3 = remaining - stage2;
    result.push(stage1, stage2, stage3);
  }
  
  return result;
}

// 膜壳规格
export const pressureVesselSpecs = {
  '4-inch': {
    diameter: 4,
    elements: [1, 2, 3, 4],
    maxPressure: 300, // psi
    material: 'FRP/SS',
    description: '4英寸膜壳，适合小型系统'
  },
  '8-inch': {
    diameter: 8,
    elements: [1, 2, 3, 4, 5, 6, 7],
    maxPressure: 1000, // psi (海水膜壳)
    material: 'FRP',
    description: '8英寸膜壳，工业标准'
  }
};

// 工艺流程节点类型
export interface ProcessNode {
  id: string;
  type: 'source' | 'pump' | 'filter' | 'membrane' | 'tank' | 'mixing' | 'dosage' | 'output';
  name: string;
  icon: string;
  description?: string;
  params?: Record<string, string | number>;
}

// 生成工艺流程图
export function generateProcessFlow(
  config: {
    pretreatment: string;
    precisionFilter: string;
    ufSystem: string;
    mainProcess: string;
    selectedPump?: string;
    selectedUFMembrane?: string;
    selectedROMembrane?: string;
    stages?: number;
    elementsPerVessel?: number;
    vesselsStage1?: number;
    vesselsStage2?: number;
    vesselsStage3?: number;
  }
): ProcessNode[] {
  const flow: ProcessNode[] = [];
  let nodeId = 0;
  
  // 1. 原水箱
  flow.push({
    id: `node_${nodeId++}`,
    type: 'source',
    name: '原水箱',
    icon: 'water',
    description: '原水储存'
  });
  
  // 2. 原水泵
  if (config.selectedPump) {
    flow.push({
      id: `node_${nodeId++}`,
      type: 'pump',
      name: '原水泵',
      icon: 'pump',
      params: { model: config.selectedPump }
    });
  }
  
  // 3. 预处理
  if (config.pretreatment !== 'none') {
    if (config.pretreatment.includes('multimedia')) {
      flow.push({
        id: `node_${nodeId++}`,
        type: 'filter',
        name: '多介质过滤器',
        icon: 'filter',
        description: '去除悬浮物和浊度'
      });
    }
    if (config.pretreatment.includes('carbon')) {
      flow.push({
        id: `node_${nodeId++}`,
        type: 'filter',
        name: '活性炭过滤器',
        icon: 'filter',
        description: '去除有机物和余氯'
      });
    }
    if (config.pretreatment === 'softening') {
      flow.push({
        id: `node_${nodeId++}`,
        type: 'filter',
        name: '软化器',
        icon: 'filter',
        description: '去除硬度'
      });
    }
  }
  
  // 4. 精密过滤
  if (config.precisionFilter !== 'none') {
    const filterName = precisionFilterOptions.find(o => o.value === config.precisionFilter)?.label || config.precisionFilter;
    flow.push({
      id: `node_${nodeId++}`,
      type: 'filter',
      name: filterName,
      icon: 'filter'
    });
  }
  
  // 5. 超滤系统
  if (config.ufSystem !== 'none') {
    flow.push({
      id: `node_${nodeId++}`,
      type: 'membrane',
      name: '超滤系统',
      icon: 'filter',
      params: config.selectedUFMembrane ? { model: config.selectedUFMembrane } : undefined
    });
    
    // 超滤产水泵
    flow.push({
      id: `node_${nodeId++}`,
      type: 'pump',
      name: 'UF产水泵',
      icon: 'pump'
    });
  }
  
  // 6. RO保安过滤器
  if (config.mainProcess.includes('ro')) {
    flow.push({
      id: `node_${nodeId++}`,
      type: 'filter',
      name: '5μm保安过滤器',
      icon: 'filter',
      description: '保护RO膜'
    });
    
    // RO高压泵
    flow.push({
      id: `node_${nodeId++}`,
      type: 'pump',
      name: 'RO高压泵',
      icon: 'pump',
      description: '提供RO运行压力'
    });
    
    // RO膜组
    const stages = config.stages || 2;
    const vessels = (config.vesselsStage1 || 0) + (config.vesselsStage2 || 0) + (config.vesselsStage3 || 0);
    const elements = vessels * (config.elementsPerVessel || 6);
    
    flow.push({
      id: `node_${nodeId++}`,
      type: 'membrane',
      name: 'RO膜组',
      icon: 'droplets',
      params: {
        stages: stages,
        vessels: vessels,
        elements: elements,
        model: config.selectedROMembrane || ''
      }
    });
  }
  
  // 7. 后处理 (EDI/混床)
  if (config.mainProcess === 'ro+edi') {
    flow.push({
      id: `node_${nodeId++}`,
      type: 'membrane',
      name: 'EDI电除盐',
      icon: 'zap',
      description: '超纯水制备'
    });
  } else if (config.mainProcess === 'ro+mixed') {
    flow.push({
      id: `node_${nodeId++}`,
      type: 'membrane',
      name: '混床离子交换',
      icon: 'flask',
      description: '除盐水制备'
    });
  }
  
  // 8. 产水箱
  flow.push({
    id: `node_${nodeId++}`,
    type: 'output',
    name: '产水箱',
    icon: 'check-circle',
    description: '成品水储存'
  });
  
  return flow;
}

// 加药系统配置
export const dosageOptions = {
  antiscalant: {
    name: '阻垢剂',
    purpose: '防止RO膜结垢',
    dosageRange: '2-6 mg/L',
    injectionPoint: 'RO高压泵前'
  },
  acid: {
    name: '酸 (HCl/H2SO4)',
    purpose: '调节pH，防止碳酸钙结垢',
    dosageRange: '根据pH调整',
    injectionPoint: 'RO高压泵前'
  },
  naoh: {
    name: '碱 (NaOH)',
    purpose: '调节pH，去除CO2',
    dosageRange: '根据pH调整',
    injectionPoint: '进水或产水'
  },
  smbs: {
    name: '还原剂 (NaHSO3)',
    purpose: '去除余氯，保护复合膜',
    dosageRange: '余氯的1.5-2倍',
    injectionPoint: 'RO高压泵前'
  },
  chlorine: {
    name: '消毒剂 (NaClO)',
    purpose: '杀菌消毒',
    dosageRange: '1-3 mg/L',
    injectionPoint: '预处理前或产水'
  },
  flocculant: {
    name: '絮凝剂 (PAC)',
    purpose: '混凝沉淀',
    dosageRange: '5-20 mg/L',
    injectionPoint: '预处理前'
  }
};

// 清洗系统配置
export const cleaningConfig = {
  ro: {
    name: 'RO膜化学清洗',
    triggers: [
      '标准化产水量下降10-15%',
      '标准化脱盐率下降1-2%',
      '段间压差增加10-15%'
    ],
    procedures: [
      {
        name: '低pH清洗',
        solution: '柠檬酸或HCl (pH 2-3)',
        purpose: '去除无机结垢、金属氧化物',
        duration: '30-60分钟循环'
      },
      {
        name: '高pH清洗',
        solution: 'NaOH (pH 11-12) + 表面活性剂',
        purpose: '去除有机物、生物污染',
        duration: '30-60分钟循环'
      }
    ]
  },
  uf: {
    name: 'UF膜化学清洗',
    triggers: [
      'TMP增加0.5-1.0 bar',
      '通量下降20%',
      '常规反洗无法恢复'
    ],
    procedures: [
      {
        name: 'CEB (化学加强反洗)',
        solution: 'NaClO + NaOH 或 HCl',
        purpose: '日常维护清洗',
        duration: '5-10分钟'
      },
      {
        name: 'CIP (原位清洗)',
        solution: 'NaOH + 表面活性剂 或 酸',
        purpose: '深度清洗',
        duration: '30-60分钟循环'
      }
    ]
  }
};
