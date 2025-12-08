# Content Locking System

The Content Locking system allows creators to hide specific fields of their characters and scenes when publishing to the Community Hub, providing privacy protection while still sharing their creations.

## Overview

When publishing content to the Community Hub, creators can choose to "lock" certain fields. Locked fields will be **completely hidden** (set to `NULL`) when other users import the content.

### Lockable Fields

**For Characters:**
- `personality` - Character personality and background description
- `appearance` - Physical appearance description
- `background` - Additional background information

**For Scenes:**
- `description` - Scene description

**Always Visible Fields:**
- Character: `name`, `avatar`, `tags`, AI settings
- Scene: `name`, `initial_message`, `atmosphere`, `background_image`

## Database Schema

### Characters Table
```sql
ALTER TABLE characters
ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN hidden_fields JSONB DEFAULT '[]'::jsonb;
```

### Scenarios Table
```sql
ALTER TABLE scenarios
ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN hidden_fields JSONB DEFAULT '[]'::jsonb;
```

- `is_locked`: Boolean flag indicating if the content has privacy restrictions
- `hidden_fields`: JSONB array of field names to hide (e.g., `['personality', 'appearance']`)

## How It Works

### 1. Publishing with Locking

When publishing, pass locking options to the API:

```javascript
// Publish character with locked fields
await apiRequest(`/api/characters/${characterId}/publish`, {
  method: 'POST',
  body: JSON.stringify({
    isLocked: true,
    hiddenFields: ['personality', 'appearance']
  })
});

// Publish scene with locked description
await apiRequest(`/api/community/scenes/${sceneId}/publish`, {
  method: 'POST',
  body: JSON.stringify({
    isLocked: true,
    hiddenFields: ['description']
  })
});
```

### 2. Import Behavior

When a user imports locked content:

```javascript
// Original character (published)
{
  id: 'char-123',
  name: 'Alice',
  personality: 'Secret personality...',
  appearance: 'Secret appearance...',
  is_locked: true,
  hidden_fields: ['personality', 'appearance']
}

// Imported character (what the user receives)
{
  id: 'char-new',
  name: 'Alice',
  personality: null,  // HIDDEN
  appearance: null,   // HIDDEN
  is_locked: true,
  hidden_fields: ['personality', 'appearance']
}
```

The imported content will have:
- `NULL` values for all hidden fields
- `is_locked: true` to indicate it's a locked import
- `hidden_fields` array preserved to show which fields were hidden

### 3. Backend Implementation

The import logic automatically handles locking:

```javascript
// From communityService.js
async importCharacter(userId, originalCharacterId) {
  const originalChar = await getCharacter(originalCharacterId);

  // Handle locked content
  const hiddenFields = originalChar.is_locked && originalChar.hidden_fields
    ? originalChar.hidden_fields
    : [];

  const characterData = {
    user_id: userId,
    name: originalChar.name,
    personality: hiddenFields.includes('personality') ? null : originalChar.personality,
    appearance: hiddenFields.includes('appearance') ? null : originalChar.appearance,
    background: hiddenFields.includes('background') ? null : originalChar.background,
    // ... other fields ...
    is_locked: originalChar.is_locked || false,
    hidden_fields: hiddenFields
  };

  // Insert the character
  return await createCharacter(characterData);
}
```

## API Endpoints

### Publish Character
**POST** `/api/characters/:id/publish`

**Request Body:**
```json
{
  "isLocked": true,
  "hiddenFields": ["personality", "appearance", "background"]
}
```

### Publish Scene
**POST** `/api/community/scenes/:id/publish`

**Request Body:**
```json
{
  "isLocked": true,
  "hiddenFields": ["description"]
}
```

### Import Character
**POST** `/api/community/characters/:id/import`

No additional parameters needed. The import automatically respects locking.

### Import Scene
**POST** `/api/community/scenes/:id/import`

No additional parameters needed. The import automatically respects locking.

## Frontend Implementation

### Publishing UI

Add checkboxes to the publish modal:

```jsx
const [lockingOptions, setLockingOptions] = useState({
  isLocked: false,
  hiddenFields: []
});

const handleFieldToggle = (fieldName) => {
  setLockingOptions(prev => ({
    isLocked: true,
    hiddenFields: prev.hiddenFields.includes(fieldName)
      ? prev.hiddenFields.filter(f => f !== fieldName)
      : [...prev.hiddenFields, fieldName]
  }));
};

// In the publish modal:
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-300">Privacy Options</label>
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm text-gray-400">
      <input
        type="checkbox"
        checked={lockingOptions.hiddenFields.includes('personality')}
        onChange={() => handleFieldToggle('personality')}
      />
      Hide personality from importers
    </label>
    <label className="flex items-center gap-2 text-sm text-gray-400">
      <input
        type="checkbox"
        checked={lockingOptions.hiddenFields.includes('appearance')}
        onChange={() => handleFieldToggle('appearance')}
      />
      Hide appearance from importers
    </label>
  </div>
</div>

// Publish with options
await apiRequest(`/api/characters/${characterId}/publish`, {
  method: 'POST',
  body: JSON.stringify(lockingOptions)
});
```

### Displaying Locked Content

Show indicators for locked fields in the Community Hub:

```jsx
{character.is_locked && (
  <div className="flex items-center gap-1 text-xs text-amber-400">
    <Lock size={12} />
    <span>Some fields hidden</span>
  </div>
)}

{/* When viewing details */}
<div>
  <h3>Personality</h3>
  {character.personality ? (
    <p>{character.personality}</p>
  ) : character.hidden_fields?.includes('personality') ? (
    <p className="text-gray-500 italic">Hidden by creator</p>
  ) : (
    <p className="text-gray-500">Not specified</p>
  )}
</div>
```

### Editing Locked Imports

When a user tries to edit a locked imported character, show indicators:

```jsx
{character.is_locked && character.hidden_fields?.includes('personality') && (
  <div className="text-xs text-amber-400 mb-2">
    This field was hidden by the original creator
  </div>
)}
```

## Use Cases

### 1. Protecting Proprietary Character Designs
A creator can share a character's functionality (name, avatar, AI settings) while keeping the detailed personality prompt private.

### 2. Sharing Scene Templates
A creator can share a scene's structure (initial message, atmosphere, background) while hiding the detailed description.

### 3. Community Collaboration
Users can import locked content as a starting point and fill in their own personality/description.

## Security Considerations

1. **No Access to Original Data**: Importers never receive the hidden fields - they're set to `NULL` in the database.

2. **Permanent Locking**: Once content is locked and imported, the importer cannot access the hidden fields even if the original is later unlocked.

3. **Database Enforcement**: The locking is enforced at the database level during import, not just in the UI.

4. **Immutable After Import**: The `is_locked` and `hidden_fields` values are copied to the imported record, preserving the privacy state.

## Testing

### Test Publishing Locked Content
```bash
curl -X POST http://localhost:3001/api/characters/CHAR_ID/publish \
  -H "user-id: USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "isLocked": true,
    "hiddenFields": ["personality", "appearance"]
  }'
```

### Test Importing Locked Content
```bash
curl -X POST http://localhost:3001/api/community/characters/CHAR_ID/import \
  -H "user-id: USER_ID"
```

### Verify Hidden Fields
```sql
-- Check the imported character
SELECT name, personality, appearance, is_locked, hidden_fields
FROM characters
WHERE id = 'IMPORTED_CHAR_ID';

-- Should show NULL for locked fields
```

## Future Enhancements

1. **Partial Visibility**: Allow showing truncated versions of hidden fields (e.g., first 100 characters)
2. **Temporary Unlocking**: Creator can temporarily unlock content for specific users
3. **Field-Level Permissions**: More granular control over who can see what
4. **Analytics**: Track how often locked vs unlocked content is imported
