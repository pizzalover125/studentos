Rails.application.routes.draw do
  root "homework#index"
  get "classes",        to: "classes#index"
  get "homework",       to: "homework#index"
  get "tests",          to: "tests#index"
  get "volunteer",      to: "volunteer#index"
  get "extracurriculars", to: "extracurriculars#index"
end
