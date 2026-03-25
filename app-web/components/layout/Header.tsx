'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const pathname = usePathname();
  
  // Basic breadcrumb logic based on pathname
  const pathSegments = pathname.split('/').filter(Boolean);

  return (
    <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 lg:px-10">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <nav className="flex items-center" aria-label="Breadcrumb">
          <ol role="list" className="flex items-center space-x-2 sm:space-x-4">
            <li>
              <div>
                <Link href="/dashboard" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <Home className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Dashboard</span>
                </Link>
              </div>
            </li>
            
            {pathSegments.map((segment, index) => {
              // We skip 'dashboard' since Home icon represents it
              if (segment === 'dashboard') return null;
              
              const isLast = index === pathSegments.length - 1;
              const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
              // Capitalize first letter
              const title = segment.charAt(0).toUpperCase() + segment.slice(1);

              return (
                <li key={segment}>
                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                    <Link
                      href={href}
                      className={`ml-2 sm:ml-4 text-sm font-medium ${
                        isLast 
                          ? 'text-gray-700 dark:text-gray-200' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {title}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </header>
  );
}
