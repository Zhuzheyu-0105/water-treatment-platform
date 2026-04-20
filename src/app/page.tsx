'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FlaskConical, 
  Settings2, 
  Gauge, 
  Beaker,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { WaterQualityInput } from '@/components/water-quality-input';
import { ProcessDesign, ProcessUnit } from '@/components/process-design';
import { PumpSelection } from '@/components/pump-selection';
import { SimulationResultView } from '@/components/simulation-result';
import { DesignSummary } from '@/components/design-summary';
import { WaterQualityParams } from '@/lib/constants/water-quality';
import { SimulationResult, DesignFlow, PumpConfig } from '@/types';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemeToggle } from '@/components/theme-toggle';
import { useLocalStorage } from '@/lib/utils/hooks';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

/** 默认进水水质 */
const DEFAULT_INLET: WaterQualityParams = {
  ph: 7.5,
  tds: 2000,
  conductivity: 3200,
  turbidity: 2.5,
  temperature: 25
};

/** 默认设计流量 */
const DEFAULT_FLOW: DesignFlow = {
  feed: 53.3,
  permeate: 40,
  recovery: 75
};

/** 默认出水目标 */
const DEFAULT_TARGET: Partial<WaterQualityParams> = {
  tds: 50,
  turbidity: 0.5,
  ph: 7.0,
  cod: 10
};

/** 默认水泵配置 */
const DEFAULT_PUMP: PumpConfig = {
  feedPump: '',
  highPressurePump: '',
  interstagePump: '',
  ufPump: ''
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  
  // 使用 localStorage 持久化关键设计参数
  const [inletWaterQuality, setInletWaterQuality] = useLocalStorage<WaterQualityParams>(
    'wts-inlet', DEFAULT_INLET
  );
  const [targetOutletQuality, setTargetOutletQuality] = useLocalStorage<Partial<WaterQualityParams>>(
    'wts-target', DEFAULT_TARGET
  );
  const [designFlow, setDesignFlow] = useLocalStorage<DesignFlow>(
    'wts-flow', DEFAULT_FLOW
  );
  const [pumpConfig, setPumpConfig] = useLocalStorage<PumpConfig>(
    'wts-pump', DEFAULT_PUMP
  );
  
  // 非持久化状态
  const [outletWaterQuality, setOutletWaterQuality] = useState<Partial<WaterQualityParams>>({});
  const [processUnits, setProcessUnits] = useState<ProcessUnit[]>([]);
  const [simulationResult, setSimulationResult] = useLocalStorage<SimulationResult | null>('wtp_simulation_result', null);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // v3.3/v3.9.2优化：当关键数据变化时，自动清除旧的模拟结果
  // 避免使用过时数据导致的误导
  // v3.9.2修复：同时监听 inletWaterQuality 和 designFlow 变化
  useEffect(() => {
    if (simulationResult !== null) {
      setSimulationResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processUnits, inletWaterQuality, designFlow]);

  // v3.5修复：初始化完成后关闭加载状态，显示真实内容
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const steps = [
    { label: '水质参数', icon: FlaskConical },
    { label: '工艺设计', icon: Settings2 },
    { label: '水泵选型', icon: Gauge },
    { label: '效果模拟', icon: Beaker },
    { label: '设计总结', icon: FileCheck }
  ];

  const progress = useMemo(() => ((currentStep + 1) / steps.length) * 100, [currentStep, steps.length]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0: return designFlow.feed > 0 && designFlow.permeate > 0 && !!inletWaterQuality.tds;
      case 1: 
        const hasMembrane = processUnits.some(u => ['uf', 'nf', 'ro'].includes(u.type));
        const hasEnoughUnits = processUnits.length >= 2;
        return hasMembrane || hasEnoughUnits;
      case 2: return true;
      case 3: return true;
      default: return true;
    }
  }, [currentStep, designFlow.feed, designFlow.permeate, inletWaterQuality.tds, processUnits]);

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1);
      setError(null);
    } else if (!canProceed()) {
      switch (currentStep) {
        case 0:
          setError('请填写完整的进水水质参数（TDS）和设计流量（产水量）');
          break;
        case 1:
          setError('请至少添加一个膜组件（超滤/纳滤/反渗透）或至少2个处理单元');
          break;
        default:
          setError('请完成当前步骤的必填项');
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setInletWaterQuality(DEFAULT_INLET);
    setOutletWaterQuality({});
    setTargetOutletQuality(DEFAULT_TARGET);
    setDesignFlow(DEFAULT_FLOW);
    setProcessUnits([]);
    setPumpConfig(DEFAULT_PUMP);
    setSimulationResult(null);
    setError(null);
  };

  // 过滤效果模拟 - 带超时和重试
  const handleSimulate = async (retryCount = 0) => {
    setIsSimulating(true);
    setError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/simulation/filter-effect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inletWaterQuality,
          outletTargetQuality: targetOutletQuality,
          processUnits,
          designFlow
        }),
        signal: controller.signal
      });

      const data = await response.json();
      
      if (data.success) {
        setSimulationResult(data);
      } else {
        if (retryCount < 1 && response.status >= 500) {
          console.warn('模拟请求失败，自动重试中...', retryCount + 1);
          await new Promise(r => setTimeout(r, 1000));
          clearTimeout(timeoutId);
          return handleSimulate(retryCount + 1);
        }
        setError(data.error || '模拟失败，请重试');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('模拟请求超时，请检查网络后重试');
      } else {
        console.error('模拟失败:', err);
        setError('网络错误，请稍后重试');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSimulating(false);
    }
  };



  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 animate-pulse">
          <div className="h-5 bg-muted rounded-lg w-1/4" />
          <div className="h-40 bg-muted rounded-2xl" />
          <div className="h-40 bg-muted rounded-2xl" />
        </div>
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <ErrorBoundary>
            <WaterQualityInput
              inletWaterQuality={inletWaterQuality}
              outletWaterQuality={outletWaterQuality}
              onInletWaterQualityChange={setInletWaterQuality}
              onOutletWaterQualityChange={setOutletWaterQuality}
              designFlow={designFlow}
              onDesignFlowChange={setDesignFlow}
              targetOutletQuality={targetOutletQuality}
              onTargetOutletQualityChange={setTargetOutletQuality}
            />
          </ErrorBoundary>
        );
      case 1:
        return (
          <ErrorBoundary>
            <ProcessDesign
              processUnits={processUnits}
              onProcessUnitsChange={setProcessUnits}
              designFlow={designFlow}
              onDesignFlowChange={setDesignFlow}
              inletWaterQuality={inletWaterQuality}
              outletTargetQuality={targetOutletQuality}
            />
          </ErrorBoundary>
        );
      case 2:
        return (
          <ErrorBoundary>
            <PumpSelection
              designFlow={designFlow}
              processUnits={processUnits}
              pumpConfig={pumpConfig}
              onPumpConfigChange={setPumpConfig}
              waterQuality={inletWaterQuality}
            />
          </ErrorBoundary>
        );
      case 3:
        return (
          <ErrorBoundary>
            <SimulationResultView
              result={simulationResult}
              isSimulating={isSimulating}
              onSimulate={handleSimulate}
              inletWaterQuality={inletWaterQuality}
              outletTargetQuality={targetOutletQuality}
              pumpConfig={pumpConfig}
              designFlow={designFlow}
              waterQuality={inletWaterQuality}
              processUnits={processUnits}
            />
          </ErrorBoundary>
        );
      case 4:
        // 从 processUnits 中提取 RO 膜配置信息
        const roUnit = processUnits.find(u => u.type === 'ro');
        const ufUnit = processUnits.find(u => u.type === 'uf');
        const roStages = roUnit?.params?.stages || 2;
        const roElementsPerVessel = roUnit?.params?.elementsPerVessel || 6;
        const roElements = roUnit?.params?.elements || (roUnit?.params?.vessels || 0) * roElementsPerVessel;
        const roVessels = roUnit?.params?.vessels || 0;
        const roBrand = roUnit?.config?.brand || '';
        const roModel = roUnit?.config?.model || roUnit?.config?.customParams?.model || '';
        const roCategory = roUnit?.config?.customParams?.category || '';
        
        // 计算各段膜壳数量
        const stageVessels1 = Math.ceil(roVessels * 0.65) || 4;
        const stageVessels2 = Math.floor(roVessels * 0.35) || 2;
        
        return (
          <ErrorBoundary>
            <DesignSummary
              waterQuality={inletWaterQuality}
              designFlow={designFlow}
              processConfig={{
                pretreatment: processUnits.some(u => u.type === 'filter_media') ? '多介质过滤' : 
                              processUnits.some(u => u.type === 'filter_carbon') ? '活性炭过滤' :
                              processUnits.some(u => u.type === 'filter_softener') ? '软化处理' : '待配置',
                precisionFilter: processUnits.some(u => u.type === 'filter_precision') ? 
                  `精密过滤(${processUnits.find(u => u.type === 'filter_precision')?.params?.precision || '5μm'})` : '待配置',
                ufSystem: ufUnit ? `${ufUnit.config?.brand || ''} ${ufUnit.config?.model || 'UF系统'}` : '无',
                mainProcess: roUnit ? `RO反渗透` : processUnits.some(u => u.type === 'nf') ? 'NF纳滤' : '待配置'
              }}
              membraneConfig={{
                roBrand,
                roModel,
                roCategory,
                ufModel: ufUnit?.config?.model || '',
                ufBrand: ufUnit?.config?.brand || '',
                stages: roStages,
                elementsPerVessel: roElementsPerVessel,
                vesselsStage1: stageVessels1,
                vesselsStage2: stageVessels2,
                vesselsStage3: 0,
                totalElements: roElements,
                totalVessels: roVessels,
                recovery: designFlow.recovery,
                flux: roUnit?.params?.flux || 0
              }}
              pumpConfig={pumpConfig}
              designResult={simulationResult}
              processUnits={processUnits}
            />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000]">
      {/* ═══ Dashboard Sidebar ═══ */}
      <DashboardSidebar
        activeStep={currentStep}
        onStepChange={setCurrentStep}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* ═══ Main Content Area ═══ */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[220px]'
        }`}
      >
        {/* ═══ Header ═══ */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#1D1D1F]/80 backdrop-blur-xl border-b border-[#E5E5E7] dark:border-[#424245]">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              {/* Page Title */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#0077ED] flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold text-[#1D1D1F] dark:text-white tracking-tight">智能水处理系统</span>
                  <span className="text-[11px] text-[#86868B] dark:text-[#98989D] mt-0.5">
                    {steps[currentStep]?.label || ''}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-[#F5F5F7] dark:hover:bg-[#2D2D2F] h-9 px-4 text-[13px] rounded-lg"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  重置
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* ═══ Main Content ═══ */}
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">

          {/* Stepper - Apple Style */}
          <div className="mb-8">
            {/* Mobile: Progress Bar */}
            <div className="flex lg:hidden items-center gap-3 mb-6">
              <span className="text-[13px] font-medium text-[#86868B]">
                {currentStep + 1} / {steps.length}
              </span>
              <div className="flex-1 h-1 bg-[#E5E5E7] dark:bg-[#424245] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#0071E3] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Desktop: Stepper */}
            <div className="hidden lg:flex items-center gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;

                return (
                  <div key={index} className="flex items-center">
                    <button
                      className={cn(
                        'flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-200',
                        isCurrent
                          ? 'bg-[#0071E3] text-white shadow-sm'
                          : isCompleted
                            ? 'bg-[#E8E8ED] dark:bg-[#2D2D2F] text-[#1D1D1F] dark:text-white hover:bg-[#DCDCE0] dark:hover:bg-[#3D3D3F]'
                            : 'text-[#86868B]'
                      )}
                      onClick={() => index <= currentStep && setCurrentStep(index)}
                      disabled={index > currentStep}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                      ) : (
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                      )}
                      <span className={cn(
                        'text-[13px] font-medium',
                        isCurrent && 'font-semibold'
                      )}>
                        {step.label}
                      </span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        'w-8 h-px mx-1',
                        index < currentStep ? 'bg-[#0071E3]' : 'bg-[#D2D2D7]'
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6 rounded-2xl border-0 bg-[#FF3B30]/10 text-[#FF3B30]">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-[13px]">{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          <div className="mb-6">
            {renderStepContent()}
          </div>

          {/* ═══ Navigation ═══ */}
          <div className="flex items-center justify-between py-4 px-5 bg-white dark:bg-[#1D1D1F] rounded-2xl shadow-sm border border-[#E5E5E7] dark:border-[#424245]">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-[#F5F5F7] dark:hover:bg-[#2D2D2F] h-10 px-5 text-[13px] rounded-xl font-medium"
            >
              <span className="mr-1">←</span>
              上一步
            </Button>

            <div className="flex items-center gap-3">
              {currentStep === 3 && !simulationResult && (
                <Button
                  onClick={() => handleSimulate(0)}
                  disabled={isSimulating}
                  className="bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl h-10 px-5 text-[13px] font-medium shadow-sm"
                >
                  {isSimulating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                      计算中…
                    </>
                  ) : (
                    <>
                      <FlaskConical className="w-4 h-4 mr-2" />
                      开始模拟
                    </>
                  )}
                </Button>
              )}

              {currentStep < steps.length - 1 && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl h-10 px-5 text-[13px] font-medium shadow-sm"
                >
                  下一步
                  <span className="ml-1">→</span>
                </Button>
              )}
            </div>
          </div>

          {/* ═══ Quick Stats ═══ */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#1D1D1F] rounded-2xl p-4 border border-[#E5E5E7] dark:border-[#424245]">
              <div className="text-[11px] text-[#86868B] dark:text-[#98989D] mb-2">进水TDS</div>
              <div className="text-xl font-semibold text-[#1D1D1F] dark:text-white">
                {inletWaterQuality.tds || '—'}
                <span className="text-[12px] font-normal text-[#86868B] ml-1">mg/L</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1D1D1F] rounded-2xl p-4 border border-[#E5E5E7] dark:border-[#424245]">
              <div className="text-[11px] text-[#86868B] dark:text-[#98989D] mb-2">工艺单元</div>
              <div className="text-xl font-semibold text-[#1D1D1F] dark:text-white">
                {processUnits.length}
                <span className="text-[12px] font-normal text-[#86868B] ml-1">个</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1D1D1F] rounded-2xl p-4 border border-[#E5E5E7] dark:border-[#424245]">
              <div className="text-[11px] text-[#86868B] dark:text-[#98989D] mb-2">模拟状态</div>
              <div className={cn(
                'text-xl font-semibold',
                simulationResult ? 'text-[#16A34A]' : 'text-[#86868B]'
              )}>
                {simulationResult ? '已完成' : '待模拟'}
              </div>
            </div>

            <div className="bg-white dark:bg-[#1D1D1F] rounded-2xl p-4 border border-[#E5E5E7] dark:border-[#424245]">
              <div className="text-[11px] text-[#86868B] dark:text-[#98989D] mb-2">设计水量</div>
              <div className="text-xl font-semibold text-[#1D1D1F] dark:text-white">
                {designFlow.feed}
                <span className="text-[12px] font-normal text-[#86868B] ml-1">m³/h</span>
              </div>
            </div>
          </div>

          {/* ═══ Footer ═══ */}
          <div className="mt-10 pt-6 border-t border-[#E5E5E7] dark:border-[#424245]">
            <p className="text-[11px] text-[#86868B] dark:text-[#98989D] text-center">
              智能水处理系统设计平台 v3.5 · 仅供参考
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
