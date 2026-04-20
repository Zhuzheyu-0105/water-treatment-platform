'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Gauge, 
  CheckCircle2,
  Star,
  Zap,
  Droplets,
  RefreshCw,
  Info
} from 'lucide-react';
import { cdlPumps, CDLPump, cdlPumpStats } from '@/lib/constants/cdl-pumps';
import { selectPump } from '@/lib/utils/pump-selection';
import { 
  calculateSystemPressure,
  calculateOsmoticPressure,
  calculateInterstagePump,
  needsInterstagePump,
  calculateParallelPumps,
  BAR_TO_METER
} from '@/lib/utils/pump-calculations';
import { WaterQualityParams } from '@/lib/constants/water-quality';
import { recommendMembraneCategory, roMembranes } from '@/lib/constants/membranes';
import { ProcessUnit } from '@/components/process-design';

// ==================== Props 定义 ====================

interface PumpSelectionProps {
  designFlow: { feed: number; permeate: number; recovery: number };
  processUnits: ProcessUnit[];
  pumpConfig: {
    feedPump: string;
    highPressurePump: string;
    interstagePump: string;
    ufPump: string;
  };
  onPumpConfigChange: (config: PumpSelectionProps['pumpConfig']) => void;
  waterQuality: WaterQualityParams;
}

// ==================== 工程计算辅助函数 ====================

/**
 * 从 processUnits 中提取 RO 单元配置
 * 返回第一个 RO 单元（主 RO）
 */
function extractROConfig(processUnits: ProcessUnit[]) {
  const roUnit = processUnits.find(u => u.type === 'ro');
  if (!roUnit) return null;
  return {
    model: roUnit.config?.model || '',
    brand: roUnit.config?.brand || '',
    stages: roUnit.params?.stages || 1,
    elementsPerVessel: roUnit.params?.elementsPerVessel || 6,
    elements: roUnit.params?.elements || 0,
  };
}

/**
 * 从 processUnits 中提取 NF 单元配置
 */
function extractNFConfig(processUnits: ProcessUnit[]) {
  const nfUnit = processUnits.find(u => u.type === 'nf');
  if (!nfUnit) return null;
  return {
    model: nfUnit.config?.model || '',
    stages: nfUnit.params?.stages || 1,
    elementsPerVessel: nfUnit.params?.elementsPerVessel || 6,
  };
}

/**
 * 从 processUnits 中提取 UF 单元配置
 */
function extractUFConfig(processUnits: ProcessUnit[]) {
  const ufUnit = processUnits.find(u => u.type === 'uf');
  if (!ufUnit) return null;
  return {
    model: ufUnit.config?.model || '',
  };
}

/**
 * 根据膜型号推断膜类型 (BW/SW/LE/NF)
 * 优先从膜数据库查找
 */
function inferMembraneType(model: string, tds: number): 'BW' | 'SW' | 'LE' {
  if (!model) {
    const cat = recommendMembraneCategory(tds);
    return cat.category === 'sw' ? 'SW' : cat.category === 'le' ? 'LE' : 'BW';
  }
  const found = roMembranes.find(m => m.model === model);
  if (found) {
    if (found.category === 'sw') return 'SW';
    if (found.category === 'le') return 'LE';
  }
  // 按型号前缀判断
  if (model.startsWith('SW')) return 'SW';
  if (model.startsWith('LE') || model.startsWith('BW30LE')) return 'LE';
  return 'BW';
}

/**
 * 计算段间泵扬程
 * 
 * 段间泵工程公式（参考《反渗透水处理工程》）：
 * - 第一段浓水 TDS = 进水 TDS / (1 - 第一段回收率)
 * - 第二段进水渗透压 = π(TDS₂, T)
 * - 段间增压量 = max(0, π₂ - P₁_concentrate + NDP_min)
 *   其中 P₁_concentrate = 第一段操作压力 - 压降(约1.5 bar)
 * - 段间泵扬程 H_interstage = ΔP × 10.2 (m)
 */
function calcInterstagePumpHead(
  feedTDS: number,
  recovery: number,
  stages: number,
  systemPressure: number,
  temperature: number
): { required: boolean; head: number; reason: string; flowRate: number } {
  if (stages < 2) return { required: false, head: 0, reason: '一段式系统无需段间泵', flowRate: 0 };

  const stage1Recovery = (recovery / 100) * 0.55; // 第一段回收约55%总回收
  const interstagePumpResult = calculateInterstagePump({
    firstStageFeedTDS: feedTDS,
    firstStageRecovery: stage1Recovery,
    secondStageRecovery: (recovery / 100) - stage1Recovery * (1 - stage1Recovery),
    temperature,
    firstStagePressure: systemPressure,
    firstStagePressureLoss: 1.5
  });

  return {
    required: interstagePumpResult.required,
    head: interstagePumpResult.head || 30,
    reason: interstagePumpResult.reason,
    flowRate: 0 // 外部填充
  };
}

// ==================== 主组件 ====================

export function PumpSelection({
  designFlow,
  processUnits,
  pumpConfig,
  onPumpConfigChange,
  waterQuality
}: PumpSelectionProps) {
  const tds = waterQuality.tds || 1000;
  const temperature = waterQuality.temperature || 25;

  // ---------- 从工艺单元提取配置 ----------
  const roConfig = extractROConfig(processUnits);
  const nfConfig = extractNFConfig(processUnits);
  const ufConfig = extractUFConfig(processUnits);

  const hasRO = !!roConfig;
  const hasNF = !!nfConfig;
  const hasUF = !!ufConfig;

  const roStages = roConfig?.stages || 1;
  const roModel = roConfig?.model || '';

  // ---------- 膜类型推断 ----------
  const membraneType = inferMembraneType(roModel || (nfConfig?.model || ''), tds);
  const membraneCategory = recommendMembraneCategory(tds);

  // ---------- 系统压力计算 ----------
  // 公式：P_system = π_avg + NDP + P_fouling(1.5 bar) + P_piping(0.8 bar)
  // NDP(苦咸水)≈5~8 bar，NDP(海水)≈10~15 bar，NDP(低能耗)≈3 bar
  const pressureResult = calculateSystemPressure({
    feedTDS: tds,
    recovery: designFlow.recovery / 100,
    temperature,
    membraneType
  });

  const osmoticPressure = calculateOsmoticPressure(tds, temperature);

  // ---------- 并联泵配置（CDL系列单泵最大200m³/h） ----------
  // 原水泵：低压泵，1用1备策略
  const feedParallelConfig = calculateParallelPumps(designFlow.feed, 200, false);
  // 高压泵：高压泵，大流量优先单台+备用
  const hpParallelConfig = calculateParallelPumps(designFlow.feed, 200, true);

  // ---------- 原水泵 ----------
  // 原水泵扬程：克服预处理阻力 + 高压泵吸入要求
  // H_feed ≈ 20~35 m（含管路损失约5m、过滤阻力10m、高压泵吸入静压5m）
  const feedPumpHead = 30;
  const feedPumpRec = selectPump({
    requiredFlow: feedParallelConfig.flowPerPump,
    requiredHead: feedPumpHead,
    application: 'feed',
    maxParallelCount: feedParallelConfig.pumpCount + feedParallelConfig.standbyCount
  });

  // ---------- RO/NF 高压泵 ----------
  // H_hp = P_operating × 10.2 (bar → m)
  const hpPumpHead = pressureResult.head;
  const hpPumpRec = selectPump({
    requiredFlow: hpParallelConfig.flowPerPump,
    requiredHead: hpPumpHead,
    application: 'ro',
    maxParallelCount: hpParallelConfig.pumpCount + hpParallelConfig.standbyCount
  });

  // ---------- 段间增压泵 ----------
  // 两段式系统：第一段浓水进入第二段，浓水TDS升高导致渗透压升高
  // 需要段间泵补压。判断条件：
  //   1. TDS > 5000 mg/L（浓缩后渗透压高）
  //   2. 回收率 > 75%（浓缩倍率高）
  //   3. 两段以上系统
  const interstagePumpDecision = needsInterstagePump(tds, designFlow.recovery / 100, roStages >= 2);
  const interstagePumpCalc = calcInterstagePumpHead(
    tds,
    designFlow.recovery,
    roStages,
    pressureResult.operatingPressure,
    temperature
  );

  // 段间泵流量 = 第一段浓水量 ≈ 进水 × (1 - 第一段回收率)
  // 第一段回收率约为总回收率的55%
  const stage1Recovery = (designFlow.recovery / 100) * 0.55;
  const stage1ConcentrateFlow = designFlow.feed * (1 - stage1Recovery);
  const interstagePumpHead = interstagePumpCalc.required
    ? Math.max(30, Math.round(interstagePumpCalc.head))
    : 30;

  const interstagePumpNeeded = (hasRO || hasNF) && roStages >= 2 && interstagePumpDecision.required;

  const interstagePumpParallel = interstagePumpNeeded
    ? calculateParallelPumps(stage1ConcentrateFlow, 200, true)
    : null;

  const interstagePumpRec = interstagePumpNeeded && interstagePumpParallel
    ? selectPump({
        requiredFlow: interstagePumpParallel.flowPerPump,
        requiredHead: interstagePumpHead,
        application: 'booster'
      })
    : null;

  // ---------- UF 产水泵 ----------
  // UF产水泵流量 = 进水量 × 1.1（含反洗用水）
  // UF产水泵扬程：克服后续过滤阻力 + 高压泵入口压力
  // H_uf ≈ 20~30 m
  const ufPumpFlow = designFlow.feed * 1.1;
  const ufPumpHead = 25;
  const ufPumpParallel = hasUF ? calculateParallelPumps(ufPumpFlow, 200, false) : null;
  const ufPumpRec = hasUF && ufPumpParallel
    ? selectPump({
        requiredFlow: ufPumpParallel.flowPerPump,
        requiredHead: ufPumpHead,
        application: 'uf'
      })
    : null;

  // ==================== 渲染辅助 ====================

  const renderPumpCard = (
    pump: CDLPump & { power?: number },
    isSelected: boolean,
    isRecommended: boolean,
    onSelect: () => void
  ) => (
    <div
      onClick={onSelect}
      className={`
        p-5 rounded-2xl border cursor-pointer transition-all relative
        ${isSelected 
          ? 'border-water bg-water-muted shadow-sm' 
          : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'}
      `}
    >
      {isRecommended && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-water text-water-foreground rounded-lg shadow-sm">
            <Star className="w-3 h-3 mr-1" />
            推荐
          </Badge>
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-sm">{pump.model}</div>
          <div className="text-xs text-muted-foreground">南方泵业 CDL系列</div>
        </div>
        {isSelected && <CheckCircle2 className="w-5 h-5 text-water" />}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>流量: <span className="text-foreground font-medium">{pump.flow}</span> m³/h</div>
        <div>扬程: <span className="text-foreground font-medium">{pump.head}</span> m</div>
        <div>功率: <span className="text-foreground font-medium">{pump.motorPower}</span> kW</div>
        <div>效率: <span className="text-foreground font-medium">{pump.efficiency}</span>%</div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground/60">
        进出口: {pump.connection} | 重量: {pump.weight || '-'} kg
      </div>
    </div>
  );

  // 筛选候选水泵（用于手动选择）
  // 注意：显示的泵参数为单台参数，总装机功率需要乘以台数
  const filterPumps = (requiredFlow: number, requiredHead: number): (CDLPump & { power: number })[] => {
    return cdlPumps
      .filter(pump => {
        const flowMatch = pump.flow >= requiredFlow * 0.7 && pump.flow <= requiredFlow * 1.5;
        const headMatch = pump.head >= requiredHead * 0.8 && pump.head <= requiredHead * 1.3;
        return flowMatch && headMatch;
      })
      .map(p => ({ ...p, power: p.motorPower }))
      .slice(0, 6);
  };

  // 渲染泵配置说明（总功率、台数）
  const renderParallelInfo = (config: { pumpCount: number; standbyCount: number; mode: string; flowPerPump: number }, selectedPump: CDLPump | null) => {
    if (!selectedPump) return null;
    const totalPumps = config.pumpCount + config.standbyCount;
    const totalInstalledPower = selectedPump.motorPower * totalPumps;
    const runningPower = selectedPump.motorPower * config.pumpCount;

    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-xl space-y-1.5 text-xs">
        <div className="font-medium text-foreground">并联配置</div>
        <div className="grid grid-cols-3 gap-2 text-muted-foreground">
          <div>
            <span className="text-foreground font-medium">{totalPumps}</span> 台装机
            <div className="text-[10px] text-muted-foreground/70">
              {config.mode === 'standby'
                ? `${config.pumpCount}用${config.standbyCount}备`
                : `${config.pumpCount}并联 + ${config.standbyCount}备`}
            </div>
          </div>
          <div>
            运行功率 <span className="text-foreground font-medium">{runningPower}</span> kW
            <div className="text-[10px] text-muted-foreground/70">单台 {selectedPump.motorPower} kW × {config.pumpCount}</div>
          </div>
          <div>
            装机功率 <span className="text-foreground font-medium">{totalInstalledPower}</span> kW
            <div className="text-[10px] text-muted-foreground/70">含备用泵</div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== 渲染 ====================

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">水泵选型</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">南方泵业 CDL系列立式多级离心泵 · 基于实际工艺流程自动计算</p>
        </div>
      </div>

      {/* ── 工艺参数摘要 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Card className="bg-water-muted/40 border-water/10 hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="text-[11px] text-muted-foreground font-medium">进水量</div>
            <div className="text-xl font-bold tracking-tight text-water mt-0.5">
              {designFlow.feed.toFixed(1)} <span className="text-[11px] font-normal text-muted-foreground">m³/h</span>
            </div>
            {feedParallelConfig.mode !== 'single' && (
              <div className="text-[10px] text-water/70 mt-0.5">
                {feedParallelConfig.mode === 'standby'
                  ? `${feedParallelConfig.pumpCount}用${feedParallelConfig.standbyCount}备`
                  : `${feedParallelConfig.pumpCount}台并联 + ${feedParallelConfig.standbyCount}备`}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-success-muted/40 border-success/10 hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="text-[11px] text-muted-foreground font-medium">产水量</div>
            <div className="text-xl font-bold tracking-tight text-success mt-0.5">
              {designFlow.permeate.toFixed(1)} <span className="text-[11px] font-normal text-muted-foreground">m³/h</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">回收率 {designFlow.recovery}%</div>
          </CardContent>
        </Card>
        <Card className="bg-data-muted/40 border-data/10 hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="text-[11px] text-muted-foreground font-medium">高压泵扬程</div>
            <div className="text-xl font-bold tracking-tight text-data mt-0.5">
              {pressureResult.head} <span className="text-[11px] font-normal text-muted-foreground">m</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{pressureResult.operatingPressure} bar · π={osmoticPressure.toFixed(1)} bar</div>
          </CardContent>
        </Card>
        <Card className="bg-tech-muted/40 border-tech/10 hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="text-[11px] text-muted-foreground font-medium">膜系统配置</div>
            <div className="text-base font-bold tracking-tight text-tech mt-0.5">
              {hasRO ? `RO ${roStages}段` : hasNF ? 'NF' : hasUF ? 'UF' : '待配置'}
              {roConfig?.elements ? ` · ${roConfig.elements}支` : ''}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {roConfig?.brand ? `${roConfig.brand} · ` : ''}{roModel || membraneCategory.description.split('，')[0]}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 压力计算说明 ── */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground/70">压力计算（工程公式）</div>
              <div>
                P<sub>system</sub> = π<sub>avg</sub> + NDP + P<sub>fouling</sub> + P<sub>piping</sub>
                &nbsp;= {pressureResult.components.osmoticPressure} + {pressureResult.components.netDrivePressure} + {pressureResult.components.foulingAllowance} + {pressureResult.components.pipingLoss} = <strong>{pressureResult.operatingPressure} bar</strong>
              </div>
              <div className="text-muted-foreground/70">
                π = TDS/1000 × 0.77 × T/298 bar（范托夫公式）｜
                H = P × {BAR_TO_METER} m/bar（压力→扬程）｜
                P<sub>shaft</sub> = Q×H / (367×η<sub>pump</sub>×η<sub>motor</sub>)（轴功率）
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 原水泵 ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-water" />
            原水泵选型
          </CardTitle>
          <CardDescription>
            设计流量 {designFlow.feed.toFixed(1)} m³/h，扬程需求 ~{feedPumpHead} m
            &nbsp;（含管路损失 5 m + 预处理阻力 10 m + 高压泵吸入余量 5 m）
            {feedParallelConfig.mode !== 'single' && (
              <Badge variant="secondary" className="ml-2">
                {feedParallelConfig.mode === 'standby'
                  ? `1用1备（${feedParallelConfig.pumpCount + feedParallelConfig.standbyCount}台，单台 ${feedParallelConfig.flowPerPump} m³/h）`
                  : `${feedParallelConfig.pumpCount}用${feedParallelConfig.standbyCount}备（单台 ${feedParallelConfig.flowPerPump} m³/h）`}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filterPumps(feedParallelConfig.flowPerPump, feedPumpHead).map((pump) => (
              <div key={pump.model}>
                {renderPumpCard(
                  pump,
                  pumpConfig.feedPump === pump.model,
                  feedPumpRec?.selected.model === pump.model,
                  () => onPumpConfigChange({ ...pumpConfig, feedPump: pump.model })
                )}
              </div>
            ))}
          </div>
          {feedPumpRec && !pumpConfig.feedPump && (
            <div className="mt-4 p-3 bg-water-muted rounded-lg text-sm">
              <span className="font-medium text-water">智能推荐：</span>
              <span className="text-water"> {feedPumpRec.selected.model} — {feedPumpRec.reasoning}</span>
            </div>
          )}
          {pumpConfig.feedPump && feedParallelConfig.mode !== 'single' && (() => {
            const selected = cdlPumps.find(p => p.model === pumpConfig.feedPump);
            return selected ? renderParallelInfo(feedParallelConfig, selected) : null;
          })()}
        </CardContent>
      </Card>

      {/* ── RO / NF 高压泵 ── */}
      {(hasRO || hasNF) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-data" />
              {hasRO ? 'RO' : 'NF'} 高压泵选型
            </CardTitle>
            <CardDescription>
              流量 {designFlow.feed.toFixed(1)} m³/h，扬程需求 ~{hpPumpHead} m（操作压力 {pressureResult.operatingPressure} bar）
              <Badge variant="outline" className="ml-2">
                {membraneType === 'SW' ? '海水膜' : membraneType === 'LE' ? '低能耗膜' : '苦咸水膜'} · {roStages}段
              </Badge>
              {hpParallelConfig.mode !== 'single' && (
                <Badge variant="secondary" className="ml-2">
                  {hpParallelConfig.mode === 'standby'
                    ? `1用1备（${hpParallelConfig.pumpCount + hpParallelConfig.standbyCount}台，单台 ${hpParallelConfig.flowPerPump} m³/h）`
                    : `${hpParallelConfig.pumpCount}用${hpParallelConfig.standbyCount}备（单台 ${hpParallelConfig.flowPerPump} m³/h）`}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filterPumps(hpParallelConfig.flowPerPump, hpPumpHead).map((pump) => (
                <div key={pump.model}>
                  {renderPumpCard(
                    pump,
                    pumpConfig.highPressurePump === pump.model,
                    hpPumpRec?.selected.model === pump.model,
                    () => onPumpConfigChange({ ...pumpConfig, highPressurePump: pump.model })
                  )}
                </div>
              ))}
            </div>
            {hpPumpRec && !pumpConfig.highPressurePump && (
              <div className="mt-4 p-3 bg-data-muted rounded-lg text-sm">
                <span className="font-medium text-data">智能推荐：</span>
                <span className="text-data"> {hpPumpRec.selected.model} — {hpPumpRec.reasoning}</span>
              </div>
            )}
            {pumpConfig.highPressurePump && hpParallelConfig.mode !== 'single' && (() => {
              const selected = cdlPumps.find(p => p.model === pumpConfig.highPressurePump);
              return selected ? renderParallelInfo(hpParallelConfig, selected) : null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* ── 段间增压泵（两段 / 三段 RO） ── */}
      {interstagePumpNeeded && (
        <Card className="border-data/30 bg-data-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-data" />
              段间增压泵（分压设计）
            </CardTitle>
            <CardDescription>
              <div className="flex flex-wrap items-center gap-2">
                <span>段间流量 ~{stage1ConcentrateFlow.toFixed(1)} m³/h，增压扬程 ~{interstagePumpHead} m</span>
                <Badge variant="secondary" className="bg-data/15 text-data border-data/20">
                  {roStages}段式 · {interstagePumpDecision.reason}
                </Badge>
              </div>
              <div className="text-xs text-data/70 mt-1">
                段间泵原理：第一段浓水 TDS ≈ {(tds / (1 - stage1Recovery)).toFixed(0)} mg/L，
                渗透压升高，需增压约 {(interstagePumpHead / BAR_TO_METER).toFixed(1)} bar
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-data-muted rounded-xl text-sm text-data">
              <strong className="font-semibold">分压设计优势：</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1 text-data/80">
                <li>降低第一段膜元件压力，延长使用寿命</li>
                <li>平衡各段产水通量，提高系统效率</li>
                <li>适用于 TDS &gt; 5000 mg/L 或回收率 &gt; 75% 的系统</li>
                <li>可将系统回收率提高 5~10%</li>
              </ul>
            </div>
            {interstagePumpParallel && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filterPumps(interstagePumpParallel.flowPerPump, interstagePumpHead).map((pump) => (
                  <div
                    key={pump.model}
                    onClick={() => onPumpConfigChange({ ...pumpConfig, interstagePump: pump.model })}
                    className={`
                      p-5 rounded-2xl border cursor-pointer transition-all
                      ${pumpConfig.interstagePump === pump.model 
                        ? 'border-data bg-data-muted shadow-sm' 
                        : 'border-border hover:border-data/40 hover:bg-data-muted/30'}
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">CDL系列</Badge>
                        <div className="font-semibold">{pump.model}</div>
                      </div>
                      {interstagePumpRec?.selected.model === pump.model && (
                        <Star className="w-4 h-4 text-data fill-data" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <div>流量: {pump.flow} m³/h</div>
                      <div>扬程: {pump.head} m</div>
                      <div>功率: {pump.motorPower} kW</div>
                      <div>效率: {pump.efficiency}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {interstagePumpRec && !pumpConfig.interstagePump && (
              <div className="mt-4 p-3 bg-data-muted rounded-xl text-sm">
                <span className="font-medium text-data">智能推荐：</span>
                <span className="text-data"> {interstagePumpRec.selected.model}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── UF 产水泵 ── */}
      {hasUF && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-flow" />
              超滤产水泵选型
            </CardTitle>
            <CardDescription>
              流量 {ufPumpFlow.toFixed(1)} m³/h（进水量 × 1.1，含反洗用水），扬程需求 ~{ufPumpHead} m
              {ufPumpParallel && ufPumpParallel.mode !== 'single' && (
                <Badge variant="secondary" className="ml-2">
                  {ufPumpParallel.mode === 'standby'
                    ? `1用1备（${ufPumpParallel.pumpCount + ufPumpParallel.standbyCount}台）`
                    : `${ufPumpParallel.pumpCount}用${ufPumpParallel.standbyCount}备`}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filterPumps(ufPumpParallel?.flowPerPump || ufPumpFlow, ufPumpHead).map((pump) => (
                <div key={pump.model}>
                  {renderPumpCard(
                    pump,
                    pumpConfig.ufPump === pump.model,
                    ufPumpRec?.selected.model === pump.model,
                    () => onPumpConfigChange({ ...pumpConfig, ufPump: pump.model })
                  )}
                </div>
              ))}
            </div>
            {ufPumpRec && !pumpConfig.ufPump && (
              <div className="mt-4 p-3 bg-flow-muted rounded-lg text-sm">
                <span className="font-medium text-flow">智能推荐：</span>
                <span className="text-flow"> {ufPumpRec.selected.model} — {ufPumpRec.reasoning}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 如果没有配置任何膜系统，给出提示 ── */}
      {!hasRO && !hasNF && !hasUF && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            请先在「工艺流程设计」步骤中添加膜系统（RO / NF / UF）以启用对应水泵选型
          </CardContent>
        </Card>
      )}

      {/* ── 产品数据库说明 ── */}
      <Card className="bg-muted/50">
        <CardContent className="p-5">
          <div className="text-sm text-muted-foreground">
            <strong>南方泵业 CDL系列</strong> — 数据来源：CDL(50Hz).xlsx 官方产品手册
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2 text-xs text-muted-foreground">
            <div>流量范围: {cdlPumpStats.flowRange.min}–{cdlPumpStats.flowRange.max} m³/h</div>
            <div>扬程范围: {cdlPumpStats.headRange.min}–{cdlPumpStats.headRange.max} m</div>
            <div>功率范围: {cdlPumpStats.powerRange.min}–{cdlPumpStats.powerRange.max} kW</div>
          </div>
          <div className="text-xs text-muted-foreground/60 mt-1">
            共计 {cdlPumps.length} 款产品可选
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
