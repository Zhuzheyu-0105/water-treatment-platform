'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings2, 
  Droplets, 
  Filter, 
  CheckCircle2,
  Layers,
  ArrowRight,
  Calculator,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  pretreatmentOptions, 
  precisionFilterOptions, 
  mainProcessOptions,
  ufSystemOptions
} from '@/lib/constants/process';
import { roMembranes, membraneDimensions as roDimensions, calculateMembraneCount, WaterSourceType, getRecommendedElementsPerVessel, getElementsPerVesselOptions } from '@/lib/constants/membranes';
import { ufMembranes } from '@/lib/constants/uf-membranes';
import { WaterQualityParams } from '@/lib/constants/water-quality';

interface EquipmentDesignProps {
  processConfig: {
    pretreatment: string;
    precisionFilter: string;
    ufSystem: string;
    mainProcess: string;
  };
  onProcessConfigChange: (config: any) => void;
  membraneConfig: {
    roModel: string;
    ufModel: string;
    stages: number;
    elementsPerVessel: number;
    vesselsStage1: number;
    vesselsStage2: number;
    vesselsStage3: number;
  };
  onMembraneConfigChange: (config: any) => void;
  waterQuality: WaterQualityParams;
  designFlow: { feed: number; permeate: number; recovery: number };
}

export function EquipmentDesign({
  processConfig,
  onProcessConfigChange,
  membraneConfig,
  onMembraneConfigChange,
  waterQuality,
  designFlow
}: EquipmentDesignProps) {
  const tds = waterQuality.tds || 1000;
  const [calculationWarnings, setCalculationWarnings] = useState<string[]>([]);
  const [lastCalculation, setLastCalculation] = useState<any>(null);

  // 根据TDS筛选膜
  const filteredROMembranes = roMembranes.filter(m => {
    if (tds > 5000 && m.category !== 'sw') return false;
    if (tds <= 5000 && m.category === 'sw') return false;
    return true;
  });

  const selectedROMembrane = roMembranes.find(m => m.model === membraneConfig.roModel);
  
  // 根据选择的膜尺寸获取建议的装膜数
  const membraneSizeRecommendation = selectedROMembrane 
    ? getRecommendedElementsPerVessel(selectedROMembrane.dimension)
    : null;
  
  // 根据水质判断水源类型
  const getWaterSourceType = useCallback((): WaterSourceType => {
    if (tds > 10000) return 'seawater';
    if (waterQuality.cod && waterQuality.cod > 30) return 'wastewater';
    if (waterQuality.turbidity && waterQuality.turbidity > 10) return 'surface_water';
    return 'groundwater';
  }, [tds, waterQuality]);

  // 自动计算膜元件数量
  const autoCalculateMembranes = useCallback(() => {
    if (!selectedROMembrane || !designFlow.permeate) return;
    
    const hasUF = processConfig.ufSystem && processConfig.ufSystem !== 'none';
    const result = calculateMembraneCount(designFlow.permeate, selectedROMembrane, {
      recovery: designFlow.recovery,
      stages: membraneConfig.stages,
      elementsPerVessel: membraneConfig.elementsPerVessel,
      waterSourceType: getWaterSourceType(),
      sdi: waterQuality.sdi,
      hasUF: !!hasUF
    });
    
    // 更新膜壳配置
    const newConfig: any = {
      ...membraneConfig,
      roModel: membraneConfig.roModel,
      stages: result.stageConfig.length
    };
    
    result.stageConfig.forEach((stage, index) => {
      if (index === 0) newConfig.vesselsStage1 = stage.vessels;
      else if (index === 1) newConfig.vesselsStage2 = stage.vessels;
      else if (index === 2) newConfig.vesselsStage3 = stage.vessels;
    });
    
    onMembraneConfigChange(newConfig);
    setCalculationWarnings(result.warnings);
    setLastCalculation(result);
  }, [selectedROMembrane, designFlow, membraneConfig, processConfig.ufSystem, getWaterSourceType, onMembraneConfigChange, waterQuality.sdi]);

  // 当膜型号或设计流量变化时自动计算
  useEffect(() => {
    if (selectedROMembrane && designFlow.permeate > 0) {
      autoCalculateMembranes();
    }
  }, [selectedROMembrane?.model, designFlow.permeate, designFlow.recovery]);

  // 计算膜数量
  const calculateElements = () => {
    const total = (membraneConfig.vesselsStage1 + membraneConfig.vesselsStage2 + membraneConfig.vesselsStage3) * membraneConfig.elementsPerVessel;
    return total;
  };

  const getProcessFlowDescription = () => {
    const parts: string[] = [];
    if (processConfig.pretreatment !== 'none') {
      const pt = pretreatmentOptions.find(o => o.value === processConfig.pretreatment);
      if (pt) parts.push(pt.label);
    }
    if (processConfig.precisionFilter !== 'none') {
      const pf = precisionFilterOptions.find(o => o.value === processConfig.precisionFilter);
      if (pf) parts.push(pf.label);
    }
    if (processConfig.ufSystem !== 'none') {
      parts.push('超滤');
    }
    const mp = mainProcessOptions.find(o => o.value === processConfig.mainProcess);
    if (mp) parts.push(mp.label);
    return parts.join(' → ') || '请选择工艺';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">装备设计</h2>
          <p className="text-gray-500 mt-1">配置工艺流程和膜组件参数</p>
        </div>
        <Badge variant="outline" className="text-blue-600 border-blue-200 px-3 py-1">
          工艺: {getProcessFlowDescription()}
        </Badge>
      </div>

      {/* Process Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-500" />
            工艺流程配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>预处理工艺</Label>
              <Select
                value={processConfig.pretreatment}
                onValueChange={(v) => onProcessConfigChange({ ...processConfig, pretreatment: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择预处理" />
                </SelectTrigger>
                <SelectContent>
                  {pretreatmentOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div>{opt.label}</div>
                        {opt.description && (
                          <div className="text-xs text-gray-500">{opt.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>精密过滤</Label>
              <Select
                value={processConfig.precisionFilter}
                onValueChange={(v) => onProcessConfigChange({ ...processConfig, precisionFilter: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择精滤" />
                </SelectTrigger>
                <SelectContent>
                  {precisionFilterOptions.filter(o => o.value !== 'none').map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>超滤系统</Label>
              <Select
                value={processConfig.ufSystem}
                onValueChange={(v) => onProcessConfigChange({ ...processConfig, ufSystem: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择超滤" />
                </SelectTrigger>
                <SelectContent>
                  {ufSystemOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>主处理工艺</Label>
              <Select
                value={processConfig.mainProcess}
                onValueChange={(v) => onProcessConfigChange({ ...processConfig, mainProcess: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择主工艺" />
                </SelectTrigger>
                <SelectContent>
                  {mainProcessOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-xs text-gray-500">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UF Membrane Selection */}
      {processConfig.ufSystem !== 'none' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-5 h-5 text-cyan-500" />
              超滤膜组件选择
            </CardTitle>
            <CardDescription>选择适合的超滤膜组件</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ufMembranes.slice(0, 6).map(membrane => (
                <div
                  key={membrane.model}
                  onClick={() => onMembraneConfigChange({ ...membraneConfig, ufModel: membrane.model })}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${membraneConfig.ufModel === membrane.model 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge variant="outline" className="text-xs mb-1">{membrane.brand}</Badge>
                      <div className="font-semibold">{membrane.model}</div>
                    </div>
                    {membraneConfig.ufModel === membrane.model && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <div>膜面积: {membrane.area} m²</div>
                    <div>材质: {membrane.material}</div>
                    <div>通量: {membrane.flux} LMH</div>
                    <div>孔径: {membrane.poreSize}</div>
                  </div>
                </div>
              ))}
            </div>

            {membraneConfig.ufModel && (
              <div className="mt-4 p-4 bg-cyan-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>UF膜组件数量</Label>
                    <Input
                      type="number"
                      value={membraneConfig.vesselsStage1}
                      onChange={(e) => onMembraneConfigChange({
                        ...membraneConfig,
                        vesselsStage1: Number(e.target.value)
                      })}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RO Membrane Selection */}
      {processConfig.mainProcess.includes('ro') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              RO反渗透膜组件选择
            </CardTitle>
            <CardDescription>
              TDS {tds} mg/L → 推荐 {tds > 5000 ? '海水膜(SW)' : tds < 500 ? '低能耗膜(LE)' : '苦咸水膜(BW)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {filteredROMembranes.slice(0, 9).map(membrane => (
                <div
                  key={membrane.model}
                  onClick={() => {
                    // 选择膜时，自动调整每支膜壳装膜数到该尺寸的默认值
                    const recommendation = getRecommendedElementsPerVessel(membrane.dimension);
                    onMembraneConfigChange({ 
                      ...membraneConfig, 
                      roModel: membrane.model,
                      elementsPerVessel: recommendation.default
                    });
                  }}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${membraneConfig.roModel === membrane.model 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge variant="outline" className="text-xs mb-1">{membrane.brand}</Badge>
                      <div className="font-semibold">{membrane.model}</div>
                      <div className="text-xs text-gray-500">{membrane.dimension}</div>
                    </div>
                    {membraneConfig.roModel === membrane.model && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <div>产水: {membrane.flow} GPD</div>
                    <div>脱盐: {membrane.rejection}%</div>
                    <div>面积: {membrane.area} ft²</div>
                    <div>压力: {membrane.pressure} psi</div>
                  </div>
                  {membrane.features && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {membrane.features.slice(0, 2).map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* RO System Configuration */}
            {membraneConfig.roModel && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>段式配置</Label>
                    <Select
                      value={membraneConfig.stages.toString()}
                      onValueChange={(v) => onMembraneConfigChange({ ...membraneConfig, stages: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">一段式</SelectItem>
                        <SelectItem value="2">两段式</SelectItem>
                        <SelectItem value="3">三段式</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>每支膜壳膜数</Label>
                    <Select
                      value={membraneConfig.elementsPerVessel.toString()}
                      onValueChange={(v) => onMembraneConfigChange({ ...membraneConfig, elementsPerVessel: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getElementsPerVesselOptions(
                          selectedROMembrane?.dimension || '8040',
                          !selectedROMembrane // 没有选择膜时显示所有选项
                        ).map(opt => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {membraneSizeRecommendation && (
                      <p className="text-xs text-gray-500">
                        {membraneSizeRecommendation.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>第一段膜壳</Label>
                    <Input
                      type="number"
                      value={membraneConfig.vesselsStage1}
                      onChange={(e) => onMembraneConfigChange({
                        ...membraneConfig,
                        vesselsStage1: Number(e.target.value)
                      })}
                      min={1}
                    />
                  </div>

                  {membraneConfig.stages >= 2 && (
                    <div className="space-y-2">
                      <Label>第二段膜壳</Label>
                      <Input
                        type="number"
                        value={membraneConfig.vesselsStage2}
                        onChange={(e) => onMembraneConfigChange({
                          ...membraneConfig,
                          vesselsStage2: Number(e.target.value)
                        })}
                        min={1}
                      />
                    </div>
                  )}
                </div>

                {/* Calculation Summary */}
                <div className="space-y-4 pt-4 border-t border-blue-200">
                  {/* 设计通量信息 */}
                  {lastCalculation && (
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600">
                        设计通量: <strong>{lastCalculation.designFlux} GFD</strong>
                        {lastCalculation.actualFlux && (
                          <span className="ml-2">| 实际通量: <strong>{lastCalculation.actualFlux} GFD</strong></span>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {/* 警告信息 */}
                  {calculationWarnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div className="space-y-1">
                          {calculationWarnings.map((warning, index) => (
                            <div key={index} className="text-sm text-yellow-700">{warning}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{calculateElements()}</div>
                      <div className="text-xs text-gray-500">总膜元件数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {membraneConfig.vesselsStage1 + membraneConfig.vesselsStage2 + membraneConfig.vesselsStage3}
                      </div>
                      <div className="text-xs text-gray-500">膜壳总数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{membraneConfig.stages}</div>
                      <div className="text-xs text-gray-500">段数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedROMembrane?.rejection}%
                      </div>
                      <div className="text-xs text-gray-500">预估脱盐率</div>
                    </div>
                  </div>
                  
                  {/* 各段配置详情 */}
                  {lastCalculation?.stageConfig && (
                    <div className="bg-gray-50 rounded-lg p-3 mt-2">
                      <div className="text-xs font-medium text-gray-500 mb-2">段式配置详情</div>
                      <div className="grid grid-cols-3 gap-2">
                        {lastCalculation.stageConfig.map((stage: any, index: number) => (
                          <div key={index} className="bg-white rounded p-2 text-center">
                            <div className="text-xs text-gray-500">第{stage.stage}段</div>
                            <div className="font-semibold">{stage.vessels} 支膜壳</div>
                            <div className="text-xs text-gray-400">{stage.elements} 支膜</div>
                          </div>
                        ))}
                      </div>
                      {lastCalculation.concentratePerElement && (
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          浓水流量: {lastCalculation.concentratePerElement} GPM/支
                          {lastCalculation.concentratePerElement < 3.5 && (
                            <span className="text-yellow-600 ml-1">⚠️ 低于最小值</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* UF Configuration (if selected) */}
      {processConfig.mainProcess === 'uf_only' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-5 h-5 text-cyan-500" />
              超滤膜配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ufMembranes.slice(0, 6).map(membrane => (
                <div
                  key={membrane.model}
                  onClick={() => onMembraneConfigChange({ ...membraneConfig, ufModel: membrane.model })}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${membraneConfig.ufModel === membrane.model 
                      ? 'border-cyan-500 bg-cyan-50' 
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <div className="font-semibold">{membrane.model}</div>
                  <div className="text-xs text-gray-500">{membrane.brand} | {membrane.material}</div>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                    <div>面积: {membrane.area}m²</div>
                    <div>通量: {membrane.flux}LMH</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
