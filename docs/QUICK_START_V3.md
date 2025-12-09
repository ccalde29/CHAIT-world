# Quick Start Guide - CHAIT World v3.0

## 🚀 Getting Started

### 1. Apply Database Migration

```powershell
cd supabase
supabase db push
```

This adds the new fields for voice_traits, speech_patterns, context_rules, and metadata.

### 2. Restart Backend Server

```powershell
cd backend
npm run dev
```

### 3. Test the New Architecture

The system is backward compatible - existing characters and chats will work immediately!

---

## 🎯 New Services Overview

### PromptBuilder
**Purpose:** Constructs consistent, layered prompts

```javascript
const PromptBuilder = require('./services/PromptBuilder');
const builder = new PromptBuilder();

const prompt = builder.buildSystemPrompt({
  character,
  userPersona,
  scene,
  otherCharacters,
  characterRelationships,
  userRelationship,
  memories,
  learningData,
  adminSystemPrompt,
  sessionContinuity
});
```

### ProviderAdapter
**Purpose:** Normalizes behavior across AI providers

```javascript
const ProviderAdapter = require('./services/ProviderAdapter');

// Adapt prompt for provider
const adapted = ProviderAdapter.adaptPrompt(prompt, 'anthropic', character);

// Calculate dynamic settings
const temp = ProviderAdapter.calculateDynamicTemperature(character, context);
const budget = ProviderAdapter.calculateResponseBudget(character, context);

// Normalize response
const clean = ProviderAdapter.normalizeResponse(response, character, 'openai');
```

### ConversationStateTracker
**Purpose:** Tracks conversation evolution

```javascript
const ConversationStateTracker = require('./services/ConversationStateTracker');
const tracker = new ConversationStateTracker();

// Update state
tracker.updateState(message, character, history);

// Get current state
const state = tracker.getSummary();
// Returns: { mood, phase, active_topics, turn_count }
```

### ResponsePlanner
**Purpose:** Plans multi-character responses

```javascript
const ResponsePlanner = require('./services/ResponsePlanner');

// Plan who should respond
const plan = ResponsePlanner.planGroupResponse(
  userMessage,
  characters,
  history,
  conversationTracker
);

// Build context for character
const context = ResponsePlanner.buildCharacterContext(
  character,
  plan,
  tracker,
  scene
);

// Validate coherence
const isCoherent = ResponsePlanner.validateGroupCoherence(responses);
```

### MemoryRelevanceService
**Purpose:** Scores memories by relevance

```javascript
const MemoryRelevanceService = require('./services/MemoryRelevanceService');

// Get relevant memories
const memories = await MemoryRelevanceService.getRelevantMemories(
  memoryService,
  characterId,
  userId,
  currentMessage,
  context,
  8  // limit
);
```

### SessionContinuityService
**Purpose:** Maintains conversation continuity

```javascript
const SessionContinuityService = require('./services/SessionContinuityService');
const continuity = new SessionContinuityService(supabase);

// Load continuity context
const context = await continuity.loadContinuityContext(
  characterId,
  userId,
  currentSessionId
);

// Store metadata
await continuity.storeSessionMetadata(sessionId, metadata);
```

---

## 📝 Using New Character Fields

### Voice Traits (Optional - enhances consistency)

```javascript
// In character creation/update
const character = {
  ...existingFields,
  voice_traits: {
    formality: 0.2,        // 0=casual, 1=formal
    verbosity: 0.7,        // 0=brief, 1=elaborate  
    emotiveness: 0.8,      // 0=reserved, 1=expressive
    humor: 0.6,            // 0=serious, 1=playful
    directness: 0.5,       // 0=subtle, 1=blunt
    optimism: 0.7,         // 0=pessimistic, 1=optimistic
    intellectualism: 0.6   // 0=practical, 1=philosophical
  },
  speech_patterns: {
    favored_phrases: ["honestly", "you know", "I mean"],
    avoided_words: ["literally", "basically"],
    typical_sentence_length: "medium",  // short, medium, long
    uses_contractions: true,
    uses_slang: true,
    punctuation_style: "casual"  // formal, casual, expressive
  }
};
```

### Scene Context Rules (Optional - adds realism)

```javascript
// In scene creation/update
const scene = {
  ...existingFields,
  context_rules: {
    setting_type: "public",          // casual, public, private, formal
    time_of_day: "afternoon",        // morning, afternoon, evening, night
    noise_level: 0.7,                // 0=quiet, 1=very noisy
    formality_required: 0.3,         // 0=casual, 1=formal
    allowed_topics: ["casual", "work"],
    restricted_topics: ["politics", "religion"]
  },
  scene_state: {
    crowd_level: "busy",             // empty, moderate, busy
    active_npcs: ["barista", "customer"],
    recent_events: ["Fire alarm went off"],
    ambient_details: ["Jazz music playing", "Coffee aroma"]
  },
  character_modifiers: {
    "all": "Keep responses brief due to busy environment",
    "char-specific-id": "You're more relaxed in your favorite spot"
  }
};
```

---

## 🔧 Configuration

### Dynamic Temperature

The system now calculates temperature dynamically based on:
- Scene formality
- Emotional intensity
- Group size
- User familiarity
- Turn number
- Noise level

**Default behavior:** Uses character's base temperature with context adjustments

### Token Budget

Response length adapts based on:
- Group size (more characters = shorter responses)
- Previous message length
- Direct mentions (mentioned characters can be longer)
- Scene noise level
- Emotional intensity
- Character verbosity trait

**Default behavior:** Uses character's max_tokens with context adjustments

---

## 🐛 Debugging

### Enable Verbose Logging

The system logs key decisions:

```
[Planning] 2 character(s) will respond
[Response] Alice - Temp: 0.72, Tokens: 120
[Response] Bob - Temp: 0.85, Tokens: 90
[Coherence] Warning: Potential contradictions detected
[Group Chat v3.0] Generated 2 responses
```

### Check Conversation State

```javascript
const summary = conversationTracker.getSummary();
console.log('Mood:', summary.mood);
console.log('Topics:', summary.active_topics);
console.log('Phase:', summary.phase);
```

### Validate Memory Relevance

```javascript
// Check why certain memories were selected
const memories = await MemoryRelevanceService.getRelevantMemories(...);
memories.forEach(mem => {
  console.log(`Memory: ${mem.memory_content}`);
  console.log(`Relevance: ${mem.relevance_score}`);
  console.log(`Importance: ${mem.importance_score}`);
});
```

---

## ⚠️ Common Issues

### "TypeError: Cannot read property 'voice_traits' of undefined"

**Solution:** Voice traits are optional. The system handles missing fields gracefully.

```javascript
// Safe access
const formality = character.voice_traits?.formality || 0.5;
```

### "Responses are too long/short"

**Solution:** Check character verbosity trait and max_tokens:

```javascript
// Adjust character settings
character.voice_traits.verbosity = 0.3;  // Make briefer
character.max_tokens = 100;  // Reduce max length
```

### "Characters sound too similar"

**Solution:** Set distinct voice traits:

```javascript
// Character A: Formal, reserved
characterA.voice_traits = {
  formality: 0.9,
  emotiveness: 0.2,
  uses_contractions: false
};

// Character B: Casual, expressive
characterB.voice_traits = {
  formality: 0.2,
  emotiveness: 0.9,
  uses_contractions: true,
  uses_slang: true
};
```

---

## 📊 Monitoring

### Key Metrics to Track

1. **Response Coherence Rate**
   - Track how often `validateGroupCoherence()` returns true
   - Target: >95%

2. **Memory Relevance Scores**
   - Average relevance_score of selected memories
   - Target: >0.5

3. **Dynamic Temperature Range**
   - Track min/max temperatures used
   - Should vary based on context

4. **Token Budget Efficiency**
   - Compare calculated budget vs actual tokens used
   - Should be within 20%

---

## 🎨 Customization

### Adding New Provider Adaptations

```javascript
// In ProviderAdapter.js
static adaptPrompt(basePrompt, provider, character) {
  switch (provider.toLowerCase()) {
    case 'your-new-provider':
      return this.adaptForYourProvider(basePrompt, character);
    // ...
  }
}

static adaptForYourProvider(prompt, character) {
  // Custom logic
  return adaptedPrompt;
}
```

### Adding New Context Factors

```javascript
// In ProviderAdapter.analyzeContext()
const context = {
  // ...existing factors
  your_new_factor: calculateYourFactor(conversationHistory)
};
```

### Custom Voice Traits

```javascript
// Extend voice_traits schema
voice_traits: {
  // ...existing traits
  sarcasm: 0.3,        // Your custom trait
  storytelling: 0.8    // Your custom trait
}
```

---

## 📚 Further Reading

- [Full Documentation](./CONSISTENCY_IMPROVEMENTS_V3.md)
- [Character Learning API](./CHARACTER_LEARNING_API.md)
- [Comments API](./COMMENTS_API.md)
- [Content Locking](./CONTENT_LOCKING.md)

---

## 🤝 Contributing

When adding features:

1. Follow the service-oriented architecture
2. Keep services focused on single responsibility
3. Make changes backward compatible
4. Update this guide with new patterns
5. Add unit tests for new services

---

## 📞 Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify database migration ran successfully
3. Ensure all new services are properly imported
4. Review character/scene configurations

---

*Updated: December 9, 2025*
*Version: 3.0.0*
