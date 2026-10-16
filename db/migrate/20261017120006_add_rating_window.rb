class AddRatingWindow < ActiveRecord::Migration[8.0]
  def change
    add_column :matchdays, :ratings_open_at, :datetime
    add_reference :ratings, :matchday, null: true, foreign_key: true
  end
end
