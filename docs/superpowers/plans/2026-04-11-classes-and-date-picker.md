# Classes Page, Subject Dropdown & Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Classes management page, replace free-text subject fields with class dropdowns on Homework and Tests, and replace text date inputs with native date pickers.

**Architecture:** All data lives in localStorage. A new `classes_controller.js` Stimulus controller manages `student_os.classes`. The homework and tests controllers read that key on `connect()` to populate their subject `<select>`. No backend changes beyond a trivial Rails controller and route.

**Tech Stack:** Ruby on Rails 8.1, Stimulus (Hotwire), localStorage, Capybara system tests (headless Chrome)

> **Note:** All terminal commands require Ruby on PATH. Prefix with `PATH="/opt/homebrew/opt/ruby/bin:$PATH"` or open a new terminal after sourcing `~/.zshrc`.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `app/controllers/classes_controller.rb` | Renders the classes page |
| Create | `app/views/classes/index.html.erb` | Classes page markup |
| Create | `app/javascript/controllers/classes_controller.js` | CRUD against `student_os.classes` |
| Create | `test/system/classes_test.rb` | System tests for classes page |
| Modify | `config/routes.rb` | Add `get "classes"` route |
| Modify | `app/views/layouts/application.html.erb` | Add Classes sidebar link above Homework |
| Modify | `app/assets/stylesheets/application.css` | Style `<select>` to match existing inputs |
| Modify | `app/views/homework/index.html.erb` | Replace subject input → select, date text → date |
| Modify | `app/javascript/controllers/homework_controller.js` | Populate select on connect, read value on save |
| Modify | `test/system/homework_test.rb` | Update tests for dropdown + date picker |
| Modify | `app/views/tests/index.html.erb` | Replace subject input → select, date text → date |
| Modify | `app/javascript/controllers/tests_controller.js` | Populate select on connect, read value on save |
| Modify | `test/system/tests_test.rb` | Update tests for dropdown + date picker |

---

## Task 1: Classes route, Rails controller, and sidebar link

**Files:**
- Modify: `config/routes.rb`
- Create: `app/controllers/classes_controller.rb`
- Modify: `app/views/layouts/application.html.erb`

- [ ] **Step 1: Add the route**

Edit `config/routes.rb`:

```ruby
Rails.application.routes.draw do
  root "homework#index"
  get "classes",        to: "classes#index"
  get "homework",       to: "homework#index"
  get "tests",          to: "tests#index"
  get "volunteer",      to: "volunteer#index"
  get "extracurriculars", to: "extracurriculars#index"
end
```

- [ ] **Step 2: Create the Rails controller**

Create `app/controllers/classes_controller.rb`:

```ruby
class ClassesController < ApplicationController
  def index
  end
end
```

- [ ] **Step 3: Add Classes to the sidebar above Homework**

Edit `app/views/layouts/application.html.erb`. Replace the sidebar links block:

```erb
        <%= link_to "Classes", classes_path,
              class: "sidebar__link #{current_page?(classes_path) ? 'sidebar__link--active' : ''}" %>
        <%= link_to "Homework", homework_path,
              class: "sidebar__link #{current_page?(homework_path) || current_page?(root_path) ? 'sidebar__link--active' : ''}" %>
        <%= link_to "Tests", tests_path,
              class: "sidebar__link #{current_page?(tests_path) ? 'sidebar__link--active' : ''}" %>
        <%= link_to "Volunteer", volunteer_path,
              class: "sidebar__link #{current_page?(volunteer_path) ? 'sidebar__link--active' : ''}" %>
        <%= link_to "Extracurriculars", extracurriculars_path,
              class: "sidebar__link #{current_page?(extracurriculars_path) ? 'sidebar__link--active' : ''}" %>
```

- [ ] **Step 4: Create a minimal view so the route doesn't 500**

Create `app/views/classes/index.html.erb` with just a placeholder (will be replaced in Task 2):

```erb
<p>Classes coming soon.</p>
```

- [ ] **Step 5: Verify server responds**

```bash
PATH="/opt/homebrew/opt/ruby/bin:$PATH" bin/rails server
```

Visit http://localhost:3000/classes — should see "Classes coming soon." with "Classes" highlighted in the sidebar.

- [ ] **Step 6: Commit**

```bash
git add config/routes.rb app/controllers/classes_controller.rb \
        app/views/layouts/application.html.erb app/views/classes/index.html.erb
git commit -m "feat: add classes route, controller, and sidebar link"
```

---

## Task 2: Classes Stimulus controller and view

**Files:**
- Create: `app/javascript/controllers/classes_controller.js`
- Modify: `app/views/classes/index.html.erb`

- [ ] **Step 1: Write the Stimulus controller**

Create `app/javascript/controllers/classes_controller.js`:

```javascript
import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.classes"

export default class extends Controller {
  static targets = ["list", "form", "name", "description", "error", "storageWarning"]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.render()
  }

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
    const description = this.descriptionTarget.value.trim()

    if (!name) {
      this.errorTarget.textContent = "Class name is required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), name, description })
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
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No classes yet. Add your first class.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.name)}</span>
          ${item.description ? `<span class="entry__meta">${escapeHtml(item.description)}</span>` : ""}
        </div>
        <div class="entry__actions">
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="classes#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.nameTarget.value = ""
    this.descriptionTarget.value = ""
  }
}
```

- [ ] **Step 2: Replace the placeholder view**

Overwrite `app/views/classes/index.html.erb`:

```erb
<div data-controller="classes">
  <div data-classes-target="storageWarning" class="storage-warning" hidden>
    Storage unavailable — your data won't be saved.
  </div>

  <div class="section-header">
    <h1 class="section-title">Classes</h1>
    <button class="btn btn--primary" data-action="classes#add">Add</button>
  </div>

  <div data-classes-target="form" hidden>
    <div class="inline-form">
      <div class="form-row">
        <div class="form-field">
          <label for="classes_name">Name</label>
          <input type="text" id="classes_name" data-classes-target="name" placeholder="e.g. AP Biology">
        </div>
        <div class="form-field">
          <label for="classes_description">Description</label>
          <input type="text" id="classes_description" data-classes-target="description" placeholder="Optional (e.g. Mr. Smith, Period 3)">
        </div>
      </div>
      <p class="error-msg" data-classes-target="error"></p>
      <div class="form-actions">
        <button class="btn btn--primary" data-action="classes#save">Save</button>
        <button class="btn btn--ghost" data-action="classes#cancel">Cancel</button>
      </div>
    </div>
  </div>

  <div data-classes-target="list"></div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/javascript/controllers/classes_controller.js app/views/classes/index.html.erb
git commit -m "feat: add classes Stimulus controller and view"
```

---

## Task 3: System tests for the Classes page

**Files:**
- Create: `test/system/classes_test.rb`

- [ ] **Step 1: Write the test file**

Create `test/system/classes_test.rb`:

```ruby
require "application_system_test_case"

class ClassesTest < ApplicationSystemTestCase
  test "shows empty state when no classes exist" do
    visit classes_path
    assert_text "No classes yet"
  end

  test "adding a class with name and description" do
    visit classes_path
    click_button "Add"
    fill_in "Name", with: "AP Biology"
    fill_in "Description", with: "Mr. Smith, Period 3"
    click_button "Save"
    assert_text "AP Biology"
    assert_text "Mr. Smith, Period 3"
  end

  test "adding a class without description" do
    visit classes_path
    click_button "Add"
    fill_in "Name", with: "Math"
    click_button "Save"
    assert_text "Math"
  end

  test "validation requires class name" do
    visit classes_path
    click_button "Add"
    click_button "Save"
    assert_text "Class name is required"
  end

  test "deleting a class" do
    visit classes_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'AP Biology', description: 'Period 3' }
      ]))
    JS
    visit classes_path
    click_button "Delete"
    assert_text "No classes yet"
  end

  test "cancel hides the form" do
    visit classes_path
    click_button "Add"
    fill_in "Name", with: "Draft"
    click_button "Cancel"
    assert_no_selector "[data-classes-target='form']:not([hidden])"
  end
end
```

- [ ] **Step 2: Run the tests**

```bash
PATH="/opt/homebrew/opt/ruby/bin:$PATH" bin/rails test test/system/classes_test.rb
```

Expected: 6 tests pass, 0 failures.

- [ ] **Step 3: Commit**

```bash
git add test/system/classes_test.rb
git commit -m "test: add system tests for classes page"
```

---

## Task 4: Style the `<select>` element

**Files:**
- Modify: `app/assets/stylesheets/application.css`

The existing CSS only styles `input` and `textarea` inside `.form-field`. The `<select>` elements added in Tasks 5 and 7 need matching styles.

- [ ] **Step 1: Add select styles**

In `app/assets/stylesheets/application.css`, find this block:

```css
.form-field input,
.form-field textarea {
```

Replace it with:

```css
.form-field input,
.form-field select,
.form-field textarea {
```

Then find:

```css
.form-field input:focus,
.form-field textarea:focus { border-color: var(--accent); background: var(--surface); }
.form-field input:focus-visible,
.form-field textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
```

Replace with:

```css
.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus { border-color: var(--accent); background: var(--surface); }
.form-field input:focus-visible,
.form-field select:focus-visible,
.form-field textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
```

- [ ] **Step 2: Commit**

```bash
git add app/assets/stylesheets/application.css
git commit -m "style: extend form-field styles to cover select elements"
```

---

## Task 5: Homework — date picker and subject dropdown

**Files:**
- Modify: `app/views/homework/index.html.erb`
- Modify: `app/javascript/controllers/homework_controller.js`
- Modify: `test/system/homework_test.rb`

- [ ] **Step 1: Update the homework view**

Replace the entire content of `app/views/homework/index.html.erb`:

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
          <label for="homework_title">Title</label>
          <input type="text" id="homework_title" data-homework-target="title" placeholder="Assignment title">
        </div>
        <div class="form-field">
          <label for="homework_subject">Subject</label>
          <select id="homework_subject" data-homework-target="subject">
            <option value="">— select a class —</option>
          </select>
        </div>
      </div>
      <div class="form-field">
        <label for="homework_due_date">Due date</label>
        <input type="date" id="homework_due_date" data-homework-target="dueDate">
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

- [ ] **Step 2: Update the homework Stimulus controller**

Replace the entire content of `app/javascript/controllers/homework_controller.js`:

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
    this.populateSubject()
    this.render()
  }

  populateSubject() {
    const classes = readStorage("student_os.classes")
    const select = this.subjectTarget
    while (select.options.length > 1) select.remove(1)
    if (classes.length === 0) {
      const opt = document.createElement("option")
      opt.value = ""
      opt.textContent = "No classes added yet"
      opt.disabled = true
      select.appendChild(opt)
    } else {
      classes.forEach(cls => {
        const opt = document.createElement("option")
        opt.value = cls.name
        opt.textContent = cls.name
        select.appendChild(opt)
      })
    }
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
    const subject = this.subjectTarget.value
    const dueDate = this.dueDateTarget.value

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

- [ ] **Step 3: Update the homework system tests**

Replace the entire content of `test/system/homework_test.rb`:

```ruby
require "application_system_test_case"

class HomeworkTest < ApplicationSystemTestCase
  test "shows empty state when no homework exists" do
    visit homework_path
    assert_text "No homework yet"
  end

  test "adding a homework assignment" do
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'Math', description: '' }
      ]))
    JS
    visit homework_path
    click_button "Add"
    fill_in "Title", with: "Math worksheet"
    select "Math", from: "homework_subject"
    find("[data-homework-target='dueDate']").set("2026-04-20")
    click_button "Save"
    assert_text "Math worksheet"
    assert_text "Math"
    assert_text "2026-04-20"
  end

  test "adding a homework assignment without subject" do
    visit homework_path
    click_button "Add"
    fill_in "Title", with: "Reading"
    find("[data-homework-target='dueDate']").set("2026-04-20")
    click_button "Save"
    assert_text "Reading"
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

- [ ] **Step 4: Run the tests**

```bash
PATH="/opt/homebrew/opt/ruby/bin:$PATH" bin/rails test test/system/homework_test.rb
```

Expected: 7 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add app/views/homework/index.html.erb \
        app/javascript/controllers/homework_controller.js \
        test/system/homework_test.rb
git commit -m "feat: replace homework subject input with class dropdown and use date picker"
```

---

## Task 6: Tests page — date picker and subject dropdown

**Files:**
- Modify: `app/views/tests/index.html.erb`
- Modify: `app/javascript/controllers/tests_controller.js`
- Modify: `test/system/tests_test.rb`

- [ ] **Step 1: Update the tests view**

Replace the entire content of `app/views/tests/index.html.erb`:

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
          <label for="tests_title">Title</label>
          <input type="text" id="tests_title" data-tests-target="title" placeholder="Exam or quiz name">
        </div>
        <div class="form-field">
          <label for="tests_subject">Subject</label>
          <select id="tests_subject" data-tests-target="subject">
            <option value="">— select a class —</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label for="tests_date">Date</label>
          <input type="date" id="tests_date" data-tests-target="date">
        </div>
        <div class="form-field">
          <label for="tests_notes">Notes</label>
          <input type="text" id="tests_notes" data-tests-target="notes" placeholder="e.g. Chapters 1-5">
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

- [ ] **Step 2: Update the tests Stimulus controller**

Replace the entire content of `app/javascript/controllers/tests_controller.js`:

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
    this.populateSubject()
    this.render()
  }

  populateSubject() {
    const classes = readStorage("student_os.classes")
    const select = this.subjectTarget
    while (select.options.length > 1) select.remove(1)
    if (classes.length === 0) {
      const opt = document.createElement("option")
      opt.value = ""
      opt.textContent = "No classes added yet"
      opt.disabled = true
      select.appendChild(opt)
    } else {
      classes.forEach(cls => {
        const opt = document.createElement("option")
        opt.value = cls.name
        opt.textContent = cls.name
        select.appendChild(opt)
      })
    }
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
    const subject = this.subjectTarget.value
    const date = this.dateTarget.value
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

- [ ] **Step 3: Update the tests system tests**

Replace the entire content of `test/system/tests_test.rb`:

```ruby
require "application_system_test_case"

class TestsTest < ApplicationSystemTestCase
  test "shows empty state when no tests exist" do
    visit tests_path
    assert_text "No tests yet"
  end

  test "adding a test" do
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'Math', description: '' }
      ]))
    JS
    visit tests_path
    click_button "Add"
    fill_in "Title", with: "Algebra midterm"
    select "Math", from: "tests_subject"
    find("[data-tests-target='date']").set("2026-05-01")
    fill_in "Notes", with: "Chapters 1-5"
    click_button "Save"
    assert_text "Algebra midterm"
    assert_text "Math"
    assert_text "2026-05-01"
  end

  test "adding a test without subject" do
    visit tests_path
    click_button "Add"
    fill_in "Title", with: "Pop quiz"
    find("[data-tests-target='date']").set("2026-05-01")
    click_button "Save"
    assert_text "Pop quiz"
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

- [ ] **Step 4: Run the tests**

```bash
PATH="/opt/homebrew/opt/ruby/bin:$PATH" bin/rails test test/system/tests_test.rb
```

Expected: 6 tests pass, 0 failures.

- [ ] **Step 5: Run the full test suite**

```bash
PATH="/opt/homebrew/opt/ruby/bin:$PATH" bin/rails test test/system/
```

Expected: all system tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/views/tests/index.html.erb \
        app/javascript/controllers/tests_controller.js \
        test/system/tests_test.rb
git commit -m "feat: replace tests subject input with class dropdown and use date picker"
```
