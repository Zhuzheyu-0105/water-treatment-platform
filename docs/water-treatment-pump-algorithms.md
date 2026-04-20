# 水处理系统水泵计算算法技术文档

> 本文档基于公开技术文献和工程原理整理，用于指导智能水处理系统设计工具的水泵选型算法。

## 目录

1. [核心理论基础](#1-核心理论基础)
2. [渗透压计算](#2-渗透压计算)
3. [高压泵选型计算](#3-高压泵选型计算)
4. [段间增压泵（分压设计）](#4-段间增压泵分压设计)
5. [大型系统并联泵](#5-大型系统并联泵)
6. [增压泵计算](#6-增压泵计算)
7. [完整计算流程](#7-完整计算流程)

---

## 1. 核心理论基础

### 1.1 反渗透基本原理

反渗透技术通过在溶液侧施加**高于渗透压的压力**，强制水分子反向透过半透膜，实现淡水与盐水的分离。

### 1.2 影响压力需求的关键因素

| 因素 | 影响方向 | 经验规律 |
|------|---------|---------|
| **回收率** | 回收率↑ → 浓缩倍率↑ → 渗透压↑ → 需要更高压力 | 每提高10%回收率，约需增加1 bar压力 |
| **温度** | 温度↓ → 水粘度↑ → 膜透水率↓ → 需要更高压力 | 每降低10℃，约需增加1 bar压力 |
| **TDS** | TDS↑ → 渗透压↑ → 需要更高压力 | TDS每增加1000ppm，渗透压约增加0.7-0.8 bar |
| **膜类型** | 海水膜 > 苦咸水膜 > 低压膜 | 海水膜工作压力5.5-6.5MPa，苦咸水膜1.5-2.5MPa |

---

## 2. 渗透压计算

### 2.1 范托夫公式（基础公式）

```
π = CRT
```

其中：
- **π**：渗透压（MPa 或 bar）
- **C**：离子摩尔浓度（mol/L）= Σ(离子浓度/离子当量)
- **R**：气体常数 = 0.08314 L·bar/(mol·K) = 0.008314 MPa·L/(mol·K)
- **T**：绝对温度（K）= 273 + ℃

### 2.2 工程简化公式（适用于水处理）

```typescript
/**
 * 计算渗透压（简化公式）
 * @param tds 总溶解固体（mg/L 或 ppm）
 * @param temperature 温度（℃）
 * @returns 渗透压（bar）
 */
function calculateOsmoticPressure(tds: number, temperature: number): number {
  const T = 273 + temperature; // 绝对温度
  
  // 经验系数：渗透压约与TDS成正比
  // 对于NaCl溶液：TDS=35000 mg/L时，渗透压≈27 bar
  // 系数约为 0.77 bar per 1000 ppm
  
  const osmoticPressure = (tds / 1000) * 0.77 * (T / 298); // 25℃时为标准
  
  return osmoticPressure;
}
```

### 2.3 浓水渗透压计算

```typescript
/**
 * 计算浓水渗透压（考虑浓缩倍率）
 * @param feedTDS 进水TDS（mg/L）
 * @param recovery 回收率（小数形式，如0.75表示75%）
 * @param temperature 温度（℃）
 * @returns 浓水渗透压（bar）
 */
function calculateConcentrateOsmoticPressure(
  feedTDS: number,
  recovery: number,
  temperature: number
): number {
  // 浓水TDS = 进水TDS / (1 - 回收率)
  const concentrateTDS = feedTDS / (1 - recovery);
  
  return calculateOsmoticPressure(concentrateTDS, temperature);
}
```

**示例计算**：
- 进水TDS = 3000 mg/L，回收率 = 75%，温度 = 25℃
- 浓水TDS = 3000 / (1 - 0.75) = 12000 mg/L
- 浓水渗透压 ≈ 12 × 0.77 = 9.24 bar

---

## 3. 高压泵选型计算

### 3.1 系统操作压力计算

```typescript
interface SystemPressureParams {
  feedTDS: number;           // 进水TDS (mg/L)
  recovery: number;          // 回收率 (小数)
  temperature: number;       // 温度 (℃)
  membraneType: 'BW' | 'SW'; // 膜类型：苦咸水膜/海水膜
  foulingAllowance: number;  // 污堵余量 (bar，通常1-2 bar)
  pipingLoss: number;        // 管路损失 (bar，通常0.5-1 bar)
}

/**
 * 计算系统所需操作压力
 */
function calculateSystemPressure(params: SystemPressureParams): number {
  const { feedTDS, recovery, temperature, membraneType, foulingAllowance, pipingLoss } = params;
  
  // 1. 计算平均渗透压（进水与浓水的平均值）
  const feedOsmoticPressure = calculateOsmoticPressure(feedTDS, temperature);
  const concentrateOsmoticPressure = calculateConcentrateOsmoticPressure(feedTDS, recovery, temperature);
  const averageOsmoticPressure = (feedOsmoticPressure + concentrateOsmoticPressure) / 2;
  
  // 2. 净驱动压力（NDP）
  // NDP = 操作压力 - 渗透压 - 背压
  // 一般需要 NDP > 0 才能产水
  // 实际操作压力需要比渗透压高5-15 bar
  
  let baseOperatingPressure: number;
  
  if (membraneType === 'SW') {
    // 海水膜：需要更高压力
    baseOperatingPressure = averageOsmoticPressure + 10 + foulingAllowance;
  } else {
    // 苦咸水膜
    baseOperatingPressure = averageOsmoticPressure + 5 + foulingAllowance;
  }
  
  // 3. 总系统压力 = 操作压力 + 管路损失
  const totalSystemPressure = baseOperatingPressure + pipingLoss;
  
  return totalSystemPressure;
}
```

### 3.2 高压泵扬程与流量计算

```typescript
interface HighPressurePumpParams {
  productFlow: number;       // 产水量 (m³/h)
  recovery: number;          // 回收率 (小数)
  systemPressure: number;    // 系统压力 (bar)
  pumpEfficiency: number;    // 泵效率 (小数，通常0.7-0.85)
  motorEfficiency: number;   // 电机效率 (小数，通常0.9-0.95)
}

interface PumpSelection {
  flowRate: number;          // 流量 (m³/h)
  head: number;              // 扬程 (m)
  power: number;             // 功率 (kW)
  pressure: number;          // 压力 (bar)
}

/**
 * 高压泵选型计算
 */
function calculateHighPressurePump(params: HighPressurePumpParams): PumpSelection {
  const { productFlow, recovery, systemPressure, pumpEfficiency, motorEfficiency } = params;
  
  // 1. 进水流量 = 产水量 / 回收率
  const feedFlow = productFlow / recovery;
  
  // 2. 泵流量 = 进水流量 × 安全系数(1.05-1.1)
  const pumpFlow = feedFlow * 1.1;
  
  // 3. 扬程（m）= 压力（bar）× 10.2
  // 1 bar ≈ 10.2 m 水柱
  const head = systemPressure * 10.2;
  
  // 4. 轴功率计算
  // P = (ρ × g × Q × H) / (η_pump × η_motor)
  // P = (Q × H) / (367 × η_pump × η_motor) [kW]
  // 其中 Q 单位为 m³/h，H 单位为 m
  const shaftPower = (pumpFlow * head) / (367 * pumpEfficiency * motorEfficiency);
  
  // 5. 电机功率 = 轴功率 × 安全系数(1.1-1.2)
  const motorPower = shaftPower * 1.15;
  
  return {
    flowRate: Math.ceil(pumpFlow),
    head: Math.ceil(head),
    power: Math.ceil(motorPower),
    pressure: systemPressure
  };
}
```

### 3.3 经验数据参考表

| 原水类型 | TDS范围 (mg/L) | 典型回收率 | 操作压力 (bar) | 膜类型 |
|---------|---------------|-----------|---------------|--------|
| 自来水/井水 | < 1000 | 70-80% | 8-12 | 低压膜 |
| 微咸水 | 1000-3000 | 65-75% | 10-15 | 苦咸水膜 |
| 苦咸水 | 3000-10000 | 50-70% | 15-25 | 苦咸水膜 |
| 海水 | > 30000 | 35-45% | 55-70 | 海水膜 |

---

## 4. 段间增压泵（分压设计）

### 4.1 应用场景

段间增压泵用于**两段式或三段式RO系统**，主要应用场景：

1. **高TDS水**：进水TDS > 5000 mg/L
2. **高回收率要求**：回收率 > 75%
3. **海水膜系统**：需要更高压力
4. **通量均衡**：平衡各段膜元件的产水通量

### 4.2 为什么需要段间增压泵？

**问题**：在两段式RO系统中：
- 第一段：进水TDS较低，渗透压较低
- 第二段：浓水TDS大幅升高，渗透压升高
- 结果：第二段产水能力下降，回收率难以提高

**解决方案**：在第一段和第二段之间增加增压泵，提高第二段进水压力。

### 4.3 段间增压泵计算

```typescript
interface InterstagePumpParams {
  firstStageFeedTDS: number;     // 第一段进水TDS (mg/L)
  firstStageRecovery: number;    // 第一段回收率 (小数)
  secondStageRecovery: number;   // 第二段目标回收率 (小数)
  temperature: number;           // 温度 (℃)
  firstStagePressure: number;    // 第一段操作压力 (bar)
}

/**
 * 计算段间增压泵参数
 */
function calculateInterstagePump(params: InterstagePumpParams): PumpSelection {
  const { firstStageFeedTDS, firstStageRecovery, secondStageRecovery, temperature, firstStagePressure } = params;
  
  // 1. 计算第二段进水TDS（第一段浓水TDS）
  const secondStageFeedTDS = firstStageFeedTDS / (1 - firstStageRecovery);
  
  // 2. 计算第二段浓水TDS
  const secondStageConcentrateTDS = secondStageFeedTDS / (1 - secondStageRecovery);
  
  // 3. 计算第二段所需操作压力
  const secondStageOsmoticPressure = calculateOsmoticPressure(secondStageConcentrateTDS, temperature);
  
  // 4. 段间增压压力 = 第二段所需压力 - 第一段剩余压力
  // 经验值：
  // - NaCl体系（氯化钠）：约需增压12 bar
  // - Na₂SO₄体系（硫酸钠）：约需增压7 bar
  
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
  
  // 5. 段间泵流量 = 第二段进水流量
  // 第二段进水流量 = 第一段进水流量 × (1 - 第一段回收率)
  
  return {
    flowRate: 0, // 需结合总流量计算
    head: requiredBoostPressure * 10.2,
    power: 0, // 需结合流量计算
    pressure: requiredBoostPressure
  };
}
```

### 4.4 段间增压泵选型判断逻辑

```typescript
/**
 * 判断是否需要段间增压泵
 */
function needsInterstagePump(
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
      reason: `回收率=${recovery * 100}% > 75%，需要段间增压泵提高系统回收率` 
    };
  }
  
  return { required: false, reason: '常规工况，无需段间增压泵' };
}
```

---

## 5. 大型系统并联泵

### 5.1 应用场景

当**系统流量 > 50 m³/h**时，单台高压泵可能存在以下问题：
- 单台泵功率过大，启动电流冲击大
- 单点故障风险高
- 维护不便
- 能效下降

**解决方案**：采用多台泵并联运行。

### 5.2 并联泵计算逻辑

```typescript
interface ParallelPumpConfig {
  totalFlow: number;           // 总流量 (m³/h)
  singlePumpFlow: number;      // 单台泵流量 (m³/h)
  pumpCount: number;           // 泵数量
  flowPerPump: number;         // 实际单台流量 (m³/h)
  redundancy: number;          // 冗余度
}

/**
 * 计算并联泵配置
 */
function calculateParallelPumps(
  totalFlow: number,
  maxSinglePumpFlow: number = 60 // 单台泵最大流量限制
): ParallelPumpConfig {
  
  // 并联规则：
  // 1. 总流量 ≤ 50 m³/h：1台泵
  // 2. 50 < 总流量 ≤ 100：2台泵（N+1冗余可用3台）
  // 3. 100 < 总流量 ≤ 200：3-4台泵
  // 4. 总流量 > 200：按单台≤50m³/h计算台数
  
  let pumpCount: number;
  let flowPerPump: number;
  let redundancy: number;
  
  if (totalFlow <= 50) {
    pumpCount = 1;
    flowPerPump = totalFlow;
    redundancy = 0;
  } else if (totalFlow <= 100) {
    // 2台泵，可选N+1冗余（3台）
    pumpCount = 2;
    flowPerPump = totalFlow / pumpCount;
    redundancy = 1; // 可配置1台备用
  } else if (totalFlow <= 200) {
    pumpCount = Math.ceil(totalFlow / 60);
    flowPerPump = totalFlow / pumpCount;
    redundancy = 1;
  } else {
    pumpCount = Math.ceil(totalFlow / 50);
    flowPerPump = totalFlow / pumpCount;
    redundancy = Math.ceil(pumpCount * 0.2); // 20%冗余
  }
  
  return {
    totalFlow,
    singlePumpFlow: maxSinglePumpFlow,
    pumpCount,
    flowPerPump: Math.ceil(flowPerPump),
    redundancy
  };
}
```

### 5.3 并联泵功率计算

```typescript
/**
 * 计算并联泵总功率
 */
function calculateParallelPumpPower(
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
```

---

## 6. 增压泵计算

### 6.1 应用场景

增压泵（Booster Pump）用于：
- 将进水压力提升至保安过滤器所需压力
- 为高压泵提供足够的吸入压力
- 克服预处理系统阻力

### 6.2 增压泵计算公式

```typescript
/**
 * 计算增压泵参数
 */
function calculateBoosterPump(
  feedFlow: number,            // 进水流量 (m³/h)
  inletPressure: number,       // 进水压力 (bar)
  requiredPressure: number = 3 // 保安过滤器所需压力 (bar)
): PumpSelection {
  
  // 增压泵扬程 = 所需压力 - 进水压力
  const requiredBoost = Math.max(0, requiredPressure - inletPressure);
  
  // 扬程（m）
  const head = requiredBoost * 10.2;
  
  // 功率计算
  const power = (feedFlow * head) / (367 * 0.75 * 0.93);
  
  return {
    flowRate: Math.ceil(feedFlow * 1.1),
    head: Math.ceil(head),
    power: Math.ceil(power * 1.15),
    pressure: requiredBoost
  };
}
```

---

## 7. 完整计算流程

### 7.1 系统设计流程图

```
输入参数
├── 产水量需求 (m³/h)
├── 进水水质 (TDS, 温度, pH)
├── 目标回收率
└── 膜类型选择
    │
    ▼
第一步：计算进水流量
    │ 进水流量 = 产水量 / 回收率
    ▼
第二步：计算渗透压
    │ 根据TDS和温度计算渗透压
    ▼
第三步：计算系统操作压力
    │ 考虑浓缩倍率、污堵余量、管路损失
    ▼
第四步：高压泵选型
    │ 确定流量、扬程、功率
    │ 判断是否需要并联
    ▼
第五步：段间泵判断
    │ 是否需要段间增压？
    │ - TDS > 5000?
    │ - 回收率 > 75%?
    │ - 两段式系统?
    ▼
第六步：增压泵计算
    │ 进水压力是否满足？
    ▼
输出：完整水泵配置
```

### 7.2 完整计算函数

```typescript
interface WaterTreatmentSystemDesign {
  // 输入参数
  productFlow: number;          // 产水量 (m³/h)
  recovery: number;             // 回收率 (小数)
  feedTDS: number;              // 进水TDS (mg/L)
  temperature: number;          // 温度 (℃)
  inletPressure: number;        // 进水压力 (bar)
  membraneType: 'BW' | 'SW';    // 膜类型
  isTwoStage: boolean;          // 是否两段式
}

interface PumpSystemConfiguration {
  boosterPump: PumpSelection;       // 增压泵
  highPressurePumps: {              // 高压泵
    pumps: PumpSelection[];
    parallelConfig: ParallelPumpConfig;
  };
  interstagePump?: PumpSelection;   // 段间增压泵（可选）
  totalPower: number;               // 总功率 (kW)
  systemPressure: number;           // 系统压力 (bar)
  recommendations: string[];        // 推荐说明
}

/**
 * 完整水泵系统计算
 */
function designPumpSystem(
  design: WaterTreatmentSystemDesign
): PumpSystemConfiguration {
  
  const recommendations: string[] = [];
  
  // 1. 计算进水流量
  const feedFlow = design.productFlow / design.recovery;
  
  // 2. 计算系统操作压力
  const systemPressure = calculateSystemPressure({
    feedTDS: design.feedTDS,
    recovery: design.recovery,
    temperature: design.temperature,
    membraneType: design.membraneType,
    foulingAllowance: 1.5,
    pipingLoss: 0.8
  });
  
  // 3. 高压泵选型
  const hpPump = calculateHighPressurePump({
    productFlow: design.productFlow,
    recovery: design.recovery,
    systemPressure: systemPressure,
    pumpEfficiency: 0.8,
    motorEfficiency: 0.93
  });
  
  // 4. 判断是否需要并联
  const parallelConfig = calculateParallelPumps(feedFlow);
  const parallelPumps: PumpSelection[] = [];
  
  if (parallelConfig.pumpCount > 1) {
    recommendations.push(
      `系统流量${feedFlow.toFixed(1)}m³/h > 50m³/h，推荐${parallelConfig.pumpCount}台泵并联运行`
    );
    
    for (let i = 0; i < parallelConfig.pumpCount; i++) {
      parallelPumps.push({
        ...hpPump,
        flowRate: parallelConfig.flowPerPump,
        power: Math.ceil(hpPump.power / parallelConfig.pumpCount)
      });
    }
  } else {
    parallelPumps.push(hpPump);
  }
  
  // 5. 判断是否需要段间增压泵
  let interstagePump: PumpSelection | undefined;
  const needsInterstage = needsInterstagePump(
    design.feedTDS,
    design.recovery,
    design.isTwoStage
  );
  
  if (needsInterstage.required) {
    interstagePump = calculateInterstagePump({
      firstStageFeedTDS: design.feedTDS,
      firstStageRecovery: design.recovery * 0.5,
      secondStageRecovery: design.recovery * 0.5,
      temperature: design.temperature,
      firstStagePressure: systemPressure * 0.6
    });
    
    recommendations.push(needsInterstage.reason);
    recommendations.push(
      `推荐段间增压泵，增压${interstagePump.pressure}bar`
    );
  }
  
  // 6. 增压泵计算
  const boosterPump = calculateBoosterPump(
    feedFlow,
    design.inletPressure,
    3 // 保安过滤器标准压力
  );
  
  if (boosterPump.pressure > 0) {
    recommendations.push(
      `进水压力不足，需增压${boosterPump.pressure.toFixed(1)}bar`
    );
  }
  
  // 7. 计算总功率
  let totalPower = parallelPumps.reduce((sum, p) => sum + p.power, 0);
  if (interstagePump) {
    totalPower += interstagePump.power;
  }
  totalPower += boosterPump.power;
  
  return {
    boosterPump,
    highPressurePumps: {
      pumps: parallelPumps,
      parallelConfig
    },
    interstagePump,
    totalPower,
    systemPressure,
    recommendations
  };
}
```

---

## 附录：工程经验数据

### A. 常见膜元件参数

| 膜型号 | 膜面积 (m²) | 工作压力 (bar) | 产水量 (m³/d) | 脱盐率 |
|--------|------------|---------------|--------------|--------|
| BW30-400 | 37 | 15.5 | 40 | 99.5% |
| BW30-440i | 41 | 15.5 | 44 | 99.5% |
| SW30HR-380 | 35 | 55 | 23 | 99.8% |
| NF270-400 | 37 | 3.5 | 43 | 97% |

### B. 膜通量设计指南

| 原水类型 | SDI | 推荐通量 (L/m²·h) | 备注 |
|---------|-----|------------------|------|
| 地下水 | < 3 | 22-27 | 低污染风险 |
| 地表水 | 3-5 | 17-22 | 中等污染风险 |
| 海水 | < 3 | 14-17 | 需考虑温度 |
| 废水回用 | > 5 | 12-17 | 高污染风险 |

### C. 温度修正系数

```typescript
// 温度修正系数表（以25℃为基准=1.0）
const temperatureCorrectionFactor: Record<number, number> = {
  10: 1.58,
  15: 1.35,
  20: 1.16,
  25: 1.00,
  30: 0.87,
  35: 0.76,
  40: 0.67
};

/**
 * 温度修正后的压力需求
 */
function adjustPressureForTemperature(
  basePressure: number,
  designTemp: number,
  referenceTemp: number = 25
): number {
  // 温度每降低1℃，需增加约3-4%压力
  const tempDiff = referenceTemp - designTemp;
  const adjustment = 1 + (tempDiff * 0.035);
  
  return basePressure * adjustment;
}
```

---

## 参考资料

1. 杜邦 WAVE 水处理设计软件用户手册
2. 《反渗透水处理工程》- 冯逸仙
3. 《膜分离技术》- 刘茉娥
4. ANSI/AWWA B104-20 反渗透设备标准
5. GB/T 19249-2017 反渗透水处理设备

---

**文档版本**: v1.0  
**更新日期**: 2024年  
**适用范围**: 智能水处理系统设计工具
