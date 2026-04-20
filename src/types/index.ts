/**
 * 智能水处理系统设计平台 - 类型定义
 */

import { WaterQualityParams } from '@/lib/constants/water-quality';
import { ProcessUnit } from '@/components/process-design';

// ==================== 水质参数类型 ====================

export interface WaterQualityInput {
  inletWaterQuality: WaterQualityParams;
  outletWaterQuality: Partial<WaterQualityParams>;
  targetOutletQuality: Partial<WaterQualityParams>;
}

// ==================== 设计流量类型 ====================

export interface DesignFlow {
  feed: number;      // 进水量 (m³/h)
  permeate: number;  // 产水量 (m³/h)
  recovery: number;  // 回收率 (%)
}

// ==================== 水泵配置类型 ====================

export interface PumpConfig {
  feedPump: string;
  highPressurePump: string;
  interstagePump: string;
  ufPump: string;
}

// ==================== 模拟结果类型 ====================

export interface ROStageResult {
  stageIndex: number;
  feedFlow: number;
  feedTDS: number;
  feedPressure: number;
  stageRecovery: number;
  permeateFlow: number;
  permeateTDS: number;
  concentrateFlow: number;
  concentrateTDS: number;
  avgFlux: number;
  rejection: number;
  pressureDrop: number;
}

export interface SimulationStep {
  step: number;
  unit: string;
  unitType: string;
  inlet: Partial<WaterQualityParams>;
  outlet: Partial<WaterQualityParams>;
  removalRates: Record<string, string>;
  notes: string;
  formula?: string;
  stageResults?: ROStageResult[];  // 多段RO/NF的逐段详细结果
}

export interface SimulationFinalResult {
  waterQuality: Partial<WaterQualityParams>;
  meetsTarget: boolean;
  issues: string[];
  recommendations: string[];
}

export interface SimulationStatistics {
  totalTDSRemoval: string;
  totalTurbidityRemoval: string;
  totalCODRemoval: string;
}

export interface TargetAssessment {
  meetsTarget: boolean;
  achievement: Record<string, boolean>;
}

export interface FoulingRisk {
  overallRisk: 'low' | 'medium' | 'high';
  factors: Array<{
    name: string;
    risk: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommendations: string[];
}

export interface SimulationResult {
  success: boolean;
  simulation: SimulationStep[];
  finalResult: SimulationFinalResult;
  statistics?: SimulationStatistics;
  targetAssessment?: TargetAssessment;
  foulingRisk?: FoulingRisk;
  concentrateWater?: Partial<WaterQualityParams>;
  summary?: string;
  error?: string;
}

// ==================== API 响应类型 ====================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WaterQualityParseResponse {
  success: boolean;
  data: Partial<WaterQualityParams>;
  missingParams: string[];
  analysis: string;
}

export interface WaterQualityAnalyzeResponse {
  success: boolean;
  analysis: string;
  classification: {
    type: string;
    tdsLevel: string;
    hardnessLevel: string;
  };
}

export interface DesignGenerateResponse {
  success: boolean;
  design: {
    membranes: {
      ro: any;
      uf: any;
    };
    pumps: {
      feedPump: any;
      highPressurePump: any;
      interstagePump?: any;
    };
    processFlow: any[];
    equipmentList: any[];
    operatingParams: any;
  };
}

export interface SimulationFilterEffectResponse {
  success: boolean;
  simulation: SimulationStep[];
  finalResult: SimulationFinalResult;
  statistics?: SimulationStatistics;
  targetAssessment?: TargetAssessment;
  foulingRisk?: FoulingRisk;
  concentrateWater?: Partial<WaterQualityParams>;
  summary?: string;
}

// ==================== 组件 Props 类型 ====================

export interface WaterQualityInputProps {
  inletWaterQuality: WaterQualityParams;
  outletWaterQuality: Partial<WaterQualityParams>;
  onInletWaterQualityChange: (params: WaterQualityParams) => void;
  onOutletWaterQualityChange: (params: Partial<WaterQualityParams>) => void;
  designFlow: DesignFlow;
  onDesignFlowChange: (flow: DesignFlow) => void;
  targetOutletQuality: Partial<WaterQualityParams>;
  onTargetOutletQualityChange: (params: Partial<WaterQualityParams>) => void;
}

export interface ProcessDesignProps {
  processUnits: ProcessUnit[];
  onProcessUnitsChange: (units: ProcessUnit[]) => void;
  designFlow: DesignFlow;
  onDesignFlowChange: (flow: DesignFlow) => void;
  inletWaterQuality: WaterQualityParams;
  outletTargetQuality: Partial<WaterQualityParams>;
}

export interface PumpSelectionProps {
  designFlow: DesignFlow;
  processConfig: any;
  membraneConfig: any;
  pumpConfig: PumpConfig;
  onPumpConfigChange: (config: PumpConfig) => void;
  waterQuality: WaterQualityParams;
}

export interface SimulationResultViewProps {
  result: SimulationResult | null;
  isSimulating: boolean;
  onSimulate: () => Promise<void>;
  inletWaterQuality: WaterQualityParams;
  outletTargetQuality: Partial<WaterQualityParams>;
}

export interface DesignSummaryProps {
  waterQuality: WaterQualityParams;
  designFlow: DesignFlow;
  processConfig: any;
  membraneConfig: any;
  pumpConfig: PumpConfig;
  designResult: SimulationResult | null;
}

// ==================== 步进向导类型 ====================

export interface Step {
  label: string;
  icon: any;
  description: string;
}

export interface WizardState {
  currentStep: number;
  isCompleted: boolean;
  canProceed: boolean;
}