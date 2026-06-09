import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import '@/App.css';

// Core Pages
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import DealDetails from './pages/DealDetails';
import Contacts from './pages/Contacts';
import Pipeline from './pages/Pipeline';
import Team from './pages/Team';
import CalendarView from './pages/Calendar';
import Settings from './pages/Settings';
import Portals from './pages/Portals';
import PortalDetail from './pages/PortalDetail';

// Layouts
import MainLayout from './components/MainLayout';

// Public Pages
import PublicShare from './pages/PublicShare';
import ResetPassword from './pages/ResetPassword';

// Investor Portal Pages
import PortalLogin from './pages/PortalLogin';
import PortalMap from './pages/PortalMap';
import PortalDealDetail from './pages/PortalDealDetail';
import PortalLayout from './components/PortalLayout';

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
    
    if (error && error.status === 401) {
      await supabase.auth.signOut();
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#000'
      }}>
        <div style={{ color: '#ff0000' }}>Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/share/:dealId" element={<PublicShare />} />

          {/* Investor Portal Routes (separate auth, no Supabase JWT) */}
          <Route path="/portal/:portalId" element={<PortalLogin />} />
          <Route path="/portal/:portalId/*" element={<PortalLayout />}>
            <Route path="map" element={<PortalMap />} />
            <Route path="deal/:dealId" element={<PortalDealDetail />} />
          </Route>

          {/* Protected Routes - Main CRM */}
          <Route
            path="/"
            element={user ? <MainLayout /> : <Navigate to="/login" />}
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="map" element={<MapView />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="deals/:dealId" element={<DealDetails />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="team" element={<Team />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="settings" element={<Settings />} />
            <Route path="portals" element={<Portals />} />
            <Route path="portals/:portalId" element={<PortalDetail />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
