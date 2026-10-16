class CreateMatchdays < ActiveRecord::Migration[8.0]
  def change
    create_table :matchdays do |t|
      t.date :played_on, null: false
      t.integer :team_count, null: false, default: 2
      t.string :status, null: false, default: "building"

      t.timestamps
    end

    add_index :matchdays, :played_on, unique: true
  end
end
