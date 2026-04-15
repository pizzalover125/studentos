module ApplicationHelper
  def app_path(name)
    return send(name) unless review_mode?

    {
      classes_path: review_classes_path,
      homework_path: review_homework_path,
      tests_path: review_tests_path,
      pomodoro_path: review_pomodoro_path,
      volunteer_path: review_volunteer_path,
      extracurriculars_path: review_extracurriculars_path,
      music_path: review_music_path,
      root_path: review_root_path
    }.fetch(name)
  end
end
