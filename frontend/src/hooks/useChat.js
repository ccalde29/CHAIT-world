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

  const sendMessage = async (activeCharacters, currentScenario, userPersona, onNewSession) => {
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

    const wasNewChat = !currentSessionId;

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
        // Trigger callback for new session
        if (wasNewChat && onNewSession) {
          onNewSession(response.sessionId);
        }
      }

      // Handle responses with delays
      const newTimeouts = [];
      let maxDelay = 0;
      
      response.responses.forEach((charResponse, index) => {
        const delay = charResponse.delay || 0;
        maxDelay = Math.max(maxDelay, delay);
        
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
        }, delay);

        newTimeouts.push(timeout);
      });

      // Check for narrator response after all character responses
      if (currentScenario) {
        const narratorDelay = maxDelay + 1500; // Wait for all character responses + 1.5s
        const narratorTimeout = setTimeout(async () => {
          try {
            // Get all messages including the ones we just added
            const allMessages = [...messages, newUserMessage];
            const messageCount = allMessages.length;
            const lastMessage = allMessages[allMessages.length - 1];
            const lastAction = lastMessage?.content || '';

            const narratorResponse = await apiRequest(`/api/scenarios/${currentScenario}/narrator`, {
              method: 'POST',
              body: JSON.stringify({
                messages: allMessages.slice(-10).map(m => ({
                  role: m.type === 'user' ? 'user' : 'assistant',
                  content: m.content
                })),
                messageCount,
                lastAction
              })
            });

            if (narratorResponse.triggered && narratorResponse.response) {
              setMessages(prev => [...prev, {
                id: Date.now() + 999,
                type: 'narrator',
                content: narratorResponse.response,
                timestamp: new Date()
              }]);
            }
          } catch (error) {
            console.log('[Narrator] Not triggered or error:', error.message);
            // Silent fail - narrator is optional
          }
        }, narratorDelay);
        
        newTimeouts.push(narratorTimeout);
      }

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

  const loadChatSession = async (sessionId, activeCharacters = []) => {
    try {
      const session = await apiRequest(`/api/chat/sessions/${sessionId}`);
      
      // Enrich messages with character data for proper display
      const enrichedMessages = (session.messages || []).map(msg => {
        if (msg.type === 'character' && msg.character_id) {
          const char = activeCharacters.find(c => c.id === msg.character_id);
          if (char) {
            return {
              ...msg,
              characterName: char.name,
              characterAvatar: char.avatar,
              characterColor: char.color,
              characterImageUrl: char.avatar_image_url,
              characterUsesCustomImage: char.uses_custom_image
            };
          }
        }
        return msg;
      });
      
      setMessages(enrichedMessages);
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

    // Check if persona has AI model configured
    if (!userPersona.persona.ai_model) {
      setError('Please configure an AI model for your persona in the Persona Manager to use auto-responses');
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
