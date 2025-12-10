// ============================================================================
// Moderation Panel
// Admin panel for moderating characters and handling reports
// frontend/src/components/ModerationPanel.js
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Eye, Clock, AlertTriangle, TrendingUp, Sparkles, DollarSign } from 'lucide-react';
import CustomModelsPanel from './CustomModelsPanel';

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

  // Fetch moderation queue
  const fetchQueue = async () => {
    try {
      const response = await apiRequest('/api/moderation/queue');
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

  // Fetch pricing
  const fetchPricing = async () => {
    setLoadingPricing(true);
    try {
      const response = await apiRequest('/api/pricing');
      setPricing(response.pricing || {});
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Load pricing when pricing tab is selected
  useEffect(() => {
    if (activeTab === 'pricing' && Object.keys(pricing).length === 0) {
      fetchPricing();
    }
  }, [activeTab]);

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
            onClick={() => setActiveTab('custom-models')}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'custom-models'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={18} />
            Custom Models
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

            {/* Custom Models Tab */}
            {activeTab === 'custom-models' && (
              <CustomModelsPanel apiRequest={apiRequest} />
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              loadingPricing ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Loading pricing data...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">AI Model Pricing</h3>
                    <p className="text-sm text-gray-400">
                      Cost per 1M tokens for all supported AI providers. Updated regularly from provider APIs.
                    </p>
                  </div>

                  {Object.entries(pricing).map(([provider, models]) => (
                    <div key={provider} className="bg-gray-800 border border-white/10 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-3 capitalize">
                        {provider === 'openrouter' ? 'OpenRouter' : provider === 'ollama' ? 'Ollama (Local)' : provider === 'lmstudio' ? 'LM Studio (Local)' : provider}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Model</th>
                              <th className="text-right py-2 px-3 text-sm font-medium text-gray-400">Input</th>
                              <th className="text-right py-2 px-3 text-sm font-medium text-gray-400">Output</th>
                              <th className="text-right py-2 px-3 text-sm font-medium text-gray-400">Per</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(models) && models.map((model, idx) => (
                              <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-2 px-3 text-sm text-white">{model.name}</td>
                                <td className="text-right py-2 px-3 text-sm text-gray-300">
                                  {model.input === 0 ? 'FREE' : `$${model.input < 0.01 ? model.input.toFixed(4) : model.input.toFixed(2)}`}
                                </td>
                                <td className="text-right py-2 px-3 text-sm text-gray-300">
                                  {model.output === 0 ? 'FREE' : `$${model.output < 0.01 ? model.output.toFixed(4) : model.output.toFixed(2)}`}
                                </td>
                                <td className="text-right py-2 px-3 text-sm text-gray-400">{model.per}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {provider === 'ollama' || provider === 'lmstudio' ? (
                        <p className="text-xs text-gray-500 mt-2">Runs locally on your machine - no API costs</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ModerationPanel;
