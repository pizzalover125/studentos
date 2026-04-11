# Student OS — Design Spec
**Date:** 2026-04-11

## Overview

Student OS is a minimalist, browser-local productivity app for high school students. It lets students independently track homework, tests, volunteer hours, and extracurricular activities. No authentication, no backend database, no cross-device sync in this version — all data is stored in the browser's localStorage. Authentication and server-side persistence are deferred to a future phase.

---

## Architecture

**Stack:** Rails 8 (Hotwire — Turbo + Stimulus). No Active Record models or database in this version.

Rails controllers are thin: they render views only. All data logic lives in Stimulus controllers in the browser.

**Routes:**
```
GET /                  → dashboard#index  (main shell + default to homework section)
GET /homework          → renders homework Turbo Frame
GET /tests             → renders tests Turbo Frame
GET /volunteer         → renders volunteer Turbo Frame
GET /extracurriculars  → renders extracurriculars Turbo Frame
```

**Key Rails components:**
- `DashboardController#index` — renders the app shell
- One controller + view per section (HomeworkController, TestsController, VolunteerController, ExtracurricularsController)
- One Stimulus controller per section managing its localStorage namespace

---

## Data Model (localStorage)

All data is stored as JSON arrays under namespaced localStorage keys. IDs are timestamp-based strings (`Date.now().toString()`).

```
localStorage["student_os.homework"] = [
  { id, title, subject, due_date, status: "pending" | "done" }
]

localStorage["student_os.tests"] = [
  { id, title, subject, date, notes, status: "upcoming" | "done" }
]

localStorage["student_os.volunteer"] = [
  { id, organization, description, date, hours }
]

localStorage["student_os.extracurriculars"] = [
  { id, name, role, notes }
]

localStorage["student_os.extracurricular_logs"] = [
  { id, extracurricular_id, description, date, hours }
]
```

**Notes:**
- The `student_os.` prefix namespaces all keys to avoid collisions with other apps on the same origin.
- All field values are strings.
- No cross-collection relationships except `extracurricular_logs.extracurricular_id → extracurriculars.id`.
- Deleting an extracurricular cascades: all associated logs are removed from `extracurricular_logs` in the same Stimulus action.

---

## UI/UX Structure

**Layout:** Single-page shell with a persistent left sidebar and a main content area. Sidebar navigation links swap the active Turbo Frame.

```
┌─────────────────────────────────────────┐
│  Student OS                             │
│ ─────────────────────────────────────── │
│  Homework           │                   │
│  Tests              │  [Active Section] │
│  Volunteer          │                   │
│  Extracurriculars   │                   │
└─────────────────────────────────────────┘
```

**Per-section UX pattern (consistent across all four sections):**
- Header with section title and an "Add" button
- Clean list of entries (card or row style)
- Inline add form that appears when "Add" is clicked — no modal, no page navigation
- Each entry has a delete button
- Homework and tests additionally have a "mark done" toggle
- Empty state with a short prompt (e.g., "No homework yet. Add your first assignment.")

**Extracurriculars — two-level UX:**
- List view: shows all extracurriculars (name, role). Each row has a delete button and a clickable name.
- Detail view: clicking an extracurricular swaps the content within the extracurriculars Turbo Frame to show its hour logs (date, description, hours) and an "Add Log" button. This is a Stimulus-controlled state swap — no URL change or server request. A back link returns to the list view.
- Deleting an extracurricular from the list view also removes all its logs.

**Design tokens:**
- Background: off-white (`#f9f9f7`)
- Text: near-black (`#1a1a1a`)
- Borders: subtle light gray
- Accent: indigo (`#4f46e5`) for buttons and active states
- Font: Inter or system-ui
- Generous whitespace, no heavy UI framework — vanilla CSS

---

## Error Handling & Edge Cases

- **localStorage unavailable** (private browsing, quota exceeded): Stimulus controllers check availability on load. If unavailable, a top-of-page banner is shown: "Storage unavailable — your data won't be saved."
- **Corrupt/unparseable data**: If JSON parsing fails for any key, the controller resets that key to an empty array rather than crashing.
- **Cascading delete**: Deleting an extracurricular removes all associated `extracurricular_logs` entries atomically within the same Stimulus action.
- **Required field validation**: Add forms validate that required fields (title, name, date, hours, etc.) are non-empty before writing to localStorage. Inline error messages shown without page reload.

---

## Testing

- **System tests (Capybara + Selenium):** Cover the golden path for each section — adding an entry, marking done or deleting it, and the extracurricular drill-down (create activity → add log → delete activity). These run against a real browser, exercising actual localStorage behavior.
- **Stimulus unit tests (Jest, optional):** Test localStorage read/write/delete logic in isolation if controllers grow complex. Not required for the initial version.
- **No model/controller unit tests:** Rails controllers have no logic. Skipping empty test boilerplate.

---

## Future Considerations (Out of Scope for v1)

- User authentication (Devise or Rails built-in)
- Server-side database persistence (PostgreSQL via Active Record)
- Cross-device sync
- GPA tracker, college deadlines, calendar view
- Export/import of data
