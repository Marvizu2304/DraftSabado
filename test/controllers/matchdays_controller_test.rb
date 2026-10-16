require "test_helper"

class MatchdaysControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @user = users(:one)
    @matchday = matchdays(:pasado)
    @attendees = players(:memo, :beto) + (1..8).map do |n|
      Player.create!(name: "Llegó #{n}", age: 28, position: "midfielder")
    end
  end

  test "unauthenticated visitors are sent to login" do
    get matchdays_path
    assert_redirected_to login_path
  end

  test "any signed-in account can see the list and a Saturday" do
    log_in_as(@user)

    get matchdays_path
    assert_response :success

    get matchday_path(@matchday)
    assert_response :success
    assert_equal false, inertia_props["can_edit"]
  end

  test "non-admins cannot open, generate or confirm" do
    log_in_as(@user)

    post matchdays_path
    assert_redirected_to root_path

    post generate_matchday_path(@matchday), params: generate_params
    assert_redirected_to root_path

    patch confirm_matchday_path(@matchday), params: { teams: [] }
    assert_redirected_to root_path

    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }
    assert_redirected_to root_path
  end

  test "opening today's Saturday twice lands on the same one" do
    log_in_as(@admin)

    assert_difference -> { Matchday.count }, 1 do
      post matchdays_path
    end
    first = Matchday.find_by!(played_on: Date.current)
    assert_redirected_to matchday_path(first)

    assert_no_difference -> { Matchday.count } do
      post matchdays_path
    end
    assert_redirected_to matchday_path(first)
  end

  test "generating saves who showed up and splits them into teams" do
    log_in_as(@admin)

    post generate_matchday_path(@matchday), params: generate_params(team_count: 3)
    assert_redirected_to matchday_path(@matchday)

    @matchday.reload
    assert_equal 3, @matchday.team_count
    assert_equal @attendees.map(&:id).sort, @matchday.attendances.pluck(:player_id).sort
    assert_equal 3, @matchday.teams.count
    assert_equal %w[ blue red white ], @matchday.teams.pluck(:color).sort
    assert_equal @attendees.size, TeamMembership.where(team: @matchday.teams).count
  end

  test "generating again replaces the previous split and the attendance" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params(team_count: 3)

    fewer = @attendees.first(6)
    post generate_matchday_path(@matchday), params: { player_ids: fewer.map(&:id), team_count: 2 }

    @matchday.reload
    assert_equal 2, @matchday.teams.count
    assert_equal fewer.map(&:id).sort, @matchday.attendances.pluck(:player_id).sort
    assert_equal 6, TeamMembership.where(team: @matchday.teams).count
  end

  test "generating is refused when too few players showed up" do
    log_in_as(@admin)

    post generate_matchday_path(@matchday),
      params: { player_ids: @attendees.first(4).map(&:id), team_count: 3 }

    assert_redirected_to matchday_path(@matchday)
    assert_equal 0, @matchday.reload.teams.count
    assert_match "al menos 6", flash[:alert]
  end

  test "inactive players never make it into a team" do
    log_in_as(@admin)

    post generate_matchday_path(@matchday),
      params: { player_ids: @attendees.map(&:id) + [ players(:retirado).id ], team_count: 2 }

    assert_equal @attendees.map(&:id).sort, @matchday.reload.attendances.pluck(:player_id).sort
  end

  test "confirming stores the arrangement sent from the phone" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params(team_count: 2)

    half = @attendees.first(5).map { |p| { player_id: p.id, position: "defender" } }
    rest = @attendees.last(5).map { |p| { player_id: p.id, position: "forward" } }
    patch confirm_matchday_path(@matchday), params: {
      teams: [
        { color: "red", members: half },
        { color: "blue", members: rest }
      ]
    }

    assert_redirected_to matchday_path(@matchday)
    @matchday.reload
    assert_equal "played", @matchday.status
    red = @matchday.teams.find_by!(color: "red")
    assert_equal @attendees.first(5).map(&:id).sort, red.team_memberships.pluck(:player_id).sort
    assert_equal [ "defender" ], red.team_memberships.pluck(:position).uniq
  end

  test "confirming is refused when the teams do not match who showed up" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params(team_count: 2)

    patch confirm_matchday_path(@matchday), params: {
      teams: [
        { color: "red", members: [ { player_id: @attendees.first.id, position: "defender" } ] },
        { color: "blue", members: [] }
      ]
    }

    assert_redirected_to matchday_path(@matchday)
    assert_equal "building", @matchday.reload.status
    assert_match "no coinciden", flash[:alert]
  end

  test "capturing the score with two teams moves everyone who played" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params(team_count: 2)

    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }
    assert_redirected_to matchday_path(@matchday)

    @matchday.reload
    assert_equal [ 3, 5 ], @matchday.teams.pluck(:goals).sort
    assert @matchday.result?
    assert_equal Player.active.count, @matchday.score_snapshots.count

    moved = Player.where(id: @attendees.map(&:id)).pluck(:elo).map(&:to_f)
    assert moved.any?(&:positive?), "the winners should have gone up"
    assert moved.any?(&:negative?), "the losers should have gone down"
  end

  test "capturing matches won with three teams" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params(team_count: 3)

    patch update_result_matchday_path(@matchday),
      params: { result: { red: 3, blue: 1, white: 0 } }

    @matchday.reload
    assert_equal [ 0, 1, 3 ], @matchday.teams.pluck(:wins).sort
    assert_equal [ nil ], @matchday.teams.pluck(:goals).uniq
  end

  test "the Saturday screen says how much each player moved" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params(team_count: 2)
    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }

    get matchday_path(@matchday)
    changes = inertia_props["changes"]
    assert_equal @attendees.size, changes.size
    assert changes.values.any? { |delta| delta.positive? }
    assert changes.values.any? { |delta| delta.negative? }
  end

  test "rebuilding a Saturday that was already scored wipes the result" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params(team_count: 2)
    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }

    post generate_matchday_path(@matchday), params: generate_params(team_count: 3)

    @matchday.reload
    assert_equal 3, @matchday.teams.count
    assert_not @matchday.result?
    assert_nil @matchday.ratings_open_at
    assert_match "Se borró el resultado", flash[:notice]
    assert_equal [ 0.0 ], Player.pluck(:elo).map(&:to_f).uniq
  end

  test "clearing the result puts the adjustments and the snapshots back" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params(team_count: 2)
    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }

    patch update_result_matchday_path(@matchday), params: { result: { red: "", blue: "" } }

    assert_not @matchday.reload.result?
    assert_equal [ 0.0 ], Player.pluck(:elo).map(&:to_f).uniq
    assert_equal 0, ScoreSnapshot.count
    assert_match "borrado", flash[:notice]
  end

  test "more than three teams are allowed when enough showed up" do
    log_in_as(@admin)

    post generate_matchday_path(@matchday), params: generate_params(team_count: 4)

    @matchday.reload
    assert_equal 4, @matchday.team_count
    assert_equal %w[ black blue red white ], @matchday.teams.pluck(:color).sort
    assert_equal @attendees.size, TeamMembership.where(team: @matchday.teams).count

    patch update_result_matchday_path(@matchday),
      params: { result: { red: 3, blue: 2, white: 1, black: 0 } }

    @matchday.reload
    assert_equal [ 0, 1, 2, 3 ], @matchday.teams.pluck(:wins).sort
    assert_equal [ nil ], @matchday.teams.pluck(:goals).uniq
    moved = Player.where(id: @attendees.map(&:id)).pluck(:elo).map(&:to_f)
    assert moved.any?(&:positive?), "the winners should have gone up"
    assert moved.any?(&:negative?), "the losers should have gone down"
  end

  test "more teams than there are jerseys is refused" do
    log_in_as(@admin)

    post generate_matchday_path(@matchday),
      params: generate_params(team_count: Matchday::TEAM_COUNTS.last + 1)

    assert_redirected_to matchday_path(@matchday)
    assert_equal 0, @matchday.reload.teams.count
    assert_match "Elige entre 2 y #{Matchday::TEAM_COUNTS.last}", flash[:alert]
  end

  test "the date of the Saturday comes from the wizard" do
    log_in_as(@admin)

    assert_difference -> { Matchday.count }, 1 do
      post matchdays_path, params: { played_on: "2026-11-07" }
    end
    matchday = Matchday.find_by!(played_on: Date.new(2026, 11, 7))
    assert_redirected_to matchday_path(matchday)
  end

  test "a date that already has a Saturday reopens it" do
    log_in_as(@admin)

    assert_no_difference -> { Matchday.count } do
      post matchdays_path, params: { played_on: @matchday.played_on.iso8601 }
    end
    assert_redirected_to matchday_path(@matchday)
    assert_match "ya estaba abierto", flash[:notice]
  end

  test "a Saturday still being built can be discarded" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params

    assert_difference -> { Matchday.count }, -1 do
      delete matchday_path(@matchday)
    end
    assert_redirected_to matchdays_path
  end

  test "deleting a scored Saturday takes it out of the ladder too" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params
    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }
    assert Player.pluck(:elo).map(&:to_f).any?(&:nonzero?)

    assert_difference -> { Matchday.count }, -1 do
      delete matchday_path(@matchday)
    end

    assert_equal [ 0.0 ], Player.pluck(:elo).map(&:to_f).uniq
    assert_equal 0, ScoreSnapshot.count
  end

  test "the date of a Saturday can be corrected, but not onto another one" do
    log_in_as(@admin)
    other = Matchday.create!(played_on: Date.new(2026, 12, 5))

    patch matchday_path(@matchday), params: { played_on: "2026-12-12" }
    assert_equal Date.new(2026, 12, 12), @matchday.reload.played_on
    assert_match "Fecha actualizada", flash[:notice]

    patch matchday_path(@matchday), params: { played_on: other.played_on.iso8601 }
    assert_equal Date.new(2026, 12, 12), @matchday.reload.played_on
    assert_match "Ya hay un sábado", flash[:alert]
  end

  test "the admin can reopen the rating window and shut it again" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params
    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }

    patch ratings_matchday_path(@matchday), params: { open: false }
    assert_not @matchday.reload.ratings_open?

    patch ratings_matchday_path(@matchday), params: { open: true }
    assert @matchday.reload.ratings_open?
    assert_nil @matchday.ratings_settled_at
  end

  test "reopening ratings needs a result first" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params

    patch ratings_matchday_path(@matchday), params: { open: true }
    assert_nil @matchday.reload.ratings_open_at
    assert_match "Primero guarda el resultado", flash[:alert]
  end

  test "non-admins cannot discard a Saturday" do
    log_in_as(@user)

    assert_no_difference -> { Matchday.count } do
      delete matchday_path(@matchday)
    end
    assert_redirected_to root_path
  end

  test "saving the result opens the rating window and clearing it shuts it" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params

    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }
    assert @matchday.reload.ratings_open?
    assert_match "Calificaciones abiertas", flash[:notice]

    patch update_result_matchday_path(@matchday), params: { result: { red: "", blue: "" } }
    assert_nil @matchday.reload.ratings_open_at
  end

  test "correcting a result does not restart the twelve hours" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params
    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }
    opened_at = @matchday.reload.ratings_open_at

    travel 2.hours do
      patch update_result_matchday_path(@matchday), params: { result: { red: 6, blue: 3 } }
    end

    assert_equal opened_at.to_i, @matchday.reload.ratings_open_at.to_i
  end

  test "the Saturday screen says who still owes a rating" do
    log_in_as(@admin)
    post generate_matchday_path(@matchday), params: generate_params
    patch update_result_matchday_path(@matchday), params: { result: { red: 5, blue: 3 } }

    get matchday_path(@matchday)
    ratings = inertia_props["ratings"]
    assert ratings["open"]
    # Beto is the only attendee with an account, and he has rated nobody today.
    assert_equal [ players(:beto).name ], ratings["pending"]
    assert_equal @attendees.size - 1, ratings["unlinked"]
    assert_not_includes ratings.to_json, "rater"
  end

  private
    def generate_params(team_count: 2)
      { player_ids: @attendees.map(&:id), team_count: team_count }
    end
end
