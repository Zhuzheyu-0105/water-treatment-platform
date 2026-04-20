'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  Droplets, 
  Filter, 
  Gauge, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Loader2,
  FlaskConical
} from 'lucide-react';
import { ProcessNode, generateProcessFlow } from '@/lib/constants/process';

interface ProcessFlowDiagramProps {
  processConfig: {
    pretreatment: string;
    precisionFilter: string;
    ufSystem: string;
    mainProcess: string;
  };
  membraneConfig: {
    roModel: string;
    ufModel: string;
    stages: number;
    elementsPerVessel: number;
    vesselsStage1: number;
    vesselsStage2: number;
    vesselsStage3: number;
  };
  pumpConfig: {
    feedPump: string;
    highPressurePump: string;
    ufPump: string;
  };
  designFlow: { feed: number; permeate: number; recovery: number };
  onGenerate: () => void;
  isGenerating: boolean;
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'source': return Droplets;
    case 'pump': return Gauge;
    case 'filter': return Filter;
    case 'membrane': return Zap;
    case 'output': return CheckCircle;
    default: return FlaskConical;
  }
};

const getNodeColor = (type: string, name: string) => {
  if (name.includes('RO') || name.includes('高压')) return 'border-orange-300 bg-orange-50';
  if (name.includes('超滤') || name.includes('UF')) return 'border-cyan-300 bg-cyan-50';
  if (name.includes('原水') || name.includes('产水')) return 'border-blue-300 bg-blue-50';
  if (name.includes('过滤')) return 'border-green-300 bg-green-50';
  if (name.includes('EDI') || name.includes('混床')) return 'border-purple-300 bg-purple-50';
  return 'border-gray-300 bg-gray-50';
};

export function ProcessFlowDiagram({
  processConfig,
  membraneConfig,
  pumpConfig,
  designFlow,
  onGenerate,
  isGenerating
}: ProcessFlowDiagramProps) {
  // 生成工艺流程节点
  const processNodes = generateProcessFlow({
    ...processConfig,
    ...membraneConfig,
    ...pumpConfig
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">工艺流程图</h2>
          <p className="text-gray-500 mt-1">根据配置自动生成的完整工艺流程</p>
        </div>
        <Button 
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-green-500 hover:bg-green-600"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              生成设计中...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              生成设计方案
            </>
          )}
        </Button>
      </div>

      {/* Process Flow Visualization */}
      <Card className="overflow-x-auto">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 min-w-max">
            {processNodes.map((node, index) => {
              const Icon = getNodeIcon(node.type);
              return (
                <div key={node.id} className="flex items-center gap-4">
                  <div className={`
                    flex flex-col items-center p-4 rounded-xl border-2 min-w-[120px]
                    ${getNodeColor(node.type, node.name)}
                  `}>
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center mb-2
                      ${node.type === 'source' ? 'bg-blue-100 text-blue-600' :
                        node.type === 'pump' ? 'bg-gray-100 text-gray-600' :
                        node.type === 'membrane' ? 'bg-orange-100 text-orange-600' :
                        node.type === 'output' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-500'}
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="font-medium text-sm text-center">{node.name}</div>
                    {node.params && Object.keys(node.params).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {node.params.model && <div>{node.params.model}</div>}
                        {node.params.stages && <div>{node.params.stages}段 {node.params.elements}支</div>}
                      </div>
                    )}
                    {node.description && (
                      <div className="text-xs text-gray-400 mt-1">{node.description}</div>
                    )}
                  </div>
                  {index < processNodes.length - 1 && (
                    <ArrowRight className="w-6 h-6 text-gray-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-200 border-2 border-blue-300"></div>
          <span className="text-sm text-gray-600">原水/产水</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 border-2 border-gray-300"></div>
          <span className="text-sm text-gray-600">水泵</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-200 border-2 border-green-300"></div>
          <span className="text-sm text-gray-600">过滤设备</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-200 border-2 border-orange-300"></div>
          <span className="text-sm text-gray-600">RO膜系统</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-cyan-200 border-2 border-cyan-300"></div>
          <span className="text-sm text-gray-600">超滤系统</span>
        </div>
      </div>

      {/* Design Parameters Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">设计参数汇总</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500">进水量</span>
                <span className="font-medium">{designFlow.feed} m³/h</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500">产水量</span>
                <span className="font-medium">{designFlow.permeate} m³/h</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500">浓水量</span>
                <span className="font-medium">{(designFlow.feed - designFlow.permeate).toFixed(1)} m³/h</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500">回收率</span>
                <span className="font-medium">{designFlow.recovery}%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">浓缩倍数</span>
                <span className="font-medium">{(100 / (100 - designFlow.recovery)).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">设备配置汇总</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500">预处理</span>
                <span className="font-medium">
                  {processConfig.pretreatment === 'none' ? '无' : 
                   processConfig.pretreatment === 'multimedia+carbon' ? '多介质+活性炭' :
                   processConfig.pretreatment}
                </span>
              </div>
              {processConfig.ufSystem !== 'none' && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">超滤膜</span>
                  <span className="font-medium">{membraneConfig.ufModel || '未选择'}</span>
                </div>
              )}
              {processConfig.mainProcess.includes('ro') && (
                <>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">RO膜型号</span>
                    <span className="font-medium">{membraneConfig.roModel || '未选择'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">段式配置</span>
                    <span className="font-medium">{membraneConfig.stages}段</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">膜壳数量</span>
                    <span className="font-medium">
                      {membraneConfig.vesselsStage1 + membraneConfig.vesselsStage2 + membraneConfig.vesselsStage3} 支
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
