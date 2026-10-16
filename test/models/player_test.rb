require "test_helper"

class PlayerTest < ActiveSupport::TestCase
  test "requires a name, a sane age and a known position" do
    player = Player.new

    assert_not player.valid?
    assert_includes player.errors.attribute_names, :name
    assert_includes player.errors.attribute_names, :age
    assert_includes player.errors.attribute_names, :position

    player.assign_attributes(name: "Nuevo", age: 9, position: "portero")
    assert_not player.valid?
    assert_includes player.errors.attribute_names, :age
    assert_includes player.errors.attribute_names, :position

    player.assign_attributes(age: 30, position: "forward")
    assert player.valid?
  end

  test "trims the name and starts active" do
    player = Player.create!(name: "  Lalo  ", age: 25, position: "defender")

    assert_equal "Lalo", player.name
    assert player.active?
  end

  test "an account can only be linked to one player" do
    duplicate = Player.new(name: "Clon", age: 30, position: "forward", user: users(:one))

    assert_not duplicate.valid?
    assert_includes duplicate.errors.attribute_names, :user_id
  end

  test "active scope leaves out the players given de baja" do
    assert_includes Player.active, players(:memo)
    assert_not_includes Player.active, players(:retirado)
  end
end
