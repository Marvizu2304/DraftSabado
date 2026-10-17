require "test_helper"

class Admin::UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @user = users(:one)
    @password = "password"
  end

  test "unauthenticated users are redirected to login" do
    get admin_users_path
    assert_redirected_to login_path
  end

  test "non-admin users are redirected to root with an alert" do
    log_in_as(@user)
    get admin_users_path
    assert_redirected_to root_path
    assert_equal "You don't have access to that page.", flash[:alert]
  end

  test "admin users can list users" do
    log_in_as(@admin)
    get admin_users_path
    assert_response :success
  end

  test "admin users can view a single user" do
    log_in_as(@admin)
    get admin_user_path(@user)
    assert_response :success
  end

  test "non-admin users cannot view a single user" do
    log_in_as(@user)
    get admin_user_path(@user)
    assert_redirected_to root_path
  end

  test "non-admin users cannot reach admin design system" do
    log_in_as(@user)
    get admin_design_system_path
    assert_redirected_to root_path
  end

  test "admin users can reach admin design system" do
    log_in_as(@admin)
    get admin_design_system_path
    assert_response :success
  end

  test "admin approves a pending account and activates its player" do
    log_in_as(@admin)
    pending = users(:pendiente)

    patch approve_admin_user_path(pending)

    assert_redirected_to admin_users_path
    assert pending.reload.approved?
    assert pending.player.active
  end

  test "admin rejects an account, deactivates its player and kills its sessions" do
    log_in_as(@admin)
    pending = users(:pendiente)
    pending.sessions.create!

    patch reject_admin_user_path(pending)

    assert_redirected_to admin_users_path
    assert pending.reload.rejected?
    assert_not pending.player.active
    assert_empty pending.sessions
  end

  test "non-admin users cannot approve accounts" do
    log_in_as(@user)
    pending = users(:pendiente)

    patch approve_admin_user_path(pending)

    assert_redirected_to root_path
    assert pending.reload.pending?
  end

  private
    def log_in_as(user)
      post login_path, params: { email: user.email, password: @password }
    end
end
