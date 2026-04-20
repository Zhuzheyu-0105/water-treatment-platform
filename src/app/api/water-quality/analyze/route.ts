import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { WaterQualityParams, classifyWaterQuality, roFeedLimits } from '@/lib/constants/water-quality';
import { recommendMembraneCategory } from '@/lib/constants/membranes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { waterQuality, designFlow } = body as {
      waterQuality: WaterQualityParams;
      designFlow: {
        feed: number;
        permeate: number;
        recovery: number;
      };
    };

    if (!waterQuality) {
      return NextResponse.json(
        { error: '请提供水质参数' },
        { status: 400 }
      );
    }

    // 初始化LLM客户端
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 水质分类
    const classification = classifyWaterQuality(waterQuality);

    // 构建分析提示词
    const prompt = `作为水处理系统设计专家，请分析以下水质数据并提供专业建议。

## 进水水质参数
- pH: ${waterQuality.ph || '未检测'}
- 浊度: ${waterQuality.turbidity || '未检测'} NTU
- SDI₁₅: ${waterQuality.sdi || '未检测'}
- 电导率: ${waterQuality.conductivity || '未检测'} μs/cm
- TDS: ${waterQuality.tds || '未检测'} mg/L
- 总硬度: ${waterQuality.hardness || '未检测'} mg/L
- COD: ${waterQuality.cod || '未检测'} mg/L
- 钙Ca²⁺: ${waterQuality.calcium || '未检测'} mg/L
- 镁Mg²⁺: ${waterQuality.magnesium || '未检测'} mg/L
- 钠Na⁺: ${waterQuality.sodium || '未检测'} mg/L
- 氯离子Cl⁻: ${waterQuality.chloride || '未检测'} mg/L
- 硫酸根SO₄²⁻: ${waterQuality.sulfate || '未检测'} mg/L
- 二氧化硅SiO₂: ${waterQuality.silica || '未检测'} mg/L
- 铁Fe: ${waterQuality.iron || '未检测'} mg/L
- 锰Mn: ${waterQuality.manganese || '未检测'} mg/L
- 余氯: ${waterQuality.chlorine || '未检测'} mg/L
- 水温: ${waterQuality.temperature || 25} °C

## 设计参数
- 进水量: ${designFlow?.feed ?? 50} m³/h
- 产水量: ${designFlow?.permeate ?? 35} m³/h
- 回收率: ${designFlow?.recovery ?? 70}%

## 分析要点
请提供以下内容的详细分析：

1. **水质类型判断**：根据TDS和电导率判断水源类型（自来水/苦咸水/海水等）

2. **结垢倾向分析**：
   - LSI朗格利尔饱和指数评估
   - 可能的结垢类型（CaCO3、CaSO4、SiO2等）

3. **预处理建议**：
   - 是否需要软化处理
   - 是否需要脱氯
   - 是否需要除铁锰
   - 预处理工艺推荐

4. **膜系统建议**：
   - 推荐的膜类型（BW苦咸水膜/SW海水膜/LE低能耗膜）
   - 预估脱盐率
   - 系统回收率建议

5. **加药建议**：
   - 阻垢剂类型和投加量
   - 还原剂投加量（如需要）
   - 其他药剂

6. **风险提示**：需要特别注意的水质问题

请用专业、清晰的语言进行分析，并给出具体数值建议。`;

    // 调用AI进行分析
    const response = await client.invoke([
      {
        role: 'system',
        content: '你是一位资深的水处理系统设计专家，精通RO反渗透、超滤等膜分离技术，具有20年以上的工程实践经验。请提供专业、详细、可操作的分析和建议。'
      },
      { role: 'user', content: prompt }
    ], {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.5
    });

    // 推荐膜类型
    const tds = waterQuality.tds || 0;
    const membraneRecommendation = recommendMembraneCategory(tds);

    // 检查RO进水限值
    const limitChecks: { param: string; value: number; limit: number; status: 'pass' | 'warning' | 'fail'; message: string }[] = [];
    
    if (waterQuality.sdi !== undefined) {
      limitChecks.push({
        param: 'SDI₁₅',
        value: waterQuality.sdi,
        limit: 5,
        status: waterQuality.sdi <= 3 ? 'pass' : waterQuality.sdi <= 5 ? 'warning' : 'fail',
        message: waterQuality.sdi > 5 ? 'SDI超标，需要加强预处理' : waterQuality.sdi > 3 ? 'SDI偏高，建议优化预处理' : '符合RO进水要求'
      });
    }

    if (waterQuality.turbidity !== undefined) {
      limitChecks.push({
        param: '浊度',
        value: waterQuality.turbidity,
        limit: 1,
        status: waterQuality.turbidity <= 0.2 ? 'pass' : waterQuality.turbidity <= 1 ? 'warning' : 'fail',
        message: waterQuality.turbidity > 1 ? '浊度超标，需要预处理' : waterQuality.turbidity > 0.2 ? '浊度偏高' : '符合RO进水要求'
      });
    }

    if (waterQuality.chlorine !== undefined) {
      limitChecks.push({
        param: '余氯',
        value: waterQuality.chlorine,
        limit: 0.1,
        status: waterQuality.chlorine <= 0 ? 'pass' : waterQuality.chlorine <= 0.1 ? 'warning' : 'fail',
        message: waterQuality.chlorine > 0.1 ? '余氯超标，需要脱氯处理，否则会氧化复合膜' : waterQuality.chlorine > 0 ? '有余氯，建议脱氯' : '符合RO进水要求'
      });
    }

    if (waterQuality.iron !== undefined) {
      limitChecks.push({
        param: '铁离子',
        value: waterQuality.iron,
        limit: 0.3,
        status: waterQuality.iron <= 0.1 ? 'pass' : waterQuality.iron <= 0.3 ? 'warning' : 'fail',
        message: waterQuality.iron > 0.3 ? '铁离子超标，会导致膜污染' : waterQuality.iron > 0.1 ? '铁离子偏高' : '符合RO进水要求'
      });
    }

    return NextResponse.json({
      success: true,
      analysis: response.content,
      classification,
      membraneRecommendation,
      limitChecks,
      summary: {
        waterType: classification.type,
        tdsLevel: classification.tdsLevel,
        hardnessLevel: classification.hardnessLevel,
        warnings: classification.warnings,
        suitability: classification.suitability
      }
    });

  } catch (error) {
    console.error('水质分析失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '分析失败，请稍后重试' 
      },
      { status: 500 }
    );
  }
}
