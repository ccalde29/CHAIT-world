/**
 * Token Analytics Dashboard
 * Admin-only view for analyzing token model usage, costs, and profitability
 * Shows data grouped by Provider → Tier → Models
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, MessageSquare, RefreshCw, Download, ChevronDown, ChevronRight } from 'lucide-react';

const TokenAnalyticsDashboard = ({ apiRequest }) => {
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState({ openrouter: true });

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest('/api/token-models/analytics');
      setAnalytics(data.analytics || {});
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefreshPricing = async () => {
    try {
      setRefreshing(true);
      await apiRequest('/api/token-models/refresh-pricing', { method: 'POST' });
      alert('Pricing data refreshed successfully!');
      // Reload analytics to show updated costs
      await loadAnalytics();
    } catch (err) {
      console.error('Error refreshing pricing:', err);
      alert('Failed to refresh pricing: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/token-models/analytics/export`, {
        headers: {
          'user-id': localStorage.getItem('supabase.auth.token') ? 
            JSON.parse(localStorage.getItem('supabase.auth.token')).user?.id : ''
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `token-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const toggleProvider = (provider) => {
    setExpandedProviders(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `$${parseFloat(amount).toFixed(4)}`;
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  // Provider display order
  const providerOrder = ['openrouter', 'openai', 'anthropic', 'google'];
  const providerLabels = {
    openrouter: 'OpenRouter',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google AI'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Token Model Analytics</h3>
          <p className="text-sm text-gray-400">
            Usage and profitability data for the last 30 days
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshPricing}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh Pricing
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Provider Sections */}
      {providerOrder.map(provider => {
        const providerData = analytics[provider];
        if (!providerData || Object.keys(providerData).length === 0) return null;

        const isExpanded = expandedProviders[provider];

        return (
          <div key={provider} className="bg-gray-800 border border-white/10 rounded-lg overflow-hidden">
            {/* Provider Header */}
            <button
              onClick={() => toggleProvider(provider)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <h4 className="text-lg font-semibold text-white">
                  {providerLabels[provider] || provider}
                </h4>
                <span className="text-sm text-gray-400">
                  ({Object.values(providerData).reduce((acc, tier) => acc + tier.length, 0)} models)
                </span>
              </div>
            </button>

            {/* Tier Sections */}
            {isExpanded && (
              <div className="p-4 pt-0 space-y-4">
                {['1', '3', '5'].map(tier => {
                  const tierModels = providerData[tier];
                  if (!tierModels || tierModels.length === 0) return null;

                  return (
                    <div key={tier} className="space-y-2">
                      <h5 className="text-md font-semibold text-purple-400">
                        {tier}x Credit Tier ({tierModels.length} models)
                      </h5>

                      {/* Models Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tierModels.map(model => (
                          <div
                            key={model.model_id}
                            className={`bg-gray-900/50 border rounded-lg p-3 ${
                              model.is_profitable 
                                ? 'border-green-500/30' 
                                : 'border-red-500/30'
                            }`}
                          >
                            {/* Model Name */}
                            <div className="mb-2">
                              <h6 className="text-sm font-medium text-white truncate" title={model.model_name}>
                                {model.model_name}
                              </h6>
                              <p className="text-xs text-gray-500 truncate">{model.model_id}</p>
                              {!model.is_active && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                                  Inactive
                                </span>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-400 flex items-center gap-1">
                                  <MessageSquare size={12} />
                                  Messages
                                </span>
                                <span className="text-white font-medium">
                                  {formatNumber(model.total_messages)}
                                </span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-gray-400">Credits Collected</span>
                                <span className="text-blue-400 font-medium">
                                  {formatNumber(model.total_credits_collected)}
                                </span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-gray-400">API Cost</span>
                                <span className="text-orange-400 font-medium">
                                  {formatCurrency(model.total_api_cost_usd)}
                                </span>
                              </div>

                              <div className="flex justify-between border-t border-white/10 pt-1">
                                <span className="text-gray-400 flex items-center gap-1">
                                  {model.is_profitable ? (
                                    <TrendingUp size={12} className="text-green-400" />
                                  ) : (
                                    <TrendingDown size={12} className="text-red-400" />
                                  )}
                                  Net Profit
                                </span>
                                <span className={`font-bold ${
                                  model.is_profitable ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatCurrency(model.net_profit_usd)}
                                </span>
                              </div>

                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Avg Cost/500 Tokens</span>
                                <span className="text-gray-400">
                                  {formatCurrency(model.avg_cost_per_500_tokens)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty State */}
      {Object.keys(analytics).length === 0 && (
        <div className="bg-gray-800 border border-white/10 rounded-lg p-8 text-center">
          <MessageSquare className="mx-auto mb-3 text-gray-600" size={48} />
          <p className="text-gray-400">No analytics data available yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Data will appear here once users start using token models
          </p>
        </div>
      )}
    </div>
  );
};

export default TokenAnalyticsDashboard;
