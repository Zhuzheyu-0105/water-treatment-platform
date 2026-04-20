# 快速参考卡片

## 🚀 开发命令

```bash
# 开发
pnpm dev              # 启动开发服务器
coze dev             # 使用 coze CLI

# 构建
pnpm build           # 构建生产版本
coze build           # 使用 coze CLI

# 运行
pnpm start           # 启动生产服务器
coze start           # 使用 coze CLI

# 代码质量
pnpm lint            # ESLint 检查
pnpm lint:fix        # 自动修复
pnpm ts-check        # TypeScript 类型检查
```

---

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── water-quality/ # 水质解析 API
│   │   ├── design/        # 设计方案 API
│   │   └── simulation/    # 模拟 API
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 组件 (61 个)
│   ├── error-boundary.tsx # 错误边界
│   ├── loading-skeleton.tsx # 加载骨架屏
│   └── [业务组件]
├── types/                 # TypeScript 类型
│   └── index.ts          # 类型定义
├── lib/                   # 工具库
│   ├── constants/        # 常量数据库
│   │   ├── water-quality.ts
│   │   ├── membranes.ts
│   │   ├── uf-membranes.ts
│   │   ├── pumps.ts
│   │   └── process.ts
│   └── utils/           # 工具函数
│       ├── filter-simulation.ts
│       ├── pump-calculations.ts
│       └── pump-selection.ts
└── hooks/               # 自定义 Hooks
```

---

## 🎯 核心 API

### 水质解析 API

```typescript
POST /api/water-quality/parse
Body: {
  image?: string,        // Base64 图片
  text?: string,         // 文本内容
  waterType?: 'inlet' | 'outlet'
}
Response: {
  success: boolean
  data: WaterQualityParams
  missingParams: string[]
  analysis: string
}
```

### 过滤模拟 API

```typescript
POST /api/simulation/filter-effect
Body: {
  inletWaterQuality: WaterQualityParams
  outletTargetQuality: Partial<WaterQualityParams>
  processUnits: ProcessUnit[]
  designFlow: DesignFlow
}
Response: {
  success: boolean
  simulation: SimulationStep[]
  finalResult: {
    waterQuality: WaterQualityParams
    meetsTarget: boolean
    issues: string[]
    recommendations: string[]
  }
  statistics: {
    totalTDSRemoval: string
    totalTurbidityRemoval: string
    totalCODRemoval: string
  }
}
```

---

## 💡 常用代码片段

### 类型导入

```typescript
import { 
  WaterQualityParams, 
  DesignFlow, 
  ProcessUnit,
  SimulationResult 
} from '@/types';
```

### 错误边界使用

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary fallback={<div>出错了</div>}>
  <YourComponent />
</ErrorBoundary>
```

### 加载骨架屏使用

```tsx
import { WaterQualitySkeleton } from '@/components/loading-skeleton';

{isLoading ? (
  <WaterQualitySkeleton />
) : (
  <WaterQualityInput {...props} />
)}
```

### 性能优化模式

```tsx
import { useMemo, useCallback } from 'react';

// 缓存对象
const data = useMemo(() => computeExpensive(data), [data]);

// 缓存函数
const handler = useCallback(() => {
  // 处理逻辑
}, [dependencies]);
```

---

## 🔧 常量库使用

### RO 膜推荐

```typescript
import { 
  roMembranes, 
  recommendMembraneCategory 
} from '@/lib/constants/membranes';

const category = recommendMembraneCategory(2000); // 'bw'
const membranes = roMembranes.filter(m => m.category === 'bw');
```

### 超滤系统计算

```typescript
import { 
  calculateUFSystem,
  recommendUFMembrane 
} from '@/lib/constants/uf-membranes';

const config = calculateUFSystem({
  flowRate: 50,
  flux: 50,
  membraneModel: 'SFP-2640'
});
```

### 水泵推荐

```typescript
import { recommendPump } from '@/lib/constants/pumps';

const pump = recommendPump({
  flowRate: 50,
  head: 150,
  series: 'CDL'
});
```

---

## 🎨 UI 组件库

### 表单组件

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
```

### 布局组件

```tsx
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
```

### 反馈组件

```tsx
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
```

---

## 📊 设计参数速查

### RO 膜选择指南

| TDS 范围 (mg/L) | 推荐膜类型 | 工作压力 (bar) |
|----------------|-----------|---------------|
| < 1000 | LE (低能耗) | 8-12 |
| 1000-3000 | BW (苦咸水) | 10-15 |
| 3000-10000 | BW (高脱盐) | 15-25 |
| > 10000 | SW (海水) | 55-70 |

### 精密过滤精度

| 精度 | 应用场景 |
|------|---------|
| 100μm | 粗过滤，保护超滤 |
| 50μm | 保护精密过滤器 |
| 20μm | 中等精度 |
| 10μm | 标准精度 |
| 5μm | RO 进水标准 |
| 1μm | 高精度预处理 |
| 0.45μm | 超纯水预处理 |
| 0.22μm | 除菌级过滤 |

### 回收率推荐

| 原水类型 | 推荐回收率 |
|---------|-----------|
| 自来水/井水 | 75-80% |
| 地表水 | 65-75% |
| 苦咸水 | 50-70% |
| 海水 | 35-45% |
| 废水回用 | 50-70% |

---

## 🐛 调试技巧

### 浏览器控制台

```javascript
// 查看组件状态
console.log('Current state:', state);

// 性能分析
console.time('operation');
// ... 代码
console.timeEnd('operation');

// 错误追踪
console.error('Error details:', error);
```

### React DevTools

1. 安装 React Developer Tools
2. 检查组件树
3. 查看 Props 和 State
4. 性能分析器

### Network 面板

1. 查看 API 请求
2. 检查请求/响应数据
3. 分析加载时间
4. 调试错误响应

---

## 📝 Git 提交规范

```bash
# 功能开发
git commit -m "feat: 添加超滤系统计算功能"

# Bug 修复
git commit -m "fix: 修复 RO 膜数量计算错误"

# 文档更新
git commit -m "docs: 更新 API 使用示例"

# 代码优化
git commit -m "refactor: 优化水泵选型算法"
```

---

## 🔗 有用链接

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Dow Filmtec 手册](../FilmTec™反渗透和纳滤膜元件产品与技术手册 -2022-含书签.pdf)
- [DuPont 超滤手册](../Ultraﬁltration 超滤膜产品与技术手册.pdf)

---

**最后更新**: 2026-04-04  
**版本**: v2.1