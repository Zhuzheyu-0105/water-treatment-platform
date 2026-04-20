/**
 * 水处理系统水泵计算算法
 * 基于公开技术文献和工程原理，实现精确的水泵选型计算
 * 
 * 参考：
 * - 杜邦 WAVE 水处理设计软件用户手册
 * - 《反渗透水处理工程》
 * - GB/T 19249-2017 反渗透水处理设备
 */

// ==================== 常量定义 ====================

// 气体常数
export const GAS_CONSTANT = {
  bar: 0.08314,      // L·bar/(mol·K)
  mpa: 0.008314,     // MPa·L/(mol·K)
  j: 8.314           // J/(mol·K)
};

// 重力加速度 (m/s²)
export const GRAVITY = 9.80665;

// 水密度 (kg/m³)
export const WATER_DENSITY = 1000;

// 压力与扬程转换：1 bar ≈ 10.2 m 水柱
export const BAR_TO_METER = 10.2;

// 温度修正系数表（以25℃为基准=1.0）
export const TEMPERATURE_CORRECTION: Record<number, number> = {
  5: 1.75,
  10: 1.58,
  12: 1.50,
  15: 1.35,
  18: 1.25,
  20: 1.16,
  22: 1.08,
  25: 1.00,
  28: 0.93,
  30: 0.87,
  32: 0.82,
  35: 0.76,
  38: 0.71,
  40: 0.67
};

// ==================== 渗透压计算 ====================

export interface OsmoticPressureResult {
  feedOsmoticPressure: number;      // 进水渗透压 (bar)
  concentrateOsmoticPressure: number; // 浓水渗透压 (bar)
  averageOsmoticPressure: number;   // 平均渗透压 (bar)
  concentrationFactor: number;      // 浓缩倍率
}

/**
 * 计算渗透压（范托夫公式简化版）
 * 
 * 公式：π = CRT
 * - π: 渗透压
 * - C: 离子摩尔浓度 (mol/L)
 * - R: 气体常数
 * - T: 绝对温度 (K)
 * 
 * 工程简化：TDS每1000ppm约产生0.77 bar渗透压（25℃时）
 * 
 * @param tds 总溶解固体 (mg/L 或 ppm)
 * @param temperature 温度 (℃)
 * @returns 渗透压 (bar)
 */
export function calculateOsmoticPressure(
  tds: number,
  temperature: number = 25
): number {
  const T = 273 + temperature; // 绝对温度
  
  // 经验公式：渗透压与TDS成正比
  // 对于NaCl溶液：TDS=35000 mg/L时，渗透压≈27 bar
  // 系数约为 0.77 bar per 1000 ppm
  // 温度修正：渗透压与绝对温度成正比
  
  const baseOsmoticPressure = (tds / 1000) * 0.77;
  const temperatureCorrection = T / 298; // 25℃为基准
  
  return baseOsmoticPressure * temperatureCorrection;
}

/**
 * 计算浓水渗透压（考虑浓缩倍率）
 * 
 * 浓水TDS = 进水TDS / (1 - 回收率)
 * 
 * @param feedTDS 进水TDS (mg/L)
 * @param recovery 回收率 (小数形式，如0.75表示75%)
 * @param temperature 温度 (℃)
 * @returns 浓水渗透压 (bar)
 */
export function calculateConcentrateOsmoticPressure(
  feedTDS: number,
  recovery: number,
  temperature: number = 25
): number {
  // 确保回收率有效
  const validRecovery = Math.min(Math.max(recovery, 0.1), 0.95);
  
  // 浓水TDS = 进水TDS / (1 - 回收率)
  const concentrateTDS = feedTDS / (1 - validRecovery);
  
  return calculateOsmoticPressure(concentrateTDS, temperature);
}

/**
 * 完整渗透压计算（进水、浓水、平均）
 */
export function calculateCompleteOsmoticPressure(
  feedTDS: number,
  recovery: number,
  temperature: number = 25
): OsmoticPressureResult {
  const feedOsmoticPressure = calculateOsmoticPressure(feedTDS, temperature);
  const concentrateOsmoticPressure = calculateConcentrateOsmoticPressure(feedTDS, recovery, temperature);
  const averageOsmoticPressure = (feedOsmoticPressure + concentrateOsmoticPressure) / 2;
  const concentrationFactor = 1 / (1 - recovery);
  
  return {
    feedOsmoticPressure,
    concentrateOsmoticPressure,
    averageOsmoticPressure,
    concentrationFactor
  };
}

// ==================== 系统压力计算 ====================

export interface SystemPressureParams {
  feedTDS: number;              // 进水TDS (mg/L)
  recovery: number;             // 回收率 (小数)
  temperature: number;          // 温度 (℃)
  membraneType: 'BW' | 'SW' | 'LE'; // 膜类型
  foulingAllowance?: number;    // 污堵余量 (bar)
  pipingLoss?: number;          // 管路损失 (bar)
}

export interface SystemPressureResult {
  operatingPressure: number;    // 操作压力 (bar)
  head: number;                 // 扬程 (m)
  components: {
    osmoticPressure: number;    // 渗透压分量 (bar)
    netDrivePressure: number;   // 净驱动压力 (bar)
    foulingAllowance: number;   // 污堵余量 (bar)
    pipingLoss: number;         // 管路损失 (bar)
  };
}

/**
 * 计算系统所需操作压力
 *
 * 系统压力 = 渗透压 + 净驱动压力 + 污堵余量 + 管路损失
 *
 * v3.9.1改进：基于用户实际选型数据拟合
 * 用户案例：8040HR膜，产水3m³/h，回收率75%，高压泵CDL4-16 (Q=4,H=120m,P=2.2kW)
 * 验证：在进水TDS~2000, 温度25℃条件下，计算扬程≈120m与实际吻合
 */
export function calculateSystemPressure(params: SystemPressureParams): SystemPressureResult {
  const {
    feedTDS,
    recovery,
    temperature,
    membraneType,
    foulingAllowance = 1.5,
    pipingLoss = 0.8
  } = params;

  // 1. 计算渗透压（使用平均TDS，考虑浓缩效应）
  const osmoticResult = calculateCompleteOsmoticPressure(feedTDS, recovery, temperature);
  const osmoticPressure = osmoticResult.averageOsmoticPressure;

  // 2. 净驱动压力（NDP）- 基于用户实际选型数据拟合
  // NDP = 操作压力 - 渗透压 - 背压
  // 不同膜类型需要不同的净驱动压力
  // v3.9.1改进：针对8040HR膜优化参数，与用户实际选型匹配
  let baseNetDrivePressure: number;

  switch (membraneType) {
    case 'SW':
      // 海水膜：标准压力15.5 bar
      baseNetDrivePressure = 12;
      break;
    case 'BW':
      // 苦咸水膜：基于用户8040HR案例校准
      // 用户实际：TDS~2000, 回收率75%, 扬程120m (11.8bar)
      // 推算：NDP ≈ 11.8 - 3.85(渗透压) - 1.5 - 0.5 = 5.95 ≈ 6 bar
      if (feedTDS > 10000) {
        baseNetDrivePressure = 10; // 高TDS苦咸水
      } else if (feedTDS > 5000) {
        baseNetDrivePressure = 8; // 中等TDS
      } else {
        baseNetDrivePressure = 6; // 低TDS条件（匹配用户8040HR案例）
      }
      break;
    case 'LE':
      // 低压膜
      baseNetDrivePressure = 4;
      break;
    default:
      baseNetDrivePressure = 6;
  }

  // 3. 回收率修正（每10%回收率增加约0.4 bar）
  // 用户案例：回收率75%，标准测试条件22%
  // 修正量 = (75-22)/10 * 0.4 ≈ 2.1 bar
  const recoveryCorrection = Math.max(0, (recovery - 0.22) * 0.4);

  // 4. 温度修正（温度越低，黏度越高，NDP越大）
  const tempCorrection = getTemperatureCorrection(temperature);
  const adjustedNetDrivePressure = (baseNetDrivePressure + recoveryCorrection) / tempCorrection;

  // 5. 总操作压力
  // v3.9.1调整：降低污堵余量和管路损失，更接近实际工况
  const operatingPressure = osmoticPressure + adjustedNetDrivePressure + foulingAllowance + pipingLoss;

  return {
    operatingPressure: Math.round(operatingPressure * 10) / 10,
    head: Math.round(operatingPressure * BAR_TO_METER),
    components: {
      osmoticPressure: Math.round(osmoticPressure * 10) / 10,
      netDrivePressure: Math.round(adjustedNetDrivePressure * 10) / 10,
      foulingAllowance,
      pipingLoss
    }
  };
}

/**
 * 获取温度修正系数
 */
export function getTemperatureCorrection(temperature: number): number {
  // 查表
  if (TEMPERATURE_CORRECTION[temperature]) {
    return TEMPERATURE_CORRECTION[temperature];
  }
  
  // 线性插值
  const temps = Object.keys(TEMPERATURE_CORRECTION).map(Number).sort((a, b) => a - b);
  
  for (let i = 0; i < temps.length - 1; i++) {
    if (temperature >= temps[i] && temperature <= temps[i + 1]) {
      const t1 = temps[i];
      const t2 = temps[i + 1];
      const c1 = TEMPERATURE_CORRECTION[t1];
      const c2 = TEMPERATURE_CORRECTION[t2];
      return c1 + (c2 - c1) * (temperature - t1) / (t2 - t1);
    }
  }
  
  // 超出范围，使用经验公式
  // 温度每变化1℃，修正系数变化约3.5%
  return 1 + (25 - temperature) * 0.035;
}

// ==================== 高压泵选型计算 ====================

export interface HighPressurePumpParams {
  productFlow: number;          // 产水量 (m³/h)
  recovery: number;             // 回收率 (小数)
  systemPressure: number;       // 系统压力 (bar)
  pumpEfficiency?: number;      // 泵效率
  motorEfficiency?: number;     // 电机效率
  safetyFactor?: number;        // 安全系数
}

export interface PumpSelectionResult {
  flowRate: number;             // 流量 (m³/h)
  head: number;                 // 扬程 (m)
  power: number;                // 功率 (kW)
  pressure: number;             // 压力 (bar)
  shaftPower: number;           // 轴功率 (kW)
  motorPower: number;           // 电机功率 (kW)
  estimatedCurrent: number;     // 估算电流 (A，380V)
}

/**
 * 高压泵选型计算
 * 
 * 公式：
 * - 进水流量 = 产水量 / 回收率
 * - 泵流量 = 进水流量 × 安全系数
 * - 扬程 = 压力 × 10.2 (m)
 * - 轴功率 = (Q × H) / (367 × η_pump × η_motor) [kW]
 */
export function calculateHighPressurePump(params: HighPressurePumpParams): PumpSelectionResult {
  const {
    productFlow,
    recovery,
    systemPressure,
    pumpEfficiency = 0.8,
    motorEfficiency = 0.93,
    safetyFactor = 1.1
  } = params;
  
  // 1. 进水流量 = 产水量 / 回收率
  const feedFlow = productFlow / recovery;
  
  // 2. 泵流量 = 进水流量 × 安全系数
  const pumpFlow = feedFlow * safetyFactor;
  
  // 3. 扬程（m）= 压力（bar）× 10.2
  const head = systemPressure * BAR_TO_METER;
  
  // 4. 轴功率计算
  // P = (Q × H) / (367 × η_pump × η_motor) [kW]
  // 其中 Q 单位为 m³/h，H 单位为 m
  const shaftPower = (pumpFlow * head) / (367 * pumpEfficiency * motorEfficiency);
  
  // 5. 电机功率 = 轴功率 × 安全系数(1.1-1.2)
  const motorPower = shaftPower * safetyFactor;
  
  // 6. 估算电流 (A，380V三相)
  const estimatedCurrent = (motorPower * 1000) / (380 * 1.732 * 0.85);
  
  return {
    flowRate: Math.ceil(pumpFlow),
    head: Math.ceil(head),
    power: Math.ceil(motorPower),
    pressure: systemPressure,
    shaftPower: Math.round(shaftPower * 100) / 100,
    motorPower: Math.ceil(motorPower),
    estimatedCurrent: Math.round(estimatedCurrent)
  };
}

// ==================== 段间增压泵计算 ====================

export interface InterstagePumpParams {
  firstStageFeedTDS: number;     // 第一段进水TDS (mg/L)
  firstStageRecovery: number;    // 第一段回收率 (小数)
  secondStageRecovery: number;   // 第二段目标回收率 (小数)
  temperature: number;           // 温度 (℃)
  firstStagePressure: number;    // 第一段操作压力 (bar)
  firstStagePressureLoss?: number; // 第一段压力损失 (bar)
}

export interface InterstagePumpResult {
  required: boolean;             // 是否需要段间泵
  secondStageFeedTDS: number;    // 第二段进水TDS (mg/L)
  secondStageOsmoticPressure: number; // 第二段渗透压 (bar)
  requiredBoostPressure: number; // 需要增压 (bar)
  flowRate: number;              // 段间泵流量 (m³/h)
  head: number;                  // 段间泵扬程 (m)
  reason: string;                // 判断原因
}

/**
 * 判断是否需要段间增压泵
 */
export function needsInterstagePump(
  feedTDS: number,
  recovery: number,
  isTwoStage: boolean
): { required: boolean; reason: string } {
  
  if (!isTwoStage) {
    return { required: false, reason: '非两段式系统' };
  }
  
  if (feedTDS > 5000) {
    return { 
      required: true, 
      reason: `进水TDS=${feedTDS}mg/L > 5000mg/L，需要段间增压泵提高第二段压力` 
    };
  }
  
  if (recovery > 0.75) {
    return { 
      required: true, 
      reason: `回收率=${(recovery * 100).toFixed(0)}% > 75%，需要段间增压泵提高系统回收率` 
    };
  }
  
  return { required: false, reason: '常规工况，无需段间增压泵' };
}

/**
 * 计算段间增压泵参数
 * 
 * 段间泵用于两段式RO系统，主要应用场景：
 * 1. 高TDS水：进水TDS > 5000 mg/L
 * 2. 高回收率要求：回收率 > 75%
 * 3. 海水膜系统：需要更高压力
 * 4. 通量均衡：平衡各段膜元件的产水通量
 */
export function calculateInterstagePump(params: InterstagePumpParams): InterstagePumpResult {
  const {
    firstStageFeedTDS,
    firstStageRecovery,
    secondStageRecovery,
    temperature,
    firstStagePressure,
    firstStagePressureLoss = 1.5
  } = params;
  
  // 1. 计算第二段进水TDS（第一段浓水TDS）
  const secondStageFeedTDS = firstStageFeedTDS / (1 - firstStageRecovery);
  
  // 2. 计算第二段浓水TDS
  const secondStageConcentrateTDS = secondStageFeedTDS / (1 - secondStageRecovery);
  
  // 3. 计算第二段渗透压
  const secondStageOsmoticPressure = calculateOsmoticPressure(secondStageConcentrateTDS, temperature);
  
  // 4. 第一段浓水压力（压力损失约1-2 bar）
  const firstStageConcentratePressure = firstStagePressure - firstStagePressureLoss;
  
  // 5. 判断是否需要段间增压泵
  const decision = needsInterstagePump(
    firstStageFeedTDS,
    firstStageRecovery + secondStageRecovery * (1 - firstStageRecovery),
    true
  );
  
  if (!decision.required) {
    return {
      required: false,
      secondStageFeedTDS,
      secondStageOsmoticPressure,
      requiredBoostPressure: 0,
      flowRate: 0,
      head: 0,
      reason: decision.reason
    };
  }
  
  // 6. 计算段间增压需求
  // 经验值：
  // - NaCl体系（氯化钠）：约需增压12 bar
  // - Na₂SO₄体系（硫酸钠）：约需增压7 bar
  // - 常规苦咸水：5-8 bar
  
  let requiredBoostPressure: number;
  
  if (firstStageFeedTDS > 20000) {
    // 海水/高盐度水
    requiredBoostPressure = 12;
  } else if (firstStageFeedTDS > 5000) {
    // 高盐度苦咸水
    requiredBoostPressure = 8;
  } else {
    // 常规苦咸水
    requiredBoostPressure = 5;
  }
  
  // 7. 段间泵流量 = 第二段进水流量
  // 这个值需要在外部结合总流量计算
  
  return {
    required: true,
    secondStageFeedTDS,
    secondStageOsmoticPressure,
    requiredBoostPressure,
    flowRate: 0, // 需要外部传入
    head: Math.round(requiredBoostPressure * BAR_TO_METER),
    reason: decision.reason
  };
}

// ==================== 并联泵计算 ====================

export interface ParallelPumpConfig {
  totalFlow: number;           // 总流量 (m³/h)
  pumpCount: number;           // 运行泵数量（不含备用）
  flowPerPump: number;         // 实际单台流量 (m³/h)
  standbyCount: number;        // 备用台数
  mode: 'single' | 'parallel' | 'standby';  // single=单台运行, parallel=并联运行, standby=1用1备
  recommended: string;         // 推荐说明
}

/**
 * 计算并联泵配置
 * 
 * 工程实践规则（参考实际项目如喀什井水200m³/h）：
 * - CDL系列单泵最大流量 200 m³/h
 * 
 * 原水泵/给水泵（低压，扬程~30-50m）：
 * - ≤ 100 m³/h：1用1备（两台，一台运行一台备用）
 * - 100 < 总流量 ≤ 200：1用1备（两台大泵，CDL系列可覆盖）
 * - > 200 m³/h：2用1备 或 3用1备
 * 
 * 高压泵（高压，扬程150-250m）：
 * - 单台泵选型为主（CDL系列最大200m³/h，功率可达110kW）
 * - ≤ 200 m³/h：优先单台运行 + 1台备用
 * - > 200 m³/h：两台并联 + 1台备用
 * 
 * @param totalFlow  总流量 (m³/h)
 * @param maxSinglePumpFlow  单泵最大流量 (m³/h)，CDL系列默认200
 * @param isHighPressure  是否高压泵（影响选型策略）
 */
export function calculateParallelPumps(
  totalFlow: number,
  maxSinglePumpFlow: number = 200,
  isHighPressure: boolean = false
): ParallelPumpConfig {
  
  let pumpCount: number;
  let flowPerPump: number;
  let standbyCount: number;
  let mode: ParallelPumpConfig['mode'];
  let recommended: string;
  
  // 单台泵即可覆盖的场景
  if (totalFlow <= maxSinglePumpFlow) {
    if (isHighPressure) {
      // 高压泵：优先单台运行 + 1台备用
      pumpCount = 1;
      flowPerPump = totalFlow;
      standbyCount = 1;
      mode = 'standby';
      recommended = `系统流量${totalFlow.toFixed(1)}m³/h，推荐1台高压泵运行 + 1台备用（1用1备）`;
    } else {
      // 低压泵（原水泵/给水泵）：1用1备
      pumpCount = 1;
      flowPerPump = totalFlow;
      standbyCount = 1;
      mode = 'standby';
      recommended = `系统流量${totalFlow.toFixed(1)}m³/h，推荐1用1备（两台泵，一用一备）`;
    }
  } else if (totalFlow <= maxSinglePumpFlow * 2) {
    // 两台泵并联可覆盖
    pumpCount = 2;
    flowPerPump = totalFlow / 2;
    standbyCount = 1;
    mode = 'parallel';
    recommended = `系统流量${totalFlow.toFixed(1)}m³/h较大，推荐2台泵并联运行 + 1台备用（2用1备），单台${Math.ceil(flowPerPump)}m³/h`;
  } else {
    // 大型系统：多台并联
    pumpCount = Math.ceil(totalFlow / maxSinglePumpFlow);
    flowPerPump = totalFlow / pumpCount;
    standbyCount = Math.max(1, Math.ceil(pumpCount * 0.2));
    mode = 'parallel';
    recommended = `大型系统流量${totalFlow.toFixed(1)}m³/h，推荐${pumpCount}台泵并联运行 + ${standbyCount}台备用，单台${Math.ceil(flowPerPump)}m³/h`;
  }
  
  return {
    totalFlow,
    pumpCount,
    flowPerPump: Math.ceil(flowPerPump),
    standbyCount,
    mode,
    recommended
  };
}

/**
 * 计算并联泵总功率
 */
export function calculateParallelPumpPower(
  pumpConfig: ParallelPumpConfig,
  head: number,
  pumpEfficiency: number = 0.8,
  motorEfficiency: number = 0.93
): number {
  // 单台泵功率
  const singlePumpPower = (pumpConfig.flowPerPump * head) / 
                          (367 * pumpEfficiency * motorEfficiency);
  
  // 总功率（运行泵数量，不含备用泵）
  const totalPower = singlePumpPower * pumpConfig.pumpCount;
  
  return Math.ceil(totalPower);
}

// ==================== 增压泵计算 ====================

export interface BoosterPumpParams {
  feedFlow: number;             // 进水流量 (m³/h)
  inletPressure: number;        // 进水压力 (bar)
  requiredPressure?: number;    // 所需压力 (bar)
  pumpEfficiency?: number;
  motorEfficiency?: number;
}

/**
 * 计算增压泵参数
 * 
 * 增压泵用于：
 * - 将进水压力提升至保安过滤器所需压力（通常3 bar）
 * - 为高压泵提供足够的吸入压力
 * - 克服预处理系统阻力
 */
export function calculateBoosterPump(params: BoosterPumpParams): PumpSelectionResult {
  const {
    feedFlow,
    inletPressure,
    requiredPressure = 3,
    pumpEfficiency = 0.75,
    motorEfficiency = 0.93
  } = params;
  
  // 增压泵扬程 = 所需压力 - 进水压力
  const requiredBoost = Math.max(0, requiredPressure - inletPressure);
  
  // 扬程（m）
  const head = requiredBoost * BAR_TO_METER;
  
  // 轴功率
  const shaftPower = (feedFlow * head) / (367 * pumpEfficiency * motorEfficiency);
  
  // 电机功率
  const motorPower = shaftPower * 1.15;
  
  // 估算电流
  const estimatedCurrent = (motorPower * 1000) / (380 * 1.732 * 0.85);
  
  return {
    flowRate: Math.ceil(feedFlow * 1.1),
    head: Math.ceil(head),
    power: Math.ceil(motorPower),
    pressure: requiredBoost,
    shaftPower: Math.round(shaftPower * 100) / 100,
    motorPower: Math.ceil(motorPower),
    estimatedCurrent: Math.round(estimatedCurrent)
  };
}

// ==================== 膜通量设计 ====================

export interface FluxDesignParams {
  waterType: 'groundwater' | 'surface' | 'seawater' | 'wastewater';
  sdi: number;                  // 污染指数
  temperature: number;          // 温度 (℃)
}

export interface FluxDesignResult {
  recommendedFlux: number;      // 推荐通量 (L/m²·h)
  minFlux: number;              // 最小通量
  maxFlux: number;              // 最大通量
  reasoning: string;            // 推荐说明
}

/**
 * 根据水质推荐膜通量
 * 
 * 通量设计指南：
 * | 原水类型 | SDI | 推荐通量 (L/m²·h) |
 * |---------|-----|------------------|
 * | 地下水 | < 3 | 22-27 |
 * | 地表水 | 3-5 | 17-22 |
 * | 海水 | < 3 | 14-17 |
 * | 废水回用 | > 5 | 12-17 |
 */
export function recommendFlux(params: FluxDesignParams): FluxDesignResult {
  const { waterType, sdi, temperature } = params;
  
  let baseFlux: { min: number; max: number };
  let reasoning: string;
  
  // 根据水质类型确定基础通量范围
  switch (waterType) {
    case 'groundwater':
      if (sdi < 3) {
        baseFlux = { min: 24, max: 28 };
        reasoning = '地下水SDI<3，水质清洁，可采用较高通量';
      } else {
        baseFlux = { min: 20, max: 24 };
        reasoning = '地下水SDI≥3，建议适度降低通量';
      }
      break;
      
    case 'surface':
      if (sdi < 3) {
        baseFlux = { min: 20, max: 24 };
        reasoning = '地表水SDI<3，水质较好';
      } else if (sdi <= 5) {
        baseFlux = { min: 17, max: 22 };
        reasoning = '地表水SDI=3-5，中等污染风险';
      } else {
        baseFlux = { min: 14, max: 18 };
        reasoning = '地表水SDI>5，高污染风险，需降低通量';
      }
      break;
      
    case 'seawater':
      if (sdi < 3) {
        baseFlux = { min: 14, max: 17 };
        reasoning = '海水SDI<3，但渗透压高，需控制通量';
      } else {
        baseFlux = { min: 12, max: 15 };
        reasoning = '海水SDI≥3，需进一步降低通量';
      }
      break;
      
    case 'wastewater':
      if (sdi <= 5) {
        baseFlux = { min: 14, max: 17 };
        reasoning = '废水回用，需保守设计通量';
      } else {
        baseFlux = { min: 12, max: 15 };
        reasoning = '废水SDI>5，高污染风险，采用低通量设计';
      }
      break;
      
    default:
      baseFlux = { min: 20, max: 24 };
      reasoning = '采用标准通量设计';
  }
  
  // 温度修正
  const tempCorrection = getTemperatureCorrection(temperature);
  const recommendedFlux = Math.round(((baseFlux.min + baseFlux.max) / 2) / tempCorrection);
  
  return {
    recommendedFlux,
    minFlux: Math.round(baseFlux.min / tempCorrection),
    maxFlux: Math.round(baseFlux.max / tempCorrection),
    reasoning: `${reasoning}，温度${temperature}℃修正后推荐通量${recommendedFlux}L/m²·h`
  };
}

// ==================== 综合设计计算 ====================

export interface WaterTreatmentDesignInput {
  productFlow: number;          // 产水量 (m³/h)
  recovery: number;             // 回收率 (小数)
  feedTDS: number;              // 进水TDS (mg/L)
  temperature: number;          // 温度 (℃)
  inletPressure: number;        // 进水压力 (bar)
  membraneType: 'BW' | 'SW' | 'LE'; // 膜类型
  waterType: 'groundwater' | 'surface' | 'seawater' | 'wastewater';
  sdi: number;                  // 污染指数
  isTwoStage: boolean;          // 是否两段式
  stages?: number;              // 段数
}

export interface WaterTreatmentDesignOutput {
  // 流量计算
  flows: {
    feedFlow: number;           // 进水流量 (m³/h)
    concentrateFlow: number;    // 浓水流量 (m³/h)
    productFlow: number;        // 产水流量 (m³/h)
  };
  
  // 渗透压
  osmoticPressure: OsmoticPressureResult;
  
  // 系统压力
  systemPressure: SystemPressureResult;
  
  // 膜通量
  fluxDesign: FluxDesignResult;
  
  // 高压泵
  highPressurePump: PumpSelectionResult;
  parallelConfig: ParallelPumpConfig;
  
  // 段间泵（可选）
  interstagePump?: InterstagePumpResult;
  
  // 增压泵
  boosterPump: PumpSelectionResult;
  
  // 总功率
  totalPower: number;
  
  // 推荐说明
  recommendations: string[];
}

/**
 * 综合水处理系统设计计算
 */
export function designWaterTreatmentSystem(
  input: WaterTreatmentDesignInput
): WaterTreatmentDesignOutput {
  const recommendations: string[] = [];
  
  // 1. 流量计算
  const feedFlow = input.productFlow / input.recovery;
  const concentrateFlow = feedFlow - input.productFlow;
  
  // 2. 渗透压计算
  const osmoticPressure = calculateCompleteOsmoticPressure(
    input.feedTDS,
    input.recovery,
    input.temperature
  );
  
  recommendations.push(
    `进水TDS ${input.feedTDS}mg/L，渗透压${osmoticPressure.feedOsmoticPressure.toFixed(1)}bar；` +
    `浓水TDS ${Math.round(input.feedTDS / (1 - input.recovery))}mg/L，渗透压${osmoticPressure.concentrateOsmoticPressure.toFixed(1)}bar`
  );
  
  // 3. 系统压力计算
  const systemPressure = calculateSystemPressure({
    feedTDS: input.feedTDS,
    recovery: input.recovery,
    temperature: input.temperature,
    membraneType: input.membraneType
  });
  
  recommendations.push(
    `系统操作压力${systemPressure.operatingPressure}bar，扬程${systemPressure.head}m`
  );
  
  // 4. 膜通量设计
  const fluxDesign = recommendFlux({
    waterType: input.waterType,
    sdi: input.sdi,
    temperature: input.temperature
  });
  
  // 5. 高压泵选型
  const highPressurePump = calculateHighPressurePump({
    productFlow: input.productFlow,
    recovery: input.recovery,
    systemPressure: systemPressure.operatingPressure
  });
  
  // 6. 并联泵配置
  const parallelConfig = calculateParallelPumps(feedFlow);
  
  if (parallelConfig.pumpCount > 1) {
    recommendations.push(parallelConfig.recommended);
  }
  
  // 7. 段间泵判断（两段式系统）
  let interstagePump: InterstagePumpResult | undefined;
  
  if (input.isTwoStage) {
    const interstageDecision = needsInterstagePump(
      input.feedTDS,
      input.recovery,
      input.isTwoStage
    );
    
    if (interstageDecision.required) {
      interstagePump = calculateInterstagePump({
        firstStageFeedTDS: input.feedTDS,
        firstStageRecovery: input.recovery * 0.5,
        secondStageRecovery: input.recovery * 0.5,
        temperature: input.temperature,
        firstStagePressure: systemPressure.operatingPressure * 0.6
      });
      
      recommendations.push(interstageDecision.reason);
      recommendations.push(
        `推荐段间增压泵，增压${interstagePump.requiredBoostPressure}bar`
      );
    }
  }
  
  // 8. 增压泵计算
  const boosterPump = calculateBoosterPump({
    feedFlow,
    inletPressure: input.inletPressure
  });
  
  if (boosterPump.pressure > 0) {
    recommendations.push(
      `进水压力${input.inletPressure}bar不足，需增压${boosterPump.pressure.toFixed(1)}bar`
    );
  }
  
  // 9. 总功率计算
  let totalPower = highPressurePump.power * parallelConfig.pumpCount;
  if (interstagePump?.required) {
    // 段间泵功率估算
    const interstagePower = (interstagePump.requiredBoostPressure * BAR_TO_METER) / 367 * 20;
    totalPower += interstagePower;
  }
  totalPower += boosterPump.power;
  
  return {
    flows: {
      feedFlow: Math.round(feedFlow * 10) / 10,
      concentrateFlow: Math.round(concentrateFlow * 10) / 10,
      productFlow: input.productFlow
    },
    osmoticPressure,
    systemPressure,
    fluxDesign,
    highPressurePump,
    parallelConfig,
    interstagePump,
    boosterPump,
    totalPower,
    recommendations
  };
}
