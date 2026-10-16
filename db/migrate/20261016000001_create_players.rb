class CreatePlayers < ActiveRecord::Migration[8.0]
  def change
    create_table :players do |t|
      t.string :name, null: false
      t.integer :age, null: false
      t.string :position, null: false
      t.boolean :active, null: false, default: true
      t.references :user, null: true, foreign_key: true, index: { unique: true }

      t.timestamps
    end
  end
end
