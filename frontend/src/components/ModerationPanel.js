// ============================================================================
// Moderation Panel
// Admin panel for moderating characters and handling reports
// frontend/src/components/ModerationPanel.js
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Eye, Clock, AlertTriangle, TrendingUp, Sparkles, DollarSign, Coins, BarChart3, AlertCircle } from 'lucide-react';
import TokenModelsPanel from './TokenModelsPanel';
import TokenAnalyticsDashboard from './TokenAnalyticsDashboard';
import FailedTransactionsPanel from './FailedTransactionsPanel';

const ModerationPanel = ({ apiRequest, fullScreen = true }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [queue, setQueue] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    unresolvedReports: 0
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [pricing, setPricing] = useState({});
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [recommendations, setRecommendations] = useState({});
  
  // User tokens state
  const [userBalances, setUserBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [tokenAction, setTokenAction] = useState({ userId: null, type: null, amount: 0, reason: '' });

  // Fetch moderation queue
  const fetchQueue = async () => {
    try {
      console.log('[ModerationPanel] Fetching queue...');
      const response = await apiRequest('/api/moderation/queue');
      console.log('[ModerationPanel] Queue response:', response);
      console.log('[ModerationPanel] Queue items:', response.queue);
      setQueue(response.queue || []);
    } catch (error) {
      console.error('Failed to fetch moderation queue:', error);
    }
  };

  // Fetch reports
  const fetchReports = async () => {
    try {
      const response = await apiRequest('/api/moderation/reports?status=pending');
      setReports(response.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await apiRequest('/api/moderation/stats');
      setStats(response);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch pricing recommendations
  const fetchPricing = async () => {
    setLoadingPricing(true);
    try {
      console.log('[ModerationPanel] Fetching pricing recommendations...');
      const response = await apiRequest('/api/pricing/recommendations');
      console.log('[ModerationPanel] Received response:', response);
      setRecommendations(response.recommendations || {});
      setPricing(response.tierPricing || {});
      console.log('[ModerationPanel] Set recommendations:', Object.keys(response.recommendations || {}).length, 'providers');
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Load pricing when pricing tab is selected
  useEffect(() => {
    if (activeTab === 'pricing') {
      fetchPricing(); // Always fetch to get latest data
    }
    if (activeTab === 'user-tokens' && userBalances.length === 0) {
      fetchUserBalances();
    }
  }, [activeTab]);

  // Fetch user token balances
  const fetchUserBalances = async () => {
    setLoadingBalances(true);
    try {
      const response = await apiRequest('/api/tokens/admin/all-balances');
      setUserBalances(response.balances || []);
    } catch (error) {
      console.error('Failed to fetch user balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  };

  // Handle token operations (grant, deduct, set)
  const handleTokenOperation = async (operation, userId, amount, reason) => {
    try {
      let endpoint = '';
      let body = {};
      
      switch (operation) {
        case 'grant':
          endpoint = '/api/tokens/admin/grant';
          body = { userId, amount: parseInt(amount), reason };
          break;
        case 'deduct':
          endpoint = '/api/tokens/admin/deduct';
          body = { userId, amount: parseInt(amount), reason };
          break;
        case 'set':
          endpoint = '/api/tokens/admin/set-balance';
          body = { userId, balance: parseInt(amount) };
          break;
        default:
          return;
      }

      await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      // Refresh balances
      await fetchUserBalances();
      setTokenAction({ userId: null, type: null, amount: 0, reason: '' });
      alert(`Token operation completed successfully`);
    } catch (error) {
      console.error('Token operation failed:', error);
      alert(error.message || 'Failed to perform token operation');
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchQueue(), fetchReports(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Approve character
  const handleApprove = async (characterId) => {
    if (processing) return;
    setProcessing(characterId);

    try {
      await apiRequest(`/api/moderation/approve/${characterId}`, {
        method: 'POST'
      });

      // Refresh queue and stats
      await Promise.all([fetchQueue(), fetchStats()]);
      alert('Character approved successfully!');
    } catch (error) {
      console.error('Failed to approve character:', error);
      alert('Failed to approve character. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Reject character
  const handleReject = async (characterId) => {
    if (processing) return;

    const reason = prompt('Enter reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    setProcessing(characterId);

    try {
      await apiRequest(`/api/moderation/reject/${characterId}`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      // Refresh queue and stats
      await Promise.all([fetchQueue(), fetchStats()]);
      alert('Character rejected and unpublished.');
    } catch (error) {
      console.error('Failed to reject character:', error);
      alert('Failed to reject character. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Resolve report
  const handleResolveReport = async (reportId, action) => {
    if (processing) return;
    setProcessing(reportId);

    try {
      const report = reports.find(r => r.id === reportId);
      const isCharacter = report?.report_type === 'character';
      
      const notes = action === 'unpublish'
        ? prompt(`Enter notes for ${isCharacter ? 'unpublishing character' : 'deleting scene'} (optional):`)
        : null;

      if (action === 'unpublish' && notes === null) {
        setProcessing(null);
        return; // User cancelled
      }

      const response = await apiRequest(`/api/moderation/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action, notes })
      });

      // Refresh reports and stats
      await Promise.all([fetchReports(), fetchStats(), fetchQueue()]);
      
      const actionText = action === 'unpublish' 
        ? (response.type === 'scene' ? 'deleted' : 'unpublished')
        : 'dismissed';
      
      alert(`Report ${actionText} successfully!`);
    } catch (error) {
      console.error('Failed to resolve report:', error);
      alert('Failed to resolve report. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const containerClass = fullScreen
    ? "flex-1 bg-gray-900 flex flex-col overflow-hidden"
    : "w-full h-full bg-gray-900 flex flex-col overflow-hidden";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Shield className="text-purple-400" size={24} />
          <div>
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            <p className="text-sm text-gray-400">Review and moderate community content</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-white/10 px-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock size={18} />
            Pending ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={18} />
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'stats'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp size={18} />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('token-models')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'token-models'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={18} />
            Token Models
          </button>
          <button
            onClick={() => setActiveTab('user-tokens')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'user-tokens'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Coins size={18} />
            User Tokens
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'pricing'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <DollarSign size={18} />
            Pricing
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 size={18} />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('failed-transactions')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'failed-transactions'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertCircle size={18} />
            Failed Txns
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            {/* Pending Characters Tab */}
            {activeTab === 'pending' && (
              <div className="space-y-4">
                {queue.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
                    <p className="text-gray-400">No characters pending moderation</p>
                  </div>
                ) : (
                  queue.map(item => (
                    <div
                      key={item.id}
                      className="bg-gray-800 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">{item.name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.moderation_status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {item.moderation_status}
                            </span>
                            {item.report_count > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 flex items-center gap-1">
                                <AlertTriangle size={12} />
                                {item.report_count} report{item.report_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Published: {new Date(item.published_at).toLocaleDateString()}</span>
                            <span>Views: {item.view_count || 0}</span>
                            <span>Imports: {item.import_count || 0}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={processing === item.id}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            disabled={processing === item.id}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
                    <p className="text-gray-400">No pending reports</p>
                  </div>
                ) : (
                  reports.map(report => {
                    const isCharacter = report.report_type === 'character';
                    const item = isCharacter ? report.community_characters : report.community_scenes;
                    const itemName = item?.name || 'Unknown';
                    const itemType = isCharacter ? 'Character' : 'Scene';
                    
                    return (
                      <div
                        key={report.id}
                        className="bg-gray-800 border border-white/10 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                                {itemType}
                              </span>
                              <h3 className="text-lg font-bold text-white">
                                {itemName}
                              </h3>
                              <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                {report.reason}
                              </span>
                            </div>
                            {report.details && (
                              <p className="text-sm text-gray-400 mb-2">{report.details}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Reported: {new Date(report.created_at).toLocaleDateString()}</span>
                              {isCharacter && item?.moderation_status && (
                                <span>Status: {item.moderation_status}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolveReport(report.id, 'dismiss')}
                              disabled={processing === report.id}
                              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                              title="Dismiss report"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleResolveReport(report.id, 'unpublish')}
                              disabled={processing === report.id}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                              title={isCharacter ? "Unpublish character" : "Delete scene"}
                            >
                              {isCharacter ? 'Unpublish' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* Moderation Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Moderation Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-800 border border-white/10 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="text-yellow-400" size={24} />
                        <h3 className="text-sm font-medium text-gray-400">Pending Review</h3>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.pending || 0}</p>
                    </div>

                    <div className="bg-gray-800 border border-white/10 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="text-green-400" size={24} />
                        <h3 className="text-sm font-medium text-gray-400">Approved</h3>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.approved || 0}</p>
                    </div>

                    <div className="bg-gray-800 border border-white/10 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <XCircle className="text-red-400" size={24} />
                        <h3 className="text-sm font-medium text-gray-400">Rejected</h3>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.rejected || 0}</p>
                    </div>

                    <div className="bg-gray-800 border border-white/10 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="text-orange-400" size={24} />
                        <h3 className="text-sm font-medium text-gray-400">Unresolved Reports</h3>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.unresolvedReports || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Platform Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Platform Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 border border-white/10 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Eye className="text-blue-400" size={24} />
                        <h3 className="text-sm font-medium text-gray-400">Total Characters</h3>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.totalCharacters || 0}</p>
                    </div>

                    <div className="bg-gray-800 border border-white/10 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Eye className="text-purple-400" size={24} />
                        <h3 className="text-sm font-medium text-gray-400">Total Scenes</h3>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.totalScenes || 0}</p>
                    </div>

                    <div className="bg-gray-800 border border-white/10 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Eye className="text-cyan-400" size={24} />
                        <h3 className="text-sm font-medium text-gray-400">Total Users</h3>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.totalUsers || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Trending Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Characters */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Top Characters (By Imports)</h3>
                    <div className="bg-gray-800 border border-white/10 rounded-lg overflow-hidden">
                      {stats.topCharacters && stats.topCharacters.length > 0 ? (
                        <div className="divide-y divide-white/10">
                          {stats.topCharacters.map((character, index) => (
                            <div key={index} className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-gray-600">#{index + 1}</span>
                                <span className="text-white">{character.name}</span>
                              </div>
                              <span className="text-sm text-gray-400">{character.import_count} imports</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-400">No data available</div>
                      )}
                    </div>
                  </div>

                  {/* Top Scenes */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Top Scenes (By Views)</h3>
                    <div className="bg-gray-800 border border-white/10 rounded-lg overflow-hidden">
                      {stats.topScenes && stats.topScenes.length > 0 ? (
                        <div className="divide-y divide-white/10">
                          {stats.topScenes.map((scene, index) => (
                            <div key={index} className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-gray-600">#{index + 1}</span>
                                <span className="text-white">{scene.name}</span>
                              </div>
                              <span className="text-sm text-gray-400">{scene.view_count} views</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-400">No data available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Token Models Tab */}
            {activeTab === 'token-models' && (
              <TokenModelsPanel apiRequest={apiRequest} />
            )}

            {/* User Tokens Tab */}
            {activeTab === 'user-tokens' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Manage User Tokens</h3>
                  <p className="text-sm text-gray-400">
                    View and manage token balances for all users
                  </p>
                </div>

                {loadingBalances ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-400">Loading user balances...</div>
                  </div>
                ) : userBalances.length === 0 ? (
                  <div className="text-center py-12 bg-gray-800 border border-white/10 rounded-lg">
                    <Coins className="mx-auto mb-4 text-purple-400" size={48} />
                    <p className="text-gray-400">No users with token balances yet</p>
                  </div>
                ) : (
                  <div className="bg-gray-800 border border-white/10 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900/50">
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">User ID</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Balance</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Lifetime Earned</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Lifetime Purchased</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Last Refill</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userBalances.map((user) => (
                            <tr key={user.user_id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-3 px-4">
                                <span className="text-white font-mono text-sm">{user.user_id.slice(0, 8)}...</span>
                              </td>
                              <td className="text-right py-3 px-4">
                                <span className={`font-semibold ${
                                  user.balance < 50 ? 'text-red-400' : 
                                  user.balance < 200 ? 'text-amber-400' : 
                                  'text-green-400'
                                }`}>
                                  {user.balance.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-right py-3 px-4 text-gray-300">
                                {user.lifetime_earned?.toLocaleString() || 0}
                              </td>
                              <td className="text-right py-3 px-4 text-gray-300">
                                {user.lifetime_purchased?.toLocaleString() || 0}
                              </td>
                              <td className="text-center py-3 px-4 text-gray-400 text-xs">
                                {user.last_weekly_refill ? new Date(user.last_weekly_refill).toLocaleDateString() : 'Never'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      const amount = prompt('Enter amount to grant:');
                                      const reason = prompt('Enter reason:');
                                      if (amount && reason) {
                                        handleTokenOperation('grant', user.user_id, amount, reason);
                                      }
                                    }}
                                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm transition-colors"
                                  >
                                    Grant
                                  </button>
                                  <button
                                    onClick={() => {
                                      const amount = prompt('Enter amount to deduct:');
                                      const reason = prompt('Enter reason:');
                                      if (amount && reason) {
                                        handleTokenOperation('deduct', user.user_id, amount, reason);
                                      }
                                    }}
                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                                  >
                                    Deduct
                                  </button>
                                  <button
                                    onClick={() => {
                                      const balance = prompt('Set balance to:');
                                      if (balance !== null) {
                                        handleTokenOperation('set', user.user_id, balance, '');
                                      }
                                    }}
                                    className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded text-sm transition-colors"
                                  >
                                    Set
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              loadingPricing ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Loading pricing recommendations...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Model Pricing & Tier Recommendations</h3>
                      <p className="text-sm text-gray-400">
                        Live API costs with profitability analysis for each model
                      </p>
                    </div>
                    <button
                      onClick={fetchPricing}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors text-sm"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Tier Reference */}
                  <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Tier Pricing Reference</h4>
                    <div className="flex gap-4 text-xs">
                      <span className="text-gray-400">1x = $0.005</span>
                      <span className="text-gray-400">3x = $0.015</span>
                      <span className="text-gray-400">5x = $0.025</span>
                      <span className="text-gray-400">7x = $0.035</span>
                      <span className="text-gray-400">10x = $0.050</span>
                    </div>
                  </div>

                  {/* Provider Sections */}
                  {Object.entries(recommendations).map(([provider, models]) => {
                    const providerLabel = {
                      'openrouter': 'OpenRouter',
                      'openai': 'OpenAI',
                      'anthropic': 'Anthropic',
                      'google': 'Google AI'
                    }[provider] || provider;

                    // Separate active and available models
                    const activeModels = models.filter(m => m.status === 'active');
                    const availableModels = models.filter(m => m.status === 'available');

                    return (
                      <div key={provider} className="bg-gray-800 border border-white/10 rounded-lg overflow-hidden">
                        <div className="bg-gray-800/50 px-4 py-3 border-b border-white/10">
                          <h4 className="text-lg font-semibold text-white">{providerLabel}</h4>
                        </div>

                        <div className="p-4 space-y-4">
                          {/* Your Active Models */}
                          {activeModels.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-purple-400 mb-3">Your Active Models</h5>
                              <div className="space-y-2">
                                {activeModels.map((model, idx) => (
                                  <div
                                    key={idx}
                                    className={`bg-gray-900/50 rounded-lg p-3 border ${
                                      model.isProfitable ? 'border-green-500/30' : 'border-red-500/30'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-medium">{model.name}</span>
                                          <span className={`text-xs px-2 py-0.5 rounded ${
                                            model.isProfitable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                          }`}>
                                            Tier {model.yourTier}x
                                          </span>
                                          {!model.isActive && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                                              Inactive
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{model.id}</p>
                                      </div>
                                      <div className={`text-right ${model.isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                                        <div className="text-lg font-bold">
                                          {model.profit >= 0 ? '+' : ''}{(model.profit * 1000).toFixed(2)}¢
                                        </div>
                                        <div className="text-xs">profit/msg</div>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3 text-xs">
                                      <div>
                                        <p className="text-gray-400">API Cost</p>
                                        <p className="text-white font-medium">${model.costPer500Tokens.toFixed(4)}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400">You Charge</p>
                                        <p className="text-white font-medium">${model.yourPrice.toFixed(4)}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400">Margin</p>
                                        <p className={`font-medium ${model.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {model.profitMargin.toFixed(0)}%
                                        </p>
                                      </div>
                                    </div>

                                    {/* Volume Projection - 100 messages */}
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                      <p className="text-xs text-gray-400 mb-2">At 100 messages:</p>
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                          <p className="text-gray-500">User Pays</p>
                                          <p className="text-white font-medium">${(model.yourPrice * 100).toFixed(2)}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500">Your Profit</p>
                                          <p className={`font-bold ${model.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ${(model.profit * 100).toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {!model.isProfitable && (
                                      <div className="mt-2 pt-2 border-t border-red-500/20">
                                        <p className="text-xs text-red-400">
                                          ⚠️ Suggestion: Increase to Tier {model.recommendedTier}x or higher
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Available Models */}
                          {availableModels.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-400 mb-3">
                                Available Models {activeModels.length > 0 ? '(Not Created Yet)' : ''}
                              </h5>
                              <div className="space-y-2">
                                {availableModels.map((model, idx) => (
                                  <div key={idx} className="bg-gray-900/30 rounded-lg p-3 border border-white/5">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-white">{model.name}</span>
                                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                            Recommended: Tier {model.recommendedTier}x
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{model.id}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <p className="text-gray-400">API Cost (per 500 tokens)</p>
                                        <p className="text-white font-medium">
                                          {model.costPer500Tokens === 0 ? 'FREE' : `$${model.costPer500Tokens.toFixed(4)}`}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400">Recommended Price</p>
                                        <p className="text-blue-400 font-medium">
                                          {model.recommendedPrice === 0 ? 'FREE' : `$${model.recommendedPrice.toFixed(4)}`}
                                        </p>
                                      </div>
                                    </div>

                                    {model.costPer500Tokens > 0 && (
                                      <div className="mt-3 pt-3 border-t border-white/10">
                                        <p className="text-xs text-gray-400 mb-2">Profit at 100 messages:</p>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <p className="text-gray-500">User Pays</p>
                                            <p className="text-white font-medium">${(model.recommendedPrice * 100).toFixed(2)}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-500">Your Profit</p>
                                            <p className="text-green-400 font-bold">
                                              ${((model.recommendedPrice - model.costPer500Tokens) * 100).toFixed(2)}
                                            </p>
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                          (2.5x markup: ~{(((model.recommendedPrice - model.costPer500Tokens) / model.recommendedPrice) * 100).toFixed(0)}% profit margin)
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <TokenAnalyticsDashboard apiRequest={apiRequest} />
            )}

            {/* Failed Transactions Tab */}
            {activeTab === 'failed-transactions' && (
              <FailedTransactionsPanel apiRequest={apiRequest} />
            )}
          </>
        )}
      </div>
    </div>
  );
};


export default ModerationPanel;
