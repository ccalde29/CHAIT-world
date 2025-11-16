// backend/services/database.js
// Main database service that composes all specialized services

const { createClient } = require('@supabase/supabase-js');
const ChatService = require('./ChatService');
const UserSettingsService = require('./UserSettingsService');
const ScenarioService = require('./ScenarioService');
const MemoryService = require('./MemoryService');
const ImageService = require('./ImageService');

class DatabaseService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables');
        }

        this.supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Initialize all services
        this.chatService = new ChatService(this.supabase);
        this.userSettingsService = new UserSettingsService(this.supabase);
        this.scenarioService = new ScenarioService(this.supabase);
        this.memoryService = new MemoryService(this.supabase);
        this.imageService = new ImageService(this.supabase);
    }

    // ============================================================================
    // CHAT SESSION & MESSAGE MANAGEMENT
    // ============================================================================

    async createChatSession(userId, sessionData) {
        return this.chatService.createChatSession(userId, sessionData);
    }

    async saveChatMessage(sessionId, messageData) {
        return this.chatService.saveChatMessage(sessionId, messageData);
    }

    async getChatSession(userId, sessionId) {
        return this.chatService.getChatSession(userId, sessionId);
    }

    async getChatHistory(userId, limit = 20) {
        return this.chatService.getChatHistory(userId, limit);
    }

    async updateChatSessionActivity(sessionId) {
        return this.chatService.updateChatSessionActivity(sessionId);
    }

    async updateChatSession(userId, sessionId, updates) {
        return this.chatService.updateChatSession(userId, sessionId, updates);
    }

    async deleteChatSession(userId, sessionId) {
        return this.chatService.deleteChatSession(userId, sessionId);
    }

    // ============================================================================
    // CHARACTER MANAGEMENT
    // ============================================================================

    async hideDefaultCharacter(userId, characterId) {
        try {
            const { error } = await this.supabase
            .from('hidden_default_characters')
            .upsert({
                user_id: userId,
                character_id: characterId
            });

            if (error) throw error;
            return true;

        } catch (error) {
            console.error('Database error hiding character:', error);
            throw error;
        }
    }

    // ============================================================================
    // USER SETTINGS MANAGEMENT
    // ============================================================================

    async getUserSettings(userId) {
        return this.userSettingsService.getUserSettings(userId);
    }

    async updateUserSettings(userId, updates) {
        return this.userSettingsService.updateUserSettings(userId, updates);
    }

    // ============================================================================
    // USER PERSONA MANAGEMENT
    // ============================================================================

    async getUserPersona(userId) {
        return this.userSettingsService.getUserPersona(userId);
    }

    async createOrUpdateUserPersona(userId, personaData) {
        return this.userSettingsService.createOrUpdateUserPersona(userId, personaData);
    }

    async deleteUserPersona(userId) {
        return this.userSettingsService.deleteUserPersona(userId);
    }

    // ============================================================================
    // SCENARIO MANAGEMENT
    // ============================================================================

    async getScenarios(userId) {
        return this.scenarioService.getScenarios(userId);
    }

    async createScenario(userId, scenarioData) {
        return this.scenarioService.createScenario(userId, scenarioData);
    }

    async updateScenario(userId, scenarioId, updates) {
        return this.scenarioService.updateScenario(userId, scenarioId, updates);
    }

    async deleteScenario(userId, scenarioId) {
        return this.scenarioService.deleteScenario(userId, scenarioId);
    }

    // ============================================================================
    // CHARACTER MEMORY MANAGEMENT
    // ============================================================================

    async getCharacterMemories(characterId, userId, limit = 10) {
        return this.memoryService.getCharacterMemories(characterId, userId, limit);
    }

    async addCharacterMemory(characterId, userId, memoryData) {
        return this.memoryService.addCharacterMemory(characterId, userId, memoryData);
    }

    async clearCharacterMemories(characterId, userId) {
        return this.memoryService.clearCharacterMemories(characterId, userId);
    }

    async getCharacterRelationship(characterId, userId) {
        return this.memoryService.getCharacterRelationship(characterId, userId);
    }

    async updateCharacterRelationship(characterId, userId, relationshipData) {
        return this.memoryService.updateCharacterRelationship(characterId, userId, relationshipData);
    }

    async buildCharacterContext(characterId, userId, sessionId = null, otherCharacters = []) {
        // Get user persona first
        const userPersonaResult = await this.userSettingsService.getUserPersona(userId);

        // Build character context from memory service
        const context = await this.memoryService.buildCharacterContext(
            characterId,
            userId,
            sessionId,
            otherCharacters
        );

        // Add user persona to context
        return {
            ...context,
            userPersona: userPersonaResult.persona
        };
    }

    analyzeConversationForMemories(userMessage, characterResponse, userPersona, userId) {
        return this.memoryService.analyzeConversationForMemories(
            userMessage,
            characterResponse,
            userPersona,
            userId
        );
    }

    calculateRelationshipUpdate(currentRelationship, userMessage, characterResponse) {
        return this.memoryService.calculateRelationshipUpdate(
            currentRelationship,
            userMessage,
            characterResponse
        );
    }

    determineRelationshipType(emotionalBond, familiarityLevel) {
        return this.memoryService.determineRelationshipType(emotionalBond, familiarityLevel);
    }

    // ============================================================================
    // IMAGE MANAGEMENT
    // ============================================================================

    async updateCharacterImage(userId, characterId, imageData) {
        return this.imageService.updateCharacterImage(userId, characterId, imageData);
    }

    async updateUserPersonaImage(userId, imageData) {
        return this.imageService.updateUserPersonaImage(userId, imageData);
    }

    async updateScenarioImage(userId, scenarioId, imageData) {
        return this.imageService.updateScenarioImage(userId, scenarioId, imageData);
    }

    async deleteImage(userId, filename, type) {
        return this.imageService.deleteImage(userId, filename, type);
    }
}

module.exports = DatabaseService;
