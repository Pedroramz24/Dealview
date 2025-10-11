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

  return (\n    <div className=\"flex h-screen\" style={{ background: 'var(--bg-base)' }}>\n      {/* Sidebar */}\n      <div className=\"w-64 flex flex-col\" style={{\n        background: 'var(--glass-bg)',\n        borderRight: '1px solid var(--border-subtle)',\n        backdropFilter: 'blur(16px)'\n      }}>\n        <div className=\"p-6\" style={{ borderBottom: '1px solid var(--border-subtle)' }}>\n          <h1 className=\"text-2xl font-bold\" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Pedro Armando</h1>\n          <p className=\"text-sm mt-1\" style={{ color: 'var(--text-secondary)' }}>{user?.full_name}</p>\n        </div>\n\n        <nav className=\"flex-1 p-4 space-y-2\">\n          {navItems.map((item) => (\n            <NavLink\n              key={item.path}\n              to={item.path}\n              end={item.exact}\n              className={({ isActive }) =>\n                `sidebar-nav flex items-center space-x-3 ${isActive ? 'active' : ''}`\n              }\n              data-testid={`nav-${item.label.toLowerCase()}`}\n            >\n              <item.icon className=\"w-5 h-5\" />\n              <span className=\"font-medium\">{item.label}</span>\n            </NavLink>\n          ))}\n        </nav>\n\n        <div className=\"p-4\" style={{ borderTop: '1px solid var(--border-subtle)' }}>\n          <button\n            onClick={handleLogout}\n            data-testid=\"logout-button\"\n            className=\"w-full flex items-center justify-start px-4 py-3 rounded-lg\"\n            style={{\n              background: 'var(--glass-bg)',\n              border: '1px solid var(--glass-border)',\n              color: 'var(--text-secondary)',\n              transition: 'all 150ms',\n              cursor: 'pointer'\n            }}\n          >\n            <LogOut className=\"w-5 h-5 mr-3\" />\n            Sign Out\n          </button>\n        </div>\n      </div>\n\n      {/* Main content */}\n      <div className=\"flex-1 overflow-auto\">\n        <Outlet />\n      </div>\n    </div>\n  );\n};\n\nexport default MainLayout;
