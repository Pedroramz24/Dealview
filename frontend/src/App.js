import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import '@/App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import DealsList from './pages/DealsList';
import DealDetails from './pages/DealDetails';
import Contacts from './pages/Contacts';
import Pipeline from './pages/Pipeline';
import Team from './pages/Team';
import CalendarView from './pages/Calendar';
import Campaigns from './pages/Campaigns';
import PublicShare from './pages/PublicShare';
import MainLayout from './components/MainLayout';

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
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/share/:dealId" element={<PublicShare />} />
          <Route
            path="/"
            element={user ? <MainLayout /> : <Navigate to="/login" />}
          >
            <Route index element={<MapView />} />
            <Route path="map" element={<MapView />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="deals" element={<DealsList />} />
            <Route path="deals/:dealId" element={<DealDetails />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
