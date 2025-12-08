// hooks/useChat.js
// Custom hook for chat state and messaging logic

import { useState, useRef, useEffect } from 'react';

export const useChat = (apiRequest) => {
  // State
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPersonaResponse, setGeneratingPersonaResponse] = useState(false);
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

    // Add user message with persona data
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
      userPersona: userPersona?.persona || null
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
          // Find the full character data to include image info
          const fullCharacter = activeCharacters.find(c => c.id === charResponse.character);

          setMessages(prev => [...prev, {
            id: Date.now() + index,
            type: 'character',
            character: charResponse.character,
            characterName: charResponse.characterName,
            characterAvatar: fullCharacter?.avatar,
            characterColor: fullCharacter?.color,
            characterImageUrl: fullCharacter?.avatar_image_url,
            characterUsesCustomImage: fullCharacter?.uses_custom_image,
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

  const addSystemMessage = (content) => {
    const systemMessage = {
      id: Date.now(),
      type: 'system',
      content: content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const loadChatSession = async (sessionId) => {
    try {
      const session = await apiRequest(`/api/chat/sessions/${sessionId}`);
      setMessages(session.messages || []);
      setCurrentSessionId(sessionId);

      // Return the full session data so the parent can restore UI state
      return session;
    } catch (error) {
      console.error('Error loading chat session:', error);
      setError('Failed to load chat session');
      throw error;
    }
  };

  const generatePersonaResponse = async (userPersona, currentScenario) => {
    if (!userPersona?.persona || generatingPersonaResponse) {
      return;
    }

    setGeneratingPersonaResponse(true);
    setError(null);

    try {
      // Convert messages to the format expected by the API
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await apiRequest(`/api/personas/${userPersona.persona.id}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          messages: recentMessages,
          sessionContext: {
            scenario: currentScenario
          }
        })
      });

      if (response.success && response.response) {
        // Populate the input with the generated response
        setUserInput(response.response);
      } else {
        setError('Failed to generate persona response');
      }
    } catch (error) {
      console.error('Error generating persona response:', error);
      setError(error.message || 'Failed to generate persona response. Please try again.');
    } finally {
      setGeneratingPersonaResponse(false);
    }
  };

  return {
    // State
    messages,
    userInput,
    isGenerating,
    generatingPersonaResponse,
    error,
    currentSessionId,
    messagesEndRef,

    // Actions
    setUserInput,
    setError,
    sendMessage,
    clearChat,
    addSystemMessage,
    loadChatSession,
    generatePersonaResponse
  };
};
