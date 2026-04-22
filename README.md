# CHAIT World 🌍

> **C**onversational **H**uman-**AI** **T**echnology World

A powerful multi-character AI chat application that enables rich, dynamic conversations with multiple AI personalities simultaneously. Create custom characters, build immersive scenes, and watch as your characters interact with each other and remember your conversations over time.

![Status](https://img.shields.io/badge/app-private-green.svg)
![Release](https://img.shields.io/badge/deployment-web-blue.svg)

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

## 🚀 Overview

This is a private web application intended for hosted deployment. Installation and local setup instructions are intentionally omitted. Use the sections below to understand capabilities, authoring workflows, and architecture.


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
 - **`custom_models`** - Admin-defined custom model presets (OpenRouter model id + custom system prompt + defaults)

### Community Tables

- **`community_characters`** - Published characters available for import (view)
- **`community_scenes`** - Published scenes available for import (view)
- **`character_imports`** - Track who imported which characters
- **`scene_imports`** - Track scene import history
- **`character_comments`** - User comments and ratings on community characters
- **`scene_comments`** - User comments on community scenes

<div align="center">

**Built with ❤️ for creative AI conversations**

[⭐ Star this repo](https://github.com/ccalde29/CHAIT-world) | [🐛 Report Bug](https://github.com/ccalde29/CHAIT-world/issues) | [💡 Request Feature](https://github.com/ccalde29/CHAIT-world/issues)

</div>
