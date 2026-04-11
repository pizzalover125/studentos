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
