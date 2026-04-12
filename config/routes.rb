Rails.application.routes.draw do
  root "homework#index"
  get "classes",          to: "classes#index"
  get "homework",         to: "homework#index"
  get "tests",            to: "tests#index"
  get "pomodoro",         to: "pomodoro#index"
  get "volunteer",        to: "volunteer#index"
  get "extracurriculars", to: "extracurriculars#index"

  get    "/login",            to: "sessions#new",       as: :login
  post   "/login",            to: "sessions#create"
  get    "/login/otp",        to: "sessions#new_otp",   as: :login_otp
  post   "/login/verify_otp", to: "sessions#verify_otp", as: :login_verify_otp
  delete "/session",          to: "sessions#destroy",   as: :logout
  get    "/auth/callback",    to: "auth_callback#show", as: :auth_callback

  if Rails.env.test?
    get "/test/sign_in", to: "test/sessions#create"
  end
end
