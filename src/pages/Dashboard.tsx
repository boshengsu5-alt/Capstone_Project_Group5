import type { FC } from 'react';
import { Users, DollarSign, Activity, CreditCard } from 'lucide-react';

const Dashboard: FC = () => {
  const stats = [
    { name: 'Total Revenue', stat: '$71,897', icon: DollarSign, trend: 'up', change: '12%' },
    { name: 'Active Users', stat: '58.16%', icon: Users, trend: 'up', change: '5.4%' },
    { name: 'Transactions', stat: '23,546', icon: CreditCard, trend: 'down', change: '3.2%' },
    { name: 'System Activity', stat: '99.9%', icon: Activity, trend: 'up', change: '0.1%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden dark:bg-gray-800 border-gray-100 dark:border-gray-700 border"
          >
            <dt>
              <div className="absolute bg-primary-500 rounded-md p-3">
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate dark:text-gray-400">{item.name}</p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{item.stat}</p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  item.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {item.trend === 'up' ? '+' : '-'}{item.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Content Area Placeholder */}
      <div className="bg-white shadow rounded-lg p-6 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 min-h-[400px]">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          No recent activity to show.
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
