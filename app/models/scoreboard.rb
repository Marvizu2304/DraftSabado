# Turns the group's private ratings into the numbers the app shows. Built once per
# request: every rating is loaded in a single query, so asking it about 26 players
# costs nothing extra.
#
# Per the PRD: three or more ratings drop the highest and the lowest; one or two
# average plainly; none falls back to the group average.
class Scoreboard
  def initialize(settings: GroupSetting.current)
    @technique_weight = settings.technique_weight / 100.0
    @active_ids = Player.active.pluck(:id).to_set
    @rows = Rating.pluck(:player_id, :technique, :physical).group_by(&:first)
  end

  def ratings_count(player)
    rows_for(player).size
  end

  def technique(player)
    axis(player, 1)
  end

  def physical(player)
    axis(player, 2)
  end

  def overall(player)
    t, p = technique(player), physical(player)
    return nil unless t && p

    (t * @technique_weight + p * (1 - @technique_weight)).round(1)
  end

  private
    def rows_for(player)
      @rows[player.id] || []
    end

    def axis(player, index)
      value = trimmed(rows_for(player).map { |row| row[index] }) || group_average(index)
      value&.round(1)
    end

    def trimmed(values)
      return nil if values.empty?

      values = values.sort
      values = values[1..-2] if values.size >= 3
      values.sum.to_f / values.size
    end

    # Average of everyone who does have ratings, so an unrated player starts in the
    # middle of the group instead of at zero.
    def group_average(index)
      @group_averages ||= {}
      @group_averages[index] ||= begin
        means = @rows.filter_map do |player_id, rows|
          trimmed(rows.map { |row| row[index] }) if @active_ids.include?(player_id)
        end
        means.sum / means.size unless means.empty?
      end
    end
end
