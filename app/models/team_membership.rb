# Who played where. The position is the one played that day, which starts from
# the player's preferred one and can be changed by hand.
class TeamMembership < ApplicationRecord
  belongs_to :team
  belongs_to :player

  validates :position, inclusion: { in: Player::POSITIONS }
  validates :player_id, uniqueness: { scope: :team_id }
end
