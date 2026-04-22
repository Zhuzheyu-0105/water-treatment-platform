/**
 * 水处理过滤效果模拟 - COD计算增强模块 (v3.4)
 * 从 filter-simulation.ts 拆分 (lines 1613-2385)
 *
 * 基于ASM1模型的COD分馏和各工艺单元COD去除精确计算
 *
 * 参考文献：
 * [1]  Henze et al., "Activated Sludge Model No.1", IAWPRC, 1987 (ASM1)
 * [9]  Spiegler & Kedem, "Thermodynamics of hyperfiltration", Desalination, 1966
 * [10] Bowen & Welfoot, J. Membr. Sci., 2002 (DSPM-DE)
 * [12] Iwasaki, "Some notes on sand filtration", J. Am. Water Works Assoc., 1937
 */

/**
 * COD分馏类型定义 (基于ASM1模型)
 *
 * 参考文献: Henze et al., IAWPRC 1987; WaterTAP ASM1 Implementation
 */
interface CODFraction {
  /** 易降解溶解性COD (mg/L) - 直接生物利用 */
  Ss: number;
  /** 惰性溶解性COD (mg/L) - 不可生物降解 */
  Si: number;
  /** 慢速可降解颗粒性COD (mg/L) - 需水解后降解 */
  Xs: number;
  /** 惰性颗粒性COD (mg/L) - 不可生物降解 */
  Xi: number;
}

/**
 * 水源COD分馏参数 (基于典型水质数据)
 */
interface CODFractionParams {
  /** S_S/S_COD 比值 (易降解/总COD) */
  fastRatio: number;
  /** S_I/S_COD 比值 (惰性溶解性/总COD) */
  inertSolubleRatio: number;
  /** X_S/X_COD 比值 (慢速可降解/总COD) */
  slowRatio: number;
  /** X_I/X_COD 比值 (惰性颗粒性/总COD) */
  inertParticulateRatio: number;
}

/**
 * COD分馏参数表 (mg/L)
 * 基于ASM1模型和典型市政污水数据
 */
const COD_FRACTION_PARAMS: Record<string, CODFractionParams> = {
  // 市政污水 (典型)
  municipal: { fastRatio: 0.15, inertSolubleRatio: 0.05, slowRatio: 0.65, inertParticulateRatio: 0.15 },
  // 工业废水 - 食品/饮料 (高易降解)
  industrial_food: { fastRatio: 0.45, inertSolubleRatio: 0.05, slowRatio: 0.40, inertParticulateRatio: 0.10 },
  // 工业废水 - 化工 (含难降解)
  industrial_chemical: { fastRatio: 0.08, inertSolubleRatio: 0.15, slowRatio: 0.47, inertParticulateRatio: 0.30 },
  // 工业废水 - 制药 (含生物抑制剂)
  industrial_pharma: { fastRatio: 0.10, inertSolubleRatio: 0.20, slowRatio: 0.40, inertParticulateRatio: 0.30 },
  // 地表水 (低有机物)
  surface_water: { fastRatio: 0.25, inertSolubleRatio: 0.10, slowRatio: 0.45, inertParticulateRatio: 0.20 },
  // 地下水 (极低有机物)
  groundwater: { fastRatio: 0.30, inertSolubleRatio: 0.15, slowRatio: 0.35, inertParticulateRatio: 0.20 },
  // RO进水 (已经过预处理)
  ro_feed: { fastRatio: 0.40, inertSolubleRatio: 0.30, slowRatio: 0.20, inertParticulateRatio: 0.10 },
  // MBR出水 (生物处理后)
  mbr_effluent: { fastRatio: 0.10, inertSolubleRatio: 0.40, slowRatio: 0.30, inertParticulateRatio: 0.20 },
};

/**
 * 有机物分子量分布参数 (Da)
 * 用于膜截留计算
 */
interface OrganicMWDistribution {
  /** 主要分子量峰值 */
  peakMW: number;
  /** 分布宽度参数 (sigma) */
  sigma: number;
  /** 范围最小值 */
  minMW: number;
  /** 范围最大值 */
  maxMW: number;
}

/**
 * 不同类型水体的有机物分子量分布
 */
const ORGANIC_MW_DISTRIBUTION: Record<string, OrganicMWDistribution> = {
  municipal: { peakMW: 1500, sigma: 0.8, minMW: 100, maxMW: 50000 },     // 市政污水
  industrial_food: { peakMW: 500, sigma: 0.6, minMW: 50, maxMW: 20000 },  // 食品废水 (小分子)
  industrial_chemical: { peakMW: 3000, sigma: 1.2, minMW: 200, maxMW: 100000 }, // 化工废水
  surface_water: { peakMW: 2000, sigma: 0.9, minMW: 100, maxMW: 30000 }, // 地表水 (腐殖质)
  ro_feed: { peakMW: 500, sigma: 0.7, minMW: 50, maxMW: 10000 },         // RO进水
  mbr_effluent: { peakMW: 300, sigma: 0.5, minMW: 30, maxMW: 5000 },     // MBR出水
};

/**
 * 膜COD截留参数
 */
interface MembraneCODParams {
  /** 截留分子量 (Da) */
  mwco: number;
  /** 截留曲线陡峭度 */
  steepness: number;
  /** 电荷效应系数 (NF/RO) */
  chargeFactor: number;
}

/**
 * 不同膜类型的COD截留参数
 */
const MEMBRANE_COD_PARAMS: Record<string, MembraneCODParams> = {
  uf_100k: { mwco: 100000, steepness: 0.012, chargeFactor: 1.0 },   // UF 100kDa
  uf_50k: { mwco: 50000, steepness: 0.015, chargeFactor: 1.0 },      // UF 50kDa (常规)
  uf_10k: { mwco: 10000, steepness: 0.018, chargeFactor: 1.0 },       // UF 10kDa
  uf_5k: { mwco: 5000, steepness: 0.020, chargeFactor: 1.0 },         // UF 5kDa (紧密)
  nf_200: { mwco: 200, steepness: 0.025, chargeFactor: 1.3 },         // NF 200Da (紧密)
  nf_300: { mwco: 300, steepness: 0.022, chargeFactor: 1.25 },       // NF 300Da
  nf_400: { mwco: 400, steepness: 0.020, chargeFactor: 1.2 },         // NF 400Da (宽松)
  ro_bw: { mwco: 50, steepness: 0.030, chargeFactor: 1.5 },          // RO BW (苦咸水)
  ro_sw: { mwco: 30, steepness: 0.035, chargeFactor: 1.6 },           // RO SW (海水)
};

/**
 * 将总COD分馏为各组分 (基于ASM1模型)
 *
 * @param totalCOD 总COD (mg/L)
 * @param waterType 水源类型
 * @returns 分馏后的COD组分
 */
function fractionateCOD(totalCOD: number, waterType: string = 'municipal'): CODFraction {
  const params = COD_FRACTION_PARAMS[waterType] || COD_FRACTION_PARAMS.municipal;

  return {
    Ss: totalCOD * params.fastRatio,
    Si: totalCOD * params.inertSolubleRatio,
    Xs: totalCOD * params.slowRatio,
    Xi: totalCOD * params.inertParticulateRatio,
  };
}

/**
 * 计算对数正态分布的概率密度
 *
 * @param x 分子量
 * @param mu ln(峰值分子量)
 * @param sigma 分布宽度
 */
function logNormalPDF(x: number, mu: number, sigma: number): number {
  if (x <= 0) return 0;
  const lnX = Math.log(x);
  return (1 / (x * sigma * Math.sqrt(2 * Math.PI))) *
         Math.exp(-Math.pow(lnX - mu, 2) / (2 * sigma * sigma));
}

/**
 * 基于分子量分布计算有机物截留率 (v3.4增强)
 *
 * 核心算法:
 * 1. 根据水源类型确定有机物分子量分布
 * 2. 对每个MW区间计算截留率
 * 3. 加权平均得到总COD截留率
 *
 * @param codFraction COD分馏结果
 * @param waterType 水源类型
 * @param membraneType 膜类型
 * @param mwco 截留分子量 (Da), 可选
 */
function calculateCODRejectionByMW(
  codFraction: CODFraction,
  waterType: string,
  membraneType: string,
  mwco?: number
): { rejection: number; details: Record<string, number>; formula: string } {

  const memParams = mwco
    ? { mwco, steepness: 0.02, chargeFactor: 1.2 }
    : (MEMBRANE_COD_PARAMS[membraneType] || MEMBRANE_COD_PARAMS.uf_50k);

  const mwDist = ORGANIC_MW_DISTRIBUTION[waterType] || ORGANIC_MW_DISTRIBUTION.municipal;
  const mu = Math.log(mwDist.peakMW);
  void mu;

  // 计算不同组分的截留率
  // 1. 易降解COD (S_S): 通常是小分子, 截留率较低
  const ssMW = mwDist.peakMW * 0.3; // S_S典型分子量
  const ssRejection = 1 / (1 + Math.exp(memParams.steepness * (Math.log(ssMW) - Math.log(memParams.mwco))));

  // 2. 慢速可降解COD (X_S): 中等分子量
  const xsMW = mwDist.peakMW;
  const xsRejection = 1 / (1 + Math.exp(memParams.steepness * (Math.log(xsMW) - Math.log(memParams.mwco))));

  // 3. 颗粒性COD (X_I, X_S中的大分子): 高截留率
  const xiMW = mwDist.maxMW;
  const xiRejection = Math.min(0.999, 1 - Math.exp(-memParams.steepness * xiMW / memParams.mwco));

  // 4. 惰性溶解性COD (S_I): 根据MWCO和膜类型
  const siMW = mwDist.peakMW * 0.5;
  const siRejection = 1 / (1 + Math.exp(memParams.steepness * (Math.log(siMW) - Math.log(memParams.mwco))));

  // 加权平均截留率
  const totalCOD = codFraction.Ss + codFraction.Si + codFraction.Xs + codFraction.Xi;
  const weightedRejection = totalCOD > 0
    ? (codFraction.Ss * ssRejection +
       codFraction.Si * siRejection +
       codFraction.Xs * xsRejection +
       codFraction.Xi * xiRejection) / totalCOD
    : 0;

  // 电荷效应修正 (NF/RO膜)
  const chargeCorrection = memParams.chargeFactor > 1
    ? 1 + (memParams.chargeFactor - 1) * (1 - weightedRejection) * 0.3
    : 1;

  const finalRejection = Math.min(0.9999, weightedRejection * chargeCorrection);

  return {
    rejection: finalRejection,
    details: {
      Ss_易降解: ssRejection * 100,
      Si_惰性溶解: siRejection * 100,
      Xs_慢速降解: xsRejection * 100,
      Xi_惰性颗粒: xiRejection * 100,
    },
    formula: `MW分布模型: MWCO=${memParams.mwco}Da, 电荷修正=${chargeCorrection.toFixed(3)}, 分布=${waterType}`
  };
}

/**
 * 基于ASM1生物降解动力学计算COD去除 (v3.4增强)
 *
 * Monod动力学方程:
 * - 异养菌生长: μ_H = μ_H,max × S_S/(K_S + S_S) × S_O/(K_O + S_O)
 * - 水解过程: r_h = k_h × X_S/(K_X + X_S)
 *
 * @param codFraction COD分馏结果
 * @param hydraulicRetentionTime 水力停留时间 (h)
 * @param sludgeRetentionTime 污泥停留时间 (d)
 * @param temperature 温度 (°C)
 * @param dissolvedOxygen 溶解氧 (mg/L)
 */
function calculateBiodegradationCOD(
  codFraction: CODFraction,
  hydraulicRetentionTime: number,
  sludgeRetentionTime: number,
  temperature: number = 25,
  dissolvedOxygen: number = 2
): { removal: number; outlet: CODFraction; biomassYield: number; formula: string } {

  // Monod动力学参数 (基于ASM1)
  const muHMax = 4.0; // 最大异养菌生长速率 (d⁻¹, 25°C)
  const KS = 20; // 半饱和常数 (gCOD/m³)
  const KOX = 0.2; // 氧半饱和常数 (gO₂/m³)
  const KH = 0.1; // 水解常数 (d⁻¹)
  const KX = 0.03; // 水解半饱和常数 (gX_S/gX_H)
  const YH = 0.67; // 异养菌产率 (gCOD_X/gCOD_S)
  const bH = 0.3; // 异养菌衰减系数 (d⁻¹)
  void bH;
  void KX;

  // 温度修正 (Arrhenius方程)
  const theta = 1.07; // 温度系数
  const tempFactor = Math.pow(theta, temperature - 25);

  // 异养菌生长速率修正
  const muH = muHMax * tempFactor * (dissolvedOxygen / (KOX + dissolvedOxygen));

  // S_S降解 (易降解COD直接利用)
  const ssUtilization = muH / YH * (codFraction.Ss / (KS + codFraction.Ss));

  // X_S水解 (慢速降解COD需先水解)
  const xsHydrolysis = KH * tempFactor * codFraction.Xs / (KX * codFraction.Xs + codFraction.Xs * 0.1 + 1);

  // SRT对生物量留存的影响
  const sludgeRetentionFactor = sludgeRetentionTime > 3 ? 1 : sludgeRetentionTime / 3;
  void sludgeRetentionFactor;

  // 计算去除的COD
  const ssRemoved = codFraction.Ss * (1 - Math.exp(-ssUtilization * hydraulicRetentionTime / 24));
  const xsHydrolyzed = codFraction.Xs * (1 - Math.exp(-xsHydrolysis * hydraulicRetentionTime / 24));

  // 惰性COD不被生物降解
  const siRemaining = codFraction.Si;
  const xiRemaining = codFraction.Xi;

  // 总去除率
  const biodegradableCOD = codFraction.Ss + codFraction.Xs;
  const removedCOD = ssRemoved + xsHydrolyzed * 0.5; // 水解后部分被降解
  const totalRemoval = biodegradableCOD > 0 ? removedCOD / biodegradableCOD : 0;

  return {
    removal: totalRemoval * 100,
    outlet: {
      Ss: codFraction.Ss - ssRemoved,
      Si: siRemaining,
      Xs: codFraction.Xs - xsHydrolyzed,
      Xi: xiRemaining,
    },
    biomassYield: (ssRemoved + xsHydrolyzed * 0.5) * YH,
    formula: `ASM1生物降解: HRT=${hydraulicRetentionTime}h, SRT=${sludgeRetentionTime}d, T=${temperature}°C, 异养菌生长率=${muH.toFixed(3)}d⁻¹`
  };
}

/**
 * 改良的多介质过滤器COD去除计算 (v3.4)
 *
 * 基于Iwasaki方程 + COD分馏修正
 *
 * @param inletCOD 进水COD (mg/L)
 * @param waterType 水源类型
 * @param turbidity 浊度 (NTU)
 * @param filterVelocity 过滤速度 (m/h)
 * @param bedDepth 滤层深度 (m)
 */
function calculateMediaFilterCODRemoval(
  inletCOD: number,
  waterType: string,
  turbidity: number = 5,
  filterVelocity: number = 10,
  bedDepth: number = 1.0
): { outlet: number; rate: number; formula: string; details: Record<string, number> } {

  const codFraction = fractionateCOD(inletCOD, waterType);

  // Iwasaki过滤方程参数
  const lambda0 = 3.5; // 初滤系数 (1/m)
  const v0 = 10; // ���考滤速 (m/h)
  const n = -0.3; // 经验指数

  // 滤速修正
  const velocityRatio = filterVelocity / v0;
  const lambdaEff = lambda0 * Math.pow(velocityRatio, n);

  // 浊度修正 (高浊度时碰撞概率增加)
  let turbFactor = 1.0;
  if (turbidity > 20) {
    turbFactor = 1 + Math.min(0.15, (turbidity - 20) * 0.003);
  } else if (turbidity < 5) {
    turbFactor = 0.92 + turbidity * 0.016;
  }

  const lambdaFinal = lambdaEff * turbFactor;

  // 不同COD组分的去除效率
  // 颗粒性COD (X_I): 高效去除 (>90%)
  const xiEfficiency = 1 - Math.exp(-lambdaFinal * bedDepth * 1.5);

  // 慢速可降解COD (X_S): 中等去除 (部分附着在颗粒上)
  const xsEfficiency = 1 - Math.exp(-lambdaFinal * bedDepth * 0.8);

  // 易降解COD (S_S): 低去除 (溶解态)
  const ssEfficiency = 1 - Math.exp(-lambdaFinal * bedDepth * 0.2);

  // 惰性溶解性COD (S_I): 几乎不去除
  const siEfficiency = 0.05;

  // 加权平均去除率
  const weightedRemoval =
    codFraction.Ss * ssEfficiency +
    codFraction.Si * siEfficiency +
    codFraction.Xs * xsEfficiency +
    codFraction.Xi * xiEfficiency;

  const totalRemovalRate = inletCOD > 0 ? (weightedRemoval / inletCOD) * 100 : 0;
  const outletCOD = inletCOD * (1 - totalRemovalRate / 100);

  return {
    outlet: Math.max(0, outletCOD),
    rate: totalRemovalRate,
    formula: `Iwasaki + COD分馏: lambda=${lambdaFinal.toFixed(2)}/m, L=${bedDepth}m, v=${filterVelocity}m/h, turb=${turbidity}NTU`,
    details: {
      'S_S去除率': ssEfficiency * 100,
      'S_I去除率': siEfficiency * 100,
      'X_S去除率': xsEfficiency * 100,
      'X_I去除率': xiEfficiency * 100,
    }
  };
}

/**
 * 改良的活性炭过滤器COD去除计算 (v3.4)
 *
 * 基于Freundlich等温线 + Bohart-Adams动力学 + COD分馏
 *
 * @param inletCOD 进水COD (mg/L)
 * @param waterType 水源类型
 * @param contactTime 接触时间 (EBCT, min)
 * @param bedDepth 炭床深度 (m)
 * @param bedDensity 活性炭堆积密度 (g/L)
 */
function calculateCarbonFilterCODRemoval(
  inletCOD: number,
  waterType: string,
  contactTime: number = 15,
  bedDepth: number = 1.2,
  bedDensity: number = 500
): { outlet: number; rate: number; formula: string; details: Record<string, number> } {

  const codFraction = fractionateCOD(inletCOD, waterType);

  // Freundlich参数 (基于不同COD组分)
  // 大分子疏水性有机物: K_F高, n_F低 (强吸附)
  // 小分子亲水性有机物: K_F低, n_F高 (弱吸附)

  const freundlichParams = {
    Ss: { KF: 5, nF: 3.5 },   // 易降解: 低吸附性
    Si: { KF: 15, nF: 2.0 },  // 惰性溶解: 中等吸附
    Xs: { KF: 50, nF: 1.5 },  // 慢速降解: 高吸附 (疏水性大分子)
    Xi: { KF: 80, nF: 1.2 },  // 惰性颗粒: 强吸附 (活性炭截留)
  };

  // 接触时间修正 (EBCT效应)
  const ebctFactor = contactTime >= 15
    ? 1 + Math.min(0.20, Math.log(contactTime / 15) * 0.15)
    : Math.max(0.7, 1 + Math.log(contactTime / 15) * 0.20);

  // 炭床质量/体积比
  const massToVolRatio = bedDensity * bedDepth / 1000; // kg/m³

  // 计算各组分的去除
  let totalRemoved = 0;
  const details: Record<string, number> = {};

  for (const [fraction, params] of Object.entries(freundlichParams)) {
    const fractionKey = fraction as keyof typeof freundlichParams;
    const codValue = codFraction[fractionKey];
    const { KF, nF } = params;

    // Freundlich吸附等温线修正
    // q_e = K_F * C_e^(1/n_F)
    // 穿透分数 B = C_out/C_in = 1/(1 + K_F * C_in^(1/n_F-1) * m/V)^(n_F/(n_F-1))
    const exponent = 1 / nF - 1;
    const adsorptionCapacity = Math.pow(codValue, exponent) * KF * massToVolRatio;
    const breakthroughFactor = 1 / Math.pow(1 + adsorptionCapacity, nF / (nF - 1));

    const removed = codValue * (1 - breakthroughFactor);
    totalRemoved += removed;
    details[`${fraction}_去除率`] = (1 - breakthroughFactor) * 100;
  }

  // 修正因子
  const adjustedRemoval = totalRemoved * ebctFactor;
  const totalRemovalRate = inletCOD > 0 ? (adjustedRemoval / inletCOD) * 100 : 0;
  const outletCOD = inletCOD * (1 - totalRemovalRate / 100);

  return {
    outlet: Math.max(0, outletCOD),
    rate: Math.min(85, totalRemovalRate), // 活性炭COD去除率上限约85%
    formula: `Freundlich等温线+EBCT: EBCT=${contactTime}min, L=${bedDepth}m, rho=${bedDensity}g/L, ${waterType}水体`,
    details,
  };
}

/**
 * 改良的UF膜COD去除计算 (v3.4)
 *
 * 基于MWCO截留曲线 + 有机物分子量分布
 *
 * @param inletCOD 进水COD (mg/L)
 * @param waterType 水源类型
 * @param mwco 截留分子量 (Da)
 * @param temperature 温度 (°C)
 * @param flux 通量 (LMH)
 */
function calculateUFCODRemoval(
  inletCOD: number,
  waterType: string,
  mwco: number = 50000,
  temperature: number = 25,
  flux: number = 80
): { outlet: number; rate: number; formula: string; details: Record<string, number> } {

  const codFraction = fractionateCOD(inletCOD, waterType);
  const mwDist = ORGANIC_MW_DISTRIBUTION[waterType] || ORGANIC_MW_DISTRIBUTION.municipal;

  // Sigmoidal截留曲线参数
  const kSteep = 0.015; // 曲线陡峭度 (1/Da)

  // 温度修正 (影响膜孔径)
  const tempFactor = 1 + (temperature - 25) * 0.001;
  const effectiveMWCO = mwco * tempFactor;

  // 各组分的截留率
  // S_S: 通常<1000 Da, 取决于MWCO
  const ssMW = 500;
  const ssRejection = 1 / (1 + Math.exp(kSteep * (Math.log(ssMW) - Math.log(effectiveMWCO))));

  // S_I: 取决于分子量分布
  const siMW = mwDist.peakMW * 0.3;
  const siRejection = 1 / (1 + Math.exp(kSteep * (Math.log(siMW) - Math.log(effectiveMWCO))));

  // X_S: 颗粒性/大分子, 高截留
  const xsMW = mwDist.peakMW;
  const xsRejection = 1 - Math.exp(-kSteep * xsMW / effectiveMWCO);

  // X_I: 颗粒性COD, 几乎完全截留
  const xiRejection = 0.99;

  // 浓差极化修正 (高通量时)
  let cpFactor = 1.0;
  if (flux > 100) {
    cpFactor = 0.97; // 高通量导致浓差极化
  }

  // 加权平均截留率
  const weightedRejection =
    codFraction.Ss * ssRejection +
    codFraction.Si * siRejection +
    codFraction.Xs * xsRejection +
    codFraction.Xi * xiRejection;

  const totalRejection = inletCOD > 0 ? (weightedRejection / inletCOD) * cpFactor : 0;
  const outletCOD = inletCOD * (1 - totalRejection);

  return {
    outlet: Math.max(0, outletCOD),
    rate: totalRejection * 100,
    formula: `UF MWCO截留曲线: MWCO=${effectiveMWCO.toFixed(0)}Da, T=${temperature}°C, Flux=${flux}LMH, ${waterType}水体`,
    details: {
      'S_S截留': ssRejection * 100,
      'S_I截留': siRejection * 100,
      'X_S截留': xsRejection * 100,
      'X_I截留': xiRejection * 100,
    }
  };
}

/**
 * 改良的NF膜COD去除计算 (v3.4)
 *
 * 基于DSPM-DE模型 + 电荷效应
 *
 * @param inletCOD 进水COD (mg/L)
 * @param waterType 水源类型
 * @param nfType NF膜类型 ('tight' | 'loose')
 * @param recovery 回收率
 * @param temperature 温度 (°C)
 */
function calculateNFCODRemoval(
  inletCOD: number,
  waterType: string,
  nfType: 'tight' | 'loose' = 'tight',
  recovery: number = 0.85,
  temperature: number = 25
): { outlet: number; rate: number; formula: string; details: Record<string, number> } {

  const codFraction = fractionateCOD(inletCOD, waterType);

  // NF膜参数
  const nfParams = nfType === 'tight'
    ? { mwco: 200, chargeFactor: 1.4, stericFactor: 0.8 }
    : { mwco: 400, chargeFactor: 1.2, stericFactor: 0.7 };

  // DSPM-DE模型参数
  const kSteep = 0.025;
  const dielectricExclusion = 1.05; // 介电排斥效应

  // 各组分的截留率
  // S_S: 小分子有机物, 主要受MWCO和电荷影响
  const ssRejection = nfParams.stericFactor * (1 / (1 + Math.exp(kSteep * (Math.log(500) - Math.log(nfParams.mwco)))));

  // S_I: 疏水性有机物, 高电荷效应
  const siRejection = nfParams.stericFactor * nfParams.chargeFactor * dielectricExclusion *
    (1 / (1 + Math.exp(kSteep * (Math.log(1500) - Math.log(nfParams.mwco)))));

  // X_S: 大分子有机物, 高截留
  const xsRejection = 1 - Math.exp(-kSteep * 2000 / nfParams.mwco) * nfParams.chargeFactor;

  // X_I: 颗粒性, 几乎完全截留
  const xiRejection = 0.995;

  // 回收率修正 (高回收率导致截留率下降)
  let recoveryPenalty = 1.0;
  if (recovery > 0.85) {
    recoveryPenalty = 0.97;
  } else if (recovery > 0.90) {
    recoveryPenalty = 0.94;
  }

  // 温度修正
  const tempPenalty = temperature < 25 ? 0.98 : 1.0;

  // 加权平均截留率
  const weightedRejection =
    codFraction.Ss * ssRejection +
    codFraction.Si * siRejection +
    codFraction.Xs * xsRejection +
    codFraction.Xi * xiRejection;

  const totalRejection = inletCOD > 0 ? (weightedRejection / inletCOD) * recoveryPenalty * tempPenalty : 0;
  const outletCOD = inletCOD * (1 - totalRejection);

  return {
    outlet: Math.max(0, outletCOD),
    rate: totalRejection * 100,
    formula: `NF DSPM-DE模型: MWCO=${nfParams.mwco}Da, 电荷效应=${nfParams.chargeFactor}, 回收率=${recovery*100}%, ${nfType}型NF膜`,
    details: {
      'S_S截留': ssRejection * 100,
      'S_I截留': siRejection * 100,
      'X_S截留': xsRejection * 100,
      'X_I截留': xiRejection * 100,
    }
  };
}

/**
 * 改良的RO膜COD去除计算 (v3.4)
 *
 * 基于Spiegler-Kedem模型 + 有机物专有参数
 *
 * @param inletCOD 进水COD (mg/L)
 * @param waterType 水源类型
 * @param roType RO膜类型 ('bw' | 'sw' | 'le')
 * @param recovery 回收率
 * @param temperature 温度 (°C)
 * @param pressure 操作压力 (bar)
 */
function calculateROCODRemoval(
  inletCOD: number,
  waterType: string,
  roType: 'bw' | 'sw' | 'le' = 'bw',
  recovery: number = 0.75,
  temperature: number = 25,
  pressure: number = 15
): { outlet: number; rate: number; formula: string; details: Record<string, number> } {

  const codFraction = fractionateCOD(inletCOD, waterType);

  // RO膜参数
  const roParams = {
    bw: { sigma: 0.998, Ps: 0.5, chargeFactor: 1.5 },  // 苦咸水膜
    sw: { sigma: 0.999, Ps: 0.3, chargeFactor: 1.6 },  // 海水膜
    le: { sigma: 0.995, Ps: 0.8, chargeFactor: 1.3 },  // 低能耗膜
  }[roType];

  // Spiegler-Kedem参数
  const baseRejection = 0.98; // 基础截留率
  const Lp = 3.0; // 水渗透系数 (L/m²/h/bar)
  void baseRejection;

  // 温度修正
  const TCF = temperature >= 25
    ? Math.exp(2640 * (1/298 - 1/(273 + temperature)))
    : Math.exp(3020 * (1/298 - 1/(273 + temperature)));

  // 压力修正
  const pressureRatio = pressure / 15;
  void pressureRatio;

  // 水通量
  const Jw = Lp * pressure * TCF;

  // Peclet数
  const Pe = Jw * (1 - roParams.sigma) / roParams.Ps;

  // Spiegler-Kedem截留率
  const SKRejection = roParams.sigma * (1 - Math.exp(-Pe)) /
    (roParams.sigma + (1 - roParams.sigma) * Math.exp(-Pe));

  // 各组分截留率 (考虑分子大小和电荷)
  // 有机物溶质参数
  const organicParams = {
    Ss: { MW: 200, charge: -0.5 },   // 小分子有机酸
    Si: { MW: 1000, charge: -1.0 },  // 中等分子量腐殖质
    Xs: { MW: 5000, charge: -2.0 }, // 大分子蛋白质
    Xi: { MW: 50000, charge: -3.0 }, // 胶体/颗粒
  };

  const kSteep = 0.03;
  const rejectionDetails: Record<string, number> = {};
  let totalWeightedRejection = 0;

  for (const [fraction, orgParams] of Object.entries(organicParams)) {
    const fractionKey = fraction as keyof typeof organicParams;
    const codValue = codFraction[fractionKey];

    // 分子尺寸截留
    const sizeRejection = 1 / (1 + Math.exp(kSteep * (Math.log(orgParams.MW) - Math.log(100))));

    // 电荷效应 (负电荷有机物被带负电的聚酰胺膜排斥)
    const chargeEffect = 1 + roParams.chargeFactor * Math.abs(orgParams.charge) * 0.1;

    // 综合截���率
    const fractionRejection = Math.min(0.9999, SKRejection * sizeRejection * chargeEffect);
    rejectionDetails[`${fraction}_截留`] = fractionRejection * 100;

    totalWeightedRejection += codValue * fractionRejection;
  }

  // 回收率修正
  const CF = 1 / (1 - recovery);
  void CF;
  let recoveryPenalty = 1.0;
  if (recovery > 0.75) {
    recoveryPenalty = 0.98;
  }
  if (recovery > 0.80) {
    recoveryPenalty = 0.96;
  }

  // 最终截留率
  const totalRejection = inletCOD > 0 ? (totalWeightedRejection / inletCOD) * recoveryPenalty : 0;
  const outletCOD = inletCOD * (1 - totalRejection);

  return {
    outlet: Math.max(0, outletCOD),
    rate: totalRejection * 100,
    formula: `RO Spiegler-Kedem+有机物模型: ${roType}膜, sigma=${roParams.sigma}, TCF=${TCF.toFixed(3)}, 回收率=${recovery*100}%, Jw=${Jw.toFixed(1)}LMH`,
    details: rejectionDetails,
  };
}

/**
 * 计算综合COD去除效果 (v3.4)
 *
 * 根据工艺类型选择合适的计算方法
 *
 * @param inletCOD 进水COD (mg/L)
 * @param processType 工艺类型
 * @param params 工艺参数
 */
export function calculateComprehensiveCODRemoval(
  inletCOD: number,
  processType: string,
  params: {
    waterType?: string;
    turbidity?: number;
    filterVelocity?: number;
    contactTime?: number;
    mwco?: number;
    nfType?: 'tight' | 'loose';
    roType?: 'bw' | 'sw' | 'le';
    recovery?: number;
    temperature?: number;
    pressure?: number;
  } = {}
): { outlet: number; rate: number; formula: string; details: Record<string, number> } {

  const {
    waterType = 'municipal',
    turbidity = 5,
    filterVelocity = 10,
    contactTime = 15,
    mwco = 50000,
    nfType = 'tight',
    roType = 'bw',
    recovery = 0.75,
    temperature = 25,
    pressure = 15,
  } = params;

  switch (processType) {
    case 'media_filter':
      return calculateMediaFilterCODRemoval(inletCOD, waterType, turbidity, filterVelocity);

    case 'carbon_filter':
      return calculateCarbonFilterCODRemoval(inletCOD, waterType, contactTime);

    case 'uf':
      return calculateUFCODRemoval(inletCOD, waterType, mwco, temperature);

    case 'nf':
      return calculateNFCODRemoval(inletCOD, waterType, nfType, recovery, temperature);

    case 'ro':
      return calculateROCODRemoval(inletCOD, waterType, roType, recovery, temperature, pressure);

    case 'mbr': {
      // MBR: 生物降解 + 超滤
      const bioResult = calculateBiodegradationCOD(
        fractionateCOD(inletCOD, waterType),
        8, // HRT
        20, // SRT
        temperature
      );
      const ufResult = calculateUFCODRemoval(bioResult.outlet.Ss + bioResult.outlet.Si + bioResult.outlet.Xs + bioResult.outlet.Xi, 'mbr_effluent', mwco, temperature);
      return {
        outlet: ufResult.outlet,
        rate: (1 - ufResult.outlet / inletCOD) * 100,
        formula: `MBR综合: 生物降解去除${bioResult.removal.toFixed(1)}% + UF截留${ufResult.rate.toFixed(1)}%`,
        details: { ...bioResult.outlet, UF去除率: ufResult.rate },
      };
    }

    default:
      // 默认使用简单计算
      return {
        outlet: inletCOD * 0.5,
        rate: 50,
        formula: `默认COD去除50%`,
        details: {},
      };
  }
}

// Re-export internal functions that unit-simulators.ts needs
export {
  fractionateCOD,
  logNormalPDF,
  calculateCODRejectionByMW,
  calculateBiodegradationCOD,
  calculateMediaFilterCODRemoval,
  calculateCarbonFilterCODRemoval,
  calculateUFCODRemoval,
  calculateNFCODRemoval,
  calculateROCODRemoval,
};
export type { CODFraction };
