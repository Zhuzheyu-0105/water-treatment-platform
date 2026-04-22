'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  Droplets,
  Settings2,
  Gauge,
  Sparkles,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface DashboardSidebarProps {
  activeStep: number;
  onStepChange: (step: number) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const navItems: NavItem[] = [
  { id: 'water-quality', label: '水质参数', icon: Droplets },
  { id: 'process-design', label: '工艺设计', icon: Settings2 },
  { id: 'pump-selection', label: '水泵选型', icon: Gauge },
  { id: 'simulation', label: '效果模拟', icon: Sparkles },
  { id: 'summary', label: '设计总结', icon: FileCheck }
];

export function DashboardSidebar({
  activeStep,
  onStepChange,
  collapsed = false,
  onCollapsedChange
}: DashboardSidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen z-40 transition-all duration-300 flex flex-col',
        'bg-[#F5F5F7] dark:bg-[#1D1D1F]',
        collapsed ? 'w-[68px]' : 'w-[220px]',
        'border-r border-[#E5E5E7] dark:border-[#424245]'
      )}
    >
      {/* Logo Area - Apple Style */}
      <div className={cn(
        'flex items-center h-14 px-5',
        collapsed && 'justify-center px-0'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0071E3] to-[#0077ED] rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[#1D1D1F] dark:text-white text-[15px] font-semibold tracking-tight">水处理设计</span>
              <span className="text-[#86868B] dark:text-[#98989D] text-[10px]">智能设计平台</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 bg-gradient-to-br from-[#0071E3] to-[#0077ED] rounded-xl flex items-center justify-center">
            <Droplets className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item, index) => {
          const stepIndex = index;  // 0-based: navItems[0] → step 0
          const isActive = activeStep === stepIndex;
          const isHovered = hoveredItem === index;

          return (
            <button
              key={item.id}
              onClick={() => onStepChange(stepIndex)}
              onMouseEnter={() => setHoveredItem(index)}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                'w-full flex items-center gap-3 h-11 rounded-xl transition-all duration-200',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-[#0071E3] text-white shadow-sm'
                  : 'text-[#1D1D1F] dark:text-white hover:bg-[#E8E8ED] dark:hover:bg-[#2D2D2F]'
              )}
            >
              {/* Icon */}
              <item.icon 
                className={cn(
                  'w-[18px] h-[18px] flex-shrink-0',
                  collapsed ? '' : 'ml-3'
                )} 
                strokeWidth={isActive ? 2.25 : 1.75} 
              />

              {/* Label */}
              {!collapsed && (
                <span className={cn(
                  'text-[14px] font-medium',
                  isActive ? 'font-semibold' : 'font-normal'
                )}>
                  {item.label}
                </span>
              )}

              {/* Active Step Indicator */}
              {isActive && !collapsed && (
                <ChevronRight className="w-4 h-4 ml-auto text-white/70" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={cn(
        'p-4 space-y-2 border-t border-[#E5E5E7] dark:border-[#424245]',
        collapsed && 'flex flex-col items-center gap-3 p-3'
      )}>
        {/* Collapse Toggle */}
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          className={cn(
            'flex items-center justify-center h-10 rounded-xl transition-all duration-200',
            'text-[#86868B] hover:bg-[#E8E8ED] dark:hover:bg-[#2D2D2F] dark:text-[#98989D]',
            collapsed ? 'w-10' : 'w-full px-4'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
              <span className="text-[13px]">收起</span>
            </div>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={cn(
            'flex items-center justify-center h-10 rounded-xl transition-all duration-200',
            'text-[#86868B] hover:bg-[#E8E8ED] dark:hover:bg-[#2D2D2F] dark:text-[#98989D]',
            collapsed ? 'w-10' : 'w-full px-4'
          )}
        >
          {isDark ? (
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4" strokeWidth={1.75} />
              {!collapsed && <span className="text-[13px]">浅色模式</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4" strokeWidth={1.75} />
              {!collapsed && <span className="text-[13px]">深色模式</span>}
            </div>
          )}
        </button>

        {/* User Info */}
        {!collapsed && (
          <div className={cn(
            'flex items-center gap-3 pt-2',
            'border-t border-[#E5E5E7] dark:border-[#424245] mt-2'
          )}>
            <div className="w-8 h-8 bg-gradient-to-br from-[#16A34A] to-[#15803D] rounded-full flex items-center justify-center">
              <span className="text-white text-[12px] font-semibold">设</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#1D1D1F] dark:text-white text-[13px] font-medium">设计师</span>
              <span className="text-[#86868B] dark:text-[#98989D] text-[10px]">v4.0</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
