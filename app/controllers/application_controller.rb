require "jwt"

class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  stale_when_importmap_changes

  before_action :require_auth

  helper_method :authenticated?

  private

  def require_auth
    token = session[:supabase_access_token]

    if token.nil? || token_expired?(token)
      reset_session
      redirect_to login_path and return
    end
  end

  def token_expired?(token)
    payload, = JWT.decode(token, ENV.fetch("SUPABASE_JWT_SECRET"), true, { algorithm: "HS256" })
    payload["exp"] < Time.now.to_i
  rescue JWT::DecodeError
    true
  end

  def authenticated?
    token = session[:supabase_access_token]
    token.present? && !token_expired?(token)
  end
end
