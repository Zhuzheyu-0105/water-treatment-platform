'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Droplets, Building2, Waves, Recycle, FlaskConical,
  ChevronRight, Sparkles, Search
} from 'lucide-react';
import { waterPresets, presetCategories, WaterPreset } from '@/lib/constants/water-presets';
import { WaterQualityParams } from '@/lib/constants/water-quality';
import { suggestPreset } from '@/lib/constants/water-presets';

interface WaterPresetSelectorProps {
  currentWaterQuality: WaterQualityParams;
  onSelectPreset: (waterQuality: WaterQualityParams) => void;
}

/** 分类图标映射 */
const categoryIcons: Record<string, React.ReactNode> = {
  municipal: <Building2 className="w-4 h-4" />,
  groundwater: <Droplets className="w-4 h-4" />,
  industrial: <FlaskConical className="w-4 h-4" />,
  seawater: <Waves className="w-4 h-4" />,
  wastewater: <Recycle className="w-4 h-4" />,
  special: <Sparkles className="w-4 h-4" />
};

/** 难度颜色映射 */
const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  hard: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  expert: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
};

export function WaterPresetSelector({ currentWaterQuality, onSelectPreset }: WaterPresetSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 智能推荐
  const recommended = suggestPreset(currentWaterQuality);

  // 筛选预设
  const filteredPresets = selectedCategory === 'all'
    ? waterPresets
    : waterPresets.filter(p => p.category === selectedCategory);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          水质预设模板
        </CardTitle>
        <CardDescription className="text-xs">
          选择预设快速填充水质参数，或根据当前水质智能推荐
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 智能推荐提示 */}
        {recommended && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-muted-foreground">
              根据当前水质，推荐: <strong className="text-foreground">{recommended.name}</strong>
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-auto h-7 text-blue-600 dark:text-blue-400"
              onClick={() => onSelectPreset(recommended.waterQuality)}
            >
              应用
            </Button>
          </div>
        )}

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory('all')}
          >
            <Search className="w-3 h-3 mr-1" />
            全部
          </Button>
          {presetCategories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </Button>
          ))}
        </div>

        {/* 预设列表 */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredPresets.map(preset => {
            const isExpanded = expandedId === preset.id;
            return (
              <div
                key={preset.id}
                className="rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : preset.id)}
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {categoryIcons[preset.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {preset.name}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColors[preset.difficulty]}`}>
                        {preset.difficultyLabel}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      TDS: {preset.waterQuality.tds} mg/L
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPreset(preset.waterQuality);
                    }}
                  >
                    应用
                  </Button>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mt-2 mb-2">{preset.description}</p>
                    
                    {/* 关键水质参数 */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <div className="text-center p-1.5 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">pH</div>
                        <div className="text-sm font-medium">{preset.waterQuality.ph}</div>
                      </div>
                      <div className="text-center p-1.5 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">TDS</div>
                        <div className="text-sm font-medium">{preset.waterQuality.tds}</div>
                      </div>
                      <div className="text-center p-1.5 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">硬度</div>
                        <div className="text-sm font-medium">{preset.waterQuality.hardness}</div>
                      </div>
                      <div className="text-center p-1.5 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">浊度</div>
                        <div className="text-sm font-medium">{preset.waterQuality.turbidity}</div>
                      </div>
                    </div>

                    {/* 推荐工艺 */}
                    <div className="mb-2">
                      <div className="text-xs text-muted-foreground mb-1">推荐工艺流程：</div>
                      <div className="flex flex-wrap gap-1">
                        {preset.recommendedProcess.map((step, i) => (
                          <span key={i}>
                            <Badge variant="secondary" className="text-xs">{step}</Badge>
                            {i < preset.recommendedProcess.length - 1 && (
                              <span className="text-muted-foreground mx-0.5">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 推荐膜类型 */}
                    <div className="text-xs text-muted-foreground">
                      推荐膜: <span className="text-foreground">{preset.recommendedMembrane}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
