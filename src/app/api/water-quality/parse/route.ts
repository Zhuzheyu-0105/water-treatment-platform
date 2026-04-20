import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { SiliconFlowClient, isSiliconFlowConfigured, getSiliconFlowClient } from '@/lib/utils/siliconflow-client';

// 水质参数类型定义
interface WaterQualityParam {
  value: number;
  unit: string;
  confidence: number;
}

interface ParseResult {
  [key: string]: any;
  missing_params?: string[];
  analysis?: string;
  parse_error?: boolean;
  no_params?: boolean;
}

// AI解析提示词
const WATER_QUALITY_PARSE_PROMPT = `你是一个专业的水质分析师。请仔细分析这份水质报告，提取以下所有水质参数（如果报告中没有某项参数，请在missing_params数组中列出）。

需要提取的参数列表：
1. 基础理化：pH值、浊度(turbidity, NTU)、SDI₁₅污染指数(sdi)、电导率(conductivity, μs/cm)、总悬浮固体TSS(tss, mg/L)、水温(temperature, °C)
2. 阳离子：钙Ca²⁺(calcium, mg/L)、镁Mg²⁺(magnesium, mg/L)、钠Na⁺(sodium, mg/L)、钾K⁺(potassium, mg/L)、铁Total Fe(iron, mg/L)、锰Mn²⁺(manganese, mg/L)、钡Ba²⁺(barium, mg/L)、锶Sr²⁺(strontium, mg/L)
3. 阴离子：氯离子Cl⁻(chloride, mg/L)、硫酸根SO₄²⁻(sulfate, mg/L)、硝酸根NO₃⁻(nitrate, mg/L)、氟离子F⁻(fluoride, mg/L)、重碳酸根HCO₃⁻(bicarbonate, mg/L)、二氧化硅SiO₂(silica, mg/L)
4. 有机/生物：CODcr(cod, mg/L)、BOD₅(bod, mg/L)、TOC总有机碳(toc, mg/L)、色度(color, 倍)、细菌总数(bacteria, CFU/mL)
5. 安全性指标：余氯Free Cl₂(chlorine, mg/L)、ORP氧化还原电位(orp, mV)
6. 营养盐：氨氮NH₃-N(ammonia, mg/L)、总氮TN(tn, mg/L)、总磷TP(tp, mg/L)
7. 其他：总硬度(hardness, mg/L)
（注：TDS由电导率自动计算，无需提取；悬浮物统一使用TSS参数）

请按以下JSON格式返回结果（只返回JSON，不要其他说明文字）：
{
  "ph": 数值或null,
  "turbidity": 数值或null,
  "sdi": 数值或null,
  "conductivity": 数值或null,
  "tss": 数值或null,
  "temperature": 数值或null,
  "calcium": 数值或null,
  "magnesium": 数值或null,
  "sodium": 数值或null,
  "potassium": 数值或null,
  "iron": 数值或null,
  "manganese": 数值或null,
  "barium": 数值或null,
  "strontium": 数值或null,
  "chloride": 数值或null,
  "sulfate": 数值或null,
  "nitrate": 数值或null,
  "fluoride": 数值或null,
  "bicarbonate": 数值或null,
  "silica": 数值或null,
  "cod": 数值或null,
  "bod": 数值或null,
  "toc": 数值或null,
  "color": 数值或null,
  "bacteria": 数值或null,
  "chlorine": 数值或null,
  "orp": 数值或null,
  "ammonia": 数值或null,
  "tn": 数值或null,
  "tp": 数值或null,
  "hardness": 数值或null,
  "missing_params": ["未能识别的参数名列表"],
  "analysis": "对水质状况的简要分析，包括水源类型判断、水质等级、处理建议等"
}`;

// 参数单位映射
const paramUnits: { [key: string]: string } = {
  ph: '', turbidity: 'NTU', sdi: '', conductivity: 'μs/cm', tss: 'mg/L', temperature: '°C',
  calcium: 'mg/L', magnesium: 'mg/L', sodium: 'mg/L', potassium: 'mg/L', iron: 'mg/L', 
  manganese: 'mg/L', barium: 'mg/L', strontium: 'mg/L',
  chloride: 'mg/L', sulfate: 'mg/L', nitrate: 'mg/L', fluoride: 'mg/L', 
  bicarbonate: 'mg/L', silica: 'mg/L',
  cod: 'mg/L', bod: 'mg/L', toc: 'mg/L', color: '倍', bacteria: 'CFU/mL',
  chlorine: 'mg/L', orp: 'mV',
  ammonia: 'mg/L', tn: 'mg/L', tp: 'mg/L',
  hardness: 'mg/L'
};

// 从PDF URL提取文本内容
async function extractTextFromPdfUrl(url: string, customHeaders: Record<string, string>): Promise<string> {
  const fetchClient = new FetchClient(new Config(), customHeaders);
  
  const response = await fetchClient.fetch(url);
  
  if (response.status_code !== 0) {
    throw new Error(`PDF解析失败: ${response.status_message || '未知错误'}`);
  }
  
  // 提取文本内容
  const textContent = response.content
    .filter(item => item.type === 'text' && item.text)
    .map(item => item.text)
    .join('\n');
  
  return textContent;
}

// 解析AI返回的JSON
function parseAIResponse(content: string): ParseResult {
  // 尝试提取JSON部分
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error(`JSON解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
  }
  throw new Error('未找到有效的JSON数据');
}

// 转换为前端需要的格式
function convertToResult(parsedResult: ParseResult): { [key: string]: { value: number; unit: string; confidence: number } } {
  const result: { [key: string]: { value: number; unit: string; confidence: number } } = {};
  
  for (const [key, value] of Object.entries(parsedResult)) {
    if (key === 'missing_params' || key === 'analysis' || key === 'parse_error' || key === 'no_params') {
      continue;
    }
    if (typeof value === 'number' && value !== null) {
      result[key] = {
        value: value,
        unit: paramUnits[key] || '',
        confidence: 95
      };
    }
  }
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, text, pdfUrl } = body;

    // 检查输入
    if (!image && !text && !pdfUrl) {
      return NextResponse.json(
        { error: '请提供图片(base64)、文本内容或PDF URL' },
        { status: 400 }
      );
    }

    // 检查是否使用硅基流动API
    const useSiliconFlow = isSiliconFlowConfigured();
    
    // 模型选择：优先使用硅基流动GLM-5.1，图片输入同样使用GLM-5.1
    const siliconflowModel = process.env.SILICONFLOW_MODEL || 'Pro/zai-org/GLM-5.1';
    const cozeModel = image ? 'doubao-seed-1-6-vision-250815' : 'doubao-seed-1-8-251228';
    const selectedModel = useSiliconFlow ? siliconflowModel : cozeModel;

    let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> }>;
    let confidence = 85;

    if (image) {
      // 图片解析模式
      confidence = 90;
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: WATER_QUALITY_PARSE_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: image
              }
            }
          ]
        }
      ];
    } else if (pdfUrl) {
      // PDF解析模式 - 先提取文本，再用AI解析
      confidence = 90;
      
      // 从PDF提取文本
      const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
      const pdfText = await extractTextFromPdfUrl(pdfUrl, customHeaders);
      
      if (!pdfText || pdfText.trim().length === 0) {
        return NextResponse.json({
          success: false,
          error: 'PDF文档无法提取文本内容，请检查文件是否包含可识别的文字'
        });
      }
      
      messages = [
        {
          role: 'system',
          content: '你是一个专业的水质分析师，擅长从水质报告中提取参数数据。请严格按照JSON格式返回结果。'
        },
        {
          role: 'user',
          content: `${WATER_QUALITY_PARSE_PROMPT}\n\n以下是水质报告内容：\n${pdfText}`
        }
      ];
    } else {
      // 纯文本解析模式
      messages = [
        {
          role: 'system',
          content: '你是一个专业的水质分析师，擅长从水质报告中提取参数数据。请严格按照JSON格式返回结果。'
        },
        {
          role: 'user',
          content: `${WATER_QUALITY_PARSE_PROMPT}\n\n以下是水质报告内容：\n${text}`
        }
      ];
    }

    // 调用AI模型
    let content: string;
    
    if (useSiliconFlow) {
      // 使用硅基流动API
      const sfClient = getSiliconFlowClient();
      if (!sfClient) {
        throw new Error('硅基流动客户端初始化失败');
      }
      
      const response = await sfClient.invoke({
        model: selectedModel,
        messages,
        temperature: 0.3,
        max_tokens: 4096
      });
      content = response.content.trim();
      
      console.log(`[SiliconFlow] 使用模型: ${selectedModel}`);
    } else {
      // 使用Coze API作为备选
      const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
      const config = new Config();
      const llmClient = new LLMClient(config, customHeaders);
      
      const response = await llmClient.invoke(messages, {
        model: cozeModel,
        temperature: 0.3
      });
      content = response.content.trim();
      
      console.log(`[Coze] 使用模型: ${cozeModel}`);
    }
    let parsedResult: ParseResult;

    try {
      parsedResult = parseAIResponse(content);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      return NextResponse.json({
        success: false,
        error: 'AI返回数据格式错误',
        rawContent: content
      });
    }

    // 转换为前端需要的格式
    const result = convertToResult(parsedResult);

    return NextResponse.json({
      success: true,
      data: result,
      missingParams: parsedResult.missing_params || [],
      analysis: parsedResult.analysis || '',
      confidence
    });

  } catch (error) {
    console.error('水质报告解析失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '解析失败，请稍后重试' 
      },
      { status: 500 }
    );
  }
}
