# Splits the players who showed up into even teams. Plain Ruby object, like
# Scoreboard: the one place with the balancing rules.
#
# Per the PRD it balances overall score, physical score and positions at the
# same time, and guarantees a goalkeeper per team.
class TeamBuilder
  # A player nobody has rated yet sits in the middle instead of at zero.
  MIDPOINT = 5.0

  SWAP_ATTEMPTS = 2000
  OVERALL_WEIGHT = 3.0
  PHYSICAL_WEIGHT = 2.0
  POSITION_WEIGHT = 0.5

  Slot = Struct.new(:player, :position, :locked)

  def initialize(players, team_count:, scoreboard: Scoreboard.new)
    @players = players.to_a
    @team_count = team_count
    @scoreboard = scoreboard
  end

  def call
    teams = seed(pick_goalkeepers)
    improve(teams)
    teams.map { |slots| slots.map { |slot| { player: slot.player, position: slot.position } } }
  end

  private
    # Ratings plus what the real results have added or taken away: this is the
    # mix the PRD asks the split to use.
    def overall(player)
      (@scoreboard.overall(player) || MIDPOINT) + player.elo.to_f
    end

    def physical(player)
      @scoreboard.physical(player) || MIDPOINT
    end

    # A goalkeeper of the trade first; then whoever has kept goal before, most
    # often first; and only then the weakest field player left.
    def pick_goalkeepers
      chosen = @players.select { |p| p.position == "goalkeeper" }
                       .sort_by { |p| -overall(p) }
                       .first(@team_count)
      return chosen if chosen.size == @team_count

      counts = goalkeeping_history(@players - chosen)
      chosen += (@players - chosen).select { |p| counts.key?(p.id) }
                                   .sort_by { |p| [ -counts[p.id], -overall(p) ] }
                                   .first(@team_count - chosen.size)
      return chosen if chosen.size == @team_count

      # Nobody of the trade and nobody who has kept goal before: the weakest
      # field players left go in. The screen warns about them.
      chosen + (@players - chosen).sort_by { |p| overall(p) }.first(@team_count - chosen.size)
    end

    def goalkeeping_history(players)
      TeamMembership.where(player_id: players.map(&:id), position: "goalkeeper")
                    .group(:player_id).count
    end

    # One goalkeeper each, then a snake draft by overall score so the sizes come
    # out as even as the headcount allows.
    def seed(goalkeepers)
      teams = Array.new(@team_count) { [] }
      goalkeepers.each_with_index do |player, index|
        teams[index] << Slot.new(player, "goalkeeper", true)
      end

      rest = (@players - goalkeepers).sort_by { |p| -overall(p) }
      rest.each_with_index do |player, index|
        round, seat = index.divmod(@team_count)
        teams[round.even? ? seat : @team_count - 1 - seat] << Slot.new(player, field_position(player), false)
      end
      teams
    end

    # A goalkeeper who is not keeping goal today plays out, so he does not count
    # as a goalkeeper when the positions are balanced.
    def field_position(player)
      player.position == "goalkeeper" ? "defender" : player.position
    end

    # Random swaps between teams, keeping the ones that lower the cost. The
    # randomness is the point: "Regenerar" has to give a different split.
    def improve(teams)
      return if @team_count < 2

      best = cost(teams)
      SWAP_ATTEMPTS.times do
        a, b = (0...@team_count).to_a.sample(2)
        i = swappable_index(teams[a]) or next
        j = swappable_index(teams[b]) or next

        teams[a][i], teams[b][j] = teams[b][j], teams[a][i]
        candidate = cost(teams)
        # "<=" and not "<": once it cannot do better it keeps wandering between
        # splits that are just as even, so "Regenerar" lands on a different one.
        if candidate <= best
          best = candidate
        else
          teams[a][i], teams[b][j] = teams[b][j], teams[a][i]
        end
      end
    end

    def swappable_index(slots)
      indexes = (0...slots.size).reject { |i| slots[i].locked }
      indexes.sample
    end

    def cost(teams)
      OVERALL_WEIGHT * range(teams.map { |slots| average(slots) { |p| overall(p) } }) +
        PHYSICAL_WEIGHT * range(teams.map { |slots| average(slots) { |p| physical(p) } }) +
        POSITION_WEIGHT * position_cost(teams)
    end

    def position_cost(teams)
      Player::POSITIONS.sum do |position|
        range(teams.map { |slots| slots.count { |slot| slot.position == position } })
      end
    end

    def average(slots)
      return MIDPOINT if slots.empty?

      slots.sum { |slot| yield(slot.player) } / slots.size
    end

    def range(values)
      values.max - values.min
    end
end
