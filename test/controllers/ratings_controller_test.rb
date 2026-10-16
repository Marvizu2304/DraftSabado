require "test_helper"

class RatingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)      # linked to players(:beto)
    @me = players(:beto)
    @other = players(:memo)
  end

  test "unauthenticated visitors are sent to login" do
    get ratings_path
    assert_redirected_to login_path
  end

  test "the screen lists everyone else, never yourself and never a baja" do
    log_in_as(@user)
    get ratings_path
    assert_response :success

    ids = inertia_props["players"].map { |player| player["id"] }
    assert_includes ids, @other.id
    assert_not_includes ids, @me.id
    assert_not_includes ids, players(:retirado).id
    assert inertia_props["linked"]
  end

  test "the screen shows my own ratings and nobody else's" do
    log_in_as(@user)
    get ratings_path

    props = inertia_props
    mine = props["players"].find { |player| player["id"] == @other.id }
    assert_equal 8, mine["technique"]
    assert_equal 6, mine["physical"]

    # Nothing anywhere in the payload points at who rated whom.
    assert_not_includes props.to_json, "rater"
  end

  test "an account with no player linked cannot rate" do
    log_in_as(users(:two))
    get ratings_path
    assert_response :success

    assert_not inertia_props["linked"]
    assert_empty inertia_props["players"]
  end

  test "only active players can be rated" do
    log_in_as(@user)

    assert_no_difference -> { Rating.count } do
      patch ratings_path, params: { player_id: players(:retirado).id, technique: 5, physical: 5 }, as: :json
    end
    assert_response :not_found
  end

  test "the autosave creates a rating and then updates the same one" do
    log_in_as(@user)
    fresh = Player.create!(name: "Nuevo", age: 25, position: "forward")

    assert_difference -> { Rating.count }, 1 do
      patch ratings_path, params: { player_id: fresh.id, technique: 9, physical: 3 }, as: :json
    end
    assert_response :ok

    assert_no_difference -> { Rating.count } do
      patch ratings_path, params: { player_id: fresh.id, technique: 4, physical: 4 }, as: :json
    end
    assert_response :ok

    rating = Rating.find_by(rater: @user, player: fresh)
    assert_equal [ 4, 4 ], [ rating.technique, rating.physical ]
  end

  test "an out-of-range rating is refused and nothing is saved" do
    log_in_as(@user)

    assert_no_difference -> { Rating.count } do
      patch ratings_path, params: { player_id: @other.id, technique: 11, physical: 3 }, as: :json
    end
    assert_response :unprocessable_entity
  end

  test "the server refuses a self-rating even if the screen never offers it" do
    log_in_as(@user)

    assert_no_difference -> { Rating.count } do
      patch ratings_path, params: { player_id: @me.id, technique: 10, physical: 10 }, as: :json
    end
    assert_response :unprocessable_entity
  end

  test "with a window open only that Saturday's players are listed" do
    outsider = Player.create!(name: "No fue", age: 30, position: "forward")
    open_window

    log_in_as(@user)
    get ratings_path

    props = inertia_props
    assert props["open"]
    assert props["eligible"]
    assert_equal [ @other.id ], props["players"].map { |player| player["id"] }
    assert_not_includes props["players"].map { |player| player["id"] }, outsider.id
    assert props["closes_at"].present?
  end

  test "a rating given before the window does not count as done" do
    open_window

    log_in_as(@user)
    get ratings_path

    # Beto already rated Memo in the fixtures, but not for this Saturday.
    assert_not inertia_props["players"].first["done"]

    patch ratings_path, params: { player_id: @other.id, technique: 7, physical: 7 }, as: :json
    assert_response :ok

    get ratings_path
    assert inertia_props["players"].first["done"]
  end

  test "somebody who did not play cannot rate" do
    matchday = open_window
    matchday.attendances.find_by(player: @me).destroy!

    log_in_as(@user)
    get ratings_path
    assert_not inertia_props["eligible"]

    patch ratings_path, params: { player_id: @other.id, technique: 7, physical: 7 }, as: :json
    assert_response :forbidden
  end

  test "once the twelve hours are up nothing more is saved" do
    matchday = open_window
    matchday.update!(ratings_open_at: 13.hours.ago)

    log_in_as(@user)
    get ratings_path
    assert_not inertia_props["open"]
    assert_empty inertia_props["players"]

    patch ratings_path, params: { player_id: @other.id, technique: 7, physical: 7 }, as: :json
    assert_response :forbidden
  end

  test "the nudge rides along on every page until the ratings are in" do
    open_window
    log_in_as(@user)

    get players_path
    assert_equal 1, inertia_props["rating_prompt"]["pending"]

    patch ratings_path, params: { player_id: @other.id, technique: 7, physical: 7 }, as: :json

    get players_path
    assert_nil inertia_props["rating_prompt"]
  end

  private
    # A Saturday both Beto and Memo played, with its result already on the board.
    def open_window
      matchday = Matchday.create!(played_on: Date.current, team_count: 2)
      [ @me, @other ].each { |player| matchday.attendances.create!(player: player) }
      matchday.teams.create!(color: "black", goals: 3)
      matchday.teams.create!(color: "white", goals: 1)
      matchday.update!(ratings_open_at: Time.current)
      matchday
    end
end
