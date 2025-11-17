// hooks/useChat.js
// Custom hook for chat state and messaging logic

import { useState, useRef, useEffect } from 'react';

export const useChat = (apiRequest) => {
  // State
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [responseTimeouts, setResponseTimeouts] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearResponseTimeouts = () => {
    responseTimeouts.forEach(timeout => clearTimeout(timeout));
    setResponseTimeouts([]);
  };

  const sendMessage = async (activeCharacters, currentScenario, userPersona) => {
    if (!userInput.trim() || isGenerating || activeCharacters.length === 0) {
      return;
    }

    const userMessage = userInput.trim();
    setUserInput('');
    setIsGenerating(true);
    setError(null);
    clearResponseTimeouts();

    // Add user message
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await apiRequest('/api/chat/group-response', {
        method: 'POST',
        body: JSON.stringify({
          userMessage: userMessage,
          activeCharacters: activeCharacters.map(c => c.id),
          currentScene: currentScenario,
          conversationHistory: messages,
          sessionId: currentSessionId,
          userPersona: userPersona?.persona || null
        })
      });

      if (response.sessionId && !currentSessionId) {
        setCurrentSessionId(response.sessionId);
      }

      // Handle responses with delays
      const newTimeouts = [];
      response.responses.forEach((charResponse, index) => {
        const timeout = setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + index,
            type: 'character',
            character: charResponse.character,
            characterName: charResponse.characterName,
            content: charResponse.response,
            timestamp: new Date()
          }]);
        }, charResponse.delay || 0);

        newTimeouts.push(timeout);
      });

      setResponseTimeouts(newTimeouts);

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    clearResponseTimeouts();
    setError(null);
  };

  const loadChatSession = async (sessionId) => {
    try {
      const session = await apiRequest(`/api/chat/sessions/${sessionId}`);
      setMessages(session.messages || []);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Error loading chat session:', error);
      setError('Failed to load chat session');
    }
  };

  return {
    // State
    messages,
    userInput,
    isGenerating,
    error,
    currentSessionId,
    messagesEndRef,

    // Actions
    setUserInput,
    setError,
    sendMessage,
    clearChat,
    loadChatSession
  };
};
