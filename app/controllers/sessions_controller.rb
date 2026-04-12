class SessionsController < ApplicationController
  skip_before_action :require_auth

  layout "auth"

  def new
  end

  def create
    SupabaseAuthClient.new.send_otp(params[:email])
    session[:pending_otp_email] = params[:email]
    redirect_to login_otp_path
  rescue SupabaseAuthClient::Error
    flash[:alert] = "Could not send sign-in email. Check the address and try again."
    render :new, status: :unprocessable_entity
  end

  def new_otp
    redirect_to login_path unless session[:pending_otp_email]
  end

  def verify_otp
    email = session[:pending_otp_email]
    access_token = SupabaseAuthClient.new.verify_otp(email: email, token: params[:token])
    session.delete(:pending_otp_email)
    session[:supabase_access_token] = access_token
    redirect_to root_path
  rescue SupabaseAuthClient::Error
    flash[:alert] = "Invalid or expired code. Request a new one."
    render :new_otp, status: :unprocessable_entity
  end
end
