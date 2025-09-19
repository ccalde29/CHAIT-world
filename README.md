# 🤖 CHAIT World

**Create AI characters and have immersive group conversations**

CHAIT World is a dynamic web application that lets you create AI chatbots with distinct personalities and have group conversations with them in various scenarios. Think of it as a virtual world where you can interact with multiple AI characters simultaneously, each with their own unique voice and perspective.

![CHAIT World Demo](https://via.placeholder.com/800x400/8b5cf6/ffffff?text=CHAIT+World+Demo)

## ✨ Features

- 🎭 **Multi-Character AI Conversations** - Chat with multiple AI personalities simultaneously
- 🎨 **Custom Character Creation** - Design characters with unique personalities, avatars, and colors
- 🌍 **Immersive Scenarios** - Coffee shops, study groups, parties, and custom locations
- 🔄 **Dynamic Group Interactions** - Natural flow, round-robin, or all-respond conversation modes
- 🔐 **Secure Authentication** - Google OAuth with encrypted API key storage
- ⚡ **Multiple AI Providers** - OpenAI, Anthropic Claude, and local Ollama models
- 💾 **Persistent Data** - Characters, settings, and conversations saved to database

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Google Cloud Console (for OAuth)
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
   - Create a new Supabase project
   - Run the SQL schema from `docs/database-schema.sql`
   - Configure Google OAuth in Supabase dashboard

4. **Configure environment variables**
   ```bash
   # Backend (.env)
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ENCRYPTION_KEY=your_32_byte_encryption_key
   
   # Frontend (.env)
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   ```

5. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │───▶│ Express Backend │───▶│ Supabase DB     │
│                 │    │                 │    │                 │
│ • Authentication│    │ • API Routes    │    │ • User Data     │
│ • Character UI  │    │ • AI Integration│    │ • Characters    │
│ • Chat Interface│    │ • Group Logic   │    │ • Settings      │
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

## 🎭 Character Creation

Create characters with:
- **Unique personalities** - Define how they think and respond
- **Visual identity** - Choose avatars, colors, and themes
- **Response styles** - Playful, contemplative, witty, or chill
- **Conversation preferences** - How they interact in groups

## 🌍 Scenarios & Locations

Built-in scenarios:
- ☕ **Coffee Shop Hangout** - Casual afternoon conversations
- 📚 **Study Session** - Collaborative learning environment
- 🎉 **House Party** - Energetic social gathering

Create custom scenarios with:
- Detailed descriptions and atmospheres
- Context that influences character behavior
- Immersive environments for roleplay

## 🔧 Configuration

### AI Provider Setup

**OpenAI (Recommended)**
```bash
1. Get API key from https://platform.openai.com/api-keys
2. Add to settings in the app (encrypted storage)
3. Uses GPT-3.5-turbo for character responses
```

**Anthropic Claude**
```bash
1. Get API key from https://console.anthropic.com/
2. Configure in app settings
3. Uses Claude-3-Haiku for responses
```

**Ollama (Local)**
```bash
1. Install Ollama: https://ollama.ai/
2. Pull a model: ollama pull llama2
3. Configure local URL in settings
```

## 🛠️ Development

### Project Structure
```
chait-world/
├── backend/                 # Express.js server
│   ├── services/           # Database and AI services
│   ├── server-supabase.js  # Main server file
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Auth and state management
│   │   └── lib/           # Supabase client
│   └── package.json
└── docs/                   # Documentation
```

### Available Scripts

**Backend:**
- `npm run dev` - Development server with hot reload
- `npm start` - Production server
- `npm test` - Run tests

**Frontend:**
- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Run tests

## 🚀 Deployment

### Heroku Deployment
```bash
# Deploy backend
heroku create your-app-name-api
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_key
git subtree push --prefix backend heroku main

# Deploy frontend to Vercel
cd frontend
vercel --prod
```

### Environment Variables
See `.env.example` files for complete configuration options.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 Roadmap

- [ ] **Voice Synthesis** - Character voices for responses
- [ ] **Memory System** - Characters remember past conversations
- [ ] **Advanced Group Dynamics** - Interruptions, reactions, emotions
- [ ] **Mobile App** - React Native version
- [ ] **Character Marketplace** - Share and discover characters
- [ ] **Discord Integration** - Use CHAIT characters in Discord servers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude
- Ollama for local AI capabilities
- Supabase for backend infrastructure
- React and Express.js communities

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/YOUR_USERNAME/chait-world/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/YOUR_USERNAME/chait-world/discussions)
- 📧 **Contact**: your-email@example.com

---

**Made with ❤️ for the AI community**
