# What a player was worth the day a Saturday was closed. The overall is frozen
# here because the group's ratings keep moving; the elo is rewritten whenever
# the results are replayed. Together they draw the evolution charts.
class ScoreSnapshot < ApplicationRecord
  belongs_to :player
  belongs_to :matchday

  scope :chronological, -> { joins(:matchday).includes(:matchday).order("matchdays.played_on") }

  # What the charts draw: the ratings of that day plus the adjustment he carried.
  def value
    ((overall&.to_f || EloLadder::MIDPOINT) + elo.to_f).round(2)
  end
end
