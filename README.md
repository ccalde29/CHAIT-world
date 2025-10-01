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
- **Character Relationships** - Define how characters relate to each other for authentic group dynamics
- **Chat Examples** - Provide example dialogues to train character responses (few-shot learning)
- **Dynamic Personalities** - Characters with customizable temperament, creativity levels, and response styles
- **Age-Safe** - Built-in 18+ validation for all characters
- **Tag Organization** - Organize characters with custom tags for easy filtering

### 💬 **Multi-Character Conversations**
- **Group Chat Mode** - Multiple characters respond in the same conversation
- **Character Awareness** - Characters reference and respond to each other's messages
- **Natural Turn-Taking** - Smart conversation flow between multiple AI personalities
- **Scene Management** - Create custom scenes with specific characters and contexts
- **Conversation Memory** - Characters remember facts about you and past interactions

### 🧠 **Intelligent Memory System**
- **Persistent Memory** - Characters remember facts, preferences, and experiences across sessions
- **Relationship Tracking** - Evolving relationships with familiarity and trust levels
- **Contextual Awareness** - Characters use past conversations to inform current responses
- **Memory per Character** - Each character has their own unique memories and perspective

### 🌐 **Community Hub**
- **Character Marketplace** - Browse and import characters shared by the community
- **Publishing System** - Share your custom characters with others
- **Search & Filter** - Find characters by tags, popularity, or recency
- **Import with One Click** - Instantly add community characters to your collection
- **Content Moderation** - Age validation and profanity filtering for public characters

### ⚙️ **Powerful Customization**
- **AI Model Settings** - Adjust temperature, response length, and context window per character
- **Memory Toggle** - Enable/disable memory for specific characters
- **Custom Avatars** - Use emojis or upload custom character images
- **Color Themes** - Personalized color schemes for each character
- **User Personas** - Define your own personality for more tailored interactions

### 🔐 **Privacy & Control**
- **Private Characters** - Keep characters private or share publicly
- **Local Data** - Your conversations stored securely in your database
- **API Key Control** - Use your own OpenAI/Anthropic API keys
- **Data Export** - Export characters and conversations (coming soon)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** or **yarn**
- **Supabase Account** (free tier works)
- **OpenAI API Key** or **Anthropic API Key**

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
   - Go to Settings → API to get your project URL and anon key
   - Run the database migration script (found in `backend/migrations/`)

5. **Configure environment variables**

   **Backend** (`backend/.env`):
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   PORT=3001
   ```

   **Frontend** (`frontend/.env`):
   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

6. **Run the database migration**
   - Open your Supabase project
   - Go to SQL Editor
   - Copy and run the migration script from `backend/migrations/initial_schema.sql`

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
   - Enter your OpenAI or Anthropic API key in settings
   - Start chatting!

---

## 📚 Usage Guide

### Creating Your First Character

1. Click the **"Create Character"** button in the left sidebar
2. Fill in the character details:
   - **Name** - Give your character a name
   - **Age** - Must be 18 or older
   - **Personality** - Describe their traits, quirks, and speaking style
   - **Appearance** - Physical description (optional)
   - **Background** - Backstory and context (optional)
   - **Avatar** - Choose an emoji or upload an image
   - **Tags** - Add tags for organization
3. Optionally add **chat examples** to train response style
4. Adjust **model settings** (temperature, context window, memory)
5. Click **"Create Character"**

### Starting a Conversation

1. **Select characters** - Click on character cards to activate them (purple = active)
2. **Choose a scene** - Select a scene or use the default
3. **Type your message** - Characters will respond based on their personalities
4. **Multi-character mode** - Multiple active characters will take turns responding

### Publishing Characters

1. Create a custom character
2. Click the **upload icon** on the character card
3. Confirm you want to share it publicly
4. Your character will appear in the Community Hub for others to import

### Importing Community Characters

1. Click **"Community Hub"** in the sidebar
2. Browse or search for characters
3. Click on a character to see details
4. Click **"Import"** to add it to your collection

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18
- Tailwind CSS
- Lucide Icons
- Supabase Client

**Backend:**
- Node.js / Express
- Supabase (PostgreSQL)
- OpenAI API
- Anthropic API

**Database:**
- PostgreSQL (via Supabase)
- Row Level Security (RLS)
- Real-time subscriptions

### Project Structure

```
CHAIT-world/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MainApp.js           # Main application
│   │   │   ├── CharacterEditor.js   # Character creation/editing
│   │   │   ├── CommunityHub.js      # Character marketplace
│   │   │   ├── MemoryViewer.js      # Memory inspection
│   │   │   ├── SceneEditor.js       # Scene management
│   │   │   ├── Settings.js          # User settings
│   │   │   └── ImageUpload.js       # Avatar upload
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── backend/
│   ├── server-supabase.js           # Main server
│   ├── services/
│   │   ├── database.js              # Core DB operations
│   │   ├── characterService.js      # Character CRUD
│   │   ├── communityService.js      # Community features
│   │   └── aiService.js             # AI provider calls
│   ├── utils/
│   │   └── profanityFilter.js       # Content moderation
│   ├── migrations/
│   │   └── initial_schema.sql       # Database setup
│   └── package.json
│
└── README.md
```

---

## 🗃️ Database Schema

### Core Tables

- **`characters`** - Character definitions with personality, settings, and metadata
- **`user_personas`** - User personality profiles for personalized interactions
- **`character_memories`** - Facts and experiences characters remember
- **`character_relationships`** - Tracked relationships between users and characters
- **`chat_sessions`** - Conversation sessions with metadata
- **`messages`** - Individual messages in conversations
- **`scenes`** - Custom conversation scenes and contexts

### Community Tables

- **`character_imports`** - Track character import history
- **`character_favorites`** - User favorites for community characters
- **`character_reports`** - Content moderation reports
- **`character_comments`** - Reviews and feedback (optional)

### Views

- **`community_characters`** - Public characters with stats for marketplace

---

## 🔑 API Endpoints

### Characters

- `GET /api/characters` - Get all user characters
- `POST /api/characters` - Create new character
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character

### Community

- `GET /api/community/characters` - Browse public characters
- `POST /api/community/characters/:id/import` - Import character
- `POST /api/characters/:id/publish` - Publish to community
- `POST /api/characters/:id/unpublish` - Remove from community
- `GET /api/community/tags` - Get popular tags

### Chat

- `POST /api/chat/group-response` - Get responses from multiple characters
- `GET /api/chat/sessions/:userId` - Get user's chat sessions
- `GET /api/chat/messages/:sessionId` - Get messages from session

### Memories

- `GET /api/memories/:characterId/:userId` - Get character memories
- `POST /api/memories` - Create new memory
- `DELETE /api/memories/:id` - Delete memory

### User

- `GET /api/user-persona/:userId` - Get user persona
- `PUT /api/user-persona/:userId` - Update user persona
- `GET /api/user-settings/:userId` - Get user settings
- `PUT /api/user-settings/:userId` - Update settings

---

## ⚙️ Configuration

### AI Provider Settings

**OpenAI:**
```javascript
{
  apiProvider: 'openai',
  openaiApiKey: 'sk-...',
  model: 'gpt-4-turbo-preview'
}
```

**Anthropic:**
```javascript
{
  apiProvider: 'anthropic',
  anthropicApiKey: 'sk-ant-...',
  model: 'claude-3-opus-20240229'
}
```

**Ollama (Local):**
```javascript
{
  apiProvider: 'ollama',
  ollamaSettings: {
    baseUrl: 'http://localhost:11434',
    model: 'llama2'
  }
}
```

### Character Model Settings

```javascript
{
  temperature: 0.7,        // 0.0-2.0, controls creativity
  max_tokens: 150,         // 50-1000, response length
  context_window: 8000,    // 1000-32000, conversation memory
  memory_enabled: true     // Enable/disable character memory
}
```

---

## 🛠️ Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production mode
cd backend
NODE_ENV=production node server-supabase.js
```

### Database Migrations

To update the database schema:

1. Create a new SQL file in `backend/migrations/`
2. Run it in Supabase SQL Editor
3. Update the schema documentation

---

## 🗺️ Roadmap

### ✅ Completed (v1.0)

- ✅ Multi-character conversations
- ✅ Character memory system
- ✅ Custom character creation
- ✅ Community marketplace
- ✅ Character relationships
- ✅ Scene management
- ✅ Search and filtering
- ✅ Tag organization
- ✅ Model settings per character

### 🚧 In Progress (v1.1)

- 🔄 Memory viewer/editor UI
- 🔄 Conversation save/load
- 🔄 Export conversations
- 🔄 Character ratings & reviews

### 📋 Planned (v1.2+)

**Core Features:**
- Conversation branching ("what if" scenarios)
- Advanced memory management (importance scoring, clustering)
- Enhanced multi-character dynamics (interruptions, side conversations)

**UI/UX:**
- Dark/light theme toggle
- Customizable layouts
- Keyboard shortcuts
- Mobile-responsive design

**AI Integration:**
- Multiple AI provider support (easy provider switching)
- Ollama integration improvements
- Streaming response improvements

**Character Features:**
- Dynamic personality evolution
- Mood system
- Character goals and knowledge domains
- Time-aware behavior

**Creative:**
- Story mode (AI narrator)
- Character dreams (generated from memories)
- Autonomous messages (characters message you first)

**Collaboration:**
- Shared workspaces (multi-user sessions)
- Collaborative scene building
- Discord bot integration

**Platform:**
- Mobile apps (iOS/Android)
- Desktop app (Electron)
- Self-hosted option

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 🐛 Known Issues

- Character relationships don't resolve names in system prompts yet
- Mobile layout needs optimization
- Large conversations (1000+ messages) may slow down
- Image uploads limited to 5MB

See [Issues](https://github.com/ccalde29/CHAIT-world/issues) for full list.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - GPT models
- **Anthropic** - Claude models
- **Supabase** - Backend infrastructure
- **Lucide** - Beautiful icons
- **Tailwind CSS** - Styling framework

---

## 📧 Contact

**Project Link:** [https://github.com/ccalde29/CHAIT-world](https://github.com/ccalde29/CHAIT-world)

**Issues:** [https://github.com/ccalde29/CHAIT-world/issues](https://github.com/ccalde29/CHAIT-world/issues)

---

## 💡 FAQ

### Q: Do I need to pay for AI usage?
**A:** Yes, you'll need your own OpenAI or Anthropic API key. Both offer pay-as-you-go pricing. Alternatively, use Ollama for free local AI (no API key needed).

### Q: Is my data private?
**A:** Yes! All data is stored in your own Supabase instance. We don't have access to your conversations or API keys.

### Q: Can I use this commercially?
**A:** Yes, the MIT license allows commercial use. Just provide attribution.

### Q: How many characters can I create?
**A:** Unlimited! Create as many custom characters as you want.

### Q: Can I import characters multiple times?
**A:** Yes, you can import the same community character multiple times and customize each copy.

### Q: How do I reset everything?
**A:** Delete your Supabase tables and re-run the migration script. Make sure to export any characters you want to keep first.

### Q: Does this work offline?
**A:** Not yet, but offline mode with Ollama is planned for a future update.

### Q: Can I self-host this?
**A:** Yes! You control both the frontend and backend. Just deploy to your own servers.

---

<div align="center">

**Built with ❤️ for creative conversations**

[⭐ Star this repo](https://github.com/ccalde29/CHAIT-world) | [🐛 Report Bug](https://github.com/ccalde29/CHAIT-world/issues) | [💡 Request Feature](https://github.com/ccalde29/CHAIT-world/issues)

</div>