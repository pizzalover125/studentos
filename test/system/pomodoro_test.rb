require "application_system_test_case"

class PomodoroTest < ApplicationSystemTestCase
  test "shows default work timer" do
    visit pomodoro_path
    assert_selector "[data-pomodoro-target='phaseLabel']", text: "WORK"
    assert_text "25:00"
    assert_no_selector "#pomodoro_minutes"
  end

  test "settings update work and play duration" do
    visit pomodoro_path
    click_button "Settings"
    fill_in "pomodoro_work_minutes", with: "30"
    fill_in "pomodoro_play_minutes", with: "10"
    click_button "Save"
    assert_text "30:00"
    assert_no_selector ".modal-backdrop:not([hidden])"
  end

  test "start and pause toggle button states" do
    visit pomodoro_path
    click_button "Start"
    assert_button "Start", disabled: true
    assert_button "Pause", disabled: false
    click_button "Pause"
    assert_button "Start", disabled: false
    assert_button "Pause", disabled: true
  end

  test "work completion shows choice to start play or stop" do
    visit pomodoro_path
    click_button "Start"
    page.execute_script(<<~JS)
      const controller = window.Stimulus.controllers.find(c => c.identifier === "pomodoro")
      controller.handleWorkCompleted()
    JS

    assert_selector ".timer-core--alert"
    assert_text "Work timer ended"
    assert_button "Start", disabled: true

    click_button "Start play time"
    assert_no_selector ".timer-core--alert"
    assert_selector "[data-pomodoro-target='phaseLabel']", text: "PLAY"
    assert_button "Pause", disabled: false
  end
end
