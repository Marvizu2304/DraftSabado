class AddStatusToUsers < ActiveRecord::Migration[8.0]
  def up
    add_column :users, :status, :string, null: false, default: "pending"
    add_index :users, :status
    User.update_all(status: "approved")
  end

  def down
    remove_column :users, :status
  end
end
