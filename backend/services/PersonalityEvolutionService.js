// backend/services/PersonalityEvolutionService.js
// Compiles short-term memories into personality growth for characters.
// Triggered automatically after N messages (per character setting) or manually by the user.

const AIProviderService = require('./AIProviderService');

// Max chars for growth text per personality_size setting
const GROWTH_BUFFER = {
  small: 250,
  medium: 500,
  large: 1000
};

// Minimum memories before a compile is worthwhile
const MIN_MEMORIES_FOR_COMPILE = 3;

class PersonalityEvolutionService {
  /**
   * Compile uncompiled memories into a personality_growth snippet for a character.
   * Writes to DB and returns the new growth text, or null if nothing to compile.
   *
   * @param {object} character      - Full character row from LocalDatabaseService
   * @param {string} userId         - Current user ID
   * @param {object} db             - DatabaseService instance (has .localDb)
   * @param {object} apiKeys        - User's API keys { openai, anthropic, ... }
   * @param {object} ollamaSettings - { ollamaEnabled, ollamaBaseUrl, ... }
   * @returns {string|null}         - The compiled growth text, or null
   */
  static async compileGrowth(character, userId, db, apiKeys = {}, ollamaSettings = {}) {
    const localDb = db.localDb || db;

    const memories = localDb.getUncompiledMemories(character.id, userId);
    if (!memories || memories.length < MIN_MEMORIES_FOR_COMPILE) {
      return null;
    }

    const bufferSize = GROWTH_BUFFER[character.personality_size || 'small'];
    const memoryText = memories.map(m => `- ${m.content}`).join('\n');

    // Approximate token ceiling: 4 chars ≈ 1 token
    const approxMaxTokens = Math.ceil(bufferSize / 3);

    const messages = [
      {
        role: 'user',
        content:
          `Based on these recent experiences and memories:\n${memoryText}\n\n` +
          `Write a brief reflection (max ${bufferSize} characters) describing how these experiences have shaped you. ` +
          `Write in first person, naturally, as if these are simply part of who you are now. ` +
          `Do not use quotes, meta-commentary, or phrases like "I have learned". Just the growth itself.`
      }
    ];

    // Use a lightweight generation config — temperature slightly lower for coherent prose
    const generationCharacter = {
      ...character,
      temperature: 0.6,
      max_tokens: approxMaxTokens
    };

    let growthText;
    try {
      growthText = await AIProviderService.generateResponse(
        generationCharacter,
        messages,
        apiKeys,
        ollamaSettings
      );
    } catch (err) {
      console.error(`[Evolution] AI call failed for ${character.name}:`, err.message);
      return null;
    }

    if (!growthText || !growthText.trim()) return null;

    const trimmed = growthText.trim().slice(0, bufferSize);
    localDb.savePersonalityGrowth(character.id, trimmed);
    localDb.markMemoriesAsCompiled(character.id, userId);

    console.log(`[Evolution] Compiled growth for ${character.name} (${trimmed.length} chars, ${memories.length} memories)`);
    return trimmed;
  }
}

module.exports = PersonalityEvolutionService;
