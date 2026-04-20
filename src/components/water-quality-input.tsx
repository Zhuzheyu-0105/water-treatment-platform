'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FlaskConical, 
  PlusCircle, 
  MinusCircle, 
  Loader2, 
  FileText,
  Image,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  GitCompare,
  Droplets,
  Target,
  X,
  Sparkles
} from 'lucide-react';
import { WaterQualityParams, waterQualityParamConfig, waterQualityStandards, WaterQualityStandard } from '@/lib/constants/water-quality';
import { useLocalStorage } from '@/lib/utils/hooks';

// 进出水水质类型
export type WaterType = 'inlet' | 'outlet' | 'analysis';

interface WaterQualityInputProps {
  inletWaterQuality: WaterQualityParams;
  outletWaterQuality: WaterQualityParams;
  onInletWaterQualityChange: (wq: WaterQualityParams) => void;
  onOutletWaterQualityChange: (wq: WaterQualityParams) => void;
  designFlow: { feed: number; permeate: number; recovery: number };
  onDesignFlowChange: (df: { feed: number; permeate: number; recovery: number }) => void;
  targetOutletQuality?: Partial<WaterQualityParams>;
  onTargetOutletQualityChange?: (wq: Partial<WaterQualityParams>) => void;
}

export function WaterQualityInput({
  inletWaterQuality,
  outletWaterQuality,
  onInletWaterQualityChange,
  onOutletWaterQualityChange,
  designFlow,
  onDesignFlowChange,
  targetOutletQuality,
  onTargetOutletQualityChange
}: WaterQualityInputProps) {
  const [activeTab, setActiveTab] = useState<WaterType>('inlet');
  const [uploadType, setUploadType] = useState<WaterType>('inlet');
  const [uploadedFile, setUploadedFile] = useState<{ inlet: File | null; outlet: File | null }>({ inlet: null, outlet: null });
  const [pastedText, setPastedText] = useState<{ inlet: string; outlet: string }>({ inlet: '', outlet: '' });
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useLocalStorage<boolean>('wts-show-comparison', true);
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [appliedStandardParams, setAppliedStandardParams] = useState<Set<string>>(new Set());

  // v3.5修复：分类Tab状态（替代DOM查询方案）
  const [inletCategory, setInletCategory] = useState<string>('basic');
  const [outletCategory, setOutletCategory] = useState<string>('basic');

  // v3.4修复：维护输入框的字符串中间态，解决无法输入0.几数据的bug
  // 核心问题：Number('0.') = 0，然后 0 || '' = '' 导致输入被清空
  const [inletInputValues, setInletInputValues] = useState<Record<string, string>>({});
  const [outletInputValues, setOutletInputValues] = useState<Record<string, string>>({});
  
  // v3.3修复：拆分fileInputRef为inletFileRef和outletFileRef，避免上传逻辑混乱
  const inletFileRef = useRef<HTMLInputElement>(null);
  const outletFileRef = useRef<HTMLInputElement>(null);
  
  // v3.3新增：文件大小验证常量（5MB限制）
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // 水质参数数组，用于显示和查找
  const waterQualityParams = Object.entries(waterQualityParamConfig).map(([key, config]) => ({
    key,
    label: config.label,
    unit: config.unit,
    category: config.category
  }));

  // 应用预设标准
  const applyStandard = (standard: WaterQualityStandard) => {
    setSelectedStandard(standard.id);
    const params: WaterQualityParams = {};
    const appliedKeys = new Set<string>();
    
    for (const [key, value] of Object.entries(standard.params)) {
      // 使用max值作为目标值（如果存在）
      if (value.max !== undefined) {
        params[key as keyof WaterQualityParams] = value.max;
        appliedKeys.add(key);
      } else if (value.min !== undefined && value.max !== undefined) {
        // 如果有范围，使用中间值
        params[key as keyof WaterQualityParams] = (value.min + value.max) / 2;
        appliedKeys.add(key);
      } else if (value.optimal !== undefined) {
        // 如果有最优值，使用最优值
        params[key as keyof WaterQualityParams] = value.optimal;
        appliedKeys.add(key);
      }
    }
    
    setAppliedStandardParams(appliedKeys);
    onOutletWaterQualityChange(params);
    // 同时更新目标水质
    onTargetOutletQualityChange?.(params);
  };

  // 清除已应用的标准
  const clearAppliedStandard = () => {
    setSelectedStandard(null);
    setAppliedStandardParams(new Set());
    onOutletWaterQualityChange({});
    // 同时清除目标水质
    onTargetOutletQualityChange?.({});
  };

  // 计算去除率
  const calculateRemovalRate = (paramKey: keyof WaterQualityParams): string | null => {
    const inletValue = inletWaterQuality[paramKey];
    const outletValue = outletWaterQuality[paramKey];
    if (inletValue && outletValue && inletValue > 0) {
      const rate = ((inletValue - outletValue) / inletValue * 100).toFixed(1);
      return `${rate}%`;
    }
    return null;
  };

  // v3.3新增：带文件大小验证的上传处理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: WaterType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // v3.3修复：添加文件大小验证（5MB限制）
    if (file.size > MAX_FILE_SIZE) {
      setParseResult({
        success: false,
        type,
        error: `文件大小超过5MB限制，请压缩或裁剪后再试（当前: ${(file.size / 1024 / 1024).toFixed(2)}MB）`
      });
      // 重置input以允许重新选择同一文件
      e.target.value = '';
      return;
    }
    
    setUploadedFile({ ...uploadedFile, [type]: file });
    if (file.type.startsWith('image/')) {
      await parseImage(file, type);
    } else if (file.type === 'application/pdf') {
      await parsePdf(file, type);
    }
  };

  // v3.2优化：PDF解析增加自动重试逻辑
  const parsePdf = async (file: File, type: WaterType, retryCount = 0) => {
    setIsParsing(true);
    setParseResult(null);
    
    const maxRetries = 1; // 最多重试1次
    
    try {
      // 第一步：上传PDF文件到对象存储
      const formData = new FormData();
      formData.append('file', file);
      
      let uploadData: any;
      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        uploadData = await uploadResponse.json();
      } catch (uploadError) {
        // S3上传失败时的降级处理
        if (retryCount < maxRetries) {
          console.warn('S3上传失败，尝试重试...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
          return parsePdf(file, type, retryCount + 1);
        }
        setParseResult({
          success: false,
          type,
          error: 'PDF文件上传失败，请稍后重试或使用图片代替'
        });
        setIsParsing(false);
        return;
      }
      
      if (!uploadData.success) {
        setParseResult({
          success: false,
          type,
          error: uploadData.error || 'PDF文件上传失败'
        });
        setIsParsing(false);
        return;
      }
      
      // 第二步：调用解析API（增加超时和重试）
      let data: any;
      try {
        const parseController = new AbortController();
        const parseTimeout = setTimeout(() => parseController.abort(), 30000); // 30秒超时
        
        const parseResponse = await fetch('/api/water-quality/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfUrl: uploadData.url, waterType: type }),
          signal: parseController.signal
        });
        clearTimeout(parseTimeout);
        data = await parseResponse.json();
      } catch (parseError) {
        // 解析失败时的重试
        if (retryCount < maxRetries) {
          console.warn('PDF解析失败，尝试重试...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return parsePdf(file, type, retryCount + 1);
        }
        setParseResult({
          success: false,
          type,
          error: 'PDF解析超时，请稍后重试或使用图片代替'
        });
        setIsParsing(false);
        return;
      }
      
      if (data.success && data.data) {
        // 将解析结果转换为参数值
        const parsedData: Record<string, number> = {};
        for (const [key, value] of Object.entries(data.data)) {
          if (typeof value === 'object' && value !== null && 'value' in value) {
            const numValue = (value as any).value;
            if (typeof numValue === 'number' && !isNaN(numValue)) {
              parsedData[key] = numValue;
            }
          }
        }
        
        // 更新对应的水质参数
        if (Object.keys(parsedData).length > 0) {
          if (type === 'inlet') {
            onInletWaterQualityChange({ ...inletWaterQuality, ...parsedData });
          } else {
            const newOutletWaterQuality = { ...outletWaterQuality, ...parsedData };
            onOutletWaterQualityChange(newOutletWaterQuality);
            // 同时更新目标水质
            onTargetOutletQualityChange?.(newOutletWaterQuality);
          }
          setParseResult({
            success: true,
            type,
            count: Object.keys(parsedData).length,
            data: parsedData,
            analysis: data.analysis
          });
        } else {
          setParseResult({
            success: false,
            type,
            error: '未能识别到有效的水质参数'
          });
        }
      } else {
        setParseResult({
          success: false,
          type,
          error: data.error || '解析失败'
        });
      }
    } catch (error) {
      console.error('PDF解析失败:', error);
      setParseResult({
        success: false,
        type,
        error: '网络错误，请稍后重试'
      });
    } finally {
      setIsParsing(false);
    }
  };

  const parseImage = async (file: File, type: WaterType) => {
    setIsParsing(true);
    setParseResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          const response = await fetch('/api/water-quality/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, waterType: type })
          });
          const data = await response.json();
          
          if (data.success && data.data) {
            // 将解析结果转换为参数值
            const parsedData: Record<string, number> = {};
            for (const [key, value] of Object.entries(data.data)) {
              if (typeof value === 'object' && value !== null && 'value' in value) {
                const numValue = (value as any).value;
                if (typeof numValue === 'number' && !isNaN(numValue)) {
                  parsedData[key] = numValue;
                }
              }
            }
            
            // 更新对应的水质参数
            if (Object.keys(parsedData).length > 0) {
              if (type === 'inlet') {
                onInletWaterQualityChange({ ...inletWaterQuality, ...parsedData });
              } else {
                const newOutletWaterQuality = { ...outletWaterQuality, ...parsedData };
                onOutletWaterQualityChange(newOutletWaterQuality);
                // 同时更新目标水质
                onTargetOutletQualityChange?.(newOutletWaterQuality);
              }
              setParseResult({ 
                success: true, 
                type,
                count: Object.keys(parsedData).length,
                data: parsedData,
                analysis: data.analysis 
              });
            } else {
              setParseResult({ 
                success: false, 
                type,
                error: '未能识别到有效的水质参数' 
              });
            }
          } else {
            setParseResult({ 
              success: false, 
              type,
              error: data.error || '解析失败' 
            });
          }
        } catch (err) {
          console.error('解析失败:', err);
          setParseResult({ 
            success: false, 
            type,
            error: '解析过程出错' 
          });
        } finally {
          setIsParsing(false);
        }
      };
      reader.onerror = () => {
        setIsParsing(false);
        setParseResult({ 
          success: false, 
          type,
          error: '文件读取失败' 
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('解析失败:', error);
      setIsParsing(false);
      setParseResult({ 
        success: false, 
        type,
        error: '解析失败' 
      });
    }
  };

  const parseText = async (type: WaterType) => {
    const text = type === 'inlet' ? pastedText.inlet : pastedText.outlet;
    if (!text.trim()) return;
    
    setIsParsing(true);
    setParseResult(null);
    
    try {
      const response = await fetch('/api/water-quality/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, waterType: type })
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        // 将解析结果转换为参数值
        const parsedData: Record<string, number> = {};
        for (const [key, value] of Object.entries(data.data)) {
          if (typeof value === 'object' && value !== null && 'value' in value) {
            const numValue = (value as any).value;
            if (typeof numValue === 'number' && !isNaN(numValue)) {
              parsedData[key] = numValue;
            }
          }
        }
        
        // 更新对应的水质参数
        if (Object.keys(parsedData).length > 0) {
          if (type === 'inlet') {
            onInletWaterQualityChange({ ...inletWaterQuality, ...parsedData });
          } else {
            const newOutletWaterQuality = { ...outletWaterQuality, ...parsedData };
            onOutletWaterQualityChange(newOutletWaterQuality);
            // 同时更新目标水质
            onTargetOutletQualityChange?.(newOutletWaterQuality);
          }
          setParseResult({ 
            success: true, 
            type,
            count: Object.keys(parsedData).length,
            data: parsedData,
            analysis: data.analysis 
          });
        } else {
          setParseResult({ 
            success: false, 
            type,
            error: '未能识别到有效的水质参数' 
          });
        }
      } else {
        setParseResult({ 
          success: false, 
          type,
          error: data.error || '解析失败' 
        });
      }
    } catch (error) {
      console.error('解析失败:', error);
      setParseResult({ 
        success: false, 
        type,
        error: '网络错误，请稍后重试' 
      });
    } finally {
      setIsParsing(false);
    }
  };

  // TDS与电导率转换系数（通常为0.5-0.7，取决于水质类型）
  const TDS_CONDUCTIVITY_RATIO = 0.625; // 典型值：TDS = 电导率 × 0.625

  // 当电导率改变时，自动更新TDS（电导率为主输入）
  const handleConductivityChange = (value: number | undefined, type: 'inlet' | 'outlet') => {
    const tds = value ? Math.round(value * TDS_CONDUCTIVITY_RATIO) : undefined;
    if (type === 'inlet') {
      onInletWaterQualityChange({
        ...inletWaterQuality,
        conductivity: value,
        tds
      });
    } else {
      const newOutletWaterQuality = {
        ...outletWaterQuality,
        conductivity: value,
        tds
      };
      onOutletWaterQualityChange(newOutletWaterQuality);
      // 同时更新目标水质
      onTargetOutletQualityChange?.(newOutletWaterQuality);
    }
  };

  // 参数分组 - 过滤掉tds（由电导率自动计算）
  // v3.3修复：添加 nutrient 分类，解决 ammonia/TN/TP 归类错误
  const paramCategories = {
    basic: { label: '基础理化', icon: FlaskConical, color: 'bg-water-muted text-water' },
    cation: { label: '阳离子', icon: PlusCircle, color: 'bg-success-muted text-success' },
    anion: { label: '阴离子', icon: MinusCircle, color: 'bg-data-muted text-data' },
    organic: { label: '有机/生物', icon: FlaskConical, color: 'bg-tech-muted text-tech' },
    safety: { label: '安全性', icon: AlertCircle, color: 'bg-destructive/10 text-destructive' },
    nutrient: { label: '营养盐', icon: FlaskConical, color: 'bg-flow-muted text-flow' }, // v3.3新增
    other: { label: '其他', icon: FileText, color: 'bg-muted text-muted-foreground' }
  };

  const groupedParams = Object.entries(waterQualityParamConfig)
    .filter(([key]) => key !== 'tds') // 过滤掉tds，由电导率自动计算
    .reduce((acc, [key, config]) => {
      const category = (config as any).category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push({ key, ...config });
      return acc;
    }, {} as Record<string, any[]>);

  const currentWaterQuality = activeTab === 'inlet' ? inletWaterQuality : outletWaterQuality;
  const onWaterQualityChange = activeTab === 'inlet' ? onInletWaterQualityChange : onOutletWaterQualityChange;

  // 需要对比的关键参数
  const keyParams: Array<{ key: keyof WaterQualityParams; label: string }> = [
    { key: 'ph', label: 'pH值' },
    { key: 'tds', label: 'TDS' },
    { key: 'conductivity', label: '电导率' },
    { key: 'turbidity', label: '浊度' },
    { key: 'hardness', label: '总硬度' },
    { key: 'cod', label: '化学需氧量(COD)' },
    { key: 'chlorine', label: '余氯' }
  ];

  return (
    <div className="space-y-4">
      {/* ── 页面标题栏 ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">水质参数输入</h2>
          <p className="text-xs text-muted-foreground mt-0.5">上传或输入水质报告，设置设计参数</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-water-muted text-water border-water/20 rounded-lg px-2.5 py-1 text-xs gap-1.5">
            <Droplets className="w-3 h-3" />
            <span>进水TDS <strong>{inletWaterQuality.tds || '-'}</strong> mg/L</span>
          </Badge>
          <Badge variant="outline" className="bg-success-muted text-success border-success/20 rounded-lg px-2.5 py-1 text-xs gap-1.5">
            <Target className="w-3 h-3" />
            <span>出水TDS <strong>{outletWaterQuality.tds || '-'}</strong> mg/L</span>
          </Badge>
        </div>
      </div>

      {/* Parse Result Alert */}
      {parseResult && (
        <Card className={`border ${parseResult.success ? 'border-success/20 bg-success-muted/40' : 'border-destructive/20 bg-destructive/5'}`}>
          <CardContent className="p-4 flex items-start gap-3">
            {parseResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {parseResult.success ? (
                    <>
                      <span className="text-sm font-medium text-success">
                        {parseResult.type === 'inlet' ? '进水' : '出水'}水质解析成功
                      </span>
                      <span className="text-sm text-success ml-1.5">
                        · 已识别 {parseResult.count} 个参数
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-destructive">
                      解析失败: {parseResult.error}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setParseResult(null)}
                  className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              {parseResult.success && parseResult.data && (
                <div className="mt-2.5 pt-2.5 border-t border-success/20">
                  <div className="text-xs text-muted-foreground mb-2">已自动填入的参数：</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(parseResult.data).map(([key, value]) => {
                      const param = waterQualityParams.find(p => p.key === key);
                      return (
                        <Badge key={key} variant="outline" className="bg-background/80 text-success border-success/20 text-xs px-2 py-0.5">
                          {param?.label || key}: <strong>{String(value)}</strong> {param?.unit || ''}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Water Quality Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WaterType)}>
        <TabsList className="grid w-full grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="inlet" className="gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg h-9">
            <Droplets className="w-4 h-4" />
            进水水质
          </TabsTrigger>
          <TabsTrigger value="outlet" className="gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg h-9">
            <Target className="w-4 h-4" />
            出水水质
          </TabsTrigger>
        </TabsList>

        {/* Inlet Water Quality */}
        <TabsContent value="inlet" className="mt-4 space-y-3">
          {/* ── 上传区：图片/PDF + 文本粘贴 ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 图片/PDF上传 */}
            <Card className="border border-dashed border-success/30 hover:border-success/60 hover:shadow-md transition-all cursor-pointer bg-success-muted/10"
              onClick={() => inletFileRef.current?.click()}>
              <CardContent className="p-5 flex items-center gap-4">
                <input
                  ref={inletFileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'inlet')}
                />
                {uploadedFile.inlet ? (
                  <>
                    <CheckCircle2 className="w-9 h-9 text-success shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{uploadedFile.inlet.name}</p>
                      <p className="text-xs text-muted-foreground">已上传</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-success/10 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">上传进水水质报告</p>
                      <p className="text-xs text-muted-foreground mt-0.5">支持图片 / PDF</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 文本粘贴 */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  粘贴进水报告文本
                </p>
                <Textarea
                  value={pastedText.inlet}
                  onChange={(e) => setPastedText({ ...pastedText, inlet: e.target.value })}
                  placeholder="粘贴进水水质报告内容..."
                  className="input-param h-20 resize-none mb-2"
                />
                <Button
                  onClick={() => parseText('inlet')}
                  disabled={isParsing || !pastedText.inlet.trim()}
                  size="sm"
                  className="w-full h-9 text-sm font-medium"
                >
                  {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  智能解析
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Parameter Input Card */}
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">进水水质参数</CardTitle>
              <CardDescription className="text-xs">手动输入或修改水质参数</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-4">
              {/* ── 分类 Tab（第1行：4个，第2行：3个）── */}
              <div className="mb-4">
                {/* 第1行：基础理化 | 阳离子 | 阴离子 | 有机/生物 */}
                <div className="flex flex-wrap gap-1.5">
                  {(['basic', 'cation', 'anion', 'organic'] as const).map((key) => {
                    const cat = paramCategories[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setInletCategory(key)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
                          inletCategory === key
                            ? 'bg-[#0071E3] text-white shadow-sm'
                            : 'bg-[#F5F5F7] dark:bg-[#2D2D2D] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-[#3D3D3D]'
                        }`}
                      >
                        <cat.icon className="w-3 h-3" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* 第2行：安全性 | 营养盐 | 其他 */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(['safety', 'nutrient', 'other'] as const).map((key) => {
                    const cat = paramCategories[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setInletCategory(key)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
                          inletCategory === key
                            ? 'bg-[#0071E3] text-white shadow-sm'
                            : 'bg-[#F5F5F7] dark:bg-[#2D2D2D] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-[#3D3D3D]'
                        }`}
                      >
                        <cat.icon className="w-3 h-3" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Tabs value={inletCategory} onValueChange={(v) => { setInletCategory(v); }} className="w-full">
                {/* 隐藏原始 TabsList，自定义按钮通过 inletCategory 状态控制 */}
                <TabsList className="hidden">
                  {Object.entries(paramCategories).map(([key, cat]) => (
                    <TabsTrigger key={key} value={key}>{cat.label}</TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(groupedParams).map(([category, params]) => (
                  <TabsContent key={category} value={category} className="mt-0">
                    {/* 分类标题 */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-1.5 h-4 rounded-full ${(paramCategories as any)[category]?.color.split(' ')[0] || 'bg-muted'}`} />
                      <span className="text-xs font-medium text-foreground">
                        {(paramCategories as any)[category]?.label || category}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{params.length} 项</span>
                    </div>
                    {/* 参数网格：3列md/4列lg */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                      {params.map((param: any) => (
                        <div key={param.key} className="space-y-1">
                          {/* 标签 + 单位在同一行 */}
                          <div className="flex items-baseline justify-between gap-1">
                            <Label className="text-xs text-muted-foreground truncate">{param.label}</Label>
                            <span className="text-[11px] text-muted-foreground/70 shrink-0">{param.unit}</span>
                          </div>
                          <Input
                            type="number"
                            step="any"
                            value={
                              inletInputValues[param.key] !== undefined
                                ? inletInputValues[param.key]
                                : (inletWaterQuality[param.key as keyof WaterQualityParams] ?? '')
                            }
                            onChange={(e) => {
                              setInletInputValues(prev => ({ ...prev, [param.key]: e.target.value }));
                            }}
                            onBlur={(e) => {
                              const strVal = e.target.value;
                              const value = strVal !== '' && strVal !== '-' ? Number(strVal) : undefined;
                              setInletInputValues(prev => {
                                const next = { ...prev };
                                delete next[param.key];
                                return next;
                              });
                              if (param.key === 'conductivity') {
                                handleConductivityChange(value, 'inlet');
                              } else {
                                onInletWaterQualityChange({
                                  ...inletWaterQuality,
                                  [param.key]: value
                                });
                              }
                            }}
                            placeholder="—"
                            className={`input-param ${param.key === 'conductivity' ? 'border-water/30 bg-water-muted/20 ring-water/20' : ''}`}
                          />
                          {/* 电导率自动计算TDS提示 */}
                          {param.key === 'conductivity' && inletWaterQuality.tds && (
                            <div className="text-[11px] text-water font-medium pl-0.5">
                              ≈ TDS {inletWaterQuality.tds} mg/L
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outlet Water Quality */}
        <TabsContent value="outlet" className="mt-4 space-y-3">
          {/* ── 预设标准选择 ── */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <Target className="w-3.5 h-3.5 text-success" />
              <Label className="text-xs font-medium text-foreground whitespace-nowrap">出水标准</Label>
            </div>
            <Select
              value={selectedStandard || undefined}
              onValueChange={(v) => {
                const standard = waterQualityStandards.find(s => s.id === v);
                if (standard) applyStandard(standard);
              }}
            >
              <SelectTrigger className="h-9 text-xs max-w-xs flex-1">
                <SelectValue placeholder="选择预设标准（可选）" />
              </SelectTrigger>
              <SelectContent>
                {waterQualityStandards.map((standard) => (
                  <SelectItem key={standard.id} value={standard.id}>
                    <div>
                      <div className="font-medium text-xs">{standard.name}</div>
                      <div className="text-[10px] text-muted-foreground">{standard.source}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStandard && (
              <Badge variant="outline" className="bg-success-muted text-success border-success/20 shrink-0 text-xs px-2.5 py-1 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {waterQualityStandards.find(s => s.id === selectedStandard)?.name}
                <button
                  type="button"
                  onClick={clearAppliedStandard}
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>

          {/* ── 上传区：图片/PDF + 文本粘贴 ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 图片/PDF上传 */}
            <Card className="border border-dashed border-success/30 hover:border-success/60 hover:shadow-md transition-all cursor-pointer bg-success-muted/10"
              onClick={() => outletFileRef.current?.click()}>
              <CardContent className="p-5 flex items-center gap-4">
                <input
                  ref={outletFileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'outlet')}
                />
                {uploadedFile.outlet ? (
                  <>
                    <CheckCircle2 className="w-9 h-9 text-success shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{uploadedFile.outlet.name}</p>
                      <p className="text-xs text-muted-foreground">已上传</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-success/10 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">上传出水水质报告</p>
                      <p className="text-xs text-muted-foreground mt-0.5">支持图片 / PDF</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 文本粘贴 */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  粘贴出水报告文本
                </p>
                <Textarea
                  value={pastedText.outlet}
                  onChange={(e) => setPastedText({ ...pastedText, outlet: e.target.value })}
                  placeholder="粘贴出水水质报告内容..."
                  className="input-param h-20 resize-none mb-2"
                />
                <Button
                  onClick={() => parseText('outlet')}
                  disabled={isParsing || !pastedText.outlet.trim()}
                  size="sm"
                  className="w-full h-9 text-sm font-medium"
                >
                  {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  智能解析
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Parameter Input Card */}
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">出水水质参数</CardTitle>
              <CardDescription className="text-xs">目标出水水质要求</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-4">
              {/* ── 分类 Tab（第1行：4个，第2行：3个）── */}
              <div className="mb-4">
                {/* 第1行 */}
                <div className="flex flex-wrap gap-1.5">
                  {(['basic', 'cation', 'anion', 'organic'] as const).map((key) => {
                    const cat = paramCategories[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setOutletCategory(key)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
                          outletCategory === key
                            ? 'bg-[#0071E3] text-white shadow-sm'
                            : 'bg-[#F5F5F7] dark:bg-[#2D2D2D] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-[#3D3D3D]'
                        }`}
                      >
                        <cat.icon className="w-3 h-3" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* 第2行 */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(['safety', 'nutrient', 'other'] as const).map((key) => {
                    const cat = paramCategories[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setOutletCategory(key)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
                          outletCategory === key
                            ? 'bg-[#0071E3] text-white shadow-sm'
                            : 'bg-[#F5F5F7] dark:bg-[#2D2D2D] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-[#3D3D3D]'
                        }`}
                      >
                        <cat.icon className="w-3 h-3" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Tabs value={outletCategory} onValueChange={(v) => { setOutletCategory(v); }} className="w-full">
                <TabsList className="hidden">
                  {Object.entries(paramCategories).map(([key, cat]) => (
                    <TabsTrigger key={key} value={key}>{cat.label}</TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(groupedParams).map(([category, params]) => (
                  <TabsContent key={category} value={category} className="mt-0">
                    {/* 分类标题 */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-1.5 h-4 rounded-full ${(paramCategories as any)[category]?.color.split(' ')[0] || 'bg-muted'}`} />
                      <span className="text-xs font-medium text-foreground">
                        {(paramCategories as any)[category]?.label || category}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{params.length} 项</span>
                    </div>
                    {/* 参数网格 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                      {params.map((param: any) => {
                        const isFromStandard = appliedStandardParams.has(param.key);
                        return (
                          <div key={param.key} className="space-y-1">
                            {/* 标签 + 单位 */}
                            <div className="flex items-baseline justify-between gap-1">
                              <Label className={`text-xs truncate ${isFromStandard ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                                {param.label}
                                {isFromStandard && <span className="ml-1 text-success">✓</span>}
                              </Label>
                              <span className="text-[11px] text-muted-foreground/70 shrink-0">{param.unit}</span>
                            </div>
                            <Input
                              type="number"
                              step="any"
                              value={
                                outletInputValues[param.key] !== undefined
                                  ? outletInputValues[param.key]
                                  : (outletWaterQuality[param.key as keyof WaterQualityParams] ?? '')
                              }
                              onChange={(e) => {
                                setOutletInputValues(prev => ({ ...prev, [param.key]: e.target.value }));
                              }}
                              onBlur={(e) => {
                                const strVal = e.target.value;
                                const value = strVal !== '' && strVal !== '-' ? Number(strVal) : undefined;
                                setOutletInputValues(prev => {
                                  const next = { ...prev };
                                  delete next[param.key];
                                  return next;
                                });
                                if (param.key === 'conductivity') {
                                  handleConductivityChange(value, 'outlet');
                                } else {
                                  const newOutletWaterQuality = {
                                    ...outletWaterQuality,
                                    [param.key]: value
                                  };
                                  onOutletWaterQualityChange(newOutletWaterQuality);
                                  onTargetOutletQualityChange?.(newOutletWaterQuality);
                                }
                              }}
                              placeholder="—"
                              className={`input-param ${isFromStandard ? 'border-success/30 bg-success-muted/20 ring-success/20' : ''} ${param.key === 'conductivity' ? 'border-water/30 bg-water-muted/20 ring-water/20' : ''}`}
                            />
                            {param.key === 'conductivity' && outletWaterQuality.tds && (
                              <div className="text-[11px] text-water font-medium pl-0.5">
                                ≈ TDS {outletWaterQuality.tds} mg/L
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ── 进出水水质对比 ── */}
      {showComparison && (
        <Card className="bg-muted/30 border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-water" />
                进出水水质对比
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComparison(false)}
                className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
              >
                收起
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {keyParams.map(({ key, label }) => {
                const inlet = inletWaterQuality[key];
                const outlet = outletWaterQuality[key];
                const removalRate = calculateRemovalRate(key);
                return (
                  <div key={key} className="p-3 bg-background rounded-xl border border-border/60 shadow-sm">
                    <div className="text-[11px] text-muted-foreground font-medium mb-1.5 leading-tight">{label}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-water leading-none">{inlet || '—'}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                      <span className="text-sm font-semibold text-success leading-none">{outlet || '—'}</span>
                    </div>
                    {removalRate && (
                      <div className="text-[10px] text-muted-foreground/70 mt-1">{removalRate} ↓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {!showComparison && (
        <Button
          variant="outline"
          onClick={() => setShowComparison(true)}
          className="w-full rounded-xl border-dashed border-border/60 hover:border-water/30 h-9 text-xs font-medium"
        >
          <GitCompare className="w-3.5 h-3.5 mr-1.5 text-water" />
          展开进出水对比
        </Button>
      )}
    </div>
  );
}
