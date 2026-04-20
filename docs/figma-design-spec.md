# 水处理系统设计平台 - Figma 设计规格书 v3.5

**版本**: v3.5
**更新日期**: 2026-04-13
**设计规范**: Apple Human Interface Guidelines (iOS 设计语言) + Modern Dashboard Style

---

## 🎨 设计系统基础

### 色彩系统

#### Dashboard 风格配色（参考图片风格）
```
背景色:           #f8fafc (slate-50) - 浅灰背景
卡片背景:         #ffffff (白色)
侧边栏背景:       #3b82f6 (blue-500) - 蓝色侧边栏
侧边栏文字:        #ffffff (白色)
侧边栏悬停:       #2563eb (blue-600)
主内容区:          #ffffff (白色)
卡片阴影:         0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
圆角:             12px (rounded-xl) - 大圆角卡片
```

#### 主色调
```
Primary Blue:      #3b82f6 (Tailwind: blue-500)
Primary Hover:     #2563eb (Tailwind: blue-600)
Primary Light:     #dbeafe (Tailwind: blue-100)
Primary Dark:      #1d4ed8 (Tailwind: blue-700)
```

#### 分类语义色
| 分类 | 颜色 | Tailwind | 用途 |
|------|------|----------|------|
| 基础理化 | 蓝色 | `bg-blue-500` | pH、TDS、电导率等 |
| 阳离子 | 红色 | `bg-red-500` | Ca²⁺、Mg²⁺、Na⁺等 |
| 阴离子 | 绿色 | `bg-green-500` | Cl⁻、SO₄²⁻、HCO₃⁻等 |
| 有机/生物 | 紫色 | `bg-purple-500` | COD、BOD、细菌等 |
| 安全性 | 橙色 | `bg-orange-500` | 砷、汞、铅等毒性指标 |
| 营养盐 | 青色 | `bg-cyan-500` | 氨氮、总氮、总磷等 |
| 其他 | 灰色 | `bg-muted` | 锶、铍、钡等特殊指标 |

#### 中性色
```
Background:        #f8fafc (slate-50)
Card Background:   #ffffff (白色)
Border:            #e2e8f0 (slate-200)
Border Hover:      #cbd5e1 (slate-300)
Text Primary:      #0f172a (slate-900)
Text Secondary:    #475569 (slate-600)
Text Muted:        #64748b (slate-500)
Text Light:        #94a3b8 (slate-400)
```

---

## 📐 字体层级系统 (iOS HIG)

### 字体家族
```
Primary: 'Inter', system-ui, -apple-system, sans-serif
Mono: 'JetBrains Mono', monospace (用于数值显示)
```

### 字体层级
| 层级 | 类名 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|------|
| L1 | `text-base font-semibold` | 16px | 600 | 1.5 | 页面主标题 |
| L2 | `text-sm font-semibold` | 14px | 600 | 1.5 | 卡片标题、Tab 标签 |
| L3 | `text-xs font-medium` | 12px | 500 | 1.4 | 分类标题、小标题 |
| L4 | `text-sm font-normal` | 14px | 400 | 1.5 | 正文、输入值 |
| L5 | `text-xs font-normal` | 12px | 400 | 1.4 | 说明文字、单位 |
| L6 | `text-[11px] font-normal` | 11px | 400 | 1.4 | 辅助信息、去除率 |

---

## 🧱 组件规格

### 1. Dashboard 整体布局

```
┌──────────────────────────────────────────────────────────┐
│  ┌────────────┐ ┌──────────────────────────────────────┐ │
│  │  蓝色      │ │  Header: 页面标题 + 面包屑导航        │ │
│  │  侧边栏    │ ├──────────────────────────────────────┤ │
│  │  - Logo    │ │                                      │ │
│  │  - 导航菜单│ │  主内容区                            │ │
│  │  - 用户    │ │  (白色背景)                          │ │
│  │            │ │                                      │ │
│  └────────────┘ └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**侧边栏规格**:
- 宽度: 240px (固定) / 64px (收起状态)
- 背景: `#3b82f6` (blue-500)
- 文字: `#ffffff` (白色)
- 菜单项高度: 44px (最小触摸目标)
- 菜单项圆角: 8px (rounded-lg)
- 激活菜单项: 左侧 3px 白色指示条 + 背景变浅

---

### 2. 水质参数输入卡片

**卡片规格**:
- 背景: `#ffffff`
- 圆角: 12px (rounded-xl)
- 阴影: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- 内边距: 24px
- 卡片间距: 16px

---

### 3. Tab 导航系统

**布局**: 双行布局（4列 + 3列）

**按钮规格**:
- 高度: 44px (h-11) - iOS 最小触摸目标
- 宽度: 自适应网格
- 圆角: 8px (rounded-lg)
- 字体: text-xs (12px), font-medium (500)
- 图标: w-3 h-3 (12×12px)

**状态样式**:
- 默认: 背景 bg-muted/70, 文字 text-muted-foreground
- 悬停: 背景 bg-muted, 文字 text-foreground
- 选中: 背景 bg-background, 文字 text-foreground, 阴影 shadow-sm

---

### 4. 参数输入网格

**布局响应式**:
- Mobile: 2 列
- Tablet: 3 列
- Desktop: 4 列

**输入框规格**:
- 高度: 44px (h-11)
- 圆角: 12px (rounded-xl)
- 边框: `border border-input`
- 焦点: `ring-2 ring-primary ring-offset-2`
- 字号: text-sm (14px)

---

### 5. 分类标题栏

```
┌─────────────────────────────────────┐
│ █ 基础理化                      6 项 │  ← 左侧彩色竖条 + 标题 + 计数
└─────────────────────────────────────┘
```

**规格**:
- 竖条: 6px × 16px, rounded-full, 对应分类语义色
- 标题: text-xs, font-medium
- 计数: text-[11px], text-muted-foreground

---

## 📱 响应式断点

| 断点 | 宽度范围 | 布局策略 |
|------|----------|----------|
| Mobile | 320px - 639px | 2列参数网格，侧边栏收起 |
| Tablet | 640px - 1023px | 3列参数网格，侧边栏展开 |
| Desktop | 1024px - 1279px | 4列参数网格，侧边栏展开 |
| Large Desktop | 1280px+ | 4列参数网格，最大宽度1440px |

---

## 📊 Figma 文件结构建议

```
📁 水处理系统设计平台 v3.5
├── 📄 Cover (封面)
├── 🎨 Design Tokens (设计令牌)
│   ├── Colors (色彩系统)
│   ├── Typography (字体层级)
│   ├── Spacing (间距系统)
│   └── Shadows (阴影系统)
├── 🧱 Components (组件库)
│   ├── Buttons (按钮)
│   ├── Inputs (输入框)
│   ├── Cards (卡片)
│   ├── Tabs (标签页)
│   └── Badges (徽章)
├── 📱 Patterns (模式)
│   ├── 水质参数输入表单
│   ├── 进出水对比卡片
│   └── 快速统计卡片
└── 🖼️ Screens (页面)
    ├── 首页-分步向导
    ├── 水质参数输入页
    ├── 工艺设计页
    ├── 水泵选型页
    └── 设计总结页
```

---

## 🔗 参考资源

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**创建日期**: 2026-04-13
**最后更新**: 2026-04-13
**版本**: v3.5
