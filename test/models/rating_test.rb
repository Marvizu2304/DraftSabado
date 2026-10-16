require "test_helper"

class RatingTest < ActiveSupport::TestCase
  setup do
    @rater = users(:two)
    @player = players(:memo)
  end

  test "a rating needs both axes inside 1..10" do
    assert Rating.new(rater: @rater, player: @player, technique: 1, physical: 10).valid?
    assert_not Rating.new(rater: @rater, player: @player, technique: 0, physical: 5).valid?
    assert_not Rating.new(rater: @rater, player: @player, technique: 5, physical: 11).valid?
    assert_not Rating.new(rater: @rater, player: @player, technique: 7.5, physical: 5).valid?
  end

  test "one rating per pair of people" do
    Rating.create!(rater: @rater, player: @player, technique: 5, physical: 5)

    duplicate = Rating.new(rater: @rater, player: @player, technique: 8, physical: 8)
    assert_not duplicate.valid?
  end

  test "nobody rates themselves" do
    own = Rating.new(rater: users(:one), player: players(:beto), technique: 10, physical: 10)

    assert_not own.valid?
    assert_includes own.errors[:player], "no se puede calificar a uno mismo"
  end
end
