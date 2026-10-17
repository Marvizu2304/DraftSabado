require "application_system_test_case"

# The twelve-hour window from the player's side: who he gets to rate, and what
# happens when the window shuts.
class RatingsTest < ApplicationSystemTestCase
  NAMES = %w[ Ari Bruno Caio Dante ].freeze

  setup do
    @user = users(:one)          # linked to players(:beto)
    @me = players(:beto)
    @others = NAMES.map { |name| Player.create!(name: name, age: 28, position: "midfielder") }
    @matchday = scored_matchday
  end

  test "an attendee rates the others and the counter comes down" do
    log_in_as(@user)

    assert_text "por calificar"            # the nudge, on every screen
    click_on "Te faltan", match: :first

    assert_text "Te faltan 4 de 4"
    NAMES.each { |name| assert_text name }
    assert_no_text @me.name                # never yourself
    assert_no_text "Memo"                  # and never somebody who did not play

    # Someone he already rated on an earlier Saturday: the sliders come
    # preloaded, so confirming them is one tap.
    assert_selector "button", text: "Sigue igual", count: 1
    click_on "Sigue igual"
    assert_text "Te faltan 3 de 4"
    assert_text "Guardado"

    # And somebody he has never rated: move the slider and it saves itself.
    find("#technique-#{@others[1].id}").send_keys(:arrow_right)
    find("#physical-#{@others[1].id}").send_keys(:arrow_right)
    assert_text "Te faltan 2 de 4"
  end

  test "once the twelve hours are up the screen is shut" do
    @matchday.update!(ratings_open_at: 13.hours.ago)
    log_in_as(@user)

    visit ratings_path
    assert_text "No hay calificaciones abiertas"
    assert_no_text "Sigue igual"
  end

  test "somebody who did not play cannot rate" do
    @matchday.attendances.find_by!(player: @me).destroy!
    log_in_as(@user)

    visit ratings_path
    assert_text "solo para quienes jugaron"
  end

  private
    def log_in_as(user)
      visit login_path
      fill_in "Correo", with: user.email
      fill_in "Contraseña", with: "password"
      click_on "Entrar"
      assert_text "Retas"
    end

    # A Saturday Beto played, already scored, so its rating window is running.
    def scored_matchday
      matchday = Matchday.create!(played_on: Date.current, team_count: 2)
      attendees = [ @me ] + @others

      attendees.each { |player| Attendance.create!(matchday: matchday, player: player) }
      attendees.each_slice(3).with_index do |group, index|
        team = Team.create!(matchday: matchday, color: Team::COLORS[index], goals: 3 - index)
        group.each { |player| TeamMembership.create!(team: team, player: player, position: "midfielder") }
      end

      matchday.update!(ratings_open_at: Time.current)
      # A rating from before this Saturday: it does not count as done today.
      Rating.create!(rater: @user, player: @others.first, technique: 7, physical: 6)
      matchday
    end
end
