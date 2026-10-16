class PlayersController < ApplicationController
  before_action :require_admin, except: %i[ index show ]
  before_action :set_player, only: %i[ show edit update ]

  def index
    render inertia: "plantel/Index", props: {
      players: Player.ordered.map { |player| summary(player) }
    }
  end

  def show
    render inertia: "plantel/Show", props: { player: detail(@player) }
  end

  def new
    render inertia: "plantel/Form", props: {
      player: nil,
      linkable_users: linkable_users
    }
  end

  def edit
    render inertia: "plantel/Form", props: {
      player: detail(@player),
      linkable_users: linkable_users(@player)
    }
  end

  def create
    player = Player.new(player_params)

    if player.save
      redirect_to player_path(player), notice: "Jugador dado de alta."
    else
      redirect_to new_player_path, inertia: { errors: form_errors(player) }
    end
  end

  def update
    if @player.update(player_params)
      redirect_to player_path(@player), notice: "Jugador actualizado."
    else
      redirect_to edit_player_path(@player), inertia: { errors: form_errors(@player) }
    end
  end

  private
    def scoreboard
      @scoreboard ||= Scoreboard.new
    end

    def set_player
      @player = Player.find(params[:id])
    end

    def player_params
      params.permit(:name, :age, :position, :active, :user_id)
    end

    def form_errors(player)
      player.errors.to_hash(true).transform_values(&:first)
    end

    # Accounts nobody is linked to yet, plus the one this player already holds.
    def linkable_users(player = nil)
      User.where.missing(:player).or(User.where(id: player&.user_id)).order(:email).map do |user|
        { id: user.id, email: user.email }
      end
    end

    def summary(player)
      {
        id: player.id,
        name: player.name,
        age: player.age,
        position: player.position,
        active: player.active,
        overall: scoreboard.overall(player)
      }
    end

    def detail(player)
      summary(player).merge(
        user_id: player.user_id,
        user_email: player.user&.email,
        technique: scoreboard.technique(player),
        physical: scoreboard.physical(player),
        ratings_count: scoreboard.ratings_count(player),
        elo: player.elo.to_f,
        series: series(player),
        position_history: position_history(player)
      )
    end

    # One point per Saturday closed with a result: what he was worth that day.
    def series(player)
      player.score_snapshots.chronological.map do |snapshot|
        { played_on: snapshot.matchday.played_on.iso8601, value: snapshot.value }
      end
    end

    # Where he has actually played, not where he says he plays.
    def position_history(player)
      player.team_memberships.group(:position).count
    end
end
