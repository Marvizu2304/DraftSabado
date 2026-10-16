class AddEloStrengthToGroupSettings < ActiveRecord::Migration[8.0]
  def change
    # Hundredths of a point moved by an even match: 10 is 0.10.
    add_column :group_settings, :elo_strength, :integer, null: false, default: 10
  end
end
