class SessionsController < ApplicationController
  skip_before_action :require_auth

  layout "auth"

  def new
  end

  def new_otp
  end

  def create
    SupabaseAuthClient.new.send_otp(params[:email])
    session[:pending_otp_email] = params[:email]
    redirect_to login_otp_path
  rescue SupabaseAuthClient::Error
    flash[:alert] = "Could not send sign-in email. Check the address and try again."
    render :new, status: :unprocessable_entity
  end
end
