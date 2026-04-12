class AuthCallbackController < ApplicationController
  skip_before_action :require_auth

  layout "auth"

  def show
    token_hash = params[:token_hash]
    access_token = SupabaseAuthClient.new.verify_token_hash(token_hash: token_hash)
    session[:supabase_access_token] = access_token
    redirect_to root_path
  rescue SupabaseAuthClient::Error
    flash[:alert] = "Magic link is invalid or has already been used."
    redirect_to login_path
  end
end
