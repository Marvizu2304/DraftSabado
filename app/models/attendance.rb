# The palomeo: this player showed up on this Saturday.
class Attendance < ApplicationRecord
  belongs_to :matchday
  belongs_to :player

  validates :player_id, uniqueness: { scope: :matchday_id }
end
