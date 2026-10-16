class AddRatingsSettledAtToMatchdays < ActiveRecord::Migration[8.0]
  def change
    add_column :matchdays, :ratings_settled_at, :datetime
  end
end
