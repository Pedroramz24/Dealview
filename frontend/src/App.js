import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { CapabilitiesProvider } from './contexts/CapabilitiesContext';
import '@/App.css';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import AIDashboard from './pages/AIDashboard';
import UnifiedDashboard from './pages/UnifiedDashboard';
import UnifiedProfile from './pages/UnifiedProfile';
import AdminDashboard from './pages/AdminDashboard';
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
import OnboardingWizard from './pages/OnboardingWizard';
import AdminApprovalQueue from './pages/AdminApprovalQueue';
import SavedDealsPage from './pages/SavedDealsPage';
import BrokerAnalytics from './pages/BrokerAnalytics';
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
      <CapabilitiesProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/marketplace" />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/share/:dealId" element={<PublicShare />} />
          <Route path="/join-team/:token" element={<JoinTeam />} />
          <Route path="/onboarding" element={user ? <OnboardingWizard /> : <Navigate to="/login" />} />
          
          {/* Marketplace Routes - DualModeLayout (minimal sidebar) */}
          <Route
            path="/marketplace"
            element={user ? <DualModeLayout /> : <Navigate to="/login" />}
          >
            <Route index element={<MarketplacePage />} />
            <Route path="deals/:dealId" element={<MarketplaceDealDetail />} />
            <Route path="saved" element={<SavedDealsPage />} />
          </Route>

          {/* Workspace Routes - MainLayout (full CRM sidebar) */}
          <Route
            path="/workspace"
            element={user ? <MainLayout /> : <Navigate to="/login" />}
          >
            <Route path="dashboard" element={<UnifiedDashboard />} />
            <Route path="profile/:userId" element={<UnifiedProfile />} />
            <Route path="map" element={<MapView />} />
            <Route path="deals" element={<Pipeline />} />
            <Route path="deals/:dealId" element={<DealDetails />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="team" element={<Team />} />
            <Route path="admin/approvals" element={<AdminApprovalQueue />} />
            <Route path="admin/dashboard" element={<AdminDashboard />} />
            <Route path="marketplace-analytics" element={<BrokerAnalytics />} />
          </Route>

          {/* Simple /dashboard and /profile redirects */}
          <Route path="/dashboard" element={user ? <Navigate to="/workspace/dashboard" /> : <Navigate to="/login" />} />
          <Route path="/profile/:userId" element={user ? <Navigate to={`/workspace/profile/${user.id}`} /> : <Navigate to="/login" />} />

          {/* Settings - MainLayout */}
          <Route
            path="/settings"
            element={user ? <MainLayout /> : <Navigate to="/login" />}
          >
            <Route index element={<Settings />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={user ? <Navigate to="/marketplace" replace /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
