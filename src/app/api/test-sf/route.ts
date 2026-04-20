import { NextResponse } from 'next/server';
import { isSiliconFlowConfigured, getSiliconFlowClient } from '@/lib/utils/siliconflow-client';

export async function GET() {
  const configured = isSiliconFlowConfigured();
  const client = getSiliconFlowClient();
  
  if (!configured || !client) {
    return NextResponse.json({
      status: 'not_configured',
      message: '硅基流动API未配置或无法创建客户端'
    });
  }
  
  try {
    const response = await client.invoke({
      model: process.env.SILICONFLOW_MODEL || 'Pro/zai-org/GLM-5.1',
      messages: [
        { role: 'user', content: '请用JSON格式返回：{"status":"ok","message":"API正常工作"}' }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    return NextResponse.json({
      status: 'success',
      configured: true,
      content: response.content,
      usage: response.usage
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      configured: true,
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
}
