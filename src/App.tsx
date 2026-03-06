import type { FC } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

const App: FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          {/* Add more routes here, e.g., users, settings, etc. */}
          <Route path="*" element={<div className="p-8 text-center text-gray-500">Page not found</div>} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
