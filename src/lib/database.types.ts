// Minimal Supabase database types for QAScope.

export type UserRole =
  | "admin"
  | "qa_manager"
  | "team_lead"
  | "qa_reviewer"
  | "viewer";
export type ChannelType = "chat" | "email" | "voice_transcript";
export type ScoreStatus = "final" | "needs_review" | "critical_fail";
export type ReviewDecision = "pending" | "approved" | "overridden" | "rejected";
export type ReviewState = "pending_first" | "pending_second" | "closed";
export type FirstReviewerDecision = "agree" | "disagree" | "auto_approved";
export type SecondReviewerDecision =
  | "confirm_override"
  | "deny_override"
  | "auto_confirmed";
export type PlanName = "pilot" | "starter" | "team" | "growth" | "pro";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";


type SubscriptionsRow = {
  id: string;
  client_id: string;
  plan_name: PlanName;
  monthly_limit: number;
  status: SubscriptionStatus;
  billing_cycle_start: string;
  razorpay_subscription_id: string | null;
  created_at: string;
};
type ClientsRow = {
  id: string;
  name: string;
  industry: string | null;
  active_plan: PlanName | null;
  sla_hours: number;
  second_reviewer_user_id: string | null;
  pass_threshold: number;
  llm_provider: string | null;
  llm_api_key: string | null;
  llm_base_url: string | null;
  llm_model: string | null;
  created_at: string;
};

type UsersRow = {
  id: string;
  client_id: string;
  name: string;
  email: string;
  role: UserRole;
  team_name: string | null;
  created_at: string;
};

type OpenaiUsageRow = {
  id: string;
  client_id: string;
  model: string;
  feature: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_inr_micro: number;
  called_at: string;
};

type ReportTemplatesRow = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type FatalRulesRow = {
  id: string;
  rubric_id: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type InvitationsRow = {
  id: string;
  client_id: string;
  email: string;
  role: UserRole;
  team_name: string | null;
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

type AgentsRow = {
  id: string;
  client_id: string;
  agent_name: string;
  team_name: string | null;
  employee_code: string | null;
  created_at: string;
};

type ConversationsRow = {
  id: string;
  client_id: string;
  agent_id: string | null;
  channel: ChannelType;
  transcript_text: string;
  conversation_date: string;
  customer_id: string | null;
  metadata_json: Record<string, unknown> | null;
  external_conversation_id: string | null;
  created_at: string;
};

type QaRubricsRow = {
  id: string;
  client_id: string;
  name: string;
  version: number;
  is_default: boolean;
  created_at: string;
};

type QaCriteriaRow = {
  id: string;
  rubric_id: string;
  name: string;
  description: string | null;
  weight: number;
  critical_fail_boolean: boolean;
  sort_order: number;
  created_at: string;
};

type QaScoresRow = {
  id: string;
  conversation_id: string;
  rubric_id: string;
  total_score: number;
  confidence_score: number;
  status: ScoreStatus;
  original_total_score: number;
  original_status: ScoreStatus;
  appealed_at: string | null;
  coaching_note: string | null;
  created_at: string;
};

type QaScoreDetailsRow = {
  id: string;
  qa_score_id: string;
  criterion_id: string;
  score: number;
  confidence: number;
  explanation: string | null;
  evidence_span: string | null;
  created_at: string;
};

type ReviewQueueRow = {
  id: string;
  qa_score_id: string;
  reason: string;
  state: ReviewState;
  sla_deadline: string | null;

  first_reviewer_id: string | null;
  first_reviewer_decision: FirstReviewerDecision | null;
  first_reviewer_at: string | null;
  first_reviewer_notes: string | null;

  second_reviewer_id: string | null;
  second_reviewer_decision: SecondReviewerDecision | null;
  second_reviewer_at: string | null;
  second_reviewer_notes: string | null;

  // Legacy columns, kept for backward compatibility
  assigned_to: string | null;
  decision: ReviewDecision;
  notes: string | null;

  created_at: string;
  resolved_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: ClientsRow;
        Insert: {
          id?: string;
          name: string;
          industry?: string | null;
          active_plan?: PlanName | null;
          sla_hours?: number;
          second_reviewer_user_id?: string | null;
          pass_threshold?: number;
          llm_provider?: string | null;
          llm_api_key?: string | null;
          llm_base_url?: string | null;
          llm_model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          industry?: string | null;
          active_plan?: PlanName | null;
          sla_hours?: number;
          second_reviewer_user_id?: string | null;
          pass_threshold?: number;
          llm_provider?: string | null;
          llm_api_key?: string | null;
          llm_base_url?: string | null;
          llm_model?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: UsersRow;
        Insert: {
          id: string;
          client_id: string;
          name: string;
          email: string;
          role?: UserRole;
          team_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          email?: string;
          role?: UserRole;
          team_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      openai_usage: {
        Row: OpenaiUsageRow;
        Insert: {
          id?: string;
          client_id: string;
          model: string;
          feature: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          cost_inr_micro?: number;
          called_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          model?: string;
          feature?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          cost_inr_micro?: number;
          called_at?: string;
        };
        Relationships: [];
      };
      report_templates: {
        Row: ReportTemplatesRow;
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          description?: string | null;
          config: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          description?: string | null;
          config?: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fatal_rules: {
        Row: FatalRulesRow;
        Insert: {
          id?: string;
          rubric_id: string;
          name: string;
          description: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rubric_id?: string;
          name?: string;
          description?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: InvitationsRow;
        Insert: {
          id?: string;
          client_id: string;
          email: string;
          role?: UserRole;
          team_name?: string | null;
          token: string;
          invited_by?: string | null;
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          email?: string;
          role?: UserRole;
          team_name?: string | null;
          token?: string;
          invited_by?: string | null;
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      agents: {
        Row: AgentsRow;
        Insert: {
          id?: string;
          client_id: string;
          agent_name: string;
          team_name?: string | null;
          employee_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          agent_name?: string;
          team_name?: string | null;
          employee_code?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: ConversationsRow;
        Insert: {
          id?: string;
          client_id: string;
          agent_id?: string | null;
          channel: ChannelType;
          transcript_text: string;
          conversation_date: string;
          customer_id?: string | null;
          metadata_json?: Record<string, unknown> | null;
          external_conversation_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          agent_id?: string | null;
          channel?: ChannelType;
          transcript_text?: string;
          conversation_date?: string;
          customer_id?: string | null;
          metadata_json?: Record<string, unknown> | null;
          external_conversation_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      qa_rubrics: {
        Row: QaRubricsRow;
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          version?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<QaRubricsRow>;
        Relationships: [];
      };
      qa_criteria: {
        Row: QaCriteriaRow;
        Insert: {
          id?: string;
          rubric_id: string;
          name: string;
          description?: string | null;
          weight: number;
          critical_fail_boolean?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<QaCriteriaRow>;
        Relationships: [];
      };
      qa_scores: {
        Row: QaScoresRow;
        Insert: {
          id?: string;
          conversation_id: string;
          rubric_id: string;
          total_score: number;
          confidence_score: number;
          status?: ScoreStatus;
          original_total_score: number;
          original_status: ScoreStatus;
          appealed_at?: string | null;
          coaching_note?: string | null;
          created_at?: string;
        };
        Update: Partial<QaScoresRow>;
        Relationships: [];
      };
      qa_score_details: {
        Row: QaScoreDetailsRow;
        Insert: {
          id?: string;
          qa_score_id: string;
          criterion_id: string;
          score: number;
          confidence: number;
          explanation?: string | null;
          evidence_span?: string | null;
          created_at?: string;
        };
        Update: Partial<QaScoreDetailsRow>;
        Relationships: [];
      };
      review_queue: {
        Row: ReviewQueueRow;
        Insert: {
          id?: string;
          qa_score_id: string;
          reason: string;
          state?: ReviewState;
          sla_deadline?: string | null;
          first_reviewer_id?: string | null;
          first_reviewer_decision?: FirstReviewerDecision | null;
          first_reviewer_at?: string | null;
          first_reviewer_notes?: string | null;
          second_reviewer_id?: string | null;
          second_reviewer_decision?: SecondReviewerDecision | null;
          second_reviewer_at?: string | null;
          second_reviewer_notes?: string | null;
          assigned_to?: string | null;
          decision?: ReviewDecision;
          notes?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<ReviewQueueRow>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionsRow;
        Insert: {
          id?: string;
          client_id: string;
          plan_name: PlanName;
          monthly_limit: number;
          status?: SubscriptionStatus;
          billing_cycle_start: string;
          razorpay_subscription_id?: string | null;
          created_at?: string;
        };
        Update: Partial<SubscriptionsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      seed_default_rubric: {
        Args: { p_client_id: string };
        Returns: string;
      };
      current_client_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      sweep_review_sla: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      channel_type: ChannelType;
      score_status: ScoreStatus;
      review_decision: ReviewDecision;
      review_state: ReviewState;
      first_reviewer_decision_type: FirstReviewerDecision;
      second_reviewer_decision_type: SecondReviewerDecision;
      plan_name: PlanName;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
