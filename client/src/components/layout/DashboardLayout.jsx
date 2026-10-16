import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-city-darkest text-slate-100 flex">
      {/* Role-Specific Navigation Sidebar (with mobile drawer support) */}
      <Sidebar />

      {/* Main Operational Canvas */}
      <div className="flex-1 flex flex-col min-w-0 pl-0 md:pl-20 lg:pl-64 transition-all duration-300">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="py-4 px-6 md:px-8 border-t border-city-border/40 text-center text-xs text-slate-400 font-mono">
          Smart City Traffic Intelligence & Management System • Bengaluru Demonstration Node • MCA Major Project
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
