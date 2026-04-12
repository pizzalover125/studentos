ENV["RAILS_ENV"] ||= "test"

# Test env vars — set before loading environment
ENV["SUPABASE_URL"]        ||= "https://test.supabase.co"
ENV["SUPABASE_ANON_KEY"]   ||= "test-anon-key"
ENV["SUPABASE_JWT_SECRET"] ||= "test-jwt-secret-32-chars-padded!!"

require_relative "../config/environment"
require "rails/test_help"
require "webmock/minitest"

WebMock.disable_net_connect!(allow_localhost: true)

class ActionDispatch::IntegrationTest
  def sign_in
    get "/test/sign_in"
    follow_redirect!
  end
end

module ActiveSupport
  class TestCase
    parallelize(workers: :number_of_processors)
    fixtures :all
  end
end
