# frozen_string_literal: true

class CuratorApplicationsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_eligible

  layout "bootstrap"

  MIN_EXPLANATION_LENGTH = 20
  MIN_FLAGS = 5
  FIELDS = [:explanation, :taxonomy_examples, :name_examples, :moderation_examples].freeze

  def new
    @application = {}
  end

  def create
    if params[:application][:explanation].blank? ||
        params[:application][:explanation].to_s.size < MIN_EXPLANATION_LENGTH
      flash[:error] = t( :curator_application_explanation_required )
      @application = params[:application] || {}
      render :new
    elsif !@eligible
      flash[:error] = t( :curator_application_inelligible_error2 )
      @application = params[:application] || {}
      render :new
    else
      Emailer.curator_application( current_user, params[:application] ).deliver_now
      flash[:notice] = t( :curator_application_success )
      redirect_to dashboard_path
    end
  end

  private

  def set_eligible
    @num_improving_idents = Identification.elastic_search(
      filters: [
        { term: { current: true } },
        { term: { "user.id" => current_user.id } },
        { term: { category: "improving" } }
      ]
    ).total_entries
    @eligible = (
      current_user.is_admin? || (
        current_user.created_at < 60.days.ago &&
        @num_improving_idents > 100 &&
        current_user.flags_as_flagger.count >= MIN_FLAGS
      )
    )
  end
end
