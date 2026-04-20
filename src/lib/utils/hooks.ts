'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * localStorage 持久化 hook
 * 
 * @example
 * ```ts
 * const [design, setDesign] = useLocalStorage('design-data', defaultValue);
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 初始渲染统一使用 initialValue，避免 SSR hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // 客户端挂载后从 localStorage 读取已保存的值
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        setStoredValue(parsed);
      }
    } catch (error) {
      console.warn(`读取 localStorage[${key}] 失败:`, error);
    }
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.warn(`写入 localStorage[${key}] 失败:`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

/**
 * 防抖 hook
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedFn = useCallback(
    ((...args: unknown[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );

  return debouncedFn;
}

/**
 * 媒体查询 hook（响应式设计用）
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * 判断是否为移动端
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}
