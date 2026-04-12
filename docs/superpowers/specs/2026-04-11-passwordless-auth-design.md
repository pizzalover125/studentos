# Passwordless Auth — Design Spec
_Date: 2026-04-11_

## Overview

Add passwordless authentication to Student OS. Single user. Supabase Auth as identity provider. Rails verifies JWT locally. Auth state stored in encrypted Rails cookie session. No database tables required.

## Environment Variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Base URL of Supabase project |
| `SUPABASE_ANON_KEY` | Public anon key for Auth API calls |
| `SUPABASE_JWT_SECRET` | Used to verify JWT signature locally |

## New Components

### `SupabaseAuthClient` (PORO — `app/services/supabase_auth_client.rb`)

Wraps `Net::HTTP` calls to Supabase Auth REST API. Raises `SupabaseAuthClient::Error` on any API or network failure.

Methods:
- `send_otp(email)` → `POST /auth/v1/otp` — triggers Supabase to email OTP + magic link
- `verify_otp(email:, token:)` → `POST /auth/v1/verify` with `{type: "email", email:, token:}` — returns `access_token`
- `verify_token_hash(token_hash:)` → `POST /auth/v1/verify` with `{type: "email", token_hash:}` — returns `access_token` (used by magic link callback)

### `SessionsController` (`app/controllers/sessions_controller.rb`)

| Action | Route | Description |
|---|---|---|
| `new` | `GET /login` | Renders email form |
| `create` | `POST /login` | Calls `send_otp`, redirects to OTP entry page |
| `new_otp` | `GET /login/otp` | Renders 6-digit OTP entry form |
| `verify_otp` | `POST /login/verify_otp` | Calls `verify_otp`, sets session, redirects to root |
| `destroy` | `DELETE /session` | Clears session, redirects to `/login` |

### `AuthCallbackController` (`app/controllers/auth_callback_controller.rb`)

| Action | Route | Description |
|---|---|---|
| `show` | `GET /auth/callback` | Handles magic link redirect from Supabase |

Reads `token_hash` and `type` from params. Calls `verify_token_hash`. On success: set session, redirect to root. On failure: redirect to `/login` with flash error.

### `ApplicationController` changes

- `before_action :require_auth` protecting all actions
- `require_auth` — checks session for `supabase_access_token`, decodes JWT locally using `SUPABASE_JWT_SECRET`, checks expiry. If absent or expired: clears session, redirects to `/login`.
- `authenticated?` helper available to views.

## Auth Flows

### OTP Flow

```
User → GET /login → email form
     → POST /login → SupabaseAuthClient#send_otp → Supabase emails OTP+magic link
     → GET /login/otp → OTP entry form
     → POST /login/verify_otp → SupabaseAuthClient#verify_otp → access_token
     → verify JWT locally → store in session[:supabase_access_token]
     → redirect to /
```

### Magic Link Flow

```
User clicks email link → GET /auth/callback?token_hash=...&type=email
     → AuthCallbackController#show → SupabaseAuthClient#verify_token_hash → access_token
     → verify JWT locally → store in session[:supabase_access_token]
     → redirect to /
```

### Request Gating

```
Any request → ApplicationController#require_auth
  → session[:supabase_access_token] present?
      No  → reset_session → redirect /login
      Yes → decode JWT, check exp
              Expired → reset_session → redirect /login
              Valid   → proceed
```

## JWT Verification

Decode JWT using `SUPABASE_JWT_SECRET` (HS256). Check `exp` claim. No round-trip to Supabase on each request. Use the `jwt` gem.

## Session

Rails encrypted cookie session. Stores:
- `supabase_access_token` — JWT from Supabase
- `pending_otp_email` — email address carried from POST /login to POST /login/verify_otp (cleared after verify)

No server-side session store needed (cookie only).

## Routes

```ruby
get  "/login",             to: "sessions#new"
post "/login",             to: "sessions#create"
get  "/login/otp",         to: "sessions#new_otp"
post "/login/verify_otp",  to: "sessions#verify_otp"
delete "/session",         to: "sessions#destroy"
get  "/auth/callback",     to: "auth_callback#show"
```

## Error Handling

| Scenario | Behaviour |
|---|---|
| Invalid OTP | Supabase 4xx → flash error, re-render OTP form |
| Expired OTP | Same as invalid, prompt user to request new code |
| Magic link reuse | Supabase rejects → redirect `/login` with flash |
| Supabase network failure | `SupabaseAuthClient::Error` raised → rescued in controller → flash + redirect `/login` |
| JWT expired in session | `require_auth` clears session, redirects `/login` |

## Testing

- **Unit:** `SupabaseAuthClient` with stubbed HTTP (WebMock)
- **Controller:** `SessionsController` — form renders, OTP verify sets session, bad token re-renders form; `AuthCallbackController` — valid token_hash → session + redirect, invalid → `/login`
- **Integration:** `require_auth` — unauthenticated request redirects to `/login`
- **System:** Full OTP flow end-to-end with Supabase stubbed via WebMock

## Out of Scope

- Multi-user / registration
- SMS delivery
- Session refresh (Supabase refresh tokens) — JWT expiry treated as full logout
- Remember-me / persistent sessions
