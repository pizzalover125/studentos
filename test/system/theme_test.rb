require "application_system_test_case"

class ThemeTest < ApplicationSystemTestCase
  test "theme changes persist without clicking save" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Rose"

    find("button[aria-label='Close settings']").click
    accent_after_close = page.evaluate_script("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
    assert_equal "#e11d48", accent_after_close
  end

  test "changing theme from preset options" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Rose"

    accent = page.evaluate_script("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
    assert_equal "#e11d48", accent
  end

  test "enabling dark mode" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Dark"

    mode = page.evaluate_script("document.documentElement.dataset.themeMode")
    assert_equal "dark", mode
  end

  test "changing app font from settings" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Pixel"

    font_var = page.evaluate_script("getComputedStyle(document.documentElement).getPropertyValue('--font').trim()")
    assert_includes font_var, "Press Start 2P"
  end

  test "sidebar can be set to hover reveal mode" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Hover to reveal"
    find("button[aria-label='Close settings']").click

    assert_equal "hover", page.evaluate_script("document.documentElement.dataset.sidebarMode")
    sleep 0.25
    left_before_hover = page.evaluate_script("document.querySelector('.sidebar').getBoundingClientRect().left")
    assert_operator left_before_hover, :<, -150

    find(".sidebar-hover-zone", visible: :all).hover
    sleep 0.2
    left_after_hover = page.evaluate_script("document.querySelector('.sidebar').getBoundingClientRect().left")
    assert_operator left_after_hover, :>=, -1
  end

  test "reset restores always-visible sidebar" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Hover to reveal"
    find("button[aria-label='Close settings']").click

    find("button[aria-label='Theme settings']").click
    click_button "Reset"

    assert_equal "pinned", page.evaluate_script("document.documentElement.dataset.sidebarMode")
  end

  test "clock settings persist without save button" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    find("button[aria-label='Hide date in taskbar']").click
    find("button[aria-label='Show seconds in taskbar']").click
    find("button[aria-label='Enable military time']").click
    find("button[aria-label='Close settings']").click

    clock_settings = page.evaluate_script("JSON.parse(localStorage.getItem('student_os.theme')).clock")
    assert_equal false, clock_settings["includeDate"]
    assert_equal true, clock_settings["includeSeconds"]
    assert_equal true, clock_settings["militaryTime"]
  end
end
