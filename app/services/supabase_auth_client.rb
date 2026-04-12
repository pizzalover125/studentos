require "net/http"
require "json"

class SupabaseAuthClient
  Error = Class.new(StandardError)

  def initialize
    @base_url = ENV.fetch("SUPABASE_URL")
    @anon_key  = ENV.fetch("SUPABASE_ANON_KEY")
  end

  def send_otp(email)
    post("/auth/v1/otp", { email: email, create_user: false })
    true
  end

  def verify_otp(email:, token:)
    response = post("/auth/v1/verify", { type: "email", email: email, token: token })
    response["access_token"]
  end

  def verify_token_hash(token_hash:)
    response = post("/auth/v1/verify", { type: "email", token_hash: token_hash })
    response["access_token"]
  end

  private

  def post(path, body)
    uri     = URI("#{@base_url}#{path}")
    http    = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"

    request = Net::HTTP::Post.new(uri.path)
    request["apikey"]        = @anon_key
    request["Content-Type"]  = "application/json"
    request.body             = body.to_json

    response = http.request(request)

    unless response.is_a?(Net::HTTPSuccess)
      raise Error, "Supabase error #{response.code}: #{response.body}"
    end

    JSON.parse(response.body)
  rescue Error
    raise
  rescue => e
    raise Error, "Supabase request failed: #{e.message}"
  end
end
