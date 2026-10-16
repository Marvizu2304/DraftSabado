require "test_helper"

class ScoreboardTest < ActiveSupport::TestCase
  setup do
    Rating.delete_all
    @player = players(:memo)
    @other = players(:beto)
    @settings = GroupSetting.current
  end

  test "a player nobody has rated, in a group nobody has rated, has no numbers" do
    board = Scoreboard.new(settings: @settings)

    assert_nil board.technique(@player)
    assert_nil board.physical(@player)
    assert_nil board.overall(@player)
    assert_equal 0, board.ratings_count(@player)
  end

  test "one or two ratings average plainly" do
    rate(@player, 8, 6)
    assert_equal 8.0, Scoreboard.new(settings: @settings).technique(@player)

    rate(@player, 6, 10)
    board = Scoreboard.new(settings: @settings)
    assert_equal 7.0, board.technique(@player)
    assert_equal 8.0, board.physical(@player)
    assert_equal 2, board.ratings_count(@player)
  end

  test "three ratings drop the highest and the lowest, leaving the middle one" do
    rate(@player, 4, 4)
    rate(@player, 7, 7)
    rate(@player, 10, 10)

    assert_equal 7.0, Scoreboard.new(settings: @settings).technique(@player)
  end

  test "four ratings drop one at each end" do
    [ 2, 6, 8, 10 ].each { |value| rate(@player, value, value) }

    assert_equal 7.0, Scoreboard.new(settings: @settings).technique(@player)
  end

  test "five ratings drop one at each end" do
    [ 1, 5, 6, 7, 10 ].each { |value| rate(@player, value, value) }

    assert_equal 6.0, Scoreboard.new(settings: @settings).technique(@player)
  end

  test "the overall score mixes both axes with the group's weights" do
    rate(@player, 10, 5)

    assert_equal 60, @settings.technique_weight
    assert_equal 8.0, Scoreboard.new(settings: @settings).overall(@player)

    @settings.update!(technique_weight: 50)
    assert_equal 7.5, Scoreboard.new(settings: @settings).overall(@player)
  end

  test "a player with no ratings takes the group average" do
    rate(@player, 8, 4)

    board = Scoreboard.new(settings: @settings)
    assert_equal 8.0, board.technique(@other)
    assert_equal 4.0, board.physical(@other)
    assert_equal 0, board.ratings_count(@other)
  end

  test "players who are no longer in the group stay out of the group average" do
    rate(players(:retirado), 10, 10)

    board = Scoreboard.new(settings: @settings)
    assert_nil board.technique(@other)
    assert_equal 10.0, board.technique(players(:retirado))
  end

  private
    def rate(player, technique, physical)
      rater = User.create!(email: "rater#{SecureRandom.hex(4)}@example.com", password: "password")
      Rating.create!(rater: rater, player: player, technique: technique, physical: physical)
    end
end
