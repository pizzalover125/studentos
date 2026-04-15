class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  stale_when_importmap_changes

  helper_method :review_mode?

  private

  def review_mode?
    params[:review].to_s == "true"
  end
end
