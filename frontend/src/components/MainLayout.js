import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Map, LayoutDashboard, FileText, Users, Trello, UsersRound, LogOut } from 'lucide-react';
import { Button } from './ui/button';

const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Map', icon: Map, exact: true },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/deals', label: 'Deals', icon: FileText },
    { path: '/contacts', label: 'Contacts', icon: Users },
    { path: '/pipeline', label: 'Pipeline', icon: Trello },
    { path: '/team', label: 'Team', icon: UsersRound },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>Pedro Armando</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.full_name}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `sidebar-nav flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'active' : 'text-gray-700'}`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start"
            data-testid="logout-button"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
