require "application_system_test_case"

class MusicTest < ApplicationSystemTestCase
  test "music page renders soundcloud iframe player" do
    visit music_path

    assert_text "Music"
    assert_selector ".music-player-card iframe[src*='soundcloud.com']", visible: :all
  end

  test "review music route renders player" do
    visit review_music_path

    assert_current_path review_music_path
    assert_selector ".music-player-card iframe[src*='soundcloud.com']", visible: :all
  end
end
