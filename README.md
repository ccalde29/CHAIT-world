# CHAIT World 🌍

> **C**onversational **H**uman-**AI** **T**echnology World

A powerful multi-character AI chat application that enables rich, dynamic conversations with multiple AI personalities simultaneously. Create custom characters, build immersive scenes, and watch as your characters interact with each other and remember your conversations over time.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

---

## ✨ Features

### 🎭 **Advanced Character System**
- **Custom Character Creation** - Design characters with detailed personalities, appearances, backgrounds, and behavioral traits
- **Per-Character AI Models** - Choose different AI providers (OpenAI, Anthropic, OpenRouter, Google Gemini, Ollama) and models for each character
- **Character-to-Character Relationships** - Define how characters relate to each other for authentic group dynamics
- **Chat Examples** - Provide example dialogues to train character responses (few-shot learning)
- **Dynamic Personalities** - Characters with customizable temperature, creativity levels, and response styles
- **Age-Safe** - Built-in 18+ validation for all characters
- **Tag Organization** - Organize characters with custom tags for easy filtering
- **Custom Avatars** - Use emojis or upload custom character images

### 💬 **Multi-Character Conversations**
- **Group Chat Mode** - Multiple characters respond in the same conversation
- **Smart Turn-Taking** - Intelligent selection of which characters respond based on mentions and conversation flow
- **Character Awareness** - Characters reference and respond to each other's messages
- **Scene Management** - Create custom scenes with initial messages, atmosphere, and custom backgrounds
- **Conversation History** - Save and load previous chat sessions
- **Session Management** - Organized chat history with search and filtering

### 🧠 **Intelligent Memory System**
- **Persistent Memory** - Characters remember facts, preferences, and experiences across sessions
- **User-Character Relationships** - Evolving relationships with familiarity and emotional bond tracking
- **Character-to-Character Relationships** - Characters remember their relationships with other characters
- **Contextual Awareness** - Characters use past conversations to inform current responses
- **Memory per Character** - Each character maintains their own unique memories and perspective
- **Automatic Learning** - System automatically tracks interaction counts and discussion topics

### 🌐 **Community Hub**
- **Character Marketplace** - Browse and import characters shared by the community
- **Publishing System** - Share your custom characters with others (with optional field locking)
- **Privacy Controls** - Lock specific character fields when publishing to keep some details private
- **Search & Filter** - Find characters by tags, search terms, or sort by popularity/recency
- **Import with One Click** - Instantly add community characters to your collection
- **Content Moderation** - Age validation and profanity filtering for public characters
- **Scene Sharing** - Publish and import custom scenes from the community

### 👤 **User Personas**
- **Custom User Profiles** - Define your own personality, interests, and communication style
- **Multiple Personas** - Create different personas for different contexts
- **Persona-Aware Characters** - Characters adapt their responses based on your persona
- **Custom Avatars** - Upload custom images for your persona

### ⚙️ **Powerful Customization**
- **Multi-Provider Support** - OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), OpenRouter, Google Gemini, and Ollama
- **Per-Character Settings** - Adjust temperature, max tokens, and context window for each character individually
- **Memory Toggle** - Enable/disable memory for specific characters
- **Fallback Providers** - Configure fallback AI providers in case primary fails
- **Color Themes** - Personalized color schemes for each character
- **Rate Limiting** - Built-in protection against API abuse

### 🔐 **Privacy & Control**
- **Private Characters** - Keep characters private or share publicly
- **Private Scenes** - Control which scenes are public vs private
- **Local Data** - Your conversations stored securely in your own Supabase database
- **API Key Control** - Use your own API keys (stored encrypted in your database)
- **No Data Tracking** - All data remains in your Supabase instance
- **Google OAuth** - Secure authentication via Google

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** or **yarn**
- **Supabase Account** (free tier works perfectly)
- **AI Provider API Key** - At least one of:
  - OpenAI API Key (GPT models)
  - Anthropic API Key (Claude models)
  - OpenRouter API Key
  - Google Gemini API Key
  - Local Ollama installation (free)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ccalde29/CHAIT-world.git
   cd CHAIT-world
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to **Settings → API** to get your:
     - Project URL
     - Anon/Public key
     - Service Role key (for backend)
   - Go to **Authentication → Providers** and enable **Google OAuth**

5. **Configure environment variables**

   **Backend** (`backend/.env`):
   ```env
   NODE_ENV=development
   PORT=3001

   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000

   # Encryption Key (generate a random 64-character hex string)
   ENCRYPTION_KEY=your_random_encryption_key_here
   ```

   **Frontend** (`frontend/.env`):
   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

6. **Set up the database**
   - The database schema will be created automatically on first run
   - Or use Supabase CLI:
     ```bash
     supabase db push
     ```

7. **Start the application**

   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```

8. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Sign in with Google
   - Configure your AI provider API keys in **Settings**
   - Start chatting!

---

## 📚 Usage Guide

### Creating Your First Character

1. Click **"Characters & Scenes"** in the sidebar
2. Click **"Create Character"**
3. Fill in the character details:
   - **Name** - Character's name
   - **Age** - Must be 18 or older
   - **Sex** - Gender identity (optional)
   - **Personality** - Detailed personality description (the most important field!)
   - **Appearance** - Physical description (optional)
   - **Background** - Backstory and context (optional)
   - **Avatar** - Choose an emoji or upload an image
   - **Tags** - Add tags for organization
4. Configure **AI Settings**:
   - **AI Provider** - Choose OpenAI, Anthropic, OpenRouter, Google, or Ollama
   - **Model** - Select specific model (e.g., gpt-4, claude-3-opus)
   - **Temperature** - Creativity level (0.0-2.0)
   - **Max Tokens** - Response length (50-1000)
   - **Context Window** - Memory size (1000-32000)
5. Optionally add **Chat Examples** to fine-tune response style
6. Optionally add **Relationships** with other characters
7. Click **"Create Character"**

### Starting a Conversation

1. Click **"Start New Chat"** button
2. Select a **scene** (or create a new one)
3. Select **characters** to participate in the conversation
4. Click **"Start Chat"**
5. Type your message and hit send
6. Characters will respond based on:
   - Their personality and background
   - Their memories of you
   - Their relationships with you and other characters
   - The current scene context

### Managing Scenes

1. Click **"Characters & Scenes"** → **"Scenes"** tab
2. Click **"Create Scene"**
3. Fill in scene details:
   - **Name** - Scene name
   - **Description** - What's the setting?
   - **Initial Message** - Opening message (optional)
   - **Atmosphere** - Mood/vibe of the scene
   - **Background Image** - Upload custom background (optional)
4. Click **"Create Scene"**

### Publishing to Community

**Publishing a Character:**
1. Go to **"Characters & Scenes"**
2. Find your character and click the **upload icon**
3. Choose privacy options:
   - Lock specific fields (personality, appearance, background) to hide them from importers
   - Locked fields will be NULL when others import
4. Click **"Publish to Community"**

**Publishing a Scene:**
1. Go to **"Characters & Scenes"** → **"Scenes"** tab
2. Find your scene and click the **upload icon**
3. Configure privacy settings
4. Click **"Publish to Community"**

### Importing from Community

1. Click **"Community Hub"** in the sidebar
2. Browse characters and scenes
3. Use search and filters to find what you want
4. Click on an item to see details
5. Click **"Import"** to add it to your collection
6. Customize the imported character/scene as needed

### Setting Up Your User Persona

1. Click **"Personas"** in the sidebar
2. Click **"Create Persona"**
3. Fill in your details:
   - **Name** - Your name or nickname
   - **Age** - Your age
   - **Personality** - How would you describe yourself?
   - **Interests** - Your hobbies and interests
   - **Communication Style** - How you prefer to communicate
   - **Avatar** - Upload an image or choose emoji
4. Click **"Save Persona"**
5. Select this persona as active for tailored character responses

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with Hooks
- Tailwind CSS
- Lucide Icons
- Supabase Client (Auth & Storage)
- Custom React Hooks for state management

**Backend:**
- Node.js / Express.js
- Supabase (PostgreSQL + Storage + Auth)
- Modular Route & Service Architecture
- Multiple AI Provider Integrations
- Rate Limiting Middleware
- Content Moderation (Profanity Filtering)

**Database:**
- PostgreSQL (via Supabase)
- JSONB columns for flexible data
- Automatic timestamps and user tracking
- Efficient indexing for queries

**AI Providers:**
- OpenAI (GPT-3.5, GPT-4, GPT-4 Turbo)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- OpenRouter (Multiple models)
- Google Gemini
- Ollama (Local models)

### Project Structure

```
CHAIT-world/
├── frontend/
│   ├── public/
│   │   └── index.html              # App entry point
│   ├── src/
│   │   ├── components/
│   │   │   ├── MainApp.js          # Main application container
│   │   │   ├── CharacterEditor.js  # Character creation/editing
│   │   │   ├── CharacterSceneHub.js # Character & scene management
│   │   │   ├── CommunityHub.js     # Community marketplace
│   │   │   ├── PersonaManager.js   # User persona management
│   │   │   ├── SceneEditor.js      # Scene creation/editing
│   │   │   ├── SettingsModal.js    # User settings & API keys
│   │   │   ├── ChatInterface.js    # Message display & input
│   │   │   ├── ActiveChatPanel.js  # Current chat sidebar
│   │   │   ├── ChatHistorySidebar.js # Chat history
│   │   │   ├── NewChatModal.js     # New chat creation
│   │   │   ├── ImageUpload.js      # Image upload component
│   │   │   ├── CharacterMemoryViewer.js # Memory inspection
│   │   │   └── LoginScreen.js      # Google OAuth login
│   │   ├── contexts/
│   │   │   └── AuthContext.js      # Authentication context
│   │   ├── hooks/
│   │   │   ├── useChat.js          # Chat state management
│   │   │   ├── useCharacters.js    # Character state
│   │   │   ├── useSettings.js      # User settings
│   │   │   └── usePersonas.js      # Persona management
│   │   ├── utils/
│   │   │   └── apiClient.js        # API request wrapper
│   │   ├── lib/
│   │   │   └── supabase.js         # Supabase client
│   │   ├── App.js                  # Root component
│   │   ├── index.js                # React entry point
│   │   └── index.css               # Global styles
│   └── package.json
│
├── backend/
│   ├── server-supabase.js          # Express server entry point
│   ├── services/
│   │   ├── database.js             # Main database service
│   │   ├── AIProviderService.js    # AI provider routing
│   │   ├── characterService.js     # Character CRUD operations
│   │   ├── communityService.js     # Community features
│   │   ├── ChatService.js          # Chat session management
│   │   ├── ChatLogicService.js     # Chat logic & flow
│   │   ├── MemoryService.js        # Character memory system
│   │   ├── UserSettingsService.js  # User settings & personas
│   │   ├── ScenarioService.js      # Scene management
│   │   ├── ImageService.js         # Image upload/storage
│   │   ├── CharacterLearningService.js # Learning & analytics
│   │   ├── CharacterCommentService.js  # Comments system
│   │   └── SceneCommentService.js      # Scene comments
│   ├── routes/
│   │   ├── group-chat.js           # Main chat endpoint
│   │   ├── characters.js           # Character routes
│   │   ├── community.js            # Community routes
│   │   ├── chat-sessions.js        # Session management
│   │   ├── personas.js             # User persona routes
│   │   ├── relationships.js        # Relationship management
│   │   ├── scenarios.js            # Scene routes
│   │   ├── memory.js               # Memory routes
│   │   ├── user.js                 # User settings routes
│   │   ├── images.js               # Image upload routes
│   │   ├── providers.js            # AI provider info
│   │   ├── characterLearning.js    # Learning analytics
│   │   ├── characterComments.js    # Character comments
│   │   └── sceneComments.js        # Scene comments
│   ├── middleware/
│   │   └── rateLimiter.js          # Rate limiting
│   ├── utils/
│   │   └── profanityFilter.js      # Content moderation
│   ├── constants/
│   │   └── defaults.js             # Default constants
│   ├── docs/                       # API documentation
│   └── package.json
│
├── supabase/
│   └── config.toml                 # Supabase local dev config
│
└── README.md
```

---

## 🗃️ Database Schema

### Core Tables

- **`characters`** - Character definitions with personality, AI settings, relationships, and metadata
- **`user_personas`** - User personality profiles for personalized character interactions
- **`user_settings`** - User preferences and encrypted API keys
- **`chat_sessions`** - Conversation sessions with metadata and active characters
- **`messages`** - Individual messages in conversations with character context
- **`scenarios`** - Custom conversation scenes with atmosphere and backgrounds
- **`character_memories`** - Facts and experiences characters remember about users
- **`character_relationships`** - Relationships between characters, and between users and characters
- **`character_learning`** - Automatic tracking of interactions, topics, and learning patterns

### Community Tables

- **`community_characters`** - Published characters available for import (view)
- **`community_scenes`** - Published scenes available for import (view)
- **`character_imports`** - Track who imported which characters
- **`scene_imports`** - Track scene import history
- **`character_comments`** - User comments and ratings on community characters
- **`scene_comments`** - User comments on community scenes

### Storage Buckets

- **`character-images`** - Character avatar images
- **`scene-backgrounds`** - Scene background images
- **`persona-avatars`** - User persona avatars

---

## 🔑 API Endpoints

### Authentication
All endpoints require authentication via the `user-id` header (from Google OAuth).

### Characters
- `GET /api/characters` - Get all user characters (includes default characters)
- `POST /api/characters` - Create new character
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character
- `POST /api/characters/:id/publish` - Publish character to community
- `POST /api/characters/:id/unpublish` - Remove character from community
- `GET /api/characters/:id/relationships` - Get character's relationships
- `POST /api/characters/:id/relationships` - Create character relationship
- `PUT /api/characters/:characterId/relationships/:relationshipId` - Update relationship
- `DELETE /api/characters/:characterId/relationships/:relationshipId` - Delete relationship

### Community
- `GET /api/community/characters` - Browse public characters (with search, tags, sorting)
- `POST /api/community/characters/:id/import` - Import character to your collection
- `GET /api/community/scenes` - Browse public scenes
- `POST /api/community/scenes/:id/import` - Import scene
- `GET /api/community/tags` - Get popular tags

### Chat
- `POST /api/chat/group-response` - Get AI responses from multiple characters
- `GET /api/chat/sessions` - Get user's chat sessions
- `POST /api/chat/sessions/create-with-initial-message` - Create new session
- `GET /api/chat/sessions/:sessionId` - Get session details
- `GET /api/chat/sessions/:sessionId/messages` - Get session messages
- `PUT /api/chat/sessions/:sessionId` - Update session
- `DELETE /api/chat/sessions/:sessionId` - Delete session

### Memories
- `GET /api/character/:characterId/memories` - Get character's memories of user
- `POST /api/character/:characterId/memories` - Create memory (manual)
- `DELETE /api/character/:characterId/memories/:memoryId` - Delete memory

### User Personas
- `GET /api/personas` - Get all user personas
- `POST /api/personas` - Create new persona
- `PUT /api/personas/:id` - Update persona
- `DELETE /api/personas/:id` - Delete persona
- `PUT /api/personas/:id/set-active` - Set active persona

### User Settings
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update settings (API keys, preferences)

### Scenarios (Scenes)
- `GET /api/scenarios` - Get user's scenes
- `POST /api/scenarios` - Create new scene
- `PUT /api/scenarios/:id` - Update scene
- `DELETE /api/scenarios/:id` - Delete scene

### Character Learning (Automatic Analytics)
- `GET /api/learning/characters/:characterId` - Get learning data for character
- `GET /api/learning/overview` - Get learning overview for all characters
- `POST /api/learning/characters/:characterId/interaction` - Record interaction (automatic)
- `POST /api/learning/characters/:characterId/topics` - Add topic discussed (automatic)
- `DELETE /api/learning/characters/:characterId` - Clear learning data

### AI Providers
- `GET /api/providers/available` - Get available AI providers and models
- `POST /api/providers/test` - Test API key for a provider

### Images
- `POST /api/images/character/:characterId` - Upload character avatar
- `POST /api/images/persona/:personaId` - Upload persona avatar
- `POST /api/images/scenario/:scenarioId` - Upload scene background
- `DELETE /api/images/:type/:filename` - Delete image

---

## ⚙️ Configuration

### AI Provider Settings

The application supports multiple AI providers. Configure them in **Settings** → **AI Configuration**.

**OpenAI:**
```javascript
{
  provider: 'openai',
  model: 'gpt-4-turbo-preview',  // or 'gpt-4', 'gpt-3.5-turbo'
  apiKey: 'sk-...'
}
```

**Anthropic:**
```javascript
{
  provider: 'anthropic',
  model: 'claude-3-opus-20240229',  // or 'claude-3-sonnet', 'claude-3-haiku'
  apiKey: 'sk-ant-...'
}
```

**OpenRouter:**
```javascript
{
  provider: 'openrouter',
  model: 'anthropic/claude-3-opus',  // any OpenRouter model
  apiKey: 'sk-or-...'
}
```

**Google Gemini:**
```javascript
{
  provider: 'google',
  model: 'gemini-pro',
  apiKey: 'AI...'
}
```

**Ollama (Local):**
```javascript
{
  provider: 'ollama',
  model: 'llama2',  // any installed Ollama model
  baseUrl: 'http://localhost:11434'
}
```

### Per-Character Model Settings

Each character can have its own AI provider and model:

```javascript
{
  ai_provider: 'openai',           // Provider to use
  ai_model: 'gpt-4',               // Specific model
  temperature: 0.8,                // 0.0-2.0, controls creativity
  max_tokens: 150,                 // 50-1000, response length
  context_window: 8000,            // 1000-32000, conversation memory
  memory_enabled: true,            // Enable/disable memory
  fallback_provider: 'anthropic',  // Backup if primary fails
  fallback_model: 'claude-3-sonnet'
}
```

### Environment Variables

**Backend:**
- `NODE_ENV` - development | production
- `PORT` - Server port (default: 3001)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for backend operations
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `ENCRYPTION_KEY` - 64-character hex string for encrypting API keys

**Frontend:**
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anon/public key

---

## 🛠️ Development

### Running in Development Mode

```bash
# Backend (with auto-reload)
cd backend
npm run dev

# Frontend (with hot reload)
cd frontend
npm start
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd backend
NODE_ENV=production npm start
```

### Using Supabase CLI (Optional)

```bash
# Initialize Supabase locally
supabase init

# Start local Supabase
supabase start

# Push schema changes
supabase db push

# Generate TypeScript types
supabase gen types typescript
```

---

## 🚀 Deployment

### Deploying to Production

1. **Deploy Backend:**
   - Deploy to Railway, Render, or any Node.js hosting
   - Set environment variables
   - Ensure `NODE_ENV=production`

2. **Deploy Frontend:**
   - Build: `npm run build`
   - Deploy to Vercel, Netlify, or static hosting
   - Set `REACT_APP_API_URL` to your backend URL

3. **Supabase:**
   - Already cloud-hosted
   - Configure authentication providers in Supabase dashboard
   - Set up authorized domains for OAuth

4. **Update CORS:**
   - Update `ALLOWED_ORIGINS` in backend to include production domain

---

## 📊 Features Deep Dive

### Character Learning System

The system automatically tracks:
- **Interaction Count**: How many times you've talked to each character
- **Topics Discussed**: Keywords extracted from conversations using frequency analysis
- **Discussion Context**: When and how topics were discussed

All learning happens automatically in the background. No user action required!

### Memory System

Characters remember:
- **Facts about you**: Name, preferences, experiences you've shared
- **Your relationship**: Familiarity level (0-1), emotional bond (-1 to 1), trust level (0-1)
- **Past conversations**: Contextual awareness of what you've discussed
- **Their relationships**: How they relate to other characters in group chats

### Character Relationships

Define relationships between characters:
- **Relationship Types**: Friend, rival, mentor, romantic, family, colleague, stranger
- **Emotional Bond**: -1 (hostile) to 1 (very close)
- **Familiarity**: 0 (just met) to 1 (know each other well)
- **Custom Context**: Additional relationship details

Characters use this information to:
- Reference each other naturally in conversations
- Show appropriate emotional reactions
- Maintain consistent group dynamics

### Privacy Controls (Publishing)

When publishing characters or scenes, you can:
- **Lock Fields**: Hide personality, appearance, or background from importers
- **Keep Original**: Your version remains unchanged
- **Control Visibility**: Locked fields are NULL when imported

This allows sharing characters while protecting creative details.

---

## 🐛 Known Limitations

- Large conversations (1000+ messages) may experience slowdown
- Image uploads limited to 5MB
- Mobile layout optimization needed
- No real-time collaboration between users (yet)

---

## 🗺️ Roadmap

### ✅ Completed (v1.0)
- ✅ Multi-character group conversations
- ✅ Character memory system with relationship tracking
- ✅ Custom character creation with per-character AI models
- ✅ Community marketplace for characters and scenes
- ✅ Character-to-character relationships
- ✅ Scene management with custom backgrounds
- ✅ User persona system
- ✅ Chat session history
- ✅ Multiple AI provider support
- ✅ Automatic learning and topic tracking
- ✅ Privacy controls for publishing
- ✅ Image uploads for avatars and backgrounds

### 📋 Planned (v1.1+)

**Core Features:**
- Enhanced memory management UI
- Conversation branching
- Export/import chat sessions
- Character voice integration
- Streaming responses

**UI/UX:**
- Dark/light theme toggle
- Mobile-responsive design
- Keyboard shortcuts
- Customizable layouts

**AI Integration:**
- More AI provider options
- Voice-to-text input
- Image generation for characters
- Multimodal inputs

**Platform:**
- Mobile apps (iOS/Android)
- Desktop app (Electron)
- Discord bot integration

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed
- Keep PRs focused on a single feature/fix

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - GPT models
- **Anthropic** - Claude models
- **Supabase** - Backend infrastructure and authentication
- **Lucide** - Beautiful icon library
- **Tailwind CSS** - Utility-first CSS framework

---

## 📧 Contact & Support

**Project Link:** [https://github.com/ccalde29/CHAIT-world](https://github.com/ccalde29/CHAIT-world)

**Issues & Bug Reports:** [https://github.com/ccalde29/CHAIT-world/issues](https://github.com/ccalde29/CHAIT-world/issues)

**Discussions:** [https://github.com/ccalde29/CHAIT-world/discussions](https://github.com/ccalde29/CHAIT-world/discussions)

---

## 💡 FAQ

### Q: Do I need to pay for AI usage?
**A:** Yes, you'll need your own API key from at least one AI provider. OpenAI and Anthropic use pay-as-you-go pricing. Alternatively, use Ollama for completely free local AI (no API key needed).

### Q: Is my data private?
**A:** Yes! All data is stored in your own Supabase instance. Your conversations, characters, and API keys are never sent to us. API keys are encrypted in your database.

### Q: Can I use this commercially?
**A:** Yes, the MIT license allows commercial use. Just provide attribution.

### Q: How many characters can I create?
**A:** Unlimited! Create as many custom characters as you want.

### Q: Can different characters use different AI models?
**A:** Yes! Each character can have its own AI provider and model. Mix GPT-4, Claude, and local models in the same conversation.

### Q: How does the memory system work?
**A:** Characters automatically extract and remember facts from conversations. Memories persist across sessions and influence future responses.

### Q: Can I import the same character multiple times?
**A:** Yes, you can import community characters multiple times and customize each copy differently.

### Q: Does this work offline?
**A:** Not yet, but you can use Ollama for local AI models which doesn't require internet for inference (only for downloading models initially).

### Q: Can I self-host this?
**A:** Yes! You control both the frontend and backend. Deploy to your own servers and use your own Supabase instance.

### Q: What's the difference between scenes and characters?
**A:** Characters are the AI personalities you chat with. Scenes are the contexts/settings for conversations (like "Coffee Shop" or "Study Group"). Scenes set the mood and provide initial context.

### Q: How do I reset everything?
**A:** In Supabase, you can truncate tables or delete your project. Make sure to export any characters or scenes you want to keep first.

---

<div align="center">

**Built with ❤️ for creative AI conversations**

[⭐ Star this repo](https://github.com/ccalde29/CHAIT-world) | [🐛 Report Bug](https://github.com/ccalde29/CHAIT-world/issues) | [💡 Request Feature](https://github.com/ccalde29/CHAIT-world/issues)

</div>
