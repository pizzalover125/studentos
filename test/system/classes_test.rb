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
