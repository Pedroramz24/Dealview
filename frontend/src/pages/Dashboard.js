import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { DollarSign, TrendingUp, FileText, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const assetTypeData = Object.entries(stats?.asset_type_distribution || {}).map(([name, value]) => ({
    name,
    value,
  }));

  const stageData = Object.entries(stats?.stage_counts || {}).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="p-8" data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Overview of your pipeline and deals</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
              <DollarSign className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Total Pipeline Value</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }} data-testid="total-pipeline-value">{formatCurrency(stats?.total_pipeline_value || 0)}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
              <FileText className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Total Deals</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }} data-testid="total-deals">{stats?.total_deals || 0}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
              <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Avg Deal Size</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }} data-testid="avg-deal-size">{formatCurrency(stats?.avg_deal_size || 0)}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
              <PieChart className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Asset Types</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{Object.keys(stats?.asset_type_distribution || {}).length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Distribution */}
        <div className="glass-surface p-6">
          <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Deals by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" style={{ fontSize: '13px' }} />
              <YAxis stroke="var(--text-secondary)" style={{ fontSize: '13px' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--glass-bg)', 
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(16px)',
                  color: 'var(--text-primary)'
                }}
              />
              <Bar dataKey="value" fill="var(--accent)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Type Distribution */}
        <div className="glass-surface p-6">
          <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Asset Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={assetTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '13px' }}
              >
                {assetTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--glass-bg)', 
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(16px)',
                  color: 'var(--text-primary)'
                }}
              />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
