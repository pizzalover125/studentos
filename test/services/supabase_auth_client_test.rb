require "test_helper"

class SupabaseAuthClientTest < ActiveSupport::TestCase
  setup do
    @client = SupabaseAuthClient.new
  end

  test "send_otp posts to Supabase otp endpoint and returns true" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .with(
        body: { email: "admin@example.com", create_user: false }.to_json,
        headers: {
          "apikey"       => "test-anon-key",
          "Content-Type" => "application/json"
        }
      )
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })

    result = @client.send_otp("admin@example.com")
    assert result
  end

  test "send_otp raises Error on Supabase 4xx" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 422, body: '{"message":"Email not found"}', headers: { "Content-Type" => "application/json" })

    assert_raises(SupabaseAuthClient::Error) do
      @client.send_otp("unknown@example.com")
    end
  end

  test "verify_otp posts to verify endpoint and returns access_token" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .with(
        body: { type: "email", email: "admin@example.com", token: "123456" }.to_json,
        headers: { "apikey" => "test-anon-key", "Content-Type" => "application/json" }
      )
      .to_return(
        status: 200,
        body: { access_token: valid_token, token_type: "bearer" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    result = @client.verify_otp(email: "admin@example.com", token: "123456")
    assert_equal valid_token, result
  end

  test "verify_otp raises Error on invalid token" do
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(status: 401, body: '{"message":"Token has expired or is invalid"}', headers: { "Content-Type" => "application/json" })

    assert_raises(SupabaseAuthClient::Error) do
      @client.verify_otp(email: "admin@example.com", token: "000000")
    end
  end

  test "verify_token_hash posts to verify endpoint and returns access_token" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .with(
        body: { type: "email", token_hash: "pkce_abc123" }.to_json,
        headers: { "apikey" => "test-anon-key", "Content-Type" => "application/json" }
      )
      .to_return(
        status: 200,
        body: { access_token: valid_token, token_type: "bearer" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    result = @client.verify_token_hash(token_hash: "pkce_abc123")
    assert_equal valid_token, result
  end

  test "verify_token_hash raises Error on reused token" do
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(status: 401, body: '{"message":"Token has expired or is invalid"}', headers: { "Content-Type" => "application/json" })

    assert_raises(SupabaseAuthClient::Error) do
      @client.verify_token_hash(token_hash: "stale_hash")
    end
  end
end
