require "test_helper"

class SettingsControllerTest < ActionDispatch::IntegrationTest
  test "unauthenticated visitors are sent to login" do
    get settings_path
    assert_redirected_to login_path
  end

  test "everyone sees the weights, only the admin can edit them" do
    log_in_as(users(:one))
    get settings_path
    assert_response :success

    assert_equal 60, inertia_props["technique_weight"]
    assert_equal 10, inertia_props["elo_strength"]
    assert_not inertia_props["can_edit"]
  end

  test "a non-admin cannot move the weights" do
    log_in_as(users(:one))

    patch settings_path, params: { technique_weight: 10 }
    assert_redirected_to root_path
    assert_equal 60, GroupSetting.current.technique_weight
  end

  test "the admin moves the weights and the physical weight follows" do
    log_in_as(users(:admin))
    get settings_path
    assert inertia_props["can_edit"]

    patch settings_path, params: { technique_weight: 50 }
    assert_redirected_to settings_path

    settings = GroupSetting.current
    assert_equal 50, settings.technique_weight
    assert_equal 50, settings.physical_weight
    assert_equal 100, settings.technique_weight + settings.physical_weight
  end

  test "the admin moves the strength of the adjustment and the results are replayed" do
    log_in_as(users(:admin))
    matchday = Matchday.create!(played_on: Date.new(2026, 9, 5), team_count: 2, status: "played")
    black = Team.create!(matchday: matchday, color: "black", goals: 4)
    white = Team.create!(matchday: matchday, color: "white", goals: 1)
    TeamMembership.create!(team: black, player: players(:memo), position: "goalkeeper")
    TeamMembership.create!(team: white, player: players(:beto), position: "midfielder")
    EloLadder.recalculate!
    before = players(:memo).reload.elo.to_f

    patch settings_path, params: { elo_strength: 30 }

    assert_equal 30, GroupSetting.current.elo_strength
    assert_equal 60, GroupSetting.current.technique_weight, "the weights stay put"
    assert_in_delta before * 3, players(:memo).reload.elo.to_f, 0.001
  end

  test "a strength outside 2..30 is refused" do
    log_in_as(users(:admin))

    patch settings_path, params: { elo_strength: 90 }
    assert_redirected_to settings_path
    assert_equal 10, GroupSetting.current.elo_strength
  end

  test "a weight outside 0..100 is refused" do
    log_in_as(users(:admin))

    patch settings_path, params: { technique_weight: 140 }
    assert_redirected_to settings_path
    assert_equal 60, GroupSetting.current.technique_weight
  end
end
