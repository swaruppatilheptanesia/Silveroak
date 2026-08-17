# 1. Authentication

## Overview

The auth module handles login, JWT token management with refresh token rotation, logout, and fetching the current user profile. No authentication is required for login and refresh endpoints.

---

## 1.1 Login

```
POST /api/auth/login
```

**Auth Required:** No (public, rate-limited)

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Must be valid email format |
| `password` | string | Yes | Min 1 character |
| `tenant_slug` | string | No | Optional tenant identifier |

```json
{
  "email": "tpoadmin@silveroak.ac.in",
  "password": "Password@123",
  "tenant_slug": "silveroak"
}
```

### Success Response — `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "TPO Admin",
    "email": "tpoadmin@silveroak.ac.in",
    "role": "tpo_admin",
    "tenant_id": "uuid"
  }
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 400 | `VALIDATION_ERROR` | Invalid email format or empty password |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password or inactive account |
| 401 | `TENANT_INACTIVE` | Tenant is deactivated |
| 429 | — | Rate limit exceeded (too many login attempts) |

### Frontend Integration Notes

- Store `token` in memory (not localStorage for security) or a short-lived cookie.
- Store `refresh_token` securely (httpOnly cookie preferred, or secure storage).
- The `token` is a JWT containing `user_id`, `tenant_id`, `role`, `email`, `department`.
- Decode the JWT on the client to get the user role for UI routing (admin dashboard vs student portal).
- Set up an axios/fetch interceptor to attach `Authorization: Bearer <token>` to every request.

### Edge Cases

- If `tenant_slug` is provided but the tenant doesn't exist → `INVALID_CREDENTIALS`
- If the user exists but `is_active = false` → `INVALID_CREDENTIALS`
- Rate limiting applies: too many failed attempts will return `429`

---

## 1.2 Refresh Token

```
POST /api/auth/refresh
```

**Auth Required:** No (public)

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `refresh_token` | string | Yes | Min 1 character |

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Success Response — `200 OK`

```json
{
  "token": "eyJ...(new access token)",
  "refresh_token": "eyJ...(new refresh token)"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 400 | `VALIDATION_ERROR` | Missing refresh_token |
| 401 | `REFRESH_TOKEN_INVALID` | Token not found, already revoked, or expired |
| 401 | `TOKEN_INVALID` | User account has been deactivated |

### Frontend Integration Notes

- **Token Rotation:** Each refresh call returns a NEW refresh token. The old one is immediately revoked. Always update your stored refresh token.
- **Reuse Detection:** If a revoked refresh token is used again, ALL refresh tokens for that user are revoked (security measure). The user must re-login.
- Set up an interceptor that:
  1. On 401 response → call refresh endpoint
  2. On refresh success → retry the original request with the new token
  3. On refresh failure → redirect to login page

### Edge Cases

- Using an already-used refresh token → ALL tokens revoked, user forced to re-login
- Refresh token has its own expiry (separate from access token)
- If user account is deactivated between refreshes → `TOKEN_INVALID`

---

## 1.3 Logout

```
POST /api/auth/logout
```

**Auth Required:** Yes (Bearer token)

### Request Body (optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh_token` | string | No | Specific token to revoke. If omitted, ALL user tokens are revoked. |

```json
{
  "refresh_token": "eyJ..."
}
```

Or empty body `{}` to revoke all sessions.

### Success Response — `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

### Frontend Integration Notes

- Call this on user logout action.
- Send the specific `refresh_token` to revoke only the current session.
- Send empty body to log out from all devices (useful for "log out everywhere" feature).
- Clear local token storage after a successful logout call.

---

## 1.4 Get Current User

```
GET /api/auth/me
```

**Auth Required:** Yes (Bearer token)

### Request Body

None.

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "email": "tpoadmin@silveroak.ac.in",
  "name": "TPO Admin",
  "role": "tpo_admin",
  "phone": "+91-9876543210",
  "department": "Computer Science",
  "designation": "Placement Officer",
  "tenant_id": "uuid",
  "last_login_at": "2026-03-08T10:30:00.000Z",
  "created_at": "2025-01-01T00:00:00.000Z",
  "tenant": {
    "slug": "silveroak",
    "name": "Silver Oak University",
    "short_name": "SOU",
    "logo_url": "https://..."
  }
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 401 | `TOKEN_INVALID` | User not found or token expired |

### Frontend Integration Notes

- Call this on app initialization to verify the token is still valid and get fresh user data.
- Use the `role` field to conditionally render UI components.
- Use `tenant.logo_url` and `tenant.name` for branding.
- Use `last_login_at` to show "Last login" info on the dashboard.

---

## Recommended Auth Flow (Frontend)

```
1. User submits login form
   └─→ POST /api/auth/login
       ├─→ 200: Store tokens, redirect to dashboard
       └─→ 401: Show error message

2. On app load (if tokens exist)
   └─→ GET /api/auth/me
       ├─→ 200: User is authenticated, render app
       └─→ 401: Try refresh flow

3. On any API call returning 401
   └─→ POST /api/auth/refresh
       ├─→ 200: Update tokens, retry original request
       └─→ 401: Clear tokens, redirect to login

4. On logout
   └─→ POST /api/auth/logout
       └─→ Clear tokens, redirect to login
```

## Token Payload (decoded JWT)

```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "role": "tpo_admin",
  "email": "tpoadmin@silveroak.ac.in",
  "department": "Computer Science",
  "iat": 1709884200,
  "exp": 1709887800
}
```

Use this for client-side role checks without an API call.
