require "application_system_test_case"

class TaskbarTest < ApplicationSystemTestCase
  test "shows pomodoro status in taskbar when active" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.pomodoro_taskbar', JSON.stringify({
        phase: 'work',
        remainingSeconds: 1200,
        running: true,
        awaitingAcknowledgement: false,
        updatedAt: Date.now()
      }))
    JS

    visit classes_path
    assert_text "Pomodoro Work:"
  end

  test "pomodoro stays in taskbar across pages after start" do
    visit pomodoro_path
    click_button "Start"

    visit classes_path
    assert_text "Pomodoro Work:"
  end

  test "shows pomodoro completion popup on non-pomodoro pages" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.pomodoro_taskbar', JSON.stringify({
        phase: 'work',
        remainingSeconds: 1,
        running: true,
        awaitingAcknowledgement: false,
        updatedAt: Date.now() - 3000
      }))
    JS

    visit classes_path
    assert_text "Work timer ended"
    click_button "Stop timer"
    assert_no_selector "[data-taskbar-target='decisionModal']:not([hidden])"
    assert_no_selector "[data-taskbar-target='pomodoro']:not([hidden])"
  end

  test "clock respects stored display settings" do
    visit homework_path
    page.execute_script(<<~JS)
      localStorage.setItem('student_os.theme', JSON.stringify({
        clock: {
          includeDate: false,
          includeSeconds: true,
          includeAmPm: false,
          militaryTime: true
        }
      }))
    JS

    visit classes_path
    clock_text = page.find("[data-taskbar-target='clock']").text.strip
    assert_match(/^\d{2}:\d{2}:\d{2}$/, clock_text)
  end

end
