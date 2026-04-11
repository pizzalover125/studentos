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
