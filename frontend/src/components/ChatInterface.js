// components/ChatInterface.js
// Chat UI component - messages display and input

import React from 'react';
import { Send, AlertCircle } from 'lucide-react';

const ChatInterface = ({
  messages,
  userInput,
  isGenerating,
  error,
  messagesEndRef,
  userPersona,
  findCharacterById,
  onInputChange,
  onSendMessage,
  onKeyPress
}) => {
  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">Start a conversation!</p>
              <p className="text-sm">Select characters and type a message below</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.type === 'user';
            const character = !isUser ? findCharacterById(message.character) : null;
            const displayAvatar = isUser
              ? userPersona?.persona?.avatar || '=d'
              : character?.avatar || '>';
            const displayName = isUser
              ? userPersona?.persona?.name || 'You'
              : character?.name || 'Character';
            const colorClass = isUser
              ? userPersona?.persona?.color || 'from-blue-500 to-indigo-500'
              : character?.color || 'from-gray-500 to-slate-500';

            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xl`}>
                  {character?.uses_custom_image && character?.avatar_image_url ? (
                    <img
                      src={character.avatar_image_url}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    displayAvatar
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`font-semibold text-white ${isUser ? 'order-2' : ''}`}>
                      {displayName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div
                    className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-white/10 p-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={isGenerating ? "AI is responding..." : "Type your message..."}
            disabled={isGenerating}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400 disabled:opacity-50"
          />
          <button
            onClick={onSendMessage}
            disabled={isGenerating || !userInput.trim()}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={18} />
            {isGenerating ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
