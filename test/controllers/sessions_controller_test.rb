require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  test "GET /login renders email form" do
    get login_path
    assert_response :success
    assert_select "form[action='#{login_path}']"
    assert_select "input[type='email'][name='email']"
  end

  test "POST /login with valid email redirects to OTP page" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .with(body: { email: "admin@example.com", create_user: false }.to_json)
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })

    post login_path, params: { email: "admin@example.com" }
    assert_redirected_to login_otp_path
  end

  test "POST /login stores pending_otp_email in session" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })

    post login_path, params: { email: "admin@example.com" }
    follow_redirect!
    assert_response :success
  end

  test "POST /login re-renders form on Supabase error" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 422, body: '{"message":"User not found"}', headers: { "Content-Type" => "application/json" })

    post login_path, params: { email: "unknown@example.com" }
    assert_response :unprocessable_entity
    assert_select "form[action='#{login_path}']"
  end
end
