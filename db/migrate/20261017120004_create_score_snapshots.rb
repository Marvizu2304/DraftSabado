class CreateScoreSnapshots < ActiveRecord::Migration[8.0]
  def change
    create_table :score_snapshots do |t|
      t.references :player, null: false, foreign_key: true
      t.references :matchday, null: false, foreign_key: true
      t.decimal :overall, precision: 4, scale: 2
      t.decimal :elo, precision: 4, scale: 2, null: false, default: 0

      t.timestamps
    end

    add_index :score_snapshots, [ :player_id, :matchday_id ], unique: true
  end
end
