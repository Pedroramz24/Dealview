import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { Users, Loader2, CheckCircle, XCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const JoinTeam = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Not logged in - redirect to login with return URL
      navigate(`/login?redirect=/join-team/${token}`);
      return;
    }
    
    // User is logged in, proceed to join
    setLoading(false);
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams/join/${token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Successfully joined ${data.team.name}!`);
        navigate('/team');
      } else {
        setError(data.detail || 'Failed to join team');
        toast.error(data.detail || 'Failed to join team');
      }
    } catch (error) {
      console.error('Error joining team:', error);
      setError('Failed to join team');
      toast.error('Failed to join team');
    } finally {
      setJoining(false);
    }
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
        <Loader2 size={40} style={{ color: '#00b8d4' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#000', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(15, 15, 15, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          margin: '0 auto 24px',
          borderRadius: '12px',
          background: 'rgba(0, 184, 212, 0.1)',
          border: '1px solid rgba(0, 184, 212, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Users size={36} style={{ color: '#00b8d4' }} />
        </div>

        <h1 style={{ 
          color: '#fff', 
          fontSize: '26px', 
          fontWeight: 700, 
          marginBottom: '12px',
          letterSpacing: '-0.5px'
        }}>
          Join Team
        </h1>
        
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.5)', 
          fontSize: '15px', 
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          You've been invited to join a team. Click below to accept the invitation.
        </p>

        {error && (
          <div style={{
            padding: '14px',
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <XCircle size={18} style={{ color: '#ff4444' }} />
            <span style={{ color: '#ff4444', fontSize: '14px' }}>{error}</span>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          style={{
            width: '100%',
            padding: '14px',
            background: joining ? 'rgba(0, 184, 212, 0.5)' : '#00b8d4',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontSize: '15px',
            fontWeight: 700,
            cursor: joining ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '16px'
          }}
        >
          {joining ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          {joining ? 'Joining...' : 'Join Team'}
        </button>

        <button
          onClick={() => navigate('/team')}
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Go to Teams
        </button>
      </div>
    </div>
  );
};

export default JoinTeam;
