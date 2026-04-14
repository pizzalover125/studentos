require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 900 ]

  setup do
    visit root_path
    page.execute_script("localStorage.clear()")
    visit root_path
  end
end
