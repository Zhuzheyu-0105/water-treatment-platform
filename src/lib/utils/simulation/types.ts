/**
 * 水处理过滤效果模拟 - 类型定义模块
 * 从 filter-simulation.ts 拆分 (lines 62-166)
 *
 * 参考文献：
 * [1]  Henze et al., "Activated Sludge Model No.1", IAWPRC, 1987 (ASM1)
 * [5]  《反渗透水处理工程》- 邵刚
 * [9]  GB/T 19249-2017 反渗透水处理设备
 * [15] DuPont FilmTec Design Equations Manual (Form No. 45-D01591-en)
 */

// ROMembrane: 与 membranes.ts 中定义保持兼容的局部类型（避免循环依赖）
// 注意: ROMembrane 在此模块中导出，供 physical-models.ts 等使用
export interface ROMembrane {
  brand: string;
  model: string;
  dimension: string;
  flow: number;
  rejection: number;
  area: number;
  pressure: number;
  category: string;
  skParams?: {
    sigma: number;
    lp: number;
    ps: number;
    baseTemp?: number;
    baseTDS?: number;
    basePressure?: number;
  };
  ionRejection?: {
    na?: number; cl?: number; ca?: number; mg?: number;
    so4?: number; hco3?: number; b?: number; k?: number;
  };
  [key: string]: unknown;
}

export interface WaterQuality {
  // 基础参数
  ph: number;
  tds: number;           // 总溶解固体 (mg/L)
  conductivity: number;  // 电导率 (μS/cm)
  turbidity: number;     // 浊度 (NTU)

  // 阳离子
  hardness: number;      // 总硬度 (mg/L CaCO₃)
  calcium?: number;      // 钙 (mg/L)
  magnesium?: number;    // 镁 (mg/L)
  sodium?: number;       // 钠 (mg/L)
  potassium?: number;    // 钾 (mg/L)
  iron: number;          // 铁离子 (mg/L)
  manganese?: number;    // 锰 (mg/L)
  barium?: number;       // 钡 (mg/L)
  strontium?: number;    // 锶 (mg/L)

  // 阴离子
  chloride?: number;     // 氯离子 (mg/L)
  sulfate?: number;      // 硫酸根 (mg/L)
  bicarbonate?: number;  // 重碳酸根 (mg/L)
  silica: number;        // 二氧化硅 (mg/L)
  nitrate?: number;      // 硝酸根 (mg/L)
  fluoride?: number;     // 氟化物 (mg/L)

  // 有机物
  cod: number;           // 化学需氧量 (mg/L)
  toc?: number;          // 总有机碳 (mg/L)
  bod?: number;          // 生化需氧量 (mg/L)
  color?: number;        // 色度 (度)

  // 营养盐
  ammonia?: number;      // 氨氮 (mg/L NH3-N)
  tn?: number;           // 总氮 (mg/L)
  tp?: number;           // 总磷 (mg/L)

  // 其他
  chlorine: number;      // 余氯 (mg/L)
  sdi?: number;          // 污染指数
  bacteria?: number;     // 细菌总数 (CFU/mL)
  virus?: number;        // 病毒 (PFU/mL)
  silt?: number;         // 悬浮物 (mg/L)，>0.45μm颗粒
  ss?: number;           // 可滤残渣 (mg/L)，105°C烘干残留，代表溶解性固体
  tss?: number;          // 总悬浮固体 (mg/L)，不通过滤膜的部分
  boron?: number;        // 硼 (mg/L)，海水淡化关键指标
  temperature?: number;  // 水温 (°C)
}

export interface ProcessUnit {
  type: string;
  name: string;
  params?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface SimulationStep {
  step: number;
  unit: string;
  unitType: string;
  inlet: WaterQuality;
  outlet: WaterQuality;
  removalRates: Record<string, string>;
  notes: string;
  formula?: string;  // 使用的公式说明
}

export interface SimulationResult {
  simulation: SimulationStep[];
  finalWater: WaterQuality;
  totalRemoval: {
    tds: string;
    turbidity: string;
    cod: string;
    hardness: string;
  };
  meetsTarget: boolean;
  issues: string[];
  recommendations: string[];
}
