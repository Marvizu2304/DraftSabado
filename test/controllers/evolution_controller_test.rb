require "test_helper"

class EvolutionControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @player = players(:memo)
  end

  test "unauthenticated visitors are sent to login" do
    get evolution_path
    assert_redirected_to login_path
  end

  test "every active player comes with his series" do
    log_in_as(@user)
    matchday = Matchday.create!(played_on: Date.new(2026, 9, 5), team_count: 2, status: "played")
    black = Team.create!(matchday: matchday, color: "black", goals: 4)
    white = Team.create!(matchday: matchday, color: "white", goals: 2)
    TeamMembership.create!(team: black, player: @player, position: "goalkeeper")
    TeamMembership.create!(team: white, player: players(:beto), position: "midfielder")
    EloLadder.recalculate!

    get evolution_path
    assert_response :success

    players = inertia_props["players"]
    assert_equal Player.active.count, players.size
    assert_not_includes players.map { |p| p["name"] }, players(:retirado).name

    memo = players.find { |p| p["id"] == @player.id }
    assert_equal 1, memo["series"].size
    assert_equal "2026-09-05", memo["series"].first["played_on"]
    assert_operator memo["elo"], :>, 0
  end

  test "with no Saturday closed yet every series is empty" do
    log_in_as(@user)

    get evolution_path
    assert_equal [ [] ], inertia_props["players"].map { |p| p["series"] }.uniq
  end
end
