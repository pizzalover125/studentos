# Student OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimalist Ruby on Rails 8 app for high school students to independently track homework, tests, volunteer hours, and extracurricular activities, with all data stored in the browser's localStorage.

**Architecture:** Rails 8 with Turbo Drive for section navigation (the layout holds a persistent sidebar; each section is a standard controller/view rendered into `yield`). All CRUD logic lives in per-section Stimulus controllers that read/write namespaced localStorage keys. No database, no authentication in this version.

**Tech Stack:** Ruby on Rails 8, Hotwire (Turbo Drive + Stimulus), importmap, vanilla CSS, Capybara + Selenium (headless Chrome) for system tests.

---

## File Map

**New files created by this plan:**
- `config/routes.rb` — root + four section routes
- `app/controllers/homework_controller.rb`
- `app/controllers/tests_controller.rb`
- `app/controllers/volunteer_controller.rb`
- `app/controllers/extracurriculars_controller.rb`
- `app/views/layouts/application.html.erb` — sidebar + layout shell
- `app/views/homework/index.html.erb`
- `app/views/tests/index.html.erb`
- `app/views/volunteer/index.html.erb`
- `app/views/extracurriculars/index.html.erb`
- `app/assets/stylesheets/application.css`
- `app/javascript/utils/storage.js` — shared localStorage helpers + HTML escaping
- `app/javascript/controllers/homework_controller.js`
- `app/javascript/controllers/tests_controller.js`
- `app/javascript/controllers/volunteer_controller.js`
- `app/javascript/controllers/extracurriculars_controller.js`
- `test/system/homework_test.rb`
- `test/system/tests_test.rb`
- `test/system/volunteer_test.rb`
- `test/system/extracurriculars_test.rb`

**Modified:**
- `config/importmap.rb` — pin `utils/storage`
- `test/application_system_test_case.rb` — add localStorage clear in setup

---

### Task 1: Bootstrap the Rails app

**Files:**
- Create: entire Rails application

- [ ] **Step 1: Generate the app**

```bash
cd /Users/adi/0projects
rails new student_os \
  --skip-action-mailer \
  --skip-action-mailbox \
  --skip-action-text \
  --skip-active-job \
  --skip-action-cable \
  --skip-active-storage \
  --skip-jbuilder
cd student_os
```

- [ ] **Step 2: Verify the app boots**

```bash
bin/rails server
```

Visit `http://localhost:3000`. Expected: Rails welcome page. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: rails new student_os"
```

---

### Task 2: Routes and stub controllers

**Files:**
- Modify: `config/routes.rb`
- Create: `app/controllers/homework_controller.rb`, `tests_controller.rb`, `volunteer_controller.rb`, `extracurriculars_controller.rb`
- Create: stub views for each section

- [ ] **Step 1: Write routes**

Replace the contents of `config/routes.rb`:

```ruby
Rails.application.routes.draw do
  root "homework#index"
  get "homework", to: "homework#index"
  get "tests", to: "tests#index"
  get "volunteer", to: "volunteer#index"
  get "extracurriculars", to: "extracurriculars#index"
end
```

- [ ] **Step 2: Generate controllers**

```bash
bin/rails generate controller Homework index --no-helper --no-assets --skip-routes
bin/rails generate controller Tests index --no-helper --no-assets --skip-routes
bin/rails generate controller Volunteer index --no-helper --no-assets --skip-routes
bin/rails generate controller Extracurriculars index --no-helper --no-assets --skip-routes
```

- [ ] **Step 3: Verify routes**

```bash
bin/rails routes
```

Expected output includes:
```
root GET  /                homework#index
      GET  /homework        homework#index
      GET  /tests           tests#index
      GET  /volunteer       volunteer#index
      GET  /extracurriculars extracurriculars#index
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add routes and stub controllers"
```

---

### Task 3: Layout and CSS design system

**Files:**
- Modify: `app/views/layouts/application.html.erb`
- Modify: `app/assets/stylesheets/application.css`

- [ ] **Step 1: Update application layout**

Replace `app/views/layouts/application.html.erb`:

```erb
<!DOCTYPE html>
<html>
  <head>
    <title>Student OS</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <%= csrf_meta_tags %>
    <%= csp_meta_tag %>
    <%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>
    <%= javascript_importmap_tags %>
  </head>
  <body>
    <div class="app">
      <aside class="sidebar">
        <div class="sidebar__title">Student OS</div>
        <%= link_to "Homework", homework_path,
              class: "sidebar__link #{current_page?(homework_path) || current_page?(root_path) ? 'sidebar__link--active' : ''}" %>
        <%= link_to "Tests", tests_path,
              class: "sidebar__link #{current_page?(tests_path) ? 'sidebar__link--active' : ''}" %>
        <%= link_to "Volunteer", volunteer_path,
              class: "sidebar__link #{current_page?(volunteer_path) ? 'sidebar__link--active' : ''}" %>
        <%= link_to "Extracurriculars", extracurriculars_path,
              class: "sidebar__link #{current_page?(extracurriculars_path) ? 'sidebar__link--active' : ''}" %>
      </aside>
      <main class="main">
        <%= yield %>
      </main>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Write the stylesheet**

Replace `app/assets/stylesheets/application.css`:

```css
/* Design tokens */
:root {
  --bg: #f9f9f7;
  --surface: #ffffff;
  --border: #e5e5e3;
  --text-primary: #1a1a1a;
  --text-secondary: #6b7280;
  --accent: #4f46e5;
  --accent-hover: #4338ca;
  --danger: #ef4444;
  --font: 'Inter', system-ui, sans-serif;
  --sidebar-width: 220px;
  --radius: 6px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text-primary);
  line-height: 1.5;
  font-size: 15px;
}

/* Layout */
.app { display: flex; height: 100vh; overflow: hidden; }

.sidebar {
  width: var(--sidebar-width);
  border-right: 1px solid var(--border);
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar__title {
  font-size: 15px;
  font-weight: 600;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.sidebar__link {
  display: block;
  padding: 7px 12px;
  border-radius: var(--radius);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 2px;
}
.sidebar__link:hover { background: #f0f0ee; color: var(--text-primary); }
.sidebar__link--active { background: #ededeb; color: var(--text-primary); font-weight: 500; }

.main { flex: 1; overflow-y: auto; padding: 48px 56px; }

/* Section header */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.section-title { font-size: 22px; font-weight: 600; }

/* Buttons */
.btn {
  padding: 6px 14px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-family: var(--font);
  font-weight: 500;
  line-height: 1.5;
  transition: background 0.1s, color 0.1s;
}
.btn--primary { background: var(--accent); color: white; border-color: var(--accent); }
.btn--primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.btn--ghost { background: transparent; color: var(--text-secondary); border-color: var(--border); }
.btn--ghost:hover { background: #f0f0ee; color: var(--text-primary); }
.btn--link-danger {
  background: none; border: none; color: var(--danger);
  font-size: 13px; cursor: pointer; font-family: var(--font); padding: 4px 8px;
}
.btn--link-danger:hover { text-decoration: underline; }

/* Entry list */
.entry-list { display: flex; flex-direction: column; gap: 8px; }

.entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  gap: 16px;
}
.entry--done .entry__title { text-decoration: line-through; color: var(--text-secondary); }
.entry__body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.entry__title { font-size: 15px; font-weight: 500; }
.entry__meta { font-size: 13px; color: var(--text-secondary); }
.entry__actions { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }

/* Inline form */
.inline-form {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
}
.form-row { display: flex; gap: 12px; }
.form-field {
  display: flex; flex-direction: column; gap: 5px; flex: 1; margin-bottom: 10px;
}
.form-field label {
  font-size: 12px; font-weight: 500; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.form-field input,
.form-field textarea {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  font-family: var(--font);
  background: var(--bg);
  color: var(--text-primary);
  outline: none;
  width: 100%;
}
.form-field input:focus,
.form-field textarea:focus { border-color: var(--accent); background: var(--surface); }
.form-field textarea { resize: vertical; min-height: 72px; }
.form-actions { display: flex; gap: 8px; margin-top: 4px; }
.error-msg { color: var(--danger); font-size: 13px; margin-top: 6px; min-height: 18px; }

/* Empty state */
.empty-state {
  color: var(--text-secondary); font-size: 15px; padding: 48px 0; text-align: center;
}

/* Storage warning */
.storage-warning {
  background: #fef9c3; border: 1px solid #fde047;
  border-radius: var(--radius); padding: 10px 14px;
  font-size: 14px; margin-bottom: 20px; color: #713f12;
}

/* Extracurriculars: clickable activity name */
.entry__link {
  background: none; border: none; color: var(--text-primary);
  font-size: 15px; font-weight: 500; font-family: var(--font);
  cursor: pointer; padding: 0; text-align: left;
}
.entry__link:hover { text-decoration: underline; color: var(--accent); }

/* Extracurriculars: back button */
.back-link {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--text-secondary); font-size: 14px;
  background: none; border: none; cursor: pointer;
  font-family: var(--font); padding: 0; margin-bottom: 24px;
}
.back-link::before { content: "← "; }
.back-link:hover { color: var(--text-primary); }

/* Hours badge */
.hours-badge {
  font-size: 12px; background: #ededeb; border-radius: 4px;
  padding: 2px 8px; color: var(--text-secondary); font-weight: 500;
}

/* Total hours label */
.total-label { font-size: 14px; color: var(--text-secondary); }
.total-label strong { color: var(--text-primary); }
```

- [ ] **Step 3: Verify the layout renders**

```bash
bin/rails server
```

Visit `http://localhost:3000`. Expected: sidebar with four nav links visible, main area with stub content. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add layout and CSS design system"
```

---

### Task 4: localStorage utility module

**Files:**
- Create: `app/javascript/utils/storage.js`
- Modify: `config/importmap.rb`

- [ ] **Step 1: Create the utility**

Create `app/javascript/utils/storage.js`:

```javascript
export function storageAvailable() {
  try {
    localStorage.setItem("__test__", "1")
    localStorage.removeItem("__test__")
    return true
  } catch {
    return false
  }
}

export function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    localStorage.removeItem(key)
    return []
  }
}

export function writeStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
```

- [ ] **Step 2: Pin the module in importmap**

Add to the bottom of `config/importmap.rb`:

```ruby
pin "utils/storage", to: "utils/storage.js"
```

- [ ] **Step 3: Commit**

```bash
git add app/javascript/utils/storage.js config/importmap.rb
git commit -m "feat: add localStorage utility module"
```

---

### Task 5: Homework section

**Files:**
- Create: `test/system/homework_test.rb`
- Modify: `test/application_system_test_case.rb`
- Create: `app/javascript/controllers/homework_controller.js`
- Modify: `app/views/homework/index.html.erb`

- [ ] **Step 1: Write the system test**

Create `test/system/homework_test.rb`:

```ruby
require "application_system_test_case"

class HomeworkTest < ApplicationSystemTestCase
  test "shows empty state when no homework exists" do
    visit homework_path
    assert_text "No homework yet"
  end

  test "adding a homework assignment" do
    visit homework_path
    click_button "Add"
    fill_in "Title", with: "Math worksheet"
    fill_in "Subject", with: "Math"
    find("[data-homework-target='dueDate']").set("2026-04-20")
    click_button "Save"
    assert_text "Math worksheet"
    assert_text "Math"
    assert_text "2026-04-20"
  end

  test "validation requires title and due date" do
    visit homework_path
    click_button "Add"
    click_button "Save"
    assert_text "Title and due date are required"
  end

  test "marking homework as done and undoing" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.homework', JSON.stringify([
        { id: '1', title: 'Essay', subject: 'English', due_date: '2026-04-20', status: 'pending' }
      ]))
    JS
    visit homework_path
    assert_text "Essay"
    click_button "Done"
    assert_selector ".entry--done"
    click_button "Undo"
    assert_no_selector ".entry--done"
  end

  test "deleting a homework assignment" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.homework', JSON.stringify([
        { id: '1', title: 'Essay', subject: 'English', due_date: '2026-04-20', status: 'pending' }
      ]))
    JS
    visit homework_path
    click_button "Delete"
    assert_text "No homework yet"
  end

  test "cancel hides the form" do
    visit homework_path
    click_button "Add"
    fill_in "Title", with: "Draft"
    click_button "Cancel"
    assert_no_selector "[data-homework-target='form']:not([hidden])"
  end
end
```

- [ ] **Step 2: Update ApplicationSystemTestCase**

Replace `test/application_system_test_case.rb`:

```ruby
require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [1400, 900]

  setup do
    visit root_path
    page.execute_script("localStorage.clear()")
  end
end
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
bin/rails test:system TEST=test/system/homework_test.rb
```

Expected: All 6 tests fail (no Stimulus controller yet).

- [ ] **Step 4: Generate the Stimulus controller**

```bash
bin/rails generate stimulus homework
```

- [ ] **Step 5: Implement the homework Stimulus controller**

Replace `app/javascript/controllers/homework_controller.js`:

```javascript
import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.homework"

export default class extends Controller {
  static targets = ["list", "form", "title", "subject", "dueDate", "error", "storageWarning"]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.render()
  }

  add() {
    this.formTarget.hidden = false
    this.titleTarget.focus()
  }

  cancel() {
    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
  }

  save() {
    const title = this.titleTarget.value.trim()
    const subject = this.subjectTarget.value.trim()
    const dueDate = this.dueDateTarget.value.trim()

    if (!title || !dueDate) {
      this.errorTarget.textContent = "Title and due date are required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), title, subject, due_date: dueDate, status: "pending" })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
    this.render()
  }

  toggle(event) {
    const id = event.currentTarget.dataset.id
    const items = readStorage(KEY)
    const item = items.find(i => i.id === id)
    if (item) item.status = item.status === "done" ? "pending" : "done"
    writeStorage(KEY, items)
    this.render()
  }

  delete(event) {
    const id = event.currentTarget.dataset.id
    writeStorage(KEY, readStorage(KEY).filter(i => i.id !== id))
    this.render()
  }

  render() {
    const items = readStorage(KEY)
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No homework yet. Add your first assignment.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry ${item.status === "done" ? "entry--done" : ""}">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.title)}</span>
          ${item.subject ? `<span class="entry__meta">${escapeHtml(item.subject)}</span>` : ""}
          <span class="entry__meta">Due ${escapeHtml(item.due_date)}</span>
        </div>
        <div class="entry__actions">
          <button class="btn btn--ghost" data-id="${item.id}" data-action="homework#toggle">
            ${item.status === "done" ? "Undo" : "Done"}
          </button>
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="homework#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.titleTarget.value = ""
    this.subjectTarget.value = ""
    this.dueDateTarget.value = ""
  }
}
```

- [ ] **Step 6: Implement the homework view**

Replace `app/views/homework/index.html.erb`:

```erb
<div data-controller="homework">
  <div data-homework-target="storageWarning" class="storage-warning" hidden>
    Storage unavailable — your data won't be saved.
  </div>

  <div class="section-header">
    <h1 class="section-title">Homework</h1>
    <button class="btn btn--primary" data-action="homework#add">Add</button>
  </div>

  <div data-homework-target="form" hidden>
    <div class="inline-form">
      <div class="form-row">
        <div class="form-field">
          <label>Title</label>
          <input type="text" data-homework-target="title" placeholder="Assignment title">
        </div>
        <div class="form-field">
          <label>Subject</label>
          <input type="text" data-homework-target="subject" placeholder="e.g. Math">
        </div>
      </div>
      <div class="form-field">
        <label>Due date</label>
        <input type="date" data-homework-target="dueDate">
      </div>
      <p class="error-msg" data-homework-target="error"></p>
      <div class="form-actions">
        <button class="btn btn--primary" data-action="homework#save">Save</button>
        <button class="btn btn--ghost" data-action="homework#cancel">Cancel</button>
      </div>
    </div>
  </div>

  <div data-homework-target="list"></div>
</div>
```

- [ ] **Step 7: Run the tests**

```bash
bin/rails test:system TEST=test/system/homework_test.rb
```

Expected: All 6 tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add homework section with localStorage CRUD"
```

---

### Task 6: Tests (academic) section

**Files:**
- Create: `test/system/tests_test.rb`
- Create: `app/javascript/controllers/tests_controller.js`
- Modify: `app/views/tests/index.html.erb`

- [ ] **Step 1: Write the system test**

Create `test/system/tests_test.rb`:

```ruby
require "application_system_test_case"

class TestsTest < ApplicationSystemTestCase
  test "shows empty state when no tests exist" do
    visit tests_path
    assert_text "No tests yet"
  end

  test "adding a test" do
    visit tests_path
    click_button "Add"
    fill_in "Title", with: "Algebra midterm"
    fill_in "Subject", with: "Math"
    find("[data-tests-target='date']").set("2026-05-01")
    fill_in "Notes", with: "Chapters 1-5"
    click_button "Save"
    assert_text "Algebra midterm"
    assert_text "Math"
    assert_text "2026-05-01"
  end

  test "validation requires title and date" do
    visit tests_path
    click_button "Add"
    click_button "Save"
    assert_text "Title and date are required"
  end

  test "marking a test as done and undoing" do
    visit tests_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.tests', JSON.stringify([
        { id: '1', title: 'Bio exam', subject: 'Biology', date: '2026-04-30', notes: '', status: 'upcoming' }
      ]))
    JS
    visit tests_path
    click_button "Done"
    assert_selector ".entry--done"
    click_button "Undo"
    assert_no_selector ".entry--done"
  end

  test "deleting a test" do
    visit tests_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.tests', JSON.stringify([
        { id: '1', title: 'Bio exam', subject: 'Biology', date: '2026-04-30', notes: '', status: 'upcoming' }
      ]))
    JS
    visit tests_path
    click_button "Delete"
    assert_text "No tests yet"
  end
end
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bin/rails test:system TEST=test/system/tests_test.rb
```

Expected: All 5 tests fail.

- [ ] **Step 3: Generate the Stimulus controller**

```bash
bin/rails generate stimulus tests
```

- [ ] **Step 4: Implement the tests Stimulus controller**

Replace `app/javascript/controllers/tests_controller.js`:

```javascript
import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.tests"

export default class extends Controller {
  static targets = ["list", "form", "title", "subject", "date", "notes", "error", "storageWarning"]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.render()
  }

  add() {
    this.formTarget.hidden = false
    this.titleTarget.focus()
  }

  cancel() {
    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
  }

  save() {
    const title = this.titleTarget.value.trim()
    const subject = this.subjectTarget.value.trim()
    const date = this.dateTarget.value.trim()
    const notes = this.notesTarget.value.trim()

    if (!title || !date) {
      this.errorTarget.textContent = "Title and date are required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), title, subject, date, notes, status: "upcoming" })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
    this.render()
  }

  toggle(event) {
    const id = event.currentTarget.dataset.id
    const items = readStorage(KEY)
    const item = items.find(i => i.id === id)
    if (item) item.status = item.status === "done" ? "upcoming" : "done"
    writeStorage(KEY, items)
    this.render()
  }

  delete(event) {
    const id = event.currentTarget.dataset.id
    writeStorage(KEY, readStorage(KEY).filter(i => i.id !== id))
    this.render()
  }

  render() {
    const items = readStorage(KEY)
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No tests yet. Add your next exam.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry ${item.status === "done" ? "entry--done" : ""}">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.title)}</span>
          ${item.subject ? `<span class="entry__meta">${escapeHtml(item.subject)}</span>` : ""}
          <span class="entry__meta">${escapeHtml(item.date)}</span>
          ${item.notes ? `<span class="entry__meta">${escapeHtml(item.notes)}</span>` : ""}
        </div>
        <div class="entry__actions">
          <button class="btn btn--ghost" data-id="${item.id}" data-action="tests#toggle">
            ${item.status === "done" ? "Undo" : "Done"}
          </button>
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="tests#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.titleTarget.value = ""
    this.subjectTarget.value = ""
    this.dateTarget.value = ""
    this.notesTarget.value = ""
  }
}
```

- [ ] **Step 5: Implement the tests view**

Replace `app/views/tests/index.html.erb`:

```erb
<div data-controller="tests">
  <div data-tests-target="storageWarning" class="storage-warning" hidden>
    Storage unavailable — your data won't be saved.
  </div>

  <div class="section-header">
    <h1 class="section-title">Tests</h1>
    <button class="btn btn--primary" data-action="tests#add">Add</button>
  </div>

  <div data-tests-target="form" hidden>
    <div class="inline-form">
      <div class="form-row">
        <div class="form-field">
          <label>Title</label>
          <input type="text" data-tests-target="title" placeholder="Exam or quiz name">
        </div>
        <div class="form-field">
          <label>Subject</label>
          <input type="text" data-tests-target="subject" placeholder="e.g. Biology">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Date</label>
          <input type="date" data-tests-target="date">
        </div>
        <div class="form-field">
          <label>Notes</label>
          <input type="text" data-tests-target="notes" placeholder="e.g. Chapters 1-5">
        </div>
      </div>
      <p class="error-msg" data-tests-target="error"></p>
      <div class="form-actions">
        <button class="btn btn--primary" data-action="tests#save">Save</button>
        <button class="btn btn--ghost" data-action="tests#cancel">Cancel</button>
      </div>
    </div>
  </div>

  <div data-tests-target="list"></div>
</div>
```

- [ ] **Step 6: Run the tests**

```bash
bin/rails test:system TEST=test/system/tests_test.rb
```

Expected: All 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add tests section with localStorage CRUD"
```

---

### Task 7: Volunteer section

**Files:**
- Create: `test/system/volunteer_test.rb`
- Create: `app/javascript/controllers/volunteer_controller.js`
- Modify: `app/views/volunteer/index.html.erb`

- [ ] **Step 1: Write the system test**

Create `test/system/volunteer_test.rb`:

```ruby
require "application_system_test_case"

class VolunteerTest < ApplicationSystemTestCase
  test "shows empty state when no volunteer hours exist" do
    visit volunteer_path
    assert_text "No volunteer hours yet"
  end

  test "adding a volunteer entry" do
    visit volunteer_path
    click_button "Add"
    fill_in "Organization", with: "Local Food Bank"
    fill_in "Description", with: "Sorted donations"
    find("[data-volunteer-target='date']").set("2026-04-10")
    find("[data-volunteer-target='hours']").set("3")
    click_button "Save"
    assert_text "Local Food Bank"
    assert_text "Sorted donations"
    assert_text "2026-04-10"
    assert_text "3 hrs"
  end

  test "validation requires organization, date, and hours" do
    visit volunteer_path
    click_button "Add"
    click_button "Save"
    assert_text "Organization, date, and hours are required"
  end

  test "deleting a volunteer entry" do
    visit volunteer_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.volunteer', JSON.stringify([
        { id: '1', organization: 'Food Bank', description: 'Sorted boxes', date: '2026-04-10', hours: '3' }
      ]))
    JS
    visit volunteer_path
    click_button "Delete"
    assert_text "No volunteer hours yet"
  end

  test "shows total hours" do
    visit volunteer_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.volunteer', JSON.stringify([
        { id: '1', organization: 'Food Bank', description: '', date: '2026-04-01', hours: '3' },
        { id: '2', organization: 'Library', description: '', date: '2026-04-05', hours: '5' }
      ]))
    JS
    visit volunteer_path
    assert_text "8"
  end
end
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bin/rails test:system TEST=test/system/volunteer_test.rb
```

Expected: All 5 tests fail.

- [ ] **Step 3: Generate the Stimulus controller**

```bash
bin/rails generate stimulus volunteer
```

- [ ] **Step 4: Implement the volunteer Stimulus controller**

Replace `app/javascript/controllers/volunteer_controller.js`:

```javascript
import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.volunteer"

export default class extends Controller {
  static targets = [
    "list", "form", "organization", "description", "date", "hours",
    "error", "totalHours", "storageWarning"
  ]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.render()
  }

  add() {
    this.formTarget.hidden = false
    this.organizationTarget.focus()
  }

  cancel() {
    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
  }

  save() {
    const organization = this.organizationTarget.value.trim()
    const description = this.descriptionTarget.value.trim()
    const date = this.dateTarget.value.trim()
    const hours = this.hoursTarget.value.trim()

    if (!organization || !date || !hours) {
      this.errorTarget.textContent = "Organization, date, and hours are required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), organization, description, date, hours })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
    this.render()
  }

  delete(event) {
    const id = event.currentTarget.dataset.id
    writeStorage(KEY, readStorage(KEY).filter(i => i.id !== id))
    this.render()
  }

  render() {
    const items = readStorage(KEY)
    const total = items.reduce((sum, i) => sum + parseFloat(i.hours || 0), 0)
    this.totalHoursTarget.textContent = total % 1 === 0 ? String(total) : total.toFixed(1)

    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No volunteer hours yet. Log your first session.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.organization)}</span>
          ${item.description ? `<span class="entry__meta">${escapeHtml(item.description)}</span>` : ""}
          <span class="entry__meta">${escapeHtml(item.date)}</span>
        </div>
        <div class="entry__actions">
          <span class="hours-badge">${escapeHtml(item.hours)} hr${parseFloat(item.hours) !== 1 ? "s" : ""}</span>
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="volunteer#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.organizationTarget.value = ""
    this.descriptionTarget.value = ""
    this.dateTarget.value = ""
    this.hoursTarget.value = ""
  }
}
```

- [ ] **Step 5: Implement the volunteer view**

Replace `app/views/volunteer/index.html.erb`:

```erb
<div data-controller="volunteer">
  <div data-volunteer-target="storageWarning" class="storage-warning" hidden>
    Storage unavailable — your data won't be saved.
  </div>

  <div class="section-header">
    <h1 class="section-title">Volunteer</h1>
    <div style="display:flex; align-items:center; gap:16px;">
      <span class="total-label">Total: <strong data-volunteer-target="totalHours">0</strong> hrs</span>
      <button class="btn btn--primary" data-action="volunteer#add">Add</button>
    </div>
  </div>

  <div data-volunteer-target="form" hidden>
    <div class="inline-form">
      <div class="form-row">
        <div class="form-field">
          <label>Organization</label>
          <input type="text" data-volunteer-target="organization" placeholder="e.g. Local Food Bank">
        </div>
        <div class="form-field">
          <label>Description</label>
          <input type="text" data-volunteer-target="description" placeholder="What did you do?">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Date</label>
          <input type="date" data-volunteer-target="date">
        </div>
        <div class="form-field">
          <label>Hours</label>
          <input type="number" min="0.5" step="0.5" data-volunteer-target="hours" placeholder="e.g. 3">
        </div>
      </div>
      <p class="error-msg" data-volunteer-target="error"></p>
      <div class="form-actions">
        <button class="btn btn--primary" data-action="volunteer#save">Save</button>
        <button class="btn btn--ghost" data-action="volunteer#cancel">Cancel</button>
      </div>
    </div>
  </div>

  <div data-volunteer-target="list"></div>
</div>
```

- [ ] **Step 6: Run the tests**

```bash
bin/rails test:system TEST=test/system/volunteer_test.rb
```

Expected: All 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add volunteer section with hours tracking"
```

---

### Task 8: Extracurriculars section

**Files:**
- Create: `test/system/extracurriculars_test.rb`
- Create: `app/javascript/controllers/extracurriculars_controller.js`
- Modify: `app/views/extracurriculars/index.html.erb`

- [ ] **Step 1: Write the system test**

Create `test/system/extracurriculars_test.rb`:

```ruby
require "application_system_test_case"

class ExtracurricularsTest < ApplicationSystemTestCase
  test "shows empty state when no extracurriculars exist" do
    visit extracurriculars_path
    assert_text "No extracurriculars yet"
  end

  test "adding an extracurricular" do
    visit extracurriculars_path
    click_button "Add"
    fill_in "Name", with: "Soccer Team"
    fill_in "Role", with: "Midfielder"
    fill_in "Notes", with: "Tuesday practice"
    click_button "Save"
    assert_text "Soccer Team"
    assert_text "Midfielder"
  end

  test "validation requires name" do
    visit extracurriculars_path
    click_button "Add"
    click_button "Save"
    assert_text "Name is required"
  end

  test "deleting an extracurricular removes it from the list" do
    visit extracurriculars_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.extracurriculars', JSON.stringify([
        { id: '1', name: 'Soccer Team', role: 'Midfielder', notes: '' }
      ]))
    JS
    visit extracurriculars_path
    click_button "Delete"
    assert_text "No extracurriculars yet"
  end

  test "deleting an extracurricular also removes its logs" do
    visit extracurriculars_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.extracurriculars', JSON.stringify([
        { id: '42', name: 'Band', role: 'Drummer', notes: '' }
      ]))
      localStorage.setItem('student_os.extracurricular_logs', JSON.stringify([
        { id: '99', extracurricular_id: '42', description: 'Rehearsal', date: '2026-04-01', hours: '2' }
      ]))
    JS
    visit extracurriculars_path
    click_button "Delete"
    assert_text "No extracurriculars yet"
    logs = page.execute_script("return localStorage.getItem('student_os.extracurricular_logs')")
    assert_equal "[]", logs
  end

  test "clicking an extracurricular name opens the detail view" do
    visit extracurriculars_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.extracurriculars', JSON.stringify([
        { id: '1', name: 'Debate Club', role: 'Speaker', notes: '' }
      ]))
    JS
    visit extracurriculars_path
    click_button "Debate Club"
    assert_text "Add Log"
    assert_button "Back"
  end

  test "adding a log to an extracurricular" do
    visit extracurriculars_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.extracurriculars', JSON.stringify([
        { id: '1', name: 'Debate Club', role: 'Speaker', notes: '' }
      ]))
    JS
    visit extracurriculars_path
    click_button "Debate Club"
    click_button "Add Log"
    fill_in "Description", with: "Practice session"
    find("[data-extracurriculars-target='logDate']").set("2026-04-15")
    find("[data-extracurriculars-target='logHours']").set("2")
    click_button "Save Log"
    assert_text "Practice session"
    assert_text "2026-04-15"
    assert_text "2 hrs"
  end

  test "deleting a log" do
    visit extracurriculars_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.extracurriculars', JSON.stringify([
        { id: '1', name: 'Debate Club', role: 'Speaker', notes: '' }
      ]))
      localStorage.setItem('student_os.extracurricular_logs', JSON.stringify([
        { id: '99', extracurricular_id: '1', description: 'Practice', date: '2026-04-15', hours: '2' }
      ]))
    JS
    visit extracurriculars_path
    click_button "Debate Club"
    assert_text "Practice"
    click_button "Delete"
    assert_text "No logs yet"
  end

  test "back button returns to the list view" do
    visit extracurriculars_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.extracurriculars', JSON.stringify([
        { id: '1', name: 'Chess Club', role: 'Member', notes: '' }
      ]))
    JS
    visit extracurriculars_path
    click_button "Chess Club"
    click_button "Back"
    assert_text "Chess Club"
    assert_text "Member"
    assert_no_button "Add Log"
  end
end
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bin/rails test:system TEST=test/system/extracurriculars_test.rb
```

Expected: All 9 tests fail.

- [ ] **Step 3: Generate the Stimulus controller**

```bash
bin/rails generate stimulus extracurriculars
```

- [ ] **Step 4: Implement the extracurriculars Stimulus controller**

Replace `app/javascript/controllers/extracurriculars_controller.js`:

```javascript
import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.extracurriculars"
const LOGS_KEY = "student_os.extracurricular_logs"

export default class extends Controller {
  static targets = [
    "listView", "list", "form", "name", "role", "notes", "error", "storageWarning",
    "detail", "detailTitle", "detailRole", "detailTotal",
    "logList", "logForm", "logDescription", "logDate", "logHours", "logError"
  ]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.currentId = null
    this.renderList()
  }

  // --- List view ---

  add() {
    this.formTarget.hidden = false
    this.nameTarget.focus()
  }

  cancel() {
    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
  }

  save() {
    const name = this.nameTarget.value.trim()
    const role = this.roleTarget.value.trim()
    const notes = this.notesTarget.value.trim()

    if (!name) {
      this.errorTarget.textContent = "Name is required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), name, role, notes })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
    this.renderList()
  }

  delete(event) {
    const id = event.currentTarget.dataset.id
    writeStorage(KEY, readStorage(KEY).filter(i => i.id !== id))
    writeStorage(LOGS_KEY, readStorage(LOGS_KEY).filter(l => l.extracurricular_id !== id))
    this.renderList()
  }

  showDetail(event) {
    this.currentId = event.currentTarget.dataset.id
    this.listViewTarget.hidden = true
    this.detailTarget.hidden = false
    this.renderDetail()
  }

  backToList() {
    this.detailTarget.hidden = true
    this.listViewTarget.hidden = false
    this.currentId = null
    this.renderList()
  }

  // --- Detail view ---

  addLog() {
    this.logFormTarget.hidden = false
    this.logDescriptionTarget.focus()
  }

  cancelLog() {
    this.logFormTarget.hidden = true
    this.clearLogForm()
    this.logErrorTarget.textContent = ""
  }

  saveLog() {
    const description = this.logDescriptionTarget.value.trim()
    const date = this.logDateTarget.value.trim()
    const hours = this.logHoursTarget.value.trim()

    if (!date || !hours) {
      this.logErrorTarget.textContent = "Date and hours are required."
      return
    }

    const logs = readStorage(LOGS_KEY)
    logs.push({ id: Date.now().toString(), extracurricular_id: this.currentId, description, date, hours })
    writeStorage(LOGS_KEY, logs)

    this.logFormTarget.hidden = true
    this.clearLogForm()
    this.logErrorTarget.textContent = ""
    this.renderDetail()
  }

  deleteLog(event) {
    const id = event.currentTarget.dataset.id
    writeStorage(LOGS_KEY, readStorage(LOGS_KEY).filter(l => l.id !== id))
    this.renderDetail()
  }

  // --- Renderers ---

  renderList() {
    const items = readStorage(KEY)
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No extracurriculars yet. Add your first activity.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry">
        <div class="entry__body">
          <button class="entry__link" data-id="${item.id}" data-action="extracurriculars#showDetail">
            ${escapeHtml(item.name)}
          </button>
          ${item.role ? `<span class="entry__meta">${escapeHtml(item.role)}</span>` : ""}
        </div>
        <div class="entry__actions">
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="extracurriculars#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  renderDetail() {
    const activity = readStorage(KEY).find(i => i.id === this.currentId)
    if (!activity) { this.backToList(); return }

    this.detailTitleTarget.textContent = activity.name
    this.detailRoleTarget.textContent = activity.role || ""

    const logs = readStorage(LOGS_KEY).filter(l => l.extracurricular_id === this.currentId)
    const total = logs.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0)
    const totalDisplay = total % 1 === 0 ? String(total) : total.toFixed(1)
    this.detailTotalTarget.textContent = `${totalDisplay} hrs total`

    if (logs.length === 0) {
      this.logListTarget.innerHTML = `<p class="empty-state">No logs yet. Add your first session.</p>`
      return
    }
    this.logListTarget.innerHTML = `<div class="entry-list">${logs.map(log => `
      <div class="entry">
        <div class="entry__body">
          ${log.description ? `<span class="entry__title">${escapeHtml(log.description)}</span>` : ""}
          <span class="entry__meta">${escapeHtml(log.date)}</span>
        </div>
        <div class="entry__actions">
          <span class="hours-badge">${escapeHtml(log.hours)} hr${parseFloat(log.hours) !== 1 ? "s" : ""}</span>
          <button class="btn btn--link-danger" data-id="${log.id}" data-action="extracurriculars#deleteLog">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.nameTarget.value = ""
    this.roleTarget.value = ""
    this.notesTarget.value = ""
  }

  clearLogForm() {
    this.logDescriptionTarget.value = ""
    this.logDateTarget.value = ""
    this.logHoursTarget.value = ""
  }
}
```

- [ ] **Step 5: Implement the extracurriculars view**

Replace `app/views/extracurriculars/index.html.erb`:

```erb
<div data-controller="extracurriculars">
  <div data-extracurriculars-target="storageWarning" class="storage-warning" hidden>
    Storage unavailable — your data won't be saved.
  </div>

  <%# LIST VIEW — hidden when detail is active %>
  <div data-extracurriculars-target="listView">
    <div class="section-header">
      <h1 class="section-title">Extracurriculars</h1>
      <button class="btn btn--primary" data-action="extracurriculars#add">Add</button>
    </div>

    <div data-extracurriculars-target="form" hidden>
      <div class="inline-form">
        <div class="form-row">
          <div class="form-field">
            <label>Name</label>
            <input type="text" data-extracurriculars-target="name" placeholder="e.g. Soccer Team">
          </div>
          <div class="form-field">
            <label>Role</label>
            <input type="text" data-extracurriculars-target="role" placeholder="e.g. Captain">
          </div>
        </div>
        <div class="form-field">
          <label>Notes</label>
          <input type="text" data-extracurriculars-target="notes" placeholder="e.g. Tuesdays and Thursdays">
        </div>
        <p class="error-msg" data-extracurriculars-target="error"></p>
        <div class="form-actions">
          <button class="btn btn--primary" data-action="extracurriculars#save">Save</button>
          <button class="btn btn--ghost" data-action="extracurriculars#cancel">Cancel</button>
        </div>
      </div>
    </div>

    <div data-extracurriculars-target="list"></div>
  </div>

  <%# DETAIL VIEW — hidden by default %>
  <div data-extracurriculars-target="detail" hidden>
    <button class="back-link" data-action="extracurriculars#backToList">Back</button>

    <div class="section-header">
      <div>
        <h1 class="section-title" data-extracurriculars-target="detailTitle"></h1>
        <p class="entry__meta" data-extracurriculars-target="detailRole"></p>
      </div>
      <div style="display:flex; align-items:center; gap:16px;">
        <span class="total-label" data-extracurriculars-target="detailTotal"></span>
        <button class="btn btn--primary" data-action="extracurriculars#addLog">Add Log</button>
      </div>
    </div>

    <div data-extracurriculars-target="logForm" hidden>
      <div class="inline-form">
        <div class="form-row">
          <div class="form-field">
            <label>Description</label>
            <input type="text" data-extracurriculars-target="logDescription" placeholder="e.g. Practice session">
          </div>
          <div class="form-field">
            <label>Date</label>
            <input type="date" data-extracurriculars-target="logDate">
          </div>
          <div class="form-field">
            <label>Hours</label>
            <input type="number" min="0.5" step="0.5" data-extracurriculars-target="logHours" placeholder="e.g. 2">
          </div>
        </div>
        <p class="error-msg" data-extracurriculars-target="logError"></p>
        <div class="form-actions">
          <button class="btn btn--primary" data-action="extracurriculars#saveLog">Save Log</button>
          <button class="btn btn--ghost" data-action="extracurriculars#cancelLog">Cancel</button>
        </div>
      </div>
    </div>

    <div data-extracurriculars-target="logList"></div>
  </div>
</div>
```

- [ ] **Step 6: Run the tests**

```bash
bin/rails test:system TEST=test/system/extracurriculars_test.rb
```

Expected: All 9 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add extracurriculars section with activity and log tracking"
```

---

### Task 9: Full suite run and smoke check

**Files:** None (verification only)

- [ ] **Step 1: Run all system tests**

```bash
bin/rails test:system
```

Expected: All 25 tests pass (6 homework + 5 tests + 5 volunteer + 9 extracurriculars).

- [ ] **Step 2: Manual smoke check**

```bash
bin/rails server
```

Visit `http://localhost:3000` and verify:
- Sidebar links navigate between all four sections; active link is highlighted
- Homework: add an entry, mark it done (strikethrough appears), undo, delete it
- Tests: add an entry, mark it done, delete it
- Volunteer: add two entries, confirm total hours sum is displayed in the header
- Extracurriculars: create an activity → click its name → add a log → confirm hours appear → delete the log → click Back → delete the activity → confirm logs are gone from localStorage via DevTools (`Application > Local Storage`)
- Storage warning banner does not appear in normal Chrome browsing
- Empty states appear correctly when sections have no data

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify full system test suite passes"
```
