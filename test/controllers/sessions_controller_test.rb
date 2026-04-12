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

  test "GET /login/otp renders OTP form when pending_otp_email is set" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    post login_path, params: { email: "admin@example.com" }

    get login_otp_path
    assert_response :success
    assert_select "form[action='#{login_verify_otp_path}']"
    assert_select "input[name='token']"
  end

  test "GET /login/otp redirects to login when pending_otp_email missing" do
    get login_otp_path
    assert_redirected_to login_path
  end

  test "POST /login/verify_otp with valid token sets session and redirects to root" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .with(body: { type: "email", email: "admin@example.com", token: "123456" }.to_json)
      .to_return(
        status: 200,
        body: { access_token: valid_token }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    post login_path, params: { email: "admin@example.com" }
    post login_verify_otp_path, params: { token: "123456" }

    assert_redirected_to root_path
    follow_redirect!
    assert_response :success
  end

  test "POST /login/verify_otp with invalid token re-renders OTP form" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(status: 401, body: '{"message":"Invalid token"}', headers: { "Content-Type" => "application/json" })

    post login_path, params: { email: "admin@example.com" }
    post login_verify_otp_path, params: { token: "000000" }

    assert_response :unprocessable_entity
    assert_select "form[action='#{login_verify_otp_path}']"
  end

  test "POST /login/verify_otp clears pending_otp_email from session on success" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(
        status: 200,
        body: { access_token: valid_token }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    post login_path, params: { email: "admin@example.com" }
    post login_verify_otp_path, params: { token: "123456" }

    follow_redirect!
    assert_response :success
  end

  test "DELETE /session clears session and redirects to login" do
    sign_in
    delete logout_path
    assert_redirected_to login_path
    follow_redirect!
    get root_path
    assert_redirected_to login_path
  end
end
