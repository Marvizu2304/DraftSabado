class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ new create ]
  before_action :redirect_if_authenticated, only: :new
  rate_limit to: 10, within: 3.minutes, only: :create,
             with: -> { redirect_to login_path, alert: "Intenta de nuevo más tarde." }

  def new
    render inertia: "auth/Login"
  end

  def create
    user = User.authenticate_by(params.permit(:email, :password))

    if user.nil?
      redirect_to login_path, inertia: { errors: { base: "Correo o contraseña incorrectos." } }
    elsif !user.approved?
      redirect_to login_path, inertia: { errors: { base: pending_or_rejected_message(user) } }
    else
      start_new_session_for(user)
      redirect_to after_authentication_url
    end
  end

  def destroy
    terminate_session
    redirect_to login_path
  end

  private
    def pending_or_rejected_message(user)
      if user.rejected?
        "Tu solicitud fue rechazada. Habla con un admin del grupo."
      else
        "Tu solicitud sigue pendiente de aprobación."
      end
    end
end
