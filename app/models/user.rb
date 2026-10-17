class User < ApplicationRecord
  STATUSES = %w[ pending approved rejected ].freeze

  has_secure_password
  has_many :sessions, dependent: :destroy
  has_one :player, dependent: :nullify

  normalizes :email, with: ->(e) { e.strip.downcase }

  validates :email, presence: true, uniqueness: { case_sensitive: false },
                            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 7 }, allow_nil: true
  validates :status, inclusion: { in: STATUSES }

  scope :pending, -> { where(status: "pending") }

  STATUSES.each do |value|
    define_method("#{value}?") { status == value }
  end

  # Aprobar/rechazar tambien prende o apaga al jugador en el plantel.
  def approve!
    transaction do
      update!(status: "approved")
      player&.update!(active: true)
    end
  end

  def reject!
    transaction do
      update!(status: "rejected")
      player&.update!(active: false)
      sessions.destroy_all
    end
  end
end
