# 水处理过滤模拟计算公式文档

_最后更新: 2026-04-19_

## 概述

本文档记录智能水处理系统设计平台中各工艺单元的水质参数计算公式，包括理论依据和学术文献来源。

---

## 1. 可滤残渣 SS (Suspended Solids) 计算

### 1.1 SS 定义

- **SS (可滤残渣)**: 105°C过滤后残留的物质，代表溶解性固体
- **TSS (总悬浮固体)**: 不通过 0.45μm 滤膜的部分
- **Silt (浊度物质)**: 引起浊度的颗粒物质

### 1.2 SS 与其他参数的关系

```
SS (mg/L) ≈ 浊度 (NTU) × 1.5 ~ 3.0
TSS (mg/L) > SS (mg/L)
```

### 1.3 各工艺单元对 SS 的去除

#### 1.3.1 多介质过滤器

**去除机理**: 深度过滤 (Iwasaki 方程)

**公式**:
```
η = 1 - exp(-λ₀ × L × (v/v₀)^n)

其中:
- η: 去除效率 (0-1)
- λ₀: 初滤系数 (/m)
- L: 滤层深度 (m)
- v: 过滤速度 (m/h)
- v₀: 参考滤速 (m/h)
- n: 经验指数 (通常 -0.5 ~ 0)
```

**SS 去除率参数**:
| 滤速 | SS 去除率范围 | 典型值 |
|------|--------------|--------|
| 8 m/h | 65-85% | 75% |
| 10 m/h | 70-88% | 78% |
| 12 m/h | 65-85% | 75% |

**学术参考**:
- Iwasaki, T. (1937). "Some Notes on Sand Filtration"
- MDPI: "Modeling of the Suspended Solid Removal of a Granular Media Layer"
- Lenntech: Multimedia Filter Calculations
- DuPont FilmTec Media Filtration Technical Manual

#### 1.3.2 精密过滤器

**去除机理**: 表面机械筛分

**公式**:
```
η = 1 - (d_pore / d_particle)^m

其中:
- d_pore: 滤芯孔径 (μm)
- d_particle: 颗粒粒径 (μm)
- m: 经验指数
```

**SS 去除率参数**:
| 孔径 | SS 去除率 |
|------|----------|
| 1 μm | 98% |
| 5 μm | 92% |
| 20 μm | 85% |

#### 1.3.3 超滤 (UF)

**去除机理**: 完全筛分

UF 孔径 (0.001-0.1 μm) 远小于 SS 颗粒 (0.1-100 μm)，对 SS 完全截留。

**SS 去除率**: 99.5-99.9%

#### 1.3.4 反渗透 (RO)

**去除机理**: 溶解-扩散模型 (Spiegler-Kedem)

**公式**:
```
J_w = A × (ΔP - Δπ)  (水通量)
J_s = B × ΔC          (溶质通量)
R = 1 - B/(B + A×ΔP)  (截留率)
```

**SS 去除率**: 99.5-99.9%

RO 对溶解性固体的去除极为彻底，产水中 SS 浓度接近检测限 (<0.5 mg/L)。

---

## 2. 重碳酸根 HCO₃⁻ 计算

### 2.1 HCO₃⁻ 特性

- 水中主要的碱度成分
- RO 对其去除率约 97-99.5%
- 在高 pH 下主要以 CO₃²⁻ 形式存在，去除率更高

### 2.2 RO 中 HCO₃⁻ 去除

**公式**:
```
R_HCO3 = f(pH, TDS, 膜类型)

典型值:
- pH < 7: R ≈ 97%
- pH 7-8: R ≈ 98.5%
- pH > 8: R ≈ 99%
```

**学术参考**:
- FilmTec Technical Manual (Dow/DuPont)
- "Water Treatment: Membranes and Modules" - Dave Schlenk (2009)

---

## 3. 负去除率问题修复

### 3.1 问题原因

Iwasaki 方程在边界情况下可能产生无效值:
- 当 `avg = 100%` 时, `λ₀ = -ln(0) = ∞`
- 当 `eta < 0` 时, 产生负去除率

### 3.2 修复方案

```typescript
// 边界保护
if (removalRange.avg >= 100) {
  return { outlet: 0, rate: 100 };
}

// 确保 eta 在 [0, 1] 范围内
const clampedEta = Math.max(0, Math.min(1, eta));
const baseRate = clampedEta * 100;
const safeBaseRate = Math.max(0, baseRate);
```

---

## 4. 各工艺单元参数汇总

### 4.1 PROCESS_UNIT_PARAMS

| 工艺单元 | SS 去除率 (%) | TSS 去除率 (%) | HCO₃⁻ |
|---------|--------------|--------------|--------|
| 多介质过滤器 | 65-85 (avg 75) | 70-90 (avg 80) | - |
| 精密过滤器 | 85-98 (avg 92) | 90-99 (avg 95) | - |
| 超滤 UF | 99.5-99.9 (avg 99.7) | 99.5-99.9 (avg 99.8) | - |
| 纳滤 NF | 99-99.5 (avg 99.3) | 99-99.5 (avg 99.5) | 50% |
| 反渗透 RO | 99.5-99.9 (avg 99.7) | 99.9-99.99 (avg 99.95) | 97-99.5% |
| EDI | 85-95 (avg 90) | - | - |

---

## 5. 学术文献

### 5.1 SS 去除

1. **Iwasaki, T.** (1937). "Some Notes on Sand Filtration". Journal of the American Water Works Association.
2. **MDPI Water**. "Modeling of the Suspended Solid Removal of a Granular Media Layer".
3. **Lenntech**. Multimedia Filter Calculations.
4. **DuPont**. FilmTec Media Filtration Technical Manual (45-D01560).

### 5.2 RO/NF 膜分离

1. **Spiegler, K.S. & Kedem, O.** (1966). "Thermodynamics of Hyperfiltration (Reverse Osmosis)". Desalination.
2. **FilmTec/DuPont**. RO/NF Design Handbook (Form No. 609-00071).
3. **MWH**. Water Treatment: Principles and Design (3rd Edition).

### 5.3 深度过滤

1. **Cleasby, J.L.** (1989). "Filtration". In: Water Quality and Treatment (AWWA).
2. **Fair, G.M. et al.** (1968). Water and Wastewater Engineering.

---

## 6. 附录: 公式速查表

### 6.1 Iwasaki 方程

```javascript
λ₀ = -ln(1 - avg/100) / L
λ_eff = λ₀ × (v/v₀)^n
η = 1 - exp(-λ_eff × L)
```

### 6.2 Spiegler-Kedem 模型

```javascript
// RO 截留率
R = 1 - B / (B + A × ΔP)

// 产水浓度
C_permeate = C_feed × (1 - R)
```

### 6.3 质量平衡

```javascript
// 浓水浓度
C_concentrate = (C_feed × Q_feed - C_permeate × Q_permeate) / Q_concentrate
```

---

_本文档持续更新中_
