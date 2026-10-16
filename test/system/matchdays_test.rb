require "application_system_test_case"

# The wizard end to end, in a real browser: the steps only move when they are
# meant to, and nothing is built until it is asked for.
class MatchdaysTest < ApplicationSystemTestCase
  NAMES = %w[ Ari Bruno Caio Dante Elio Facu Gael Hugo Ivan Javi ].freeze

  setup do
    @admin = users(:admin)
    @roster = NAMES.map { |name| Player.create!(name: name, age: 28, position: "midfielder") }
  end

  test "an admin builds a Saturday from the date to the confirmed teams" do
    log_in_as(@admin)

    click_on "Nuevo sábado"
    assert_text "La fecha de la jornada"
    # Comes preloaded with the Saturday the group is heading into.
    assert_equal next_saturday.iso8601, find("#played-on").value
    click_on "Abrir sábado"

    assert_text "#{next_saturday.day} de"
    assert_text "Palomea quién llegó"

    # Step one holds the line until enough players are ticked.
    assert_button "Siguiente", disabled: true
    check "Ari"
    check "Bruno"
    assert_button "Siguiente", disabled: true
    check "Caio"
    check "Dante"
    assert_button "Siguiente", disabled: false
    click_on "Siguiente"

    # Picking a distribution is only picking: nothing is built yet.
    assert_text "Distribución"
    click_on "2 equipos"
    assert_no_text "Rojos"
    assert_equal 0, Matchday.find_by!(played_on: next_saturday).teams.count

    click_on "Armar equipos"
    assert_text "Rojos"
    assert_text "Azules"

    click_on "Confirmar sábado"
    assert_text "Sábado confirmado."
    assert_text "Confirmado"
    assert_text "Resultado"
  end

  test "swapping two players moves the balance verdict, and undo puts it back" do
    matchday = built_matchday
    # Two heavy players on one side is what makes the split lopsided.
    @roster[0].update!(elo: 3.0)
    @roster[1].update!(elo: 1.0)

    log_in_as(@admin)
    visit matchday_path(matchday)
    assert_text "Disparejo"

    click_on @roster[0].name
    click_on @roster[5].name
    assert_text "Aceptable"

    click_on "Deshacer"
    assert_text "Disparejo"
  end

  test "a Saturday still being built can be discarded" do
    matchday = built_matchday
    log_in_as(@admin)
    visit matchday_path(matchday)

    accept_confirm { click_on "Descartar sábado" }

    assert_text "Sábado borrado."
    assert_nil Matchday.find_by(id: matchday.id)
  end

  test "saving the result opens the ratings and raises the nudge" do
    matchday = built_matchday
    matchday.update!(status: "played")
    matchday.players.first.update!(user: @admin)

    log_in_as(@admin)
    visit matchday_path(matchday)

    fill_in "Rojos", with: "5"
    fill_in "Azules", with: "3"
    click_on "Guardar resultado"

    assert_text "Calificaciones abiertas."
    assert_text "Calificando"
    assert_text "Abiertas"
    assert_text "por calificar"
  end

  test "an admin corrects the date of a Saturday already on the books" do
    matchday = built_matchday
    matchday.update!(status: "played")

    log_in_as(@admin)
    visit matchday_path(matchday)

    click_on "Cambiar fecha"
    assert_text "Solo puede haber un sábado por fecha"
    assert_equal matchday.played_on.iso8601, find("#edit-played-on").value
  end

  private
    def next_saturday
      today = Date.current
      today + ((6 - today.wday) % 7)
    end

    def log_in_as(user)
      visit login_path
      fill_in "Email", with: user.email
      fill_in "Password", with: "password"
      click_on "Log in"
      assert_text "Sábados"
    end

    # A Saturday with two teams already split, waiting on the review step.
    def built_matchday
      matchday = Matchday.create!(played_on: Date.new(2026, 11, 28), team_count: 2)

      @roster.each { |player| Attendance.create!(matchday: matchday, player: player) }
      @roster.each_slice(5).with_index do |group, index|
        team = Team.create!(matchday: matchday, color: Team::COLORS[index])
        group.each { |player| TeamMembership.create!(team: team, player: player, position: "midfielder") }
      end

      matchday
    end
end
