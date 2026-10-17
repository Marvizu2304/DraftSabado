Rails.application.routes.draw do
  get  "login",  to: "sessions#new",     as: :login
  post "login",  to: "sessions#create"
  delete "logout", to: "sessions#destroy", as: :logout

  get  "signup", to: "registrations#new",    as: :signup
  post "signup", to: "registrations#create"

  resources :passwords, param: :token, only: %i[ new create edit update ]

  get   "settings", to: "settings#show",   as: :settings
  patch "settings", to: "settings#update"

  get   "calificar", to: "ratings#index",  as: :ratings
  patch "calificar", to: "ratings#upsert"

  resources :players, path: "plantel", except: :destroy

  get "evolucion", to: "evolution#index", as: :evolution

  resources :matchdays, path: "sabados", only: %i[ index show create update destroy ] do
    member do
      post  :generate, path: "generar"
      patch :confirm,  path: "confirmar"
      patch :update_result, path: "resultado"
      patch :ratings, path: "calificaciones"
    end
  end

  namespace :admin do
    root to: redirect("/admin/users")
    get "design-system", to: "design_system#show", as: :design_system
    resources :users, only: %i[ index show ] do
      member do
        patch :approve, path: "aprobar"
        patch :reject,  path: "rechazar"
      end
    end
  end

  get   "profile",          to: "profiles#details",          as: :profile
  get   "profile/password", to: "profiles#password",         as: :profile_password
  patch "profile/email",    to: "profiles#update_email"
  patch "profile/password", to: "profiles#update_password"

  mount LetterOpenerWeb::Engine, at: "/letter_opener" if Rails.env.development?

  get "up" => "rails/health#show", as: :rails_health_check

  root "pages#home"
end
