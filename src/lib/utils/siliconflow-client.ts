/**
 * 硅基流动 API 客户端
 * 
 * 文档: https://docs.siliconflow.cn/
 * 基础URL: https://api.siliconflow.cn/v1
 * 兼容 OpenAI SDK 格式
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

interface InvokeOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class SiliconFlowClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.siliconflow.cn/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private formatMessages(messages: ChatMessage[]) {
    return messages.map(msg => {
      if (typeof msg.content === 'string') return msg;
      return {
        role: msg.role,
        content: msg.content.map(item => {
          if (item.type === 'image_url') {
            return { type: 'image_url' as const, image_url: { url: item.image_url?.url || '' } };
          }
          return item;
        })
      };
    });
  }

  /**
   * 调用硅基流动API (非流式)
   */
  async invoke(options: InvokeOptions): Promise<{ content: string; usage: ChatCompletionResponse['usage'] }> {
    const { model, messages, temperature = 0.7, max_tokens = 4096 } = options;
    const formattedMessages = this.formatMessages(messages);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature,
        max_tokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SiliconFlow API error: ${response.status} - ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  }

  /**
   * 调用硅基流动API (流式)
   */
  async *invokeStream(options: InvokeOptions): AsyncGenerator<string> {
    const { model, messages, temperature = 0.7, max_tokens = 4096 } = options;
    const formattedMessages = this.formatMessages(messages);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature,
        max_tokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SiliconFlow API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const chunk = JSON.parse(data);
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }
}

/**
 * 创建硅基流动客户端实例
 */
export function createSiliconFlowClient(): SiliconFlowClient | null {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new SiliconFlowClient(apiKey);
}

/**
 * 检查是否配置了硅基流动API
 */
export function isSiliconFlowConfigured(): boolean {
  return !!process.env.SILICONFLOW_API_KEY;
}

/**
 * 获取硅基流动客户端单例
 */
let _client: SiliconFlowClient | null = null;

export function getSiliconFlowClient(): SiliconFlowClient | null {
  if (!isSiliconFlowConfigured()) {
    return null;
  }
  
  if (!_client) {
    _client = createSiliconFlowClient();
  }
  
  return _client;
}
