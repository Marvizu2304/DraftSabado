require "test_helper"

class EloLadderTest < ActiveSupport::TestCase
  # A stand-in for Scoreboard, like TeamBuilderTest uses: exact numbers without
  # creating dozens of ratings.
  class FixedScores
    def initialize(scores = {}, default: 5.0)
      @scores = scores
      @default = default
    end

    def overall(player) = @scores.fetch(player.name, @default)
    def physical(player) = overall(player)
  end

  setup do
    @settings = GroupSetting.current
  end

  test "beating a stronger team is worth more than beating a weaker one" do
    underdog_won = deltas(black: 7.0, white: 8.0, goals: { black: 3, white: 1 })
    favorite_won = deltas(black: 8.0, white: 7.0, goals: { black: 3, white: 1 })

    assert_operator winner_delta(underdog_won), :>, winner_delta(favorite_won)
  end

  test "an even match moves both sides by the strength of the adjustment" do
    result = deltas(black: 7.0, white: 7.0, goals: { black: 5, white: 3 })

    assert_in_delta 0.05, winner_delta(result), 0.001
    assert_in_delta(-0.05, result.values.min, 0.001)
  end

  test "a thrashing moves exactly as much as a one-goal win" do
    close = deltas(black: 7.0, white: 7.0, goals: { black: 3, white: 2 })
    rout = deltas(black: 7.0, white: 7.0, goals: { black: 9, white: 0 })

    assert_in_delta winner_delta(close), winner_delta(rout), 0.0001
  end

  test "a draw between even teams moves nobody" do
    result = deltas(black: 7.0, white: 7.0, goals: { black: 2, white: 2 })

    result.each_value { |delta| assert_in_delta 0.0, delta, 0.0001 }
  end

  test "a draw against a stronger team is worth something" do
    result = deltas(black: 6.0, white: 8.0, goals: { black: 2, white: 2 })

    assert_operator result[@by_color["black"].first.id], :>, 0
    assert_operator result[@by_color["white"].first.id], :<, 0
  end

  test "with three teams the matches won set the order" do
    matchday = build_matchday(team_count: 3, strengths: { black: 7.0, white: 7.0, orange: 7.0 })
    set_result(matchday, wins: { black: 3, white: 1, orange: 0 })

    result = EloLadder.new(matchday, scoreboard: scoreboard, settings: @settings).deltas
    by_team = @by_color.transform_values { |players| result[players.first.id] }

    assert_operator by_team["black"], :>, by_team["white"]
    assert_operator by_team["white"], :>, by_team["orange"]
    assert_operator by_team["black"], :>, 0
    assert_operator by_team["orange"], :<, 0
  end

  test "a Saturday without a result moves nobody" do
    matchday = build_matchday(team_count: 2, strengths: { black: 7.0, white: 7.0 })

    assert_empty EloLadder.new(matchday, scoreboard: scoreboard, settings: @settings).deltas
  end

  test "the replay sets every player's adjustment and leaves a snapshot per Saturday" do
    matchday = build_matchday(team_count: 2, strengths: { black: 7.0, white: 7.0 })
    set_result(matchday, goals: { black: 5, white: 3 })

    EloLadder.recalculate!(scoreboard: scoreboard)

    winner = @by_color["black"].first.reload
    loser = @by_color["white"].first.reload
    assert_in_delta 0.05, winner.elo.to_f, 0.001
    assert_in_delta(-0.05, loser.elo.to_f, 0.001)
    assert_equal Player.active.count, matchday.score_snapshots.count
  end

  test "correcting the result leaves the adjustment as if the new one had been the only one" do
    matchday = build_matchday(team_count: 2, strengths: { black: 7.0, white: 7.0 })
    set_result(matchday, goals: { black: 5, white: 3 })
    EloLadder.recalculate!(scoreboard: scoreboard)

    set_result(matchday, goals: { black: 1, white: 4 })
    EloLadder.recalculate!(scoreboard: scoreboard)

    assert_in_delta(-0.05, @by_color["black"].first.reload.elo.to_f, 0.001)
    assert_in_delta 0.05, @by_color["white"].first.reload.elo.to_f, 0.001
  end

  test "clearing the result puts everyone back to zero and drops the snapshots" do
    matchday = build_matchday(team_count: 2, strengths: { black: 7.0, white: 7.0 })
    set_result(matchday, goals: { black: 5, white: 3 })
    EloLadder.recalculate!(scoreboard: scoreboard)

    matchday.teams.each { |team| team.update!(goals: nil) }
    EloLadder.recalculate!(scoreboard: scoreboard)

    assert_equal [ 0.0 ], Player.pluck(:elo).map(&:to_f).uniq
    assert_equal 0, ScoreSnapshot.count
  end

  test "two Saturdays in a row stack up, and the second win is worth less" do
    first = build_matchday(team_count: 2, strengths: { black: 7.0, white: 7.0 })
    set_result(first, goals: { black: 5, white: 3 })
    second = build_matchday(team_count: 2, strengths: { black: 7.0, white: 7.0 }, reuse: true)
    set_result(second, goals: { black: 4, white: 1 })

    EloLadder.recalculate!(scoreboard: scoreboard)

    winner = @by_color["black"].first
    after_first = ScoreSnapshot.find_by!(matchday: first, player: winner).elo.to_f
    after_second = ScoreSnapshot.find_by!(matchday: second, player: winner).elo.to_f

    # By the second Saturday he is the favorite, so beating the same side pays less.
    assert_in_delta 0.05, after_first, 0.001
    assert_operator after_second, :>, after_first
    assert_operator after_second - after_first, :<, 0.05
  end

  test "the first Saturday's overall is frozen even if the ratings change later" do
    matchday = build_matchday(team_count: 2, strengths: { black: 7.0, white: 7.0 })
    set_result(matchday, goals: { black: 5, white: 3 })
    EloLadder.recalculate!(scoreboard: scoreboard)
    frozen = ScoreSnapshot.find_by!(matchday: matchday, player: @by_color["black"].first).overall

    @scoreboard = FixedScores.new({}, default: 2.0)
    EloLadder.recalculate!(scoreboard: @scoreboard)

    snapshot = ScoreSnapshot.find_by!(matchday: matchday, player: @by_color["black"].first)
    assert_equal frozen, snapshot.overall
  end

  private
    def scoreboard
      @scoreboard ||= FixedScores.new(@strengths || {})
    end

    # Two or three teams of two players each, with every player's rating fixed by
    # the colour of his shirt.
    def build_matchday(team_count:, strengths:, played_on: nil, reuse: false)
      @strengths ||= {}
      @by_color ||= {}
      @days ||= 0
      played_on ||= Date.new(2026, 9, 5) + (@days += 7)
      matchday = Matchday.create!(played_on: played_on, team_count: team_count, status: "played")

      strengths.each do |color, value|
        team = Team.create!(matchday: matchday, color: color.to_s)
        players = reuse ? @by_color[color.to_s] : 2.times.map do |i|
          Player.create!(name: "#{color}-#{i}-#{@days}", age: 30, position: "midfielder")
        end
        players.each do |player|
          @strengths[player.name] = value
          Attendance.create!(matchday: matchday, player: player)
          TeamMembership.create!(team: team, player: player, position: "midfielder")
        end
        @by_color[color.to_s] = players
      end

      matchday
    end

    def set_result(matchday, goals: nil, wins: nil)
      (goals || wins).each do |color, value|
        matchday.teams.find_by!(color: color.to_s).update!(goals ? { goals: value } : { wins: value })
      end
      matchday.reload
    end

    def deltas(black:, white:, goals:)
      matchday = build_matchday(team_count: 2, strengths: { black: black, white: white })
      set_result(matchday, goals: goals)
      EloLadder.new(matchday, scoreboard: scoreboard, settings: @settings).deltas
    end

    def winner_delta(result)
      result.values.max
    end
end
