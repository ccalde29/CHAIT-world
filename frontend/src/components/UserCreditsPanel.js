/**
 * User Credits Panel
 * Manage credit balance, purchase credits, and view transaction history
 */

import React, { useState, useEffect } from 'react';
import { Coins, TrendingUp, Clock, DollarSign, Gift, ShoppingCart, RefreshCw } from 'lucide-react';

const UserCreditsPanel = ({ user, apiRequest }) => {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, []);

  const loadBalance = async () => {
    try {
      const data = await apiRequest('/api/tokens/balance');
      setBalance(data);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/tokens/transactions');
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (amount, price) => {
    setPurchasing(amount);
    try {
      // Placeholder for Stripe integration
      alert(`Stripe integration coming soon!\nYou would purchase ${amount} credits for $${price}`);
      
      // After successful payment, reload balance
      // await apiRequest('/api/tokens/purchase', {
      //   method: 'POST',
      //   body: JSON.stringify({ amount, price })
      // });
      // await loadBalance();
      // await loadTransactions();
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed: ' + error.message);
    } finally {
      setPurchasing(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'weekly_grant': return <Gift size={16} className="text-green-400" />;
      case 'purchase': return <ShoppingCart size={16} className="text-blue-400" />;
      case 'usage': return <Coins size={16} className="text-orange-400" />;
      case 'token_usage': return <Coins size={16} className="text-orange-400" />;
      case 'refund': return <RefreshCw size={16} className="text-purple-400" />;
      default: return <Coins size={16} className="text-gray-400" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'weekly_grant': return 'Weekly Free Credits';
      case 'purchase': return 'Credit Purchase';
      case 'usage': return 'Model Usage';
      case 'token_usage': return 'Token Model Usage';
      case 'refund': return 'Refund';
      case 'admin_grant': return 'Admin Grant';
      case 'deduction': return 'Deduction';
      default: return type;
    }
  };

  const purchaseOptions = [
    { credits: 1000, price: 5, popular: false },
    { credits: 2000, price: 10, popular: true },
    { credits: 3000, price: 15, popular: false }
  ];

  // Aggregate transactions by model and day
  const aggregateTransactions = () => {
    const aggregated = {};
    
    transactions.forEach(tx => {
      // Only aggregate usage transactions (not admin_grant, purchase, etc)
      if (tx.type === 'usage') {
        const date = new Date(tx.created_at);
        const dayKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const model = tx.reference || 'Free Model';
        const key = `${dayKey}|${model}`;
        
        if (!aggregated[key]) {
          aggregated[key] = {
            date: dayKey,
            model: model,
            amount: 0,
            count: 0,
            created_at: tx.created_at
          };
        }
        
        aggregated[key].amount += tx.amount;
        aggregated[key].count += 1;
      }
    });
    
    // Convert to array and sort by date descending
    return Object.values(aggregated).sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  };

  // Get non-usage transactions (purchases, grants, refunds)
  const getNonUsageTransactions = () => {
    return transactions
      .filter(tx => tx.type !== 'usage')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const aggregatedUsage = aggregateTransactions();
  const otherTransactions = getNonUsageTransactions();

  return (
    <div className="p-6 space-y-6" style={{ height: '100%', overflowY: 'auto' }}>
      {/* Balance Overview */}
      <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Current Balance</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-bold text-white">
                {balance !== null ? balance.balance.toLocaleString() : '...'}
              </h2>
              <span className="text-xl text-gray-400">credits</span>
            </div>
          </div>
          <Coins className="text-purple-400" size={48} />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-gray-400 text-xs mb-1">Lifetime Earned</p>
            <p className="text-white font-medium">
              {balance !== null ? balance.lifetime_earned.toLocaleString() : '...'} credits
            </p>
            <p className="text-gray-500 text-xs mt-1">From weekly free grants</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Lifetime Purchased</p>
            <p className="text-white font-medium">
              {balance !== null ? balance.lifetime_purchased.toLocaleString() : '...'} credits
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {balance && balance.last_weekly_refill 
                ? `Last refill: ${formatDate(balance.last_weekly_refill)}`
                : 'No purchases yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Credits */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="text-blue-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Purchase Credits</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {purchaseOptions.map(option => (
            <div
              key={option.credits}
              className={`bg-gray-800 rounded-lg p-4 border ${
                option.popular 
                  ? 'border-blue-500/50 ring-2 ring-blue-500/20' 
                  : 'border-white/10'
              } relative`}
            >
              {option.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-white mb-1">
                  {option.credits.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">credits</p>
              </div>

              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-bold text-blue-400">${option.price}</span>
                  <span className="text-gray-500 text-sm">USD</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ${(option.price / option.credits * 1000).toFixed(2)} per 1000 credits
                </p>
              </div>

              <button
                onClick={() => handlePurchase(option.credits, option.price)}
                disabled={purchasing !== null}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  option.popular
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {purchasing === option.credits ? 'Processing...' : 'Buy Now'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-sm text-blue-400">
            💡 <strong>Tip:</strong> Credits never expire! Use them anytime to chat with premium token models.
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="text-gray-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Transaction History</h3>
          </div>
          <button
            onClick={() => { loadBalance(); loadTransactions(); }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <Clock className="mx-auto mb-3 text-gray-600" size={48} />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Your credit activity will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Aggregated Model Usage */}
            {aggregatedUsage.length > 0 && (
              <div className="bg-gray-800 rounded-lg border border-white/10 overflow-hidden">
                <div className="bg-gray-900/50 border-b border-white/10 px-4 py-3">
                  <h4 className="text-sm font-medium text-gray-300">Model Usage by Day</h4>
                </div>
                <div className="divide-y divide-white/5">
                  {aggregatedUsage.map((agg, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Coins className="text-orange-400" size={16} />
                          <span className="text-sm font-medium text-white">{agg.model}</span>
                        </div>
                        <span className="text-red-400 font-medium">{agg.amount} credits</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{agg.date}</span>
                        <span className="text-gray-500">{agg.count} {agg.count === 1 ? 'message' : 'messages'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Transactions (Purchases, Grants, Refunds) */}
            {otherTransactions.length > 0 && (
              <div className="bg-gray-800 rounded-lg border border-white/10 overflow-hidden">
                <div className="bg-gray-900/50 border-b border-white/10 px-4 py-3">
                  <h4 className="text-sm font-medium text-gray-300">Credits Activity</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50 border-b border-white/10">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Date</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherTransactions.map((tx, idx) => (
                        <tr key={tx.id || idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(tx.type)}
                              <span className="text-sm text-white">{getTypeLabel(tx.type)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-400">
                            {formatDate(tx.created_at)}
                          </td>
                          <td className={`py-3 px-4 text-right font-medium ${
                            tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {tx.amount >= 0 ? '+' : ''}{tx.amount}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {tx.reference || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {aggregatedUsage.length === 0 && otherTransactions.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <Clock className="mx-auto mb-3 text-gray-600" size={48} />
                <p className="text-gray-400">No transactions yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your credit activity will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCreditsPanel;
