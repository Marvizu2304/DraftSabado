class CreateRatings < ActiveRecord::Migration[8.0]
  def change
    create_table :ratings do |t|
      t.references :rater, null: false, foreign_key: { to_table: :users }
      t.references :player, null: false, foreign_key: true
      t.integer :technique, null: false
      t.integer :physical, null: false

      t.timestamps
    end

    add_index :ratings, %i[ rater_id player_id ], unique: true
  end
end
