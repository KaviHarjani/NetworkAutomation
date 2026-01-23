import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  DeviceTabletIcon,
  Cog6ToothIcon,
  PlayIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  DocumentTextIcon,
  RectangleStackIcon,
  BellIcon,
  CodeBracketIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Devices', href: '/devices', icon: DeviceTabletIcon },
    { name: 'Workflows', href: '/workflows', icon: Cog6ToothIcon },
    { name: 'Ansible Workflows', href: '/ansible-workflows', icon: CodeBracketIcon },
    { name: 'Ansible Helper', href: '/ansible-helper', icon: BookOpenIcon },
    { name: 'Chef Workflows', href: '/chef-workflows', icon: CodeBracketIcon },
    { name: 'Executions', href: '/executions', icon: PlayIcon },
    { name: 'Device Mapping', href: '/device-mapping', icon: RectangleStackIcon },
    { name: 'Logs', href: '/logs', icon: DocumentTextIcon },
    { name: 'Webhooks', href: '/webhooks', icon: BellIcon },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActiveRoute = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-gray-900 to-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-16 items-center justify-between px-6 bg-gray-900">
          <div className="flex items-center">
            <Cog6ToothIcon className="h-8 w-8 text-red-500" />
            <span className="ml-2 text-xl font-bold text-white">Network Auto</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActiveRoute(item.href)
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 pt-8 border-t border-gray-700">
            <Link
              to="/admin/"
              className="group flex items-center px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-all duration-200"
            >
              <Cog6ToothIcon className="mr-3 h-5 w-5 flex-shrink-0" />
              Admin Panel
            </Link>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top header */}
        <header className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-white hover:text-red-200"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

            </div>

            <div className="flex items-center space-x-4">

              {/* User dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-2 text-white hover:text-red-200 transition-colors duration-200">
                  <UserCircleIcon className="h-8 w-8" />
                  <span className="hidden md:block font-medium">{user?.username}</span>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <div className="font-medium">{user?.username}</div>
                    <div className="text-gray-500">{user?.email}</div>
                  </div>
                  <Link
                    to="/admin/"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Cog6ToothIcon className="inline h-4 w-4 mr-2" />
                    Admin Panel
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ArrowRightOnRectangleIcon className="inline h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;