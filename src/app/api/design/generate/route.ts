import { NextRequest, NextResponse } from 'next/server';
import { roMembranes, calculateMembraneCount, recommendMembraneCategory, WaterSourceType } from '@/lib/constants/membranes';
import { ufMembranes, recommendUFMembrane, calculateUFSystem } from '@/lib/constants/uf-membranes';
import { 
  pretreatmentOptions, 
  precisionFilterOptions, 
  mainProcessOptions,
  recommendStages,
  generateProcessFlow
} from '@/lib/constants/process';
import { WaterQualityParams } from '@/lib/constants/water-quality';
import { selectPump } from '@/lib/utils/pump-selection';
import { calculateSystemPressure, calculateOsmoticPressure } from '@/lib/utils/pump-calculations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      waterQuality,
      designFlow,
      processConfig,
      membraneConfig
    } = body as {
      waterQuality: WaterQualityParams;
      designFlow: {
        feed: number; // m³/h
        permeate: number; // m³/h
        recovery: number; // %
      };
      processConfig: {
        pretreatment: string;
        precisionFilter: string;
        ufSystem: string;
        mainProcess: string;
      };
      membraneConfig?: {
        roModel?: string;
        ufModel?: string;
        stages?: number;
        elementsPerVessel?: number;
      };
    };

    // 参数验证
    if (!designFlow || !designFlow.feed || !designFlow.permeate) {
      return NextResponse.json(
        { error: '请提供完整的设计流量参数' },
        { status: 400 }
      );
    }

    // 1. 水质分析
    const tds = waterQuality?.tds || 1000;
    const membraneCategory = recommendMembraneCategory(tds);
    
    // 根据水质判断水源类型
    const getWaterSourceType = (wq: WaterQualityParams | undefined): WaterSourceType => {
      if (!wq) return 'groundwater';
      if (tds > 10000) return 'seawater';
      if (wq.cod && wq.cod > 30) return 'wastewater';
      if (wq.turbidity && wq.turbidity > 10) return 'surface_water';
      return 'groundwater';
    };
    const waterSourceType = getWaterSourceType(waterQuality);
    const hasUF = processConfig?.ufSystem && processConfig.ufSystem !== 'none';

    // 2. RO膜选型
    let selectedROMembrane = null;
    let roCalculation = null;
    let stages = membraneConfig?.stages || recommendStages(designFlow.recovery, tds).stages;
    
    if (processConfig?.mainProcess?.includes('ro')) {
      // 筛选合适的膜
      const candidateMembranes = roMembranes.filter(m => {
        if (membraneCategory.category === 'sw' && m.category !== 'sw') return false;
        if (membraneCategory.category === 'bw' && m.category === 'sw') return false;
        if (membraneConfig?.roModel && m.model !== membraneConfig.roModel) return false;
        return true;
      });

      // 如果没有指定型号，选择第一个匹配的
      selectedROMembrane = candidateMembranes[0] || roMembranes[0];
      
      // 计算膜数量（使用专业版计算函数）
      roCalculation = calculateMembraneCount(designFlow.permeate, selectedROMembrane, {
        recovery: designFlow.recovery,
        stages: stages,
        elementsPerVessel: membraneConfig?.elementsPerVessel || 6,
        waterSourceType,
        sdi: waterQuality?.sdi,
        hasUF: !!hasUF
      });
      
      // 更新实际段数
      stages = roCalculation.stageConfig.length;
    }

    // 3. 超滤系统选型
    let ufRecommendation = null;
    let ufCalculation = null;

    if (processConfig?.ufSystem && processConfig.ufSystem !== 'none') {
      ufRecommendation = recommendUFMembrane(
        waterQuality?.turbidity || 10,
        0, // tss
        waterQuality?.cod || 0,
        designFlow.feed
      );
      ufCalculation = calculateUFSystem(
        ufRecommendation.membrane!,
        ufRecommendation.count
      );
    }

    // 4. 段式配置（从计算结果中获取）
    const stageVessels = roCalculation 
      ? roCalculation.stageConfig.map(s => s.vessels)
      : [];

    // 5. 水泵选型（使用新的水泵选型算法，基于南方泵业真实数据）
    const membraneType: 'BW' | 'SW' | 'LE' = 
      membraneCategory.category === 'sw' ? 'SW' :
      membraneCategory.category === 'le' ? 'LE' : 'BW';
    
    const pressureResult = calculateSystemPressure({
      feedTDS: tds,
      recovery: designFlow.recovery / 100, // 转换为小数
      temperature: waterQuality?.temperature || 25,
      membraneType
    });
    
    const osmoticPressure = calculateOsmoticPressure(tds, waterQuality?.temperature || 25);
    
    // 原水泵选型
    const feedPumpSelection = selectPump({
      requiredFlow: designFlow.feed,
      requiredHead: 30, // 原水泵常规扬程
      application: 'feed',
      maxParallelCount: designFlow.feed > 50 ? 4 : 1
    });
    
    // 高压泵选型
    const highPressurePumpSelection = selectPump({
      requiredFlow: designFlow.feed,
      requiredHead: pressureResult.head,
      application: 'ro',
      maxParallelCount: designFlow.feed > 50 ? 4 : 1
    });
    
    // 段间泵判断与选型
    const interstagePumpNeeded = stages >= 2 && (
      tds > 5000 || 
      designFlow.recovery > 80 ||
      pressureResult.components.osmoticPressure > 8
    );
    
    let interstagePumpSelection = null;
    if (interstagePumpNeeded) {
      const stage1Permeate = designFlow.permeate * 0.55;
      const stage1ConcentrateFlow = designFlow.feed - stage1Permeate;
      
      interstagePumpSelection = selectPump({
        requiredFlow: stage1ConcentrateFlow,
        requiredHead: 30, // 段间泵扬程
        application: 'booster'
      });
    }
    
    // UF产水泵选型（如有超滤）
    let ufPumpSelection = null;
    if (processConfig?.ufSystem && processConfig.ufSystem !== 'none') {
      ufPumpSelection = selectPump({
        requiredFlow: designFlow.feed * 1.1,
        requiredHead: 25,
        application: 'uf'
      });
    }
    
    // 组装水泵配置结果
    const feedPump = feedPumpSelection ? {
      primary: {
        ...feedPumpSelection.selected,
        power: feedPumpSelection.selected.motorPower // 添加 power 属性兼容
      },
      alternatives: feedPumpSelection.alternatives.map(p => ({ ...p, power: p.motorPower })),
      reasoning: feedPumpSelection.reasoning,
      parallelCount: feedPumpSelection.parallelCount
    } : null;
    
    const highPressurePump = highPressurePumpSelection ? {
      primary: {
        ...highPressurePumpSelection.selected,
        power: highPressurePumpSelection.selected.motorPower
      },
      alternatives: highPressurePumpSelection.alternatives.map(p => ({ ...p, power: p.motorPower })),
      reasoning: highPressurePumpSelection.reasoning,
      pressure: pressureResult.operatingPressure,
      parallelCount: highPressurePumpSelection.parallelCount
    } : null;
    
    const interstagePump = interstagePumpSelection ? {
      pump: {
        ...interstagePumpSelection.selected,
        power: interstagePumpSelection.selected.motorPower
      },
      reasoning: interstagePumpSelection.reasoning,
      required: interstagePumpNeeded
    } : null;

    // 6. 生成工艺流程
    const processFlow = generateProcessFlow({
      pretreatment: processConfig?.pretreatment || 'none',
      precisionFilter: processConfig?.precisionFilter || '5um',
      ufSystem: processConfig?.ufSystem || 'none',
      mainProcess: processConfig?.mainProcess || 'ro',
      selectedPump: feedPump?.primary?.model,
      selectedUFMembrane: ufRecommendation?.membrane?.model,
      selectedROMembrane: selectedROMembrane?.model,
      stages: stages,
      elementsPerVessel: membraneConfig?.elementsPerVessel || 6,
      vesselsStage1: stageVessels[0],
      vesselsStage2: stageVessels[1],
      vesselsStage3: stageVessels[2]
    });

    // 7. 设备清单
    const equipmentList = [];

    // 原水箱
    equipmentList.push({
      category: '储罐',
      name: '原水箱',
      spec: `容积: ${Math.ceil(designFlow.feed * 0.5)} m³`,
      quantity: 1,
      unit: '台',
      note: '按0.5小时储水量设计'
    });

    // 原水泵
    if (feedPump?.primary) {
      equipmentList.push({
        category: '水泵',
        name: '原水泵',
        model: feedPump.primary.model,
        spec: `Q=${feedPump.primary.flow}m³/h, H=${feedPump.primary.head}m, P=${feedPump.primary.motorPower}kW`,
        quantity: feedPump.parallelCount && feedPump.parallelCount > 1 ? feedPump.parallelCount : 2,
        unit: '台',
        note: feedPump.parallelCount && feedPump.parallelCount > 1 ? `${feedPump.parallelCount}台并联` : '1用1备',
        alternatives: feedPump.alternatives.map(p => p.model)
      });
    }

    // 预处理设备
    if (processConfig?.pretreatment === 'multimedia' || processConfig?.pretreatment?.includes('multimedia')) {
      equipmentList.push({
        category: '预处理',
        name: '多介质过滤器',
        spec: `处理量: ${designFlow.feed} m³/h`,
        quantity: Math.ceil(designFlow.feed / 30),
        unit: '台',
        note: '包含石英砂、无烟煤滤料'
      });
    }

    if (processConfig?.pretreatment?.includes('carbon')) {
      equipmentList.push({
        category: '预处理',
        name: '活性炭过滤器',
        spec: `处理量: ${designFlow.feed} m³/h`,
        quantity: Math.ceil(designFlow.feed / 30),
        unit: '台',
        note: '去除有机物和余氯'
      });
    }

    // 超滤系统
    if (ufRecommendation?.membrane) {
      equipmentList.push({
        category: '超滤',
        name: '超滤膜组件',
        model: ufRecommendation.membrane.model,
        spec: `膜面积: ${ufRecommendation.membrane.area}m², 通量: ${ufRecommendation.membrane.flux}LMH`,
        quantity: ufRecommendation.count,
        unit: '支',
        note: ufRecommendation.reasoning
      });
    }

    // RO系统
    if (selectedROMembrane && roCalculation) {
      equipmentList.push({
        category: 'RO膜',
        name: 'RO膜元件',
        model: selectedROMembrane.model,
        spec: `产水量: ${selectedROMembrane.flow}GPD, 脱盐率: ${selectedROMembrane.rejection}%`,
        quantity: roCalculation.elements,
        unit: '支',
        note: `${selectedROMembrane.brand} ${selectedROMembrane.description}`
      });

      equipmentList.push({
        category: 'RO膜壳',
        name: '压力容器',
        spec: `${selectedROMembrane.dimension}英寸, ${membraneConfig?.elementsPerVessel || 6}芯装`,
        quantity: roCalculation.vessels,
        unit: '支',
        note: `FRP材质, ${stages}段式`
      });
    }

    // 高压泵
    if (highPressurePump?.primary) {
      equipmentList.push({
        category: '水泵',
        name: 'RO高压泵',
        model: highPressurePump.primary.model,
        spec: `Q=${highPressurePump.primary.flow}m³/h, H=${highPressurePump.primary.head}m, P=${highPressurePump.primary.motorPower}kW`,
        quantity: highPressurePump.parallelCount && highPressurePump.parallelCount > 1 ? highPressurePump.parallelCount : 1,
        unit: '台',
        note: highPressurePump.parallelCount && highPressurePump.parallelCount > 1 
          ? `${highPressurePump.parallelCount}台并联，变频控制` 
          : '变频控制',
        alternatives: highPressurePump.alternatives.map(p => p.model)
      });
    }

    // 段间泵（如果需要）
    if (interstagePump?.pump) {
      equipmentList.push({
        category: '水泵',
        name: '段间泵',
        model: interstagePump.pump.model,
        spec: `Q=${interstagePump.pump.flow}m³/h, H=${interstagePump.pump.head}m, P=${interstagePump.pump.motorPower}kW`,
        quantity: 1,
        unit: '台',
        note: interstagePump.reasoning,
        alternatives: []
      });
    }

    // 产水箱
    equipmentList.push({
      category: '储罐',
      name: '产水箱',
      spec: `容积: ${Math.ceil(designFlow.permeate * 1)} m³`,
      quantity: 1,
      unit: '台',
      note: '按1小时产水量设计'
    });

    // 8. 运行参数估算
    const totalPumpPower = (highPressurePump?.primary?.motorPower || 0) + 
                          (interstagePump?.pump?.motorPower || 0);
    
    const operatingParams = {
      feedFlow: designFlow.feed,
      permeateFlow: designFlow.permeate,
      concentrateFlow: designFlow.feed - designFlow.permeate,
      recovery: designFlow.recovery,
      concentrationFactor: (100 / (100 - designFlow.recovery)).toFixed(2),
      estimatedPressure: `${pressureResult.operatingPressure} bar`,
      estimatedPower: totalPumpPower > 0 
        ? `${totalPumpPower.toFixed(1)} kW` 
        : '待计算',
      estimatedWaterCost: '待计算',
      interstagePressure: interstagePump?.pump 
        ? `${interstagePump.pump.head} m` 
        : '无需分压',
      osmoticPressure: `${osmoticPressure.toFixed(2)} bar`,
      chemicalDosage: {
        antiscalant: `${(designFlow.feed * 0.004).toFixed(1)} L/h (4ppm)`,
        smbs: (waterQuality?.chlorine ?? 0) > 0.1 
          ? `${(designFlow.feed * (waterQuality?.chlorine ?? 0) * 0.002).toFixed(2)} L/h` 
          : '无需投加'
      }
    };

    return NextResponse.json({
      success: true,
      design: {
        waterQuality: {
          tds,
          category: membraneCategory
        },
        membranes: {
          ro: selectedROMembrane ? {
            selected: selectedROMembrane,
            calculation: roCalculation,
            stages: stages,
            stageVessels
          } : null,
          uf: ufRecommendation ? {
            selected: ufRecommendation.membrane,
            count: ufRecommendation.count,
            calculation: ufCalculation,
            reasoning: ufRecommendation.reasoning
          } : null
        },
        pumps: {
          feedPump: feedPump ? {
            selected: feedPump.primary,
            alternatives: feedPump.alternatives,
            reasoning: feedPump.reasoning,
            parallelCount: feedPump.parallelCount
          } : null,
          highPressurePump: highPressurePump ? {
            selected: highPressurePump.primary,
            alternatives: highPressurePump.alternatives,
            reasoning: highPressurePump.reasoning,
            pressure: highPressurePump.pressure,
            parallelCount: highPressurePump.parallelCount
          } : null,
          interstagePump: interstagePump ? {
            selected: interstagePump.pump,
            alternatives: [],
            reasoning: interstagePump.reasoning,
            isRequired: interstagePump.required
          } : null,
          ufPump: ufPumpSelection ? {
            selected: { ...ufPumpSelection.selected, power: ufPumpSelection.selected.motorPower },
            alternatives: ufPumpSelection.alternatives.map(p => ({ ...p, power: p.motorPower })),
            reasoning: ufPumpSelection.reasoning
          } : null,
          summary: {
            totalPower: totalPumpPower,
            parallelConfiguration: highPressurePump?.parallelCount && highPressurePump.parallelCount > 1
              ? `${highPressurePump.parallelCount}台高压泵并联`
              : '单台高压泵'
          }
        },
        processFlow,
        equipmentList,
        operatingParams
      }
    });

  } catch (error) {
    console.error('设计方案生成失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '设计失败，请检查输入参数' 
      },
      { status: 500 }
    );
  }
}
