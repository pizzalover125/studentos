require "application_system_test_case"

class ReviewTest < ApplicationSystemTestCase
  test "/review preloads mock data" do
    visit review_root_path

    assert_text "Derivatives worksheet"
    click_link "Classes"
    assert_current_path review_classes_path
    assert_text "AP Calculus AB"
  end
end
