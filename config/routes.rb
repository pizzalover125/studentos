Rails.application.routes.draw do
  root "landing#index"
  get "platform",         to: "homework#index"
  get "classes",          to: "classes#index"
  get "homework",         to: "homework#index"
  get "tests",            to: "tests#index"
  get "pomodoro",         to: "pomodoro#index"
  get "volunteer",        to: "volunteer#index"
  get "extracurriculars", to: "extracurriculars#index"
  get "music",            to: "music#index"

  scope :review, defaults: { review: true } do
    get "/",               to: "homework#index",         as: :review_root
    get "classes",         to: "classes#index",          as: :review_classes
    get "homework",        to: "homework#index",         as: :review_homework
    get "tests",           to: "tests#index",            as: :review_tests
    get "pomodoro",        to: "pomodoro#index",         as: :review_pomodoro
    get "volunteer",       to: "volunteer#index",        as: :review_volunteer
    get "extracurriculars", to: "extracurriculars#index", as: :review_extracurriculars
    get "music",           to: "music#index",            as: :review_music
  end
end
