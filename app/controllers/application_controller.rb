class ApplicationController < ActionController::Base
  include Authentication

  allow_browser versions: :modern

  before_action :settle_rating_windows

  inertia_share do
    {
      current_user: Current.user && {
        id: Current.user.id,
        email: Current.user.email,
        timezone: Current.user.timezone,
        admin: Current.user.admin?
      },
      rating_prompt: rating_prompt,
      flash: {
        notice: flash.notice,
        alert: flash.alert
      }
    }
  end

  private
    # A shut window still owes the ladder one replay, with the ratings it
    # collected. Cheap when there is nothing to settle, which is almost always.
    def settle_rating_windows
      Matchday.settle_closed_windows!
    end

    # The nudge every screen carries while the window is open and this player
    # still owes somebody a rating.
    def rating_prompt
      matchday = Matchday.open_for_ratings
      return nil if matchday.nil?

      player = Current.user&.player
      return nil if player.nil?

      ids = matchday.attendances.pluck(:player_id)
      return nil unless ids.include?(player.id)

      pending = (ids.size - 1) - Rating.where(rater: Current.user, matchday: matchday).count
      return nil unless pending.positive?

      { pending: pending, closes_at: matchday.ratings_close_at.iso8601 }
    end
end
