class CreateTeamMemberships < ActiveRecord::Migration[8.0]
  def change
    create_table :team_memberships do |t|
      t.references :team, null: false, foreign_key: true
      t.references :player, null: false, foreign_key: true
      t.string :position, null: false

      t.timestamps
    end

    add_index :team_memberships, [ :team_id, :player_id ], unique: true
  end
end
