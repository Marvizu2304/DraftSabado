class AddEloToPlayers < ActiveRecord::Migration[8.0]
  def change
    # The adjustment real results add on top of the group's ratings, on the same
    # 1-10 scale: +0.4 means four tenths of a point better than his ratings say.
    add_column :players, :elo, :decimal, precision: 4, scale: 2, null: false, default: 0
  end
end
