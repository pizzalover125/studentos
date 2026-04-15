require "application_system_test_case"

class LandingTest < ApplicationSystemTestCase
  test "root shows minimalist landing and enters platform" do
    visit root_path

    assert_text "Student OS"
    assert_text "Plan less. Do more."
    assert_link "Enter platform"
    assert_no_selector ".app"

    click_link "Enter platform"
    assert_current_path platform_path
    assert_selector ".app"
  end
end
