// 测试脚本 - 验证水质参数去除率计算
import { simulateWaterTreatment } from './src/lib/utils/filter-simulation';

const inletWaterQuality = {
  ph: 7.9,
  tds: 1860,
  conductivity: 3254,
  turbidity: 0.4,
  ss: 1860,           // 可滤残渣 mg/L
  silt: 1,            // 悬浮物 mg/L
  calcium: 74.1,      // 钙 mg/L
  magnesium: 9.83,    // 镁 mg/L
  sodium: 621,        // 钠 mg/L
  chloride: 531,      // 氯离子 mg/L
  nitrate: 39.5,      // 硝酸根 mg/L
  carbonate: 13,       // 碳酸盐 mg/L
  hardness: 234.1,    // 总硬度 mg/L
  bicarbonate: 183.9, // 重碳酸根 mg/L (从碱度估算)
  cod: 23,            // 化学需氧量 mg/L
  totalNitrogen: 0.03,// 总氮 mg/L
  fecalColiform: 170  // 粪大肠菌群
};

const processUnits = [
  { type: 'filter_media', config: { filterVelocity: 10 } },
  { type: 'filter_precision', params: { precision: '5um' } },
  { type: 'uf', config: { model: 'SFP-2860' } },
  { type: 'ro', config: { model: 'BW30-400', stages: 1, recovery: 75 } }
];

const designFlow = { feed: 100, permeate: 75, recovery: 75 };

const result = simulateWaterTreatment(inletWaterQuality, processUnits, designFlow);

console.log('=== 进水水质 ===');
console.log(JSON.stringify(inletWaterQuality, null, 2));

console.log('\n=== 工艺单元模拟结果 ===');
result.simulation.forEach((step, i) => {
  console.log(`\n--- ${i+1}. ${step.unit} ---`);
  console.log('去除率:', JSON.stringify(step.removalRates, null, 2));
});

console.log('\n=== 最终出水水质 ===');
console.log(JSON.stringify(result.finalWater, null, 2));

console.log('\n=== 达标情况 ===');
console.log(JSON.stringify(result.targetAssessment, null, 2));
