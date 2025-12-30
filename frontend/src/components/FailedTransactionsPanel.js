/**
 * Failed Transactions Panel
 * Admin-only view for reviewing failed transactions and refunds
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const FailedTransactionsPanel = ({ apiRequest }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unreviewed'); // 'all', 'unreviewed', 'reviewed'
  const [error, setError] = useState(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = filter === 'all' 
        ? `/api/tokens/failed`
        : `/api/tokens/failed?reviewed=${filter === 'reviewed'}`;

      const data = await apiRequest(url);
      setTransactions(data.failed_transactions || []);
    } catch (err) {
      console.error('Error loading failed transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleMarkReviewed = async (transactionId) => {
    try {
      await apiRequest(`/api/tokens/failed/${transactionId}/review`, {
        method: 'POST'
      });

      // Reload transactions
      await loadTransactions();
    } catch (err) {
      console.error('Error marking transaction:', err);
      alert('Failed to mark as reviewed: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Failed Transactions</h3>
          <p className="text-sm text-gray-400">Review and track refunded transactions</p>
        </div>
        <button
          onClick={loadTransactions}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('unreviewed')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'unreviewed'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Needs Review
        </button>
        <button
          onClick={() => setFilter('reviewed')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'reviewed'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Reviewed
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'all'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          All
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading transactions...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-red-400">Error: {error}</div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <CheckCircle size={48} className="text-green-500 mb-4" />
          <div className="text-gray-400">No {filter !== 'all' ? filter : ''} failed transactions</div>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map(transaction => (
            <div
              key={transaction.id}
              className={`bg-gray-800 rounded-lg p-4 border ${
                transaction.reviewed ? 'border-green-500/30' : 'border-orange-500/30'
              }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {transaction.reviewed ? (
                          <CheckCircle size={16} className="text-green-400" />
                        ) : (
                          <AlertTriangle size={16} className="text-orange-400" />
                        )}
                        <span className={`text-sm font-medium ${
                          transaction.reviewed ? 'text-green-400' : 'text-orange-400'
                        }`}>
                          {transaction.reviewed ? 'Reviewed' : 'Needs Review'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(transaction.created_at)}</p>
                    </div>
                    {!transaction.reviewed && (
                      <button
                        onClick={() => handleMarkReviewed(transaction.id)}
                        className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded text-xs transition-colors"
                      >
                        Mark Reviewed
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">User ID</p>
                      <p className="text-white font-mono text-xs">{transaction.user_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Model ID</p>
                      <p className="text-white font-mono text-xs">{transaction.model_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Refunded Credits</p>
                      <p className="text-white font-medium">{transaction.refunded_credits}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 text-xs mb-1">Error</p>
                      <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded font-mono">
                        {transaction.error_message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
};

export default FailedTransactionsPanel;
