require "application_system_test_case"

class HomeworkTest < ApplicationSystemTestCase
  test "shows empty state when no homework exists" do
    visit homework_path
    assert_text "No homework yet"
  end

  test "adding a homework assignment" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'Math', description: '' }
      ]))
    JS
    visit homework_path
    click_button "Add"
    fill_in "Title", with: "Math worksheet"
    select "Math", from: "homework_subject"
    page.execute_script("document.getElementById('homework_due_date').value = '2026-04-20'")
    fill_in "homework_estimate_minutes", with: "45"
    click_button "Save"
    assert_text "Math worksheet"
    assert_text "Math"
    assert_text "2026-04-20"
    assert_text "Estimated 45 min"
    assert_selector ".status-select.status-select--not-started"
    assert_selector ".status-select option[value='not_started'][selected]"
  end

  test "adding a homework assignment without subject" do
    visit homework_path
    click_button "Add"
    fill_in "Title", with: "Reading"
    page.execute_script("document.getElementById('homework_due_date').value = '2026-04-20'")
    click_button "Save"
    assert_text "Reading"
    assert_text "2026-04-20"
  end

  test "validation requires title and due date" do
    visit homework_path
    click_button "Add"
    click_button "Save"
    assert_text "Title and due date are required."
  end

  test "updating homework status" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.homework', JSON.stringify([
        { id: '1', title: 'Essay', subject: 'English', due_date: '2026-04-20', status: 'pending' }
      ]))
    JS
    visit homework_path
    assert_text "Essay"
    assert_selector "#homework_status_1.status-select--pending"
    assert_selector "#homework_status_1 option[value='pending'][selected]"
    select "Completed", from: "homework_status_1"
    assert_selector ".entry--done"
    assert_selector "#homework_status_1.status-select--completed"
    assert_selector "#homework_status_1 option[value='completed'][selected]"
    select "Not Started", from: "homework_status_1"
    assert_no_selector ".entry--done"
    assert_selector "#homework_status_1.status-select--not-started"
    assert_selector "#homework_status_1 option[value='not_started'][selected]"
  end

  test "editing a homework assignment in modal" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'Math', description: '' },
        { id: '2', name: 'Science', description: '' }
      ]))
      localStorage.setItem('student_os.homework', JSON.stringify([
        { id: '1', title: 'Essay', subject: 'Math', due_date: '2026-04-20', status: 'pending' }
      ]))
    JS
    visit homework_path
    find(".entry", text: "Essay").click
    fill_in "homework_edit_title", with: "Lab report"
    select "Science", from: "homework_edit_subject"
    page.execute_script("document.getElementById('homework_edit_due_date').value = '2026-05-01'")
    fill_in "homework_edit_estimate_minutes", with: "30"
    click_button "Save changes"
    assert_text "Lab report"
    assert_text "Science"
    assert_text "2026-05-01"
    assert_text "Estimated 30 min"
    assert_no_selector ".modal-backdrop:not([hidden])"
  end

  test "deleting a homework assignment in modal" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.homework', JSON.stringify([
        { id: '1', title: 'Essay', subject: 'English', due_date: '2026-04-20', status: 'pending' }
      ]))
    JS
    visit homework_path
    find(".entry", text: "Essay").click
    click_button "Delete"
    assert_text "Delete homework?"
    click_button "Delete item"
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
