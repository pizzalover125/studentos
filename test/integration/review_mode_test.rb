require "test_helper"

class ReviewModeTest < ActionDispatch::IntegrationTest
  test "GET /review renders homework in review mode" do
    get review_root_path

    assert_response :success
    assert_select "html[data-review-mode='true'][data-storage-namespace='review']"
    assert_select "a[href='#{review_classes_path}']"
    assert_select "a[href='#{review_homework_path}']"
    assert_select "a[href='#{review_tests_path}']"
  end
end
