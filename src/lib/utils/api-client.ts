/**
 * 全局 API 错误处理工具
 * 
 * 提供统一的 API 请求封装，包含：
 * - 自动超时控制
 * - 请求重试机制
 * - 错误分类和友好提示
 * - 响应类型校验
 */

/** API 请求配置 */
export interface ApiRequestConfig extends RequestInit {
  /** 超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 最大重试次数，默认 0（不重试） */
  maxRetries?: number;
  /** 重试延迟（毫秒），默认 1000 */
  retryDelay?: number;
  /** 是否只对 5xx 错误重试，默认 true */
  retryOnServerErrorOnly?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
}

/** API 响应结构 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

/** 错误类型枚举 */
export type ErrorType = 'network' | 'timeout' | 'server' | 'validation' | 'unknown';

/** 分类后的错误信息 */
export interface ClassifiedError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  statusCode?: number;
}

/**
 * 对错误进行分类，返回友好的错误消息
 */
export function classifyError(error: unknown, defaultMessage = '请求失败，请稍后重试'): ClassifiedError {
  // 网络错误（无响应）
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: '网络连接失败，请检查网络后重试',
      originalError: error
    };
  }

  // 超时错误
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: '请求超时，请稍后重试',
      originalError: error
    };
  }

  // HTTP 响应错误
  if (error instanceof Response) {
    const status = error.status;
    const message = getHttpStatusMessage(status);
    return {
      type: status >= 500 ? 'server' : status >= 400 ? 'validation' : 'unknown',
      message,
      originalError: error,
      statusCode: status
    };
  }

  // 标准错误对象
  if (error instanceof Error) {
    return {
      type: 'unknown',
      message: error.message || defaultMessage,
      originalError: error
    };
  }

  return {
    type: 'unknown',
    message: defaultMessage,
    originalError: error
  };
}

/**
 * 根据HTTP状态码返回友好消息
 */
function getHttpStatusMessage(status: number): string {
  const messages: Record<number, string> = {
    400: '请求参数错误，请检查输入',
    401: '身份认证失败，请重新登录',
    403: '无权限执行此操作',
    404: '请求的资源不存在',
    408: '请求超时，请稍后重试',
    429: '请求过于频繁，请稍后重试',
    500: '服务器内部错误，请稍后重试',
    502: '网关错误，服务暂时不可用',
    503: '服务维护中，请稍后重试',
    504: '网关超时，请稍后重试'
  };
  return messages[status] || `请求失败 (${status})`;
}

/**
 * 延迟指定时间
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试和超时的 fetch 封装
 * 
 * @example
 * ```ts
 * const result = await apiFetch<SimulationData>('/api/simulation/filter-effect', {
 *   method: 'POST',
 *   body: JSON.stringify(payload),
 *   maxRetries: 1,
 *   timeout: 30000
 * });
 * 
 * if (result.success) {
 *   // result.data 包含类型安全的数据
 * }
 * ```
 */
export async function apiFetch<T = unknown>(
  url: string,
  config: ApiRequestConfig = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = 30000,
    maxRetries = 0,
    retryDelay = 1000,
    retryOnServerErrorOnly = true,
    errorMessage,
    ...fetchConfig
  } = config;

  let lastError: unknown = null;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 尝试解析 JSON
      const contentType = response.headers.get('content-type');
      let data: ApiResponse<T>;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = {
          success: false,
          error: `服务器返回了非JSON格式数据 (${response.status})`
        } as ApiResponse<T>;
      }

      // 如果是 5xx 错误且允许重试
      if (response.status >= 500 && retryCount < maxRetries) {
        lastError = response;
        retryCount++;
        console.warn(`API 请求失败 (${response.status})，第 ${retryCount} 次重试...`);
        await delay(retryDelay * retryCount); // 指数退避
        continue;
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      // 超时和网络错误可以重试
      const shouldRetry = 
        retryCount < maxRetries && 
        (error instanceof DOMException && error.name === 'AbortError' ||
         error instanceof TypeError);

      if (shouldRetry) {
        retryCount++;
        console.warn(`API 请求出错，第 ${retryCount} 次重试...`);
        await delay(retryDelay * retryCount);
        continue;
      }

      // 重试次数用尽，返回分类后的错误
      const classified = classifyError(error, errorMessage);
      return {
        success: false,
        error: classified.message
      } as ApiResponse<T>;
    }
  }

  // 理论上不会到达这里，作为安全兜底
  const classified = classifyError(lastError, errorMessage);
  return {
    success: false,
    error: classified.message
  } as ApiResponse<T>;
}

/**
 * 快捷方法：POST 请求
 */
export async function apiPost<T = unknown>(
  url: string,
  body: unknown,
  config: Omit<ApiRequestConfig, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    ...config,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers
    },
    body: JSON.stringify(body)
  });
}
