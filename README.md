# 🤖 CHAIT World

**Create AI characters and have immersive group conversations**

CHAIT World is a dynamic web application that lets you create AI chatbots with distinct personalities and have group conversations with them in various scenarios. Characters learn from your interactions, build relationships with you over time, and interact with each other naturally.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-18%2B-brightgreen)

---

## ✨ Features

### Core Features
- 🎭 **Multi-Character AI Conversations** - Chat with multiple AI personalities simultaneously
- 🧠 **Character Memory System** - Characters remember your conversations and learn about you
- 💞 **Relationship Tracking** - Characters build relationships with you based on your interactions
- 🗣️ **Character-to-Character Interactions** - AI characters acknowledge and respond to each other
- 📜 **Chat History** - All conversations are saved and can be resumed later

### Customization
- 🎨 **Custom Character Creation** - Design characters with unique personalities, avatars, and colors
- 🌍 **Custom Scenarios** - Create immersive locations with custom backgrounds
- 👤 **User Persona** - Define your own personality to influence how characters interact with you
- 🖼️ **Image Uploads** - Custom avatars for characters and backgrounds for scenes

### Technical
- 🔐 **Secure Authentication** - Google OAuth with encrypted API key storage
- ⚡ **Multiple AI Providers** - OpenAI, Anthropic Claude, and local Ollama models
- 💾 **Persistent Data** - PostgreSQL database via Supabase
- 🎯 **Smart Response Patterns** - Natural flow, round-robin, or all-respond modes

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Google Cloud Console account (for OAuth)
- API key from OpenAI, Anthropic, or local Ollama setup

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/chait-world.git
   cd chait-world
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at https://supabase.com
   - Go to Project Settings → Database → Connection String
   - Copy your project URL and keys

4. **Run database migrations**
   
   In Supabase SQL Editor, run:
   ```sql
   -- See docs/database-setup.sql for full schema
   -- Tables: characters, user_settings, user_personas, scenarios,
   --         chat_sessions, messages, character_memories, character_relationships
   ```

5. **Configure Google OAuth**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add your Google Client ID and Secret
   - Add authorized redirect URIs

6. **Set up Storage Bucket**
   - Go to Supabase Dashboard → Storage
   - Create a public bucket named `user-images`
   - Set up storage policies for authenticated users

7. **Configure environment variables**

   **Backend `.env`:**
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ENCRYPTION_KEY=your_32_byte_random_key
   ALLOWED_ORIGINS=http://localhost:3000
   PORT=3001
   ```

   **Frontend `.env`:**
   ```bash
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   REACT_APP_API_URL=http://localhost:3001
   ```

   **Generate encryption key:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

8. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm start
   ```

9. **Open your browser**
   Navigate to `http://localhost:3000`

---

## 🎮 How It Works

### Character Memory System
Characters automatically extract and store memories from conversations:
- **Identity**: Names, ages, locations
- **Preferences**: Likes, dislikes, interests
- **Topics**: Subjects discussed
- **Emotions**: Feelings expressed
- **Activities**: Hobbies, work, goals

Memories are weighted by importance and influence how characters respond to you.

### Relationship Growth
Characters track their relationship with you through:
- **Trust Level**: Grows when you share personal information
- **Familiarity**: Increases with each interaction
- **Emotional Bond**: Based on positive/negative interactions
- **Relationship Type**: Progresses from stranger → acquaintance → friend → close friend

### Character Interactions
Characters are aware of what other AI characters say and can:
- Reference each other's comments
- Agree or disagree with each other
- Build on each other's ideas
- Create natural group dynamics

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │───▶│ Express Backend │───▶│ Supabase DB     │
│                 │    │                 │    │                 │
│ • Auth UI       │    │ • API Routes    │    │ • PostgreSQL    │
│ • Chat Interface│    │ • AI Integration│    │ • Storage       │
│ • Character Mgmt│    │ • Memory System │    │ • Auth          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   AI Providers  │
                       │                 │
                       │ • OpenAI GPT    │
                       │ • Anthropic     │
                       │ • Ollama Local  │
                       └─────────────────┘
```

### Tech Stack
- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth)
- **AI Models**: OpenAI GPT-3.5/4, Anthropic Claude, Ollama
- **Storage**: Supabase Storage

---

## 📖 User Guide

### Creating Characters
1. Click "Create Character" in the sidebar
2. Choose a name, avatar, and color theme
3. Write a detailed personality description
4. Optionally upload a custom avatar image
5. Save and activate the character

**Tips for good characters:**
- Be specific about communication style
- Include interests and background
- Define how they react to different situations
- Make them distinct from each other

### Starting Conversations
1. Select 2-5 characters from the sidebar
2. Choose a scene (coffee shop, study session, party, or custom)
3. Select chat style (Natural Flow, Round Robin, All Respond)
4. Type your message and send

### Building Relationships
- Share personal information to build trust
- Have longer conversations to increase familiarity
- Express emotions to develop emotional bonds
- Return regularly to deepen relationships

### Managing Chat History
- View all past conversations in the left sidebar
- Click a chat to resume it
- Hover over chats to rename or delete them
- Start a new chat with the "New" button

---

## 🔧 Configuration

### AI Provider Setup

**OpenAI**
1. Get API key from https://platform.openai.com/api-keys
2. Add to Settings in the app
3. Uses GPT-3.5-turbo by default

**Anthropic Claude**
1. Get API key from https://console.anthropic.com/
2. Add to Settings
3. Uses Claude-3-Haiku

**Ollama (Local)**
1. Install: https://ollama.ai/
2. Pull a model: `ollama pull llama2`
3. Configure base URL in settings (default: http://localhost:11434)

### User Persona
Define your own personality to influence conversations:
1. Click your avatar → "Create Persona"
2. Add your name, personality, interests
3. Choose communication style
4. Characters will respond based on your persona

---

## 🐛 Troubleshooting

### Chat history is empty
- Check backend logs for database errors
- Verify Supabase connection
- Ensure `chat_sessions` table exists

### Characters not learning
- Share explicit information ("My name is...", "I work as...")
- Check Memory Viewer to see stored memories
- Verify `character_memories` table is accessible

### API errors
- Verify API keys are correctly entered in Settings
- Check API provider balance/quota
- For Ollama, ensure service is running

### Images not uploading
- Verify `user-images` bucket exists in Supabase Storage
- Check bucket is set to public
- Ensure storage policies allow authenticated uploads

---

## 📁 Project Structure

```
chait-world/
├── backend/
│   ├── services/
│   │   └── database.js          # Database operations
│   ├── server-supabase.js        # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MainApp.js        # Main application
│   │   │   ├── ChatHistorySidebar.js
│   │   │   ├── CharacterEditor.js
│   │   │   ├── SceneEditor.js
│   │   │   ├── UserPersonaEditor.js
│   │   │   ├── CharacterMemoryViewer.js
│   │   │   ├── SettingsModal.js
│   │   │   ├── LoginScreen.js
│   │   │   └── ImageUpload.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js    # Authentication
│   │   └── lib/
│   │       └── supabase.js       # Supabase client
│   └── package.json
└── docs/
    └── database-setup.sql         # Database schema
```

---

## 🚀 Deployment

### Backend (Heroku)
```bash
heroku create your-app-name-api
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_key
heroku config:set ENCRYPTION_KEY=your_encryption_key
git subtree push --prefix backend heroku main
```

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
# Set environment variables in Vercel dashboard
```

### Environment Variables for Production
- Set `REACT_APP_API_URL` to your backend URL
- Set `ALLOWED_ORIGINS` to include your frontend URL
- Ensure all Supabase credentials are set
- Generate a new `ENCRYPTION_KEY` for production

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

---

## 📝 Roadmap

### Completed ✅
- Multi-character conversations
- Character memory system
- Relationship tracking
- Character-to-character interactions
- Chat history with persistence
- Custom characters and scenes
- Image uploads
- User personas

### Planned Features
- [ ] Voice synthesis for character responses
- [ ] Advanced memory consolidation
- [ ] Character personality learning from interactions
- [ ] Group chat statistics and analytics
- [ ] Export conversations
- [ ] Mobile app (React Native)
- [ ] Character marketplace
- [ ] Discord bot integration
- [ ] Multi-language support

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude
- Ollama for local AI capabilities
- Supabase for backend infrastructure
- React and Express.js communities
- All contributors and testers

---

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/YOUR_USERNAME/chait-world/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/YOUR_USERNAME/chait-world/discussions)
- 📧 **Contact**: your-email@example.com

---

## ⚠️ Important Notes

### API Costs
- OpenAI and Anthropic charge per token used
- Monitor your usage in their respective dashboards
- Set spending limits to avoid unexpected charges
- Ollama is free but requires local installation

### Privacy
- All conversations are stored in your Supabase database
- API keys are encrypted before storage
- User data is never shared with third parties
- You control your data - export or delete anytime

### Performance
- Optimal with 2-4 active characters
- Maximum 10 characters per conversation
- Chat history loads last 20 sessions
- Memory system stores up to 100 memories per character

---

**Made with ❤️ for the AI community**

*Version 2.0.0 - Now with character learning and memory!*
