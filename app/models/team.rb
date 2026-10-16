# One of the sides of a Saturday. Colors are what gets shouted on the field, so
# they double as the team's identity — and the list of them is what caps how
# many teams a Saturday can be split into.
class Team < ApplicationRecord
  # Rojo, azul y blanco son los que el grupo trae siempre; el resto entra como caiga.
  COLORS = %w[ red blue white black orange green ].freeze

  belongs_to :matchday
  has_many :team_memberships, -> { order(:id) }, dependent: :destroy
  has_many :players, through: :team_memberships

  validates :color, inclusion: { in: COLORS }, uniqueness: { scope: :matchday_id }
  validates :goals, :wins, numericality: { only_integer: true, in: 0..99 }, allow_nil: true
end
