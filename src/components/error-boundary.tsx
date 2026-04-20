'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件 - 捕获并优雅展示子组件错误
 * 
 * 使用示例：
 * ```tsx
 * <ErrorBoundary fallback={<div>出错了</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // 调用自定义错误处理
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReport = () => {
    // 这里可以集成错误报告服务
    console.error('Error report:', {
      error: this.state.error,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  public render() {
    if (this.state.hasError) {
      // 使用自定义 fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div className="w-full max-w-2xl mx-auto p-6">
          <Alert variant="destructive" className="border-2">
            <AlertCircle className="w-6 h-6" />
            <AlertTitle className="text-lg font-semibold">
              组件渲染失败
            </AlertTitle>
            <AlertDescription className="mt-4 space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                抱歉，该组件出现了错误。您可以尝试重新加载或联系技术支持。
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs mt-4">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    错误详情（开发环境）
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-60">
                    <code>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </code>
                  </pre>
                </details>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  重新加载
                </Button>
                
                <Button
                  onClick={this.handleReport}
                  variant="secondary"
                  size="sm"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  报告错误
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;