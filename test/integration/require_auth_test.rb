require "test_helper"

class RequireAuthTest < ActionDispatch::IntegrationTest
  test "unauthenticated GET / redirects to login" do
    get root_path
    assert_redirected_to login_path
  end

  test "unauthenticated GET /homework redirects to login" do
    get homework_path
    assert_redirected_to login_path
  end

  test "authenticated GET / proceeds after sign_in" do
    sign_in
    get root_path
    assert_response :success
  end
end
