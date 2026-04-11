# Classes Page, Subject Dropdown & Date Picker

**Date:** 2026-04-11

## Overview

Three related improvements to Student OS:
1. A new **Classes** page for managing the user's class list
2. **Subject dropdowns** on Homework and Tests that pull from that class list
3. **Native date pickers** replacing all free-text date inputs

---

## 1. Classes Page

### Route & Controller
- New route: `GET /classes` → `ClassesController#index`
- New Stimulus controller: `classes_controller.js`
- Storage key: `student_os.classes`

### Data Shape
```json
{ "id": "1712800000000", "name": "AP Biology", "description": "Mr. Smith, Period 3" }
```
- `id`: `Date.now().toString()`
- `name`: required string
- `description`: optional string

### UI
- Sidebar link "Classes" inserted above "Homework"
- Page header "Classes" with an "Add" button
- Inline form with two fields:
  - Name (required, text input)
  - Description (optional, text input)
- Validation: name is required; show inline error if blank
- List renders each class as an entry card with name, description (if present), and a Delete button
- No edit — delete and re-add

---

## 2. Subject Dropdown on Homework and Tests

### Behavior
- On `connect()`, each controller reads `student_os.classes` and builds a `<select>` element
- First option: `<option value="">— select a class —</option>` (blank, unselected by default)
- If no classes exist: single disabled option "No classes added yet"
- Subsequent options: one per class, `value` = class name

### Storage
- Saved value remains a plain string (class name snapshot)
- Deleting a class does not affect existing homework/test entries
- No migration needed for existing entries (they already store a plain string in `subject`)

### Affected files
- `app/views/homework/index.html.erb` — replace subject `<input>` with `<select>`
- `app/javascript/controllers/homework_controller.js` — populate select on connect, read value on save
- `app/views/tests/index.html.erb` — replace subject `<input>` with `<select>`
- `app/javascript/controllers/tests_controller.js` — populate select on connect, read value on save

---

## 3. Native Date Picker

Replace all `type="text"` date fields with `type="date"`.

### Affected inputs
| Page | Field | Target |
|------|-------|--------|
| Homework | Due date | `dueDateTarget` |
| Tests | Date | `dateTarget` |

### Storage format
No change — `type="date"` natively produces `YYYY-MM-DD`, which is already the stored format.

---

## Out of Scope
- Editing a class (delete and re-add is sufficient)
- Assigning a color or period number to a class
- Cascading deletes (removing a class does not update existing homework/test entries)
- Free-text "Other" fallback in subject dropdown
