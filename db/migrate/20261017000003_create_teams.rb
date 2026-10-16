class CreateTeams < ActiveRecord::Migration[8.0]
  def change
    create_table :teams do |t|
      t.references :matchday, null: false, foreign_key: true
      t.string :color, null: false

      t.timestamps
    end

    add_index :teams, [ :matchday_id, :color ], unique: true
  end
end
