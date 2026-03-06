import type { FC } from 'react';
import { Menu, Bell, User } from 'lucide-react';

interface NavbarProps {
  setSidebarOpen: (isOpen: boolean) => void;
}

const Navbar: FC<NavbarProps> = ({ setSidebarOpen }) => {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
        </form>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-gray-700" aria-hidden="true" />

          {/* Profile dropdown stub */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <button
              type="button"
              className="flex items-center gap-x-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white"
              id="user-menu-button"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-2 text-sm font-medium leading-6 text-gray-700 dark:text-gray-300" aria-hidden="true">
                  Admin User
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
