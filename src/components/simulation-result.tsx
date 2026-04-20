'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Beaker, 
  Loader2,
  TrendingDown,
  Target,
  AlertTriangle,
  Info,
  ShieldAlert,
  FlaskConical,
  Zap,
  Gauge,
  Activity
} from 'lucide-react';
import { calculateScalingPotential } from '@/lib/utils/filter-simulation';
import { calculateSystemEnergy, SystemEnergyResult } from '@/lib/utils/energy-calculation';
import { ProcessUnit } from '@/components/process-design';
import { PumpConfig, DesignFlow, ROStageResult } from '@/types';
import { WaterQualityParams } from '@/lib/constants/water-quality';

// 更新接口以匹配新的API响应结构
interface SimulationStep {
  step: number;
  unit: string;
  unitType: string;
  inlet: Record<string, any>;
  outlet: Record<string, any>;
  removalRates: Record<string, string>;
  notes: string;
  formula?: string;
  stageResults?: ROStageResult[];  // 多段RO的逐段详细结果
}

interface SimulationResult {
  success: boolean;
  simulation: SimulationStep[];
  finalWater: Record<string, any>;
  statistics: {
    totalTDSRemoval: string;
    totalTurbidityRemoval: string;
    totalCODRemoval: string;
    totalHardnessRemoval: string;
    inletTDS: number;
    outletTDS: number;
    processSteps: number;
  };
  targetAssessment: {
    meetsTarget: boolean;
    target: Record<string, number>;
    achievement: Record<string, {
      target: number;
      actual: number;
      achieved: boolean;
    }>;
  };
  issues: string[];
  recommendations: string[];
  foulingRisk?: {
    overallRisk: 'low' | 'medium' | 'high';
    factors: Array<{ factor: string; level: string; description: string }>;
    recommendations: string[];
  };
  concentrateWater?: Record<string, any>;
}

interface SimulationResultProps {
  result: any;
  isSimulating: boolean;
  onSimulate: () => void;
  inletWaterQuality: Record<string, any>;
  outletTargetQuality: Record<string, any>;
  /** 选定的水泵配置 */
  pumpConfig?: PumpConfig;
  /** 设计流量 */
  designFlow?: DesignFlow;
  /** 进水水质完整参数（用于结垢分析） */
  waterQuality?: WaterQualityParams;
  /** 工艺单元列表（用于判断是否包含UF/RO/NF） */
  processUnits?: ProcessUnit[];
}

export function SimulationResultView({
  result,
  isSimulating,
  onSimulate,
  inletWaterQuality,
  outletTargetQuality,
  pumpConfig,
  designFlow,
  waterQuality,
  processUnits
}: SimulationResultProps) {
  
  // === 高级分析计算 ===
  const hasRO = processUnits?.some(u => u.type === 'ro') ?? false;
  const hasNF = processUnits?.some(u => u.type === 'nf') ?? false;
  const hasUF = processUnits?.some(u => u.type === 'uf') ?? false;
  const roStages = processUnits?.find(u => u.type === 'ro')?.params?.stages ?? 2;

  // 结垢分析 — 基于模拟结果中的浓水水质
  const scalingResult = useMemo(() => {
    if (!result?.concentrateWater || !waterQuality) return null;
    try {
      return calculateScalingPotential(
        waterQuality as any,
        waterQuality.temperature || 25,
        (designFlow?.recovery || 75) / 100
      );
    } catch {
      return null;
    }
  }, [result, waterQuality, designFlow]);

  // 能耗计算 — 基于选定泵型号的真实数据
  const energyResult = useMemo((): SystemEnergyResult | null => {
    if (!pumpConfig || !designFlow || !waterQuality) return null;
    // 至少选择了一种泵
    const hasAnyPump = !!(
      pumpConfig.feedPump || pumpConfig.highPressurePump ||
      pumpConfig.interstagePump || pumpConfig.ufPump
    );
    if (!hasAnyPump) return null;
    try {
      return calculateSystemEnergy({
        waterQuality,
        designFlow,
        pumpConfig,
        hasUF,
        hasRO,
        hasNF,
        roStages
      });
    } catch {
      return null;
    }
  }, [pumpConfig, designFlow, waterQuality, hasUF, hasRO, hasNF, roStages]);

  const hasAdvancedAnalysis = scalingResult !== null || energyResult !== null;
  
  const getQualityColor = (value: number, target: number, type: 'tds' | 'turbidity' | 'cod') => {
    if (value <= target) return 'text-success';
    if (value <= target * 1.5) return 'text-data';
    return 'text-destructive';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case '低': return 'bg-success-muted text-success';
      case '中': return 'bg-data-muted text-data';
      case '高': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // 安全访问结果数据
  const meetsTarget = result?.targetAssessment?.meetsTarget ?? false;
  const finalWater = result?.finalWater ?? {};
  const statistics = result?.statistics;
  const simulation = result?.simulation ?? [];
  const issues = result?.issues ?? [];
  const recommendations = result?.recommendations ?? [];
  const foulingRisk = result?.foulingRisk;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">过滤效果模拟</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">基于水处理工程文献公式计算处理效果</p>
        </div>
        <Button
          onClick={onSimulate}
          disabled={isSimulating}
          className="bg-water text-water-foreground hover:bg-water/90"
        >
          {isSimulating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              计算中...
            </>
          ) : (
            <>
              <FlaskConical className="w-4 h-4 mr-2" />
              开始模拟
            </>
          )}
        </Button>
      </div>

      {!result && !isSimulating && (
        <Card className="bg-muted/30 border-dashed border-2 border-border">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/50 flex items-center justify-center">
              <FlaskConical className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">尚未进行模拟</h3>
            <p className="text-muted-foreground/70 text-sm max-w-sm mx-auto">配置好工艺流程后，点击"开始模拟"按钮查看各单元处理效果</p>
          </CardContent>
        </Card>
      )}

      {isSimulating && (
        <Card className="bg-ai-muted/30 border-ai/20">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-ai/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-ai animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-ai mb-2">基于文献公式计算中...</h3>
            <p className="text-ai/70 text-sm">根据水处理工程文献公式计算各单元处理效率</p>
          </CardContent>
        </Card>
      )}

      {result && !isSimulating && (
        <div className="space-y-5">
          {/* 结果概览 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className={`${meetsTarget ? 'bg-success-muted/40 border-success/10' : 'bg-destructive/5 border-destructive/15'} hover:shadow-sm transition-shadow`}>
              <CardContent className="p-4 text-center">
                {meetsTarget ? (
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                ) : (
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                )}
                <div className={`text-base font-bold tracking-tight ${meetsTarget ? 'text-success' : 'text-destructive'}`}>
                  {meetsTarget ? '达标' : '未达标'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">出水水质</div>
              </CardContent>
            </Card>

            <Card className="bg-water-muted/40 border-water/10 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="w-9 h-9 mx-auto mb-1.5 rounded-lg bg-water/10 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-water" />
                </div>
                <div className="text-xl font-bold tracking-tight text-water">
                  {statistics?.totalTDSRemoval ?? '-'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">总TDS去除率</div>
              </CardContent>
            </Card>

            <Card className="bg-tech-muted/40 border-tech/10 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="w-9 h-9 mx-auto mb-1.5 rounded-lg bg-tech/10 flex items-center justify-center">
                  <Beaker className="w-4 h-4 text-tech" />
                </div>
                <div className="text-xl font-bold tracking-tight text-tech">
                  {statistics?.outletTDS?.toFixed(1) ?? '-'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">出水TDS (mg/L)</div>
              </CardContent>
            </Card>

            <Card className="bg-flow-muted/40 border-flow/10 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="w-9 h-9 mx-auto mb-1.5 rounded-lg bg-flow/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-flow" />
                </div>
                <div className="text-xl font-bold tracking-tight text-flow">
                  {statistics?.processSteps ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">处理步骤</div>
              </CardContent>
            </Card>
          </div>

          {/* 不达标指标提示 */}
          {!meetsTarget && result?.targetAssessment?.achievement && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  未达标指标
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  以下水质指标未达到目标要求，请优化工艺流程
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(result.targetAssessment.achievement).map(([key, value]: [string, any]) => (
                    !value.achieved && (
                      <div key={key} className="bg-card rounded-lg p-4 border border-destructive/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">
                            {key === 'tds' ? 'TDS' : 
                             key === 'turbidity' ? '浊度' : 
                             key === 'cod' ? 'COD' : 
                             key === 'hardness' ? '硬度' : key}
                          </span>
                          <Badge variant="destructive" className="text-xs">未达标</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">目标值:</span>
                            <span className="text-success font-medium">
                              ≤ {value.target} {key === 'turbidity' ? 'NTU' : 'mg/L'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">实际值:</span>
                            <span className="text-destructive font-bold">
                              {key === 'turbidity' 
                                ? (value.actual < 0.1 ? '<0.1' : value.actual?.toFixed(2))
                                : value.actual?.toFixed(1)
                              } {key === 'turbidity' ? 'NTU' : 'mg/L'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">超标:</span>
                            <span className="text-destructive">
                              {((value.actual - value.target) / value.target * 100) > 0 ? '+' : ''}
                              {((value.actual - value.target) / value.target * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
                
                {/* 快速建议 */}
                <div className="mt-4 p-3 bg-card rounded-lg border border-destructive/20">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-water mt-0.5 shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">优化建议：</span>
                      {result.targetAssessment.achievement.tds && !result.targetAssessment.achievement.tds.achieved && (
                        <span> 增加RO膜数量或提高系统回收率；</span>
                      )}
                      {result.targetAssessment.achievement.turbidity && !result.targetAssessment.achievement.turbidity.achieved && (
                        <span> 加强预处理（UF/精密过滤）；</span>
                      )}
                      {result.targetAssessment.achievement.cod && !result.targetAssessment.achievement.cod.achieved && (
                        <span> 增加活性炭过滤或膜工艺；</span>
                      )}
                      <span> 或考虑增加二级RO系统。</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 处理流程模拟 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[13px] font-medium">各单元处理效果</CardTitle>
              <CardDescription>逐步展示每个工艺单元的水质变化（基于水处理工程文献公式）</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {simulation.map((step: any, index: number) => (
                  <div key={index} className="relative border rounded-2xl overflow-hidden">
                    {/* 左侧色带 */}
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-water" />
                    <div className="p-5 pl-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs rounded-lg">步骤 {step.step}</Badge>
                          <span className="font-semibold text-sm">{step.unit}</span>
                          <Badge variant="secondary" className="text-xs rounded-lg">{step.unitType}</Badge>
                        </div>
                        {step.removalRates && Object.keys(step.removalRates).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(step.removalRates).map(([key, value]) => (
                              <Badge key={key} variant="secondary" className="text-xs rounded-lg bg-success-muted text-success border-success/20">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">TDS (mg/L)</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-water">{step.inlet.tds?.toFixed(1) || '-'}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                          <span className="font-medium text-success">{step.outlet.tds?.toFixed(1) || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">浊度 (NTU)</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-water">{(step.inlet.turbidity ?? 0) < 0.1 ? '<0.1' : step.inlet.turbidity?.toFixed(2) || '-'}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                          <span className="font-medium text-success">{step.outlet.turbidity < 0.1 ? '<0.1' : step.outlet.turbidity?.toFixed(2) || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">pH</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-water">{step.inlet.ph?.toFixed(1) || '-'}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                          <span className="font-medium text-success">{step.outlet.ph?.toFixed(1) || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">COD (mg/L)</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-water">{step.inlet.cod?.toFixed(1) || '-'}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                          <span className="font-medium text-success">{step.outlet.cod?.toFixed(1) || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      {step.notes && (
                        <div className="text-muted-foreground bg-muted/50 rounded px-3 py-1 flex-1">
                          {step.notes}
                        </div>
                      )}
                      {step.formula && (
                        <div className="text-water bg-water-muted rounded px-3 py-1">
                          公式: {step.formula}
                        </div>
                      )}
                    </div>

                    {/* 多段RO逐段详情 */}
                    {step.stageResults && step.stageResults.length > 1 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-water">
                          <Activity className="w-3.5 h-3.5" />
                          多段逐段分析
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {step.stageResults.map((stage: ROStageResult) => (
                            <div key={stage.stageIndex} className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-water">
                                  第{stage.stageIndex}段
                                </span>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  回收率 {(stage.stageRecovery * 100).toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">进水 TDS</span>
                                  <span className="font-medium">{stage.feedTDS.toFixed(0)} mg/L</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">产水 TDS</span>
                                  <span className="font-medium text-success">{stage.permeateTDS.toFixed(1)} mg/L</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">浓水 TDS</span>
                                  <span className="font-medium text-destructive">{stage.concentrateTDS.toFixed(0)} mg/L</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">脱盐率</span>
                                  <span className="font-medium">{stage.rejection.toFixed(1)}%</span>
                                </div>
                                <div className="border-t border-border/50 pt-1 mt-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">平均通量</span>
                                    <span className="font-medium">{stage.avgFlux.toFixed(1)} L/m²h</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">进水压力</span>
                                    <span className="font-medium">{stage.feedPressure.toFixed(1)} bar</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">段压力降</span>
                                    <span className="font-medium">{stage.pressureDrop.toFixed(1)} bar</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">进水流量</span>
                                    <span className="font-medium">{stage.feedFlow.toFixed(1)} m³/h</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">产水流量</span>
                                    <span className="font-medium text-success">{stage.permeateFlow.toFixed(1)} m³/h</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最终结果和膜污染风险 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-water" />
                  最终出水水质
                  {meetsTarget && (
                    <Badge className="bg-success-muted text-success ml-2">
                      <CheckCircle2 className="w-3 h-3 mr-1" />全部达标
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* TDS */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">TDS</span>
                      {result?.targetAssessment?.achievement?.tds && (
                        result.targetAssessment.achievement.tds.achieved ? 
                          <CheckCircle2 className="w-4 h-4 text-success" /> :
                          <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${result?.targetAssessment?.achievement?.tds?.achieved ? 'text-success' : 'text-destructive'}`}>
                        {finalWater.tds?.toFixed(1) ?? '-'} mg/L
                      </span>
                      <span className="text-xs text-muted-foreground/60 ml-2">
                        目标≤{result?.targetAssessment?.achievement?.tds?.target || 50}
                      </span>
                    </div>
                  </div>
                  
                  {/* 浊度 */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">浊度</span>
                      {result?.targetAssessment?.achievement?.turbidity && (
                        result.targetAssessment.achievement.turbidity.achieved ? 
                          <CheckCircle2 className="w-4 h-4 text-success" /> :
                          <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${result?.targetAssessment?.achievement?.turbidity?.achieved ? 'text-success' : 'text-destructive'}`}>
                        {finalWater.turbidity < 0.1 ? '<0.1' : finalWater.turbidity?.toFixed(2) ?? '-'} NTU
                      </span>
                      <span className="text-xs text-muted-foreground/60 ml-2">
                        目标≤{result?.targetAssessment?.achievement?.turbidity?.target || 0.5}
                      </span>
                    </div>
                  </div>
                  
                  {/* pH */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">pH</span>
                    <span className="font-semibold text-foreground">
                      {finalWater.ph?.toFixed(1) ?? '-'}
                    </span>
                  </div>
                  
                  {/* COD */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">COD</span>
                      {result?.targetAssessment?.achievement?.cod && (
                        result.targetAssessment.achievement.cod.achieved ? 
                          <CheckCircle2 className="w-4 h-4 text-success" /> :
                          <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${result?.targetAssessment?.achievement?.cod?.achieved ? 'text-success' : 'text-destructive'}`}>
                        {finalWater.cod?.toFixed(1) ?? '-'} mg/L
                      </span>
                      <span className="text-xs text-muted-foreground/60 ml-2">
                        目标≤{result?.targetAssessment?.achievement?.cod?.target || 10}
                      </span>
                    </div>
                  </div>
                  
                  {/* 硬度 */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">硬度</span>
                    <span className="font-semibold text-foreground">
                      {finalWater.hardness?.toFixed(1) ?? '-'} mg/L
                    </span>
                  </div>
                  
                  {/* 电导率 */}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">电导率</span>
                    <span className="font-semibold text-foreground">
                      {finalWater.conductivity?.toFixed(0) ?? '-'} μS/cm
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 膜污染风险 */}
            {foulingRisk && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-warning" />
                    膜污染风险评估
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Badge className={
                      foulingRisk.overallRisk === 'high' ? 'bg-destructive/10 text-destructive' :
                      foulingRisk.overallRisk === 'medium' ? 'bg-data-muted text-data' :
                      'bg-success-muted text-success'
                    }>
                      整体风险: {foulingRisk.overallRisk === 'high' ? '高' : foulingRisk.overallRisk === 'medium' ? '中' : '低'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {foulingRisk.factors.map((factor: { factor: string; level: string; description: string }, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b last:border-0">
                        <span className="text-muted-foreground text-sm">{factor.factor}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{factor.description}</span>
                          <Badge className={getRiskColor(factor.level)} variant="outline">
                            {factor.level}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 问题和建议 */}
          {(issues.length > 0 || recommendations.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issues.length > 0 && (
                <Card className="border-data/30 bg-data-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-medium flex items-center gap-1.5 text-data">
                      <AlertTriangle className="w-4 h-4" />
                      发现问题
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {issues.map((issue: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-data">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {recommendations.length > 0 && (
                <Card className="border-water/30 bg-water-muted">
                  <CardHeader className="pb-2">
                  <CardTitle className="text-[13px] font-medium flex items-center gap-1.5 text-water">
                    <Info className="w-4 h-4" />
                    优化建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-water">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 浓水水质 */}
          {result.concentrateWater && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
                  <Beaker className="w-4 h-4 text-tech" />
                  浓水水质（排放参考）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">TDS</div>
                    <div className="font-medium">{result.concentrateWater.tds?.toFixed(0) ?? '-'} mg/L</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">硬度</div>
                    <div className="font-medium">{result.concentrateWater.hardness?.toFixed(0) ?? '-'} mg/L</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">COD</div>
                    <div className="font-medium">{result.concentrateWater.cod?.toFixed(1) ?? '-'} mg/L</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">SiO₂</div>
                    <div className="font-medium">{result.concentrateWater.silica?.toFixed(1) ?? '-'} mg/L</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ 高级分析面板 ═══ */}
          {hasAdvancedAnalysis && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pt-1">
                <Activity className="w-4 h-4 text-ai" />
                <h3 className="text-sm font-semibold tracking-tight">高级分析</h3>
                <Badge variant="outline" className="text-[10px] bg-ai-muted text-ai border-ai/20">
                  自动计算
                </Badge>
              </div>

              {/* 结垢风险评估 */}
              {scalingResult && (
                <Card className="border-warning/20">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-warning" />
                      结垢风险评估
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">基于反应输运地球化学模型</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="space-y-2.5">
                      {/* 风险等级 */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                        scalingResult.scalingRisk === 'severe' ? 'bg-destructive/10 text-destructive' :
                        scalingResult.scalingRisk === 'high' ? 'bg-warning/10 text-warning' :
                        scalingResult.scalingRisk === 'medium' ? 'bg-chart-4/10 text-chart-4' :
                        'bg-success/10 text-success'
                      }`}>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        结垢风险：
                        {scalingResult.scalingRisk === 'severe' ? '严重' :
                         scalingResult.scalingRisk === 'high' ? '较高' :
                         scalingResult.scalingRisk === 'medium' ? '中等' : '较低'}
                      </div>

                      {/* 饱和指数网格 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { label: 'CaCO₃ LSI', value: scalingResult.calciteLSI, desc: '碳酸钙朗格利尔指数', type: 'lsi' as const },
                          { label: 'CaSO₄ SI', value: scalingResult.gypsumSI, desc: '硫酸钙饱和指数', type: 'si' as const },
                          { label: 'SiO₂ SI', value: scalingResult.silicaSI, desc: '二氧化硅饱和指数', type: 'si' as const },
                          { label: 'BaSO₄ SI', value: scalingResult.bariumSI, desc: '硫酸钡饱和指数', type: 'si' as const },
                          { label: 'SrSO₄ SI', value: scalingResult.strontiumSI, desc: '硫酸锶饱和指数', type: 'si' as const },
                          { label: 'Ryznar', value: scalingResult.ryznar, desc: '赖兹纳稳定性指数', type: 'ryznar' as const },
                        ].map(item => (
                          <div key={item.label} className="bg-muted/40 rounded-lg p-2.5">
                            <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className={`text-sm font-mono font-bold ${
                                item.type === 'lsi'
                                  ? item.value > 0 ? 'text-warning' : 'text-success'
                                  : item.type === 'si'
                                    ? item.value > 1 ? 'text-warning' : 'text-success'
                                    : item.value < 6 ? 'text-warning' : item.value > 7 ? 'text-success' : 'text-chart-4'
                              }`}>
                                {item.value.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 建议措施 */}
                      {scalingResult.recommendations.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">建议措施</div>
                          {scalingResult.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                              <span className="text-warning mt-0.5">•</span>
                              {rec}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 系统能耗分析 — 始终显示面板，无数据时显示空状态 */}
              <Card className="border-tech/20">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-tech" />
                    系统能耗分析
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      {energyResult ? '基于选定泵型号计算' : '需先完成水泵选型'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {energyResult ? (
                    <div className="space-y-3">
                      {/* 核心指标 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        <div className="bg-tech-muted/40 rounded-lg p-3 text-center">
                          <div className="text-[10px] text-muted-foreground mb-1">总装机功率</div>
                          <div className="text-lg font-mono font-bold text-tech">
                            {energyResult.totalInstalledPower}
                          </div>
                          <div className="text-[10px] text-muted-foreground">kW</div>
                        </div>
                        <div className="bg-tech-muted/40 rounded-lg p-3 text-center">
                          <div className="text-[10px] text-muted-foreground mb-1">运行总功率</div>
                          <div className="text-lg font-mono font-bold text-tech">
                            {energyResult.totalOperatingPower}
                          </div>
                          <div className="text-[10px] text-muted-foreground">kW（含辅助）</div>
                        </div>
                        <div className="bg-water-muted/40 rounded-lg p-3 text-center col-span-2 md:col-span-1">
                          <div className="text-[10px] text-muted-foreground mb-1">吨水运行功耗</div>
                          <div className="text-lg font-mono font-bold text-water">
                            {energyResult.specificEnergyConsumption}
                          </div>
                          <div className="text-[10px] text-muted-foreground">kWh/m³</div>
                        </div>
                      </div>

                      {/* 系统参数 */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex justify-between px-2 py-1.5 bg-muted/40 rounded">
                          <span className="text-muted-foreground">操作压力</span>
                          <span className="font-medium">{energyResult.operatingPressure} bar</span>
                        </div>
                        <div className="flex justify-between px-2 py-1.5 bg-muted/40 rounded">
                          <span className="text-muted-foreground">渗透压</span>
                          <span className="font-medium">{energyResult.feedOsmoticPressure} bar</span>
                        </div>
                        <div className="flex justify-between px-2 py-1.5 bg-muted/40 rounded">
                          <span className="text-muted-foreground">回收率</span>
                          <span className="font-medium">{energyResult.recovery}%</span>
                        </div>
                      </div>

                      {/* 各泵详情 */}
                      {energyResult.pumps.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">泵组配置详情</div>
                          <div className="space-y-1.5">
                            {energyResult.pumps.map((pump, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-xs">
                                <div className="flex items-center gap-2">
                                  <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{pump.role}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {pump.model} | 流量 {pump.flowPerPump} m³/h | 扬程 {pump.head} m
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono font-bold text-tech">{pump.totalPower} kW</div>
                                  {pump.count > 1 && (
                                    <div className="text-[10px] text-muted-foreground">{pump.motorPower}kW × {pump.count}台</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* v3.4 空状态提示 */
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-tech-muted/30 flex items-center justify-center mb-3">
                        <Gauge className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">暂无能耗数据</div>
                      <div className="text-xs text-muted-foreground/70 max-w-xs">
                        请先在「水泵选型」步骤中选择水泵型号，然后返回此页面查看系统能耗分析
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
