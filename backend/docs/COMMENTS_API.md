# Comments API Documentation

The Comments API provides endpoints for adding, viewing, updating, and deleting comments on published characters and scenes in the Community Hub.

## Base URLs
- Character Comments: `/api/character-comments`
- Scene Comments: `/api/scene-comments`

## Authentication
All endpoints require authentication via the `user-id` header.

---

## Character Comments Endpoints

### 1. Get Character Comments
Get all comments for a specific character.

**GET** `/api/character-comments/:characterId`

**Response:**
```json
[
  {
    "id": "comment-uuid-123",
    "character_id": "char-uuid-456",
    "user_id": "user-uuid-789",
    "comment": "Great character! Very well designed.",
    "created_at": "2025-01-20T15:00:00Z",
    "updated_at": "2025-01-20T15:00:00Z",
    "username": "john_doe",
    "display_name": "John Doe"
  }
]
```

---

### 2. Get Character Comment Count
Get the number of comments for a character.

**GET** `/api/character-comments/:characterId/count`

**Response:**
```json
{
  "count": 42
}
```

---

### 3. Add Character Comment
Add a comment to a published character.

**POST** `/api/character-comments/:characterId`

**Request Body:**
```json
{
  "comment": "This is a great character!"
}
```

**Parameters:**
- `comment` (string, required): Comment text (1-1000 characters)

**Response:**
```json
{
  "id": "comment-uuid-123",
  "character_id": "char-uuid-456",
  "user_id": "user-uuid-789",
  "comment": "This is a great character!",
  "created_at": "2025-01-20T15:00:00Z",
  "updated_at": "2025-01-20T15:00:00Z",
  "username": "john_doe",
  "display_name": "John Doe"
}
```

---

### 4. Update Character Comment
Update your own comment.

**PUT** `/api/character-comments/comment/:commentId`

**Request Body:**
```json
{
  "comment": "Updated comment text"
}
```

**Response:**
```json
{
  "id": "comment-uuid-123",
  "character_id": "char-uuid-456",
  "user_id": "user-uuid-789",
  "comment": "Updated comment text",
  "created_at": "2025-01-20T15:00:00Z",
  "updated_at": "2025-01-20T15:30:00Z",
  "username": "john_doe",
  "display_name": "John Doe"
}
```

---

### 5. Delete Character Comment
Delete your own comment (soft delete).

**DELETE** `/api/character-comments/comment/:commentId`

**Response:**
```json
{
  "message": "Comment deleted successfully"
}
```

---

## Scene Comments Endpoints

### 1. Get Scene Comments
Get all comments for a specific scene.

**GET** `/api/scene-comments/:sceneId`

**Response:**
```json
[
  {
    "id": "comment-uuid-123",
    "scene_id": "scene-uuid-456",
    "user_id": "user-uuid-789",
    "comment": "Amazing scenario! Very immersive.",
    "created_at": "2025-01-20T15:00:00Z",
    "updated_at": "2025-01-20T15:00:00Z",
    "username": "jane_smith",
    "display_name": "Jane Smith"
  }
]
```

---

### 2. Get Scene Comment Count
Get the number of comments for a scene.

**GET** `/api/scene-comments/:sceneId/count`

**Response:**
```json
{
  "count": 28
}
```

---

### 3. Add Scene Comment
Add a comment to a published scene.

**POST** `/api/scene-comments/:sceneId`

**Request Body:**
```json
{
  "comment": "This scenario is fantastic!"
}
```

**Parameters:**
- `comment` (string, required): Comment text (1-1000 characters)

**Response:**
```json
{
  "id": "comment-uuid-123",
  "scene_id": "scene-uuid-456",
  "user_id": "user-uuid-789",
  "comment": "This scenario is fantastic!",
  "created_at": "2025-01-20T15:00:00Z",
  "updated_at": "2025-01-20T15:00:00Z",
  "username": "jane_smith",
  "display_name": "Jane Smith"
}
```

---

### 4. Update Scene Comment
Update your own comment.

**PUT** `/api/scene-comments/comment/:commentId`

**Request Body:**
```json
{
  "comment": "Updated scenario comment"
}
```

**Response:**
```json
{
  "id": "comment-uuid-123",
  "scene_id": "scene-uuid-456",
  "user_id": "user-uuid-789",
  "comment": "Updated scenario comment",
  "created_at": "2025-01-20T15:00:00Z",
  "updated_at": "2025-01-20T15:30:00Z",
  "username": "jane_smith",
  "display_name": "Jane Smith"
}
```

---

### 5. Delete Scene Comment
Delete your own comment (soft delete).

**DELETE** `/api/scene-comments/comment/:commentId`

**Response:**
```json
{
  "message": "Comment deleted successfully"
}
```

---

## Use Cases

### 1. Display Comments on Character Page
```javascript
// Fetch comments
const comments = await apiRequest(`/api/character-comments/${characterId}`);

// Fetch comment count
const { count } = await apiRequest(`/api/character-comments/${characterId}/count`);
```

### 2. Add a Comment
```javascript
const newComment = await apiRequest(`/api/character-comments/${characterId}`, {
  method: 'POST',
  body: JSON.stringify({
    comment: userInput
  })
});
```

### 3. Edit Your Own Comment
```javascript
const updated = await apiRequest(`/api/character-comments/comment/${commentId}`, {
  method: 'PUT',
  body: JSON.stringify({
    comment: editedText
  })
});
```

### 4. Delete Your Own Comment
```javascript
await apiRequest(`/api/character-comments/comment/${commentId}`, {
  method: 'DELETE'
});
```

---

## Error Responses

All endpoints may return these error responses:

**400 Bad Request**
```json
{
  "error": "Comment is required"
}
```
```json
{
  "error": "Comment must be 1000 characters or less"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "error": "Cannot comment on unpublished characters"
}
```
```json
{
  "error": "Cannot comment on unpublished scenes"
}
```

**404 Not Found**
```json
{
  "error": "Character not found"
}
```
```json
{
  "error": "Scene not found"
}
```
```json
{
  "error": "Comment not found or you do not have permission to edit it"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to get comments"
}
```

---

## Notes

- Comments are soft-deleted (marked with `is_deleted = true` flag)
- Only comment owners can edit or delete their comments
- Comments can only be added to published characters/scenes
- Comment text is trimmed of leading/trailing whitespace
- Maximum comment length: 1000 characters
- Minimum comment length: 1 character (non-empty after trimming)
