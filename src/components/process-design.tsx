'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings2, 
  Plus, 
  Trash2, 
  GripVertical,
  Filter,
  Droplets,
  Zap,
  Beaker,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Layers,
  RefreshCw,
  Calculator,
  Info,
  AlertTriangle,
  Move,
  Settings,
  Ruler,
  FlaskConical,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { roMembranes, calculateMembraneCount, WaterSourceType, getElementsPerVesselOptions, getRecommendedElementsPerVessel, getAllROMembraneOptions, getROMembraneOptionsByBrand } from '@/lib/constants/membranes';
import { ufMembranes, UFMembrane, recommendUFMembrane, calculateUFSystem } from '@/lib/constants/uf-membranes';

// 工艺单元类型（移除了 tank 和 pump）
export type ProcessUnitType = 
  | 'filter_media'   // 多介质过滤器
  | 'filter_carbon'  // 活性炭过滤器
  | 'filter_softener'// 软化器
  | 'filter_precision' // 精密过滤器
  | 'uf'             // 超滤
  | 'nf'             // 纳滤
  | 'ro'             // 反渗透
  | 'edi'            // EDI
  | 'uv'             // 紫外消毒
  | 'ozone'          // 臭氧消毒
  | 'chemical'       // 加药装置
  | 'custom';        // 自定义

// 工艺单元接口
export interface ProcessUnit {
  id: string;
  type: ProcessUnitType;
  name: string;
  description?: string;
  params: Record<string, any>;
  config?: {
    model?: string;
    brand?: string;
    specs?: string;
    customParams?: CustomMembraneParams;  // 自定义膜参数
  };
}

// 精密过滤器精度选项
export const precisionFilterOptions = [
  { value: '100um', label: '100μm 袋式过滤', description: '粗过滤，保护超滤' },
  { value: '50um', label: '50μm 袋式过滤', description: '保护精密过滤器' },
  { value: '20um', label: '20μm 滤芯过滤', description: '中等精度' },
  { value: '10um', label: '10μm 滤芯过滤', description: '标准精度' },
  { value: '5um', label: '5μm 保安过滤', description: 'RO进水标准' },
  { value: '1um', label: '1μm 精密过滤', description: '高精度预处理' },
  { value: '0.45um', label: '0.45μm 微滤', description: '超纯水预处理' },
  { value: '0.22um', label: '0.22μm 除菌过滤', description: '除菌级过滤' },
];

// 自定义膜参数类型
export interface CustomMembraneParams {
  // === 基本规格 ===
  dimension: string;      // 膜尺寸 (8040/4040/2540)
  area: number;           // 有效膜面积 (ft²)
  category: string;       // 膜类型 (bw/le/sw/nf)
  
  // === 性能参数 ===
  rejection: number;      // 稳定脱盐率 (%)
  flow: number;           // 单支膜额定产水量 (GPD)
  maxPressure: number;    // 最大操作压力 (psi)
  testPressure: number;   // 测试压力 (psi)
  testTDS: number;        // 测试条件TDS (mg/L)
  testTemperature: number;// 测试温度 (℃)
  
  // === 品牌和型号信息（从膜数据库同步） ===
  brand?: string;        // 膜品牌 (如 'Dow Filmtec', 'LG', 'Sinaenro', '水泽盛业')
  model?: string;         // 膜型号 (如 'BW30-400', 'iFS-8040')
  
  // === 高级参数（可选，有默认值） ===
  boronRejection?: number;   // 硼去除率 (%)
  silicaRejection?: number;  // 二氧化硅去除率 (%)
  maxRecovery?: number;      // 最大单支回收率 (%)
  maxFeedSDI?: number;       // 最大进水SDI
  minFeedPressure?: number;  // 最低进水压力 (psi)
  phRange?: string;          // pH适用范围
  maxTemperature?: number;   // 最高操作温度 (℃)
}

// 膜类型选项
export const membraneCategoryOptions = [
  { value: 'bw', label: '苦咸水膜 (BW)', description: 'TDS < 5000 mg/L，操作压力 150-300 psi' },
  { value: 'le', label: '低能耗膜 (LE)', description: '节能型苦咸水膜，操作压力 100-200 psi' },
  { value: 'sw', label: '海水膜 (SW)', description: 'TDS > 10000 mg/L，操作压力 800-1200 psi' },
  { value: 'nf', label: '纳滤膜 (NF)', description: '部分脱盐，硬度去除率高' },
];

// 膜尺寸对应的默认参数
// v3.3修复：8040膜面积修正为中国标准370 ft²（原400 ft²为美国标准）
export const dimensionDefaults: Record<string, Partial<CustomMembraneParams>> = {
  '8040': { area: 370, flow: 10500, maxPressure: 600, testPressure: 225, testTDS: 2000, testTemperature: 25, maxRecovery: 15, maxFeedSDI: 5, minFeedPressure: 30, phRange: '3-10', maxTemperature: 45 },
  '4040': { area: 85, flow: 2200, maxPressure: 600, testPressure: 225, testTDS: 2000, testTemperature: 25, maxRecovery: 15, maxFeedSDI: 5, minFeedPressure: 30, phRange: '3-10', maxTemperature: 45 },
  '2540': { area: 28, flow: 700, maxPressure: 400, testPressure: 225, testTDS: 2000, testTemperature: 25, maxRecovery: 15, maxFeedSDI: 5, minFeedPressure: 20, phRange: '3-10', maxTemperature: 45 },
};

// 膜类型对应的默认参数
export const categoryDefaults: Record<string, Partial<CustomMembraneParams>> = {
  'bw': { rejection: 99.0, testPressure: 225, testTDS: 2000, maxPressure: 600, boronRejection: 92, silicaRejection: 96 },
  'le': { rejection: 98.0, testPressure: 150, testTDS: 500, maxPressure: 400, boronRejection: 90, silicaRejection: 95 },
  'sw': { rejection: 99.7, testPressure: 800, testTDS: 32000, maxPressure: 1200, boronRejection: 95, silicaRejection: 98 },
  'nf': { rejection: 85.0, testPressure: 100, testTDS: 500, maxPressure: 600, boronRejection: 50, silicaRejection: 90 },
};

// 自定义膜默认值
// v3.3修复：area修正为中国标准370 ft²
export const customMembraneDefaults: CustomMembraneParams = {
  dimension: '8040',
  area: 370,
  category: 'bw',
  rejection: 99.0,
  flow: 10500,
  maxPressure: 600,
  testPressure: 225,
  testTDS: 2000,
  testTemperature: 25,
  boronRejection: 92,
  silicaRejection: 96,
  maxRecovery: 15,
  maxFeedSDI: 5,
  minFeedPressure: 30,
  phRange: '3-10',
  maxTemperature: 45,
};

// 高级参数折叠区域子组件
function AdvancedParamsSection({ 
  customParams, 
  unitId, 
  updateUnitConfig 
}: { 
  customParams: CustomMembraneParams; 
  unitId: string; 
  updateUnitConfig: (id: string, config: Record<string, any>) => void;
}) {
  const [open, setOpen] = useState(false);
  const update = (key: keyof CustomMembraneParams, value: number | string | undefined) => {
    updateUnitConfig(unitId, { 
      customParams: { ...customParams, [key]: value }
    });
  };

  return (
    <div className="border-t border-tech/20 pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-tech hover:text-tech-foreground transition-colors w-full"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        高级参数（去除率 / 操作限制）
      </button>
      {open && (
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">硼去除率 (%)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="99"
              value={customParams.boronRejection ?? 92}
              onChange={(e) => update('boronRejection', parseFloat(e.target.value) || 0)}
              className="h-8 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">SiO₂去除率 (%)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="99.9"
              value={customParams.silicaRejection ?? 96}
              onChange={(e) => update('silicaRejection', parseFloat(e.target.value) || 0)}
              className="h-8 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">最大单支回收率 (%)</Label>
            <Input
              type="number"
              step="1"
              min="5"
              max="30"
              value={customParams.maxRecovery ?? 15}
              onChange={(e) => update('maxRecovery', parseFloat(e.target.value) || 15)}
              className="h-8 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">最大进水SDI</Label>
            <Input
              type="number"
              step="0.5"
              min="1"
              max="8"
              value={customParams.maxFeedSDI ?? 5}
              onChange={(e) => update('maxFeedSDI', parseFloat(e.target.value) || 5)}
              className="h-8 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">最低进水压力 (psi)</Label>
            <Input
              type="number"
              step="5"
              min="10"
              max="200"
              value={customParams.minFeedPressure ?? 30}
              onChange={(e) => update('minFeedPressure', parseFloat(e.target.value) || 30)}
              className="h-8 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">最高温度 (℃)</Label>
            <Input
              type="number"
              step="1"
              min="25"
              max="60"
              value={customParams.maxTemperature ?? 45}
              onChange={(e) => update('maxTemperature', parseFloat(e.target.value) || 45)}
              className="h-8 text-sm bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// 自定义膜实时计算预览子组件
function CustomMembranePreview({ customParams }: { customParams: CustomMembraneParams }) {
  const ft2ToM2 = 0.092903;
  const gpdToM3h = 0.000157725; // 1 GPD = 0.000157725 m³/h
  const areaM2 = customParams.area * ft2ToM2;
  const flowM3h = customParams.flow * gpdToM3h;
  const fluxGFD = customParams.area > 0 ? customParams.flow / customParams.area : 0; // GPD/ft² = GFD

  const pressureBar = (customParams.testPressure * 0.0689476).toFixed(1);
  const maxPressureBar = (customParams.maxPressure * 0.0689476).toFixed(1);

  return (
    <div className="bg-card rounded-lg p-3 space-y-2 border border-tech/10">
      <div className="text-xs text-tech font-medium flex items-center gap-1">
        <Calculator className="w-3 h-3" />
        参数换算预览
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="text-center">
          <div className="text-muted-foreground">膜面积</div>
          <div className="font-semibold text-foreground">{areaM2.toFixed(1)} m²</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">产水量</div>
          <div className="font-semibold text-foreground">{flowM3h.toFixed(2)} m³/h</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">设计通量</div>
          <div className="font-semibold text-foreground">{fluxGFD.toFixed(1)} GFD</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">测试压力</div>
          <div className="font-semibold text-foreground">{pressureBar} bar</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        <div>最大压力: {maxPressureBar} bar</div>
        <div>测试TDS: {customParams.testTDS} mg/L</div>
        <div>测试温度: {customParams.testTemperature}℃</div>
      </div>
      {customParams.maxRecovery !== undefined && (
        <div className="text-[11px] text-muted-foreground">
          系统回收率上限参考: {Math.min(85, customParams.maxRecovery * (customParams.dimension === '8040' ? 6 : customParams.dimension === '4040' ? 3 : 2))}% 
          <span className="text-muted-foreground/60 ml-1">（基于{customParams.maxRecovery}%单支回收率 × {customParams.dimension === '8040' ? '6支' : customParams.dimension === '4040' ? '3支' : '2支'}膜壳）</span>
        </div>
      )}
    </div>
  );
}

// 膜品牌类型
export type MembraneBrand = 'lg' | 'dow' | 'sinaenro' | 'shuize' | 'custom';

// v3.2遗留代码：以下品牌选项内嵌数据已废弃
// 新代码应使用 getROMembraneOptionsByBrand(brand) 从 membranes.ts 集中获取
// 此处保留用于向后兼容，待完全迁移后删除

// LG RO膜选项（根据LG膜手册数据）
// 注意：8040膜面积已修正为中国标准370 ft²（原400 ft²为美国标准）
export const lgROMembraneOptions: Array<{
  value: string;
  flow: number;
  rejection: number;
  area: number;
  dimension: string;
  category: string;
  description: string;
  pressure: number;
}> = [
  // LG 海水膜 SR系列（超高脱盐）
  { value: 'LG SW400SR', flow: 6000, rejection: 99.85, area: 370, dimension: '8040', category: 'sw-sr', description: '超高脱盐海水膜', pressure: 800 },
  { value: 'LG SW440SR', flow: 6600, rejection: 99.85, area: 370, dimension: '8040', category: 'sw-sr', description: '超高脱盐海水膜', pressure: 800 },
  // LG 海水膜 GR系列（高脱盐）
  { value: 'LG SW400GR', flow: 7500, rejection: 99.85, area: 370, dimension: '8040', category: 'sw-gr', description: '高脱盐海水膜', pressure: 800 },
  { value: 'LG SW440GR', flow: 8250, rejection: 99.85, area: 370, dimension: '8040', category: 'sw-gr', description: '高脱盐海水膜', pressure: 800 },
  // LG 苦咸水膜 ES R系列（高脱盐）
  { value: 'LG BW440ESR', flow: 12500, rejection: 99.8, area: 370, dimension: '8040', category: 'bw-esr', description: '高脱盐苦咸水膜', pressure: 225 },
  { value: 'LG BW400ESR', flow: 10500, rejection: 99.8, area: 370, dimension: '8040', category: 'bw-esr', description: '高脱盐苦咸水膜', pressure: 225 },
  // LG 苦咸水膜 ES L系列（节能耐污染）
  { value: 'LG BW400ESL', flow: 10500, rejection: 99.6, area: 370, dimension: '8040', category: 'bw-esl', description: '节能耐污染苦咸水膜', pressure: 150 },
];

// Dow Filmtec RO膜选项
// v3.3修复：8040膜面积修正为中国标准370 ft²（原400 ft²为美国标准）
export const dowROMembraneOptions: Array<{
  value: string;
  flow: number;
  rejection: number;
  area: number;
  dimension: string;
  category: string;
  description: string;
  pressure: number;
}> = [
  // 苦咸水膜 - 8英寸
  { value: 'BW30-400', flow: 10500, rejection: 99.5, area: 370, dimension: '8040', category: 'bw', description: '标准苦咸水膜', pressure: 225 },
  { value: 'BW30-400/34i', flow: 10500, rejection: 99.5, area: 370, dimension: '8040', category: 'bw', description: 'iLEC端面连接', pressure: 225 },
  { value: 'BW30-365', flow: 9500, rejection: 99.5, area: 365, dimension: '8040', category: 'bw', description: '标准型', pressure: 225 },
  { value: 'BW30HR-440i', flow: 11500, rejection: 99.7, area: 370, dimension: '8040', category: 'bw-hr', description: '高脱盐率', pressure: 225 },
  // 苦咸水膜 - 4英寸
  { value: 'BW30-4040', flow: 2400, rejection: 99.5, area: 85, dimension: '4040', category: 'bw', description: '4英寸小型膜', pressure: 225 },
  { value: 'BW30-2540', flow: 1300, rejection: 99.5, area: 45, dimension: '2540', category: 'bw', description: '2.5英寸微型膜', pressure: 225 },
  // 低能耗膜
  { value: 'BW30LE-440i', flow: 12000, rejection: 99.0, area: 370, dimension: '8040', category: 'le', description: '低能耗型', pressure: 150 },
  { value: 'LE-440i', flow: 11800, rejection: 99.0, area: 370, dimension: '8040', category: 'le', description: '低压高流量', pressure: 150 },
  // 海水膜
  { value: 'SW30HR-380', flow: 9500, rejection: 99.8, area: 380, dimension: '8040', category: 'sw', description: '海水淡化标准', pressure: 800 },
  { value: 'SW30HR-320', flow: 7500, rejection: 99.8, area: 320, dimension: '8040', category: 'sw', description: '海水淡化经济型', pressure: 800 },
  { value: 'SW30ULE-440i', flow: 11000, rejection: 99.85, area: 370, dimension: '8040', category: 'sw', description: '超低能耗海水膜', pressure: 800 },
  // 抗污染膜
  { value: 'BW30FR-365', flow: 9500, rejection: 99.5, area: 365, dimension: '8040', category: 'bw-fr', description: '抗污染型', pressure: 225 },
];

// Sinaenro 中化膜 RO膜选项（基于官网及行业数据）
// v3.3修复：8040膜面积修正为中国标准370 ft²
export const sinaenroROMembraneOptions: Array<{
  value: string;
  flow: number;
  rejection: number;
  area: number;
  dimension: string;
  category: string;
  description: string;
  pressure: number;
}> = [
  // 苦咸水膜 - 8英寸
  { value: 'SMR-BW8040-400', flow: 10500, rejection: 99.5, area: 370, dimension: '8040', category: 'bw', description: '标准苦咸水膜', pressure: 225 },
  { value: 'SMR-BW8040-440', flow: 11500, rejection: 99.5, area: 370, dimension: '8040', category: 'bw', description: '高产水量苦咸水膜', pressure: 225 },
  { value: 'SMR-BW8040-HR', flow: 10000, rejection: 99.7, area: 370, dimension: '8040', category: 'bw-hr', description: '高脱盐率苦咸水膜', pressure: 225 },
  { value: 'SMR-BW8040-FR', flow: 10000, rejection: 99.5, area: 370, dimension: '8040', category: 'bw-fr', description: '抗污染苦咸水膜', pressure: 225 },
  // 苦咸水膜 - 4英寸
  { value: 'SMR-BW4040', flow: 2400, rejection: 99.5, area: 85, dimension: '4040', category: 'bw', description: '4英寸苦咸水膜', pressure: 225 },
  // 低能耗膜
  { value: 'SMR-LE8040', flow: 11500, rejection: 99.0, area: 370, dimension: '8040', category: 'le', description: '低能耗苦咸水膜', pressure: 150 },
  { value: 'SMR-LE8040-HR', flow: 11000, rejection: 99.3, area: 370, dimension: '8040', category: 'le', description: '低能耗高脱盐膜', pressure: 150 },
  // 海水膜
  { value: 'SMR-SW8040', flow: 6000, rejection: 99.6, area: 370, dimension: '8040', category: 'sw', description: '标准海水淡化膜', pressure: 800 },
  { value: 'SMR-SW8040-HR', flow: 5500, rejection: 99.8, area: 380, dimension: '8040', category: 'sw', description: '高脱盐海水膜', pressure: 800 },
];

// 水泽盛业 iFS离子精筛膜 RO膜选项（基于阿拉尔现场实测数据 2025-08-05）
// 测试条件：进水EC 9000~15000 uS/cm (TDS ~4500~8500 mg/L)，压力1.5~2.0 MPa
// v3.3修复：area修正为中国标准370 ft²
export const shuizeROMembraneOptions: Array<{
  value: string;
  flow: number;
  rejection: number;
  area: number;
  dimension: string;
  category: string;
  description: string;
  pressure: number;
}> = [
  // iFS离子精筛膜 - 标准型 (150psi)
  // 实测：EC9000下脱盐率98.04-99.08%，EC15000下脱盐率98.31-98.65%
  // 离子精筛技术，高矿化度地下水适用，酸碱洗后性能恢复良好
  { value: 'iFS-8040', flow: 9500, rejection: 98.5, area: 370, dimension: '8040', category: 'bw', description: 'iFS离子精筛膜·高矿化度苦咸水', pressure: 150 },
  // iFS离子精筛膜 - 高截留型 (225psi)
  { value: 'iFS-8040HR', flow: 9000, rejection: 99.0, area: 370, dimension: '8040', category: 'bw', description: 'iFS离子精筛膜HR·高压高截留型', pressure: 225 },
];

// RO膜选项（统一格式，用于模拟计算）
// v3.2修复：从集中数据源获取（解决数据重复问题）
// 注意：8040膜面积修正为中国标准370 ft²（原400 ft²为美国标准）
// 这与membranes.ts中的getAllROMembraneOptions()保持一致
export const roMembraneOptions = getAllROMembraneOptions();

// 纳滤膜选项 - 显示膜尺寸信息
export const nfMembraneOptions: Array<{
  value: string;
  brand: string;
  flow: number;
  rejection: string;
  area: number;
  dimension: string;
  description: string;
}> = [
  // 自定义选项
  { value: 'custom', brand: '自定义', flow: 10000, rejection: '85', area: 400, dimension: '8040', description: '自定义纳滤膜' },
  // LG纳滤膜
  { value: 'LG NF-400', brand: 'LG', flow: 10000, rejection: '85-95', area: 400, dimension: '8040', description: 'LG纳滤膜' },
  // Dow纳滤膜
  { value: 'NF90-400', brand: 'Dow Filmtec', flow: 9000, rejection: '85-95%', area: 400, dimension: '8040', description: '高脱盐纳滤' },
  { value: 'NF270-400', brand: 'Dow Filmtec', flow: 11500, rejection: '40-60%', area: 400, dimension: '8040', description: '低压高流量' },
  { value: 'NF245-400', brand: 'Dow Filmtec', flow: 10500, rejection: '50-70%', area: 400, dimension: '8040', description: '脱色脱盐' },
  { value: 'NF90-2540', brand: 'Dow Filmtec', flow: 2000, rejection: '85-95%', area: 85, dimension: '2540', description: '2.5英寸纳滤膜' },
];

// 工艺单元模板（移除了 tank 和 pump）
const unitTemplates: Record<ProcessUnitType, Omit<ProcessUnit, 'id'>> = {
  filter_media: { type: 'filter_media', name: '多介质过滤器', params: { diameter: 1000, flow: 50 }, config: { specs: '石英砂+无烟煤' } },
  filter_carbon: { type: 'filter_carbon', name: '活性炭过滤器', params: { diameter: 1000, flow: 50 }, config: { specs: '活性炭' } },
  filter_softener: { type: 'filter_softener', name: '软化器', params: { diameter: 800, flow: 30 }, config: { specs: '钠离子交换' } },
  filter_precision: { type: 'filter_precision', name: '精密过滤器', params: { precision: '5um', flow: 50 }, config: { specs: '' } },
  uf: { type: 'uf', name: '超滤系统', params: { model: '', count: 10, flux: 65 }, config: { model: 'SFP-2880', brand: 'DuPont' } },
  nf: { type: 'nf', name: '纳滤系统', params: { model: '', stages: 2, elements: 20 }, config: { model: 'NF90-400', brand: 'Dow Filmtec' } },
  ro: { type: 'ro', name: '反渗透系统', params: { stages: 2, elements: 30, elementsPerVessel: 6 }, config: { model: '', brand: '' } },
  edi: { type: 'edi', name: 'EDI系统', params: { model: '', flow: 20 }, config: { model: '', brand: '' } },
  uv: { type: 'uv', name: '紫外消毒', params: { power: 40, flow: 50, dose: 40 }, config: { specs: '' } },
  ozone: { type: 'ozone', name: '臭氧消毒', params: { dose: 3, contactTime: 8 }, config: { specs: '' } },
  chemical: { type: 'chemical', name: '加药装置', params: { chemical: '阻垢剂', dose: 5 }, config: { specs: '' } },
  custom: { type: 'custom', name: '自定义设备', params: {}, config: {} }
};

interface ProcessDesignProps {
  processUnits: ProcessUnit[];
  onProcessUnitsChange: (units: ProcessUnit[]) => void;
  designFlow: { feed: number; permeate: number; recovery: number };
  onDesignFlowChange: (flow: { feed: number; permeate: number; recovery: number }) => void;
  inletWaterQuality: Record<string, any>;
  outletTargetQuality: Record<string, any>;
}

export function ProcessDesign({
  processUnits,
  onProcessUnitsChange,
  designFlow,
  onDesignFlowChange,
  inletWaterQuality,
  outletTargetQuality
}: ProcessDesignProps) {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('presets');
  const [roCalculation, setRoCalculation] = useState<Record<string, any>>({});
  const [calcWarnings, setCalcWarnings] = useState<Record<string, string[]>>({});
  
  // 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 根据水质判断水源类型
  const getWaterSourceType = useCallback((): WaterSourceType => {
    const tds = inletWaterQuality?.tds || 1000;
    if (tds > 10000) return 'seawater';
    
    // COD > 100 mg/L 且浊度 > 50 NTU 才判断为废水回用
    // 单纯COD较高可能是高有机物地下水或地表水，不是废水
    const cod = inletWaterQuality?.cod || 0;
    const turbidity = inletWaterQuality?.turbidity || 0;
    if (cod > 100 && turbidity > 50) return 'wastewater';
    
    // 高浊度 (>10 NTU) 判断为地表水
    if (turbidity > 10) return 'surface_water';
    
    return 'groundwater';
  }, [inletWaterQuality]);

  // 计算RO膜元件数量
  const calculateROElements = useCallback((unitId: string) => {
    const unit = processUnits.find(u => u.id === unitId);
    if (!unit || !designFlow.permeate) return;
    
    // === 识别当前RO在工艺流程中的位置（第几个RO） ===
    const roUnits = processUnits.filter(u => u.type === 'ro');
    const roIndex = roUnits.findIndex(u => u.id === unitId); // 0-based
    const isFirstRO = roIndex === 0;
    const isSecondRO = roIndex === 1;
    const roLabel = isFirstRO ? '一段RO' : isSecondRO ? '二段RO' : `第${roIndex + 1}段RO`;
    
    // === 根据RO位置确定该单元的实际进水量和产水量 ===
    // 一段RO：使用系统总设计流量
    // 二段RO：进水 = 一段RO产水（≈ 总产水量 / 二段回收率），产水 = 总目标产水量
    //   因为两级RO串联，二段只需要把一段产水进一步脱盐
    let unitFeedFlow = designFlow.feed;      // 该RO单元的进水量
    let unitPermeateFlow = designFlow.permeate; // 该RO单元的产水量
    let unitRecovery = designFlow.recovery / 100;
    
    if (!isFirstRO && roIndex >= 1) {
      // 二段及后续RO：进水是前一级RO的产水
      // 两级RO典型配置：一段RO回收率75%，产水TDS约30-50mg/L
      // 二段RO的进水流量 = 一段产水流量 ≈ 系统进水量 × 一段回收率
      // 二段RO的产水量 ≈ 二段进水量 × 二段回收率（需达到总目标产水量）
      const prevRecovery = (unit.params.stages || 2) === 1
        ? 0.75 : 0.50; // 前级RO段回收率估算
      
      // 保守估算：二段进水 ≈ 总产水量 / 二段回收率
      // 因为两级串联：总产水 = 一段产水 × 二段回收率
      const secondStageRecovery = 0.90; // 二段RO回收率通常90%+
      unitFeedFlow = Math.ceil(designFlow.permeate / secondStageRecovery);
      unitPermeateFlow = designFlow.permeate;
      unitRecovery = secondStageRecovery;
    }
    
    // 自定义膜模式：使用 customParams 构造虚拟膜对象
    if (unit.config?.brand === 'custom' && unit.config?.customParams) {
      const cp = unit.config.customParams;
      const mappedCategory = cp.category === 'sw' ? 'sw' : cp.category === 'le' ? 'le' : cp.category === 'nf' ? 'nf' : 'bw';
      const virtualMembrane: any = {
        model: `自定义(${cp.dimension}/${cp.rejection}%/${cp.flow}GPD)`,
        brand: '自定义',
        dimension: cp.dimension,
        flow: cp.flow,             // GPD
        rejection: cp.rejection,   // %
        area: cp.area,             // ft²
        pressure: cp.testPressure || cp.maxPressure || 225,
        category: mappedCategory
      };
      
      const hasUF = processUnits.some(u => u.type === 'uf');
      
      // 根据自定义膜类型智能推断水源类型，从而选择合适的设计通量
      let waterSourceType = getWaterSourceType();
      if (mappedCategory === 'sw') {
        // 海水膜 → 强制使用海水通量设计
        waterSourceType = 'seawater';
      } else if (mappedCategory === 'nf') {
        // 纳滤膜 → 使用适中通量
        waterSourceType = hasUF ? 'uf_permeate' : 'groundwater';
      } else if (mappedCategory === 'le') {
        // 低能耗膜 → 使用UF产水通量（低压力运行）
        waterSourceType = 'uf_permeate';
      }
      
      // 二段RO：进水为UF产水或一段RO产水，水质好，可用更高通量
      if (!isFirstRO) {
        waterSourceType = 'uf_permeate'; // RO产水水质远优于原水
      }
      
      const result = calculateMembraneCount(unitPermeateFlow, virtualMembrane, {
        recovery: unitRecovery * 100,
        stages: unit.params.stages || 2,
        elementsPerVessel: unit.params.elementsPerVessel || 6,
        waterSourceType,
        sdi: inletWaterQuality?.sdi,
        hasUF
      });
      
      updateUnitParams(unitId, { 
        elements: result.elements,
        vessels: result.vessels,
        stages: result.stageConfig.length,
        roUnitType: roLabel,
        unitFeedFlow,
        unitPermeateFlow
      });
      
      setRoCalculation(prev => ({ ...prev, [unitId]: { ...result, roLabel, unitFeedFlow, unitPermeateFlow } }));
      setCalcWarnings(prev => ({ ...prev, [unitId]: result.warnings }));
      return;
    }
    
    // 根据品牌在对应选项列表中查找膜数据
    const brand = unit.config?.brand || '';
    const model = unit.config?.model || '';
    
    // 首先尝试从 roMembranes 数据库查找
    let selectedMembrane: any = roMembranes.find(m => m.model === model);
    
    // 如果找不到，尝试从品牌选项列表查找（支持 LG / Sinaenro / 水泽盛业 / Dow Filmtec 等）
    if (!selectedMembrane && brand && model) {
      const brandOptions = brand === 'LG' ? lgROMembraneOptions
        : brand === 'Sinaenro' ? sinaenroROMembraneOptions
        : brand === '水泽盛业' ? shuizeROMembraneOptions
        : brand === 'Dow Filmtec' ? dowROMembraneOptions
        : brand === 'custom' ? [] // 自定义膜在customParams中处理
        : null;
      
      if (brandOptions) {
        const found = brandOptions.find((m: any) => m.value === model);
        if (found) {
          selectedMembrane = {
            model: found.value,
            brand: brand,
            flow: found.flow,
            rejection: found.rejection,
            area: found.area,
            dimension: found.dimension,
            pressure: found.pressure,
            category: found.category,
          };
        }
      }
    }
    
    if (!selectedMembrane && brand !== 'custom') {
      setCalcWarnings(prev => ({ ...prev, [unitId]: ['请先选择膜品牌和型号'] }));
      return;
    }
    
    const hasUF = processUnits.some(u => u.type === 'uf');
    
    // 二段RO：进水为一段RO产水，水质好，用更高设计通量
    let waterSourceType = getWaterSourceType();
    if (!isFirstRO) {
      waterSourceType = 'uf_permeate';
    }
    
    const result = calculateMembraneCount(unitPermeateFlow, selectedMembrane, {
      recovery: unitRecovery * 100,
      stages: unit.params.stages || 2,
      elementsPerVessel: unit.params.elementsPerVessel || 6,
      waterSourceType,
      sdi: inletWaterQuality?.sdi,
      hasUF
    });
    
    // 对命名品牌膜（非 custom），同步写入 customParams，
    // 确保模拟算法能读取到品牌/型号信息并应用厂商专用修正（如 iFS 高TDS稳定性修正）
    updateUnitConfig(unitId, {
      customParams: {
        rejection: selectedMembrane.rejection,
        flow: selectedMembrane.flow,
        area: selectedMembrane.area,
        testPressure: selectedMembrane.pressure,
        category: selectedMembrane.category,
        dimension: selectedMembrane.dimension,
        brand: selectedMembrane.brand,
        model: selectedMembrane.model,
      }
    });

    // 更新单元参数
    updateUnitParams(unitId, { 
      elements: result.elements,
      vessels: result.vessels,
      stages: result.stageConfig.length,
      roUnitType: roLabel,
      unitFeedFlow,
      unitPermeateFlow
    });
    
    // 保存计算结果用于显示（附带该RO单元的位置信息）
    setRoCalculation(prev => ({ ...prev, [unitId]: { ...result, roLabel, unitFeedFlow, unitPermeateFlow } }));
    setCalcWarnings(prev => ({ ...prev, [unitId]: result.warnings }));
  }, [processUnits, designFlow, inletWaterQuality, getWaterSourceType]);

  // 添加工艺单元
  const addUnit = (type: ProcessUnitType) => {
    const template = unitTemplates[type];
    const newUnit: ProcessUnit = {
      ...template,
      id: `unit_${Date.now()}`,
      params: { ...template.params },
      config: template.config ? { ...template.config } : undefined
    };
    onProcessUnitsChange([...processUnits, newUnit]);
  };

  // 删除工艺单元
  const removeUnit = (id: string) => {
    onProcessUnitsChange(processUnits.filter(u => u.id !== id));
    if (selectedUnit === id) setSelectedUnit(null);
  };

  // 更新工艺单元参数
  const updateUnitParams = (id: string, params: Record<string, any>) => {
    onProcessUnitsChange(
      processUnits.map(u => u.id === id ? { ...u, params: { ...u.params, ...params } } : u)
    );
  };

  // 更新工艺单元配置
  const updateUnitConfig = (id: string, config: Record<string, any>) => {
    onProcessUnitsChange(
      processUnits.map(u => u.id === id ? {
        ...u,
        config: u.config ? { ...u.config, ...config } : config
      } : u)
    );
  };

  // 同时更新 config 和 params（避免连续调用 updateUnitConfig + updateUnitParams 的竞态条件）
  const updateUnit = (id: string, config: Record<string, any> | undefined, params: Record<string, any> | undefined) => {
    onProcessUnitsChange(
      processUnits.map(u => u.id === id ? {
        ...u,
        ...(config ? { config: u.config ? { ...u.config, ...config } : config } : {}),
        ...(params ? { params: { ...u.params, ...params } } : {})
      } : u)
    );
  };

  // 快速添加预设工艺流程（移除了水泵和水箱）
  const addPresetProcess = (preset: 'simple_ro' | 'full_ro' | 'uf_ro' | 'nf_ro' | 'two_pass_ro') => {
    let units: ProcessUnit[] = [];
    
    switch (preset) {
      case 'simple_ro':
        units = [
          { id: `unit_${Date.now()}_1`, ...unitTemplates.filter_precision, params: { precision: '5um', flow: designFlow.feed } },
          { id: `unit_${Date.now()}_2`, ...unitTemplates.ro }
        ];
        break;
      case 'full_ro':
        units = [
          { id: `unit_${Date.now()}_1`, ...unitTemplates.filter_media },
          { id: `unit_${Date.now()}_2`, ...unitTemplates.filter_carbon },
          { id: `unit_${Date.now()}_3`, ...unitTemplates.filter_precision, params: { precision: '5um', flow: designFlow.feed } },
          { id: `unit_${Date.now()}_4`, ...unitTemplates.ro }
        ];
        break;
      case 'uf_ro':
        units = [
          { id: `unit_${Date.now()}_1`, ...unitTemplates.filter_precision, params: { precision: '100um', flow: designFlow.feed } },
          { id: `unit_${Date.now()}_2`, ...unitTemplates.uf },
          { id: `unit_${Date.now()}_3`, ...unitTemplates.filter_precision, params: { precision: '5um', flow: designFlow.feed }, name: '保安过滤器' },
          { id: `unit_${Date.now()}_4`, ...unitTemplates.ro }
        ];
        break;
      case 'nf_ro':
        units = [
          { id: `unit_${Date.now()}_1`, ...unitTemplates.filter_media },
          { id: `unit_${Date.now()}_2`, ...unitTemplates.filter_precision, params: { precision: '10um', flow: designFlow.feed } },
          { id: `unit_${Date.now()}_3`, ...unitTemplates.nf },
          { id: `unit_${Date.now()}_4`, ...unitTemplates.filter_precision, params: { precision: '5um', flow: designFlow.feed }, name: '保安过滤器' },
          { id: `unit_${Date.now()}_5`, ...unitTemplates.ro }
        ];
        break;
      case 'two_pass_ro':
        units = [
          { id: `unit_${Date.now()}_1`, ...unitTemplates.filter_media },
          { id: `unit_${Date.now()}_2`, ...unitTemplates.filter_precision, params: { precision: '5um', flow: designFlow.feed } },
          { id: `unit_${Date.now()}_3`, ...unitTemplates.ro, name: '一段RO' },
          { id: `unit_${Date.now()}_4`, ...unitTemplates.ro, name: '二段RO' }
        ];
        break;
    }
    
    onProcessUnitsChange(units);
  };

  // 获取单元图标
  const getUnitIcon = (type: ProcessUnitType) => {
    switch (type) {
      case 'filter_media':
      case 'filter_carbon':
      case 'filter_softener':
      case 'filter_precision': return <Filter className="w-5 h-5" />;
      case 'uf':
      case 'nf':
      case 'ro': return <Layers className="w-5 h-5" />;
      case 'edi': return <Zap className="w-5 h-5" />;
      case 'chemical': return <Beaker className="w-5 h-5" />;
      case 'uv': return <RefreshCw className="w-5 h-5" />;
      default: return <Settings2 className="w-5 h-5" />;
    }
  };

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    // 添加拖拽样式
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newUnits = [...processUnits];
    const [draggedUnit] = newUnits.splice(draggedIndex, 1);
    newUnits.splice(dropIndex, 0, draggedUnit);
    
    onProcessUnitsChange(newUnits);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 渲染单元配置面板
  const renderUnitConfig = (unit: ProcessUnit | undefined) => {
    // 防御性检查
    if (!unit || !unit.type) {
      return (
        <div className="text-center text-muted-foreground py-4">
          请选择一个工艺单元进行配置
        </div>
      );
    }
    
    switch (unit.type) {
      case 'filter_precision':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">过滤精度</Label>
              <Select
                value={unit.params.precision}
                onValueChange={(v) => updateUnitParams(unit.id, { precision: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择精度" />
                </SelectTrigger>
                <SelectContent>
                  {precisionFilterOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">处理流量 (m³/h)</Label>
              <Input
                type="number"
                value={unit.params.flow}
                onChange={(e) => updateUnitParams(unit.id, { flow: Number(e.target.value) })}
              />
            </div>
          </div>
        );
      
      case 'uf':
        const ufMembrane = ufMembranes.find(m => m.model === unit.config?.model);
        const ufCalc = unit.params.ufCalculation;
        
        // 计算UF膜组件数量
        const calculateUFElements = () => {
          if (!ufMembrane || !designFlow.feed) return;
          
          // 设计通量（根据水质调整）
          let designFlux = ufMembrane.flux;
          const turbidity = inletWaterQuality?.turbidity || 0;
          const cod = inletWaterQuality?.cod || 0;
          
          // 高浊度或高COD时降低通量
          if (turbidity > 50 || cod > 20) {
            designFlux = ufMembrane.flux * 0.7;
          } else if (turbidity > 20 || cod > 10) {
            designFlux = ufMembrane.flux * 0.85;
          }
          
          // 单支膜产水量 (m³/h) = 通量(LMH) × 膜面积(m²) / 1000
          const singleCapacity = (designFlux * ufMembrane.area) / 1000;
          
          // 需要的膜数量（考虑后续RO等工艺，UF产水需满足进水量）
          const requiredCount = Math.ceil(designFlow.feed / singleCapacity);
          
          // 总膜面积和实际产水量
          const totalArea = ufMembrane.area * requiredCount;
          const actualPermeate = (designFlux * totalArea) / 1000;
          
          // 更新参数
          updateUnitParams(unit.id, { 
            count: requiredCount,
            flux: Math.round(designFlux),
            ufCalculation: {
              singleCapacity: Math.round(singleCapacity * 100) / 100,
              totalArea,
              actualPermeate: Math.round(actualPermeate * 100) / 100,
              designFlux: Math.round(designFlux),
              reasoning: turbidity > 50 || cod > 20 
                ? `进水浊度${turbidity}NTU/COD ${cod}mg/L较高，设计通量降为${Math.round(designFlux)} LMH`
                : turbidity > 20 || cod > 10
                  ? `进水水质中等，设计通量调整为${Math.round(designFlux)} LMH`
                  : `标准设计通量${Math.round(designFlux)} LMH`
            }
          });
        };
        
        return (
          <div className="space-y-4">
            {/* 设计参数提示 */}
            <div className="bg-water-muted border border-water/20 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-water font-medium mb-1">
                <Info className="w-4 h-4" />
                设计参数
              </div>
              <div className="grid grid-cols-2 gap-2 text-water">
                <div>UF进水量: <strong>{designFlow.feed} m³/h</strong></div>
                <div>进水浊度: <strong>{inletWaterQuality?.turbidity || 0} NTU</strong></div>
              </div>
            </div>
            
            {/* 超滤膜型号选择 */}
            <div className="space-y-2">
              <Label className="text-sm">超滤膜型号</Label>
              <Select
                value={unit.config?.model}
                onValueChange={(v) => {
                  const selected = ufMembranes.find(m => m.model === v);
                  updateUnitConfig(unit.id, { model: v, brand: selected?.brand });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择膜型号" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {/* DuPont SFP系列 */}
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">DuPont SFP系列 (外压式PVDF)</div>
                  {ufMembranes.filter(m => m.brand === 'DuPont' && m.model.startsWith('SFP')).map(m => (
                    <SelectItem key={m.model} value={m.model}>
                      <div className="py-1">
                        <div className="font-medium">{m.model}</div>
                        <div className="text-xs text-muted-foreground">
                          孔径{m.poreSize} | {m.area}m² | {m.length}×{m.diameter}mm | {m.flux}LMH
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {/* DuPont SFD系列 */}
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">DuPont SFD系列 (内压式PVDF)</div>
                  {ufMembranes.filter(m => m.brand === 'DuPont' && m.model.startsWith('SFD')).map(m => (
                    <SelectItem key={m.model} value={m.model}>
                      <div className="py-1">
                        <div className="font-medium">{m.model}</div>
                        <div className="text-xs text-muted-foreground">
                          孔径{m.poreSize} | {m.area}m² | {m.length}×{m.diameter}mm | {m.flux}LMH
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {/* Toray */}
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">Toray HFU系列 (PVDF)</div>
                  {ufMembranes.filter(m => m.brand === 'Toray').map(m => (
                    <SelectItem key={m.model} value={m.model}>
                      <div className="py-1">
                        <div className="font-medium">{m.model}</div>
                        <div className="text-xs text-muted-foreground">
                          孔径{m.poreSize} | {m.area}m² | {m.length}×{m.diameter}mm | {m.flux}LMH
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {/* 国产品牌 */}
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">国产 (立升/美能)</div>
                  {ufMembranes.filter(m => m.brand === 'Litree' || m.brand === 'Memstar').map(m => (
                    <SelectItem key={m.model} value={m.model}>
                      <div className="py-1">
                        <div className="font-medium">{m.model}</div>
                        <div className="text-xs text-muted-foreground">
                          孔径{m.poreSize} | {m.area}m² | {m.length}×{m.diameter}mm | {m.flux}LMH
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 膜详细参数显示 */}
            {ufMembrane && (
              <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
                <div className="text-sm font-medium text-foreground mb-2">膜参数详情</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">孔径:</span>
                    <span className="font-medium">{ufMembrane.poreSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">截留分子量:</span>
                    <span className="font-medium">{ufMembrane.mwco} kDa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">膜面积:</span>
                    <span className="font-medium">{ufMembrane.area} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">材质:</span>
                    <span className="font-medium">{ufMembrane.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">类型:</span>
                    <span className="font-medium">{ufMembrane.type === 'outside-in' ? '外压式' : '内压式'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">尺寸:</span>
                    <span className="font-medium">{ufMembrane.length}×{ufMembrane.diameter}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">标准通量:</span>
                    <span className="font-medium">{ufMembrane.flux} LMH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">最高压力:</span>
                    <span className="font-medium">{ufMembrane.maxPressure} bar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">pH范围:</span>
                    <span className="font-medium">{ufMembrane.phRange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">耐氯:</span>
                    <span className="font-medium">{ufMembrane.maxChlorine} mg/L</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                  {ufMembrane.description}
                </div>
              </div>
            )}
            
            {/* 自动计算按钮 */}
            <Button 
              onClick={calculateUFElements}
              className="w-full"
              disabled={!unit.config?.model || !designFlow.feed}
            >
              <Calculator className="w-4 h-4 mr-2" />
              自动计算膜组件数量
            </Button>
            
            {/* 计算结果 */}
            {ufCalc && (
              <div className="bg-success-muted border border-success/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-success font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  计算结果
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">{unit.params.count}</div>
                    <div className="text-xs text-muted-foreground">膜组件数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">{ufCalc.totalArea}</div>
                    <div className="text-xs text-muted-foreground">总膜面积m²</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">{ufCalc.designFlux}</div>
                    <div className="text-xs text-muted-foreground">设计通量LMH</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground border-t border-success/20 pt-2">
                  {ufCalc.reasoning}
                </div>
                <div className="text-xs text-muted-foreground">
                  单支产水量: {ufCalc.singleCapacity} m³/h | 总产水量: {ufCalc.actualPermeate} m³/h
                </div>
              </div>
            )}
            
            {/* 手动输入 */}
            <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">或手动输入膜组件数</Label>
                <Input
                  type="number"
                  value={unit.params.count || ''}
                  onChange={(e) => updateUnitParams(unit.id, { count: Number(e.target.value) })}
                  placeholder="膜组件数"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">设计通量 (LMH)</Label>
                <Input
                  type="number"
                  value={unit.params.flux || ''}
                  onChange={(e) => updateUnitParams(unit.id, { flux: Number(e.target.value) })}
                  placeholder="通量"
                />
              </div>
            </div>
          </div>
        );
      
      case 'ro': {
        const calc = roCalculation[unit.id];
        const warnings = calcWarnings[unit.id] || [];
        
        // 获取当前选择的膜信息
        const currentROModel = roMembraneOptions.find(o => o.value === unit.config?.model);
        
        // 根据品牌获取膜选项
        const getMembraneOptionsByBrand = (brand: string) => {
          if (!brand) return [];
          if (brand === 'custom') {
            return [{ value: 'custom', label: '自定义膜参数', flow: 10500, rejection: 98.5, dimension: '8040', description: '自定义脱盐率和流量' }];
          }
          if (brand === 'LG') {
            return lgROMembraneOptions.map(m => ({
              value: m.value, label: m.value, flow: m.flow, rejection: m.rejection,
              dimension: m.dimension, description: `${m.description} | ${m.flow}GPD | ${m.dimension} | 脱盐${m.rejection}%`
            }));
          }
          if (brand === 'Sinaenro') {
            return sinaenroROMembraneOptions.map(m => ({
              value: m.value, label: m.value, flow: m.flow, rejection: m.rejection,
              dimension: m.dimension, description: `${m.description} | ${m.flow}GPD | ${m.dimension} | 脱盐${m.rejection}%`
            }));
          }
          if (brand === '水泽盛业') {
            return shuizeROMembraneOptions.map(m => ({
              value: m.value, label: m.value, flow: m.flow, rejection: m.rejection,
              dimension: m.dimension, description: `${m.description} | ${m.flow}GPD | ${m.dimension} | 脱盐${m.rejection}%`
            }));
          }
          return dowROMembraneOptions.map(m => ({
            value: m.value, label: m.value, flow: m.flow, rejection: m.rejection,
            dimension: m.dimension, description: `${m.description} | ${m.flow}GPD | ${m.dimension} | 脱盐${m.rejection}%`
          }));
        };

        const currentBrand = unit.config?.brand || '';
        const currentModel = unit.config?.model || '';
        const currentMembraneOptions = getMembraneOptionsByBrand(currentBrand);
        const isCustomRO = currentBrand === 'custom';
        const customParams = unit.config?.customParams || customMembraneDefaults;
        const currentRODimension = currentROModel?.dimension || (isCustomRO ? customParams.dimension : '8040');
        const roSizeRecommendation = getRecommendedElementsPerVessel(currentRODimension);
        const elementsPerVesselOptions = getElementsPerVesselOptions(currentRODimension, isCustomRO);
        
        // 推荐段数：基于产水量和TDS自动推算
        const tdsForRec = inletWaterQuality?.tds || 1000;
        const permeateForRec = designFlow.permeate || 0;
        const recommendedStages = tdsForRec > 10000 ? 1 : (tdsForRec > 5000 || permeateForRec > 100) ? 3 : permeateForRec > 40 ? 2 : 1;
        const autoStagesLabel = recommendedStages === 1 ? '一段式' : recommendedStages === 2 ? '两段式' : '三段式';

        return (
          <div className="space-y-4">
            {/* 设计参数提示 */}
            <div className="bg-water-muted border border-water/20 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-water font-medium mb-1">
                <Info className="w-4 h-4" />
                设计参数
                {calc?.roLabel && (
                  <Badge variant="outline" className="ml-auto text-[10px] h-5 bg-water/20 text-water border-water/30">
                    {calc.roLabel}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-water">
                <div>
                  <div className="text-[10px] text-water/60">进水量</div>
                  <div className="font-semibold">{calc?.unitFeedFlow?.toFixed(1) || designFlow.feed} m³/h</div>
                </div>
                <div>
                  <div className="text-[10px] text-water/60">目标产水量</div>
                  <div className="font-semibold">{calc?.unitPermeateFlow?.toFixed(1) || designFlow.permeate} m³/h</div>
                </div>
                <div>
                  <div className="text-[10px] text-water/60">回收率</div>
                  <div className="font-semibold">{designFlow.recovery}%</div>
                </div>
              </div>
              {calc?.roLabel && calc.roLabel !== '一段RO' && (
                <div className="mt-1.5 text-[10px] text-water/70 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {calc.roLabel}进水为前级RO产水，水质好，设计通量已自动提高
                </div>
              )}
            </div>
            
            {/* ① 品牌选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">膜品牌</Label>
              <Select
                value={currentBrand || undefined}
                onValueChange={(v) => {
                  if (v === 'custom') {
                    const defaults = { ...customMembraneDefaults };
                    const recommendation = getRecommendedElementsPerVessel(defaults.dimension);
                    updateUnit(unit.id, 
                      { brand: 'custom', model: 'custom', customParams: defaults },
                      { elementsPerVessel: recommendation.default, stages: recommendedStages }
                    );
                  } else {
                    updateUnit(unit.id, 
                      { brand: v, model: '', customParams: undefined },
                      { stages: recommendedStages }
                    );
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择膜品牌" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LG">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium">LG</span>
                      <span className="text-xs text-muted-foreground">韩国 · 薄膜纳米复合</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Dow Filmtec">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium">Dow Filmtec</span>
                      <span className="text-xs text-muted-foreground">杜邦 · 聚酰胺技术</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Sinaenro">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium">Sinaenro</span>
                      <span className="text-xs text-muted-foreground">中化膜 · 国产高端</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="水泽盛业">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium">水泽盛业</span>
                      <span className="text-xs text-muted-foreground">iFS离子精筛膜 · 高矿化度专用</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium">自定义</span>
                      <span className="text-xs text-muted-foreground">手动设置参数</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* ② RO膜型号 / 自定义参数 */}
            {isCustomRO ? (
              <div className="space-y-3">
                <Label className="text-sm">自定义膜参数</Label>
                <div className="bg-gradient-to-br from-tech-muted to-data-muted border border-tech/20 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-tech font-semibold">
                      <Settings className="w-4 h-4" />
                      膜参数配置
                    </div>
                    <Badge variant="outline" className="bg-tech-muted text-tech border-tech/30 text-xs">
                      {customParams.rejection}% | {customParams.flow} GPD
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-tech font-medium">膜尺寸</Label>
                    <Select
                      value={customParams.dimension}
                      onValueChange={(v) => {
                        const dimDefaults = dimensionDefaults[v] || {};
                        const catDefaults = categoryDefaults[customParams.category] || {};
                        const recommendation = getRecommendedElementsPerVessel(v);
                        onProcessUnitsChange(processUnits.map(u => u.id === unit.id ? {
                          ...u,
                          config: { ...u.config, customParams: { 
                            ...customMembraneDefaults, ...catDefaults, ...dimDefaults,
                            dimension: v, category: customParams.category,
                            rejection: customParams.rejection, flow: customParams.flow
                          }},
                          params: { ...u.params, elementsPerVessel: recommendation.default }
                        } : u));
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm bg-background">
                        <SelectValue placeholder="选择尺寸" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8040">8英寸 (8040) - 商用/工业</SelectItem>
                        <SelectItem value="4040">4英寸 (4040) - 小型商用</SelectItem>
                        <SelectItem value="2540">2.5英寸 (2540) - 家用/实验</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-tech font-medium mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" />核心性能参数
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">稳定脱盐率 (%)</Label>
                        <Input type="number" step="0.1" min="50" max="99.99" value={customParams.rejection}
                          onChange={(e) => updateUnitConfig(unit.id, { customParams: { ...customParams, rejection: parseFloat(e.target.value) || 99 } })}
                          className="h-9 text-sm bg-background" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">单支产水量 (GPD)</Label>
                        <Input type="number" step="100" min="100" max="50000" value={customParams.flow}
                          onChange={(e) => updateUnitConfig(unit.id, { customParams: { ...customParams, flow: parseFloat(e.target.value) || 0 } })}
                          className="h-9 text-sm bg-background" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-tech font-medium mb-2 flex items-center gap-1">
                      <Ruler className="w-3 h-3" />物理规格
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">膜面积 (ft²)</Label>
                        <Input type="number" step="5" min="10" max="1200" value={customParams.area}
                          onChange={(e) => updateUnitConfig(unit.id, { customParams: { ...customParams, area: parseFloat(e.target.value) || 0 } })}
                          className="h-9 text-sm bg-background" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">测试压力 (psi)</Label>
                        <Input type="number" step="10" min="50" max="1500" value={customParams.testPressure}
                          onChange={(e) => updateUnitConfig(unit.id, { customParams: { ...customParams, testPressure: parseFloat(e.target.value) || 225 } })}
                          className="h-9 text-sm bg-background" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">最大压力 (psi)</Label>
                        <Input type="number" step="50" min="100" max="1500" value={customParams.maxPressure}
                          onChange={(e) => updateUnitConfig(unit.id, { customParams: { ...customParams, maxPressure: parseFloat(e.target.value) || 600 } })}
                          className="h-9 text-sm bg-background" />
                      </div>
                    </div>
                  </div>
                  <AdvancedParamsSection customParams={customParams} unitId={unit.id} updateUnitConfig={updateUnitConfig} />
                  <CustomMembranePreview customParams={customParams} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  RO膜型号
                  {!currentBrand && <span className="text-warning text-xs ml-1">(请先选择品牌)</span>}
                </Label>
                <Select
                  value={currentModel || undefined}
                  disabled={!currentBrand}
                  onValueChange={(v) => {
                    const selected = currentMembraneOptions.find(o => o.value === v);
                    const recommendation = getRecommendedElementsPerVessel(selected?.dimension || '8040');
                    updateUnit(unit.id, { model: v, brand: currentBrand }, { elementsPerVessel: recommendation.default });
                    // 选完型号后自动触发计算（放到 setTimeout 中确保状态已更新）
                    setTimeout(() => calculateROElements(unit.id), 50);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={currentBrand ? "选择膜型号" : "请先选择品牌"} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentMembraneOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-[#86868B]">{opt.dimension}</span>
                          <span className="text-xs text-[#16A34A]">脱盐率{opt.rejection}%</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* 膜规格提示 - 只保留 8040 和脱盐率 */}
            {currentROModel && !isCustomRO && (
              <div className="bg-[#F5F5F7] dark:bg-[#2D2D2D] rounded-full px-4 py-2 flex items-center justify-center gap-3">
                <span className="text-sm font-bold text-[#0071E3]">{currentROModel.dimension}</span>
                <span className="text-xs text-[#86868B]">·</span>
                <span className="text-sm font-semibold text-[#16A34A]">脱盐率 {currentROModel.rejection}%</span>
              </div>
            )}

            {/* ③ 智能配置区 — 系统自动计算，可手动修改 */}
            <div className="bg-gradient-to-br from-success-muted/60 to-water-muted/40 border border-success/20 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                  <Calculator className="w-3.5 h-3.5" />
                  系统配置（自动计算，可修改）
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => calculateROElements(unit.id)}
                  disabled={!unit.config?.model || !designFlow.permeate}
                  className="h-7 text-xs border-success/30 text-success hover:bg-success/10"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  重新计算
                </Button>
              </div>

              {/* 段数 — 自动推算，可修改 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">段数</Label>
                  <span className="text-[10px] text-success/70">
                    自动推荐: {autoStagesLabel}（TDS={tdsForRec}mg/L，产水={permeateForRec}m³/h）
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateUnitParams(unit.id, { stages: s })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        (unit.params.stages || recommendedStages) === s
                          ? 'bg-success text-success-foreground border-success shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:border-success/40'
                      }`}
                    >
                      {s === 1 ? '一段' : s === 2 ? '两段' : '三段'}
                      {s === recommendedStages && <span className="ml-1 opacity-60">★</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 每支膜壳装膜数 — 自动推荐，可修改 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">每膜壳支数</Label>
                  <span className="text-[10px] text-success/70">
                    推荐: {roSizeRecommendation.default}支（{roSizeRecommendation.description}）
                  </span>
                </div>
                <div className="flex gap-1">
                  {elementsPerVesselOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateUnitParams(unit.id, { elementsPerVessel: opt.value })}
                      className={`flex-1 py-1.5 rounded text-xs font-medium border transition-all ${
                        (unit.params.elementsPerVessel || roSizeRecommendation.default) === opt.value
                          ? 'bg-water text-water-foreground border-water shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:border-water/40'
                      }`}
                    >
                      {opt.value}支
                      {opt.value === roSizeRecommendation.default && <span className="ml-0.5 opacity-60">★</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 计算结果展示 */}
              {calc ? (
                <div className="space-y-2 pt-1 border-t border-success/20">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '膜元件数', value: calc.elements, unit: '支' },
                      { label: '膜壳数', value: calc.vessels, unit: '支' },
                      { label: '实际通量', value: calc.actualFlux, unit: 'GFD' },
                      { label: '浓水/元件', value: calc.concentratePerElement, unit: 'GPM' },
                    ].map(item => (
                      <div key={item.label} className="text-center bg-background/80 rounded-lg py-2 px-1 border border-success/10">
                        <div className="text-base font-bold text-success">{item.value}</div>
                        <div className="text-[10px] text-muted-foreground">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground/60">{item.unit}</div>
                      </div>
                    ))}
                  </div>
                  {calc.stageConfig && calc.stageConfig.length > 0 && (
                    <div className="space-y-1.5">
                      {calc.stageConfig.map((stage: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#2D2D2D] rounded-full px-4 py-1.5 animate-in slide-in-from-right-4 duration-300"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0071E3] text-white font-medium">段{stage.stage}</span>
                            <span className="text-xs text-muted-foreground">膜壳</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-[#16A34A]">{stage.vessels}</span>
                            <span className="text-xs text-[#86868B]">·</span>
                            <span className="text-xs text-muted-foreground">支膜</span>
                            <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{stage.elements}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>设计通量: {calc.designFlux} GFD</span>
                    <span>浓水流量: {calc.concentrateFlow} m³/h</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground/70 text-center py-2">
                  {unit.config?.model ? '点击「重新计算」查看配置结果' : '选择膜型号后将自动计算配置'}
                </div>
              )}
            </div>
            
            {/* 警告信息 */}
            {warnings.length > 0 && (
              <Alert variant="destructive" className="bg-warning-muted border-warning/30 text-warning-foreground">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {/* 手动输入元件数（覆盖） */}
            <div className="border-t border-border pt-2">
              <Label className="text-xs text-muted-foreground">手动输入膜元件总数（覆盖计算值）</Label>
              <Input
                type="number"
                value={unit.params.elements || ''}
                onChange={(e) => updateUnitParams(unit.id, { elements: Number(e.target.value) })}
                placeholder="留空则使用自动计算值…"
                className="mt-1.5 h-8 text-sm"
              />
            </div>
          </div>
        );
      }

      case 'nf':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">纳滤膜型号</Label>
              <Select
                value={unit.config?.model}
                onValueChange={(v) => {
                  const selected = nfMembraneOptions.find(o => o.value === v);
                  updateUnitConfig(unit.id, { model: v, brand: selected?.brand });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择膜型号" />
                </SelectTrigger>
                <SelectContent>
                  {nfMembraneOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{opt.value}</span>
                        <span className="text-xs text-[#86868B]">{opt.dimension}</span>
                        <span className="text-xs text-[#16A34A]">脱盐率{opt.rejection}%</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">段数</Label>
                <Input
                  type="number"
                  value={unit.params.stages}
                  onChange={(e) => updateUnitParams(unit.id, { stages: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">膜元件数</Label>
                <Input
                  type="number"
                  value={unit.params.elements}
                  onChange={(e) => updateUnitParams(unit.id, { elements: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        );

      case 'filter_media':
      case 'filter_carbon':
      case 'filter_softener':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">直径 (mm)</Label>
                <Input
                  type="number"
                  value={unit.params.diameter}
                  onChange={(e) => updateUnitParams(unit.id, { diameter: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">处理流量 (m³/h)</Label>
                <Input
                  type="number"
                  value={unit.params.flow}
                  onChange={(e) => updateUnitParams(unit.id, { flow: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">规格说明</Label>
              <Input
                value={unit.config?.specs || ''}
                onChange={(e) => updateUnitConfig(unit.id, { specs: e.target.value })}
              />
            </div>
          </div>
        );

      case 'uv':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">功率 (W)</Label>
                <Input
                  type="number"
                  value={unit.params.power}
                  onChange={(e) => updateUnitParams(unit.id, { power: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">处理流量 (m³/h)</Label>
                <Input
                  type="number"
                  value={unit.params.flow}
                  onChange={(e) => updateUnitParams(unit.id, { flow: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        );

      case 'chemical':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">药剂类型</Label>
              <Select
                value={unit.params.chemical}
                onValueChange={(v) => updateUnitParams(unit.id, { chemical: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="阻垢剂">阻垢剂</SelectItem>
                  <SelectItem value="杀菌剂">杀菌剂</SelectItem>
                  <SelectItem value="还原剂">还原剂</SelectItem>
                  <SelectItem value="pH调节剂">pH调节剂</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">投加量 (ppm)</Label>
              <Input
                type="number"
                value={unit.params.dose}
                onChange={(e) => updateUnitParams(unit.id, { dose: Number(e.target.value) })}
              />
            </div>
          </div>
        );

      case 'edi':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">产水量 (m³/h)</Label>
              <Input
                type="number"
                value={unit.params.flow}
                onChange={(e) => updateUnitParams(unit.id, { flow: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">型号</Label>
              <Input
                value={unit.config?.model || ''}
                onChange={(e) => updateUnitConfig(unit.id, { model: e.target.value })}
              />
            </div>
          </div>
        );

      case 'ozone':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">投加量 (mg/L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={unit.params.dose || 3}
                  onChange={(e) => updateUnitParams(unit.id, { dose: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">接触时间 (min)</Label>
                <Input
                  type="number"
                  value={unit.params.contactTime || 8}
                  onChange={(e) => updateUnitParams(unit.id, { contactTime: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">规格说明</Label>
              <Input
                value={unit.config?.specs || ''}
                onChange={(e) => updateUnitConfig(unit.id, { specs: e.target.value })}
                placeholder="如：臭氧发生器型号、功率等"
              />
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">设备名称</Label>
              <Input
                value={unit.name || ''}
                onChange={(e) => {
                  const updatedUnits = processUnits.map(u => 
                    u.id === unit.id ? { ...u, name: e.target.value } : u
                  );
                  onProcessUnitsChange(updatedUnits);
                }}
                placeholder="输入设备名称"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">规格说明</Label>
              <Input
                value={unit.config?.specs || ''}
                onChange={(e) => updateUnitConfig(unit.id, { specs: e.target.value })}
                placeholder="输入设备规格"
              />
            </div>
          </div>
        );

      default:
        return <div className="text-muted-foreground text-sm">暂无配置项</div>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">工艺流程设计</h2>
          <p className="text-xs text-muted-foreground mt-0.5">拖拽调整顺序，点击配置参数</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 左侧：设计参数和流程 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 设计流量参数 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Droplets className="w-4 h-4 text-water" />
                设计流量参数
              </CardTitle>
              <CardDescription className="text-xs">以产水量和回收率为主要设计参数</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">产水量 (m³/h) *</Label>
                  <Input
                    type="number"
                    value={designFlow.permeate || ''}
                    onChange={(e) => {
                      const permeate = Number(e.target.value);
                      const recovery = designFlow.recovery || 75;
                      const feed = recovery > 0 ? Math.ceil(permeate / (recovery / 100) * 10) / 10 : permeate;
                      onDesignFlowChange({ ...designFlow, permeate, feed });
                    }}
                    placeholder="输入产水量"
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">目标产水量</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">回收率 (%) *</Label>
                  <Select
                    value={designFlow.recovery?.toString() || '75'}
                    onValueChange={(v) => {
                      const recovery = Number(v);
                      const feed = designFlow.permeate > 0 
                        ? Math.ceil(designFlow.permeate / (recovery / 100) * 10) / 10 
                        : designFlow.feed;
                      onDesignFlowChange({ ...designFlow, recovery, feed });
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50% - 高盐度水</SelectItem>
                      <SelectItem value="60">60% - 海水淡化</SelectItem>
                      <SelectItem value="70">70% - 标准苦咸水</SelectItem>
                      <SelectItem value="75">75% - 标准设计</SelectItem>
                      <SelectItem value="80">80% - 高回收率</SelectItem>
                      <SelectItem value="85">85% - 超高回收率</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">系统水回收率</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">进水量 (m³/h)</Label>
                  <div className="flex items-center h-9 px-3 rounded-md border border-success/30 bg-success-muted text-success font-medium text-sm">
                    {designFlow.feed ? `${designFlow.feed} m³/h` : '自动计算'}
                  </div>
                  <p className="text-[10px] text-muted-foreground">自动计算</p>
                </div>
              </div>
              

            </CardContent>
          </Card>

          {/* 快速预设 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">快速预设工艺</CardTitle>
              <CardDescription className="text-xs">选择预设流程快速开始设计</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-5 gap-1.5">
                <button type="button" onClick={() => addPresetProcess('simple_ro')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:border-water/40 hover:bg-water-muted/50 transition-all text-xs font-medium">
                  <Layers className="w-4 h-4 text-water" />
                  简单RO
                </button>
                <button type="button" onClick={() => addPresetProcess('full_ro')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:border-tech/40 hover:bg-tech-muted/50 transition-all text-xs font-medium">
                  <Filter className="w-4 h-4 text-tech" />
                  完整预处理+RO
                </button>
                <button type="button" onClick={() => addPresetProcess('uf_ro')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:border-flow/40 hover:bg-flow-muted/50 transition-all text-xs font-medium">
                  <Droplets className="w-4 h-4 text-flow" />
                  UF+RO双膜法
                </button>
                <button type="button" onClick={() => addPresetProcess('nf_ro')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:border-data/40 hover:bg-data-muted/50 transition-all text-xs font-medium">
                  <Settings2 className="w-4 h-4 text-data" />
                  NF+RO组合
                </button>
                <button type="button" onClick={() => addPresetProcess('two_pass_ro')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:border-ai/40 hover:bg-ai-muted/50 transition-all text-xs font-medium">
                  <Zap className="w-4 h-4 text-ai" />
                  两级RO
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 工艺流程可视化 - 支持拖拽 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Move className="w-3.5 h-3.5" />
                工艺流程
                <span className="text-[10px] font-normal text-muted-foreground">（拖拽调整顺序）</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {processUnits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Settings2 className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium">尚未添加工艺单元</p>
                  <p className="text-xs mt-1">从右侧添加或选择上方预设工艺</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {processUnits.map((unit, index) => (
                    <div
                      key={unit.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => setSelectedUnit(unit.id)}
                      className={`
                        flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all
                        ${selectedUnit === unit.id 
                          ? 'border-water bg-water-muted shadow-sm shadow-water/10' 
                          : 'border-border/80 hover:border-muted-foreground/30 hover:bg-muted/30'}
                        ${draggedIndex === index ? 'opacity-50' : ''}
                        ${dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-t-water' : ''}
                      `}
                    >
                      <div className="flex items-center gap-1 text-muted-foreground/50 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold w-4 text-center">{index + 1}</span>
                      </div>
                      
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                        ${selectedUnit === unit.id ? 'bg-water/15 text-water shadow-sm' : 'bg-muted text-muted-foreground'}
                      `}>
                        {getUnitIcon(unit.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs">{unit.name}</div>
                        {(unit.config?.model || (unit.type === 'filter_precision' && unit.params.precision)) && (
                          <div className="text-[10px] text-muted-foreground truncate">{unit.config?.model || unit.params.precision}</div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); removeUnit(unit.id); }}
                        className="text-muted-foreground hover:text-destructive shrink-0 h-7 w-7 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：添加和配置 */}
        <div className="space-y-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="presets" className="text-xs">添加单元</TabsTrigger>
              <TabsTrigger value="config" className="text-xs">配置</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="mt-3 space-y-3">
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs">添加工艺单元</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                  {[
                    { type: 'filter_media' as const, label: '多介质', icon: Filter },
                    { type: 'filter_carbon' as const, label: '活性炭', icon: Filter },
                    { type: 'filter_softener' as const, label: '软化器', icon: Filter },
                    { type: 'filter_precision' as const, label: '精滤', icon: Filter },
                    { type: 'uf' as const, label: '超滤UF', icon: Droplets },
                    { type: 'nf' as const, label: '纳滤NF', icon: Layers },
                    { type: 'ro' as const, label: '反渗透RO', icon: Layers },
                    { type: 'edi' as const, label: 'EDI', icon: Zap },
                    { type: 'uv' as const, label: '紫外消毒', icon: RefreshCw },
                    { type: 'chemical' as const, label: '加药', icon: Beaker },
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addUnit(item.type)}
                      className="flex items-center gap-1.5 p-2 rounded-lg border border-border text-xs hover:border-water/40 hover:bg-water-muted/50 hover:text-water transition-all"
                    >
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {item.label}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config" className="mt-3">
              {selectedUnit && processUnits.find(u => u.id === selectedUnit) ? (
                <Card>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs">配置参数</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {renderUnitConfig(processUnits.find(u => u.id === selectedUnit)!)}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/50">
                  <CardContent className="py-6 text-center text-muted-foreground">
                    <Settings2 className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs">选择一个工艺单元进行配置</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* 膜组件信息 */}
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                膜组件品牌
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5 px-3 pb-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">超滤膜</span>
                <span className="font-medium">DuPont / Toray / 立升</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RO膜</span>
                <span className="font-medium">LG / Dow / Sinaenro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">纳滤膜</span>
                <span className="font-medium">LG / Dow Filmtec</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
