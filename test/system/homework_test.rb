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
