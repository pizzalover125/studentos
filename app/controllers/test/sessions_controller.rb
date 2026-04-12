class Test::SessionsController < ApplicationController
  skip_before_action :require_auth

  def create
    token = JWT.encode(
      { "sub" => "test-user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
      ENV.fetch("SUPABASE_JWT_SECRET"),
      "HS256"
    )
    session[:supabase_access_token] = token
    redirect_to root_path
  end
end
