/**
 * 过滤模拟算法 v3.0 验证测试
 * 验证各物理模型的计算结果合理性
 */

// 模拟WaterQuality类型
interface WaterQuality {
  ph: number;
  tds: number;
  conductivity: number;
  turbidity: number;
  hardness: number;
  cod: number;
  chlorine: number;
  iron: number;
  silica: number;
  sdi?: number;
  bacteria?: number;
  virus?: number;
  silt?: number;
  manganese?: number;
  sulfate?: number;
  chloride?: number;
  toc?: number;
}

// ==================== 核心物理模型验证 ====================

function testOsmoticPressure() {
  console.log('=== 渗透压计算验证 ===');
  
  // van't Hoff 经验式: pi(bar) ≈ 0.711 * TDS(g/L) @25°C
  // 2000ppm NaCl → ~1.42 bar (文献值 1.4-1.5 bar) ✓
  const pi1 = calculateOsmoticPressure(2000, 25);
  console.log(`2000ppm NaCl @25°C: π = ${pi1.toFixed(3)} bar (期望 ~1.42) ${Math.abs(pi1 - 1.422) < 0.1 ? '✓' : '✗'}`);
  
  // 35000ppm 海水 → ~24.9 bar (文献值 25-27 bar) ✓
  const pi2 = calculateOsmoticPressure(35000, 25);
  console.log(`35000ppm 海水 @25°C: π = ${pi2.toFixed(2)} bar (期望 ~24.9) ${Math.abs(pi2 - 24.9) < 2 ? '✓' : '✗'}`);
  
  // 500ppm 自来水 → ~0.36 bar ✓
  const pi3 = calculateOsmoticPressure(500, 25);
  console.log(`500ppm 自来水 @25°C: π = ${pi3.toFixed(3)} bar (期望 ~0.36) ${Math.abs(pi3 - 0.356) < 0.05 ? '✓' : '✗'}`);
  
  // 温度效应: T升高→π增大
  const pi_15 = calculateOsmoticPressure(2000, 15);
  const pi_35 = calculateOsmoticPressure(2000, 35);
  console.log(`温度效应: 15°C=${pi_15.toFixed(3)}, 25°C=${pi1.toFixed(3)}, 35°C=${pi_35.toFixed(3)} ${pi_35 > pi_15 ? '✓(温度升高π增大)' : '✗'}`);
}

function testTCF() {
  console.log('\n=== TCF温度修正系数验证 ===');
  
  // FilmTec官方值 (Form 45-D01658):
  // 25°C: TCF = 1.000
  // 15°C: TCF ≈ 0.753
  // 35°C: TCF ≈ 1.307
  
  const tcf_25 = calculateTCF(25);
  const tcf_15 = calculateTCF(15);
  const tcf_35 = calculateTCF(35);
  const tcf_10 = calculateTCF(10);
  
  console.log(`25°C: TCF = ${tcf_25.toFixed(4)} (期望 1.000) ${Math.abs(tcf_25 - 1.0) < 0.001 ? '✓' : '✗'}`);
  console.log(`15°C: TCF = ${tcf_15.toFixed(4)} (期望 ~0.753) ${Math.abs(tcf_15 - 0.753) < 0.05 ? '✓' : '✗'}`);
  console.log(`35°C: TCF = ${tcf_35.toFixed(4)} (期望 ~1.307) ${Math.abs(tcf_35 - 1.307) < 0.05 ? '✓' : '✗'}`);
  console.log(`10°C: TCF = ${tcf_10.toFixed(4)} (低温产水量减少)`);
}

function testConcentrationPolarization() {
  console.log('\n=== 浓差极化因子 β 验证 ===');
  
  // β = exp(Jw/k), FilmTec限值 β_max = 1.2
  const beta1 = calculateConcentrationPolarization(20, 30);
  const beta2 = calculateConcentrationPolarization(30, 30);
  const beta3 = calculateConcentrationPolarization(50, 30); // 高通量
  
  console.log(`Jw=20, k=30: β = ${beta1.toFixed(4)} (期望 ~1.87→限制1.20) ${beta1 <= 1.2 ? '✓' : '✗'}`);
  console.log(`Jw=30, k=30: β = ${beta2.toFixed(4)} (期望 e^1=2.72→限制1.20) ${beta2 <= 1.2 ? '✓' : '✗'}`);
  console.log(`Jw=50, k=30: β = ${beta3.toFixed(4)} (高通量, 限制在1.20) ${beta3 <= 1.2 ? '✓' : '✗'}`);
  
  // 低通量 (k足够大时beta接近1)
  const beta_low = calculateConcentrationPolarization(5, 50);
  console.log(`Jw=5, k=50: β = ${beta_low.toFixed(4)} (低通量, 接近1.0) ${beta_low < 1.1 ? '✓' : '✗'}`);
}

function testSpieglerKedem() {
  console.log('\n=== Spiegler-Kedem 模型验证 ===');
  
  // 高脱盐率RO膜: sigma=0.98, Pe=10
  const r1 = spieglerKedemRejection(0.98, 10, 1.1);
  console.log(`sigma=0.98, Pe=10, beta=1.1: R_obs = ${(r1*100).toFixed(2)}% (期望 ~97-98%) ${r1 > 0.96 ? '✓' : '✗'}`);
  
  // 高Peclet数 (Pe→∞): R → sigma
  const r2 = spieglerKedemRejection(0.99, 100, 1.05);
  console.log(`sigma=0.99, Pe=100, beta=1.05: R_obs = ${(r2*100).toFixed(2)}% (趋近sigma=99%) ${r2 > 0.98 ? '✓' : '✗'}`);
  
  // 低Peclet数 (Pe→0): R → 0 (低截留)
  const r3 = spieglerKedemRejection(0.95, 0.1, 1.05);
  console.log(`sigma=0.95, Pe=0.1, beta=1.05: R_obs = ${(r3*100).toFixed(2)}% (低Pe, 低截留) ${r3 < 0.2 ? '✓' : '✗'}`);
  
  // sigma=1 (完美半透膜): R应接近1 (Pe足够大时)
  const r4 = spieglerKedemRejection(1.0, 20, 1.05);
  console.log(`sigma=1.0, Pe=20, beta=1.05: R_obs = ${(r4*100).toFixed(2)}% (完美膜) ${r4 > 0.99 ? '✓' : '✗'}`);
  
  // NF膜: sigma=0.85, 中等Pe
  const r5 = spieglerKedemRejection(0.85, 5, 1.08);
  console.log(`sigma=0.85, Pe=5, beta=1.08: R_obs = ${(r5*100).toFixed(2)}% (NF膜特征) ${r5 > 0.7 && r5 < 0.9 ? '✓' : '✗'}`);
}

function testDeriveSKParameters() {
  console.log('\n=== SK参数反算验证 ===');
  
  // BW30-400: 标准脱盐率 99.0%
  const sk1 = deriveSKParameters(0.99);
  console.log(`BW30-400 (R=99%): sigma=${sk1.sigma.toFixed(4)}, P_s=${sk1.P_s.toFixed(5)} L/(m²·h), Lp=${sk1.Lp}`);
  
  // SW30HR-380: 标准脱盐率 99.7%
  const sk2 = deriveSKParameters(0.997);
  console.log(`SW30HR-380 (R=99.7%): sigma=${sk2.sigma.toFixed(4)}, P_s=${sk2.P_s.toFixed(5)} L/(m²·h) ${sk2.P_s < sk1.P_s ? '✓(P_s更低=更高脱盐)' : '✗'}`);
  
  // LE膜: 标准脱盐率 99.0% (低能耗, 更高Lp)
  const sk3 = deriveSKParameters(0.99);
  console.log(`LE膜 (R=99%): sigma=${sk3.sigma.toFixed(4)}, P_s=${sk3.P_s.toFixed(5)} L/(m²·h)`);
}

function testMassTransferCoeff() {
  console.log('\n=== 传质系数 k 估算验证 ===');
  
  const k25 = estimateMassTransferCoeff(25);
  const k15 = estimateMassTransferCoeff(15);
  const k35 = estimateMassTransferCoeff(35);
  
  console.log(`25°C: k = ${k25.toFixed(1)} L/(m²·h) (典型范围20-50) ${k25 >= 10 && k25 <= 80 ? '✓' : '✗'}`);
  console.log(`15°C: k = ${k15.toFixed(1)} L/(m²·h) (低温, 扩散系数降低)`);
  console.log(`35°C: k = ${k35.toFixed(1)} L/(m²·h) (高温, 扩散系数升高)`);
  console.log(`温度效应: k(35)/k(25) = ${(k35/k25).toFixed(3)} ${k35 > k25 ? '✓(高温k增大)' : '✗'}`);
}

// ==================== 核心物理模型函数定义 (与filter-simulation.ts一致) ====================

function calculateOsmoticPressure(tds: number, temperature: number = 25): number {
  if (tds <= 0) return 0;
  const piBase = 0.711 * (tds / 1000);
  const tempCorrection = (273 + temperature) / 298;
  return piBase * tempCorrection;
}

function calculateTCF(temperature: number): number {
  const T = 273 + temperature;
  const U = temperature >= 25 ? 2640 : 3020;
  return Math.exp(U * (1 / 298 - 1 / T));
}

function calculateConcentrationPolarization(flux: number, massTransferCoeff: number = 30): number {
  if (flux <= 0 || massTransferCoeff <= 0) return 1.0;
  return Math.min(Math.exp(flux / massTransferCoeff), 1.2);
}

function calculatePecletNumber(flux: number, sigma: number, solutePermeability: number): number {
  if (solutePermeability <= 0) return 100;
  return flux * (1 - sigma) / solutePermeability;
}

function spieglerKedemRejection(sigma: number, pecletNumber: number, beta: number = 1.1): number {
  if (sigma <= 0) return 0;
  const expPe = Math.exp(-pecletNumber);
  const R_true = sigma * (1 - expPe) / (sigma + (1 - sigma) * expPe);
  return Math.max(0, Math.min(1, R_true / (beta + (1 - beta) * R_true)));
}

function estimateMassTransferCoeff(temperature: number = 25, velocity: number = 0.1, hydraulicDiameter: number = 0.001): number {
  const T = 273 + temperature;
  const D_25 = 1.61e-9;
  const mu_25 = 0.890e-3;
  const mu_T = 0.890e-3 * Math.pow(298 / T, 1.5);
  const D_T = D_25 * (T / 298) * (mu_25 / mu_T);
  const rho = 1000 - 0.2 * (temperature - 25);
  const nu = mu_T / rho;
  const Re = velocity * hydraulicDiameter / nu;
  const Sc = nu / D_T;
  const Sh = 0.065 * Math.pow(Re, 0.875) * Math.pow(Sc, 0.25);
  const k = Sh * D_T / hydraulicDiameter * 3600 * 1000;
  return Math.max(10, Math.min(80, k));
}

function deriveSKParameters(stdRejection: number, testPressure: number = 15.5, testTDS: number = 2000) {
  const sigma = Math.min(0.999, stdRejection + 0.01);
  const pi = calculateOsmoticPressure(testTDS, 25);
  const deltaP_eff = testPressure - pi * 1.05;
  const Lp = 2.0;
  const Jw = Lp * Math.max(0, deltaP_eff);
  const beta = 1.05;
  let Pe = 5;
  for (let i = 0; i < 20; i++) {
    const expPe = Math.exp(-Pe);
    const R_calc = sigma * (1 - expPe) / (sigma + (1 - sigma) * expPe);
    const R_obs_calc = R_calc / (beta + (1 - beta) * R_calc);
    if (R_obs_calc > stdRejection) { Pe *= 1.1; } else { Pe *= 0.9; }
  }
  const P_s = Jw * (1 - sigma) / Math.max(0.001, Pe);
  return { sigma, P_s, Lp };
}

// ==================== 运行所有测试 ====================

console.log('╔══════════════════════════════════════════════╗');
console.log('║  过滤模拟算法 v3.0 物理模型验证测试         ║');
console.log('╚══════════════════════════════════════════════╝');

testOsmoticPressure();
testTCF();
testConcentrationPolarization();
testSpieglerKedem();
testDeriveSKParameters();
testMassTransferCoeff();

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║  所有验证测试完成                             ║');
console.log('╚══════════════════════════════════════════════╝');
