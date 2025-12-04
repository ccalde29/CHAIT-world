# Character Learning API Documentation

The Character Learning API provides endpoints for tracking and managing character learning patterns, user interactions, and insights.

## Base URL
All endpoints are prefixed with `/api/learning`

## Authentication
All endpoints require authentication via the `user-id` header.

---

## Endpoints

### 1. Get Character Learning Data
Get all learning data for a specific character.

**GET** `/api/learning/characters/:characterId`

**Response:**
```json
{
  "character_id": "char-123",
  "user_id": "user-456",
  "total_interactions": 42,
  "topics_discussed": [
    {
      "topic": "movies",
      "count": 5,
      "first_discussed": "2025-01-15T10:00:00Z",
      "last_discussed": "2025-01-20T14:30:00Z",
      "context": "Discussed favorite sci-fi films"
    }
  ],
  "emotional_patterns": [
    {
      "emotion": "happy",
      "count": 15,
      "avg_intensity": 0.75,
      "first_observed": "2025-01-15T10:00:00Z",
      "last_observed": "2025-01-20T14:30:00Z"
    }
  ],
  "avg_response_quality": 0.82,
  "learning_insights": [
    {
      "insight": "User prefers detailed explanations",
      "category": "communication_style",
      "confidence": 0.8,
      "discovered_at": "2025-01-18T12:00:00Z"
    }
  ],
  "last_interaction": "2025-01-20T14:30:00Z"
}
```

---

### 2. Record Interaction
Track that an interaction occurred with a character.

**POST** `/api/learning/characters/:characterId/interaction`

**Response:**
```json
{
  "character_id": "char-123",
  "total_interactions": 43,
  "last_interaction": "2025-01-20T15:00:00Z"
}
```

---

### 3. Add Topic Discussed
Record a topic that was discussed in conversation.

**POST** `/api/learning/characters/:characterId/topics`

**Request Body:**
```json
{
  "topic": "technology",
  "context": "Discussed AI and machine learning"
}
```

**Response:**
```json
{
  "character_id": "char-123",
  "topics_discussed": [
    {
      "topic": "technology",
      "count": 1,
      "first_discussed": "2025-01-20T15:00:00Z",
      "last_discussed": "2025-01-20T15:00:00Z",
      "context": "Discussed AI and machine learning"
    }
  ]
}
```

---

### 4. Record Emotional Pattern
Track the user's emotional state during interaction.

**POST** `/api/learning/characters/:characterId/emotions`

**Request Body:**
```json
{
  "emotion": "excited",
  "intensity": 0.8
}
```

**Parameters:**
- `emotion` (string, required): The emotion detected (e.g., "happy", "frustrated", "excited")
- `intensity` (number, optional): Intensity from 0 to 1 (default: 0.5)

**Response:**
```json
{
  "character_id": "char-123",
  "emotional_patterns": [
    {
      "emotion": "excited",
      "count": 1,
      "avg_intensity": 0.8,
      "first_observed": "2025-01-20T15:00:00Z",
      "last_observed": "2025-01-20T15:00:00Z"
    }
  ]
}
```

---

### 5. Add Learning Insight
Store an insight the character has learned about the user.

**POST** `/api/learning/characters/:characterId/insights`

**Request Body:**
```json
{
  "insight": "User prefers concise responses",
  "category": "communication_style"
}
```

**Parameters:**
- `insight` (string, required): The insight learned
- `category` (string, optional): Category of insight (default: "general")

**Response:**
```json
{
  "character_id": "char-123",
  "learning_insights": [
    {
      "insight": "User prefers concise responses",
      "category": "communication_style",
      "confidence": 0.5,
      "discovered_at": "2025-01-20T15:00:00Z"
    }
  ]
}
```

---

### 6. Update Response Quality
Rate the quality of the character's responses.

**POST** `/api/learning/characters/:characterId/quality`

**Request Body:**
```json
{
  "quality": 0.85
}
```

**Parameters:**
- `quality` (number, required): Quality rating from 0 to 1

**Response:**
```json
{
  "character_id": "char-123",
  "avg_response_quality": 0.83
}
```

---

### 7. Get Learning Overview
Get a summary of learning data for all characters.

**GET** `/api/learning/overview`

**Response:**
```json
[
  {
    "character_id": "char-123",
    "total_interactions": 42,
    "avg_response_quality": 0.82,
    "last_interaction": "2025-01-20T14:30:00Z"
  },
  {
    "character_id": "char-456",
    "total_interactions": 28,
    "avg_response_quality": 0.75,
    "last_interaction": "2025-01-19T18:00:00Z"
  }
]
```

---

### 8. Delete Learning Data
Delete all learning data for a specific character.

**DELETE** `/api/learning/characters/:characterId`

**Response:**
```json
{
  "message": "Learning data deleted"
}
```

---

## Use Cases

### 1. Basic Interaction Tracking
Every time a user sends a message to a character:
```javascript
await apiRequest(`/api/learning/characters/${characterId}/interaction`, {
  method: 'POST'
});
```

### 2. Topic Recognition
When the AI detects a new topic in conversation:
```javascript
await apiRequest(`/api/learning/characters/${characterId}/topics`, {
  method: 'POST',
  body: JSON.stringify({
    topic: 'sports',
    context: 'Discussed favorite basketball teams'
  })
});
```

### 3. Emotional State Tracking
When analyzing user sentiment:
```javascript
await apiRequest(`/api/learning/characters/${characterId}/emotions`, {
  method: 'POST',
  body: JSON.stringify({
    emotion: 'happy',
    intensity: 0.7
  })
});
```

### 4. Adaptive Learning
When the character learns something about the user:
```javascript
await apiRequest(`/api/learning/characters/${characterId}/insights`, {
  method: 'POST',
  body: JSON.stringify({
    insight: 'User is a software developer',
    category: 'profession'
  })
});
```

### 5. Quality Feedback
When collecting user feedback on responses:
```javascript
await apiRequest(`/api/learning/characters/${characterId}/quality`, {
  method: 'POST',
  body: JSON.stringify({
    quality: thumbsUp ? 1.0 : 0.0
  })
});
```

---

## Error Responses

All endpoints may return these error responses:

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**400 Bad Request**
```json
{
  "error": "Specific validation error message"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to perform operation"
}
```
