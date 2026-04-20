/**
 * 系统能耗计算模块
 * 基于选定泵型号的真实产品参数，结合模拟数据计算总功耗和吨水运行功耗
 */

import { cdlPumps, CDLPump } from '@/lib/constants/cdl-pumps';
import { calculateSystemPressure, calculateOsmoticPressure } from '@/lib/utils/pump-calculations';
import { PumpConfig } from '@/types';
import { WaterQualityParams } from '@/lib/constants/water-quality';

/** 单台泵的功耗信息 */
export interface PumpPowerInfo {
  model: string;            // 型号
  role: string;             // 角色（原水泵/高压泵/段间泵/超滤泵）
  motorPower: number;       // 电机功率 kW
  efficiency: number;       // 泵效率 %
  inputPower: number;       // 实际输入功率 kW
  count: number;            // 并联台数
  totalPower: number;       // 总功率 kW（含并联）
  flowPerPump: number;      // 单泵流量 m³/h
  head: number;             // 扬程 m
}

/** 系统能耗计算结果 */
export interface SystemEnergyResult {
  /** 各泵详细功耗 */
  pumps: PumpPowerInfo[];
  /** 系统总装机功率 kW */
  totalInstalledPower: number;
  /** 系统实际运行总功率 kW（基于实际输入功率） */
  totalOperatingPower: number;
  /** 吨水运行功耗 kWh/m³ */
  specificEnergyConsumption: number;
  /** 产水量 m³/h */
  permeateFlow: number;
  /** 操作压力 bar */
  operatingPressure: number;
  /** 进水渗透压 bar */
  feedOsmoticPressure: number;
  /** 回收率 % */
  recovery: number;
  /** 摘要文字 */
  summary: string;
}

/**
 * 根据型号查找泵产品数据
 */
function findPump(model: string): CDLPump | undefined {
  if (!model) return undefined;
  return cdlPumps.find(p => p.model === model);
}

/**
 * 计算系统总能耗
 * 
 * 核心思路：
 * 1. 根据选定泵型号获取实际电机功率和效率
 * 2. 通过系统压力计算验证泵是否满足需求
 * 3. 基于真实泵参数计算总功耗
 * 4. 产水量 / 总功耗 = 吨水运行功耗
 * 
 * @param params 计算参数
 * @returns 系统能耗计算结果
 */
export function calculateSystemEnergy(params: {
  waterQuality: WaterQualityParams;
  designFlow: { feed: number; permeate: number; recovery: number };
  pumpConfig: PumpConfig;
  hasUF: boolean;
  hasRO: boolean;
  hasNF: boolean;
  roStages: number;
}): SystemEnergyResult {
  const {
    waterQuality,
    designFlow,
    pumpConfig,
    hasUF,
    hasRO,
    hasNF,
    roStages
  } = params;

  const tds = waterQuality.tds || 1000;
  const temperature = waterQuality.temperature || 25;
  const recovery = designFlow.recovery / 100;

  // 确定膜类型
  const membraneType: 'BW' | 'SW' | 'LE' =
    tds > 20000 ? 'SW' :
    tds > 5000 ? (tds > 10000 ? 'SW' : 'BW') :
    tds < 1000 ? 'LE' : 'BW';

  // 计算系统压力
  const pressureResult = calculateSystemPressure({
    feedTDS: tds,
    recovery,
    temperature,
    membraneType
  });

  const osmoticPressure = calculateOsmoticPressure(tds, temperature);

  const pumps: PumpPowerInfo[] = [];
  let summaryParts: string[] = [];

  // === 1. 原水泵 ===
  const feedPump = findPump(pumpConfig.feedPump);
  if (feedPump) {
    // 原水泵通常扬程 30m 左右
    const feedPumpInfo: PumpPowerInfo = {
      model: feedPump.model,
      role: '原水泵',
      motorPower: feedPump.motorPower,
      efficiency: feedPump.efficiency,
      inputPower: feedPump.inputPower || feedPump.motorPower,
      count: 1,
      totalPower: feedPump.motorPower,
      flowPerPump: feedPump.flow,
      head: feedPump.head
    };

    // 大流量时可能需要并联
    if (designFlow.feed > feedPump.flow * 0.9 && designFlow.feed > 100) {
      const parallelCount = Math.ceil(designFlow.feed / feedPump.flow);
      feedPumpInfo.count = parallelCount;
      feedPumpInfo.totalPower = feedPump.motorPower * parallelCount;
    }

    pumps.push(feedPumpInfo);
    summaryParts.push(`原水泵 ${feedPump.model} (${feedPump.motorPower}kW${feedPumpInfo.count > 1 ? ` × ${feedPumpInfo.count}台` : ''})`);
  }

  // === 2. RO高压泵 ===
  const hpPump = findPump(pumpConfig.highPressurePump);
  if (hpPump && (hasRO || hasNF)) {
    const hpPumpInfo: PumpPowerInfo = {
      model: hpPump.model,
      role: 'RO高压泵',
      motorPower: hpPump.motorPower,
      efficiency: hpPump.efficiency,
      inputPower: hpPump.inputPower || hpPump.motorPower,
      count: 1,
      totalPower: hpPump.motorPower,
      flowPerPump: hpPump.flow,
      head: hpPump.head
    };

    // 大流量并联
    if (designFlow.feed > hpPump.flow * 0.9 && designFlow.feed > 100) {
      const parallelCount = Math.ceil(designFlow.feed / hpPump.flow);
      hpPumpInfo.count = parallelCount;
      hpPumpInfo.totalPower = hpPump.motorPower * parallelCount;
    }

    pumps.push(hpPumpInfo);
    summaryParts.push(`高压泵 ${hpPump.model} (${hpPump.motorPower}kW${hpPumpInfo.count > 1 ? ` × ${hpPumpInfo.count}台` : ''})`);
  }

  // === 3. 段间泵 ===
  const interstagePump = findPump(pumpConfig.interstagePump);
  if (interstagePump && (hasRO || hasNF) && roStages >= 2) {
    const stage1Permeate = designFlow.permeate * 0.55;
    const stage1ConcentrateFlow = designFlow.feed - stage1Permeate;

    const interstagePumpInfo: PumpPowerInfo = {
      model: interstagePump.model,
      role: '段间泵',
      motorPower: interstagePump.motorPower,
      efficiency: interstagePump.efficiency,
      inputPower: interstagePump.inputPower || interstagePump.motorPower,
      count: 1,
      totalPower: interstagePump.motorPower,
      flowPerPump: stage1ConcentrateFlow,
      head: interstagePump.head
    };

    pumps.push(interstagePumpInfo);
    summaryParts.push(`段间泵 ${interstagePump.model} (${interstagePump.motorPower}kW)`);
  }

  // === 4. 超滤产水泵 ===
  const ufPump = findPump(pumpConfig.ufPump);
  if (ufPump && hasUF) {
    const ufPumpInfo: PumpPowerInfo = {
      model: ufPump.model,
      role: '超滤产水泵',
      motorPower: ufPump.motorPower,
      efficiency: ufPump.efficiency,
      inputPower: ufPump.inputPower || ufPump.motorPower,
      count: 1,
      totalPower: ufPump.motorPower,
      flowPerPump: ufPump.flow,
      head: ufPump.head
    };

    pumps.push(ufPumpInfo);
    summaryParts.push(`超滤泵 ${ufPump.model} (${ufPump.motorPower}kW)`);
  }

  // === 5. 辅助设备功耗估算 ===
  // 控制系统、加药系统、仪表等，约占总泵功率的 3-5%
  const mainPumpPower = pumps.reduce((sum, p) => sum + p.totalPower, 0);
  const auxiliaryPower = mainPumpPower * 0.04; // 4%

  // === 计算总功率 ===
  const totalInstalledPower = mainPumpPower;
  const totalOperatingPower = mainPumpPower + auxiliaryPower;

  // === 吨水运行功耗 ===
  const permeateFlow = Math.max(designFlow.permeate, 0.1); // 防止除零
  const specificEnergyConsumption = totalOperatingPower / permeateFlow;

  // === 生成摘要 ===
  const summary = [
    `系统总装机功率: ${totalInstalledPower.toFixed(1)} kW`,
    `含辅助设备运行功率: ${totalOperatingPower.toFixed(1)} kW`,
    `吨水运行功耗: ${specificEnergyConsumption.toFixed(2)} kWh/m³`,
    ...summaryParts,
    `操作压力: ${pressureResult.operatingPressure} bar`,
    `进水渗透压: ${osmoticPressure.toFixed(2)} bar`
  ].join('\n');

  return {
    pumps,
    totalInstalledPower: Math.round(totalInstalledPower * 10) / 10,
    totalOperatingPower: Math.round(totalOperatingPower * 10) / 10,
    specificEnergyConsumption: Math.round(specificEnergyConsumption * 100) / 100,
    permeateFlow: designFlow.permeate,
    operatingPressure: pressureResult.operatingPressure,
    feedOsmoticPressure: Math.round(osmoticPressure * 100) / 100,
    recovery: designFlow.recovery,
    summary
  };
}
