# Turns what happened on the field into the adjustment every player carries on
# top of the group's ratings. Plain Ruby object, like Scoreboard and TeamBuilder:
# the one place with the Elo arithmetic.
#
# Per the PRD: the move depends on the result and on how much of a favorite the
# team was, and it is small — one thrashing never wrecks anybody.
#
# `recalculate!` replays every Saturday that has a result, from zero, in order.
# That is what makes "correcting the result recalculates" free: there is no
# incremental state to unwind, so fixing a score, clearing one, or moving the
# strength slider all come down to the same replay.
class EloLadder
  # A player nobody has rated yet sits in the middle, same as TeamBuilder.
  MIDPOINT = 5.0

  # Two points apart on the 1-10 scale is about a 10-to-1 favorite.
  SPREAD = 2.0

  def self.recalculate!(scoreboard: Scoreboard.new)
    scored = Matchday.with_result.order(:played_on).to_a
    elo = Player.ids.index_with { 0.0 }
    board = scoreboard

    Player.transaction do
      ScoreSnapshot.where.not(matchday_id: scored.map(&:id)).delete_all

      scored.each do |matchday|
        new(matchday, elo: elo, scoreboard: board).deltas.each { |player_id, delta| elo[player_id] += delta }
        snapshot(matchday, elo, board)
      end

      Player.find_each do |player|
        player.update_column(:elo, elo.fetch(player.id, 0.0).round(3))
      end
    end
  end

  # One Saturday's picture of the whole active roster, so the group chart has a
  # point per player per Saturday. The overall of a snapshot that already exists
  # is left alone: it is what that player was worth that day, and today's
  # ratings cannot say anything about it.
  def self.snapshot(matchday, elo, board)
    Player.active.find_each do |player|
      row = ScoreSnapshot.find_or_initialize_by(matchday: matchday, player: player)
      row.overall = board.overall(player) if row.new_record?
      row.elo = elo.fetch(player.id, 0.0).round(3)
      row.save!
    end
  end
  private_class_method :snapshot

  # `elo` is the replay's running tally; without it each player's stored
  # adjustment is used, which is what the stored column already holds.
  def initialize(matchday, elo: {}, scoreboard: Scoreboard.new, settings: GroupSetting.current)
    @matchday = matchday
    @elo = elo
    @scoreboard = scoreboard
    @k = settings.elo_k
    @teams = matchday.teams.to_a
  end

  # { player_id => how much his adjustment moves this Saturday }
  def deltas
    return {} unless @matchday.result?

    strengths = @teams.map { |team| strength(team) }
    scores = actual_scores
    return {} if scores.nil?

    @teams.each_with_index.with_object({}) do |(team, index), result|
      delta = @k * (scores[index] - expected(strengths, index))
      team.team_memberships.each { |membership| result[membership.player_id] = delta }
    end
  end

  private
    # What the group thinks this team is worth: ratings plus the adjustment its
    # players already carry.
    def strength(team)
      players = team.players.to_a
      return MIDPOINT if players.empty?

      players.sum do |player|
        (@scoreboard.overall(player) || MIDPOINT) + @elo.fetch(player.id) { player.elo.to_f }
      end / players.size
    end

    # Average of the one-on-one expectations against every other team, then
    # normalized so the expectations add up to 1 — the same scale the actual
    # scores are on, with two teams or with three.
    def expected(strengths, index)
      raw = strengths.each_index.map { |i| pairwise(strengths, i) }
      raw[index] / raw.sum
    end

    def pairwise(strengths, index)
      others = strengths.each_with_index.reject { |_, i| i == index }.map(&:first)
      others.sum { |rival| 1.0 / (1 + 10**((rival - strengths[index]) / SPREAD)) } / others.size
    end

    # Two teams: the scoreboard, win / draw / loss — the margin is deliberately
    # ignored so a 7-1 moves the same as a 3-2. Three or more: the share of the
    # matches won, because past two nobody keeps count of goals.
    def actual_scores
      if @matchday.team_count == 2
        goals = @teams.map { |team| team.goals.to_i }
        [ score_for(goals[0], goals[1]), score_for(goals[1], goals[0]) ]
      else
        wins = @teams.map { |team| team.wins.to_i }
        total = wins.sum
        wins.map { |w| w.to_f / total } if total.positive?
      end
    end

    def score_for(own, rival)
      return 0.5 if own == rival

      own > rival ? 1.0 : 0.0
    end
end
