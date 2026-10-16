class SettingsController < ApplicationController
  before_action :require_admin, only: :update

  def show
    settings = GroupSetting.current

    render inertia: "Settings", props: {
      technique_weight: settings.technique_weight,
      elo_strength: settings.elo_strength,
      can_edit: Current.user.admin?
    }
  end

  def update
    settings = GroupSetting.current

    if settings.update(params.permit(:technique_weight, :elo_strength).compact_blank)
      # The strength is a factor of every past result, so moving it replays them.
      EloLadder.recalculate! if settings.saved_change_to_elo_strength?
      redirect_to settings_path, notice: "Ajustes del grupo actualizados."
    else
      redirect_to settings_path, inertia: { errors: settings.errors.to_hash(true).transform_values(&:first) }
    end
  end
end
