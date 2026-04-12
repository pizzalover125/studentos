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
end
