class WidenEloPrecision < ActiveRecord::Migration[8.0]
  def change
    # Two decimals throw away half the resolution of a single Saturday, which is
    # worth about five hundredths of a point. Three keeps the history honest.
    change_column :players, :elo, :decimal, precision: 5, scale: 3, null: false, default: 0
    change_column :score_snapshots, :elo, :decimal, precision: 5, scale: 3, null: false, default: 0
  end
end
