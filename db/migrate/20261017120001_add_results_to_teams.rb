class AddResultsToTeams < ActiveRecord::Migration[8.0]
  def change
    # Goals when the Saturday is played with two teams, matches won when it is
    # played with three. Null means the result has not been captured yet.
    add_column :teams, :goals, :integer
    add_column :teams, :wins, :integer
  end
end
