class Rating < ApplicationRecord
  SCALE = 1..10

  belongs_to :rater, class_name: "User"
  belongs_to :player
  # Which Saturday this rating was last given for; nil before the group ever had a window.
  belongs_to :matchday, optional: true

  validates :technique, numericality: { only_integer: true, in: SCALE }
  validates :physical, numericality: { only_integer: true, in: SCALE }
  validates :player_id, uniqueness: { scope: :rater_id }
  validate :not_rating_self

  private
    def not_rating_self
      errors.add(:player, "no se puede calificar a uno mismo") if player && player.user_id == rater_id
    end
end
