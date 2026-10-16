# One Saturday: who showed up, how many teams, and how they were split.
class Matchday < ApplicationRecord
  STATUSES = %w[ building played ].freeze
  TEAM_COUNTS = (2..Team::COLORS.size).to_a.freeze

  # Under this many a side is too thin to play, so it is what decides how many
  # teams to suggest. Two or three is the usual answer; more is allowed.
  PLAYERS_PER_TEAM = 6

  # How long the group has to rate each other once the result is on the board.
  RATING_WINDOW = 12.hours

  has_many :attendances, dependent: :destroy
  has_many :players, through: :attendances
  has_many :teams, -> { order(:id) }, dependent: :destroy
  has_many :score_snapshots, dependent: :destroy
  has_many :ratings, dependent: :nullify

  validates :played_on, presence: true, uniqueness: true
  validates :team_count, inclusion: { in: TEAM_COUNTS }
  validates :status, inclusion: { in: STATUSES }

  scope :ordered, -> { order(played_on: :desc) }
  scope :with_result, -> { where(id: Team.where.not(goals: nil).or(Team.where.not(wins: nil)).select(:matchday_id)) }
  scope :rating_open, -> { where(ratings_open_at: RATING_WINDOW.ago..) }
  scope :needing_settlement, lambda {
    where(ratings_settled_at: nil).where.not(ratings_open_at: nil).where(ratings_open_at: ...RATING_WINDOW.ago)
  }

  # The one Saturday the group is rating right now, if any.
  def self.open_for_ratings
    rating_open.order(:ratings_open_at).last
  end

  # The ratings given during a window land after the ladder was replayed, so
  # the elo of that Saturday was worked out without them. Once a window shuts,
  # replay it one last time. This is the work a scheduled job would do, done by
  # the first request that notices instead — the window closing is derived from
  # a timestamp, so there is nothing to wake up.
  def self.settle_closed_windows!
    pending = needing_settlement.pluck(:id)
    return if pending.empty?

    transaction do
      EloLadder.recalculate!
      where(id: pending).update_all(ratings_settled_at: Time.current)
    end
  end

  def self.suggested_team_count(attendee_count)
    (attendee_count / PLAYERS_PER_TEAM).clamp(TEAM_COUNTS.first, TEAM_COUNTS.last)
  end

  def built?
    teams.any?
  end

  # Captured on the field. Until there is one, the teams can still be redone.
  def result?
    teams.any? { |team| team.goals.present? || team.wins.present? }
  end

  def ratings_close_at
    ratings_open_at && ratings_open_at + RATING_WINDOW
  end

  # The window closes by itself twelve hours in: nothing has to run at that
  # moment, so there is no job behind it — only this comparison.
  def ratings_open?
    ratings_open_at.present? && Time.current < ratings_close_at
  end

  def ratings_closed?
    ratings_open_at.present? && !ratings_open?
  end

  # What the screens label the Saturday with, start to finish.
  def state
    return "closed" if ratings_closed?
    return "rating" if ratings_open?
    status == "played" ? "confirmed" : "building"
  end
end
