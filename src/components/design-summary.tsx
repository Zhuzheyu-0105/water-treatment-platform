'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileCheck, 
  Download, 
  FlaskConical, 
  Settings2, 
  Gauge, 
  Droplets,
  CheckCircle2,
  AlertCircle,
  Table,
  FileText,
  Printer,
  ArrowRight
} from 'lucide-react';
import { WaterQualityParams, waterQualityParamConfig } from '@/lib/constants/water-quality';

// 定义需要展示的水质参数及其配置
// 包含完整的键名映射：simulation数据的removalRates使用中文键名，finalOutlet使用英文键名
const ION_PARAMS: Array<{
  key: keyof WaterQualityParams;      // finalOutlet使用的英文键名
  cnKey: string;                       // removalRates使用的中文键名
  label: string;                       // 显示标签
  unit: string;
  // 二价离子可从总硬度推导，一价离子从氯离子/钠推导
  derivableFrom?: { type: 'hardness' | 'chloride'; factor?: number };
}> = [
  // 基础参数
  { key: 'tds', cnKey: 'TDS', label: 'TDS', unit: 'mg/L' },
  { key: 'conductivity', cnKey: '电导率', label: '电导率', unit: 'μS/cm' },
  { key: 'turbidity', cnKey: '浊度', label: '浊度', unit: 'NTU' },
  { key: 'ph', cnKey: 'pH', label: 'pH值', unit: '' },
  
  // 阳离子
  { key: 'hardness', cnKey: '总硬度', label: '总硬度', unit: 'mg/L' },
  { key: 'calcium', cnKey: '钙离子', label: '钙 Ca²⁺', unit: 'mg/L', derivableFrom: { type: 'hardness', factor: 0.4 } },
  { key: 'magnesium', cnKey: '镁离子', label: '镁 Mg²⁺', unit: 'mg/L', derivableFrom: { type: 'hardness', factor: 0.243 } },
  { key: 'sodium', cnKey: '钠离子', label: '钠 Na⁺', unit: 'mg/L', derivableFrom: { type: 'chloride', factor: 0.5 } },
  { key: 'iron', cnKey: '铁离子', label: '铁 Fe', unit: 'mg/L' },
  { key: 'manganese', cnKey: '锰离子', label: '锰 Mn²⁺', unit: 'mg/L' },
  { key: 'potassium', cnKey: '钾离子', label: '钾 K⁺', unit: 'mg/L' },
  
  // 阴离子
  { key: 'chloride', cnKey: '氯离子', label: '氯离子 Cl⁻', unit: 'mg/L' },
  { key: 'sulfate', cnKey: '硫酸根', label: '硫酸根 SO₄²⁻', unit: 'mg/L' },
  { key: 'bicarbonate', cnKey: '重碳酸根', label: '重碳酸根 HCO₃⁻', unit: 'mg/L' },
  { key: 'silica', cnKey: '二氧化硅', label: '二氧化硅 SiO₂', unit: 'mg/L' },
  { key: 'nitrate', cnKey: '硝酸根', label: '硝酸根 NO₃⁻', unit: 'mg/L' },
  { key: 'fluoride', cnKey: '氟离子', label: '氟离子 F⁻', unit: 'mg/L' },
  
  // 有机/生物
  { key: 'cod', cnKey: 'COD', label: 'COD', unit: 'mg/L' },
  { key: 'toc', cnKey: 'TOC', label: 'TOC', unit: 'mg/L' },
  { key: 'bod', cnKey: 'BOD', label: 'BOD₅', unit: 'mg/L' },
  { key: 'tss', cnKey: '悬浮物', label: '悬浮物 SS', unit: 'mg/L' },
  
  // 营养盐
  { key: 'ammonia', cnKey: '氨氮', label: '氨氮 NH₃-N', unit: 'mg/L' },
  { key: 'tn', cnKey: '总氮', label: '总氮 TN', unit: 'mg/L' },
  { key: 'tp', cnKey: '总磷', label: '总磷 TP', unit: 'mg/L' },
  
  // 微生物
  { key: 'bacteria', cnKey: '细菌', label: '细菌总数', unit: 'CFU/mL' },
];

// 从 simulation 中提取所有离子去除率
// v3.9修复：统一使用 (出水-进水)/进水×100% 公式计算去除率
function extractIonRemovals(
  simulation: any[],
  inletWater: WaterQualityParams
): Array<{ key: string; label: string; unit: string; inlet: number | undefined; outlet: number | undefined; removalRate: string; rate: number }> {
  // 从最后一个膜处理步骤获取最终出水浓度
  const lastStep = simulation.length > 0 ? simulation[simulation.length - 1] : null;
  const finalOutlet = lastStep?.outlet || {};

  return ION_PARAMS.map(({ key, cnKey, label, unit }) => {
    // 1. 获取进水值
    const inletVal = inletWater[key] as number | undefined;

    // 2. 获取出水值（从finalOutlet）
    let outletVal = finalOutlet[key] as number | undefined;
    if (outletVal !== undefined && (isNaN(outletVal) || !isFinite(outletVal))) {
      outletVal = undefined;
    }

    // 3. 统一公式计算去除率：(进水-出水)/进水×100%
    // 确保去除率为正数（物理上不可能有负去除率）
    let rate = 0;
    let removalRate = '-';

    if (inletVal !== undefined && inletVal > 0 && outletVal !== undefined && outletVal >= 0) {
      rate = ((inletVal - outletVal) / inletVal) * 100;
      // 物理上不可能有负去除率，确保为正数
      rate = Math.max(0, rate);
      if (rate > 0.1) { // 只显示>0.1%的去除率
        removalRate = `${rate.toFixed(1)}%`;
      } else if (outletVal < inletVal) {
        // 有处理但去除率很小，显示为已处理
        removalRate = '>0%';
      }
    } else if (inletVal !== undefined && inletVal > 0 && outletVal === undefined) {
      // 没有出水数据，检查是否完全没有处理
      // 如果离子在RO/NF/UF等膜工艺中被完全截留，outlet会是0或undefined
      // 这种情况下检查simulation中是否有相关记录
      const hasMembraneTreatment = simulation.some((step: any) =>
        step.unitType === 'ro' || step.unitType === 'nf' || step.unitType === 'uf' ||
        step.unitType === 'ro_two_stage' || step.unitType === 'ro_three_stage'
      );
      if (hasMembraneTreatment && (key === 'iron' || key === 'manganese' || key === 'bacteria' || key === 'virus' || key === 'turbidity' || key === 'ss' || key === 'tss')) {
        // 膜工艺对这些指标理论上应该接近100%去除
        rate = 99.9;
        removalRate = '99.9%';
      }
    }

    return {
      key,
      label,
      unit,
      inlet: inletVal,
      outlet: outletVal,
      removalRate,
      rate
    };
  }).filter(item => item.inlet !== undefined && item.inlet > 0);
}
import { ProcessUnit } from './process-design';

interface DesignSummaryProps {
  waterQuality: WaterQualityParams;
  designFlow: { feed: number; permeate: number; recovery: number };
  processConfig: {
    pretreatment: string;
    precisionFilter: string;
    ufSystem: string;
    mainProcess: string;
  };
  membraneConfig: {
    roBrand: string;
    roModel: string;
    roCategory: string;
    ufModel: string;
    ufBrand: string;
    stages: number;
    elementsPerVessel: number;
    vesselsStage1: number;
    vesselsStage2: number;
    vesselsStage3: number;
    totalElements: number;
    totalVessels: number;
    recovery: number;
    flux?: number;
  };
  pumpConfig: {
    feedPump: string;
    highPressurePump: string;
    interstagePump: string;
    ufPump: string;
  };
  designResult: any;
  processUnits?: ProcessUnit[];
}

export function DesignSummary({
  waterQuality,
  designFlow,
  processConfig,
  membraneConfig,
  pumpConfig,
  designResult,
  processUnits
}: DesignSummaryProps) {
  // v3.3修复：移除exportFormat状态，目前只支持TXT导出
  // 如需PDF/Excel导出，需集成相应库

  const handleExport = () => {
    // 生成设计报告
    const report = generateReport();
    
    // 创建下载
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `水处理系统设计方案_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // v3.3新增：从processUnits生成设备清单
  const generateEquipmentList = (): Array<{
    category: string;
    name: string;
    model: string;
    spec: string;
    quantity: number;
    unit: string;
    note: string;
  }> => {
    const items: ReturnType<typeof generateEquipmentList> = [];
    
    processUnits?.forEach((unit) => {
      switch (unit.type) {
        case 'filter_media':
          items.push({
            category: '预处理',
            name: '多介质过滤器',
            model: unit.config?.model || unit.params?.model || '-',
            spec: unit.config?.specs || `直径${unit.params?.diameter || 1000}mm`,
            quantity: 1,
            unit: '套',
            note: `处理量 ${designFlow.feed} m³/h`
          });
          break;
        case 'filter_carbon':
          items.push({
            category: '预处理',
            name: '活性炭过滤器',
            model: unit.config?.model || '-',
            spec: unit.config?.specs || `直径${unit.params?.diameter || 1000}mm`,
            quantity: 1,
            unit: '套',
            note: `处理量 ${designFlow.feed} m³/h`
          });
          break;
        case 'filter_softener':
          items.push({
            category: '预处理',
            name: '软化器',
            model: unit.config?.model || '-',
            spec: `直径${unit.params?.diameter || 800}mm`,
            quantity: 1,
            unit: '套',
            note: '钠离子交换'
          });
          break;
        case 'filter_precision':
          items.push({
            category: '预处理',
            name: '精密过滤器',
            model: unit.params?.precision || '5μm',
            spec: `精度 ${unit.params?.precision || '5μm'}`,
            quantity: 2,
            unit: '套',
            note: '一用一备'
          });
          break;
        case 'uf':
          items.push({
            category: '超滤',
            name: '超滤膜组件',
            model: `${unit.config?.brand || ''} ${unit.config?.model || 'UF膜'}`,
            spec: `${unit.params?.count || 0} 支`,
            quantity: unit.params?.count || 0,
            unit: '支',
            note: `${unit.params?.flux || 65} L/m²·h`
          });
          break;
        case 'nf':
          items.push({
            category: '纳滤',
            name: '纳滤膜组件',
            model: `${unit.config?.brand || ''} ${unit.config?.model || 'NF膜'}`,
            spec: `${unit.params?.elements || 0} 支`,
            quantity: unit.params?.elements || 0,
            unit: '支',
            note: `${unit.params?.stages || 1}段式`
          });
          break;
        case 'ro':
          const totalElements = unit.params?.elements || 
            ((unit.params?.vessels || 0) * (unit.params?.elementsPerVessel || 6));
          items.push({
            category: '反渗透',
            name: 'RO膜元件',
            model: `${unit.config?.brand || ''} ${unit.config?.model || 'RO膜'}`,
            spec: `${totalElements} 支`,
            quantity: totalElements,
            unit: '支',
            note: `${unit.params?.stages || 2}段式，每膜壳${unit.params?.elementsPerVessel || 6}支`
          });
          break;
        case 'edi':
          items.push({
            category: '后处理',
            name: 'EDI模块',
            model: `${unit.config?.brand || ''} ${unit.config?.model || 'EDI'}`,
            spec: '电去离子',
            quantity: 1,
            unit: '套',
            note: `处理量 ${unit.params?.flow || designFlow.permeate} m³/h`
          });
          break;
        case 'uv':
          items.push({
            category: '消毒',
            name: '紫外消毒器',
            model: '-',
            spec: `${unit.params?.power || 40}W`,
            quantity: 1,
            unit: '套',
            note: `剂量 ${unit.params?.dose || 40} mJ/cm²`
          });
          break;
        case 'ozone':
          items.push({
            category: '消毒',
            name: '臭氧发生器',
            model: '-',
            spec: `${unit.params?.dose || 3} g/h`,
            quantity: 1,
            unit: '套',
            note: `接触时间 ${unit.params?.contactTime || 8} min`
          });
          break;
        case 'chemical':
          items.push({
            category: '加药',
            name: '加药装置',
            model: unit.params?.chemical || '阻垢剂',
            spec: `${unit.params?.dose || 5} mg/L`,
            quantity: 1,
            unit: '套',
            note: '自动加药'
          });
          break;
      }
    });
    
    // 添加水泵
    if (pumpConfig.feedPump) {
      items.push({
        category: '水泵',
        name: '原水泵',
        model: pumpConfig.feedPump,
        spec: `流量 ${designFlow.feed} m³/h`,
        quantity: 2,
        unit: '台',
        note: '一用一备'
      });
    }
    if (pumpConfig.highPressurePump) {
      items.push({
        category: '水泵',
        name: '高压泵',
        model: pumpConfig.highPressurePump,
        spec: `流量 ${designFlow.feed} m³/h`,
        quantity: 2,
        unit: '台',
        note: '一用一备'
      });
    }
    if (pumpConfig.interstagePump) {
      items.push({
        category: '水泵',
        name: '段间泵',
        model: pumpConfig.interstagePump,
        spec: '分压设计',
        quantity: 1,
        unit: '台',
        note: '提高系统效率'
      });
    }
    if (pumpConfig.ufPump) {
      items.push({
        category: '水泵',
        name: '超滤产水泵',
        model: pumpConfig.ufPump,
        spec: `流量 ${designFlow.feed} m³/h`,
        quantity: 1,
        unit: '台',
        note: '-'
      });
    }
    
    return items;
  };

  const equipmentList = generateEquipmentList();

  const generateReport = () => {
    // 获取模拟结果中的出水水质
    const finalWater = designResult?.finalWater || {};
    const targetWater = designResult?.targetWater || {};
    const meetsTarget = designResult?.meetsTarget ?? false;
    const simulation = designResult?.simulation || [];
    
    return `
水处理系统设计方案
==================
生成时间: ${new Date().toLocaleString()}

一、项目概况
-----------
设计水量: ${designFlow.feed} m³/h (进水) / ${designFlow.permeate} m³/h (产水)
系统回收率: ${designFlow.recovery}%
设计浓缩倍数: ${designFlow.recovery < 100 ? (100 / (100 - designFlow.recovery)).toFixed(2) : '∞'}

二、进出水水质参数
------------------
【进水水质】
- pH值: ${waterQuality.ph || '-'}
- TDS: ${waterQuality.tds || '-'} mg/L
- 电导率: ${waterQuality.conductivity || Math.round((waterQuality.tds || 0) / 0.65)} μS/cm
- 浊度: ${waterQuality.turbidity || '-'} NTU
- COD: ${waterQuality.cod || '-'} mg/L
- 总硬度: ${waterQuality.hardness || '-'} mg/L CaCO₃
- 氯离子: ${waterQuality.chloride || '-'} mg/L
- 硫酸根: ${waterQuality.sulfate || '-'} mg/L
- 铁离子: ${waterQuality.iron || '-'} mg/L
- 二氧化硅: ${waterQuality.silica || '-'} mg/L

${finalWater.tds ? `【模拟出水水质】` : ''}
${finalWater.tds ? `- TDS: ${finalWater.tds} mg/L` : ''}
${finalWater.conductivity ? `- 电导率: ${finalWater.conductivity} μS/cm` : ''}
${finalWater.turbidity ? `- 浊度: ${finalWater.turbidity} NTU` : ''}
${finalWater.ph ? `- pH值: ${finalWater.ph}` : ''}
${finalWater.hardness ? `- 总硬度: ${finalWater.hardness} mg/L CaCO₃` : ''}

${meetsTarget ? '✓ 出水水质满足设计要求' : '⚠ 出水水质未完全达标，建议调整工艺参数'}

三、工艺流程设计
----------------
${processUnits?.map((unit, idx) => `${idx + 1}. ${unit.name || unit.type}${unit.config?.model ? ` (${unit.config.brand ? unit.config.brand + ' ' : ''}${unit.config.model})` : ''}`).join('\n') || '待配置工艺流程'}

工艺说明:
- 预处理: ${processConfig.pretreatment}
- 精密过滤: ${processConfig.precisionFilter}
- 超滤系统: ${processConfig.ufSystem}
- 主处理: ${processConfig.mainProcess}

四、膜系统配置
--------------
${membraneConfig.roModel ? `
【反渗透膜系统】
- 生产厂家: ${membraneConfig.roBrand || '待选择'}
- 膜型号: ${membraneConfig.roModel}
- 膜类型: ${membraneConfig.roCategory?.toUpperCase() || 'BW苦咸水膜'}
- 段式配置: ${membraneConfig.stages}段式
- 每膜壳膜数: ${membraneConfig.elementsPerVessel} 支
- 膜壳数量: 第1段 ${membraneConfig.vesselsStage1} 支${membraneConfig.vesselsStage2 > 0 ? ` / 第2段 ${membraneConfig.vesselsStage2} 支` : ''}${membraneConfig.vesselsStage3 > 0 ? ` / 第3段 ${membraneConfig.vesselsStage3} 支` : ''}
- 总膜元件数: ${membraneConfig.totalElements || (membraneConfig.vesselsStage1 + membraneConfig.vesselsStage2 + membraneConfig.vesselsStage3) * membraneConfig.elementsPerVessel} 支
- 设计通量: ${membraneConfig.flux || '-'} GFD
- 系统回收率: ${membraneConfig.recovery}%
` : '待配置RO膜系统'}

${membraneConfig.ufModel ? `
【超滤膜系统】
- 生产厂家: ${membraneConfig.ufBrand || '待选择'}
- 膜型号: ${membraneConfig.ufModel}
` : ''}

五、各处理单元模拟效果
----------------------
${simulation.length > 0 ? simulation.map((step: any) => `
【${step.step}. ${step.unit}】
  进水: TDS ${step.inlet?.tds || '-'} mg/L | 浊度 ${step.inlet?.turbidity || '-'} NTU | pH ${step.inlet?.ph || '-'}
  出水: TDS ${step.outlet?.tds || '-'} mg/L | 浊度 ${step.outlet?.turbidity || '-'} NTU | pH ${step.outlet?.ph || '-'}
  去除率: ${Object.entries(step.removalRates || {}).map(([k, v]) => `${k}: ${v}`).join(' | ') || '无数据'}
  ${step.formula ? `计算公式: ${step.formula}` : ''}
`).join('\n') : '请运行模拟查看各处理单元效果'}

六、水泵配置
------------
${pumpConfig.feedPump ? `- 原水泵: ${pumpConfig.feedPump}` : '- 原水泵: 待选型'}
${pumpConfig.highPressurePump ? `- 高压泵: ${pumpConfig.highPressurePump}` : '- 高压泵: 待选型'}
${pumpConfig.interstagePump ? `- 段间泵: ${pumpConfig.interstagePump} (分压设计)` : ''}
${pumpConfig.ufPump ? `- 超滤产水泵: ${pumpConfig.ufPump}` : ''}

七、设备清单
------------
${designResult?.equipmentList?.length > 0 ? designResult.equipmentList.map((item: any) => 
  `- ${item.name}${item.model ? ` (${item.model})` : ''}: ${item.quantity}${item.unit}`
).join('\n') : '待生成设备清单'}

八、设计说明
------------
${designResult?.summary || '根据进水水质和设计要求，系统采用上述工艺流程进行处理。具体设备选型和管道设计请参照相关规范。'}

九、注意事项
------------
${designResult?.issues?.length > 0 ? designResult.issues.map((issue: string) => `- ${issue}`).join('\n') : '请注意系统运行维护，定期进行膜清洗和设备检修。'}
${designResult?.recommendations?.length > 0 ? `\n改进建议:\n${designResult.recommendations.map((rec: string) => `- ${rec}`).join('\n')}` : ''}

==================
`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">设计总结</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">完整的水处理系统设计方案</p>
        </div>
        <Button onClick={handleExport} className="gap-2 bg-water hover:bg-water/90">
          <Download className="w-4 h-4" />
          导出设计报告
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Card className="bg-water-muted/40 border-water/10 hover:shadow-sm transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold tracking-tight text-water">{designFlow.feed}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">进水量 (m³/h)</div>
          </CardContent>
        </Card>
        <Card className="bg-success-muted/40 border-success/10 hover:shadow-sm transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold tracking-tight text-success">{designFlow.permeate}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">产水量 (m³/h)</div>
          </CardContent>
        </Card>
        <Card className="bg-data-muted/40 border-data/10 hover:shadow-sm transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold tracking-tight text-data">{designFlow.recovery}%</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">回收率</div>
          </CardContent>
        </Card>
        <Card className="bg-tech-muted/40 border-tech/10 hover:shadow-sm transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold tracking-tight text-tech">
              {(membraneConfig.vesselsStage1 + membraneConfig.vesselsStage2 + membraneConfig.vesselsStage3) * membraneConfig.elementsPerVessel}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">膜元件数</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Summary */}
      <Tabs defaultValue="water" className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-9 rounded-lg">
          <TabsTrigger value="water" className="text-[11px]">水质</TabsTrigger>
          <TabsTrigger value="design" className="text-[11px]">设计</TabsTrigger>
          <TabsTrigger value="process" className="text-[11px]">工艺</TabsTrigger>
          <TabsTrigger value="membrane" className="text-[11px]">膜系统</TabsTrigger>
          <TabsTrigger value="pump" className="text-[11px]">水泵</TabsTrigger>
          <TabsTrigger value="equipment" className="text-[11px]">清单</TabsTrigger>
          <TabsTrigger value="simulation" className="text-[11px]">模拟</TabsTrigger>
        </TabsList>

        <TabsContent value="water" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-[13px] font-medium">
                <FlaskConical className="w-4 h-4 text-water" />
                水质参数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(waterQualityParamConfig).slice(0, 16).map(([key, config]) => {
                  const value = waterQuality[key as keyof WaterQualityParams];
                  return (
                    <div key={key} className="p-3 bg-muted/50 rounded-2xl">
                      <div className="text-xs text-muted-foreground">{config.label}</div>
                      <div className="font-medium mt-0.5">
                        {value !== undefined && value !== null ? `${value} ${config.unit}` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-[13px] font-medium">
                <Settings2 className="w-4 h-4 text-success" />
                设计参数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                  <span className="text-[13px] text-muted-foreground">进水量</span>
                  <span className="text-[13px] font-semibold">{designFlow.feed} m³/h</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                  <span className="text-[13px] text-muted-foreground">产水量</span>
                  <span className="text-[13px] font-semibold">{designFlow.permeate} m³/h</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                  <span className="text-[13px] text-muted-foreground">浓水量</span>
                  <span className="text-[13px] font-semibold">{(designFlow.feed - designFlow.permeate).toFixed(1)} m³/h</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                  <span className="text-[13px] text-muted-foreground">回收率</span>
                  <span className="text-[13px] font-semibold">{designFlow.recovery}%</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-[13px] text-muted-foreground">浓缩倍数</span>
                  <span className="text-[13px] font-semibold">{designFlow.recovery < 100 ? (100 / (100 - designFlow.recovery)).toFixed(2) : '∞'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-[13px] font-medium">
                <Settings2 className="w-4 h-4 text-success" />
                工艺流程设计
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processUnits && processUnits.length > 0 ? (
                <div className="space-y-3">
                  {/* 工艺流程可视化 */}
                  <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/50 rounded-xl">
                    {processUnits.map((unit, idx) => (
                      <div key={unit.id} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
                            unit.type === 'ro' ? 'bg-water/20 text-water border border-water/30' :
                            unit.type === 'uf' ? 'bg-tech/20 text-tech border border-tech/30' :
                            unit.type === 'nf' ? 'bg-data/20 text-data border border-data/30' :
                            unit.type === 'filter_media' ? 'bg-success/20 text-success border border-success/30' :
                            unit.type === 'filter_carbon' ? 'bg-ai/20 text-ai border border-ai/30' :
                            'bg-muted text-muted-foreground border border-border'
                          }`}>
                            <div className="font-semibold">{unit.name || unit.type}</div>
                            {unit.config?.model && (
                              <div className="text-[10px] opacity-70">{unit.config.brand ? `${unit.config.brand} ` : ''}{unit.config.model}</div>
                            )}
                          </div>
                          {idx < processUnits.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 工艺单元详细列表 */}
                  <div className="space-y-2">
                    {processUnits.map((unit, idx) => (
                      <div key={unit.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="w-6 h-6 rounded-full bg-water/20 text-water text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{unit.name || unit.type}</div>
                          <div className="text-xs text-muted-foreground">
                            {unit.config?.brand ? `${unit.config.brand} · ` : ''}{unit.config?.model || '待配置'}
                            {unit.params?.stages ? ` · ${unit.params.stages}段` : ''}
                            {unit.params?.elements ? ` · ${unit.params.elements}支膜` : ''}
                            {unit.params?.count ? ` · ${unit.params.count}支组件` : ''}
                          </div>
                        </div>
                        {unit.type === 'ro' && (
                          <Badge variant="outline" className="text-[10px] bg-water/10 text-water border-water/30">
                            {unit.params?.elements || 0}支
                          </Badge>
                        )}
                        {unit.type === 'uf' && (
                          <Badge variant="outline" className="text-[10px] bg-tech/10 text-tech border-tech/30">
                            {unit.params?.count || 0}支
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* 预处理工艺说明 */}
                  <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                    <div className="font-medium text-foreground mb-1">预处理说明</div>
                    <div>预处理: {processConfig.pretreatment}</div>
                    <div>精密过滤: {processConfig.precisionFilter}</div>
                    <div>超滤系统: {processConfig.ufSystem}</div>
                    <div>主处理: {processConfig.mainProcess}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>请先在工艺流程设计步骤中配置工艺单元</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membrane" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-[13px] font-medium">
                <Droplets className="w-4 h-4 text-data" />
                膜系统配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              {membraneConfig.roModel ? (
                <div className="space-y-3">
                  {/* RO膜品牌和型号 */}
                  <div className="p-3 bg-water-muted/30 rounded-xl border border-water/10">
                    <div className="text-xs text-muted-foreground mb-1">反渗透膜 (RO)</div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-water">{membraneConfig.roBrand || '待选择'}</span>
                      <span className="text-water/70">·</span>
                      <span className="font-semibold">{membraneConfig.roModel}</span>
                      {membraneConfig.roCategory && (
                        <Badge variant="outline" className="text-[10px] ml-2">
                          {membraneConfig.roCategory.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* 段式配置 */}
                  <div className="flex justify-between items-center py-3 border-b border-border/50">
                    <span className="text-muted-foreground">段式配置</span>
                    <span className="font-semibold">{membraneConfig.stages}段式</span>
                  </div>
                  
                  {/* 每支膜壳膜数 */}
                  <div className="flex justify-between items-center py-3 border-b border-border/50">
                    <span className="text-muted-foreground">每支膜壳膜数</span>
                    <span className="font-semibold">{membraneConfig.elementsPerVessel}支</span>
                  </div>
                  
                  {/* 各段膜壳数量 */}
                  <div className="flex gap-2 py-2">
                    <div className="flex-1 p-3 bg-muted/50 rounded-lg text-center">
                      <div className="text-[10px] text-muted-foreground">第1段膜壳</div>
                      <div className="text-lg font-bold text-water">{membraneConfig.vesselsStage1}</div>
                      <div className="text-[10px] text-muted-foreground">支</div>
                    </div>
                    {membraneConfig.stages >= 2 && (
                      <div className="flex-1 p-3 bg-muted/50 rounded-lg text-center">
                        <div className="text-[10px] text-muted-foreground">第2段膜壳</div>
                        <div className="text-lg font-bold text-water">{membraneConfig.vesselsStage2}</div>
                        <div className="text-[10px] text-muted-foreground">支</div>
                      </div>
                    )}
                    {membraneConfig.stages >= 3 && (
                      <div className="flex-1 p-3 bg-muted/50 rounded-lg text-center">
                        <div className="text-[10px] text-muted-foreground">第3段膜壳</div>
                        <div className="text-lg font-bold text-water">{membraneConfig.vesselsStage3}</div>
                        <div className="text-[10px] text-muted-foreground">支</div>
                      </div>
                    )}
                  </div>
                  
                  {/* 总膜元件数 */}
                  <div className="flex justify-between items-center py-3 border-t-2 border-water/20 bg-water-muted/20 -mx-3 px-3 rounded-lg">
                    <span className="text-water font-medium">总膜元件数</span>
                    <span className="text-xl font-bold text-water">
                      {membraneConfig.totalElements || (membraneConfig.vesselsStage1 + membraneConfig.vesselsStage2 + membraneConfig.vesselsStage3) * membraneConfig.elementsPerVessel}支
                    </span>
                  </div>
                  
                  {/* 设计通量 */}
                  {membraneConfig.flux && membraneConfig.flux > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-border/50">
                      <span className="text-muted-foreground">设计通量</span>
                      <span className="font-semibold">{membraneConfig.flux} GFD</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Droplets className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>请在工艺流程中配置RO膜系统</p>
                </div>
              )}
              
              {/* 超滤膜配置 */}
              {membraneConfig.ufModel && (
                <div className="mt-4 p-3 bg-tech-muted/30 rounded-xl border border-tech/10">
                  <div className="text-xs text-muted-foreground mb-1">超滤膜 (UF)</div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-tech">{membraneConfig.ufBrand || '待选择'}</span>
                    <span className="text-tech/70">·</span>
                    <span className="font-semibold">{membraneConfig.ufModel}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pump" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-[13px] font-medium">
                <Gauge className="w-4 h-4 text-flow" />
                水泵配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-5 bg-muted/50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">原水泵</div>
                      <div className="text-sm text-muted-foreground">流量 {designFlow.feed} m³/h</div>
                    </div>
                    <Badge variant="outline" className="text-water border-water/30">
                      {pumpConfig.feedPump || '未选择'}
                    </Badge>
                  </div>
                </div>
                
                {processConfig.mainProcess.includes('ro') && (
                  <div className="p-5 bg-data-muted rounded-2xl border border-data/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">RO高压泵</div>
                        <div className="text-sm text-muted-foreground">流量 {designFlow.feed} m³/h</div>
                      </div>
                      <Badge variant="outline" className="text-data border-data/30">
                        {pumpConfig.highPressurePump || '未选择'}
                      </Badge>
                    </div>
                  </div>
                )}

                {pumpConfig.interstagePump && (
                  <div className="p-5 bg-tech-muted rounded-2xl border border-tech/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">段间泵</div>
                        <div className="text-sm text-muted-foreground">分压设计 - 提高系统效率</div>
                      </div>
                      <Badge variant="outline" className="text-tech border-tech/30">
                        {pumpConfig.interstagePump}
                      </Badge>
                    </div>
                  </div>
                )}

                {pumpConfig.ufPump && (
                  <div className="p-5 bg-flow-muted rounded-2xl border border-flow/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">超滤产水泵</div>
                        <div className="text-sm text-muted-foreground">流量 {designFlow.feed} m³/h</div>
                      </div>
                      <Badge variant="outline" className="text-flow border-flow/30">
                        {pumpConfig.ufPump}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-[13px] font-medium">
                <Table className="w-4 h-4 text-ai" />
                设备清单
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equipmentList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-xs font-medium">类别</th>
                        <th className="text-left py-3 px-4 text-xs font-medium">名称</th>
                        <th className="text-left py-3 px-4 text-xs font-medium">规格型号</th>
                        <th className="text-center py-3 px-4 text-xs font-medium">数量</th>
                        <th className="text-left py-3 px-4 text-xs font-medium">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipmentList.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                          </td>
                          <td className="py-3 px-4 font-medium text-sm">{item.name}</td>
                          <td className="py-3 px-4 text-sm">{item.spec}</td>
                          <td className="py-3 px-4 text-center text-sm">{item.quantity} {item.unit}</td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">{item.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>请先在工艺流程中配置处理单元</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-[13px] font-medium">
                <FlaskConical className="w-4 h-4 text-water" />
                模拟结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              {designResult?.simulation && designResult.simulation.length > 0 ? (
                <div className="space-y-4">
                  {/* 达标状态 */}
                  <div className={`p-4 rounded-xl border ${
                    designResult.meetsTarget 
                      ? 'bg-success-muted/30 border-success/30' 
                      : 'bg-warning-muted/30 border-warning/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      {designResult.meetsTarget ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-warning" />
                      )}
                      <span className={`font-medium ${
                        designResult.meetsTarget ? 'text-success' : 'text-warning'
                      }`}>
                        {designResult.meetsTarget ? '出水水质满足设计要求' : '出水水质未完全达标'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 各单元处理效果 */}
                  <div className="space-y-3">
                    {designResult.simulation.map((step: any) => (
                      <div key={step.step} className="p-4 bg-muted/50 rounded-xl border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px]">Step {step.step}</Badge>
                          <span className="font-medium text-sm">{step.unit}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-muted-foreground">进水TDS</div>
                            <div className="font-semibold">{step.inlet?.tds || '-'} mg/L</div>
                          </div>
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-muted-foreground">出水TDS</div>
                            <div className="font-semibold text-water">{step.outlet?.tds || '-'} mg/L</div>
                          </div>
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-muted-foreground">去除率</div>
                            <div className="font-semibold text-success">
                              {step.removalRates?.['TDS'] || '-'}
                            </div>
                          </div>
                        </div>
                        {step.formula && (
                          <div className="mt-2 text-[10px] text-muted-foreground/70 bg-background/30 p-2 rounded">
                            {step.formula}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* 最终出水水质 - 展示所有可用参数 */}
                  {designResult.finalWater && (
                    <div className="p-4 bg-water-muted/30 rounded-xl border border-water/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Droplets className="w-4 h-4 text-water" />
                        <span className="text-sm font-semibold text-foreground">最终出水水质</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {designResult.finalWater.tds !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">TDS</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.tds} mg/L</div>
                          </div>
                        )}
                        {designResult.finalWater.conductivity !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">电导率</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.conductivity} μS/cm</div>
                          </div>
                        )}
                        {designResult.finalWater.turbidity !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">浊度</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.turbidity} NTU</div>
                          </div>
                        )}
                        {designResult.finalWater.ph !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">pH</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.ph}</div>
                          </div>
                        )}
                        {designResult.finalWater.hardness !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">总硬度</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.hardness} mg/L</div>
                          </div>
                        )}
                        {designResult.finalWater.chloride !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">氯离子</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.chloride} mg/L</div>
                          </div>
                        )}
                        {designResult.finalWater.sulfate !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">硫酸根</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.sulfate} mg/L</div>
                          </div>
                        )}
                        {designResult.finalWater.cod !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">COD</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.cod} mg/L</div>
                          </div>
                        )}
                        {designResult.finalWater.iron !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">铁</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.iron} mg/L</div>
                          </div>
                        )}
                        {designResult.finalWater.silica !== undefined && (
                          <div className="p-2 bg-background/50 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">二氧化硅</div>
                            <div className="text-base font-bold text-water">{designResult.finalWater.silica} mg/L</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 各离子去除率详细表格 */}
                  {designResult?.simulation && designResult.simulation.length > 0 && (
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Droplets className="w-4 h-4 text-water" />
                        <span className="text-sm font-semibold text-foreground">各离子去除明细</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/50">
                              <th className="text-left py-2 px-2 text-[10px] font-medium text-muted-foreground">参数</th>
                              <th className="text-right py-2 px-2 text-[10px] font-medium text-muted-foreground">进水</th>
                              <th className="text-right py-2 px-2 text-[10px] font-medium text-muted-foreground">出水</th>
                              <th className="text-center py-2 px-2 text-[10px] font-medium text-muted-foreground">去除率</th>
                              <th className="text-center py-2 px-2 text-[10px] font-medium text-muted-foreground w-32">效果</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const ionData = extractIonRemovals(designResult.simulation, waterQuality);
                              return ionData.map((item, idx) => {
                                const rateNum = typeof item.rate === 'number' ? item.rate :
                                  (item.inlet && item.outlet && item.inlet > 0
                                    ? ((item.inlet - item.outlet) / item.inlet) * 100
                                    : 0);
                                const isGood = rateNum >= 90;
                                const isMedium = rateNum >= 50 && rateNum < 90;
                                const barColor = isGood ? 'bg-success' : isMedium ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
                                const textColor = isGood ? 'text-success' : isMedium ? 'text-[#F59E0B]' : 'text-[#EF4444]';
                                return (
                                  <tr key={idx} className="border-b border-border/30 hover:bg-muted/50 transition-colors">
                                    <td className="py-2 px-2">
                                      <span className="text-xs font-medium">{item.label}</span>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <span className="text-xs text-muted-foreground">
                                        {item.inlet !== undefined ? `${item.inlet} ${item.unit}` : '-'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <span className="text-xs font-semibold text-water">
                                        {item.outlet !== undefined ? `${item.outlet} ${item.unit}` : '-'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <span className={`text-xs font-semibold ${textColor}`}>
                                        {item.removalRate !== '-' ? item.removalRate : `${rateNum.toFixed(1)}%`}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                          style={{ width: `${Math.min(100, rateNum)}%` }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-1.5 bg-success rounded-full" />
                          <span className="text-[10px] text-muted-foreground">≥90% 优秀</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-1.5 bg-[#F59E0B] rounded-full" />
                          <span className="text-[10px] text-muted-foreground">50-90% 良好</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-1.5 bg-[#EF4444] rounded-full" />
                          <span className="text-[10px] text-muted-foreground">&lt;50% 需关注</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 问题与建议 */}
                  {(designResult.issues?.length > 0 || designResult.recommendations?.length > 0) && (
                    <div className="space-y-2">
                      {designResult.issues?.length > 0 && (
                        <div className="p-3 bg-warning-muted/30 rounded-lg border border-warning/20">
                          <div className="text-xs font-medium text-warning mb-1">需要注意的问题</div>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {designResult.issues.map((issue: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-warning">•</span>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {designResult.recommendations?.length > 0 && (
                        <div className="p-3 bg-success-muted/30 rounded-lg border border-success/20">
                          <div className="text-xs font-medium text-success mb-1">改进建议</div>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {designResult.recommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-success">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>请先运行过滤效果模拟查看结果</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
