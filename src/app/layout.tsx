import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '智能水处理系统设计平台',
    template: '%s | 智能水处理系统',
  },
  description:
    'AI驱动的水处理工程设计工具，支持水质报告解析、自定义工艺流程设计、膜组件选型、过滤效果模拟和水泵推荐。',
  keywords: [
    '水处理',
    '反渗透',
    'RO膜',
    '超滤',
    '纳滤',
    '膜分离',
    '水质分析',
    '工艺设计',
    '水泵选型',
    'AI模拟',
    '水处理工程',
    '膜组件',
    'DuPont',
    'Dow Filmtec',
  ],
  authors: [{ name: 'Water Treatment Design Team' }],
  openGraph: {
    title: '智能水处理系统设计平台 | AI驱动 · 专业设计',
    description:
      'AI驱动的水处理工程设计工具，支持水质报告解析、自定义工艺流程设计、过滤效果精确模拟。',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
