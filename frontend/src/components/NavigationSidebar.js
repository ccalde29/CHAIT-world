// NavigationSidebar.js
// Main navigation sidebar with chat history and menu items

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Users,
  Film,
  Globe,
  Settings,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Lock,
  Shield,
  Trash2,
  Coins,
  Menu
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

const NavigationSidebar = ({
  apiRequest,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onNavigate,
  activeView,
  isAdmin,
  onDeleteSession,
  refreshTrigger, // Add refresh trigger prop
  onSessionsLoad, // Callback to expose loadSessions function
  tokenBalance, // Token balance passed from parent
  tokensLoading // Token loading state passed from parent
}) => {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Auto-collapse on mobile by default
    return Capacitor.isNativePlatform() || window.innerWidth < 768;
  });

  // Load chat sessions function
  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/chat/sessions');
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Expose loadSessions to parent component
  useEffect(() => {
    if (onSessionsLoad) {
      onSessionsLoad(loadSessions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSessionsLoad]);

  // Load sessions when user changes or refresh trigger changes
  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      setSessions([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshTrigger]);

  const menuItems = [
    {
      id: 'manage',
      label: 'Management',
      icon: Users,
      requiresAuth: false
    },
    {
      id: 'persona',
      label: 'Persona',
      icon: User,
      requiresAuth: false
    },
    {
      id: 'community',
      label: 'Community',
      icon: Globe,
      requiresAuth: false
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      requiresAuth: false
    }
  ];

  // Add admin menu item if user is admin
  if (isAdmin) {
    menuItems.push({
      id: 'moderation',
      label: 'Admin',
      icon: Shield,
      requiresAuth: false
    });
  }

  const handleMenuClick = (item) => {
    if (item.requiresAuth && !user) {
      // Show login modal
      onNavigate('login-required', item.id);
    } else {
      onNavigate(item.id);
    }
    // Auto-collapse on mobile after navigation
    if (Capacitor.isNativePlatform() || window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="w-12 bg-slate-900 border-r border-white/10 flex flex-col h-screen items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg mb-4"
          title="Expand sidebar"
        >
          <Menu size={20} />
        </button>
        
        <button
          onClick={onNewChat}
          className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors mb-4"
          title="New Chat"
        >
          <Plus size={20} />
        </button>
        
        {sessions.length > 0 && (
          <div className="mt-2 bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-full">
            {sessions.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-64 bg-slate-900 border-r border-white/10 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">CHAIT World</h1>
            <p className="text-xs text-gray-400">Local AI Chat</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          New Chat
        </button>
      </div>

      {/* Chat History Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowChatHistory(!showChatHistory)}
            className="w-full flex items-center justify-between text-gray-400 hover:text-white transition-colors py-2"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span className="text-sm font-medium">Chat History</span>
            </div>
            {showChatHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {showChatHistory && (
          <div className="px-2">
            {loading ? (
              <div className="text-center text-gray-500 py-4 text-sm">
                Loading chats...
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm px-2">
                No chat history yet
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`group relative flex items-center px-3 py-2 rounded-lg transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <button
                      onClick={() => onSessionSelect(session)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium truncate">
                        {session.title || 'Untitled Chat'}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this chat?')) {
                          // Immediately remove from UI for instant feedback
                          setSessions(prev => prev.filter(s => s.id !== session.id));
                          // Then call the delete handler
                          await onDeleteSession(session.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                      title="Delete chat"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Menu Items */}
        <div className="px-4 py-2 flex justify-center">
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="mt-2 px-2 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.locked && <Lock size={16} className="text-gray-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="border-t border-white/10 p-4">
        <div className="space-y-2">
          {/* Token Balance */}
          {tokenBalance !== null && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Coins size={16} className="text-amber-400" />
              <div className="flex-1">
                <div className="text-xs text-gray-400">Token Balance</div>
                <div className="text-sm font-bold text-amber-400">{tokenBalance} tokens</div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user?.email || 'User'}
              </div>
              <div className="text-xs text-gray-400">Signed In</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationSidebar;
