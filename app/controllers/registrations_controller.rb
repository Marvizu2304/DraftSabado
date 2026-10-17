class RegistrationsController < ApplicationController
  allow_unauthenticated_access only: %i[ new create ]
  before_action :redirect_if_authenticated, only: :new
  rate_limit to: 10, within: 3.minutes, only: :create,
             with: -> { redirect_to signup_path, alert: "Intenta de nuevo más tarde." }

  def new
    render inertia: "auth/Signup"
  end

  def create
    user = User.new(user_params.merge(status: "pending"))
    player = Player.new(player_params.merge(active: false))

    if user.valid? && player.valid?
      User.transaction do
        user.save!
        player.update!(user: user)
      end
      redirect_to login_path, notice: "Solicitud enviada. Un admin la revisará antes de que puedas entrar."
    else
      redirect_to signup_path, inertia: { errors: form_errors(player, user) }
    end
  end

  private
    def user_params
      params.permit(:email, :password, :timezone)
    end

    def player_params
      params.permit(:name, :age, :position)
    end

    def form_errors(*records)
      records.reduce({}) { |all, record| all.merge(record.errors.to_hash(true)) }
             .transform_values(&:first)
    end
end
