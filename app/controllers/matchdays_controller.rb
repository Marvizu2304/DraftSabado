class MatchdaysController < ApplicationController
  before_action :require_admin, only: %i[ create update destroy generate confirm update_result ratings ]
  before_action :set_matchday, only: %i[ show update destroy generate confirm update_result ratings ]

  def index
    render inertia: "sabados/Index", props: {
      matchdays: Matchday.ordered.map { |matchday| summary(matchday) }
    }
  end

  def show
    render inertia: "sabados/Show", props: {
      matchday: summary(@matchday),
      roster: Player.active.ordered.map { |player| player_json(player) },
      attendee_ids: attendee_ids.to_a,
      teams: teams_json,
      changes: changes_json,
      ratings: ratings_json,
      team_counts: Matchday::TEAM_COUNTS,
      players_per_team: Matchday::PLAYERS_PER_TEAM,
      can_edit: Current.user.admin?
    }
  end

  # Step one of the wizard: the date. Defaults to today on the field, but the
  # admin can pick another one. Only one Saturday per date, so an existing one
  # is reopened instead of refused.
  def create
    played_on = params[:played_on].presence || Date.current

    if (existing = Matchday.find_by(played_on: played_on))
      return redirect_to matchday_path(existing), notice: "Esa reta ya estaba abierta."
    end

    matchday = Matchday.new(played_on: played_on)
    if matchday.save
      redirect_to matchday_path(matchday)
    else
      redirect_to matchdays_path, alert: "Esa fecha no es válida."
    end
  end

  # Correcting the date of a Saturday already on the books.
  def update
    if @matchday.update(played_on: params[:played_on])
      redirect_to matchday_path(@matchday), notice: "Fecha actualizada."
    else
      redirect_to matchday_path(@matchday),
        alert: params[:played_on].blank? ? "Falta la fecha." : "Ya hay una reta en esa fecha."
    end
  end

  # Throwing a Saturday away, whatever state it is in. If it had a result, the
  # ladder has to forget it too.
  def destroy
    scored = @matchday.result?
    @matchday.destroy!
    EloLadder.recalculate! if scored

    redirect_to matchdays_path, notice: "Reta borrada."
  end

  # Reopening the window by hand, or shutting it early.
  def ratings
    if params[:open].to_s == "true"
      return redirect_to matchday_path(@matchday), alert: "Primero guarda el resultado." unless @matchday.result?

      @matchday.update!(ratings_open_at: Time.current, ratings_settled_at: nil)
      redirect_to matchday_path(@matchday), notice: "Calificaciones reabiertas."
    else
      # Backdating past the window is what "closed" means — the state is read
      # off this one timestamp.
      @matchday.update!(ratings_open_at: Matchday::RATING_WINDOW.ago)
      Matchday.settle_closed_windows!
      redirect_to matchday_path(@matchday), notice: "Calificaciones cerradas."
    end
  end

  def generate
    count = params[:team_count].to_i
    attendees = Player.active.where(id: params[:player_ids] || []).to_a

    unless Matchday::TEAM_COUNTS.include?(count)
      return redirect_to matchday_path(@matchday),
        alert: "Elige entre #{Matchday::TEAM_COUNTS.first} y #{Matchday::TEAM_COUNTS.last} equipos."
    end
    if attendees.size < count * 2
      return redirect_to matchday_path(@matchday),
        alert: "Se necesitan al menos #{count * 2} jugadores para armar #{count} equipos."
    end

    scored = @matchday.result?

    Matchday.transaction do
      save_attendance(attendees)
      @matchday.update!(team_count: count, status: "building", ratings_open_at: nil, ratings_settled_at: nil)
      build_teams(attendees, count)
      EloLadder.recalculate! if scored
    end

    redirect_to matchday_path(@matchday),
      notice: scored ? "Equipos rearmados. Se borró el resultado." : nil
  end

  def confirm
    arrangement = confirm_params[:teams] || []
    submitted = arrangement.flat_map { |team| (team[:members] || []).map { |m| m[:player_id].to_i } }

    if submitted.to_set != attendee_ids || submitted.size != submitted.uniq.size
      return redirect_to matchday_path(@matchday),
        alert: "Los equipos no coinciden con quienes llegaron. Vuelve a generar."
    end

    Matchday.transaction do
      arrangement.each do |team_param|
        team = @matchday.teams.find_by!(color: team_param[:color])
        team.team_memberships.destroy_all
        team_param[:members].each do |member|
          team.team_memberships.create!(player_id: member[:player_id], position: member[:position])
        end
      end
      @matchday.update!(status: "played")
      EloLadder.recalculate! if @matchday.result?
    end

    redirect_to matchday_path(@matchday), notice: "Reta confirmada."
  end

  # Goals with two teams, matches won with three or more. Blank fields clear the result,
  # which is also how the admin unlocks the teams to build them again. Saving a result
  # is also what opens the twelve-hour rating window.
  def update_result
    field = @matchday.team_count == 2 ? :goals : :wins
    values = result_params[:result] || {}

    Matchday.transaction do
      @matchday.teams.each do |team|
        value = values[team.color]
        team.update!(goals: nil, wins: nil)
        team.update!(field => value) if value.present?
      end
      @matchday.update!(ratings_open_at: @matchday.result? ? (@matchday.ratings_open_at || Time.current) : nil)
      EloLadder.recalculate!
    end

    redirect_to matchday_path(@matchday),
      notice: @matchday.ratings_open_at ? "Resultado guardado. Calificaciones abiertas." : "Resultado borrado."
  end

  private
    def set_matchday
      @matchday = Matchday.find(params[:id])
    end

    def scoreboard
      @scoreboard ||= Scoreboard.new
    end

    def attendee_ids
      @attendee_ids ||= @matchday.attendances.pluck(:player_id).to_set
    end

    def confirm_params
      params.permit(teams: [ :color, { members: [ :player_id, :position ] } ])
    end

    def result_params
      params.permit(result: Team::COLORS)
    end

    def save_attendance(attendees)
      ids = attendees.map(&:id)
      @matchday.attendances.where.not(player_id: ids).destroy_all
      (ids - @matchday.attendances.pluck(:player_id)).each do |id|
        @matchday.attendances.create!(player_id: id)
      end
      @attendee_ids = nil
    end

    def build_teams(attendees, count)
      @matchday.teams.destroy_all
      TeamBuilder.new(attendees, team_count: count, scoreboard: scoreboard).call.each_with_index do |members, index|
        team = @matchday.teams.create!(color: Team::COLORS[index])
        members.each do |member|
          team.team_memberships.create!(player_id: member[:player].id, position: member[:position])
        end
      end
    end

    def summary(matchday)
      {
        id: matchday.id,
        played_on: matchday.played_on.iso8601,
        team_count: matchday.team_count,
        status: matchday.status,
        state: matchday.state,
        ratings_close_at: matchday.ratings_close_at&.iso8601,
        attendee_count: matchday.attendances.size,
        result: result_json(matchday)
      }
    end

    def player_json(player)
      {
        id: player.id,
        name: player.name,
        position: player.position,
        overall: scoreboard.overall(player),
        physical: scoreboard.physical(player),
        elo: player.elo.to_f
      }
    end

    # { "black" => 5, "white" => 3 } — goals or matches won, whichever this
    # Saturday was played with. Empty until the result is captured.
    def result_json(matchday)
      field = matchday.team_count == 2 ? :goals : :wins
      matchday.teams.filter_map { |team| [ team.color, team[field] ] if team[field] }.to_h
    end

    # Who still owes the group a rating for this Saturday. Names only: what
    # anybody actually rated stays private.
    def ratings_json
      return nil if @matchday.ratings_open_at.nil?

      attendees = @matchday.players.to_a
      owed = attendees.size - 1
      done = Rating.where(matchday: @matchday).group(:rater_id).count

      {
        open: @matchday.ratings_open?,
        closes_at: @matchday.ratings_close_at.iso8601,
        pending: attendees.select { |p| p.user_id && done.fetch(p.user_id, 0) < owed }.map(&:name).sort,
        unlinked: attendees.count { |p| p.user_id.nil? }
      }
    end

    # How much every player's adjustment moved this Saturday: his snapshot minus
    # the one from the Saturday before.
    def changes_json
      return {} unless @matchday.result?

      before = previous_elos
      @matchday.score_snapshots.includes(:player).to_h do |snapshot|
        [ snapshot.player_id, (snapshot.elo.to_f - before.fetch(snapshot.player_id, 0.0)).round(2) ]
      end.select { |_, delta| delta != 0 }
    end

    def previous_elos
      previous = Matchday.with_result.where(played_on: ...@matchday.played_on).order(:played_on).last
      return {} unless previous

      previous.score_snapshots.pluck(:player_id, :elo).to_h { |id, elo| [ id, elo.to_f ] }
    end

    def teams_json
      @matchday.teams.map do |team|
        {
          color: team.color,
          members: team.team_memberships.map do |membership|
            { player_id: membership.player_id, position: membership.position }
          end
        }
      end
    end
end
