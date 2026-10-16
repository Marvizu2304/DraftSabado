require "test_helper"

class MatchdayTest < ActiveSupport::TestCase
  test "the suggestion is one team per full side, two at the least" do
    assert_equal 2, Matchday.suggested_team_count(0)
    assert_equal 2, Matchday.suggested_team_count(12)
    assert_equal 2, Matchday.suggested_team_count(17)
    assert_equal 3, Matchday.suggested_team_count(18)
    assert_equal 4, Matchday.suggested_team_count(24)
  end

  test "the suggestion never asks for more teams than there are jerseys" do
    assert_equal Matchday::TEAM_COUNTS.last, Matchday.suggested_team_count(500)
  end

  test "the rating window shuts by itself twelve hours in" do
    matchday = matchdays(:pasado)
    assert_not matchday.ratings_open?
    assert_not matchday.ratings_closed?

    matchday.update!(ratings_open_at: Time.current)
    assert matchday.ratings_open?
    assert_equal matchday, Matchday.open_for_ratings

    travel 11.hours do
      assert matchday.ratings_open?
      assert_equal "rating", matchday.state
    end

    travel 13.hours do
      assert_not matchday.ratings_open?
      assert matchday.ratings_closed?
      assert_equal "closed", matchday.state
      assert_nil Matchday.open_for_ratings
    end
  end

  test "a shut window is settled once, replaying the ladder with its ratings" do
    matchday = scored_matchday
    matchday.update!(ratings_open_at: 13.hours.ago)
    # Something the replay has to put back: proof it actually ran.
    Player.first.update_column(:elo, 9.9)

    Matchday.settle_closed_windows!

    assert_not_nil matchday.reload.ratings_settled_at
    assert_not_equal 9.9, Player.first.reload.elo.to_f

    stamped = matchday.ratings_settled_at
    Matchday.settle_closed_windows!
    assert_equal stamped.to_i, matchday.reload.ratings_settled_at.to_i
  end

  test "a window still open is left alone" do
    matchday = scored_matchday
    matchday.update!(ratings_open_at: Time.current)

    Matchday.settle_closed_windows!

    assert_nil matchday.reload.ratings_settled_at
  end

  test "the state tells the screens how far along the Saturday is" do
    matchday = matchdays(:pasado)
    assert_equal "building", matchday.state

    matchday.update!(status: "played")
    assert_equal "confirmed", matchday.state
  end

  private
    # Two teams of one, one of them a winner — enough for the ladder to move.
    def scored_matchday
      matchday = Matchday.create!(played_on: Date.new(2026, 11, 14), team_count: 2, status: "played")

      [ [ "red", players(:memo), 3 ], [ "blue", players(:beto), 1 ] ].each do |color, player, goals|
        team = Team.create!(matchday: matchday, color: color, goals: goals)
        Attendance.create!(matchday: matchday, player: player)
        TeamMembership.create!(team: team, player: player, position: "midfielder")
      end

      matchday
    end
end
