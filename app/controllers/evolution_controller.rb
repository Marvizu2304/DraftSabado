# The group view: every active player's line on one chart, so several can be
# compared at a glance.
class EvolutionController < ApplicationController
  def index
    board = Scoreboard.new
    players = Player.active.ordered.to_a
    series = ScoreSnapshot.where(player: players).chronological.group_by(&:player_id)

    render inertia: "evolucion/Index", props: {
      players: players.map do |player|
        {
          id: player.id,
          name: player.name,
          overall: board.overall(player),
          elo: player.elo.to_f,
          series: (series[player.id] || []).map do |snapshot|
            { played_on: snapshot.matchday.played_on.iso8601, value: snapshot.value }
          end
        }
      end
    }
  end
end
