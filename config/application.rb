# Specifies gem version of Rails to use when vendor/rails is not present
# RAILS_GEM_VERSION = '2.3.8' unless defined? RAILS_GEM_VERSION

require File.expand_path('../boot', __FILE__)

require 'rails/all'

require 'yaml'
INAT_CONFIG = YAML.load(File.open(File.expand_path('../config.yml', __FILE__)))[Rails.env]

# flickr api keys - these need to be set before Flickraw gets included
FLICKR_API_KEY = INAT_CONFIG['flickr']['FLICKR_API_KEY']
FLICKR_SHARED_SECRET = INAT_CONFIG['flickr']['FLICKR_SHARED_SECRET']
FlickRawOptions = {
  'api_key' => FLICKR_API_KEY,
  'shared_secret' => FLICKR_SHARED_SECRET
}

# If you have a Gemfile, require the gems listed there, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(:default, Rails.env) if defined?(Bundler)

module Inaturalist
  class Application < Rails::Application
    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration should go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded.

    # Custom directories with classes and modules you want to be autoloadable.
    config.autoload_paths += %W(#{config.root}/lib)

    # Only load the plugins named here, in the order given (default is alphabetical).
    # :all can be used as a placeholder for all plugins not explicitly named.
    # config.plugins = [ :exception_notification, :ssl_requirement, :all ]

    # Activate observers that should always be running.
    # config.active_record.observers = :cacher, :garbage_collector, :forum_observer

    # Set Time.zone default to the specified zone and make Active Record auto-convert to this zone.
    # Run "rake -D time" for a list of tasks for finding time zone names. Default is UTC.
    # config.time_zone = 'Central Time (US & Canada)'

    # The default locale is :en and all translations from config/locales/*.rb,yml are auto loaded.
    # config.i18n.load_path += Dir[Rails.root.join('my', 'locales', '*.{rb,yml}').to_s]
    # config.i18n.default_locale = :de

    # JavaScript files you want as :defaults (application.js is always included).
    # config.action_view.javascript_expansions[:defaults] = %w(jquery rails)
    
    # Your secret key for verifying cookie session data integrity.
    # If you change this key, all old sessions will become invalid!
    # Make sure the secret is at least 30 characters and all random, 
    # no regular words or you'll be exposed to dictionary attacks.
    config.action_controller.session = {
      :session_key => INAT_CONFIG['rails']['secret'],
      :secret      => INAT_CONFIG['rails']['secret']
    }
    
    config.active_record.observers = :user_observer, :listed_taxon_sweeper
    
    config.time_zone = 'UTC'
    
    # Configure the default encoding used in templates for Ruby 1.9.
    config.encoding = "utf-8"

    # Configure sensitive parameters which will be filtered from the log file.
    config.filter_parameters += [:password]
  end
  
  # require 'geoplanet'
  # require 'geoip'
  # require 'net-flickr/lib/net/flickr'
  # require 'catalogue_of_life'
  # require 'ubio'
  # require 'model_tips'
  # require 'meta_service'
  # require 'wikipedia_service'
  # require 'batch_tools'
  # require 'georuby_extra'
  # 

end

ActiveRecord::Base.include_root_in_json = false

# GeoIP setup, for IP geocoding
geoip_config = YAML.load(File.open("#{Rails.root}/config/geoip.yml"))
GEOIP = GeoIP.new(geoip_config[Rails.env]['city'])


### API KEYS ###
UBIO_KEY = INAT_CONFIG['ubio']['UBIO_KEY']

# Yahoo Developer Network
YDN_APP_ID = INAT_CONFIG['yahoo_dev_network']['YDN_APP_ID']
GeoPlanet.appid = YDN_APP_ID

# Google Analytics configs
# See http://www.rubaidh.com/projects/google-analytics-plugin/
Rubaidh::GoogleAnalytics.tracker_id   = INAT_CONFIG['google_analytics']['tracker_id']
Rubaidh::GoogleAnalytics.domain_name  = INAT_CONFIG['google_analytics']['domain_name']
Rubaidh::GoogleAnalytics.environments = ['production']

# General settings
SITE_NAME = INAT_CONFIG['general']['SITE_NAME']
OBSERVATIONS_TILE_SERVER = INAT_CONFIG['tile_servers']['observations']
