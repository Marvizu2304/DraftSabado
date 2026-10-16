# frozen_string_literal: true

class PagesController < ApplicationController
  allow_unauthenticated_access only: :home

  def home
    return redirect_to(matchdays_path) if authenticated?
    render inertia: "Home"
  end
end
