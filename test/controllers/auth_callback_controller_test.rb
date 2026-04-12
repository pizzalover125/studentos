require "test_helper"

class AuthCallbackControllerTest < ActionDispatch::IntegrationTest
  test "GET /auth/callback with valid token_hash sets session and redirects to root" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .with(body: { type: "email", token_hash: "valid_hash_abc" }.to_json)
      .to_return(
        status: 200,
        body: { access_token: valid_token }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    get auth_callback_url(token_hash: "valid_hash_abc", type: "email")
    assert_redirected_to root_path
    follow_redirect!
    assert_response :success
  end

  test "GET /auth/callback with invalid token_hash redirects to login with alert" do
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(
        status: 401,
        body: '{"message":"Token has expired or is invalid"}',
        headers: { "Content-Type" => "application/json" }
      )

    get auth_callback_url(token_hash: "stale_hash", type: "email")
    assert_redirected_to login_path
    follow_redirect!
    assert_select ".error-msg", /invalid|expired/i
  end
end
