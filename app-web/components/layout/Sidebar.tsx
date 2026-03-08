'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  CalendarClock, 
  Undo2, 
  AlertTriangle, 
  X,
  Settings,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();

  // 2. 严格对齐组长要求的业务菜单和路由
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Assets', href: '/dashboard/assets', icon: Package },
    { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarClock },
    { name: 'Returns', href: '/dashboard/returns', icon: Undo2 },
    { name: 'Damage Reports', href: '/dashboard/damage', icon: AlertTriangle },
    { name: 'Users', href: '/dashboard/users', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile background overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/80 z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            {/* 换个更符合资产管理的颜色或 Logo */}
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-400">
              Letao Assets
            </span>
          </div>
          <button
            type="button"
            className="lg:hidden text-gray-400 hover:text-gray-500"
            onClick={() => setIsOpen(false)}
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col mt-6 px-3">
          <ul role="list" className="flex flex-1 flex-col gap-y-2">
            {navigation.map((item) => {
              // 兼容子路由高亮（比如在 /dashboard/assets/add 时 Assets 依然高亮）
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)} // 移动端点击后自动关闭
                    className={cn(
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                      "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-600"
                    )} aria-hidden="true" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
