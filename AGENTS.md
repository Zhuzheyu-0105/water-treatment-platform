# AGENTS.md

## 项目概览

智能水处理系统设计平台 - 一个基于 Next.js 的专业水处理工程设计工具，支持AI水质报告解析、自定义工艺流程设计、膜组件选型、过滤效果AI模拟和水泵推荐。

### 技术栈
- **框架**: Next.js 16 (App Router)
- **UI**: React 19 + TypeScript 5
- **样式**: Tailwind CSS 4 + shadcn/ui
- **AI集成**: coze-coding-dev-sdk (支持豆包、DeepSeek、Kimi等大语言模型)

### 项目结构
```
src/
├── app/
│   ├── api/
│   │   ├── water-quality/
│   │   │   ├── parse/route.ts    # AI水质报告解析
│   │   │   └── analyze/route.ts  # AI水质分析
│   │   ├── design/
│   │   │   └── generate/route.ts # 设计方案生成
│   │   ├── simulation/
│   │   │   └── filter-effect/route.ts # 过滤效果AI模拟
│   │   └── manuals/
│   │       └── fetch/route.ts    # 手册内容获取
│   └── page.tsx                  # 主页面（分步向导）
├── components/
│   ├── water-quality-input.tsx   # 水质参数输入组件（进出水对比）
│   ├── process-design.tsx        # 自定义工艺流程设计组件
│   ├── pump-selection.tsx        # 水泵选型组件
│   ├── simulation-result.tsx     # 过滤效果模拟结果组件
│   ├── design-summary.tsx        # 设计总结组件
│   └── ui/                       # shadcn/ui 组件库
├── lib/
│   ├── constants/
│   │   ├── water-quality.ts      # 水质参数常量
│   │   ├── membranes.ts          # RO膜组件常量
│   │   ├── uf-membranes.ts       # 超滤膜组件常量
│   │   ├── pumps.ts              # 南方泵业产品常量
│   │   └── process.ts            # 工艺流程常量
│   └── utils.ts                  # 工具函数
└── types/                        # TypeScript 类型定义
```

## 核心功能

### 1. 水质参数输入（v2.0增强）
- **文件**: `src/components/water-quality-input.tsx`
- **功能**:
  - 支持进水和出水水质分别输入
  - 进出水水质对比展示
  - 支持上传图片/粘贴文本进行AI自动解析
  - 40+水质参数分类输入
  - 设计水量参数配置（进水量、产水量、回收率滑块调节）
  - 目标出水水质设定

### 2. 自定义工艺流程设计（v2.0新增）
- **文件**: `src/components/process-design.tsx`
- **功能**:
  - 快速预设工艺流程（简单RO、完整预处理+RO、UF+RO双膜法、NF+RO组合、两级RO）
  - 自由添加工艺单元（水箱、水泵、多介质过滤、活性炭、软化器、精滤、超滤、纳滤、反渗透、EDI、紫外消毒、加药等）
  - 自定义过滤精度（100μm ~ 0.22μm）
  - 超滤膜型号选择（DuPont SFP/SFD系列）
  - RO膜型号选择（Dow Filmtec BW/LE/SW/FR系列）
  - 纳滤膜型号选择（Dow Filmtec NF系列）
  - 工艺单元排序和删除
  - 各单元参数独立配置

### 3. 水泵选型
- **文件**: `src/components/pump-selection.tsx`
- **功能**:
  - 原水泵选型（根据进水量和扬程）
  - RO高压泵选型（根据膜类型和压力需求）
  - 超滤产水泵选型
  - 南方泵业(CNP)产品库集成
  - 智能推荐排序

### 4. 过滤效果AI模拟（v2.0新增）
- **文件**: `src/components/simulation-result.tsx` + `src/app/api/simulation/filter-effect/route.ts`
- **功能**:
  - 根据进水水质和工艺流程模拟每个单元的处理效果
  - 计算各单元的TDS、浊度、pH变化
  - 判断最终出水是否达标
  - 提供问题分析和改进建议
  - AI生成整体工艺评估总结

### 5. 设计总结
- **文件**: `src/components/design-summary.tsx`
- **功能**:
  - 水质参数总览
  - 设计参数汇总
  - 膜系统配置详情
  - 水泵配置详情
  - 设备清单表格
  - 导出设计报告（TXT格式）

## API 接口

### 1. 水质报告解析 API
- **路径**: `POST /api/water-quality/parse`
- **功能**: AI解析水质报告图片或文本
- **请求体**:
  ```json
  {
    "image": "data:image/png;base64,...",  // 图片Base64（可选）
    "text": "水质报告文本内容...",          // 文本内容（可选）
    "waterType": "inlet" | "outlet"        // 水质类型（可选）
  }
  ```

### 2. 水质分析 API
- **路径**: `POST /api/water-quality/analyze`
- **功能**: AI深度分析水质参数

### 3. 设计方案生成 API
- **路径**: `POST /api/design/generate`
- **功能**: 生成完整的水处理系统设计方案

### 4. 过滤效果模拟 API（v2.0新增）
- **路径**: `POST /api/simulation/filter-effect`
- **功能**: AI模拟工艺流程过滤效果
- **请求体**:
  ```json
  {
    "inletWaterQuality": { "ph": 7.5, "tds": 2000, ... },
    "outletTargetQuality": { "tds": 50, "turbidity": 0.5 },
    "processUnits": [
      { "type": "filter_precision", "params": { "precision": "5um" } },
      { "type": "ro", "config": { "model": "BW30-400" } }
    ],
    "designFlow": { "feed": 50, "permeate": 40, "recovery": 80 }
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "simulation": [...],  // 各单元模拟结果
    "finalResult": {
      "waterQuality": { "ph": 6.8, "tds": 40, ... },
      "meetsTarget": true,
      "issues": [...],
      "recommendations": [...]
    },
    "summary": "AI分析总结"
  }
  ```

## 膜组件数据库

### 精密过滤器精度选项
- 100μm ~ 0.22μm 全系列覆盖

### 超滤膜（DuPont）
- SFP-2640, SFP-2860, SFP-2880（外压式PVDF）
- SFD-2660（内压式PVDF）
- SFP-2640XP（高通量型）

### RO膜（Dow Filmtec）
- **苦咸水膜(BW)**: BW30-400, BW30-400/34i, BW30-365, BW30HR-440i, BW30FR-365
- **低能耗膜(LE)**: BW30LE-440i, LE-440i
- **海水膜(SW)**: SW30HR-380, SW30ULE-440i

### 纳滤膜（Dow Filmtec）
- NF90-400, NF270-400, NF245-400

## 开发规范

### 代码风格
- TypeScript 严格模式
- 函数必须有类型注解
- 组件使用 'use client' 指令
- 遵循 React 19 最佳实践

### 测试命令
```bash
# 类型检查
npx tsc --noEmit

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

### 环境变量
- `COZE_WORKSPACE_PATH`: 项目工作目录
- `COZE_PROJECT_DOMAIN_DEFAULT`: 项目域名
- `DEPLOY_RUN_PORT`: 服务端口（默认5000）
- `COZE_PROJECT_ENV`: 环境标识（DEV/PROD）

## 注意事项

1. **AI集成**: 使用 `coze-coding-dev-sdk` 调用大语言模型，支持多模型切换
2. **流式响应**: AI解析和分析支持流式输出（SSE协议）
3. **端口规范**: 服务必须运行在 5000 端口
4. **文件存储**: 生成文件优先存储到对象存储
5. **包管理**: 仅使用 pnpm，禁止使用 npm/yarn

## 更新日志

### v2.0.0 (2024-01-XX)
- 新增进出水水质对比输入功能
- 新增自定义工艺流程设计功能
- 新增过滤效果AI模拟功能
- 新增杜邦/Dow Filmtec膜组件数据库
- 支持自定义过滤精度（100μm ~ 0.22μm）
- 优化分步向导UI交互
- 新增工艺单元拖拽排序功能

### v1.0.0 (2024-01-XX)
- 完成基础架构搭建
- 实现AI水质解析功能
- 实现自动化工艺设计
- 集成膜组件和产品数据库
- 实现智能水泵选型
- 完成工艺流程可视化
- 实现设计报告导出

## 核心功能

### 1. 水质参数输入
- **文件**: `src/components/water-quality-input.tsx`
- **功能**:
  - 支持上传图片/粘贴文本进行AI自动解析
  - 40+水质参数分类输入（基础理化、阳离子、阴离子、有机/生物、安全性、营养盐等）
  - 设计水量参数配置（进水量、产水量、回收率）
  - AI水质分析报告生成

### 2. 装备设计
- **文件**: `src/components/equipment-design.tsx`
- **功能**:
  - 预处理工艺选择（多介质过滤、活性炭、软化等）
  - 精密过滤配置
  - 超滤系统选型（支持PVDF/PES/PS/PAN材质）
  - 主处理工艺选择（RO/NF/UF/RO+EDI/两级RO）
  - RO膜智能推荐（根据TDS自动推荐BW/SW/LE系列）
  - 段式配置和膜壳数量计算

### 3. 水泵选型
- **文件**: `src/components/pump-selection.tsx`
- **功能**:
  - 原水泵选型（根据进水量和扬程）
  - RO高压泵选型（根据膜类型和压力需求）
  - 超滤产水泵选型
  - 南方泵业(CNP)产品库集成
  - 智能推荐排序

### 4. 工艺流程图
- **文件**: `src/components/process-flow-diagram.tsx`
- **功能**:
  - 自动生成工艺流程可视化
  - 设计参数汇总
  - 设备配置汇总
  - 一键生成完整设计方案

### 5. 设计总结
- **文件**: `src/components/design-summary.tsx`
- **功能**:
  - 水质参数总览
  - 设计参数汇总
  - 膜系统配置详情
  - 水泵配置详情
  - 设备清单表格
  - 导出设计报告（TXT格式）

## API 接口

### 1. 水质报告解析 API
- **路径**: `POST /api/water-quality/parse`
- **功能**: AI解析水质报告图片或文本
- **请求体**:
  ```json
  {
    "image": "data:image/png;base64,...",  // 图片Base64（可选）
    "text": "水质报告文本内容..."          // 文本内容（可选）
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "ph": { "value": 7.5, "unit": "", "confidence": 95 },
      "tds": { "value": 1500, "unit": "mg/L", "confidence": 95 }
    },
    "missingParams": ["SDI", "TSS", ...],
    "analysis": "水质状况分析..."
  }
  ```

### 2. 水质分析 API
- **路径**: `POST /api/water-quality/analyze`
- **功能**: AI深度分析水质参数
- **请求体**:
  ```json
  {
    "waterQuality": { "ph": 7.5, "tds": 2000, ... },
    "designFlow": { "feed": 50, "permeate": 40, "recovery": 80 }
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "analysis": "详细分析报告...",
    "classification": {
      "type": "苦咸水",
      "tdsLevel": "中盐度",
      "hardnessLevel": "软水"
    }
  }
  ```

### 3. 设计方案生成 API
- **路径**: `POST /api/design/generate`
- **功能**: 生成完整的水处理系统设计方案
- **请求体**:
  ```json
  {
    "waterQuality": { ... },
    "designFlow": { ... },
    "processConfig": { ... },
    "membraneConfig": { ... }
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "design": {
      "membranes": { "ro": {...}, "uf": {...} },
      "pumps": { "feedPump": {...}, "highPressurePump": {...} },
      "processFlow": [...],
      "equipmentList": [...],
      "operatingParams": {...}
    }
  }
  ```

## 常量库说明

### 水质参数 (water-quality.ts)
- `WaterQualityParams`: 水质参数类型定义（40+参数）
- `waterQualityParamConfig`: 参数配置（单位、类别、典型值范围）
- `waterQualityStandards`: 水质标准预设（GB 5749、GB 18918、RO/UF进水要求）
- `roFeedLimits`: RO进水限值
- `classifyWaterQuality()`: 水质类型判断函数

### RO膜组件 (membranes.ts)
- `roMembranes`: RO膜产品数据库（Dow Filmtec、Hydranautics、Vontron等）
- `membraneDimensions`: 膜尺寸规格
- `recommendMembraneCategory()`: 根据TDS推荐膜类型
- `calculateMembraneCount()`: 计算膜数量

### 超滤膜组件 (uf-membranes.ts)
- `ufMembranes`: 超滤膜产品数据库（DuPont、Toray、OriginWater等）
- `recommendUFMembrane()`: 推荐超滤膜
- `calculateUFSystem()`: 计算超滤系统参数

### 水泵产品 (pumps.ts)
- `cnpPumps`: 南方泵业产品数据库
- `pumpSeriesInfo`: 泵系列说明
- `recommendPump()`: 智能推荐水泵
- `calculateROHighPressurePumpHead()`: 计算高压泵扬程
- `calculatePumpPower()`: 计算水泵功率

### 工艺流程 (process.ts)
- `pretreatmentOptions`: 预处理工艺选项
- `precisionFilterOptions`: 精密过滤选项
- `mainProcessOptions`: 主处理工艺选项
- `ufSystemOptions`: 超滤系统选项
- `recommendStages()`: 推荐RO段式配置
- `calculateStageVessels()`: 计算各段膜壳数量
- `generateProcessFlow()`: 生成工艺流程节点

## 过滤效果模拟算法 (v2.1新增)

### 算法文件
- **位置**: `src/lib/utils/filter-simulation.ts`
- **参考文献**:
  - [1] 《水处理工程》（第三版）- 许保玖
  - [2] 《膜分离技术基础》- 王学松
  - [3] 《反渗透水处理工程》- 邵刚
  - [4] ASTM D4189 - Standard Test Method for Silt Density Index (SDI)
  - [5] Filmtec Technical Manual - DuPont
  - [6] 《工业水处理技术》- 周本省
  - [7] GB/T 19249-2017 反渗透水处理设备

### 核心计算函数

#### 1. 多介质过滤器 - 深度过滤模型
```
公式: η = 1 - exp(-k × L × v^n)
参数:
- η: 去除效率
- k: 过滤系数（与滤料和颗粒特性相关）
- L: 滤层深度 (m)
- v: 过滤速度 (m/h)
- n: 经验指数（通常为-0.5到0）

典型去除率:
- 浊度: 50-80%
- 悬浮物: 70-90%
- COD: 10-30%
- 铁离子: 30-50%
```

#### 2. 活性炭过滤器 - Freundlich吸附模型
```
公式: q = K × C^(1/n)
参数:
- q: 单位质量吸附量 (mg/g)
- C: 平衡浓度 (mg/L)
- K, n: Freundlich常数

典型去除率:
- COD: 30-60%
- 余氯: 90-99%
- TOC: 40-70%
```

#### 3. 离子交换软化器
```
反应: 2NaR + Ca²⁺ → CaR₂ + 2Na⁺
      2NaR + Mg²⁺ → MgR₂ + 2Na⁺

典型去除率:
- 总硬度: 90-98%
- 铁离子: 80-95%
- 锰: 80-95%
```

#### 4. 精密过滤器 - 表面过滤模型
```
公式: η = 1 - (d_pore/d_particle)^m
参数:
- d_pore: 滤芯孔径
- d_particle: 颗粒粒径
- m: 经验指数

典型去除率(5μm孔径):
- 浊度: 80-95%
- 悬浮物: 90-99%
- 细菌: 50-80%
```

#### 5. 超滤膜(UF) - 筛分机理
```
截留分子量(MWCO)与去除关系:
- MWCO < 分子量 → 近100%截留
- MWCO ≈ 分子量 → 50-90%截留
- MWCO > 分子量 → 部分截留

对数去除率(LRV):
- 浊度/悬浮物: LRV > 2 (99%+)
- 细菌: LRV 2-4 (99%-99.99%)
- 病毒: LRV 1-2 (90%-99%)

典型去除率:
- 浊度: 98-99.9%
- 细菌: 99-99.99%
- 胶体铁: 80-95%
- 胶体硅: 50-80%
- 出水SDI: < 3
```

#### 6. 纳滤膜(NF) - Donnan效应+筛分
```
截留顺序: SO₄²⁻ > Ca²⁺/Mg²⁺ > Na⁺/Cl⁻ (Donnan效应)

典型去除率:
- TDS: 30-60%
- 硬度: 50-80%
- 硫酸根: 85-95%
- 氯离子: 10-30% (一价离子较低)
- COD: 85-95%
- TOC: 80-95%
```

#### 7. 反渗透膜(RO) - 溶解-扩散模型
```
水通量公式: J_w = A × (ΔP - Δπ)
溶质通量公式: J_s = B × ΔC
截留率公式: R = 1 - B/(B + A × (ΔP - Δπ))

参数:
- A: 水渗透系数 (L/m²·h·bar)
- B: 溶质渗透系数 (L/m²·h)
- ΔP: 操作压力差 (bar)
- Δπ: 渗透压差 (bar)

典型去除率:
- TDS: 95-99%
- 硬度: 95-99%
- COD: 90-98%
- 二氧化硅: 85-95%
- 细菌: 99.9-99.99% (LRV 3-4)
```

#### 8. EDI电去离子
```
原理: 电渗析 + 离子交换

典型去除率:
- TDS: 90-99%
- 二氧化硅: 95-99%
- 细菌: 99-99.9%
```

### API响应结构
```json
{
  "success": true,
  "simulation": [
    {
      "step": 1,
      "unit": "多介质过滤器",
      "unitType": "filter_media",
      "inlet": { "tds": 2000, "turbidity": 15, ... },
      "outlet": { "tds": 2000, "turbidity": 5.25, ... },
      "removalRates": { "浊度": "65.0%", "悬浮物": "80.0%" },
      "notes": "多介质过滤器通过深度过滤去除悬浮物和胶体",
      "formula": "η = 65.0% (深度过滤经验公式，受浊度影响)"
    }
  ],
  "finalWater": { "tds": 60, "turbidity": 0.63, ... },
  "statistics": {
    "totalTDSRemoval": "97.0%",
    "totalTurbidityRemoval": "95.8%",
    "totalCODRemoval": "98.6%"
  },
  "targetAssessment": {
    "meetsTarget": false,
    "achievement": { ... }
  },
  "issues": ["RO进水铁含量超标，可能导致膜结垢"],
  "recommendations": ["建议加强除铁处理"],
  "foulingRisk": {
    "overallRisk": "high",
    "factors": [ ... ],
    "recommendations": [ ... ]
  },
  "concentrateWater": { ... }
}
```

### 主要函数
- `simulateWaterTreatment()`: 完整工艺流程模拟
- `assessFoulingRisk()`: 膜污染风险评估
- `calculateConcentrateWater()`: 浓水水质计算

## 开发规范

### 代码风格
- TypeScript 严格模式
- 函数必须有类型注解
- 组件使用 'use client' 指令
- 遵循 React 19 最佳实践

### 测试命令
```bash
# 类型检查
npx tsc --noEmit

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

### 环境变量
- `COZE_WORKSPACE_PATH`: 项目工作目录
- `COZE_PROJECT_DOMAIN_DEFAULT`: 项目域名
- `DEPLOY_RUN_PORT`: 服务端口（默认5000）
- `COZE_PROJECT_ENV`: 环境标识（DEV/PROD）

## 注意事项

1. **AI集成**: 使用 `coze-coding-dev-sdk` 调用大语言模型，支持多模型切换
2. **流式响应**: AI解析和分析支持流式输出（SSE协议）
3. **端口规范**: 服务必须运行在 5000 端口
4. **文件存储**: 生成文件优先存储到对象存储
5. **包管理**: 仅使用 pnpm，禁止使用 npm/yarn

## 更新日志

### v1.0.0 (2024-01-XX)
- 完成基础架构搭建
- 实现AI水质解析功能
- 实现自动化工艺设计
- 集成膜组件和产品数据库
- 实现智能水泵选型
- 完成工艺流程可视化
- 实现设计报告导出
