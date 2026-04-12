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

  test "reordering classes" do
    visit classes_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'Math', description: '' },
        { id: '2', name: 'Science', description: '' },
        { id: '3', name: 'History', description: '' }
      ]))
    JS
    visit classes_path

    page.execute_script(<<~JS)
      const controller = window.Stimulus.controllers.find(c => c.identifier === "classes")
      controller.reorderByIds('3', '1')
    JS

    assert_equal ["History", "Math", "Science"], all(".entry__title").map(&:text)
  end

  test "editing a class in modal" do
    visit classes_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'AP Biology', description: 'Period 3' }
      ]))
    JS
    visit classes_path
    find(".entry", text: "AP Biology").click
    fill_in "classes_edit_name", with: "Honors Biology"
    fill_in "classes_edit_description", with: "Period 4"
    click_button "Save changes"
    assert_text "Honors Biology"
    assert_text "Period 4"
  end

  test "deleting a class" do
    visit classes_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.classes', JSON.stringify([
        { id: '1', name: 'AP Biology', description: 'Period 3' }
      ]))
    JS
    visit classes_path
    find(".entry", text: "AP Biology").click
    click_button "Delete"
    assert_text "Delete class?"
    click_button "Delete item"
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
