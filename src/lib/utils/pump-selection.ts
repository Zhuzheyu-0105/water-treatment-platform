/**
 * 水泵选型工具函数
 * 基于南方泵业 CDL 系列真实产品数据进行选型
 */

import { cdlPumps, CDLPump, cdlPumpStats } from '@/lib/constants/cdl-pumps';

export interface PumpSelectionResult {
  selected: CDLPump;
  alternatives: CDLPump[];
  reasoning: string;
  matchScore: number;       // 匹配度评分 (0-100)
  parallelCount?: number;   // 并联台数
  parallelPumps?: CDLPump[]; // 并联泵列表
}

export interface PumpSelectionParams {
  requiredFlow: number;     // 需求流量 (m³/h)
  requiredHead: number;     // 需求扬程 (m)
  application?: 'ro' | 'uf' | 'feed' | 'booster' | 'circulation'; // 应用场景
  maxParallelCount?: number; // 最大并联台数
  preferLowerPower?: boolean; // 优先选择低功率
}

/**
 * 水泵选型核心函数
 * 
 * 选型逻辑：
 * 1. 筛选流量匹配的泵（额定流量的80%-120%范围内）
 * 2. 筛选扬程匹配的泵（额定扬程的90%-110%范围内）
 * 3. 根据匹配度评分排序
 * 4. 考虑并联方案（流量需求大于单泵最大流量时）
 */
export function selectPump(params: PumpSelectionParams): PumpSelectionResult | null {
  const {
    requiredFlow,
    requiredHead,
    application = 'ro',
    maxParallelCount = 4,
    preferLowerPower = true
  } = params;

  // 判断是否需要并联
  const maxSingleFlow = 200; // CDL系列最大单泵流量
  let actualFlow = requiredFlow;
  let parallelCount = 1;
  
  if (requiredFlow > maxSingleFlow * 0.9) {
    parallelCount = Math.min(
      Math.ceil(requiredFlow / (maxSingleFlow * 0.8)),
      maxParallelCount
    );
    actualFlow = requiredFlow / parallelCount;
  }

  // 筛选候选泵
  const candidates = cdlPumps.filter(pump => {
    // 流量匹配：额定流量应在需求流量的70%-120%范围内
    const flowMatch = pump.flow >= actualFlow * 0.7 && pump.flow <= actualFlow * 1.2;
    // 扬程匹配：额定扬程应在需求扬程的85%-115%范围内
    const headMatch = pump.head >= requiredHead * 0.85 && pump.head <= requiredHead * 1.15;
    return flowMatch && headMatch;
  });

  if (candidates.length === 0) {
    // 放宽条件重新筛选
    const relaxedCandidates = cdlPumps.filter(pump => {
      const flowMatch = pump.flow >= actualFlow * 0.5 && pump.flow <= actualFlow * 1.5;
      const headMatch = pump.head >= requiredHead * 0.7 && pump.head <= requiredHead * 1.3;
      return flowMatch && headMatch;
    });

    if (relaxedCandidates.length === 0) {
      return null;
    }

    // 按评分排序
    const scored = relaxedCandidates.map(pump => ({
      pump,
      score: calculateMatchScore(pump, actualFlow, requiredHead)
    })).sort((a, b) => b.score - a.score);

    const selected = scored[0].pump;
    const alternatives = scored.slice(1, 4).map(s => s.pump);

    return {
      selected,
      alternatives,
      reasoning: generateReasoning(selected, actualFlow, requiredHead, parallelCount, true),
      matchScore: scored[0].score,
      parallelCount,
      parallelPumps: parallelCount > 1 ? Array(parallelCount).fill(selected) : undefined
    };
  }

  // 按评分排序
  const scored = candidates.map(pump => ({
    pump,
    score: calculateMatchScore(pump, actualFlow, requiredHead, preferLowerPower)
  })).sort((a, b) => b.score - a.score);

  const selected = scored[0].pump;
  const alternatives = scored.slice(1, 4).map(s => s.pump);

  return {
    selected,
    alternatives,
    reasoning: generateReasoning(selected, actualFlow, requiredHead, parallelCount, false),
    matchScore: scored[0].score,
    parallelCount,
    parallelPumps: parallelCount > 1 ? Array(parallelCount).fill(selected) : undefined
  };
}

/**
 * 计算泵与需求的匹配度评分
 */
function calculateMatchScore(
  pump: CDLPump,
  requiredFlow: number,
  requiredHead: number,
  preferLowerPower: boolean = true
): number {
  let score = 0;

  // 流量匹配度 (40分)
  const flowRatio = pump.flow / requiredFlow;
  const flowScore = 40 * Math.exp(-Math.pow((flowRatio - 1) * 2, 2));
  score += flowScore;

  // 扬程匹配度 (40分)
  const headRatio = pump.head / requiredHead;
  const headScore = 40 * Math.exp(-Math.pow((headRatio - 1) * 2, 2));
  score += headScore;

  // 效率加分 (10分)
  const efficiencyScore = (pump.efficiency / 100) * 10;
  score += efficiencyScore;

  // 功率优选 (10分) - 低功率优先
  if (preferLowerPower) {
    const powerScore = 10 * (1 - pump.motorPower / cdlPumpStats.powerRange.max);
    score += Math.max(0, powerScore);
  } else {
    score += 5;
  }

  return Math.round(score * 10) / 10;
}

/**
 * 生成选型说明
 */
function generateReasoning(
  pump: CDLPump,
  requiredFlow: number,
  requiredHead: number,
  parallelCount: number,
  isRelaxed: boolean
): string {
  let reasoning = '';

  if (parallelCount > 1) {
    reasoning = `系统流量${(requiredFlow * parallelCount).toFixed(1)}m³/h较大，推荐${parallelCount}台${pump.model}并联运行。`;
    reasoning += `单泵流量${pump.flow}m³/h，扬程${pump.head}m，电机功率${pump.motorPower}kW。`;
    reasoning += `并联后总流量${(pump.flow * parallelCount).toFixed(1)}m³/h，总功率${(pump.motorPower * parallelCount).toFixed(1)}kW。`;
  } else {
    reasoning = `根据设计流量${requiredFlow.toFixed(1)}m³/h和扬程${requiredHead.toFixed(1)}m，`;
    reasoning += `推荐${pump.model}（流量${pump.flow}m³/h，扬程${pump.head}m，功率${pump.motorPower}kW）。`;
    reasoning += `该泵效率${pump.efficiency}%，进出口${pump.connection}，重量${pump.weight}kg。`;
  }

  if (isRelaxed) {
    reasoning += '（注：需求参数超出标准范围，已放宽匹配条件）';
  }

  return reasoning;
}

/**
 * 根据应用场景选型
 */
export function selectPumpByApplication(
  application: 'ro' | 'uf' | 'feed' | 'booster' | 'circulation',
  flow: number,
  head: number
): PumpSelectionResult | null {
  // 不同应用场景的参数调整
  const adjustments: Record<string, { flowFactor: number; headFactor: number; preferLowerPower: boolean }> = {
    'ro': { flowFactor: 1.1, headFactor: 1.05, preferLowerPower: false },     // RO高压泵，优先可靠性
    'uf': { flowFactor: 1.15, headFactor: 1.0, preferLowerPower: true },      // UF供水泵，流量余量大
    'feed': { flowFactor: 1.2, headFactor: 1.0, preferLowerPower: true },     // 原水泵，大流量余量
    'booster': { flowFactor: 1.1, headFactor: 1.1, preferLowerPower: true },  // 增压泵
    'circulation': { flowFactor: 1.0, headFactor: 1.0, preferLowerPower: true } // 循环泵
  };

  const adj = adjustments[application] || adjustments['ro'];

  return selectPump({
    requiredFlow: flow * adj.flowFactor,
    requiredHead: head * adj.headFactor,
    application,
    preferLowerPower: adj.preferLowerPower
  });
}

/**
 * 高压泵选型（RO专用）
 * 
 * 根据RO系统参数计算所需压力和流量，选型高压泵
 */
export function selectHighPressurePump(
  productFlow: number,      // 产水量 (m³/h)
  recovery: number,         // 回收率 (小数，如0.75)
  operatingPressure: number // 系统操作压力 (bar)
): PumpSelectionResult | null {
  // 进水流量 = 产水量 / 回收率
  const feedFlow = productFlow / recovery;
  
  // 扬程 = 压力(bar) × 10.2
  const head = operatingPressure * 10.2;
  
  return selectPumpByApplication('ro', feedFlow, head);
}

/**
 * 段间增压泵选型
 * 
 * 用于两段式RO系统，为第二段补充压力
 */
export function selectInterstagePump(
  stage1ConcentrateFlow: number, // 第一段浓水流量 (m³/h)
  boostPressure: number,         // 需要增压 (bar)
  inletPressure: number          // 进口压力 (bar)，用于校核
): PumpSelectionResult | null {
  // 扬程 = 增压(bar) × 10.2
  const head = boostPressure * 10.2;
  
  // 段间泵需要能够承受进口压力
  // CDL系列最大承压约25bar，对于高进口压力场景可能需要特殊型号
  
  return selectPump({
    requiredFlow: stage1ConcentrateFlow,
    requiredHead: head,
    application: 'booster',
    preferLowerPower: true
  });
}

/**
 * 批量选型 - 为完整系统选型所有泵
 */
export function selectPumpsForSystem(params: {
  productFlow: number;       // 产水量 (m³/h)
  recovery: number;          // 回收率
  operatingPressure: number; // RO操作压力 (bar)
  feedPressure: number;      // 进水压力 (bar)
  needInterstagePump: boolean; // 是否需要段间泵
  interstageFlow?: number;   // 段间泵流量
  interstagePressure?: number; // 段间增压 (bar)
}): {
  feedPump: PumpSelectionResult | null;
  highPressurePump: PumpSelectionResult | null;
  interstagePump: PumpSelectionResult | null;
  totalPower: number;
  summary: string;
} {
  const feedFlow = params.productFlow / params.recovery;
  
  // 原水泵选型（需要30m扬程，进水压力不足时）
  const requiredFeedHead = params.feedPressure < 3 ? 30 : 0;
  const feedPump = requiredFeedHead > 0 
    ? selectPumpByApplication('feed', feedFlow, requiredFeedHead)
    : null;

  // 高压泵选型
  const highPressurePump = selectHighPressurePump(
    params.productFlow,
    params.recovery,
    params.operatingPressure
  );

  // 段间泵选型
  let interstagePump: PumpSelectionResult | null = null;
  if (params.needInterstagePump && params.interstageFlow && params.interstagePressure) {
    interstagePump = selectInterstagePump(
      params.interstageFlow,
      params.interstagePressure,
      params.operatingPressure * 0.6 // 第一段浓水压力
    );
  }

  // 计算总功率
  let totalPower = 0;
  if (feedPump) {
    totalPower += feedPump.selected.motorPower * (feedPump.parallelCount || 1);
  }
  if (highPressurePump) {
    totalPower += highPressurePump.selected.motorPower * (highPressurePump.parallelCount || 1);
  }
  if (interstagePump) {
    totalPower += interstagePump.selected.motorPower;
  }

  // 生成摘要
  let summary = `系统总功率: ${totalPower.toFixed(1)}kW\n`;
  if (feedPump) {
    summary += `原水泵: ${feedPump.selected.model} (${feedPump.selected.motorPower}kW${feedPump.parallelCount && feedPump.parallelCount > 1 ? ` × ${feedPump.parallelCount}台` : ''})\n`;
  }
  if (highPressurePump) {
    summary += `高压泵: ${highPressurePump.selected.model} (${highPressurePump.selected.motorPower}kW${highPressurePump.parallelCount && highPressurePump.parallelCount > 1 ? ` × ${highPressurePump.parallelCount}台` : ''})\n`;
  }
  if (interstagePump) {
    summary += `段间泵: ${interstagePump.selected.model} (${interstagePump.selected.motorPower}kW)\n`;
  }

  return {
    feedPump,
    highPressurePump,
    interstagePump,
    totalPower,
    summary
  };
}

/**
 * 查询可用的流量等级
 * 用于前端下拉选择
 */
export function getAvailableFlowLevels(): number[] {
  return [...new Set(cdlPumps.map(p => p.flow))].sort((a, b) => a - b);
}

/**
 * 查询指定流量下可用的扬程范围
 */
export function getHeadRangeForFlow(flow: number): { min: number; max: number; heads: number[] } {
  const pumps = cdlPumps.filter(p => p.flow === flow);
  const heads = pumps.map(p => p.head).sort((a, b) => a - b);
  return {
    min: heads[0] || 0,
    max: heads[heads.length - 1] || 0,
    heads: [...new Set(heads)]
  };
}

/**
 * 根据型号查询泵详情
 */
export function getPumpByModel(model: string): CDLPump | undefined {
  return cdlPumps.find(p => p.model === model);
}
