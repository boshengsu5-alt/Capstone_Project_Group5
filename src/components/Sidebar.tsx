import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Briefcase, FileText, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Projects', href: '/projects', icon: Briefcase },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
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
            <div className="bg-primary-600 p-1.5 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">
              AdminPro
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
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      isActive
                        ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                        : "text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                      "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors"
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
