# CHAIT World - UI Restructure & Admin System Implementation Plan

## Overview
Simplified UI restructure: Convert center panel to switch between Chat/Community/Management views, plus admin moderation system.

---

## Current State Analysis

### Current UI Structure
**File:** `/frontend/src/components/MainApp.js`

**Layout:**
- Sidebar (left) - Navigation with "Characters & Scenes" button
- Center panel - Chat interface
- **Modals/Popups:**
  - Character & Scene Hub (modal overlay) - triggered by sidebar button
  - Community Hub (modal overlay) - triggered by top button
  - Settings (modal)
  - Persona Manager (modal)
  - Character Editor (modal)
  - Scene Editor (modal)

**What's Changing:**
1. Remove "Characters & Scenes" button from sidebar
2. Add top navigation buttons (like Community Hub button)
3. Center panel switches between: Chat | Community Hub | Management Hub
4. Everything else stays the same (Settings, Persona Manager remain as modals)

### Current Database Structure
**Admin System:** None
- No `is_admin` field in users
- No admin role system
- Moderation tables exist but unused (`character_reports`, `moderation_queue`)

---

## Target State

### New UI Structure

**Single-Panel Center Focus:**
```
┌─────────────────────────────────────────┐
│  [Sidebar]  │  [Center Panel]           │
│             │                            │
│  • Chat     │  Displays ONE of:          │
│  • Community│  ─────────────────────     │
│  • Manage   │  • Chat Interface          │
│  • Personas │  • Community Hub           │
│  • Settings │  • Management Hub (NEW)    │
│  • [Admin]  │  • Persona Manager         │
│             │  • Settings                │
│             │  • Moderation (ADMIN ONLY) │
└─────────────────────────────────────────┘
```

**Views (Panels):**
1. **Chat** - Active chat interface (existing)
2. **Community Hub** - Browse/import community content (existing, no longer modal)
3. **Management Hub** - Manage own characters & scenes (NEW full panel)
4. **Persona Manager** - User persona management (existing, no longer modal)
5. **Settings** - User settings (existing, no longer modal)
6. **Moderation** - Admin moderation dashboard (NEW, admin-only)

**Navigation:**
- Sidebar buttons switch between views
- No modals/popups (except small confirmations/alerts)
- Back button or breadcrumb to return to chat
- Mobile-friendly single-panel layout

---

## Implementation Plan

### Phase 1: Database - Admin System
**Priority:** Foundation for admin features

#### 1.1 Add `is_admin` Field to User Settings
**File:** Supabase migration (new)

**Changes:**
```sql
-- Add is_admin column to user_settings table
ALTER TABLE user_settings
ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Create index for admin queries
CREATE INDEX idx_user_settings_admin
ON user_settings(is_admin)
WHERE is_admin = true;

-- RLS Policy: Only admins can see admin field
CREATE POLICY "Admins can view admin status"
ON user_settings
FOR SELECT
USING (auth.uid() = user_id OR is_admin = true);
```

**Manual Admin Setup:**
- Manually set specific user(s) to `is_admin = true` in Supabase dashboard
- Document admin user setup process in README

#### 1.2 Update Backend Services
**Files:**
- `/backend/services/UserSettingsService.js`

**Changes:**
- Include `is_admin` field in user settings responses
- Add method: `async isUserAdmin(userId)`

---

### Phase 2: Backend - Admin & Moderation API

#### 2.1 Admin Middleware
**File:** `/backend/middleware/adminAuth.js` (NEW)

```javascript
// Middleware to verify admin status
async function requireAdmin(req, res, next) {
  const userId = req.headers['user-id'];
  const isAdmin = await userSettingsService.isUserAdmin(userId);

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.isAdmin = true;
  next();
}
```

#### 2.2 Moderation Routes
**File:** `/backend/routes/moderation.js` (NEW)

**Endpoints:**
```javascript
// Get moderation queue (pending characters)
GET /api/moderation/queue
  - Returns characters with moderation_status='pending'
  - Uses moderation_queue view

// Get all reports
GET /api/moderation/reports
  - Query params: ?status=pending|reviewed|dismissed
  - Returns character_reports with character details

// Get reports for specific character
GET /api/moderation/reports/character/:characterId
  - Returns all reports for a character

// Review a report
PUT /api/moderation/reports/:reportId
  - Body: { status, action_taken }
  - Updates reviewed_at, reviewed_by, action_taken

// Approve character
POST /api/moderation/characters/:characterId/approve
  - Sets moderation_status='approved'

// Reject character
POST /api/moderation/characters/:characterId/reject
  - Sets moderation_status='rejected'
  - Optionally unpublish from community

// Ban/remove character from community
DELETE /api/moderation/characters/:characterId/ban
  - Removes from community_characters
  - Sets moderation_status='rejected'
  - Logs action

// Get moderation stats
GET /api/moderation/stats
  - Returns: total_reports, pending_reports, pending_characters
```

#### 2.3 Community Routes Updates
**File:** `/backend/routes/community.js`

**Add Filter for Approved Only:**
```javascript
// Update GET /api/community/characters
// Only show characters with moderation_status='approved'
.eq('moderation_status', 'approved')
```

#### 2.4 Update Publishing Workflow
**File:** `/backend/services/communityService.js`

**Add Auto-Approve Toggle:**
```javascript
// Check admin settings for auto_approve_characters flag
const adminSettings = await getAdminSettings();

const moderationStatus = adminSettings?.auto_approve_characters
  ? 'approved'  // Auto-approve enabled: publish immediately
  : 'pending';  // Moderation enabled: requires admin approval

// Insert into community_characters with dynamic status
await supabase
  .from('community_characters')
  .insert({
    ...characterData,
    moderation_status: moderationStatus
  });
```

**Admin Toggle:**
- `auto_approve_characters` boolean in admin settings
- When enabled: all publishes auto-approved (appears immediately)
- When disabled: publishes require admin approval via moderation panel

---

### Phase 3: Frontend - UI Restructure

#### 3.1 View State Management
**File:** `/frontend/src/components/MainApp.js`

**New State:**
```javascript
const [currentView, setCurrentView] = useState('chat');
// Views: 'chat' | 'community' | 'manage' | 'personas' | 'settings' | 'moderation'

const [isAdmin, setIsAdmin] = useState(false);
```

**Load Admin Status:**
```javascript
useEffect(() => {
  // Load user settings and check is_admin flag
  const loadUserSettings = async () => {
    const settings = await fetchUserSettings();
    setIsAdmin(settings.is_admin || false);
  };
  loadUserSettings();
}, [user]);
```

#### 3.2 Top Navigation Bar (NEW)
**File:** `/frontend/src/components/MainApp.js`

**Add Top Nav Bar:**
```jsx
<div className="top-nav-bar">
  <button
    onClick={() => setCurrentView('chat')}
    className={currentView === 'chat' ? 'active' : ''}
  >
    💬 Chat
  </button>
  <button
    onClick={() => setCurrentView('community')}
    className={currentView === 'community' ? 'active' : ''}
  >
    🌐 Community
  </button>
  <button
    onClick={() => setCurrentView('manage')}
    className={currentView === 'manage' ? 'active' : ''}
  >
    🎭 Manage
  </button>

  {isAdmin && (
    <button
      onClick={() => setCurrentView('moderation')}
      className={currentView === 'moderation' ? 'active' : ''}
    >
      🛡️ Moderation
    </button>
  )}
</div>
```

**Sidebar Changes:**
- **REMOVE:** "Characters & Scenes" button
- **KEEP:** Personas button (opens modal)
- **KEEP:** Settings button (opens modal)
- **KEEP:** New Chat, Chat History, etc.

#### 3.3 Center Panel Rendering
**File:** `/frontend/src/components/MainApp.js`

**Add View Switching:**
```jsx
<div className="center-panel">
  {currentView === 'chat' && <ChatInterface />}
  {currentView === 'community' && <CommunityHub fullScreen={true} />}
  {currentView === 'manage' && <ManagementHub />}
  {currentView === 'moderation' && isAdmin && <ModerationPanel />}
</div>

{/* Modals stay as-is */}
{showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
{showPersonaManager && <PersonaManager onClose={() => setShowPersonaManager(false)} />}
```

#### 3.4 Remove Only CharacterSceneHub Modal State
**File:** `/frontend/src/components/MainApp.js`

**Remove:**
```javascript
// Delete this state:
const [showCharacterSceneHub, setShowCharacterSceneHub] = useState(false);
const [showCommunityHub, setShowCommunityHub] = useState(false);

// KEEP these (Settings and Personas remain modals):
const [showSettings, setShowSettings] = useState(false);
const [showPersonaManager, setShowPersonaManager] = useState(false);
```

#### 3.5 Remember Last View
**Add localStorage:**
```javascript
// Save view on change
useEffect(() => {
  localStorage.setItem('lastView', currentView);
}, [currentView]);

// Load on mount
useEffect(() => {
  const lastView = localStorage.getItem('lastView') || 'chat';
  setCurrentView(lastView);
}, []);
```

---

### Phase 4: Frontend - New Components

#### 4.1 Management Hub Component
**File:** `/frontend/src/components/ManagementHub.js` (NEW)

**Purpose:** Full-screen character & scene management (replaces CharacterSceneHub modal)

**Features:**
- Tab navigation: Characters | Scenes
- Grid/list view of characters
- Search, filter, sort
- Create, edit, delete characters
- Create, edit, delete scenes
- Publish/unpublish to community
- Character relationships management
- Scene background uploads
- More space than modal version

**Layout:**
```jsx
<div className="management-hub">
  <header>
    <h1>Manage Characters & Scenes</h1>
    <div className="tabs">
      <button>Characters</button>
      <button>Scenes</button>
    </div>
  </header>

  <div className="toolbar">
    <SearchBar />
    <FilterDropdown />
    <SortDropdown />
    <CreateButton />
  </div>

  <div className="content-grid">
    {/* Character/Scene cards */}
  </div>

  {editingCharacter && <CharacterEditor />}
  {editingScene && <SceneEditor />}
</div>
```

**Reuse Existing Components:**
- `<CharacterEditor />` - Keep as-is
- `<SceneEditor />` - Keep as-is
- `<ImageUpload />` - Keep as-is
- Just change how they're displayed (inline vs modal)

#### 4.2 Moderation Panel Component
**File:** `/frontend/src/components/ModerationPanel.js` (NEW)

**Purpose:** Admin moderation dashboard

**Features:**
- Tab navigation: Reports | Pending Characters | Stats
- View all pending reports
- Review reports (approve/dismiss)
- View pending characters awaiting approval
- Approve/reject characters
- Ban/remove characters from community
- Search and filter capabilities

**Layout:**
```jsx
<div className="moderation-panel">
  <header>
    <h1>🛡️ Moderation Dashboard</h1>
    <div className="tabs">
      <button>Reports ({pendingReportsCount})</button>
      <button>Pending Characters ({pendingCount})</button>
      <button>Statistics</button>
    </div>
  </header>

  {activeTab === 'reports' && <ReportsTab />}
  {activeTab === 'pending' && <PendingCharactersTab />}
  {activeTab === 'stats' && <StatsTab />}
</div>
```

**Sub-components:**

**ReportsTab:**
- List of reports with filters (pending/reviewed/dismissed)
- Character preview
- Reporter info
- Report reason & details
- Actions: View Character, Dismiss Report, Take Action

**PendingCharactersTab:**
- List of characters with moderation_status='pending'
- Character preview (name, avatar, personality snippet)
- Publisher info
- Actions: Approve, Reject, View Full Details

**StatsTab:**
- Total reports submitted
- Reports by status
- Total approved/rejected characters
- Moderation activity (reports reviewed per day/week)

#### 4.3 Report Button in Community Hub
**File:** `/frontend/src/components/CommunityHub.js`

**Changes:**
- Add "Report" button to character detail view
- Open report modal (small modal for report form only)
- Submit report via `POST /api/community/characters/:id/report`
- **Reported characters appear in admin moderation panel**

**Report Flow:**
1. User clicks "Report" on character
2. Fills out report form (reason + details)
3. Report saved to `character_reports` table with status='pending'
4. **Character does NOT get unpublished automatically**
5. Report appears in admin Moderation panel
6. Admin reviews report and decides action (dismiss or unpublish)

**Report Modal:**
```jsx
<ReportModal>
  <h2>Report Character</h2>
  <select name="reason">
    <option>Inappropriate content</option>
    <option>Offensive language</option>
    <option>Spam/duplicate</option>
    <option>Copyright violation</option>
    <option>Misleading/inaccurate</option>
    <option>Other</option>
  </select>
  <textarea name="details" placeholder="Additional details (optional)" />
  <button>Submit Report</button>
</ReportModal>
```

#### 4.4 Settings Modal Updates
**File:** `/frontend/src/components/SettingsModal.js`

**Changes:**
- **KEEP as modal** (no rename)
- Add admin-only section (if `isAdmin === true`)

**Admin Settings Section:**
```jsx
{isAdmin && (
  <div className="admin-section">
    <h3>🛡️ Admin Settings</h3>

    <div className="setting-item">
      <label>Auto-Approve Published Characters</label>
      <input
        type="checkbox"
        checked={autoApproveCharacters}
        onChange={(e) => setAutoApproveCharacters(e.target.checked)}
      />
      <p className="help-text">
        When enabled, all published characters appear in Community Hub immediately.
        When disabled, you must manually approve characters via the Moderation panel.
      </p>
    </div>

    <div className="setting-item">
      <label>Global System Prompt Override (Optional)</label>
      <textarea
        value={adminSystemPrompt}
        onChange={(e) => setAdminSystemPrompt(e.target.value)}
        placeholder="Optional system prompt that prepends to all character prompts..."
        rows={10}
      />
      <p className="help-text">
        This prompt will be prepended to all character prompts globally.
        Leave empty to use default character prompts only.
      </p>
    </div>

    <button onClick={saveAdminSettings}>Save Admin Settings</button>
  </div>
)}
```

**Backend Support:**
- Add `admin_system_prompt` field to `user_settings` table
- Add `auto_approve_characters` boolean to `user_settings` table
- Only admins can set these
- Include admin prompt in system prompt building if set

---

### Phase 5: Mobile Optimization

#### 5.1 Responsive Layout
**Files:** MainApp.js CSS

**Changes:**
- Top nav bar already mobile-friendly (horizontal buttons)
- Center panel switches cleanly on mobile
- Existing responsive design mostly works as-is

**Minor CSS Adjustments:**
```css
.top-nav-bar {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  overflow-x: auto; /* Allow scroll on very small screens */
}

.top-nav-bar button {
  padding: 0.5rem 1rem;
  white-space: nowrap;
  min-width: fit-content;
}

/* Mobile: < 768px */
@media (max-width: 768px) {
  .top-nav-bar {
    padding: 0.5rem;
  }
  .top-nav-bar button {
    font-size: 0.875rem;
    padding: 0.4rem 0.8rem;
  }
}
```

**Note:** Mobile optimization is minimal since we're just swapping center panel content, which already works responsively.

---

## File Changes Summary

### New Files
- `/backend/middleware/adminAuth.js` - Admin authentication middleware
- `/backend/routes/moderation.js` - Moderation API endpoints
- `/frontend/src/components/ManagementHub.js` - Character/scene management panel
- `/frontend/src/components/ModerationPanel.js` - Admin moderation dashboard
- `/frontend/src/components/ReportModal.js` - Character report form modal

### Modified Files
- **Database:**
  - New migration: Add `is_admin` to `user_settings`
  - New migration: Add `admin_system_prompt` to `user_settings`
  - New migration: Add `auto_approve_characters` to `user_settings`

- **Backend:**
  - `/backend/services/UserSettingsService.js` - Add admin methods
  - `/backend/services/communityService.js` - Dynamic moderation status based on auto-approve
  - `/backend/routes/community.js` - Filter by approved status only
  - `/backend/routes/group-chat.js` - Include admin system prompt if set
  - `/backend/server-supabase.js` - Register moderation routes

- **Frontend:**
  - `/frontend/src/components/MainApp.js` - Add top nav bar, view switching, remove CharacterSceneHub modal
  - `/frontend/src/components/CommunityHub.js` - Add report button, add fullScreen prop
  - `/frontend/src/components/CharacterSceneHub.js` - Rename to ManagementHub.js, remove modal wrapper
  - `/frontend/src/components/SettingsModal.js` - Add admin settings section (auto-approve toggle, system prompt)
  - `/frontend/src/hooks/useSettings.js` - Add admin settings support

### Renamed Files
- `/frontend/src/components/CharacterSceneHub.js` → `/frontend/src/components/ManagementHub.js`

---

## Implementation Order

### Sprint 1: Database & Backend Foundation (1-2 days)
1. Add `is_admin` field migration
2. Add `admin_system_prompt` field migration
3. Create admin middleware
4. Update UserSettingsService
5. Manually set first admin user in Supabase

### Sprint 2: Moderation Backend (2-3 days)
1. Create moderation routes file
2. Implement all moderation endpoints
3. Update community service for moderation
4. Update publishing workflow (pending vs approved)
5. Test all endpoints with Postman/curl

### Sprint 3: UI Restructure (2-3 days)
1. Add top nav bar to MainApp.js
2. Add view state management (currentView)
3. Add localStorage for last view
4. Remove CharacterSceneHub modal trigger from sidebar
5. Implement center panel view switching
6. Test navigation flow

### Sprint 4: Management Hub (1-2 days)
1. Rename CharacterSceneHub.js to ManagementHub.js
2. Remove modal wrapper code
3. Add fullScreen prop handling
4. Test as inline panel (no other changes needed)
5. Verify CRUD operations work

### Sprint 5: Moderation Panel (2-3 days)
1. Create ModerationPanel component
2. Implement ReportsTab
3. Implement PendingCharactersTab
4. Implement StatsTab
5. Test moderation workflows

### Sprint 6: Settings & Admin Features (1-2 days)
1. Add admin settings section to SettingsModal
2. Implement auto-approve toggle
3. Implement system prompt override
4. Update group-chat to use admin prompt
5. Test admin prompt injection and auto-approve

### Sprint 7: Community Hub Updates (1 day)
1. Add fullScreen prop to CommunityHub
2. Add report button to character details
3. Create ReportModal component
4. Wire up report submission
5. Test reporting flow

### Sprint 8: Mobile Optimization (1 day)
1. Test top nav bar on mobile
2. Verify button sizing for touch targets
3. Test view switching on mobile
4. Minor CSS adjustments if needed
5. Test on various screen sizes

### Sprint 9: Testing & Polish (2-3 days)
1. End-to-end testing all workflows
2. Admin permission testing
3. Auto-approve toggle testing
4. Report → moderation workflow testing
5. Mobile device testing
6. Bug fixes
7. Documentation updates

**Total Estimated Time:** 12-17 days (2.5-3.5 weeks)

---

## Edge Cases & Considerations

### Admin System
- **Question:** What happens if an admin account is compromised?
  - Need manual admin revocation process
  - Document security best practices

- **Question:** Can there be multiple admins?
  - Yes, `is_admin` is boolean per user
  - Can set multiple users to admin status

### Moderation
- **Question:** Pre-moderation or post-moderation?
  - **Pre-moderation:** Characters pending until approved (slower but safer)
  - **Post-moderation:** Auto-approved, reports trigger review (faster but riskier)
  - **Recommendation:** Start with pre-moderation for launch safety

- **Question:** What happens to existing published characters?
  - Migration: Set all existing `community_characters` to `moderation_status='approved'`
  - New publishes start as `pending`

### UI/UX
- **Question:** How to return to chat from other views?
  - Sidebar "Chat" button always visible
  - Or breadcrumb navigation
  - Or ESC key shortcut

- **Question:** Should modals be completely eliminated?
  - Small confirmations/alerts OK (delete confirmations, success messages)
  - Complex forms should be inline panels
  - **Recommendation:** Keep tiny modals for confirmations, eliminate large content modals

### Mobile
- **Question:** Offline support?
  - Not in scope for this phase
  - Consider for future enhancement

---

## Success Metrics

### Functionality
- [ ] Admin users can access moderation panel
- [ ] Non-admin users cannot access admin features
- [ ] All views accessible from sidebar
- [ ] No modal overlays for main content
- [ ] Character/scene management has more space
- [ ] Reports can be submitted by users
- [ ] Admins can review and action reports
- [ ] Admins can approve/reject pending characters
- [ ] Admin system prompt works globally

### UX
- [ ] Single-tap navigation between views
- [ ] Works on mobile devices (< 768px width)
- [ ] Works on tablets (768px - 1024px)
- [ ] Works on desktop (> 1024px)
- [ ] No horizontal scrolling on mobile
- [ ] Touch targets minimum 44px × 44px
- [ ] Fast view transitions (< 200ms)

### Performance
- [ ] View switching feels instant
- [ ] No unnecessary re-renders
- [ ] API calls cached appropriately
- [ ] Images lazy-loaded

---

## Confirmed Requirements (from user)

1. **UI Change Scope:**
   - ✅ Only center panel changes (Chat | Community | Management)
   - ✅ Top nav buttons (like Community Hub button)
   - ✅ Remove "Characters & Scenes" sidebar button
   - ✅ Settings and Personas STAY as modals

2. **Moderation Workflow:**
   - ✅ Admin toggle: `auto_approve_characters`
   - ✅ When ON: Characters publish immediately to community
   - ✅ When OFF: Characters need admin approval via moderation panel

3. **Report Handling:**
   - ✅ Reported characters appear in moderation tab
   - ✅ Admin reviews report and decides to unpublish or dismiss
   - ✅ Reports don't auto-unpublish characters

4. **Admin System:**
   - ✅ `is_admin` flag in user_settings (manually added in Supabase)
   - ✅ Can have multiple admins
   - ✅ Admins see extra "Moderation" button in top nav

5. **Default View:**
   - ✅ Remember last view in localStorage
   - ✅ Load last view on app start

6. **Existing Data:**
   - ✅ No migration needed (database cleared)

7. **Admin Prompt:**
   - ✅ Prepend to all character prompts
   - ✅ Optional (can leave blank)

---

## Risk Assessment

### High Risk
- **UI Restructure Breaking Changes:** Significant refactor of MainApp.js
  - Mitigation: Thorough testing, incremental rollout

- **Admin Security:** Improperly secured admin routes
  - Mitigation: Middleware validation, RLS policies, testing

### Medium Risk
- **Mobile Performance:** Single-panel layout may cause performance issues
  - Mitigation: Code splitting, lazy loading, React.memo

- **Data Migration:** Existing published characters need moderation status
  - Mitigation: SQL migration script with backups

### Low Risk
- **User Confusion:** Changed navigation patterns
  - Mitigation: Clear UI labels, optional onboarding tour

---

## Next Steps

1. **User Feedback:** Review this plan and answer open questions
2. **Prioritization:** Confirm sprint order or adjust based on urgency
3. **Database Changes:** Create and run migrations for admin fields
4. **Set First Admin:** Manually configure first admin user in Supabase
5. **Begin Sprint 1:** Start with backend foundation

---

## Notes

- This plan assumes Google OAuth authentication is already working
- Supabase RLS policies need updates for admin access
- Consider adding audit logging for admin actions (future enhancement)
- May want to add email notifications for reports (future enhancement)
- Consider rate limiting on report submissions to prevent spam

---

**Document Version:** 1.0
**Created:** 2025-12-07
**Status:** Planning Phase
**Ready for Review:** Yes
