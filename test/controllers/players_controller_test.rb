require "test_helper"

class PlayersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @user = users(:one)
    @player = players(:memo)
  end

  test "unauthenticated visitors are sent to login" do
    get players_path
    assert_redirected_to login_path
  end

  test "any signed-in account can see the roster and a player card" do
    log_in_as(@user)

    get players_path
    assert_response :success

    get player_path(@player)
    assert_response :success
  end

  test "non-admins cannot reach the create, edit or update actions" do
    log_in_as(@user)

    get new_player_path
    assert_redirected_to root_path

    post players_path, params: { name: "Colado", age: 30, position: "forward" }
    assert_redirected_to root_path

    get edit_player_path(@player)
    assert_redirected_to root_path

    patch player_path(@player), params: { name: "Otro nombre" }
    assert_redirected_to root_path
    assert_equal "Memo", @player.reload.name
  end

  test "admins add a player" do
    log_in_as(@admin)

    assert_difference -> { Player.count }, 1 do
      post players_path, params: { name: "Lalo", age: 24, position: "defender" }
    end

    assert_response :redirect
    assert_equal "defender", Player.find_by(name: "Lalo").position
  end

  test "an invalid player comes back with errors and nothing is saved" do
    log_in_as(@admin)

    assert_no_difference -> { Player.count } do
      post players_path, params: { name: "", age: 4, position: "arquero" }
    end

    assert_redirected_to new_player_path
  end

  test "admins edit a player, link an account and give him de baja" do
    log_in_as(@admin)

    patch player_path(@player), params: { name: "Memo G.", age: 32, position: "goalkeeper", user_id: users(:two).id }
    assert_response :redirect
    @player.reload
    assert_equal "Memo G.", @player.name
    assert_equal users(:two), @player.user

    patch player_path(@player), params: { active: false }
    assert_not @player.reload.active?
    assert_not_includes Player.active, @player
  end

  # One Saturday played and scored, with the given player keeping goal for the
  # winners, so there is something for the chart and the history to show.
  def close_a_saturday(player)
    matchday = Matchday.create!(played_on: Date.new(2026, 9, 5), team_count: 2, status: "played")
    rival = Player.create!(name: "Rival", age: 30, position: "forward")
    winners = Team.create!(matchday: matchday, color: "black", goals: 4)
    losers = Team.create!(matchday: matchday, color: "white", goals: 2)
    TeamMembership.create!(team: winners, player: player, position: "goalkeeper")
    TeamMembership.create!(team: losers, player: rival, position: "forward")
    [ player, rival ].each { |p| Attendance.create!(matchday: matchday, player: p) }
    EloLadder.recalculate!
    matchday
  end

  test "the roster and the card carry the real scores" do
    log_in_as(@user)

    get players_path
    memo = inertia_props["players"].find { |player| player["id"] == @player.id }
    assert_equal 7.2, memo["overall"] # 8 technique, 6 physical, weighted 60/40

    get player_path(@player)
    card = inertia_props["player"]
    assert_equal 8.0, card["technique"]
    assert_equal 6.0, card["physical"]
    assert_equal 1, card["ratings_count"]
    assert_not_includes inertia_props.to_json, "rater"
  end

  test "the card carries the evolution series and where he has played" do
    log_in_as(@user)
    matchday = close_a_saturday(@player)

    get player_path(@player)
    card = inertia_props["player"]

    assert_equal 1, card["series"].size
    assert_equal matchday.played_on.iso8601, card["series"].first["played_on"]
    assert_equal({ "goalkeeper" => 1 }, card["position_history"])
    assert_not_equal 0.0, card["elo"]
  end

  test "a player who has never closed a Saturday has an empty series" do
    log_in_as(@user)

    get player_path(@player)
    card = inertia_props["player"]

    assert_empty card["series"]
    assert_empty card["position_history"]
    assert_equal 0.0, card["elo"]
  end

  test "moving the group weights moves the scores" do
    log_in_as(@admin)
    patch settings_path, params: { technique_weight: 50 }

    get players_path
    memo = inertia_props["players"].find { |player| player["id"] == @player.id }
    assert_equal 7.0, memo["overall"]
  end
end
