class Admin::UsersController < Admin::BaseController
  before_action :set_user, only: %i[ show approve reject ]

  def index
    users = User.includes(:player).order(created_at: :asc)
    render inertia: "admin/users/Index", props: {
      users: users.map { |user| user_summary(user) }
    }
  end

  def show
    render inertia: "admin/users/Show", props: {
      user: user_detail(@user)
    }
  end

  def approve
    @user.approve!
    redirect_back fallback_location: admin_users_path, notice: "#{@user.email} aprobado."
  end

  def reject
    @user.reject!
    redirect_back fallback_location: admin_users_path, notice: "#{@user.email} rechazado."
  end

  private
    def set_user
      @user = User.find(params[:id])
    end

    def user_summary(user)
      {
        id: user.id,
        email: user.email,
        admin: user.admin?,
        status: user.status,
        player: user.player && {
          id: user.player.id,
          name: user.player.name,
          age: user.player.age,
          position: user.player.position
        },
        created_at: user.created_at.iso8601
      }
    end

    def user_detail(user)
      user_summary(user).merge(
        timezone: user.timezone,
        updated_at: user.updated_at.iso8601
      )
    end
end
