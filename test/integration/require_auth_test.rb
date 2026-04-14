require "test_helper"

class PublicAccessTest < ActionDispatch::IntegrationTest
  test "GET / is accessible without authentication" do
    get root_path
    assert_response :success
  end

  test "GET /homework is accessible without authentication" do
    get homework_path
    assert_response :success
  end
end
