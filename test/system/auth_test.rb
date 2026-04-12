require "application_system_test_case"

class AuthTest < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [1400, 900]

  # Does NOT inherit ApplicationSystemTestCase setup — tests unauthenticated state

  test "unauthenticated visit redirects to login page" do
    visit root_path
    assert_current_path login_path
    assert_selector "input[type='email']"
  end

  test "OTP flow: email form → OTP entry → authenticated" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )

    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .with(body: { email: "admin@example.com", create_user: false }.to_json)
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })

    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .with(body: { type: "email", email: "admin@example.com", token: "123456" }.to_json)
      .to_return(
        status: 200,
        body: { access_token: valid_token }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    visit root_path
    assert_current_path login_path

    fill_in "Email", with: "admin@example.com"
    click_button "Send code"

    assert_current_path login_otp_path
    assert_text "Check your email"

    fill_in "Code", with: "123456"
    click_button "Verify"

    assert_current_path root_path
  end

  test "invalid OTP shows error on form" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(status: 401, body: '{"message":"Invalid"}', headers: { "Content-Type" => "application/json" })

    visit login_path
    fill_in "Email", with: "admin@example.com"
    click_button "Send code"

    fill_in "Code", with: "000000"
    click_button "Verify"

    assert_selector ".error-msg", text: /invalid|expired/i
  end
end
