# QuizArena Progress API Contract

## 1. GET /api/progress
Fetches the authenticated user's progress and historical attempts.

**Headers:**
- `Cookie: auth_token=JWT`
- `x-csrf-token: TOKEN`

**Response (200 OK):**
```json
{
  "progress": {
    "recommended_level": 3,
    "highest_unlocked_level": 4,
    "updated_at": "2026-08-24T10:00:00.000Z"
  },
  "attempts": [
    {
      "client_attempt_id": "uuid",
      "attempt_type": "diagnostic",
      "level_id": null,
      "accuracy": 85,
      "passed": true,
      "completed_at": "2026-08-24T09:00:00.000Z"
    }
  ],
  "serverTime": "2026-08-24T10:05:00.000Z"
}
```

## 2. POST /api/progress/sync
Syncs completed quiz attempts from the offline-first queue to the backend.

**Headers:**
- `Cookie: auth_token=JWT`
- `x-csrf-token: TOKEN`
- `Content-Type: application/json`

**Rate Limit:** 10 requests per minute per IP.

**Payload:**
```json
{
  "clientSyncId": "uuid-for-request",
  "attempts": [
    {
      "client_attempt_id": "uuid-for-attempt",
      "attempt_type": "timed_quiz",
      "level_id": 1,
      "started_at": "2026-08-24T09:00:00.000Z",
      "completed_at": "2026-08-24T09:05:00.000Z",
      "total_questions": 15,
      "correct_count": 10,
      "incorrect_count": 5,
      "unanswered_count": 0,
      "accuracy": 66,
      "average_answer_time": 15.5,
      "passed": false,
      "answers": [
        {
          "question_id": "1",
          "topic": "Grammar",
          "selected_option_id": 2,
          "correct_option_id": 2,
          "is_correct": true,
          "time_spent": 12.0
        }
      ],
      "diagnostic_result": null
    }
  ]
}
```

**Conflict Policy:**
- `client_attempt_id` is authoritative and maps uniquely to `user_id`.
- Duplicate `client_attempt_id` are caught via `UNIQUE(user_id, client_attempt_id)`.
- If an attempt is duplicated, it is treated as safely already processed, skipped in DB, and returned in the `accepted` array so the client drops it.
- **Partial Success:** Invalid attempts are rejected individually (`rejected` array) while valid ones in the batch are committed (`accepted` array). 

**Response (200 OK):**
```json
{
  "status": "ok",
  "accepted": ["uuid-for-attempt"],
  "rejected": [
    {
      "client_attempt_id": "invalid-uuid",
      "reason": "Invalid correct_count"
    }
  ],
  "serverTime": "2026-08-24T10:15:00.000Z"
}
```

**Errors:**
- `400 Bad Request`: Invalid payload schema or extra fields.
- `401 Unauthorized`: Missing or invalid token.
- `403 Forbidden`: CSRF token invalid.
- `413 Payload Too Large`: More than 25 attempts in one batch.
- `429 Too Many Requests`: Rate limit exceeded.
