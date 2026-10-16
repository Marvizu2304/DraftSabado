class CreateGroupSettings < ActiveRecord::Migration[8.0]
  def change
    create_table :group_settings do |t|
      t.integer :technique_weight, null: false, default: 60

      t.timestamps
    end
  end
end
