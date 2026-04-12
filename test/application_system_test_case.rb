require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [1400, 900]

  setup do
    sign_in
    page.execute_script("localStorage.clear()")
  end

  private

  def sign_in
    visit "/test/sign_in"
    assert_current_path root_path
  end
end
