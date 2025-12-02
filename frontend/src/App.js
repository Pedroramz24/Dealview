import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import '@/App.css';
import Login from './pages/Login';
import AIDashboard from './pages/AIDashboard';
import MapView from './pages/MapView';
import DealsList from './pages/DealsList';
import DealDetails from './pages/DealDetails';
import Contacts from './pages/Contacts';
import Pipeline from './pages/Pipeline';
import Team from './pages/Team';
import CalendarView from './pages/Calendar';
import Campaigns from './pages/Campaigns';
import Settings from './pages/Settings';
import JoinTeam from './pages/JoinTeam';
import PublicShare from './pages/PublicShare';
import ResetPassword from './pages/ResetPassword';
import MainLayout from './components/MainLayout';
import DualModeLayout from './components/DualModeLayout';
import MarketplacePage from './pages/MarketplacePage';
import MarketplaceDealDetail from './pages/MarketplaceDealDetail';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Handle corrupted localStorage (known Supabase issue)
    if (error && error.status === 401) {
      console.log('[Auth] 401 error detected, clearing corrupted localStorage and retrying...');
      await supabase.auth.signOut(); // Clear corrupted storage
      
      // Retry login
      const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (retryError) throw retryError;
      setUser(retryData.user);
      return retryData;
    }
    
    if (error) throw error;
    setUser(data.user);
    return data;
  };

  const signup = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/marketplace" />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/share/:dealId" element={<PublicShare />} />
          <Route path="/join-team/:token" element={<JoinTeam />} />
          
          {/* Authenticated Routes with Dual-Mode Layout */}
          <Route
            path="/"
            element={user ? <DualModeLayout /> : <Navigate to="/login" />}
          >
            {/* Default route - Marketplace */}
            <Route index element={<Navigate to="/marketplace" replace />} />
            
            {/* Marketplace Routes */}
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/deals/:dealId" element={<MarketplaceDealDetail />} />
            
            {/* Workspace Routes (existing CRM) */}
            <Route path="workspace/dashboard" element={<AIDashboard />} />
            <Route path="workspace/map" element={<MapView />} />
            <Route path="workspace/deals" element={<Pipeline />} />
            <Route path="workspace/deals/:dealId" element={<DealDetails />} />
            <Route path="workspace/contacts" element={<Contacts />} />
            <Route path="workspace/campaigns" element={<Campaigns />} />
            <Route path="workspace/calendar" element={<CalendarView />} />
            <Route path="workspace/team" element={<Team />} />
            
            {/* Settings (shared) */}
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
