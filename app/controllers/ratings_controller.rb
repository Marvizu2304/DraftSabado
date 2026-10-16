class RatingsController < ApplicationController
  before_action :set_window

  # Ratings are open for twelve hours after a Saturday's result goes up, and
  # only to the players who were there. Before the group's first result there is
  # no window yet, so the screen stays open with the whole roster — otherwise
  # nobody could ever be rated and the first teams would be drawn blind.
  def index
    me = Current.user.player

    return render_index(linked: false, open: false, eligible: false, players: []) if me.nil?

    if @matchday.nil?
      return render_index(linked: true, open: false, eligible: false, players: bootstrap? ? ratable(Player.active.ordered.where.not(id: me.id), nil) : [])
    end

    attendees = @matchday.players.active.ordered.to_a
    unless attendees.any? { |player| player.id == me.id }
      return render_index(linked: true, open: true, eligible: false, players: [])
    end

    render_index(
      linked: true,
      open: true,
      eligible: true,
      players: ratable(attendees.reject { |player| player.id == me.id }, @matchday)
    )
  end

  # Autosaved from the rating screen with a raw fetch(), not Inertia's router, so a
  # bare head response is the right answer here.
  def upsert
    player = Player.active.find(params[:player_id])
    return head :forbidden unless may_rate?(player)

    rating = Rating.find_or_initialize_by(rater: Current.user, player: player)

    if rating.update(technique: params[:technique], physical: params[:physical], matchday: @matchday)
      refresh_snapshots
      head :ok
    else
      head :unprocessable_entity
    end
  end

  private
    def set_window
      @matchday = Matchday.open_for_ratings
    end

    # No Saturday has ever been scored, so there is nothing to open a window on.
    def bootstrap?
      Matchday.with_result.none?
    end

    def may_rate?(player)
      return bootstrap? if @matchday.nil?

      ids = @matchday.attendances.pluck(:player_id)
      ids.include?(player.id) && ids.include?(Current.user.player&.id)
    end

    def render_index(props)
      render inertia: "calificar/Index", props: {
        closes_at: @matchday&.ratings_close_at&.iso8601,
        played_on: @matchday&.played_on&.iso8601
      }.merge(props)
    end

    def ratable(players, matchday)
      mine = Rating.where(rater: Current.user).index_by(&:player_id)

      players.map do |player|
        rating = mine[player.id]
        {
          id: player.id,
          name: player.name,
          position: player.position,
          technique: rating&.technique,
          physical: rating&.physical,
          # Rated for THIS Saturday, not just at some point in the past.
          done: rating.present? && (matchday.nil? || rating.matchday_id == matchday.id)
        }
      end
    end

    # The Saturday's snapshots are taken when the result goes up — before any of
    # its own ratings exist. While the window is open, keep their overall in step
    # with what the group is saying. Only the overall: replaying the whole elo
    # ladder on every slider drag would be far too much.
    def refresh_snapshots
      return if @matchday.nil?

      board = Scoreboard.new
      @matchday.score_snapshots.includes(:player).each do |snapshot|
        snapshot.update_column(:overall, board.overall(snapshot.player))
      end
    end
end
