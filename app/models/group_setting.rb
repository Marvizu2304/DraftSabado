# One row for the whole group. The physical weight is never stored: it is
# whatever is left of 100, so the two can never drift out of sync.
class GroupSetting < ApplicationRecord
  validates :technique_weight, numericality: { only_integer: true, in: 0..100 }
  validates :elo_strength, numericality: { only_integer: true, in: 2..30 }

  def self.current
    first || create!
  end

  def physical_weight
    100 - technique_weight
  end

  # Hundredths of a point: how much an even match moves a player's adjustment.
  def elo_k
    elo_strength / 100.0
  end
end
