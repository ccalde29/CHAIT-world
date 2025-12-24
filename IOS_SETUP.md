# CHAIT World - iOS Setup Guide

## Prerequisites
- macOS with Xcode 15+ installed
- iOS 13.0+ target device/simulator
- CocoaPods installed (`sudo gem install cocoapods`)

## Initial Setup (Already Done)
✅ Capacitor installed
✅ iOS platform added
✅ SQLite plugin configured
✅ UnifiedApiClient created (routes between web API and mobile database)

## Building for iOS

### 1. Build the React App
```bash
cd frontend
npm run build
```

### 2. Sync with iOS Project
```bash
npx cap sync ios
```

### 3. Open in Xcode
```bash
npx cap open ios
```

### 4. Configure in Xcode
1. Select the `App` target
2. Go to **Signing & Capabilities**
3. Select your **Team** (Apple Developer Account)
4. Update **Bundle Identifier** if needed: `com.chaitworld.app`

### 5. Run on Device/Simulator
- Select target device from dropdown (iPhone/Simulator)
- Click ▶️ Run button

## Architecture

### Dual-Mode Operation

**Web Mode** (Desktop Browser):
- Frontend → Backend API (Node.js/Express) → SQLite
- Full feature set including community features

**Native Mode** (iOS App):
- Frontend → UnifiedApiClient → MobileDatabaseService → Capacitor SQLite
- Local-only, no backend needed
- Perfect for offline use

### Key Files

- `src/utils/unifiedApiClient.js` - Routes requests to web API or mobile DB
- `src/services/MobileDatabaseService.js` - SQLite operations via Capacitor
- `src/utils/platform.js` - Platform detection utilities

## Current Status

### ✅ Implemented
- Platform detection
- Mobile database service foundation
- Basic CRUD operations (characters, scenarios, chat sessions)
- Settings management

### 🚧 To Be Implemented
1. **Chat Logic** - AI API calls need HTTP plugin
2. **Memory System** - Full CRUD for memories/relationships
3. **Image Storage** - Use Capacitor Filesystem
4. **Persona Management** - Complete persona endpoints
5. **Export/Import** - Share data between devices

### 📝 Next Steps

#### Step 1: Test Basic Functionality
```bash
npm run build
npx cap sync ios
npx cap open ios
```
Test character creation/editing in simulator.

#### Step 2: Implement AI API Calls
Need to add HTTP plugin for calling OpenAI/Anthropic:
```bash
npm install @capacitor/http
```

Then update chat logic to use Capacitor HTTP instead of fetch.

#### Step 3: Implement Remaining Endpoints
Expand `unifiedApiClient.js` to handle:
- Complete chat session management
- Memory operations
- Persona CRUD
- Relationship management

#### Step 4: File Storage
For character images and avatars:
```typescript
import { Filesystem } from '@capacitor/filesystem';
```

#### Step 5: App Store Preparation
- Add app icons
- Configure splash screen
- Set up privacy permissions (if needed)
- Test on physical device

## Testing

### Simulator Testing
```bash
npx cap run ios
```

### Device Testing
1. Connect iPhone via USB
2. Trust computer on device
3. Select device in Xcode
4. Run

### Debugging
- Use Safari Developer Tools → Develop → [Your Device] → CHAIT World
- View console logs
- Inspect storage

## Known Issues

1. **Community Features** - Not available in native mode (by design)
2. **Supabase Auth** - May need native OAuth flow for sign-in
3. **File Uploads** - Need to implement Capacitor Filesystem for images

## Performance Notes

- SQLite on iOS is very fast
- No network latency for local operations
- AI API calls will be only network operation

## Distribution

### TestFlight (Beta)
1. Archive app in Xcode
2. Upload to App Store Connect
3. Configure TestFlight
4. Invite beta testers

### App Store
1. Create app listing in App Store Connect
2. Add screenshots, description
3. Submit for review
4. Release when approved

## Troubleshooting

### "Module not found" errors
```bash
cd frontend
npm install
npx cap sync ios
```

### SQLite errors
Check MobileDatabaseService schema matches backend schema.

### Build errors in Xcode
Clean build folder: Product → Clean Build Folder

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor SQLite Plugin](https://github.com/capacitor-community/sqlite)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
