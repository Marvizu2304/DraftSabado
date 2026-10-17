require "test_helper"

class RegistrationsControllerTest < ActionDispatch::IntegrationTest
  VALID = {
    name: "Nuevo Jugador",
    age: 28,
    position: "defender",
    email: "new@example.com",
    password: "secret123",
    timezone: "America/Mexico_City"
  }.freeze

  test "GET /signup renders the signup page" do
    get signup_path
    assert_response :success
  end

  test "creates a pending user with an inactive player and no session" do
    assert_difference [ -> { User.count }, -> { Player.count } ], 1 do
      assert_no_difference -> { Session.count } do
        post signup_path, params: VALID
      end
    end

    assert_redirected_to login_path

    user = User.find_by(email: "new@example.com")
    assert user.pending?
    assert_equal "America/Mexico_City", user.timezone
    assert user.authenticate("secret123")

    player = user.player
    assert_equal "Nuevo Jugador", player.name
    assert_equal 28, player.age
    assert_equal "defender", player.position
    assert_not player.active
  end

  test "a pending user cannot reach the app" do
    post signup_path, params: VALID
    get players_path
    assert_redirected_to login_path
  end

  test "rejects an invalid email" do
    assert_no_difference [ -> { User.count }, -> { Player.count } ] do
      post signup_path, params: VALID.merge(email: "not-an-email")
    end

    assert_redirected_to signup_path
  end

  test "rejects a password shorter than 7 characters" do
    assert_no_difference -> { User.count } do
      post signup_path, params: VALID.merge(password: "abc123")
    end

    assert_redirected_to signup_path
  end

  test "rejects a duplicate email" do
    assert_no_difference [ -> { User.count }, -> { Player.count } ] do
      post signup_path, params: VALID.merge(email: users(:one).email)
    end

    assert_redirected_to signup_path
  end

  test "rejects missing player details without creating the user" do
    assert_no_difference [ -> { User.count }, -> { Player.count } ] do
      post signup_path, params: VALID.merge(name: "", age: 5)
    end

    assert_redirected_to signup_path
  end
end
