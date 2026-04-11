require "application_system_test_case"

class TestsTest < ApplicationSystemTestCase
  test "shows empty state when no tests exist" do
    visit tests_path
    assert_text "No tests yet"
  end

  test "adding a test" do
    visit tests_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'Math', description: '' }
      ]))
    JS
    visit tests_path
    click_button "Add"
    fill_in "Title", with: "Algebra midterm"
    select "Math", from: "tests_subject"
    page.execute_script("document.getElementById('tests_date').value = '2026-05-01'")
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
    page.execute_script("document.getElementById('tests_date').value = '2026-05-01'")
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
