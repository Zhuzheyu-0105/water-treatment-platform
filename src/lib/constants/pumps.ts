// 南方泵业(CNP)产品数据库

export interface PumpProduct {
  model: string; // 型号
  series: string; // 系列
  flow: number; // 额定流量 m³/h
  head: number; // 扬程 m
  power: number; // 功率 kW
  rpm: number; // 转速 rpm
  efficiency?: number; // 效率 %
  inletDn?: number; // 进口口径 mm
  outletDn?: number; // 出口口径 mm
  maxPressure?: number; // 最大工作压力 bar
  maxTemp?: number; // 最高介质温度 °C
  material?: string; // 过流部件材质
  description: string;
  application: string[]; // 适用场景
}

// 南方泵业产品数据库 - 基于官方产品手册
export const cnpPumps: PumpProduct[] = [
  // ==================== CDL/CDLF系列 - 立式多级离心泵 ====================
  // 小流量高压型
  { model: 'CDL2-110', series: 'cdl', flow: 2, head: 110, power: 1.5, rpm: 2900, inletDn: 25, outletDn: 25, maxPressure: 12, material: '304SS', description: '小型高压泵，适合实验室或小型RO系统', application: ['小型RO', '高压供水'] },
  { model: 'CDL4-120', series: 'cdl', flow: 4, head: 120, power: 3, rpm: 2900, inletDn: 32, outletDn: 25, maxPressure: 13, material: '304SS', description: '小型高压泵，适合小型RO系统', application: ['小型RO', '高压供水'] },
  { model: 'CDL8-120', series: 'cdl', flow: 8, head: 120, power: 5.5, rpm: 2900, inletDn: 40, outletDn: 32, maxPressure: 13, material: '304SS', description: '中型高压泵，适合中小型RO系统', application: ['中小型RO', '高压供水'] },
  { model: 'CDL12-120', series: 'cdl', flow: 12, head: 120, power: 7.5, rpm: 2900, inletDn: 50, outletDn: 40, maxPressure: 13, material: '304SS', description: '中型高压泵，适合中型RO系统', application: ['中型RO', '高压供水'] },
  { model: 'CDL16-120', series: 'cdl', flow: 16, head: 120, power: 11, rpm: 2900, inletDn: 50, outletDn: 40, maxPressure: 13, material: '304SS', description: '标准高压泵，适合中型RO系统', application: ['中型RO', '高压供水'] },
  { model: 'CDL20-100', series: 'cdl', flow: 20, head: 100, power: 11, rpm: 2900, inletDn: 65, outletDn: 40, maxPressure: 11, material: '304SS', description: '标准高压泵，适合中型RO系统', application: ['中型RO', '高压供水'] },
  
  // 中流量型
  { model: 'CDL32-90', series: 'cdl', flow: 32, head: 90, power: 15, rpm: 2900, inletDn: 65, outletDn: 50, maxPressure: 10, material: '304SS', description: '大流量高压泵，适合大型RO系统', application: ['大型RO', '高压供水'] },
  { model: 'CDL42-80', series: 'cdl', flow: 42, head: 80, power: 15, rpm: 2900, inletDn: 80, outletDn: 50, maxPressure: 9, material: '304SS', description: '大流量高压泵，适合大型RO系统', application: ['大型RO', '高压供水'] },
  { model: 'CDL65-70', series: 'cdl', flow: 65, head: 70, power: 18.5, rpm: 2900, inletDn: 80, outletDn: 65, maxPressure: 8, material: '304SS', description: '大流量高压泵，适合大型RO系统', application: ['大型RO', '高压供水'] },
  { model: 'CDL85-60', series: 'cdl', flow: 85, head: 60, power: 22, rpm: 2900, inletDn: 100, outletDn: 65, maxPressure: 7, material: '304SS', description: '大流量高压泵，适合大型RO系统', application: ['大型RO', '高压供水'] },
  
  // 大流量型
  { model: 'CDL120-50', series: 'cdl', flow: 120, head: 50, power: 30, rpm: 2900, inletDn: 100, outletDn: 80, maxPressure: 6, material: '304SS', description: '超大流量泵，适合超滤或预处理', application: ['超滤系统', '预处理', '循环供水'] },
  { model: 'CDL150-40', series: 'cdl', flow: 150, head: 40, power: 30, rpm: 2900, inletDn: 125, outletDn: 80, maxPressure: 5, material: '304SS', description: '超大流量泵，适合超滤或预处理', application: ['超滤系统', '预处理', '循环供水'] },
  { model: 'CDL200-35', series: 'cdl', flow: 200, head: 35, power: 37, rpm: 2900, inletDn: 125, outletDn: 100, maxPressure: 4, material: '304SS', description: '超大流量泵，适合超滤或预处理', application: ['超滤系统', '预处理', '循环供水'] },
  { model: 'CDL250-30', series: 'cdl', flow: 250, head: 30, power: 37, rpm: 2900, inletDn: 150, outletDn: 100, maxPressure: 4, material: '304SS', description: '超大流量泵，适合超滤或预处理', application: ['超滤系统', '预处理', '循环供水'] },
  
  // ==================== CDM/CDMF系列 - 不锈钢多级泵(高压RO专用) ====================
  { model: 'CDM3-220', series: 'cdm', flow: 3, head: 220, power: 4, rpm: 2900, inletDn: 25, outletDn: 25, maxPressure: 24, material: '316SS', description: '不锈钢高压泵，适合小型RO系统', application: ['小型RO高压', '海水淡化'] },
  { model: 'CDM5-200', series: 'cdm', flow: 5, head: 200, power: 5.5, rpm: 2900, inletDn: 32, outletDn: 25, maxPressure: 22, material: '316SS', description: '不锈钢高压泵，适合小型RO系统', application: ['小型RO高压', '海水淡化'] },
  { model: 'CDM10-160', series: 'cdm', flow: 10, head: 160, power: 11, rpm: 2900, inletDn: 40, outletDn: 32, maxPressure: 18, material: '316SS', description: '不锈钢高压泵，适合中型RO系统', application: ['中型RO高压', '海水淡化'] },
  { model: 'CDM15-140', series: 'cdm', flow: 15, head: 140, power: 15, rpm: 2900, inletDn: 50, outletDn: 40, maxPressure: 16, material: '316SS', description: '不锈钢高压泵，适合中型RO系统', application: ['中型RO高压', '海水淡化'] },
  { model: 'CDM20-120', series: 'cdm', flow: 20, head: 120, power: 15, rpm: 2900, inletDn: 50, outletDn: 40, maxPressure: 14, material: '316SS', description: '不锈钢高压泵，适合中型RO系统', application: ['中型RO高压', '海水淡化'] },
  { model: 'CDM32-100', series: 'cdm', flow: 32, head: 100, power: 18.5, rpm: 2900, inletDn: 65, outletDn: 50, maxPressure: 12, material: '316SS', description: '不锈钢高压泵，适合大型RO系统', application: ['大型RO高压', '海水淡化'] },
  { model: 'CDM42-90', series: 'cdm', flow: 42, head: 90, power: 18.5, rpm: 2900, inletDn: 80, outletDn: 50, maxPressure: 10, material: '316SS', description: '不锈钢高压泵，适合大型RO系统', application: ['大型RO高压', '海水淡化'] },
  { model: 'CDM65-80', series: 'cdm', flow: 65, head: 80, power: 22, rpm: 2900, inletDn: 80, outletDn: 65, maxPressure: 9, material: '316SS', description: '不锈钢高压泵，适合大型RO系统', application: ['大型RO高压', '海水淡化'] },
  { model: 'CDM85-70', series: 'cdm', flow: 85, head: 70, power: 30, rpm: 2900, inletDn: 100, outletDn: 65, maxPressure: 8, material: '316SS', description: '不锈钢高压泵，适合大型RO系统', application: ['大型RO高压', '海水淡化'] },

  // ==================== CHL/CHLF系列 - 卧式多级离心泵 ====================
  { model: 'CHL2-40', series: 'chlf', flow: 2, head: 40, power: 0.75, rpm: 2900, inletDn: 25, outletDn: 25, maxPressure: 5, material: '304SS', description: '卧式多级泵，适合增压或循环', application: ['增压', '循环供水', '小型系统'] },
  { model: 'CHL4-50', series: 'chlf', flow: 4, head: 50, power: 1.5, rpm: 2900, inletDn: 32, outletDn: 25, maxPressure: 6, material: '304SS', description: '卧式多级泵，适合增压或循环', application: ['增压', '循环供水', '小型系统'] },
  { model: 'CHL8-50', series: 'chlf', flow: 8, head: 50, power: 2.2, rpm: 2900, inletDn: 40, outletDn: 32, maxPressure: 6, material: '304SS', description: '卧式多级泵，适合增压或循环', application: ['增压', '循环供水', '中小型系统'] },
  { model: 'CHL12-40', series: 'chlf', flow: 12, head: 40, power: 3, rpm: 2900, inletDn: 50, outletDn: 32, maxPressure: 5, material: '304SS', description: '卧式多级泵，适合增压或循环', application: ['增压', '循环供水', '中型系统'] },
  { model: 'CHL16-40', series: 'chlf', flow: 16, head: 40, power: 4, rpm: 2900, inletDn: 50, outletDn: 40, maxPressure: 5, material: '304SS', description: '卧式多级泵，适合增压或循环', application: ['增压', '循环供水', '中型系统'] },
  { model: 'CHL20-30', series: 'chlf', flow: 20, head: 30, power: 4, rpm: 2900, inletDn: 65, outletDn: 40, maxPressure: 4, material: '304SS', description: '卧式多级泵，适合增压或循环', application: ['增压', '循环供水', '中型系统'] },

  // ==================== TD系列 - 管道循环泵 ====================
  { model: 'TD32-18/2', series: 'td', flow: 6, head: 18, power: 0.55, rpm: 2900, inletDn: 32, outletDn: 32, maxPressure: 3, material: '铸铁/304SS', description: '管道循环泵，适合小流量循环', application: ['循环', '空调系统', '小型供水'] },
  { model: 'TD40-25/2', series: 'td', flow: 12, head: 25, power: 1.5, rpm: 2900, inletDn: 40, outletDn: 40, maxPressure: 4, material: '铸铁/304SS', description: '管道循环泵，适合中流量循环', application: ['循环', '空调系统', '中型供水'] },
  { model: 'TD50-35/2', series: 'td', flow: 18, head: 35, power: 3, rpm: 2900, inletDn: 50, outletDn: 50, maxPressure: 4, material: '铸铁/304SS', description: '管道循环泵，适合中流量循环', application: ['循环', '空调系统', '中型供水'] },
  { model: 'TD65-40/2', series: 'td', flow: 25, head: 40, power: 5.5, rpm: 2900, inletDn: 65, outletDn: 65, maxPressure: 5, material: '铸铁/304SS', description: '管道循环泵，适合大流量循环', application: ['循环', '空调系统', '大型供水'] },
  { model: 'TD80-47/2', series: 'td', flow: 42, head: 47, power: 11, rpm: 2900, inletDn: 80, outletDn: 80, maxPressure: 6, material: '铸铁/304SS', description: '管道循环泵，适合大流量循环', application: ['循环', '空调系统', '大型供水'] },
  { model: 'TD100-52/2', series: 'td', flow: 60, head: 52, power: 15, rpm: 2900, inletDn: 100, outletDn: 100, maxPressure: 6, material: '铸铁/304SS', description: '管道循环泵，适合超大流量循环', application: ['循环', '大型系统'] },
  { model: 'TD125-52/2', series: 'td', flow: 90, head: 52, power: 22, rpm: 2900, inletDn: 125, outletDn: 125, maxPressure: 6, material: '铸铁/304SS', description: '管道循环泵，适合超大流量循环', application: ['循环', '大型系统'] },
  { model: 'TD150-52/2', series: 'td', flow: 120, head: 52, power: 30, rpm: 2900, inletDn: 150, outletDn: 150, maxPressure: 6, material: '铸铁/304SS', description: '管道循环泵，适合超大流量循环', application: ['循环', '大型系统'] },

  // ==================== NISO系列 - 端吸离心泵 ====================
  { model: 'NISO32-160', series: 'niso', flow: 6, head: 32, power: 1.5, rpm: 2900, inletDn: 32, outletDn: 25, maxPressure: 4, material: '铸铁', description: '端吸离心泵，适合原水输送', application: ['原水输送', '供水', '排水'] },
  { model: 'NISO40-160', series: 'niso', flow: 12, head: 32, power: 2.2, rpm: 2900, inletDn: 40, outletDn: 32, maxPressure: 4, material: '铸铁', description: '端吸离心泵，适合原水输送', application: ['原水输送', '供水', '排水'] },
  { model: 'NISO50-160', series: 'niso', flow: 18, head: 32, power: 3, rpm: 2900, inletDn: 50, outletDn: 40, maxPressure: 4, material: '铸铁', description: '端吸离心泵，适合原水输送', application: ['原水输送', '供水', '排水'] },
  { model: 'NISO65-160', series: 'niso', flow: 25, head: 32, power: 5.5, rpm: 2900, inletDn: 65, outletDn: 50, maxPressure: 4, material: '铸铁', description: '端吸离心泵，适合原水输送', application: ['原水输送', '供水', '排水'] },
  { model: 'NISO80-160', series: 'niso', flow: 42, head: 32, power: 7.5, rpm: 2900, inletDn: 80, outletDn: 65, maxPressure: 4, material: '铸铁', description: '端吸离心泵，适合原水输送', application: ['原水输送', '供水', '排水'] },
  { model: 'NISO100-160', series: 'niso', flow: 60, head: 32, power: 11, rpm: 2900, inletDn: 100, outletDn: 80, maxPressure: 4, material: '铸铁', description: '端吸离心泵，适合原水输送', application: ['原水输送', '供水', '排水'] },
  { model: 'NISO125-160', series: 'niso', flow: 90, head: 32, power: 15, rpm: 2900, inletDn: 125, outletDn: 100, maxPressure: 4, material: '铸铁', description: '端吸离心泵，适合原水输送', application: ['原水输送', '供水', '排水'] },
  { model: 'NISO150-160', series: 'niso', flow: 120, head: 32, power: 22, rpm: 2900, inletDn: 150, outletDn: 125, maxPressure: 4, material: '铸铁', description: '端吸离心泵，适合原水输送', application: ['原水输送', '供水', '排水'] },

  // ==================== ZS系列 - 不锈钢卧式单级泵 ====================
  { model: 'ZS50-32-200', series: 'zs', flow: 12.5, head: 50, power: 5.5, rpm: 2900, inletDn: 50, outletDn: 32, maxPressure: 6, material: '304SS', description: '不锈钢卧式泵，适合增压', application: ['增压', '供水', '化工'] },
  { model: 'ZS65-40-200', series: 'zs', flow: 25, head: 50, power: 7.5, rpm: 2900, inletDn: 65, outletDn: 40, maxPressure: 6, material: '304SS', description: '不锈钢卧式泵，适合增压', application: ['增压', '供水', '化工'] },
  { model: 'ZS80-50-200', series: 'zs', flow: 50, head: 50, power: 15, rpm: 2900, inletDn: 80, outletDn: 50, maxPressure: 6, material: '304SS', description: '不锈钢卧式泵，适合增压', application: ['增压', '供水', '化工'] },
  { model: 'ZS100-65-200', series: 'zs', flow: 100, head: 50, power: 22, rpm: 2900, inletDn: 100, outletDn: 65, maxPressure: 6, material: '304SS', description: '不锈钢卧式泵，适合增压', application: ['增压', '供水', '化工'] },

  // ==================== QS系列 - 潜水泵(原水泵) ====================
  { model: 'QS200-15-15', series: 'qs', flow: 200, head: 15, power: 15, rpm: 2900, inletDn: 150, outletDn: 150, maxPressure: 2, material: '铸铁/304SS', description: '潜水泵，适合深井取水', application: ['深井取水', '原水输送'] },
  { model: 'QS250-12-15', series: 'qs', flow: 250, head: 12, power: 15, rpm: 2900, inletDn: 150, outletDn: 150, maxPressure: 2, material: '铸铁/304SS', description: '潜水泵，适合深井取水', application: ['深井取水', '原水输送'] },
  { model: 'QS300-10-15', series: 'qs', flow: 300, head: 10, power: 15, rpm: 2900, inletDn: 200, outletDn: 200, maxPressure: 1.5, material: '铸铁/304SS', description: '潜水泵，适合深井取水', application: ['深井取水', '原水输送'] },

  // ==================== WQ系列 - 污水泵(废水回用) ====================
  { model: 'WQ10-15-1.5', series: 'wq', flow: 10, head: 15, power: 1.5, rpm: 2900, inletDn: 50, outletDn: 50, maxPressure: 2, material: '铸铁', description: '污水泵，适合废水回用', application: ['废水回用', '排污'] },
  { model: 'WQ15-15-2.2', series: 'wq', flow: 15, head: 15, power: 2.2, rpm: 2900, inletDn: 50, outletDn: 50, maxPressure: 2, material: '铸铁', description: '污水泵，适合废水回用', application: ['废水回用', '排污'] },
  { model: 'WQ25-15-3', series: 'wq', flow: 25, head: 15, power: 3, rpm: 2900, inletDn: 65, outletDn: 65, maxPressure: 2, material: '铸铁', description: '污水泵，适合废水回用', application: ['废水回用', '排污'] },
  { model: 'WQ40-15-4', series: 'wq', flow: 40, head: 15, power: 4, rpm: 2900, inletDn: 80, outletDn: 80, maxPressure: 2, material: '铸铁', description: '污水泵，适合废水回用', application: ['废水回用', '排污'] },

  // ==================== 段间泵/增压泵 - RO分压设计专用 ====================
  // 段间泵用于两段式RO系统，为第二段补充压力
  // 特点：进口压力高、增压量适中、耐高压设计
  { model: 'HPB-40-150', series: 'hpb', flow: 40, head: 40, power: 7.5, rpm: 2900, inletDn: 50, outletDn: 40, maxPressure: 25, material: '316SS', description: '段间泵，进口承压16bar，增压4bar', application: ['RO段间增压', '两段式RO'] },
  { model: 'HPB-60-150', series: 'hpb', flow: 60, head: 40, power: 11, rpm: 2900, inletDn: 65, outletDn: 50, maxPressure: 25, material: '316SS', description: '段间泵，进口承压16bar，增压4bar', application: ['RO段间增压', '两段式RO'] },
  { model: 'HPB-80-200', series: 'hpb', flow: 80, head: 40, power: 15, rpm: 2900, inletDn: 80, outletDn: 50, maxPressure: 28, material: '316SS', description: '段间泵，进口承压20bar，增压4bar', application: ['RO段间增压', '两段式RO'] },
  { model: 'HPB-100-200', series: 'hpb', flow: 100, head: 40, power: 18.5, rpm: 2900, inletDn: 100, outletDn: 65, maxPressure: 28, material: '316SS', description: '段间泵，进口承压20bar，增压4bar', application: ['RO段间增压', '两段式RO'] },
  { model: 'HPB-150-250', series: 'hpb', flow: 150, head: 40, power: 30, rpm: 2900, inletDn: 125, outletDn: 80, maxPressure: 32, material: '316SS', description: '段间泵，进口承压24bar，增压4bar', application: ['RO段间增压', '两段式RO', '高盐度水'] },
  { model: 'HPB-200-250', series: 'hpb', flow: 200, head: 40, power: 37, rpm: 2900, inletDn: 150, outletDn: 100, maxPressure: 32, material: '316SS', description: '段间泵，进口承压24bar，增压4bar', application: ['RO段间增压', '两段式RO', '高盐度水'] },
  
  // 高压段间泵（海水/高盐度水专用）
  { model: 'HPH-80-400', series: 'hph', flow: 80, head: 40, power: 15, rpm: 2900, inletDn: 80, outletDn: 50, maxPressure: 45, material: '2205SS', description: '高压段间泵，进口承压32bar，增压4bar', application: ['海水淡化', '高盐度水RO'] },
  { model: 'HPH-100-400', series: 'hph', flow: 100, head: 40, power: 18.5, rpm: 2900, inletDn: 100, outletDn: 65, maxPressure: 45, material: '2205SS', description: '高压段间泵，进口承压32bar，增压4bar', application: ['海水淡化', '高盐度水RO'] },
  { model: 'HPH-150-450', series: 'hph', flow: 150, head: 40, power: 30, rpm: 2900, inletDn: 125, outletDn: 80, maxPressure: 50, material: '2205SS', description: '高压段间泵，进口承压35bar，增压4bar', application: ['海水淡化', '高盐度水RO'] },
];

// 泵系列说明
export const pumpSeriesInfo = {
  cdl: { name: 'CDL/CDLF', fullName: '立式多级离心泵', description: '高效节能，适合RO高压供水', type: 'high_pressure' },
  cdm: { name: 'CDM/CDMF', fullName: '不锈钢高压多级泵', description: '高压专用，适合海水淡化', type: 'high_pressure' },
  chlf: { name: 'CHL/CHLF', fullName: '卧式多级离心泵', description: '安装方便，适合增压循环', type: 'medium_pressure' },
  td: { name: 'TD', fullName: '管道循环泵', description: '直连管道，适合循环系统', type: 'circulation' },
  niso: { name: 'NISO', fullName: '端吸离心泵', description: '大流量低扬程，适合原水输送', type: 'feed' },
  zs: { name: 'ZS', fullName: '不锈钢卧式单级泵', description: '耐腐蚀，适合化工供水', type: 'medium_pressure' },
  qs: { name: 'QS', fullName: '潜水泵', description: '深井取水，适合原水泵', type: 'source' },
  wq: { name: 'WQ', fullName: '污水泵', description: '排污能力强，适合废水回用', type: 'waste' },
  hpb: { name: 'HPB', fullName: '段间增压泵', description: '耐高压进口，适合两段式RO段间增压', type: 'interstage' },
  hph: { name: 'HPH', fullName: '高压段间泵', description: '高压进口设计，适合海水/高盐度水RO', type: 'interstage_high' },
};

// 根据流量和扬程推荐水泵
export function recommendPump(
  requiredFlow: number, // m³/h
  requiredHead: number, // m
  application: string = 'ro' // ro, uf, feed, circulation
): {
  primary: PumpProduct | null;
  alternatives: PumpProduct[];
  reasoning: string;
  parallelCount?: number; // 并联台数
} {
  // 筛选符合条件的泵
  const candidates = cnpPumps.filter(pump => {
    // 流量匹配：额定流量应在设计流量的50%-130%范围内（放宽下限以支持大型系统）
    const flowMatch = pump.flow >= requiredFlow * 0.5 && pump.flow <= requiredFlow * 1.3;
    // 扬程匹配：扬程应略大于需求
    const headMatch = pump.head >= requiredHead * 0.85 && pump.head <= requiredHead * 1.5;
    return flowMatch && headMatch;
  });
  
  // 按匹配度排序
  const sortedCandidates = candidates.sort((a, b) => {
    const aFlowDiff = Math.abs(a.flow - requiredFlow);
    const bFlowDiff = Math.abs(b.flow - requiredFlow);
    const aHeadDiff = Math.abs(a.head - requiredHead);
    const bHeadDiff = Math.abs(b.head - requiredHead);
    return (aFlowDiff + aHeadDiff * 0.5) - (bFlowDiff + bHeadDiff * 0.5);
  });
  
  // 应用场景筛选
  let filteredCandidates = sortedCandidates;
  if (application === 'ro') {
    // RO系统优先选择CDL/CDM系列
    filteredCandidates = sortedCandidates.filter(p => ['cdl', 'cdm'].includes(p.series));
    if (filteredCandidates.length === 0) {
      filteredCandidates = sortedCandidates;
    }
  } else if (application === 'uf') {
    // 超滤系统选择CDL大流量型或TD
    filteredCandidates = sortedCandidates.filter(p => ['cdl', 'td'].includes(p.series));
    if (filteredCandidates.length === 0) {
      filteredCandidates = sortedCandidates;
    }
  } else if (application === 'feed') {
    // 原水泵选择NISO或QS
    filteredCandidates = sortedCandidates.filter(p => ['niso', 'qs'].includes(p.series));
    if (filteredCandidates.length === 0) {
      filteredCandidates = sortedCandidates;
    }
  }
  
  const primary = filteredCandidates[0] || null;
  const alternatives = filteredCandidates.slice(1, 4);
  
  // 计算是否需要多台泵并联
  let parallelCount = 1;
  if (primary && primary.flow < requiredFlow * 0.9) {
    parallelCount = Math.ceil(requiredFlow / primary.flow);
  }
  
  let reasoning = '';
  if (primary) {
    reasoning = `根据设计流量${requiredFlow}m³/h和扬程${requiredHead}m，推荐${primary.model}`;
    if (parallelCount > 1) {
      reasoning += `（${parallelCount}台并联）`;
    }
    reasoning += `。该泵额定流量${primary.flow}m³/h，扬程${primary.head}m，功率${primary.power}kW。`;
  } else {
    reasoning = `未找到满足流量${requiredFlow}m³/h、扬程${requiredHead}m的水泵，请考虑调整设计参数或联系技术支持。`;
  }
  
  return {
    primary,
    alternatives,
    reasoning,
    parallelCount
  };
}

// 计算RO系统高压泵扬程需求
export function calculateROHighPressurePumpHead(
  membraneCategory: 'bw' | 'sw' | 'le',
  recovery: number,
  feedTDS: number,
  stages: number = 1
): number {
  // 基础扬程 (根据膜类型)
  let baseHead = 0;
  if (membraneCategory === 'le') {
    baseHead = 70; // 100 psi ≈ 70m
  } else if (membraneCategory === 'bw') {
    baseHead = 155; // 225 psi ≈ 155m
  } else {
    baseHead = 550; // 800 psi ≈ 550m
  }
  
  // 根据TDS调整 (TDS越高，需要更高压力)
  const tdsAdjustment = Math.max(0, (feedTDS - 1000) / 1000) * 15;
  
  // 根据回收率调整 (回收率越高，需要更高压力)
  const recoveryAdjustment = Math.max(0, (recovery - 70) / 10) * 20;
  
  // 段数调整 (多段系统需要稍低压力)
  const stageAdjustment = (stages - 1) * (-10);
  
  // 系统余量 (10%)
  const totalHead = (baseHead + tdsAdjustment + recoveryAdjustment + stageAdjustment) * 1.1;
  
  return Math.round(totalHead);
}

// 计算泵的轴功率和电机功率
export function calculatePumpPower(
  flow: number, // m³/h
  head: number, // m
  efficiency: number = 0.7, // 泵效率
  safetyFactor: number = 1.1 // 安全系数
): {
  shaftPower: number; // 轴功率 kW
  motorPower: number; // 电机功率 kW
  estimatedCurrent: number; // 估算电流 A (380V)
} {
  // 轴功率 = ρgQH / (1000 * η)
  // ρ=1000kg/m³, g=9.81m/s², Q=m³/s, H=m
  const flowM3s = flow / 3600;
  const shaftPower = (1000 * 9.81 * flowM3s * head) / (1000 * efficiency);
  const motorPower = shaftPower * safetyFactor;
  const estimatedCurrent = (motorPower * 1000) / (380 * 1.732 * 0.85); // 功率因数0.85
  
  return {
    shaftPower: Math.round(shaftPower * 100) / 100,
    motorPower: Math.ceil(motorPower),
    estimatedCurrent: Math.round(estimatedCurrent)
  };
}

// ==================== 分压设计相关函数 ====================

// 段间泵配置接口
export interface InterstagePumpConfig {
  required: boolean;           // 是否需要段间泵
  stage1FeedFlow: number;      // 第一段进水量 m³/h
  stage1PermeateFlow: number;  // 第一段产水量 m³/h
  stage2FeedFlow: number;      // 第二段进水量 m³/h（=第一段浓水）
  stage1Pressure: number;      // 第一段运行压力 bar
  stage1ConcentratePressure: number; // 第一段浓水压力 bar
  boostPressure: number;       // 段间泵增压 bar
  stage2Pressure: number;      // 第二段进水压力 bar
  pump: PumpProduct | null;    // 推荐的段间泵
  reasoning: string;           // 选型说明
}

// 判断是否需要段间泵并计算配置
export function calculateInterstagePump(
  designFlow: {
    feed: number;      // 总进水量 m³/h
    permeate: number;  // 总产水量 m³/h
    recovery: number;  // 回收率 %
  },
  stages: number,      // 段数
  feedTDS: number,     // 进水TDS mg/L
  membraneCategory: 'bw' | 'sw' | 'le'
): InterstagePumpConfig {
  // 单段系统不需要段间泵
  if (stages < 2) {
    return {
      required: false,
      stage1FeedFlow: designFlow.feed,
      stage1PermeateFlow: designFlow.permeate,
      stage2FeedFlow: 0,
      stage1Pressure: 0,
      stage1ConcentratePressure: 0,
      boostPressure: 0,
      stage2Pressure: 0,
      pump: null,
      reasoning: '单段式系统无需段间泵'
    };
  }

  // 计算各段流量
  // 两段式系统：第一段回收率约50%，第二段回收率约50%
  const stage1Recovery = 0.50; // 第一段回收率
  const stage1FeedFlow = designFlow.feed;
  const stage1PermeateFlow = stage1FeedFlow * stage1Recovery;
  const stage2FeedFlow = stage1FeedFlow - stage1PermeateFlow; // 第一段浓水
  
  // 计算第一段压力
  let basePressure = 0; // bar
  if (membraneCategory === 'le') {
    basePressure = 7; // 100 psi
  } else if (membraneCategory === 'bw') {
    basePressure = 15; // 225 psi
  } else {
    basePressure = 55; // 800 psi
  }
  
  // TDS修正（高TDS需要更高压力）
  const tdsAdjustment = Math.max(0, (feedTDS - 1000) / 1000) * 1.5;
  const stage1Pressure = basePressure + tdsAdjustment;
  
  // 第一段浓水压力（压力损失约1-2 bar）
  const pressureLoss = 1.5;
  const stage1ConcentratePressure = stage1Pressure - pressureLoss;
  
  // 判断是否需要段间泵
  // 需要段间泵的情况：
  // 1. 高盐度水（TDS > 5000）
  // 2. 第一段浓水压力不足以驱动第二段
  // 3. 需要提高第二段效率
  
  const needsInterstagePump = 
    feedTDS > 5000 || 
    membraneCategory === 'sw' ||
    (stages === 2 && designFlow.recovery > 50);
  
  if (!needsInterstagePump) {
    return {
      required: false,
      stage1FeedFlow,
      stage1PermeateFlow,
      stage2FeedFlow,
      stage1Pressure: Math.round(stage1Pressure * 10) / 10,
      stage1ConcentratePressure: Math.round(stage1ConcentratePressure * 10) / 10,
      boostPressure: 0,
      stage2Pressure: Math.round(stage1ConcentratePressure * 10) / 10,
      pump: null,
      reasoning: '低盐度水或低回收率，无需段间泵，第二段可直接利用第一段浓水压力'
    };
  }
  
  // 计算段间泵增压需求
  // 第二段需要更高的进水压力以克服更高的渗透压
  const stage2RequiredPressure = stage1Pressure * 1.15; // 第二段需要更高压力
  const boostPressure = Math.max(0, stage2RequiredPressure - stage1ConcentratePressure);
  
  // 推荐段间泵
  const interstagePump = recommendInterstagePump(
    stage2FeedFlow,
    boostPressure,
    stage1ConcentratePressure,
    membraneCategory
  );
  
  return {
    required: true,
    stage1FeedFlow: Math.round(stage1FeedFlow * 10) / 10,
    stage1PermeateFlow: Math.round(stage1PermeateFlow * 10) / 10,
    stage2FeedFlow: Math.round(stage2FeedFlow * 10) / 10,
    stage1Pressure: Math.round(stage1Pressure * 10) / 10,
    stage1ConcentratePressure: Math.round(stage1ConcentratePressure * 10) / 10,
    boostPressure: Math.round(boostPressure * 10) / 10,
    stage2Pressure: Math.round((stage1ConcentratePressure + boostPressure) * 10) / 10,
    pump: interstagePump.primary,
    reasoning: interstagePump.reasoning
  };
}

// 推荐段间泵
function recommendInterstagePump(
  flow: number,              // 流量 m³/h
  boostPressure: number,     // 增压 bar
  inletPressure: number,     // 进口压力 bar
  membraneCategory: 'bw' | 'sw' | 'le'
): {
  primary: PumpProduct | null;
  alternatives: PumpProduct[];
  reasoning: string;
} {
  // 扬程转换：1 bar ≈ 10.2 m
  const requiredHead = boostPressure * 10.2;
  
  // 筛选段间泵
  const interstagePumps = cnpPumps.filter(p => 
    ['hpb', 'hph'].includes(p.series)
  );
  
  // 根据流量和扬程筛选
  const candidates = interstagePumps.filter(pump => {
    const flowMatch = pump.flow >= flow * 0.8 && pump.flow <= flow * 1.3;
    const headMatch = pump.head >= requiredHead * 0.8 && pump.head <= requiredHead * 1.5;
    // 进口压力校核
    const pressureMatch = (pump.maxPressure || 0) >= inletPressure;
    return flowMatch && headMatch && pressureMatch;
  });
  
  // 海水/高盐度水优先选择HPH系列
  let sortedCandidates = candidates;
  if (membraneCategory === 'sw') {
    const hphCandidates = candidates.filter(p => p.series === 'hph');
    if (hphCandidates.length > 0) {
      sortedCandidates = hphCandidates;
    }
  }
  
  // 排序
  sortedCandidates.sort((a, b) => {
    const aFlowDiff = Math.abs(a.flow - flow);
    const bFlowDiff = Math.abs(b.flow - flow);
    return aFlowDiff - bFlowDiff;
  });
  
  const primary = sortedCandidates[0] || null;
  const alternatives = sortedCandidates.slice(1, 3);
  
  let reasoning = '';
  if (primary) {
    reasoning = `段间泵选型：流量${flow.toFixed(1)}m³/h，增压${boostPressure.toFixed(1)}bar，进口压力${inletPressure.toFixed(1)}bar。`;
    reasoning += `推荐${primary.model}，额定流量${primary.flow}m³/h，扬程${primary.head}m，功率${primary.power}kW。`;
    reasoning += `该泵最大承压${primary.maxPressure}bar，适用于${membraneCategory === 'sw' ? '海水/高盐度水' : '苦咸水'}RO系统。`;
  } else {
    reasoning = `未找到合适的段间泵。建议：流量${flow.toFixed(1)}m³/h，增压${boostPressure.toFixed(1)}bar，进口承压${inletPressure.toFixed(1)}bar。`;
    reasoning += `请联系厂家定制或选用多台泵并联。`;
  }
  
  return { primary, alternatives, reasoning };
}

// 完整水泵配置结果
export interface CompletePumpConfiguration {
  feedPump: {
    selected: PumpProduct | null;
    alternatives: PumpProduct[];
    reasoning: string;
  } | null;
  highPressurePump: {
    selected: PumpProduct | null;
    alternatives: PumpProduct[];
    reasoning: string;
    pressure: number; // bar
    parallelCount?: number; // 并联台数
  } | null;
  interstagePump: InterstagePumpConfig | null;
  summary: {
    totalPower: number;      // 总功率 kW
    feedPumpPower: number;   // 原水泵功率 kW
    hpPumpPower: number;     // 高压泵功率 kW
    interstagePumpPower: number; // 段间泵功率 kW
    designType: string;      // 设计类型描述
    useInterstage: boolean;  // 是否使用分压设计
  };
}

// 完整水泵配置计算
export function calculateCompletePumpConfiguration(
  designFlow: {
    feed: number;
    permeate: number;
    recovery: number;
  },
  stages: number,
  feedTDS: number,
  membraneCategory: 'bw' | 'sw' | 'le'
): CompletePumpConfiguration {
  // 1. 原水泵
  const feedPump = recommendPump(
    designFlow.feed * 1.2, // 20%余量
    30, // 预处理需要30m扬程
    'feed'
  );
  
  // 2. 先判断是否需要分压设计
  const interstagePump = calculateInterstagePump(designFlow, stages, feedTDS, membraneCategory);
  
  // 3. 计算高压泵扬程
  // 大型系统（>50m³/h）采用多台泵并联方案
  // 分压设计时，第一段高压泵扬程降低
  let hpHead: number;
  let singlePumpFlow = designFlow.feed;
  
  if (interstagePump.required && stages >= 2) {
    // 分压设计：第一段高压泵扬程为总扬程的55%-65%
    const totalHead = calculateROHighPressurePumpHead(membraneCategory, designFlow.recovery, feedTDS, stages);
    hpHead = Math.round(totalHead * 0.58); // 第一段承担约58%的压力，降低以匹配实际水泵规格
  } else {
    hpHead = calculateROHighPressurePumpHead(membraneCategory, designFlow.recovery, feedTDS, stages);
  }
  
  // 对于大型系统，考虑多台泵并联
  let pumpCount = 1;
  if (designFlow.feed > 50) {
    // 大型系统使用2台以上泵并联
    pumpCount = Math.ceil(designFlow.feed / 50);
    singlePumpFlow = designFlow.feed / pumpCount;
  }
  
  const highPressurePump = recommendPump(
    singlePumpFlow,
    hpHead,
    'ro'
  );
  
  // 4. 汇总
  const feedPumpPower = feedPump.primary?.power || 0;
  const hpPumpPower = (highPressurePump.primary?.power || 0) * pumpCount;
  const interstagePumpPower = interstagePump.pump?.power || 0;
  const totalPower = feedPumpPower + hpPumpPower + interstagePumpPower;
  
  let designType = '单级高压设计';
  if (interstagePump.required) {
    designType = `分压设计（${pumpCount}台高压泵+段间泵）`;
  } else if (pumpCount > 1) {
    designType = `${pumpCount}台高压泵并联`;
  }
  
  // 更新高压泵推荐说明
  let hpReasoning = highPressurePump.reasoning;
  if (pumpCount > 1 && highPressurePump.primary) {
    hpReasoning = `系统流量较大，推荐${pumpCount}台${highPressurePump.primary.model}并联运行。单台流量${singlePumpFlow.toFixed(1)}m³/h，总流量${designFlow.feed}m³/h，扬程${hpHead}m。`;
  }
  
  return {
    feedPump: feedPump.primary ? {
      selected: feedPump.primary,
      alternatives: feedPump.alternatives,
      reasoning: feedPump.reasoning
    } : null,
    highPressurePump: highPressurePump.primary ? {
      selected: highPressurePump.primary,
      alternatives: highPressurePump.alternatives,
      reasoning: hpReasoning,
      pressure: Math.round(hpHead * 10 / 10.2) / 10, // 转换为bar
      parallelCount: pumpCount
    } : null,
    interstagePump,
    summary: {
      totalPower,
      feedPumpPower,
      hpPumpPower,
      interstagePumpPower,
      designType,
      useInterstage: interstagePump.required
    }
  };
}
