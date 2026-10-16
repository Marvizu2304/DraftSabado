class Player < ApplicationRecord
  POSITIONS = %w[ goalkeeper defender midfielder forward ].freeze

  belongs_to :user, optional: true
  has_many :ratings, dependent: :destroy
  has_many :attendances, dependent: :destroy
  has_many :team_memberships, dependent: :destroy
  has_many :score_snapshots, dependent: :destroy

  normalizes :name, with: ->(n) { n.strip }

  validates :name, presence: true
  validates :age, numericality: { only_integer: true, in: 10..99 }
  validates :position, inclusion: { in: POSITIONS }
  validates :user_id, uniqueness: true, allow_nil: true

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:name) }
end
