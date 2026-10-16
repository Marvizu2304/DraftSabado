require "test_helper"

class TeamBuilderTest < ActiveSupport::TestCase
  # A stand-in for Scoreboard so each test can set exact numbers without
  # creating dozens of ratings.
  class FixedScores
    def initialize(scores = {}, default: 5.0)
      @scores = scores
      @default = default
    end

    def overall(player) = @scores.fetch(player.name, @default)
    def physical(player) = @scores.fetch(player.name, @default)
  end

  test "every team gets a goalkeeper of the trade when enough showed up" do
    players = make(19) + make(3, position: "goalkeeper", prefix: "Portero")

    teams = TeamBuilder.new(players, team_count: 3, scoreboard: FixedScores.new).call

    teams.each do |team|
      keepers = team.select { |slot| slot[:position] == "goalkeeper" }
      assert_equal 1, keepers.size
      assert_equal "goalkeeper", keepers.first[:player].position
    end
  end

  test "with no goalkeeper of the trade it falls back to whoever has kept goal before" do
    players = make(6)
    veteran = players.last
    kept_goal_before(veteran)

    teams = TeamBuilder.new(players, team_count: 2, scoreboard: FixedScores.new).call

    keepers = teams.flatten.select { |slot| slot[:position] == "goalkeeper" }
    assert_equal 2, keepers.size
    assert_includes keepers.map { |slot| slot[:player] }, veteran
  end

  test "with nobody who has ever kept goal the lowest rated players go in" do
    players = make(6)
    scores = FixedScores.new(players.each_with_index.to_h { |p, i| [ p.name, 4.0 + i ] })

    teams = TeamBuilder.new(players, team_count: 2, scoreboard: scores).call

    keepers = teams.flatten.select { |slot| slot[:position] == "goalkeeper" }.map { |s| s[:player] }
    assert_equal players.first(2).map(&:name).sort, keepers.map(&:name).sort
  end

  test "a goalkeeper who is not keeping goal today plays out" do
    players = make(5) + make(2, position: "goalkeeper", prefix: "Portero")

    teams = TeamBuilder.new(players, team_count: 2, scoreboard: FixedScores.new).call

    spare = teams.flatten.select { |slot| slot[:player].position == "goalkeeper" && slot[:position] != "goalkeeper" }
    assert_equal 0, spare.size, "with 2 teams both goalkeepers keep goal"

    teams = TeamBuilder.new(players + make(1, position: "goalkeeper", prefix: "Suplente"), team_count: 2, scoreboard: FixedScores.new).call
    spare = teams.flatten.select { |slot| slot[:player].position == "goalkeeper" && slot[:position] != "goalkeeper" }
    assert_equal 1, spare.size
    assert_equal "defender", spare.first[:position]
  end

  test "22 players into 3 teams come out 8, 7 and 7" do
    players = make(19) + make(3, position: "goalkeeper", prefix: "Portero")

    teams = TeamBuilder.new(players, team_count: 3, scoreboard: FixedScores.new).call

    assert_equal [ 7, 7, 8 ], teams.map(&:size).sort
    assert_equal 22, teams.flatten.map { |slot| slot[:player].id }.uniq.size
  end

  test "the teams come out even on score and physique" do
    field = make(19)
    keepers = make(3, position: "goalkeeper", prefix: "Portero")
    # A spread-out roster: 3.0 to 9.0, with the keepers level so they cannot
    # skew the result just by being locked to a team.
    scores = field.each_with_index.to_h { |p, i| [ p.name, (3.0 + i * (6.0 / 18)).round(1) ] }
    keepers.each { |p| scores[p.name] = 6.0 }

    teams = TeamBuilder.new(field + keepers, team_count: 3, scoreboard: FixedScores.new(scores)).call

    averages = teams.map { |team| team.sum { |slot| scores.fetch(slot[:player].name) } / team.size }
    assert_operator averages.max - averages.min, :<, 0.3,
      "expected an even split, got #{averages.map { |a| a.round(2) }.inspect}"
  end

  test "the split takes the adjustment from real results into account" do
    boosted = make(3, prefix: "Subió")
    boosted.each { |player| player.update!(elo: 4.0) }
    rest = make(5, prefix: "Parejo")

    teams = TeamBuilder.new(boosted + rest, team_count: 2, scoreboard: FixedScores.new).call

    # Everybody rates the same, so only the adjustment can tell them apart: an
    # even split cannot leave all three on one side.
    per_team = teams.map { |team| team.count { |slot| boosted.include?(slot[:player]) } }
    assert_equal [ 1, 2 ], per_team.sort
  end

  test "it still splits when nobody in the group has been rated" do
    Rating.delete_all
    players = make(10)

    teams = TeamBuilder.new(players, team_count: 2, scoreboard: Scoreboard.new).call

    assert_equal [ 5, 5 ], teams.map(&:size)
    assert_equal 2, teams.flatten.count { |slot| slot[:position] == "goalkeeper" }
  end

  # The screen offers every split from 2 teams up to as many jersey colors as
  # there are, so the balancer has to hold up at both ends and with a remainder.
  test "it splits into any of the counts the screen offers, odd man included" do
    players = make(21)
    scores = spread(players)

    Matchday::TEAM_COUNTS.each do |count|
      teams = TeamBuilder.new(players, team_count: count, scoreboard: FixedScores.new(scores)).call

      assert_equal expected_sizes(21, count), teams.map(&:size).sort,
        "#{count} equipos"
      assert_equal 21, teams.flatten.map { |slot| slot[:player].id }.uniq.size
      assert_operator spread_of(teams, scores), :<, 0.6, "#{count} equipos salieron disparejos"
    end
  end

  test "21 players into 4 teams come out 6, 5, 5 and 5" do
    players = make(21)

    teams = TeamBuilder.new(players, team_count: 4, scoreboard: FixedScores.new).call

    assert_equal [ 5, 5, 5, 6 ], teams.map(&:size).sort
  end

  test "regenerating gives a different split that is just as even" do
    players = make(20)
    scores = spread(players)

    splits = 5.times.map do
      teams = TeamBuilder.new(players, team_count: 4, scoreboard: FixedScores.new(scores)).call
      assert_operator spread_of(teams, scores), :<, 0.6
      teams.map { |team| team.map { |slot| slot[:player].id }.sort }.sort
    end

    assert_operator splits.uniq.size, :>, 1, "Regenerar devolvió siempre el mismo reparto"
  end

  private
    def make(count, position: "midfielder", prefix: "Jugador")
      (1..count).map do |n|
        Player.create!(name: "#{prefix} #{n}", age: 30, position: position)
      end
    end

    def spread(players)
      players.each_with_index.to_h { |p, i| [ p.name, (3.0 + i * 0.3).round(1) ] }
    end

    def spread_of(teams, scores)
      averages = teams.map { |team| team.sum { |slot| scores.fetch(slot[:player].name) } / team.size }
      averages.max - averages.min
    end

    def expected_sizes(players, count)
      base, extra = players.divmod(count)
      Array.new(count) { |i| i < extra ? base + 1 : base }.sort
    end

    def kept_goal_before(player)
      matchday = Matchday.create!(played_on: Date.new(2026, 1, 3))
      team = matchday.teams.create!(color: "black")
      team.team_memberships.create!(player: player, position: "goalkeeper")
    end
end
