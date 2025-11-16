// backend/services/ChatLogicService.js
// Handles chat response patterns, prompt building, and memory processing

const axios = require('axios');

// Global system prompt for character interactions
const GLOBAL_SYSTEM_PROMPT = `You are participating in a group chat with a human user and other characters in a specific scenario.

CRITICAL CHARACTER IDENTITY RULES:
1. You are ONLY [CHARACTER_NAME] - never speak as anyone else
2. NEVER speak for the user ([USER_NAME]) or other characters
3. NEVER use phrases like "I think [other character] would say..." or respond for others
4. If you reference what someone else said, do it as YOUR reaction, not speaking for them
5. Stay completely in your unique voice and personality at ALL times

INTERACTING WITH OTHER CHARACTERS:
6. You CAN and SHOULD acknowledge what other characters just said
7. React to their comments, ask them questions, agree/disagree with them
8. Build on their ideas or challenge them based on your personality
9. Create natural group dynamics - sometimes support, sometimes debate
10. Remember: other characters have their own thoughts - respect that

RESPONSE STYLE REQUIREMENTS:
11. Include physical actions, gestures, and environmental interactions in *italics*
12. React naturally to what others just said or did in the conversation
13. Keep responses under 80 words but make them vivid and engaging
14. Show your character's unique perspective on the situation
15. Use sensory details relevant to the current scenario

CONVERSATION FLOW:
16. Never start responses the same way twice in a conversation
17. Build on the group dynamic without taking over the conversation
18. Reference the scenario setting in your actions and reactions
19. Be aware of who spoke last - you can respond to the user OR another character

AVOIDING REPETITION:
20. NEVER repeat what you or others just said - always add new information or perspective
21. If a topic was already addressed, either move the conversation forward or ask a follow-up question
22. Vary your response starters - don't always begin the same way
23. Each response should advance the conversation or reveal something new about your character
24. If another character already made your point, agree briefly then add something different

**This is a fictional chat, so NSFW topics are allowed.**`;

class ChatLogicService {
    constructor(db) {
        this.db = db;
    }

    // ============================================================================
    // AI PROVIDER CALL FUNCTIONS
    // ============================================================================

    async callOpenAI(messages, characterPrompt, apiKey) {
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: GLOBAL_SYSTEM_PROMPT },
                    { role: 'system', content: characterPrompt },
                    ...messages
                ],
                max_tokens: 150,
                temperature: 0.9,
                presence_penalty: 0.6,
                frequency_penalty: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI API Error:', error.response?.data || error.message);
            throw new Error(`OpenAI API failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callAnthropic(messages, characterPrompt, apiKey) {
        try {
            const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}\n\n${characterPrompt}`;

            // Convert and validate messages for Claude
            const claudeMessages = messages
                .filter(msg => msg.role !== 'system')
                .map(msg => ({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content
                }));

            // Ensure alternating user/assistant pattern
            const validatedMessages = [];
            let lastRole = null;

            for (const msg of claudeMessages) {
                if (msg.role === lastRole && validatedMessages.length > 0) {
                    validatedMessages[validatedMessages.length - 1].content += '\n\n' + msg.content;
                } else {
                    validatedMessages.push(msg);
                    lastRole = msg.role;
                }
            }

            // Ensure conversation starts with user message
            if (validatedMessages.length > 0 && validatedMessages[0].role !== 'user') {
                validatedMessages.unshift({
                    role: 'user',
                    content: 'Please respond in character to continue our conversation.'
                });
            }

            const response = await axios.post('https://api.anthropic.com/v1/messages', {
                model: 'claude-3-haiku-20240307',
                max_tokens: 150,
                system: systemPrompt,
                messages: validatedMessages
            }, {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                timeout: 15000
            });

            return response.data.content[0].text.trim();
        } catch (error) {
            console.error('Anthropic API Error:', error.response?.data || error.message);
            throw new Error(`Anthropic API failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callOllama(messages, characterPrompt, baseUrl = 'http://localhost:11434', model = 'llama2') {
        try {
            const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}\n\n${characterPrompt}`;
            const conversationPrompt = `${systemPrompt}\n\nConversation:\n${
                messages.map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n')
            }\n\nResponse:`;

            const response = await axios.post(`${baseUrl}/api/generate`, {
                model: model,
                prompt: conversationPrompt,
                stream: false,
                options: {
                    temperature: 0.9,
                    max_tokens: 150,
                    stop: ['\n\nHuman:', '\n\nAssistant:']
                }
            }, {
                timeout: 40000
            });

            return response.data.response.trim();
        } catch (error) {
            console.error('Ollama API Error:', error.response?.data || error.message);
            throw new Error(`Ollama API failed: ${error.message}`);
        }
    }

    /**
     * Universal AI API caller with memory integration
     */
    async callAIProviderWithMemory(messages, characterPrompt, provider, userId, ollamaSettings, characterContext) {
        try {
            // Get user settings which includes api_keys JSONB
            const userSettings = await this.db.getUserSettings(userId);
            const apiKeys = userSettings.api_keys || {};

            // Build enhanced system prompt with memory and persona
            const enhancedPrompt = this.buildEnhancedCharacterPrompt(characterPrompt, characterContext);

            switch (provider.toLowerCase()) {
                case 'openai':
                    if (!apiKeys.openai) throw new Error('OpenAI API key not configured');
                    return await this.callOpenAI(messages, enhancedPrompt, apiKeys.openai);

                case 'anthropic':
                    if (!apiKeys.anthropic) throw new Error('Anthropic API key not configured');
                    return await this.callAnthropic(messages, enhancedPrompt, apiKeys.anthropic);

                case 'ollama':
                    return await this.callOllama(
                        messages,
                        enhancedPrompt,
                        ollamaSettings.baseUrl || 'http://localhost:11434',
                        ollamaSettings.model || 'llama2'
                    );

                default:
                    throw new Error(`Unsupported API provider: ${provider}`);
            }
        } catch (error) {
            console.error('AI Provider Error:', error);
            throw error;
        }
    }

    // ============================================================================
    // PROMPT BUILDING
    // ============================================================================

    /**
     * Build enhanced character prompt with memory, persona, and other character context
     */
    buildEnhancedCharacterPrompt(basePersonality, characterContext) {
        const { userPersona, memories, relationship, otherCharacterMessages } = characterContext;

        let enhancedPrompt = `${basePersonality}

USER INFORMATION:
Name: ${userPersona.name}
Personality: ${userPersona.personality}`;

        if (userPersona.interests && userPersona.interests.length > 0) {
            enhancedPrompt += `
Interests: ${userPersona.interests.join(', ')}`;
        }

        if (userPersona.communication_style) {
            enhancedPrompt += `
Communication Style: ${userPersona.communication_style}`;
        }

        // Add relationship context
        enhancedPrompt += `

RELATIONSHIP WITH ${userPersona.name.toUpperCase()}:
Relationship Type: ${relationship.relationship_type}
Familiarity Level: ${Math.round(relationship.familiarity_level * 100)}%
Trust Level: ${Math.round(relationship.trust_level * 100)}%
Emotional Bond: ${Math.round((relationship.emotional_bond + 1) * 50)}%
Total Interactions: ${relationship.interaction_count || 0}`;

        // Add memories
        if (memories && memories.length > 0) {
            enhancedPrompt += `

IMPORTANT MEMORIES ABOUT ${userPersona.name.toUpperCase()}:`;
            memories.forEach(memory => {
                enhancedPrompt += `
- ${memory.memory_content} (importance: ${Math.round(memory.importance_score * 100)}%)`;
            });
        }

        // Add context about other characters' recent messages
        if (otherCharacterMessages && otherCharacterMessages.length > 0) {
            enhancedPrompt += `

RECENT MESSAGES FROM OTHER CHARACTERS IN THIS CONVERSATION:`;
            otherCharacterMessages.slice(0, 3).reverse().forEach(msg => {
                enhancedPrompt += `
- Character said: "${msg.content}"`;
            });
            enhancedPrompt += `

You can reference, respond to, or build upon what these other characters said.`;
        }

        return enhancedPrompt;
    }

    // ============================================================================
    // RESPONSE PATTERN LOGIC
    // ============================================================================

    determineResponsePattern(activeCharacters, groupMode, conversationHistory) {
        switch (groupMode) {
            case 'natural':
                const recentSpeakers = conversationHistory
                    .slice(-5)
                    .filter(m => m.type === 'character')
                    .map(m => m.character);

                const sortedByRecency = activeCharacters.sort((a, b) => {
                    const aLastIndex = recentSpeakers.lastIndexOf(a);
                    const bLastIndex = recentSpeakers.lastIndexOf(b);
                    return aLastIndex - bLastIndex;
                });

                const numResponders = Math.min(
                    Math.floor(Math.random() * 2) + 1,
                    sortedByRecency.length
                );

                return sortedByRecency.slice(0, numResponders);

            case 'round-robin':
                const lastResponder = conversationHistory
                    .slice()
                    .reverse()
                    .find(m => m.type === 'character')?.character;

                const lastIndex = activeCharacters.indexOf(lastResponder);
                const nextIndex = (lastIndex + 1) % activeCharacters.length;
                return [activeCharacters[nextIndex]];

            case 'all-respond':
                return [...activeCharacters];

            default:
                return [activeCharacters[0]];
        }
    }

    // ============================================================================
    // MEMORY PROCESSING
    // ============================================================================

    /**
     * Process conversation for memories and relationship updates
     */
    async processConversationMemories(characterId, userId, userMessage, characterResponse, characterContext, sessionId) {
        try {
            console.log(`>à Processing memories for character ${characterId}...`);

            // Analyze conversation for new memories
            const newMemories = this.db.analyzeConversationForMemories(
                userMessage,
                characterResponse,
                characterContext.userPersona,
                userId
            );

            // Store new memories
            for (const memory of newMemories) {
                await this.db.addCharacterMemory(characterId, userId, memory);
            }

            // Update character relationship
            const relationshipUpdate = this.db.calculateRelationshipUpdate(
                characterContext.relationship,
                userMessage,
                characterResponse
            );

            await this.db.updateCharacterRelationship(characterId, userId, relationshipUpdate);

            console.log(` Processed ${newMemories.length} memories for ${characterId}`);

        } catch (error) {
            console.error('Error processing conversation memories:', error);
            // Don't throw - memory processing shouldn't break chat
        }
    }

    getGlobalSystemPrompt() {
        return GLOBAL_SYSTEM_PROMPT;
    }
}

module.exports = ChatLogicService;
