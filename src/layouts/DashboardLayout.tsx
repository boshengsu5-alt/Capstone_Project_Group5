import { useState } from 'react';
import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
