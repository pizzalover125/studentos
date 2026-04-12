require "application_system_test_case"

class ThemeTest < ApplicationSystemTestCase
  test "theme changes preview live and cancel reverts" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Rose"

    accent_preview = page.evaluate_script("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
    assert_equal "#e11d48", accent_preview

    click_button "Cancel"
    accent_after_cancel = page.evaluate_script("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
    assert_equal "#4f46e5", accent_after_cancel
  end

  test "changing theme from preset options" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Rose"
    click_button "Save"

    accent = page.evaluate_script("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
    assert_equal "#e11d48", accent
  end

  test "enabling dark mode" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Dark"
    click_button "Save"

    mode = page.evaluate_script("document.documentElement.dataset.themeMode")
    assert_equal "dark", mode
  end

  test "changing app font from settings" do
    visit homework_path
    find("button[aria-label='Theme settings']").click
    click_button "Pixel"
    click_button "Save"

    font_var = page.evaluate_script("getComputedStyle(document.documentElement).getPropertyValue('--font').trim()")
    assert_includes font_var, "Press Start 2P"
  end
end
