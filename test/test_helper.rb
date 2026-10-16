ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end

class ActionDispatch::IntegrationTest
  # The props Inertia handed the page, read back out of the rendered layout.
  def inertia_props
    JSON.parse(CGI.unescapeHTML(response.body[/data-page="([^"]*)"/, 1]))["props"]
  end

  def log_in_as(user)
    post login_path, params: { email: user.email, password: "password" }
  end
end
