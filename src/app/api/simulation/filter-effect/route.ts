import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import {
  simulateWaterTreatment,
  assessFoulingRisk,
  calculateConcentrateWater,
  WaterQuality,
  ProcessUnit,
  SimulationResult
} from '@/lib/utils/filter-simulation';
import {
  getRecommendedStandards,
  generateOutletTarget,
  assessCompliance,
  waterQualityStandards
} from '@/lib/constants/water-standards';

// 过滤效果模拟API - 基于水处理工程文献公式计算
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      inletWaterQuality,
      outletTargetQuality,
      processUnits,
      designFlow
    } = body;

    // 参数验证
    if (!inletWaterQuality || !processUnits || processUnits.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 构建进水水质对象
    // 电导率换算公式: 电导率(μS/cm) = TDS(mg/L) / 0.65
    // v3.6修复：添加缺失的水质参数（calcium, magnesium, nitrate, ammonia, tn, tp, bod等）
    // v3.6二次修复：如果前端没有传递calcium/magnesium，从总硬度推导（典型比例：Ca²⁺占40%，Mg²⁺占24.3%）
    // v3.9.1修复：使用 ?? 替代 ||，确保0值不被覆盖（只有null/undefined才用默认值）
    const hardness = inletWaterQuality.hardness ?? 150;
    const inletWater: WaterQuality = {
      ph: inletWaterQuality.ph ?? 7.0,
      tds: inletWaterQuality.tds ?? 500,
      conductivity: inletWaterQuality.conductivity ?? (inletWaterQuality.tds ?? 500) / 0.65,
      turbidity: inletWaterQuality.turbidity ?? 5,
      hardness: hardness,
      cod: inletWaterQuality.cod ?? 10,
      chlorine: inletWaterQuality.chlorine ?? 0.5,
      iron: inletWaterQuality.iron ?? 0.1,
      silica: inletWaterQuality.silica,  // v3.9.1修复：移除默认值10，SiO₂为可选参数
      sdi: inletWaterQuality.sdi,
      bacteria: inletWaterQuality.bacteria,
      virus: inletWaterQuality.virus,
      silt: inletWaterQuality.silt,
      manganese: inletWaterQuality.manganese,
      sulfate: inletWaterQuality.sulfate,
      chloride: inletWaterQuality.chloride,
      toc: inletWaterQuality.toc,
      // 阳离子（v3.6修复：从硬度推导calcium/magnesium）
      calcium: inletWaterQuality.calcium ?? (hardness * 0.4),  // Ca²⁺ ≈ 40% of hardness as CaCO₃
      magnesium: inletWaterQuality.magnesium ?? (hardness * 0.243),  // Mg²⁺ ≈ 24.3% of hardness as CaCO₃
      sodium: inletWaterQuality.sodium,
      potassium: inletWaterQuality.potassium,
      // 稀有阳离子（结垢风险相关）
      barium: inletWaterQuality.barium,
      strontium: inletWaterQuality.strontium,
      // 硼 (v3.9新增: 海水淡化关键指标)
      boron: inletWaterQuality.boron,
      // 阴离子（v3.6新增）
      bicarbonate: inletWaterQuality.bicarbonate,
      nitrate: inletWaterQuality.nitrate,
      fluoride: inletWaterQuality.fluoride,
      // 有机物（v3.6新增）
      bod: inletWaterQuality.bod,
      color: inletWaterQuality.color,
      // 营养盐（v3.6新增）
      ammonia: inletWaterQuality.ammonia,
      tn: inletWaterQuality.tn,
      tp: inletWaterQuality.tp,
      // 其他
      tss: inletWaterQuality.tss,
      ss: inletWaterQuality.ss,
      temperature: inletWaterQuality.temperature ?? 25
    };

    // 构建工艺单元列表
    const units: ProcessUnit[] = processUnits.map((unit: any) => ({
      type: unit.unitType || unit.type,  // 兼容 unitType 和 type 两种字段名
      name: unit.name,
      params: unit.params || {},
      config: unit.config || {}
    }));

    // 设计参数
    // v3.9.2修复：使用 ?? 替代 ||，确保0值不被覆盖
    const designParams = {
      recovery: designFlow?.recovery ? designFlow.recovery / 100 : 0.75,
      temperature: inletWaterQuality.temperature ?? 25,
      feedFlow: designFlow?.feed ?? 50  // 进水流量 m³/h（用于多段RO计算）
    };

    // 执行基于文献公式的精确计算
    const simulationResult = simulateWaterTreatment(inletWater, units, designParams);

    // 评估膜污染风险（如果有膜单元）
    const membraneTypes: Array<'UF' | 'NF' | 'RO'> = [];
    if (units.some(u => u.type === 'uf')) membraneTypes.push('UF');
    if (units.some(u => u.type === 'nf')) membraneTypes.push('NF');
    if (units.some(u => u.type === 'ro')) membraneTypes.push('RO');

    let foulingAssessment = null;
    if (membraneTypes.length > 0) {
      // 对于RO，评估其进水水质
      const roIndex = units.findIndex(u => u.type === 'ro');
      const roInletWater = roIndex >= 0 && simulationResult.simulation[roIndex]
        ? simulationResult.simulation[roIndex].inlet
        : inletWater;

      foulingAssessment = assessFoulingRisk(roInletWater, 'RO');
    }

    // 计算浓水水质（如果有RO单元）
    let concentrateWater = null;
    const hasRO = units.some(u => u.type === 'ro');
    if (hasRO && designFlow?.recovery) {
      const roIndex = units.findIndex(u => u.type === 'ro');
      const roInletWater = roIndex >= 0 && simulationResult.simulation[roIndex]
        ? simulationResult.simulation[roIndex].inlet
        : inletWater;

      concentrateWater = calculateConcentrateWater(roInletWater, designParams.recovery, 0.97);
    }

    // 获取工艺单元类型列表
    const processTypes = units.map(u => u.type);
    
    // 计算目标达成情况 - 根据是否有出水目标决定
    // 当没有设置出水目标时，根据工艺流程自动推荐水质标准
    const hasOutletTarget = outletTargetQuality && Object.keys(outletTargetQuality).length > 0;
    let tdsTarget: number;
    let turbidityTarget: number;
    let codTarget: number;
    let recommendedStandards: any[] = [];
    let autoGeneratedTarget: Record<string, number> | null = null;
    
    if (hasOutletTarget) {
      // 使用用户传入的目标值
      tdsTarget = outletTargetQuality.tds || 50;
      turbidityTarget = outletTargetQuality.turbidity || 0.5;
      codTarget = outletTargetQuality.cod || 10;
    } else {
      // 根据工艺流程自动推荐水质标准
      recommendedStandards = getRecommendedStandards(processTypes);
      
      if (recommendedStandards.length > 0) {
        // 使用推荐的第一个（最严格的）标准
        const topStandard = recommendedStandards[0];
        autoGeneratedTarget = generateOutletTarget(topStandard);
        tdsTarget = autoGeneratedTarget.tds || 50;
        turbidityTarget = autoGeneratedTarget.turbidity || 0.5;
        codTarget = autoGeneratedTarget.cod || 10;
      } else {
        // 默认RO产水标准
        tdsTarget = 50;
        turbidityTarget = 0.5;
        codTarget = 10;
      }
    }
    
    const tdsAchieved = simulationResult.finalWater.tds < tdsTarget;
    const turbidityAchieved = simulationResult.finalWater.turbidity < turbidityTarget;
    const codAchieved = simulationResult.finalWater.cod < codTarget;

    // 构建响应数据
    const response = {
      success: true,
      // 模拟步骤详情
      simulation: simulationResult.simulation.map(step => ({
        step: step.step,
        unit: step.unit,
        unitType: step.unitType,
        inlet: formatWaterQuality(step.inlet),
        outlet: formatWaterQuality(step.outlet),
        removalRates: step.removalRates,
        notes: step.notes,
        formula: step.formula  // 使用的计算公式
      })),

      // 最终出水水质
      finalWater: formatWaterQuality(simulationResult.finalWater),

      // 总去除率统计
      statistics: {
        totalTDSRemoval: simulationResult.totalRemoval.tds,
        totalTurbidityRemoval: simulationResult.totalRemoval.turbidity,
        totalCODRemoval: simulationResult.totalRemoval.cod,
        totalHardnessRemoval: simulationResult.totalRemoval.hardness,
        inletTDS: inletWater.tds,
        outletTDS: simulationResult.finalWater.tds,
        processSteps: processUnits.length
      },

      // 目标达成评估
      targetAssessment: {
        meetsTarget: tdsAchieved && turbidityAchieved && codAchieved,
        target: outletTargetQuality || (autoGeneratedTarget || {
          tds: 50,
          turbidity: 0.5,
          cod: 10
        }),
        // 标记是否自动生成的目标
        autoGenerated: !hasOutletTarget,
        // 推荐的水质标准（当自动生成目标时提供）
        recommendedStandards: recommendedStandards.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          standards: s.standards,
          typicalApplication: s.typicalApplication
        })),
        achievement: {
          tds: {
            target: tdsTarget,
            actual: simulationResult.finalWater.tds,
            achieved: tdsAchieved
          },
          turbidity: {
            target: turbidityTarget,
            actual: simulationResult.finalWater.turbidity,
            achieved: turbidityAchieved
          },
          cod: {
            target: codTarget,
            actual: simulationResult.finalWater.cod,
            achieved: codAchieved
          }
        }
      },

      // 问题与建议
      issues: simulationResult.issues,
      recommendations: simulationResult.recommendations,

      // 水质符合性评估（自动计算出水能符合哪些标准）
      complianceAssessment: (() => {
        const complianceResults = assessCompliance({
          tds: simulationResult.finalWater.tds,
          turbidity: simulationResult.finalWater.turbidity,
          cod: simulationResult.finalWater.cod,
          hardness: simulationResult.finalWater.hardness,
          conductivity: simulationResult.finalWater.conductivity
        });
        
        // 分类结果
        const fullyCompliant = complianceResults.filter(r => r.compliance === 'full');
        const partiallyCompliant = complianceResults.filter(r => r.compliance === 'partial');
        
        return {
          fullyCompliant: fullyCompliant.slice(0, 5).map(r => ({
            standardId: r.standard.id,
            standardName: r.standard.name,
            typicalApplication: r.standard.typicalApplication
          })),
          partiallyCompliant: partiallyCompliant.slice(0, 3).map(r => ({
            standardId: r.standard.id,
            standardName: r.standard.name,
            issues: r.issues
          })),
          summary: fullyCompliant.length > 0 
            ? `该工艺出水可达到 ${fullyCompliant[0].standard.name} 标准`
            : partiallyCompliant.length > 0
              ? `该工艺出水部分指标可达到 ${partiallyCompliant[0].standard.name} 标准`
              : '该工艺出水未能符合已知标准'
        };
      })(),

      // 膜污染风险评估
      foulingRisk: foulingAssessment,

      // 浓水水质（如有RO）
      concentrateWater: concentrateWater ? formatWaterQuality(concentrateWater) : null,

      // 设计参数
      designParams: {
        feedFlow: designFlow?.feed || 0,
        permeateFlow: designFlow?.permeate || 0,
        recovery: designParams.recovery * 100,
        temperature: designParams.temperature
      }
    };

    // 如果需要AI补充分析（可选）
    const enableAIAnalysis = process.env.ENABLE_AI_SIMULATION_ANALYSIS === 'true';

    if (enableAIAnalysis) {
      try {
        const aiAnalysis = await getAIAnalysis(response);
        (response as any).aiAnalysis = aiAnalysis;
      } catch (aiError) {
        console.warn('AI分析失败，使用纯计算结果:', aiError);
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('过滤效果模拟失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '模拟失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}

/**
 * 格式化水质数据用于输出 (v3.5 - 完整离子参数)
 */
function formatWaterQuality(water: WaterQuality): Record<string, any> {
  const result: Record<string, any> = {
    // 基础参数
    ph: roundTo(water.ph, 1),
    tds: roundTo(water.tds, 1),
    conductivity: roundTo(water.conductivity, 0),
    turbidity: roundTo(water.turbidity, 2),
    
    // 阳离子
    hardness: roundTo(water.hardness, 1),
    calcium: water.calcium !== undefined ? roundTo(water.calcium, 1) : undefined,
    magnesium: water.magnesium !== undefined ? roundTo(water.magnesium, 1) : undefined,
    sodium: water.sodium !== undefined ? roundTo(water.sodium, 1) : undefined,
    potassium: water.potassium !== undefined ? roundTo(water.potassium, 1) : undefined,
    iron: roundTo(water.iron, 2),
    manganese: roundTo(water.manganese, 2),
    
    // 阴离子
    chloride: water.chloride !== undefined ? roundTo(water.chloride, 1) : undefined,
    sulfate: water.sulfate !== undefined ? roundTo(water.sulfate, 1) : undefined,
    bicarbonate: water.bicarbonate !== undefined ? roundTo(water.bicarbonate, 1) : undefined,
    silica: roundTo(water.silica, 1),
    nitrate: water.nitrate !== undefined ? roundTo(water.nitrate, 1) : undefined,
    fluoride: water.fluoride !== undefined ? roundTo(water.fluoride, 2) : undefined,
    
    // 有机物
    cod: roundTo(water.cod, 1),
    toc: water.toc !== undefined ? roundTo(water.toc, 1) : undefined,
    bod: water.bod !== undefined ? roundTo(water.bod, 1) : undefined,
    
    // 微生物
    bacteria: water.bacteria !== undefined ? Math.round(water.bacteria) : undefined,
    virus: water.virus !== undefined ? Math.round(water.virus) : undefined,
    
    // 营养盐
    ammonia: water.ammonia !== undefined ? roundTo(water.ammonia, 2) : undefined,
    tn: water.tn !== undefined ? roundTo(water.tn, 1) : undefined,
    tp: water.tp !== undefined ? roundTo(water.tp, 2) : undefined,
    
    // 其他
    chlorine: roundTo(water.chlorine, 2),
    sdi: water.sdi !== undefined ? roundTo(water.sdi, 1) : undefined,
    silt: water.silt !== undefined ? roundTo(water.silt, 1) : undefined,
    tss: water.tss !== undefined ? roundTo(water.tss, 1) : undefined,
    ss: water.ss !== undefined ? roundTo(water.ss, 1) : undefined,  // v3.9新增
    // 稀有阳离子 (v3.9新增)
    barium: water.barium !== undefined ? roundTo(water.barium, 3) : undefined,
    strontium: water.strontium !== undefined ? roundTo(water.strontium, 2) : undefined,
    // 海水淡化关键指标 (v3.9新增)
    boron: water.boron !== undefined ? roundTo(water.boron, 2) : undefined,
    // 有机物/感官指标
    color: water.color !== undefined ? roundTo(water.color, 0) : undefined,
    // 温度 (v3.9新增)
    temperature: water.temperature !== undefined ? roundTo(water.temperature, 1) : undefined
  };

  // 过滤掉undefined的值，保持输出干净
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });

  return result;
}

/**
 * 四舍五入到指定小数位
 */
function roundTo(value: number, decimals: number): number {
  if (value === 0) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 获取AI补充分析（可选功能）
 */
async function getAIAnalysis(simulationData: any): Promise<string> {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders({} as any);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const prompt = `作为水处理专家，请对以下模拟结果进行简要分析和建议：

## 进水水质
- TDS: ${simulationData.statistics.inletTDS} mg/L
- 浊度: ${simulationData.simulation[0]?.inlet.turbidity} NTU

## 工艺流程
${simulationData.simulation.map((s: any) => `${s.step}. ${s.unit}`).join('\n')}

## 出水水质
- TDS: ${simulationData.statistics.outletTDS} mg/L
- 浊度: ${simulationData.finalWater.turbidity} NTU
- COD: ${simulationData.finalWater.cod} mg/L

## 总去除率
- TDS: ${simulationData.statistics.totalTDSRemoval}
- 浊度: ${simulationData.statistics.totalTurbidityRemoval}

请用2-3句话总结处理效果，并给出一个最重要的优化建议。`;

    const response = await client.invoke([
      {
        role: 'system',
        content: '你是一个专业的水处理系统工程师，请简洁、专业地回答。'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.3
    });

    return response.content.trim();
  } catch (error) {
    console.error('AI分析失败:', error);
    return '';
  }
}
