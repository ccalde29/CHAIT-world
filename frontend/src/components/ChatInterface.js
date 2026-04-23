// components/ChatInterface.js
// Chat UI component - messages display and input

import React, { useState } from 'react';
import { Send, AlertCircle, Sparkles, Edit2, Check, X } from 'lucide-react';

const ChatInterface = ({
  messages,
  userInput,
  isGenerating,
  generatingPersonaResponse,
  error,
  messagesEndRef,
  userPersona,
  findCharacterById,
  editingMessageId,
  onInputChange,
  onSendMessage,
  onKeyPress,
  onGeneratePersonaResponse,
  onEditMessage,
  onStartEdit,
  onCancelEdit
}) => {
  const [editContent, setEditContent] = useState('');
  return (
    <div className="flex-1 flex flex-col bg-gray-900 min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">Start a conversation!</p>
              <p className="text-sm">Select characters and type a message below</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            // Handle system messages (like initial scene message)
            if (message.type === 'system') {
              return (
                <div key={message.id} className="flex justify-center my-6">
                  <div className="bg-orange-600/10 border border-orange-500/30 rounded-lg px-6 py-4 max-w-2xl">
                    <p className="text-gray-300 text-center italic">{message.content}</p>
                  </div>
                </div>
              );
            }

            // Handle narrator messages
            if (message.type === 'narrator') {
              return (
                <div key={message.id} className="flex justify-center my-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-6 py-3 max-w-3xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-amber-400">NARRATOR</span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-gray-300 italic">{message.content}</p>
                  </div>
                </div>
              );
            }

            const isUser = message.type === 'user';

            // For character messages, use data from message first (from DB), fallback to findCharacterById
            const character = !isUser
              ? (message.characterName
                  ? {
                      id: message.character,
                      name: message.characterName,
                      avatar: message.characterAvatar,
                      color: message.characterColor,
                      avatar_image_url: message.characterImageUrl,
                      uses_custom_image: message.characterUsesCustomImage
                    }
                  : findCharacterById(message.character))
              : null;

            // Get persona data from message if available, otherwise use current userPersona
            const messagePersona = isUser && message.userPersona ? message.userPersona : userPersona?.persona;

            const displayAvatar = isUser
              ? messagePersona?.avatar || '=d'
              : character?.avatar || '>';
            const displayName = isUser
              ? messagePersona?.name || 'You'
              : character?.name || 'Character';
            const colorClass = isUser
              ? messagePersona?.color || 'bg-orange-600'
              : character?.color || 'from-gray-500 to-slate-500';

            // Check for custom images
            const hasUserImage = isUser && messagePersona?.uses_custom_image && messagePersona?.avatar_image_url;
            const hasCharacterImage = !isUser && character?.uses_custom_image && character?.avatar_image_url;

            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white text-xl`}>
                  {(hasUserImage || hasCharacterImage) ? (
                    <img
                      src={hasUserImage ? messagePersona.avatar_image_url : character.avatar_image_url}
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
                  {editingMessageId === message.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-400"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            onEditMessage(message.id, editContent);
                            setEditContent('');
                          }}
                          disabled={!editContent.trim()}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check size={14} />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            onCancelEdit();
                            setEditContent('');
                          }}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-block">
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isUser
                            ? 'bg-orange-700 text-white'
                            : 'bg-white/5 text-gray-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      {isUser && (
                        <button
                          onClick={() => {
                            onStartEdit(message.id);
                            setEditContent(message.content);
                          }}
                          disabled={isGenerating}
                          className="mt-1 text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-50"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-orange-600/10 border-t border-orange-500/20">
          <div className="flex items-center gap-2 text-orange-400">
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
            placeholder={isGenerating ? "AI is responding..." : generatingPersonaResponse ? "Generating response..." : "Type your message..."}
            disabled={isGenerating || generatingPersonaResponse}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400 disabled:opacity-50"
          />
          {userPersona?.persona && (
            <button
              onClick={onGeneratePersonaResponse}
              disabled={isGenerating || generatingPersonaResponse || !userPersona?.persona?.ai_model}
              className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={
                !userPersona?.persona?.ai_model
                  ? "Configure AI model in Persona Manager to enable auto-responses"
                  : "Generate an AI response as your persona"
              }
            >
              <Sparkles size={18} />
              {generatingPersonaResponse ? 'Generating...' : 'Auto'}
            </button>
          )}
          <button
            onClick={onSendMessage}
            disabled={isGenerating || !userInput.trim()}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
