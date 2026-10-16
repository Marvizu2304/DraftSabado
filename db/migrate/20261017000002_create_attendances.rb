class CreateAttendances < ActiveRecord::Migration[8.0]
  def change
    create_table :attendances do |t|
      t.references :matchday, null: false, foreign_key: true
      t.references :player, null: false, foreign_key: true

      t.timestamps
    end

    add_index :attendances, [ :matchday_id, :player_id ], unique: true
  end
end
