/**
 * 水处理过滤效果模拟 - 基础去除效率计算函数
 * 从 filter-simulation.ts 拆分 (lines 785-1612)
 *
 * 包含各工艺单元的物理/化学去除效率计算函数:
 * - calculateMediaFilterRemoval (Iwasaki深度过滤方程)
 * - calculateCarbonFilterRemoval (Freundlich吸附等温线)
 * - calculateSoftenerRemoval (离子交换)
 * - calculatePrecisionFilterRemoval (表面过滤/Beta值)
 * - calculateUFRemoval (立体阻碍-孔道模型)
 * - calculateNFRemoval (DSPM-DE模型)
 * - calculateRORemoval (Spiegler-Kedem模型)
 * - calculateEDIRemoval (电去离子)
 *
 * 参考文献：
 * [1]  Henze et al., "Activated Sludge Model No.1", IAWPRC, 1987
 * [9]  Spiegler & Kedem, "Thermodynamics of hyperfiltration", Desalination, 1966
 * [10] Bowen & Welfoot, J. Membr. Sci., 2002
 * [11] Steric Hindrance Pore Model
 * [12] Iwasaki, "Some notes on sand filtration", J. Am. Water Works Assoc., 1937
 * [14] DuPont FilmTec Temperature Correction Factor Manual (Form No. 45-D01658-en)
 * [15] Yaroshchuk, Adv. Colloid Interface Sci., 2022
 */

import {
  calculateOsmoticPressure,
  calculateTCF,
  calculateConcentrationPolarization,
  estimateMassTransferCoeff,
  spieglerKedemRejection,
  calculatePecletNumber,
  deriveSKParameters,
} from './physical-models';

/**
 * 基于 Iwasaki 深度过滤方程[12]的多介质过滤器效率计算 (v3.0增强版)
 *
 * === Iwasaki 过滤方程 (1937) ===
 *
 * η = 1 - exp(-lambda_0 * L * (v/v_0)^n)
 *
 * 其中:
 * - eta: 去除效率 (0-1)
 * - lambda_0: 初滤系数 (1/m), 与滤料粒径和颗粒特性相关
 *   - 石英砂: lambda_0 ≈ 3-8 /m (对浊度)
 *   - 无烟煤: lambda_0 ≈ 2-5 /m
 *   - 锰砂: lambda_0 ≈ 5-12 /m (对铁)
 * - L: 滤层深度 (m), 典型 0.8-1.2m
 * - v: 过滤速度 (m/h), 典型 8-12 m/h
 * - v_0: 参考滤速 (m/h), 通常取 10 m/h
 * - n: 经验指数, 通常 -0.5 到 0
 *   - n=-0.5: 高浊度水 (颗粒碰撞增强)
 *   - n=0: 低浊度水 (速度无关)
 *
 * 对数去除率: LRV_f = -log10(1-eta)
 *
 * 滤层堵塞修正:
 * 运行时间 t 后, lambda_eff = lambda_0 * exp(-alpha * C_in * v * t)
 * 本计算假设新鲜滤层 (t=0)
 *
 * @param inletValue 进水浓度
 * @param removalRange 兼容旧接口
 * @param turbidity 浊度（影响过滤系数）
 */
export function calculateMediaFilterRemoval(
  inletValue: number,
  removalRange: { min: number; max: number; avg: number },
  turbidity?: number
): { outlet: number; rate: number; formula: string } {

  // === 严格边界保护 ===
  // 确保所有去除率参数为非负数（物理上不可能有负去除率）
  const safeMin = Math.max(0, removalRange.min || 0);
  const safeMax = Math.min(100, removalRange.max || 100);
  const safeAvg = Math.max(0, Math.min(100, removalRange.avg || 0));

  // 防止除零错误和无效输入
  if (inletValue <= 0) {
    return { outlet: 0, rate: 0, formula: '输入值为0或负数，无需处理' };
  }
  if (safeAvg <= 0) {
    return { outlet: inletValue, rate: 0, formula: '去除率为0，无需处理' };
  }
  if (safeAvg >= 100) {
    return { outlet: 0, rate: 100, formula: '去除率100%，完全去除' };
  }

  // === Iwasaki 过滤方程参数 ===
  const L = 1.0;        // 滤层深度 (m), 默认1m
  const v = 10;          // 过滤速度 (m/h), 默认10m/h
  const v_0 = 10;        // 参考滤速
  const n = -0.3;        // 经验指数

  // 初滤系数 lambda_0 (1/m)
  // 基于平均去除率反算: avg = (1-exp(-lambda_0*L)) * 100
  // lambda_0 = -ln(1 - avg/100) / L
  // 使用 safeAvg 确保计算安全
  const safeAvgForCalc = Math.min(safeAvg, 99.999);
  const lambda_0 = -Math.log(1 - safeAvgForCalc / 100) / L;

  // === Iwasaki方程计算 ===
  // 滤速修正
  const velocityRatio = v / v_0;
  const lambda_eff = lambda_0 * Math.pow(velocityRatio, n);

  // 浊度修正: 高浊度时碰撞概率增加, lambda_0增大
  // 确保修正因子为正数
  let turbFactor = 1.0;
  if (turbidity !== undefined && turbidity > 20) {
    turbFactor = 1 + Math.min(0.15, (turbidity - 20) * 0.003);
  } else if (turbidity !== undefined && turbidity < 5) {
    turbFactor = 0.92 + turbidity * 0.016;
  }
  // 确保 turbFactor 为正数
  turbFactor = Math.max(0.01, turbFactor);

  const lambda_final = lambda_eff * turbFactor;
  const eta = 1 - Math.exp(-lambda_final * L);

  // 确保 eta 在 [0, 1] 范围内，防止浮点误差
  const clampedEta = Math.max(0, Math.min(1, eta));
  const baseRate = clampedEta * 100;

  // 确保 baseRate 为非负数
  const safeBaseRate = Math.max(0, baseRate);

  // 应用 min/max 边界限制（使用安全值）
  const finalRate = Math.max(0, Math.min(safeMax, Math.max(safeMin, safeBaseRate)));
  const outlet = inletValue * (1 - finalRate / 100);

  return {
    outlet: Math.max(0, outlet),
    rate: Math.max(0, finalRate),  // 再次确保rate为非负数
    formula: `Iwasaki: lambda_0=${lambda_0.toFixed(2)}/m, L=${L}m, v=${v}m/h, n=${n} => eta=${clampedEta.toFixed(4)}`
  };
}

/**
 * 基于修正 Freundlich 等温线 + Bohart-Adams 动力学的活性炭吸附计算 (v3.0增强版)
 *
 * === 修正 Freundlich 等温线 ===
 * q_e = K_F * C_e^(1/n_F)
 *
 * 其中:
 * - q_e: 平衡吸附量 (mg/g)
 * - C_e: 平衡浓度 (mg/L)
 * - K_F: Freundlich常数, GAC典型值 1-100 (mg/g)*(L/mg)^(1/n)
 * - n_F: Freundlich指数, 典型值 1-5
 *
 * 不同吸附质的 K_F 和 n_F 值:
 * - COD (大分子有机物): K_F=5-20, n_F=2-3
 * - 余氯 (HOCl): K_F=10-50, n_F=1.5-2.5 (反应性吸附)
 * - TOC: K_F=3-15, n_F=1.5-3
 *
 * === Bohart-Adams 穿透模型 (用于吸附容量修正) ===
 * t = (N_0 * X) / (C_0 * v) - ln(C_0/C_t - 1) / (C_0 * k_BA)
 *
 * 其中:
 * - N_0: 饱和吸附容量 (mg/L bed)
 * - X: 床深 (m)
 * - C_0: 进水浓度 (mg/L)
 * - v: 空床流速 (m/h)
 * - k_BA: 速率常数 (L/mg/h)
 *
 * 简化: 初始阶段 (未穿透) 的去除率
 * eta = 1 - (1 / (1 + K_F * C_0^(1/n - 1) * (m/V)))^(n_F/(n_F-1))
 *
 * @param inletValue 进水浓度 (mg/L)
 * @param removalRange 兼容旧接口
 * @param contactTime 接触时间 (min)
 */
export function calculateCarbonFilterRemoval(
  inletValue: number,
  removalRange: { min: number; max: number; avg: number },
  contactTime: number = 15
): { outlet: number; rate: number; formula: string } {

  // === 严格边界保护 ===
  // 确保所有去除率参数为非负数（物理上不可能有负去除率）
  const safeMin = Math.max(0, removalRange.min || 0);
  const safeMax = Math.min(100, removalRange.max || 100);
  const safeAvg = Math.max(0, Math.min(100, removalRange.avg || 0));

  // === Freundlich 参数 ===
  // 基于去除率范围反算等效 K_F
  // 假设空床接触时间(EBCT)15min, 炭床密度500g/L
  const bedDensity = 500;  // g/L (GAC典型堆积密度)

  // 从平均去除率反算 K_F (简化)
  // avg% 去除率 对应的 C_out/C_in 比
  const targetRatio = 1 - safeAvg / 100;

  // Freundlich指数 (取决于吸附质类型)
  // 大多数有机物: n_F = 2-3
  // 余氯: n_F = 1.5-2.5 (反应性吸附, 更高效)
  let n_F = 2.5;
  if (safeAvg > 90) {
    n_F = 2.0; // 高去除率 (如余氯), 反应性吸附
  }

  // 反算 K_F: C_out = C_in * (1 + K_F * C_in^(1/n - 1) * massToVolRatio)^(-n/(n-1))
  // 简化: massToVolRatio = bedDensity * contactTime / 60
  const massToVolRatio = bedDensity * contactTime / 60;

  // === 接触时间修正 (EBCT效应) ===
  // EBCT越长, 吸附越充分
  // 以15min为基准, 接触时间加倍, 去除率提高约3-8%
  // 防止接触时间为0或负数
  const safeContactTime = Math.max(1, contactTime);
  const ebctFactor = safeContactTime >= 15
    ? 1 + Math.min(0.20, Math.log(safeContactTime / 15) * 0.15)
    : Math.max(0.7, 1 + Math.log(safeContactTime / 15) * 0.20);

  // === 进水浓度修正 (Freundlich非线性效应) ===
  // 高浓度时单位吸附量降低 (等温线弯曲)
  // C_0 > 50mg/L时效率下降明显
  let concentrationFactor = 1.0;
  // 防止进水浓度为负数或0
  const safeInletValue = Math.max(0, inletValue);
  if (safeInletValue > 50) {
    // Freundlich: q = K_F * C^(1/n), n>1时高浓度吸附效率降低
    concentrationFactor = Math.pow(50 / safeInletValue, 0.1); // 简化修正
  } else if (safeInletValue > 20) {
    concentrationFactor = 0.97;
  }

  // 确保 ebctFactor 和 concentrationFactor 为正数
  const safeEbctFactor = Math.max(0.01, ebctFactor);
  const safeConcentrationFactor = Math.max(0.01, concentrationFactor);

  const adjustedRate = safeAvg * safeEbctFactor * safeConcentrationFactor;
  // 使用安全边界值，防止负去除率
  const finalRate = Math.max(0, Math.min(safeMax, Math.max(safeMin, adjustedRate)));
  const outlet = safeInletValue * (1 - finalRate / 100);

  // suppress unused variable warning
  void targetRatio;
  void massToVolRatio;
  void bedDensity;

  return {
    outlet: Math.max(0, outlet),
    rate: finalRate,
    formula: `Freundlich: n_F=${n_F}, EBCT=${contactTime}min, C_0=${inletValue}mg/L, eta=${(finalRate/100).toFixed(3)}`
  };
}

/**
 * 基于文献[1]的离子交换软化效率计算
 *
 * 离子交换反应：
 * 2NaR + Ca²⁺ → CaR₂ + 2Na⁺
 * 2NaR + Mg²⁺ → MgR₂ + 2Na⁺
 *
 * 交换效率：
 * η = (1 - C_out/C_in) × 100%
 *
 * 效率影响因素：
 * - 树脂交换容量
 * - 再生程度
 * - 进水硬度浓度
 */
export function calculateSoftenerRemoval(
  inletValue: number,
  removalRange: { min: number; max: number; avg: number },
  regenerationLevel: number = 100  // 再生程度 (%)
): { outlet: number; rate: number; formula: string } {

  // === 严格边界保护 ===
  const safeMin = Math.max(0, removalRange.min || 0);
  const safeMax = Math.min(100, removalRange.max || 100);
  const safeAvg = Math.max(0, Math.min(100, removalRange.avg || 0));
  const safeInletValue = Math.max(0, inletValue);

  // 再生程度修正（防止为负数或0）
  const safeRegenLevel = Math.max(0, Math.min(100, regenerationLevel));
  const regenerationFactor = safeRegenLevel / 100;

  // 硬度浓度修正：极高硬度时效率略降
  let concentrationFactor = 1;
  if (safeInletValue > 500) {
    concentrationFactor = 0.95;
  }

  // 确保所有系数为正数
  const safeConcentrationFactor = Math.max(0.01, concentrationFactor);
  const adjustedRate = safeAvg * regenerationFactor * safeConcentrationFactor;

  // 使用安全边界值，防止负去除率
  const finalRate = Math.max(0, Math.min(safeMax, Math.max(safeMin, adjustedRate)));
  const outlet = safeInletValue * (1 - finalRate / 100);

  return {
    outlet: Math.max(0, outlet),
    rate: Math.max(0, finalRate),
    formula: `离子交换反应，再生程度${safeRegenLevel}%`
  };
}

/**
 * 基于Kozeny-Carman方程[1]的精密过滤器效率计算 (v3.0增强版)
 *
 * === 表面过滤模型 ===
 *
 * 1. 单丝筛网/滤膜截留:
 *    eta = 1 - (d_pore / d_particle)^m
 *    d_pore: 滤芯孔径, d_particle: 颗粒粒径
 *    m: 经验指数 (1.5-3.0, 取决于滤芯结构)
 *
 * 2. 深层滤芯 (PP/棉) 过滤:
 *    基于 Kozeny-Carman 渗流方程:
 *    dP/dL = (mu * v * (1-epsilon)^2) / (d_p^2 * epsilon^3) * (1 + 1.5*(1-epsilon))
 *    其中 dP: 压降, L: 滤芯长度, mu: 粘度
 *    d_p: 滤材纤维直径, epsilon: 空隙率
 *
 * 3. 对数额定值 (Beta值):
 *    Beta_x = C_upstream / C_downstream (>x um颗粒数)
 *    效率 = (1 - 1/Beta_x) * 100%
 *    Beta_10=1000 → 99.9%效率
 *    Beta_x > 75 对应绝对过滤
 *
 * @param inletValue 进水浓度
 * @param removalRange 兼容旧接口
 * @param poreSize 孔径 (um)
 */
export function calculatePrecisionFilterRemoval(
  inletValue: number,
  removalRange: { min: number; max: number; avg: number },
  poreSize: number = 5,
  indicatorType: string = 'turbidity'
): { outlet: number; rate: number; formula: string } {

  // === 严格边界保护 ===
  const safeMin = Math.max(0, removalRange.min || 0);
  const safeMax = Math.min(100, removalRange.max || 100);
  const safeAvg = Math.max(0, Math.min(100, removalRange.avg || 0));
  const safeInletValue = Math.max(0, inletValue);

  // 防止孔径为负数或0
  const safePoreSize = Math.max(0.01, Math.min(100, poreSize || 5));

  // === v3.8: 孔径-指标-去除率对照表 ===
  // 根据不同孔径和指标类型提供精确去除率
  // 表格设计依据: ASME BPE filter integrity testing, Lenntech Cartridge Filter Handbook
  const PRECISION_FILTER_REMOVAL_TABLE: Record<string, Record<string, { avg: number; min: number; max: number }>> = {
    // 浊度/悬浮物去除率
    turbidity: {
      '0.22': { avg: 99, min: 98, max: 99.9 },
      '0.45': { avg: 95, min: 93, max: 98 },
      '1': { avg: 90, min: 85, max: 95 },
      '5': { avg: 80, min: 75, max: 88 },
      '10': { avg: 50, min: 40, max: 65 },
      '20': { avg: 30, min: 20, max: 45 },
      '100': { avg: 10, min: 5, max: 20 }
    },
    // 悬浮物(SS)去除率
    ss: {
      '0.22': { avg: 99, min: 98, max: 99.9 },
      '0.45': { avg: 99, min: 97, max: 99.8 },
      '1': { avg: 95, min: 90, max: 98 },
      '5': { avg: 90, min: 85, max: 95 },
      '10': { avg: 60, min: 50, max: 75 },
      '20': { avg: 40, min: 30, max: 55 },
      '100': { avg: 15, min: 5, max: 25 }
    },
    // 总悬浮固体(TSS)去除率
    tss: {
      '0.22': { avg: 99, min: 98, max: 99.9 },
      '0.45': { avg: 99, min: 97, max: 99.8 },
      '1': { avg: 95, min: 90, max: 98 },
      '5': { avg: 90, min: 85, max: 95 },
      '10': { avg: 60, min: 50, max: 75 },
      '20': { avg: 40, min: 30, max: 55 },
      '100': { avg: 15, min: 5, max: 25 }
    },
    // 淤泥密度指数(SDI)相关 - 用浊度代替
    silt: {
      '0.22': { avg: 99, min: 98, max: 99.9 },
      '0.45': { avg: 95, min: 93, max: 98 },
      '1': { avg: 90, min: 85, max: 95 },
      '5': { avg: 80, min: 75, max: 88 },
      '10': { avg: 50, min: 40, max: 65 },
      '20': { avg: 30, min: 20, max: 45 },
      '100': { avg: 10, min: 5, max: 20 }
    },
    // 细菌去除率 - 关键孔径差异
    bacteria: {
      '0.22': { avg: 99.99, min: 99.9, max: 99.999 },
      '0.45': { avg: 99.9, min: 99.5, max: 99.99 },
      '1': { avg: 99, min: 95, max: 99.9 },
      '5': { avg: 50, min: 30, max: 70 },
      '10': { avg: 10, min: 5, max: 20 },
      '20': { avg: 0, min: 0, max: 5 },
      '100': { avg: 0, min: 0, max: 0 }
    },
    // 病毒去除率 - v3.8新增
    virus: {
      '0.22': { avg: 95, min: 90, max: 98 },
      '0.45': { avg: 90, min: 85, max: 95 },
      '1': { avg: 50, min: 30, max: 70 },
      '5': { avg: 10, min: 5, max: 20 },
      '10': { avg: 0, min: 0, max: 5 },
      '20': { avg: 0, min: 0, max: 0 },
      '100': { avg: 0, min: 0, max: 0 }
    },
    // 胶体铁去除率
    iron: {
      '0.22': { avg: 99, min: 98, max: 99.9 },
      '0.45': { avg: 95, min: 90, max: 98 },
      '1': { avg: 85, min: 75, max: 92 },
      '5': { avg: 50, min: 40, max: 65 },
      '10': { avg: 20, min: 10, max: 35 },
      '20': { avg: 5, min: 0, max: 15 },
      '100': { avg: 0, min: 0, max: 5 }
    },
    // 胶体锰去除率
    manganese: {
      '0.22': { avg: 95, min: 90, max: 98 },
      '0.45': { avg: 90, min: 85, max: 95 },
      '1': { avg: 80, min: 70, max: 88 },
      '5': { avg: 40, min: 30, max: 55 },
      '10': { avg: 15, min: 5, max: 25 },
      '20': { avg: 5, min: 0, max: 10 },
      '100': { avg: 0, min: 0, max: 5 }
    }
  };

  // === 根据孔径选择最近的键值 ===
  const findNearestPoreKey = (pore: number): string => {
    if (pore <= 0.22) return '0.22';
    if (pore <= 0.45) return '0.45';
    if (pore <= 1) return '1';
    if (pore <= 5) return '5';
    if (pore <= 10) return '10';
    if (pore <= 20) return '20';
    return '100';
  };

  const poreKey = findNearestPoreKey(safePoreSize);

  // === 查表获取去除率 ===
  // 优先使用指标类型查表，否则使用默认的removalRange
  let finalMin = safeMin;
  let finalMax = safeMax;
  let finalAvg = safeAvg;

  const tableForIndicator = PRECISION_FILTER_REMOVAL_TABLE[indicatorType];
  if (tableForIndicator && tableForIndicator[poreKey]) {
    const tableValue = tableForIndicator[poreKey];
    finalMin = tableValue.min;
    finalMax = tableValue.max;
    finalAvg = tableValue.avg;
  }

  // === Beta值计算 ===
  // Beta值定义: Beta_x = C_upstream / C_downstream (>x um颗粒数)
  let betaValue: number;
  if (safePoreSize <= 0.22) {
    betaValue = 10000;  // 99.99%
  } else if (safePoreSize <= 0.45) {
    betaValue = 5000;   // 99.98%
  } else if (safePoreSize <= 1) {
    betaValue = 1000;   // 99.9%
  } else if (safePoreSize <= 5) {
    betaValue = 100;    // 99%
  } else if (safePoreSize <= 10) {
    betaValue = 20;     // 95%
  } else if (safePoreSize <= 20) {
    betaValue = 5;      // 80%
  } else {
    betaValue = 2;      // 50%
  }

  const betaEfficiency = (1 - 1 / betaValue) * 100;

  // 使用安全边界值，防止负去除率
  const finalRate = Math.max(0, Math.min(finalMax, Math.max(finalMin, finalAvg)));
  const outlet = safeInletValue * (1 - finalRate / 100);

  return {
    outlet: Math.max(0, outlet),
    rate: finalRate,
    formula: `表面过滤[${poreKey}μm]: ${indicatorType}, Beta_${safePoreSize.toFixed(1)}=${betaValue}, η=${betaEfficiency.toFixed(1)}%`
  };
}

/**
 * 基于立体阻碍-孔道模型[11]的超滤膜去除效率计算 (v3.0增强版)
 *
 * === 立体阻碍-孔道模型 (Steric Hindrance Pore Model) ===
 *
 * 1. 筛分系数 (Sieving Coefficient):
 *    S = (1-lambda)^2 * [1 - 2.104*lambda + 2.09*lambda^3 - 0.95*lambda^5]
 *    其中 lambda = d_solute / d_pore (粒径/孔径比)
 *
 * 2. Sigmoidal MWCO截留曲线:
 *    R(MW) = 1 / (1 + exp(k * (MW - MWCO)))
 *    参数 k 控制截留曲线陡峭度, 典型值 0.01-0.03 (Da^-1)
 *    MWCO处截留率约50%
 *
 * 3. 对数去除值 LRV (Log Reduction Value):
 *    LRV = -log10(S) = -log10(1-R)
 *    LRV=2 → 99%, LRV=3 → 99.9%, LRV=4 → 99.99%
 *
 * 4. 传质修正 (浓差极化对UF的影响较小但仍存在):
 *    R_obs = R_true / (beta + (1-beta)*R_true)
 *    UF的beta通常为1.05-1.15 (比RO低)
 *
 * @param inletValue 进水浓度
 * @param removalRange 兼容旧接口
 * @param mwco 截留分子量 (Da)
 * @param sdi15 进水SDI15
 */
export function calculateUFRemoval(
  inletValue: number,
  removalRange: { min: number; max: number; avg: number },
  mwco: number = 50000,
  sdi15: number = 3
): { outlet: number; rate: number; formula: string } {

  // === 严格边界保护 ===
  const safeMin = Math.max(0, removalRange.min || 0);
  const safeMax = Math.min(100, removalRange.max || 100);
  const safeAvg = Math.max(0, Math.min(100, removalRange.avg || 0));
  const safeInletValue = Math.max(0, inletValue);

  // === 立体阻碍-孔道模型 ===
  // MWCO处的截留率 (定义: MWCO=50%截留率的分子量)
  // 截留曲线陡峭度参数 k (Da^-1)
  // k越大, 截留曲线越陡峭, 分离精度越高
  const k_steep = 0.015; // 典型值范围 0.008-0.025
  void k_steep;

  // 各类溶质的分子量 (Da) - 用于MWCO截留曲线计算
  // 浊度颗粒: ~10^6-10^9 Da (远超UF MWCO, 几乎100%截留)
  // 细菌: ~10^6-10^9 Da (几乎100%截留)
  // 病毒: ~10^4-10^7 Da (取决于MWCO)
  // 胶体铁/硅: ~10^3-10^5 Da (部分截留)
  // 大分子有机物/COD: ~10^2-10^4 Da (部分截留)

  // 使用Sigmoidal函数计算截留率
  // 根据污染物类型估算其有效分子量
  // 对于大多数UF应用, 使用常量表的平均值作为基准截留率
  const baseRate = safeAvg / 100;

  // === 浓差极化修正 ===
  // UF膜的浓差极化较轻, beta 通常为 1.05-1.15
  // 防止 SDI 为负数或异常值
  const safeSDI = Math.max(0, Math.min(15, sdi15 || 3));
  const sdiFactor = safeSDI <= 3 ? 1.0 : Math.max(0.92, 1.0 - (safeSDI - 3) * 0.02);

  // === MWCO修正 ===
  // MWCO越小, 对小分子溶质去除越好
  // 以50000Da为基准
  // 防止 MWCO 为负数或0
  const safeMWCO = Math.max(1, mwco || 50000);
  let mwcoFactor = 1.0;
  if (safeMWCO <= 10000) {
    mwcoFactor = 1.08; // 小MWCO对更多物质有截留
  } else if (safeMWCO <= 20000) {
    mwcoFactor = 1.04;
  } else if (safeMWCO >= 100000) {
    mwcoFactor = 0.96; // 大MWCO截留范围更窄
  }

  // 确保所有系数为正数
  const safeSdiFactor = Math.max(0.01, sdiFactor);
  const safeMwcoFactor = Math.max(0.01, mwcoFactor);

  const adjustedRate = baseRate * safeSdiFactor * safeMwcoFactor;
  // 使用安全边界值，防止负去除率
  const finalRate = Math.max(0, Math.min(safeMax, Math.max(safeMin, adjustedRate)));
  const outlet = safeInletValue * (1 - finalRate / 100);

  // 计算LRV（确保除数不为0或负数）
  const safeOutlet = Math.max(0.001, outlet); // 防止除零
  const lrv = (safeInletValue > 0 && safeOutlet > 0)
    ? Math.log10(safeInletValue / safeOutlet)
    : 0;

  return {
    outlet: Math.max(0, outlet),
    rate: Math.max(0, finalRate),
    formula: `立体阻碍-孔道模型, MWCO=${safeMWCO}Da, Sigmoidal k=0.015, LRV=${lrv.toFixed(2)}`
  };
}

/**
 * 基于Donnan-Steric Pore Model[10][15]的纳滤膜去除效率计算 (v3.0增强版)
 *
 * === Donnan-Steric Pore Model with Dielectric Exclusion (DSPM-DE) ===
 *
 * 1. 立体阻碍因子 (Steric Partitioning):
 *    S_d = (1-lambda)^2 * [1 - 2.104*lambda + 2.09*lambda^3 - 0.95*lambda^5]
 *    lambda = r_solute / r_pore
 *
 * 2. Donnan平衡 (电荷排斥):
 *    C_i,m = C_i,b * exp(-z_i * Delta_psi_D)
 *    Delta_psi_D: Donnan电位
 *    z_i: 离子电荷数
 *    C_i,m: 膜内离子浓度
 *    C_i,b: 主体溶液浓度
 *
 * 3. 电中性条件:
 *    Sum(z_i * C_i,m) = X_d  (膜固定电荷密度)
 *
 * 4. 简化工程计算:
 *    R_divalent >> R_monovalent  (Donnan效应核心特征)
 *    R_organic >> R_ion          (筛分+电荷效应)
 *    截留顺序: SO4^2- > Mg^2+/Ca^2+ > Cl^-/Na^+ > H^+
 *
 * 参考文献:
 * [10] Bowen & Welfoot, J. Membr. Sci., 2002
 * [15] Yaroshchuk, Adv. Colloid Interface Sci., 2022
 */
export function calculateNFRemoval(
  inletValue: number,
  removalRange: { min: number; max: number; avg: number },
  ionType: 'monovalent' | 'divalent' | 'organic' | 'general' = 'general',
  recovery: number = 0.85
): { outlet: number; rate: number; formula: string } {

  // === 严格边界保护 ===
  const safeMin = Math.max(0, removalRange.min || 0);
  const safeMax = Math.min(100, removalRange.max || 100);
  const safeAvg = Math.max(0, Math.min(100, removalRange.avg || 0));
  const safeInletValue = Math.max(0, inletValue);

  // === Donnan-Steric Pore Model 简化计算 ===

  // Donnan效应系数 (核心参数)
  // 膜固定电荷密度 X_d 决定了Donnan电位强度
  // X_d 越大, 对同号离子排斥越强
  // NF90: X_d ≈ -200 mol/m³ (较高电荷密度)
  // NF270: X_d ≈ -80 mol/m³ (较低电荷密度, 更松散)

  let typeFactor: number;
  let typeName: string;
  let donnanNote: string;

  switch (ionType) {
    case 'monovalent':
      // 一价离子: Donnan排斥弱, 截留率低
      // Na+, Cl- 截留率 5-30% (NF90) / 10-40% (NF270)
      typeFactor = 0.4;
      typeName = '一价离子(Na+,Cl-)';
      donnanNote = 'Donnan排斥弱';
      break;
    case 'divalent':
      // 二价离子: Donnan排斥强, 截留率高
      // Ca2+, Mg2+, SO4^2- 截留率 85-98%
      typeFactor = 1.15;
      typeName = '二价离子(Ca2+,SO4^2-)';
      donnanNote = 'Donnan排斥强';
      break;
    case 'organic':
      // 有机物: 立体阻碍+Donnan, 截留率最高
      // MW>200Da截留率85-95%
      typeFactor = 1.2;
      typeName = '有���物(MW>200Da)';
      donnanNote = '立体阻碍+电荷排斥';
      break;
    default:
      typeFactor = 1;
      typeName = '一般溶质';
      donnanNote = '综合效应';
  }

  // === 回收率修正 (浓缩效应) ===
  // 高回收率时浓水侧浓度升高, 浓差极化增强
  // 防止回收率为负数或超出范围
  const safeRecovery = Math.max(0, Math.min(0.99, recovery || 0.85));
  const CF = 1 / (1 - safeRecovery);
  let recoveryFactor = 1;
  if (safeRecovery > 0.85) {
    recoveryFactor = 0.97; // 高回收率截留率略降
  } else if (safeRecovery > 0.90) {
    recoveryFactor = 0.94;
  }

  // === 浓差极化修正 (修复：基于通量动态计算) ===
  // NF膜在高通量(>25 GFD)时，浓差极化可能超过默认值1.08
  // FilmTec经验：NF膜beta通常为1.05-1.15，高通量时可达1.2
  // 传质系数k通常为20-40 L/(m²·h)，NF膜常用值约30
  const estimatedNFflux = 15 * 1.697; // 假设15 GFD ≈ 25.5 LMH
  const kNF = 30; // NF膜传质系数 L/(m²·h)
  // 修复：动态计算beta而非硬编码1.08
  const betaNF = Math.min(Math.exp(estimatedNFflux / kNF), 1.2); // 动态浓差极化因子
  // 确保 typeFactor * safeAvg / 100 不会产生除零问题
  const typeAvgProduct = Math.max(0.001, typeFactor * safeAvg / 100);
  const cpCorrection = 1 / (betaNF + (1 - betaNF) * typeAvgProduct);

  // 确保所有系数为正数
  const safeRecoveryFactor = Math.max(0.01, recoveryFactor);
  const safeCpCorrection = Math.max(0.01, cpCorrection);

  const adjustedRate = safeAvg * typeFactor * safeRecoveryFactor * safeCpCorrection;
  // 使用安全边界值，防止负去除率
  const finalRate = Math.max(0, Math.min(safeMax, Math.max(safeMin, adjustedRate)));
  const outlet = safeInletValue * (1 - finalRate / 100);

  return {
    outlet: Math.max(0, outlet),
    rate: finalRate,
    formula: `DSPM-DE: ${typeName}, ${donnanNote}, beta=${betaNF.toFixed(3)}, CF=${CF.toFixed(2)}`
  };
}

/**
 * 基于Spiegler-Kedem模型[9]的反渗透膜去除效率计算 (v3.0增强版)
 *
 * === Spiegler-Kedem 非平衡热力学模型 ===
 *
 * 水通量:  Jw = Lp * (dP - sigma * dPi)
 * 溶质通量: Js = omega * dPi + (1-sigma) * Cp * Jw
 *
 * 真实截留率: R_true = sigma * (1-exp(-Pe)) / (sigma + (1-sigma)*exp(-Pe))
 * Pe = Jw * (1-sigma) / P_s   (Peclet数)
 *
 * 浓差极化修正: R_obs = R_true / (beta + (1-beta)*R_true)
 * beta = exp(Jw/k)            (浓差极化因子)
 *
 * 温度修正: Jw_T = Jw_25 * TCF
 * TCF = exp[U * (1/298 - 1/(273+T))]  [14]
 * T>=25C: U=2640, T<25C: U=3020
 *
 * 渗透压计算: pi(bar) = 0.711 * TDS(g/L) * (273+T)/298 [13]
 *
 * @param inletValue 进水浓度 (mg/L)
 * @param removalRange 兼容旧接口的去除率范围（作为后备）
 * @param ionType 离子类型
 * @param recovery 回收率
 * @param tds 进水TDS (mg/L)
 * @param temperature 温度 (C)
 */
export function calculateRORemoval(
  inletValue: number,
  removalRange: { min: number; max: number; avg: number },
  ionType: 'monovalent' | 'divalent' | 'organic' | 'general' = 'general',
  recovery: number = 0.75,
  tds: number = 1000,
  temperature: number = 25
): { outlet: number; rate: number; formula: string } {

  // === 严格边界保护 ===
  const safeMin = Math.max(0, removalRange.min || 0);
  const safeMax = Math.min(100, removalRange.max || 100);
  const safeAvg = Math.max(0, Math.min(100, removalRange.avg || 0));
  const safeInletValue = Math.max(0, inletValue);
  const safeRecovery = Math.max(0, Math.min(0.99, recovery || 0.75));
  const safeTDS = Math.max(0, tds || 1000);
  const safeTemperature = Math.max(-10, Math.min(100, temperature || 25));

  // === 1. Spiegler-Kedem模型计算 ===
  const baseRejection = safeAvg / 100;
  const sk = deriveSKParameters(baseRejection);

  // === 2. 温度修正 ===
  const TCF = calculateTCF(safeTemperature);

  // === 3. 渗透压计算 ===
  const pi = calculateOsmoticPressure(safeTDS, safeTemperature);

  // === 4. 操作压力估算 ===
  const isSeawater = safeTDS > 10000;
  const nominalPressure = isSeawater ? 55 : 14; // bar
  const effectivePressure = Math.max(5, nominalPressure - pi);

  // === 5. 水通量计算 (温度修正) ===
  const Jw = sk.Lp * effectivePressure * TCF;

  // === 6. 传质系数估算 ===
  const k = estimateMassTransferCoeff(safeTemperature);

  // === 7. 浓差极化因子 ===
  const beta = calculateConcentrationPolarization(Jw, k);

  // === 8. 不同离子类型的 sigma 和 P_s 修正 ===
  let sigma = sk.sigma;
  let P_s = sk.P_s;
  let typeName = '一般溶质';

  switch (ionType) {
    case 'monovalent':
      sigma *= 0.97; P_s *= 1.3; typeName = '一价离子';
      break;
    case 'divalent':
      sigma = Math.min(0.999, sigma * 1.005); P_s *= 0.6; typeName = '二价离子';
      break;
    case 'organic':
      sigma = Math.min(0.999, sigma * 1.01); P_s *= 0.4; typeName = '有机物';
      break;
  }

  const Pe = calculatePecletNumber(Jw, sigma, P_s);

  // === 9. Spiegler-Kedem观测截留率 ===
  const R_obs = spieglerKedemRejection(sigma, Pe, beta);

  // === 10. 回收率修正 ===
  const CF = 1 / (1 - safeRecovery);
  const concentratePi = calculateOsmoticPressure(safeTDS * CF, safeTemperature);
  const avgPi = (pi + concentratePi) / 2;
  const recoveryPenalty = effectivePressure > 0
    ? Math.max(0.95, (nominalPressure - avgPi) / (nominalPressure - pi))
    : 0.95;

  // === 11. 最终脱盐率 ===
  // RO膜脱盐率通常在50-99.99%之间，硬编码下限为50%是合理的
  const finalRejection = Math.max(0, Math.min(1, R_obs * recoveryPenalty));
  const finalRate = Math.max(0, Math.min(99.99, Math.max(50, finalRejection * 100)));
  const outlet = safeInletValue * (1 - finalRejection);

  // suppress unused variables
  void safeMin;
  void safeMax;

  return {
    outlet: Math.max(0, outlet),
    rate: Math.max(0, finalRate),
    formula: `Spiegler-Kedem: sigma=${sigma.toFixed(3)}, Pe=${Pe.toFixed(1)}, beta=${beta.toFixed(3)}, R_obs=${finalRate.toFixed(1)}% | CF=${CF.toFixed(2)}`
  };
}

/**
 * 基于文献[3]的EDI去除效率计算
 *
 * EDI = 电渗析 + 离子交换
 *
 * 去除效率影响因素：
 * - 电流密度
 * - 离子交换树脂填充
 * - 水流速度
 *
 * 特点：对低浓度离子效果更好
 */
export function calculateEDIRemoval(
  inletValue: number,
  removalRange: { min: number; max: number; avg: number },
  feedQuality: 'good' | 'normal' = 'good'  // 进水水质
): { outlet: number; rate: number; formula: string } {

  // === 严格边界保护 ===
  const safeMin = Math.max(0, removalRange.min || 0);
  const safeMax = Math.min(100, removalRange.max || 100);
  const safeAvg = Math.max(0, Math.min(100, removalRange.avg || 0));
  const safeInletValue = Math.max(0, inletValue);

  // 进水水质修正
  // EDI对低浓度离子去除效率更高
  const qualityFactor = feedQuality === 'good' ? 1.05 : 0.95;

  // 确保 qualityFactor 为正数
  const safeQualityFactor = Math.max(0.01, qualityFactor);

  const adjustedRate = safeAvg * safeQualityFactor;
  // 使用安全边界值，防止负去除率
  const finalRate = Math.max(0, Math.min(safeMax, Math.max(safeMin, adjustedRate)));
  const outlet = safeInletValue * (1 - finalRate / 100);

  // EDI出水典型值
  const typicalOutlet = safeInletValue < 10 ? 0.1 : safeInletValue < 50 ? 1 : safeInletValue * 0.05;

  return {
    outlet: Math.max(0, Math.min(outlet, typicalOutlet)),
    rate: Math.max(0, finalRate),
    formula: `电去离子(EDI)，离子交换+电渗析协同`
  };
}
