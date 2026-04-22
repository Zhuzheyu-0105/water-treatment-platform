/**
 * 水处理过滤效果模拟 - 核心物理模型函数 (v3.1 优化版)
 * 从 filter-simulation.ts 拆分 (lines 177-559)
 *
 * 基于WAVE软件算法理念和开源项目ROSSpy优化
 * 主要改进：
 * 1. 增加结垢预测模型
 * 2. 增强多离子平衡计算
 * 3. 改进温度压力修正
 * 4. 增加能耗计算
 * 5. 优化数值稳定性
 *
 * 参考文献：
 * [5]  《反渗透水处理工程》- 邵刚
 * [11] Spiegler & Kedem, "Thermodynamics of hyperfiltration", Desalination, 1966
 * [13] DuPont FilmTec Design Equations Manual (Form No. 45-D01591-en)
 * [14] DuPont FilmTec Temperature Correction Factor Manual (Form No. 45-D01658-en)
 * [21] Keshavarz et al., "Implementation of Spiegler-Kedem and Steric Hindering Pore Model for NF Membranes", Membranes, 2018
 */

/**
 * 渗透压计算 (基于 van't Hoff 方程)
 *
 * 精确公式: π = Σ(i_j × C_j × R × T) × φ
 *
 * 简化工程公式 (天然水):
 * π(bar) ≈ 0.711 × TDS(g/L)  @25°C
 *
 * 不同盐的渗透压贡献 (mOsm/kg):
 * - NaCl: 1.0 (每 mmol/L)
 * - CaCl₂: 2.6
 * - Na₂SO₄: 2.3
 * - MgSO₄: 2.6
 *
 * 温度修正: π_T = π_25 × (273+T)/298
 *
 * @param tds 总溶解固体 (mg/L)
 * @param temperature 温度 (°C)
 * @returns 渗透压 (bar)
 *
 * 参考文献: [5] FilmTec Manual, [13] DuPont Design Equations
 */
export function calculateOsmoticPressure(
  tds: number,
  temperature: number = 25
): number {
  if (tds <= 0) return 0;

  // 基础渗透压 @25°C (bar)
  // 经验系数 0.711 bar per g/L TDS (天然水平均值)
  const piBase = 0.711 * (tds / 1000);

  // 温度修正: π_T = π_25 × (273+T) / 298
  const tempCorrection = (273 + temperature) / 298;

  return piBase * tempCorrection;
}

/**
 * 分盐渗透压精确计算 (基于离子组成)
 *
 * π = R × T × Σ(ν_i × C_i) × φ_osmotic
 *
 * 其中:
 * - R = 0.08314 L·bar/(mol·K)
 * - T = 273 + °C (K)
 * - ν_i = 第i种盐解离出的离子数
 * - C_i = 第i种盐的摩尔浓度 (mol/L)
 * - φ_osmotic = 渗透系数 (NaCl溶液约0.93)
 *
 * @param ions 离子浓度 (mg/L)
 * @param temperature 温度 (°C)
 * @returns 渗透压 (bar)
 */
export function calculateOsmoticPressureFromIons(
  ions: {
    sodium?: number;    // Na⁺ (mg/L)
    chloride?: number;  // Cl⁻ (mg/L)
    calcium?: number;   // Ca²⁺ (mg/L)
    magnesium?: number; // Mg²⁺ (mg/L)
    sulfate?: number;   // SO₄²⁻ (mg/L)
    bicarbonate?: number; // HCO₃⁻ (mg/L)
    potassium?: number; // K⁺ (mg/L)
  },
  temperature: number = 25
): number {
  const R = 0.08314; // L·bar/(mol·K)
  const T = 273 + temperature;
  const phi = 0.93;  // 渗透系数 (天然水近似)

  // 摩尔质量 (g/mol)
  const MW: Record<string, number> = {
    Na: 23.0, Cl: 35.45, Ca: 40.08, Mg: 24.31,
    SO4: 96.06, HCO3: 61.02, K: 39.10
  };

  // 各离子摩尔浓度 (mol/L)
  const toMol = (mg_L: number, mw: number) => (mg_L / 1000) / mw;

  // NaCl当量渗透压贡献 (简化为Na⁺+Cl⁻为主要贡献)
  let totalOsmoles = 0;

  if (ions.sodium) totalOsmoles += toMol(ions.sodium, MW.Na);
  if (ions.chloride) totalOsmoles += toMol(ions.chloride, MW.Cl);
  if (ions.calcium) totalOsmoles += toMol(ions.calcium, MW.Ca) * 2; // Ca²⁺ 二价
  if (ions.magnesium) totalOsmoles += toMol(ions.magnesium, MW.Mg) * 2; // Mg²⁺ 二价
  if (ions.sulfate) totalOsmoles += toMol(ions.sulfate, MW.SO4) * 2; // SO₄²⁻ 二价
  if (ions.bicarbonate) totalOsmoles += toMol(ions.bicarbonate, MW.HCO3);
  if (ions.potassium) totalOsmoles += toMol(ions.potassium, MW.K);

  return R * T * totalOsmoles * phi;
}

/**
 * 温度修正系数 TCF (Temperature Correction Factor)
 *
 * DuPont FilmTec 官方公式 [14]:
 *
 * T ≥ 25°C: TCF = exp[2640 × (1/298 - 1/(273+T))]
 * T < 25°C: TCF = exp[3020 × (1/298 - 1/(273+T))]
 *
 * TCF > 1: 温度高于25°C，产水量增加
 * TCF < 1: 温度低于25°C，产水量减���
 *
 * 该系数同时用于:
 * - 水通量修正: Jw_T = Jw_25 × TCF
 * - 脱盐率修正: R_T ≈ R_25 - ΔR_temp (温度升高时脱盐率略降)
 *
 * @param temperature 温度 (°C)
 * @returns TCF 温度修正系数
 */
export function calculateTCF(temperature: number): number {
  const T = 273 + temperature;

  // FilmTec聚酰胺膜经验参数
  // T≥25°C和T<25°C使用不同参数（膜材料粘弹性转变）
  const U = temperature >= 25 ? 2640 : 3020;

  const TCF = Math.exp(U * (1 / 298 - 1 / T));
  return TCF;
}

/**
 * 温度对脱盐率的修正
 *
 * 温度每升高1°C，聚酰胺RO膜脱盐率下降约0.03-0.05%
 *
 * 原因: 高温下聚合物链运动加剧，膜孔径略有增大
 *
 * @param temperature 温度 (°C)
 * @param baseRejection 25°C基准脱盐率 (%)
 * @returns 修正后脱盐率 (%)
 */
export function temperatureCorrectedRejection(
  temperature: number,
  baseRejection: number
): number {
  // 温度偏离25°C时脱盐率修正
  // 系数: 0.0004 per °C (FilmTec经验值范围0.0003-0.0005)
  const tempDelta = temperature - 25;
  const rejectionDelta = tempDelta * 0.0004;

  return Math.max(50, Math.min(99.99, baseRejection * (1 - rejectionDelta)));
}

/**
 * 浓差极化因子 β (Concentration Polarization Factor)
 *
 * FilmTec定义 [13]:
 * β = C_m / C_b = exp(Jw / k)
 *
 * 其中:
 * - C_m: 膜面浓度
 * - C_b: 主体浓度
 * - Jw: 水通量 (L/m²·h)
 * - k: 传质系数 (L/m²·h)
 *
 * 传质系数 k 的估算 (FilmTec简化方法):
 * k = 0.0275 × (D/d_h) × Re^0.5 × Sc^0.33  (湍流, 进水流道内)
 *
 * 简化工程估算:
 * k ≈ 20-50 L/(m²·h) (取决于流速和流道几何)
 *
 * FilmTec经验限值: β_max = 1.2 (设计规范)
 *
 * @param flux 水通量 (L/m²·h)
 * @param massTransferCoeff 传质系数 k (L/m²·h)，默认30
 * @returns β 浓差极化因子
 */
export function calculateConcentrationPolarization(
  flux: number,
  massTransferCoeff: number = 30
): number {
  if (flux <= 0 || massTransferCoeff <= 0) return 1.0;

  const beta = Math.exp(flux / massTransferCoeff);

  // FilmTec设计限值: β ≤ 1.2
  return Math.min(beta, 1.2);
}

/**
 * 传质系数 k 估算 (用于浓差极化计算)
 *
 * 基于Sherwood关联式:
 * Sh = 0.065 × Re^0.875 × Sc^0.25  (卷式膜元件, FilmTec关联式)
 * k = Sh × D / d_h
 *
 * 其中:
 * - Re = ρ × v × d_h / μ (雷诺数)
 * - Sc = μ / (ρ × D) (施密特数)
 * - D = 溶质扩散系数 (m²/s), NaCl@25°C ≈ 1.61e-9
 * - d_h = 水力直径 (m), 典型0.001-0.002m
 *
 * 简化公式 (FilmTec):
 * k ≈ 0.0275 × (D/d_h) × (v × d_h / ν)^0.5 × (ν/D)^0.33
 *
 * @param temperature 温度 (°C)
 * @param velocity 进水流速 (m/s), 默认0.1
 * @param hydraulicDiameter 水力直径 (m), 默认0.001
 * @returns 传质系数 k (L/m²·h)
 */
export function estimateMassTransferCoeff(
  temperature: number = 25,
  velocity: number = 0.1,
  hydraulicDiameter: number = 0.001
): number {
  // NaCl 扩散系数 D (m²/s), 随温度变化
  // D_25 = 1.61e-9 m²/s, Stokes-Einstein关系: D_T = D_25 × (T/298) × (μ_25/μ_T)
  const T = 273 + temperature;
  const D_25 = 1.61e-9;

  // 水的动力粘度 μ (Pa·s) 随温度变化
  const mu_25 = 0.890e-3; // Pa·s @25°C
  const mu_T = 0.890e-3 * Math.pow(298 / T, 1.5); // 简化Arrhenius
  const D_T = D_25 * (T / 298) * (mu_25 / mu_T);

  // 水的密度 (kg/m³)
  const rho = 1000 - 0.2 * (temperature - 25); // 近似

  // 运动粘度 ν (m²/s)
  const nu = mu_T / rho;

  // 雷诺数
  const Re = velocity * hydraulicDiameter / nu;

  // 施密特数
  const Sc = nu / D_T;

  // Sherwood数 (FilmTec卷式膜元件关联式)
  const Sh = 0.065 * Math.pow(Re, 0.875) * Math.pow(Sc, 0.25);

  // 传质系数 (m/s → L/m²·h: × 3600 × 1000)
  const k = Sh * D_T / hydraulicDiameter * 3600 * 1000;

  return Math.max(10, Math.min(80, k)); // 合理范围约束
}

/**
 * RO膜 Spiegler-Kedem 模型 - 观测截留率计算 [9]
 *
 * 非平衡热力学模型:
 * Jw = Lp × (ΔP - σ × Δπ)        ... 水通量
 * Js = ω × Δπ + (1-σ) × Cp × Jw   ... 溶质通量
 *
 * 实际截留率:
 * R_true = 1 - Cp/Cm = σ × (1 - exp(-Pe)) / (σ + (1-σ) × exp(-Pe))
 *
 * 其中 Peclet数:
 * Pe = Jw × (1-σ) / P_s
 *
 * 浓差极化修正:
 * R_obs = R_true / (β + (1-β) × R_true)
 * 其中 β = Cm/Cb (浓差极化因子)
 *
 * 参数说明:
 * - σ: 反射系数 (0≤σ≤1), 完美半透膜σ→1
 * - Lp: 水渗透系数 (L/m²·h·bar)
 * - P_s: 溶质渗透系数 (L/m²·h)
 * - Pe: Peclet数 (无量纲)
 *
 * @param sigma 反射系数 (典型值: RO膜0.95-0.99, NF膜0.7-0.95)
 * @param pecletNumber Peclet数 Pe = Jw×(1-σ)/P_s
 * @param beta 浓差极化因子 (默认1.1)
 * @returns 观测截留率 R_obs (0-1)
 */
export function spieglerKedemRejection(
  sigma: number,
  pecletNumber: number,
  beta: number = 1.1
): number {
  if (sigma <= 0) return 0;

  // 真实截留率 (Spiegler-Kedem方程)
  const expPe = Math.exp(-pecletNumber);
  const R_true = sigma * (1 - expPe) / (sigma + (1 - sigma) * expPe);

  // 浓差极化修正
  // R_obs = R_true / (β + (1-β) × R_true)
  const R_obs = R_true / (beta + (1 - beta) * R_true);

  return Math.max(0, Math.min(1, R_obs));
}

/**
 * RO膜 Peclet数计算
 *
 * Pe = Jw × (1-σ) / P_s
 *
 * 其中:
 * - Jw: 水通量 (L/m²·h), 典型值20-30
 * - σ: 反射系数
 * - P_s: 溶质渗透系数 (L/m²·h)
 *
 * P_s 可由膜产品手册的脱盐率反算:
 * 对于标准条件 (2000ppm NaCl, 225psi, 25°C, 15%回收):
 * P_s = Jw × (1 - R_std) / (β × R_std) (β≈1.05低通量时)
 *
 * 典型 P_s 值:
 * - BW30-400: P_s ≈ 0.04-0.08 L/(m²·h)
 * - SW30HR-380: P_s ≈ 0.01-0.03 L/(m²·h) (更低的B值=更高脱盐率)
 * - LE膜: P_s ≈ 0.06-0.12 L/(m²·h)
 *
 * @param flux 水通量 (L/m²·h)
 * @param sigma 反射系数
 * @param solutePermeability 溶质渗透系数 P_s (L/m²·h)
 * @returns Peclet数
 */
export function calculatePecletNumber(
  flux: number,
  sigma: number,
  solutePermeability: number
): number {
  if (solutePermeability <= 0) return 100; // P_s→0, Pe→∞, R→σ
  return flux * (1 - sigma) / solutePermeability;
}

/**
 * 从标准脱盐率反算Spiegler-Kedem参数
 *
 * 在标准测试条件下 (2000ppm NaCl, 225psi=15.5bar, 25°C, 15%回收):
 * 已知 R_std, 可反算 σ 和 P_s 的等效值
 *
 * 简化关系 (高脱盐率近似):
 * σ ≈ R_std + 0.01 (反射系数略高于观测脱盐率)
 *
 * P_s 的估算:
 * 渗透压 π_25 = 0.711 × 2 = 1.42 bar (2000ppm NaCl)
 * ΔP_eff = 15.5 - 1.42 × 1.05 = 14.0 bar (考虑浓差极化)
 * Jw = Lp × ΔP_eff, Lp ≈ 1.5-3.0 L/(m²·h·bar)
 * P_s ≈ Jw × (1-R_std)/(R_std × β) (β≈1.05 @低通量)
 *
 * @param stdRejection 标准脱盐率 (0-1)
 * @param testPressure 测试压力 (bar), 默认15.5 (225psi)
 * @param testTDS 测试TDS (mg/L), 默认2000
 * @returns { sigma, P_s, Lp }
 */
export function deriveSKParameters(
  stdRejection: number,
  testPressure: number = 15.5,
  testTDS: number = 2000
): { sigma: number; P_s: number; Lp: number } {
  // 反射系数 (略高于观测截留率)
  const sigma = Math.min(0.999, stdRejection + 0.01);

  // 渗透压
  const pi = calculateOsmoticPressure(testTDS, 25);

  // 有效驱动力
  const deltaP_eff = testPressure - pi * 1.05; // β≈1.05

  // 水渗透系数 (典型值)
  const Lp = 2.0; // L/(m²·h·bar) 典型聚酰胺膜

  // 水通量
  const Jw = Lp * Math.max(0, deltaP_eff);

  // 浓差极化因子 (标准测试低通量)
  const beta = 1.05;

  // 从Pe方程反算P_s
  // R_true ≈ R_obs (低通量下浓差极化小)
  // R_true = σ × (1-exp(-Pe))/(σ+(1-σ)×exp(-Pe))
  // 迭代求解Pe, 然后 P_s = Jw×(1-σ)/Pe
  let Pe = 5; // 初始猜测
  for (let i = 0; i < 20; i++) {
    const expPe = Math.exp(-Pe);
    const R_calc = sigma * (1 - expPe) / (sigma + (1 - sigma) * expPe);
    const R_obs_calc = R_calc / (beta + (1 - beta) * R_calc);

    // 调整Pe
    if (R_obs_calc > stdRejection) {
      Pe *= 1.1; // 增大Pe提高截留率
    } else {
      Pe *= 0.9;
    }
  }

  const P_s = Jw * (1 - sigma) / Math.max(0.001, Pe);

  return { sigma, P_s, Lp };
}
