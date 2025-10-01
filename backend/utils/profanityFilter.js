// ============================================================================
// Profanity Filter Utility
// Content moderation for public characters
// backend/utils/profanityFilter.js
// ============================================================================

// Basic profanity list (expand this significantly in production)
const PROFANITY_LIST = [
  // Add comprehensive list of inappropriate words
  // This is just a starter - use a library like 'bad-words' for production
  'badword1',
  'badword2',
  // etc.
];

// Variations and leetspeak patterns
const PROFANITY_PATTERNS = [
  // Add regex patterns for common variations
  /b[a@]dw[o0]rd/i,
  // etc.
];

class ProfanityFilter {
  constructor() {
    this.wordList = new Set(PROFANITY_LIST.map(word => word.toLowerCase()));
    this.patterns = PROFANITY_PATTERNS;
  }

  /**
   * Check if text contains profanity
   */
  containsProfanity(text) {
    if (!text) return false;

    const lowerText = text.toLowerCase();

    // Check against word list
    for (const word of this.wordList) {
      if (lowerText.includes(word)) {
        return true;
      }
    }

    // Check against patterns
    for (const pattern of this.patterns) {
      if (pattern.test(lowerText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find profane words in text
   */
  findProfanity(text) {
    if (!text) return [];

    const lowerText = text.toLowerCase();
    const found = [];

    // Check word list
    for (const word of this.wordList) {
      if (lowerText.includes(word)) {
        found.push(word);
      }
    }

    // Check patterns
    for (const pattern of this.patterns) {
      const matches = lowerText.match(pattern);
      if (matches) {
        found.push(...matches);
      }
    }

    return [...new Set(found)]; // Remove duplicates
  }

  /**
   * Validate tags for public character
   */
  validateTags(tags) {
    const invalidTags = tags.filter(tag => this.containsProfanity(tag));

    if (invalidTags.length > 0) {
      return {
        valid: false,
        invalidTags,
        message: `These tags contain inappropriate content: ${invalidTags.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate character content for public publishing
   */
  validateCharacterContent(character) {
    const errors = [];

    // Check name
    if (this.containsProfanity(character.name)) {
      errors.push('Character name contains inappropriate content');
    }

    // Check personality
    if (this.containsProfanity(character.personality)) {
      errors.push('Personality description contains inappropriate content');
    }

    // Check appearance
    if (character.appearance && this.containsProfanity(character.appearance)) {
      errors.push('Appearance description contains inappropriate content');
    }

    // Check background
    if (character.background && this.containsProfanity(character.background)) {
      errors.push('Background description contains inappropriate content');
    }

    // Check tags
    const tagValidation = this.validateTags(character.tags || []);
    if (!tagValidation.valid) {
      errors.push(tagValidation.message);
    }

    // Check chat examples
    if (character.chat_examples) {
      for (let i = 0; i < character.chat_examples.length; i++) {
        const example = character.chat_examples[i];
        if (this.containsProfanity(example.user) || this.containsProfanity(example.character)) {
          errors.push(`Chat example ${i + 1} contains inappropriate content`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean text by replacing profanity with asterisks (optional)
   */
  cleanText(text) {
    if (!text) return text;

    let cleanedText = text;

    // Replace profane words
    for (const word of this.wordList) {
      const regex = new RegExp(word, 'gi');
      cleanedText = cleanedText.replace(regex, '*'.repeat(word.length));
    }

    // Replace pattern matches
    for (const pattern of this.patterns) {
      cleanedText = cleanedText.replace(pattern, match => '*'.repeat(match.length));
    }

    return cleanedText;
  }

  /**
   * Get severity score (0-10) based on profanity frequency
   */
  getSeverityScore(text) {
    if (!text) return 0;

    const found = this.findProfanity(text);
    const wordCount = text.split(/\s+/).length;
    const profanityRatio = found.length / wordCount;

    // Score based on frequency
    if (profanityRatio > 0.3) return 10; // Very severe
    if (profanityRatio > 0.2) return 8;
    if (profanityRatio > 0.1) return 6;
    if (profanityRatio > 0.05) return 4;
    if (found.length > 0) return 2;
    return 0;
  }
}

// Singleton instance
const profanityFilter = new ProfanityFilter();

module.exports = profanityFilter;