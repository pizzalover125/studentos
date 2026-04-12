# Multi-User Data Isolation via Supabase Postgres

**Date:** 2026-04-12
**Status:** Approved

## Overview

Move all application data from browser `localStorage` to Supabase's hosted Postgres database, with per-user data isolation. Enable open signup so any user can register. All data is scoped to the authenticated user via a `user_id` column on every table.

## Section 1: Architecture

### Signup
Change `create_user: false` → `create_user: true` in `SupabaseAuthClient#send_otp`. Any email address can now self-register.

### Database
- Add `pg` gem. Configure `database.yml` primary database to use Supabase Postgres via `SUPABASE_DB_URL` environment variable.
- Solid Cache and Solid Queue remain on SQLite (separate database entries, unchanged).
- Test environment primary database stays on SQLite. Migrations are compatible with both adapters because `user_id` is stored as `string` (not native Postgres `uuid` type).

### User Identity
`ApplicationController` gains a `current_user_id` helper that decodes the Supabase JWT already validated by `require_auth` and returns the `sub` claim (Supabase user UUID as a string). Because `require_auth` guarantees a valid token before any action runs, this decode will always succeed for authenticated requests.

### Data Flow
```
User action → Stimulus → fetch('/api/...') → Rails API controller
  → scopes query to current_user_id → ActiveRecord → Supabase Postgres
  → JSON response → Stimulus re-renders
```

Stimulus controllers keep all existing UI logic (modals, drag-drop, validation). Only the data layer changes: `readStorage`/`writeStorage` → `fetch`.

## Section 2: Data Schema

Six tables. All have `user_id:string not null` (stores Supabase UUID) and standard Rails timestamps. No foreign key on `user_id` — Supabase user identities live outside the app database. All tables indexed on `user_id`.

### `courses`
Replaces `student_os.classes` localStorage key. "Class" is a Ruby reserved word; "Course" is the model name.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | Rails default PK |
| user_id | string | not null, indexed |
| name | string | not null |
| description | string | |
| position | integer | for drag-to-reorder |
| created_at / updated_at | datetime | |

### `homeworks`

| Column | Type | Notes |
|--------|------|-------|
| id | integer | |
| user_id | string | not null, indexed |
| title | string | not null |
| subject | string | plain string matching course name (no FK) |
| due_date | date | not null |
| estimate_minutes | integer | |
| status | string | not_started / pending / completed |
| created_at / updated_at | datetime | |

### `exams`
Model name "Exam" — "Test" conflicts with the `Test::SessionsController` module in the codebase.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | |
| user_id | string | not null, indexed |
| title | string | not null |
| subject | string | |
| date | date | not null |
| notes | text | |
| created_at / updated_at | datetime | |

### `volunteer_activities`

| Column | Type | Notes |
|--------|------|-------|
| id | integer | |
| user_id | string | not null, indexed |
| organization | string | not null |
| description | string | |
| date | date | not null |
| hours | decimal | precision: 5, scale: 2; not null |
| created_at / updated_at | datetime | |

### `extracurriculars`

| Column | Type | Notes |
|--------|------|-------|
| id | integer | |
| user_id | string | not null, indexed |
| name | string | not null |
| role | string | |
| notes | text | |
| created_at / updated_at | datetime | |

### `extracurricular_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | integer | |
| user_id | string | not null, indexed |
| extracurricular_id | integer | not null, indexed; references extracurriculars.id |
| description | string | |
| date | date | not null |
| hours | decimal | precision: 5, scale: 2; not null |
| created_at / updated_at | datetime | |

`extracurricular_id` references within-app (app-level FK, same user). Cascade destroy on `Extracurricular` model deletes associated logs.

## Section 3: API Design

All endpoints under `/api` namespace. All require authentication (inherited from `ApplicationController`). All queries scoped to `current_user_id`. Responses are JSON.

**Response conventions:**
- Success: `200 OK` with JSON body
- Created: `201 Created` with JSON body
- Validation failure: `422 Unprocessable Entity` with `{ "error": "..." }`
- Not found (or belongs to another user): `404 Not Found`

### Courses
```
GET    /api/courses              → ordered by position asc
POST   /api/courses              → create; new record appended at end (highest position)
PATCH  /api/courses/:id          → update name/description
DELETE /api/courses/:id          → destroy
POST   /api/courses/reorder      → body: { ids: [1,2,3] }; updates positions in order
```

### Homeworks
```
GET    /api/homeworks            → ordered by due_date asc
POST   /api/homeworks            → create
PATCH  /api/homeworks/:id        → update (including status)
DELETE /api/homeworks/:id        → destroy
```

### Exams
```
GET    /api/exams                → ordered by date asc
POST   /api/exams                → create
PATCH  /api/exams/:id            → update
DELETE /api/exams/:id            → destroy
```

### Volunteer Activities
```
GET    /api/volunteer_activities → ordered by date desc
POST   /api/volunteer_activities → create
DELETE /api/volunteer_activities/:id → destroy
```

### Extracurriculars
```
GET    /api/extracurriculars                        → index
POST   /api/extracurriculars                        → create
DELETE /api/extracurriculars/:id                    → destroy (cascades to logs)

GET    /api/extracurriculars/:id/logs               → logs for one activity
POST   /api/extracurriculars/:id/logs               → create log
DELETE /api/extracurriculars/:id/logs/:log_id       → destroy log
```

## Section 4: Frontend Changes

### Shared utility
New file `app/javascript/utils/api.js`:
```js
export function csrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content ?? ''
}
```

Imported by all 5 Stimulus controllers.

### Per-controller changes
All 5 controllers (classes, homework, tests, volunteer, extracurriculars):

1. Remove `readStorage`, `writeStorage`, `storageAvailable` imports from `utils/storage`
2. Remove `storageWarning` target and the `storageAvailable()` check in `connect()`
3. Add `this.items = []` instance variable
4. Replace `connect()` body with a call to `this.load()`
5. Add `async load()` — fetches index endpoint, sets `this.items`, calls `this.render()`
6. Replace all `readStorage(KEY)` calls with `this.items`
7. Replace all `writeStorage(KEY, items)` calls with API mutations (POST/PATCH/DELETE), then update `this.items` and re-render
8. All fetch calls include `X-CSRF-Token: csrfToken()` header
9. On non-2xx response, display error from response body in existing error target

**`classes_controller.js` specifics:**
- Reorder drop: `POST /api/courses/reorder` with `{ ids: [...] }`
- The JS identifier stays `classes` (data-controller="classes"); only the API path and model name change

**`homework_controller.js` and `tests_controller.js` specifics:**
- `populateSubject()` fetches `/api/courses` instead of `readStorage("student_os.classes")`

## Section 5: Testing

### Controller tests
`test/controllers/api/` — one file per API controller:
- Asserts index returns only current user's records
- Asserts create returns new record with correct user_id
- Asserts update/delete on another user's record returns 404

### Model tests
`test/models/` — validates presence of required fields.

### System tests
Existing Capybara system tests updated to exercise the full stack (Stimulus → Rails API → SQLite test DB). The `page.execute_script("localStorage.clear()")` line in `ApplicationSystemTestCase#setup` is removed.

WebMock config unchanged — Supabase auth stubs remain; Rails API calls are localhost (already allowed).

## Files Changed

### New files
- `app/javascript/utils/api.js`
- `app/models/course.rb`
- `app/models/homework.rb`
- `app/models/exam.rb`
- `app/models/volunteer_activity.rb`
- `app/models/extracurricular.rb`
- `app/models/extracurricular_log.rb`
- `app/controllers/api/base_controller.rb`
- `app/controllers/api/courses_controller.rb`
- `app/controllers/api/homeworks_controller.rb`
- `app/controllers/api/exams_controller.rb`
- `app/controllers/api/volunteer_activities_controller.rb`
- `app/controllers/api/extracurriculars_controller.rb`
- `app/controllers/api/extracurricular_logs_controller.rb`
- `db/migrate/YYYYMMDD_create_courses.rb`
- `db/migrate/YYYYMMDD_create_homeworks.rb`
- `db/migrate/YYYYMMDD_create_exams.rb`
- `db/migrate/YYYYMMDD_create_volunteer_activities.rb`
- `db/migrate/YYYYMMDD_create_extracurriculars.rb`
- `db/migrate/YYYYMMDD_create_extracurricular_logs.rb`
- `test/controllers/api/courses_controller_test.rb`
- `test/controllers/api/homeworks_controller_test.rb`
- `test/controllers/api/exams_controller_test.rb`
- `test/controllers/api/volunteer_activities_controller_test.rb`
- `test/controllers/api/extracurriculars_controller_test.rb`
- `test/controllers/api/extracurricular_logs_controller_test.rb`

### Modified files
- `Gemfile` — add `pg`
- `config/database.yml` — primary → Supabase Postgres; test primary stays SQLite
- `app/services/supabase_auth_client.rb` — `create_user: true`
- `app/controllers/application_controller.rb` — add `current_user_id` helper
- `config/routes.rb` — add `/api` namespace routes
- `app/javascript/controllers/classes_controller.js` — localStorage → fetch
- `app/javascript/controllers/homework_controller.js` — localStorage → fetch
- `app/javascript/controllers/tests_controller.js` — localStorage → fetch
- `app/javascript/controllers/volunteer_controller.js` — localStorage → fetch
- `app/javascript/controllers/extracurriculars_controller.js` — localStorage → fetch
- `app/views/classes/index.html.erb` — remove storageWarning target element
- `app/views/homework/index.html.erb` — remove storageWarning target element
- `app/views/tests/index.html.erb` — remove storageWarning target element
- `app/views/volunteer/index.html.erb` — remove storageWarning target element
- `app/views/extracurriculars/index.html.erb` — remove storageWarning target element
- `test/system/` — remove localStorage.clear(), update for server-side data

### New test files
- `test/models/course_test.rb`
- `test/models/homework_test.rb`
- `test/models/exam_test.rb`
- `test/models/volunteer_activity_test.rb`
- `test/models/extracurricular_test.rb`
- `test/models/extracurricular_log_test.rb`
