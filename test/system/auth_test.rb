require "application_system_test_case"

class AuthTest < ApplicationSystemTestCase
  test "root page loads without login" do
    visit root_path
    assert_current_path root_path
    assert_selector "h1", text: "Homework"
  end

  test "direct route access works without login flow" do
    visit classes_path
    assert_current_path classes_path
    assert_selector "h1", text: "Classes"
  end
end
