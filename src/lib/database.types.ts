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
export type AlertSeverity = "critical" | "warning" | "info";


type WorkspaceDocumentsRow = {
  id: string;
  workspace_id: string;
  source_type: string;
  source_uri: string | null;
  title: string;
  content_hash: string;
  version: number;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
  error_message: string | null;
  chunk_count: number | null;
  created_at: string;
};

type DocumentChunksRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  text_length: number | null;
  embedding: number[];
  metadata: Record<string, unknown> | null;
  created_at: string;
};

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
  scoring_stop_requested_at: string | null;
  latest_upload_batch_id: string | null;
  review_confidence_threshold: number;
  llm_embedding_api_key: string | null;
  llm_embedding_base_url: string | null;
  created_at: string;
};

type UsersRow = {
  id: string;
  client_id: string;
  name: string;
  email: string;
  role: UserRole;
  team_name: string | null;
  is_super_admin: boolean;
  agreed_to_terms_at: string | null;
  terms_version_agreed: number;
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
  upload_batch_id: string | null;
  created_at: string;
};

type VoiceAuditJobsRow = {
  id: string;
  client_id: string;
  webhook_token_id: string | null;
  external_call_id: string | null;
  source_type: string;
  source_system: string | null;
  recording_url: string | null;
  storage_path: string | null;
  status: string;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
  error_message: string | null;
  transcript_text: string | null;
  transcription_model: string | null;
  transcription_metadata: Record<string, unknown> | null;
  transcribed_at: string | null;
  conversation_id: string | null;
  scored_at: string | null;
  completed_at: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  duration_seconds: number | null;
  language: string | null;
  audio_filename: string | null;
  audio_content_type: string | null;
  audio_size_bytes: number | null;
  job_id: string | null;
};

type VoiceAuditEventsRow = {
  id: string;
  job_id: string;
  client_id: string;
  event_type: string;
  message: string;
  details_json: Record<string, unknown>;
  created_at: string;
};

type OutboundWebhooksRow = {
  id: string;
  client_id: string;
  url: string;
  secret: string;
  is_active: boolean;
  created_at: string;
};

type OutboundWebhookDeliveriesRow = {
  id: string;
  webhook_id: string;
  client_id: string;
  qa_score_id: string | null;
  event_type: string;
  request_payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  is_success: boolean;
  created_at: string;
};

type PushSubscriptionsRow = {
  id: string;
  user_id: string;
  client_id: string;
  subscription: Record<string, unknown>;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

type QaRubricsRow = {
  id: string;
  client_id: string;
  name: string;
  version: number;
  is_default: boolean;
  created_at: string;
};

type AlertPreferencesRow = {
  client_id: string;
  email_on_critical_fail: boolean;
  email_on_low_score: boolean;
  alert_score_threshold: number | null;
  updated_at: string;
};

type AgentNotificationsRow = {
  id: string;
  client_id: string;
  user_id: string;
  qa_score_id: string | null;
  severity: AlertSeverity;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

type ClientBalancesRow = {
  client_id: string;
  conversations_remaining: number;
  updated_at: string;
};

type BalanceTransactionsRow = {
  id: string;
  client_id: string;
  amount: number;
  transaction_type: string;
  reference_id: string | null;
  description: string | null;
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
  sources_used: string | null;
  errored: boolean;
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
  adjusted_score: number | null;

  // Legacy columns, kept for backward compatibility
  assigned_to: string | null;
  decision: ReviewDecision;
  notes: string | null;

  created_at: string;
  resolved_at: string | null;
};

type WebhookTokensRow = {
  id: string;
  client_id: string;
  name: string;
  token: string;
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  signing_secret: string | null;
  allow_unsigned: boolean;
};

type DataSourcesRow = {
  id: string;
  client_id: string;
  name: string;
  type: "website_url" | "api_endpoint";
  url: string | null;
  endpoint_template: string | null;
  http_method: "GET" | "POST";
  auth_header_name: string | null;
  auth_secret_id: string | null;
  entity_hints: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      webhook_tokens: {
        Row: WebhookTokensRow;
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          token: string;
          created_by?: string | null;
          created_at?: string;
          last_used_at?: string | null;
          is_active?: boolean;
          signing_secret?: string | null;
          allow_unsigned?: boolean;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          token?: string;
          created_by?: string | null;
          last_used_at?: string | null;
          is_active?: boolean;
          signing_secret?: string | null;
          allow_unsigned?: boolean;
        };
        Relationships: [];
      };
      data_sources: {
        Row: DataSourcesRow;
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          type: "website_url" | "api_endpoint";
          url?: string | null;
          endpoint_template?: string | null;
          http_method?: "GET" | "POST";
          auth_header_name?: string | null;
          auth_secret_id?: string | null;
          entity_hints?: string[];
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          type?: "website_url" | "api_endpoint";
          url?: string | null;
          endpoint_template?: string | null;
          http_method?: "GET" | "POST";
          auth_header_name?: string | null;
          auth_secret_id?: string | null;
          entity_hints?: string[];
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
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
          scoring_stop_requested_at?: string | null;
          latest_upload_batch_id?: string | null;
          review_confidence_threshold?: number;
          llm_embedding_api_key?: string | null;
          llm_embedding_base_url?: string | null;
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
          scoring_stop_requested_at?: string | null;
          latest_upload_batch_id?: string | null;
          review_confidence_threshold?: number;
          llm_embedding_api_key?: string | null;
          llm_embedding_base_url?: string | null;
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
          agreed_to_terms_at?: string | null;
          terms_version_agreed?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          email?: string;
          role?: UserRole;
          team_name?: string | null;
          agreed_to_terms_at?: string | null;
          terms_version_agreed?: number;
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
          upload_batch_id?: string | null;
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
          upload_batch_id?: string | null;
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
        Relationships: [
          {
            foreignKeyName: "qa_scores_conversation_id_fkey",
            columns: ["conversation_id"],
            isOneToOne: false,
            referencedRelation: "conversations",
            referencedColumns: ["id"]
          }
        ];
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
          sources_used?: string | null;
          errored?: boolean;
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
          adjusted_score?: number | null;
          assigned_to?: string | null;
          decision?: ReviewDecision;
          notes?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<ReviewQueueRow>;
        Relationships: [];
      };
      workspace_documents: {
        Row: WorkspaceDocumentsRow;
        Insert: {
          id?: string;
          workspace_id: string;
          source_type: string;
          source_uri?: string | null;
          title: string;
          content_hash: string;
          version?: number;
          uploaded_by: string;
          uploaded_at?: string;
          status?: string;
          error_message?: string | null;
          chunk_count?: number | null;
          created_at?: string;
        };
        Update: Partial<WorkspaceDocumentsRow>;
        Relationships: [];
      };
      document_chunks: {
        Row: DocumentChunksRow;
        Insert: {
          id?: string;
          document_id: string;
          chunk_index: number;
          text: string;
          text_length?: number | null;
          embedding: number[];
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<DocumentChunksRow>;
        Relationships: [];
      };
      alert_preferences: {
        Row: AlertPreferencesRow;
        Insert: {
          client_id: string;
          email_on_critical_fail?: boolean;
          email_on_low_score?: boolean;
          alert_score_threshold?: number | null;
          updated_at?: string;
        };
        Update: Partial<AlertPreferencesRow>;
        Relationships: [];
      };
      agent_notifications: {
        Row: AgentNotificationsRow;
        Insert: {
          id?: string;
          client_id: string;
          user_id: string;
          qa_score_id?: string | null;
          severity: AlertSeverity;
          title: string;
          body: string;
          action_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<AgentNotificationsRow>;
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
      client_balances: {
        Row: ClientBalancesRow;
        Insert: {
          client_id: string;
          conversations_remaining?: number;
          updated_at?: string;
        };
        Update: {
          conversations_remaining?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      balance_transactions: {
        Row: BalanceTransactionsRow;
        Insert: {
          id?: string;
          client_id: string;
          amount: number;
          transaction_type: string;
          reference_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
          transaction_type?: string;
          reference_id?: string | null;
          description?: string | null;
        };
        Relationships: [];
      };
      voice_audit_jobs: {
        Row: VoiceAuditJobsRow;
        Insert: {
          id?: string;
          client_id: string;
          webhook_token_id?: string | null;
          external_call_id?: string | null;
          source_type?: string;
          source_system?: string | null;
          recording_url?: string | null;
          storage_path?: string | null;
          status?: string;
          attempt_count?: number;
          max_attempts?: number;
          next_attempt_at?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          error_message?: string | null;
          transcript_text?: string | null;
          transcription_model?: string | null;
          transcription_metadata?: Record<string, unknown> | null;
          transcribed_at?: string | null;
          conversation_id?: string | null;
          scored_at?: string | null;
          completed_at?: string | null;
          metadata_json?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
          duration_seconds?: number | null;
          language?: string | null;
          audio_filename?: string | null;
          audio_content_type?: string | null;
          audio_size_bytes?: number | null;
          job_id?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          webhook_token_id?: string | null;
          external_call_id?: string | null;
          source_type?: string;
          source_system?: string | null;
          recording_url?: string | null;
          storage_path?: string | null;
          status?: string;
          attempt_count?: number;
          max_attempts?: number;
          next_attempt_at?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          error_message?: string | null;
          transcript_text?: string | null;
          transcription_model?: string | null;
          transcription_metadata?: Record<string, unknown> | null;
          transcribed_at?: string | null;
          conversation_id?: string | null;
          scored_at?: string | null;
          completed_at?: string | null;
          metadata_json?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
          duration_seconds?: number | null;
          language?: string | null;
          audio_filename?: string | null;
          audio_content_type?: string | null;
          audio_size_bytes?: number | null;
          job_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "voice_audit_jobs_conversation_id_fkey",
            columns: ["conversation_id"],
            isOneToOne: false,
            referencedRelation: "conversations",
            referencedColumns: ["id"]
          }
        ];
      };
      voice_audit_events: {
        Row: VoiceAuditEventsRow;
        Insert: {
          id?: string;
          job_id: string;
          client_id: string;
          event_type: string;
          message: string;
          details_json?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          client_id?: string;
          event_type?: string;
          message?: string;
          details_json?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      outbound_webhooks: {
        Row: OutboundWebhooksRow;
        Insert: {
          id?: string;
          client_id: string;
          url: string;
          secret: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          url?: string;
          secret?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      outbound_webhook_deliveries: {
        Row: OutboundWebhookDeliveriesRow;
        Insert: {
          id?: string;
          webhook_id: string;
          client_id: string;
          qa_score_id?: string | null;
          event_type: string;
          request_payload: Record<string, unknown>;
          response_status?: number | null;
          response_body?: string | null;
          error_message?: string | null;
          is_success: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          client_id?: string;
          qa_score_id?: string | null;
          event_type?: string;
          request_payload?: Record<string, unknown>;
          response_status?: number | null;
          response_body?: string | null;
          error_message?: string | null;
          is_success?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionsRow;
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          subscription: Record<string, unknown>;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          subscription?: Record<string, unknown>;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      seed_default_rubric: {
        Args: { p_client_id: string };
        Returns: string;
      };
      add_balance_transaction: {
        Args: { p_client_id: string; p_amount: number; p_type: string; p_reference_id?: string; p_description?: string };
        Returns: void;
      };
      claim_voice_audit_jobs: {
        Args: { p_worker_id: string; p_limit?: number };
        Returns: VoiceAuditJobsRow[];
      };
      current_client_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      sweep_review_sla: {
        Args: Record<string, never>;
        Returns: void;
      };
      search_knowledge_chunks: {
        Args: {
          p_workspace_id: string;
          p_embedding: number[];
          p_limit?: number;
          p_similarity_threshold?: number;
        };
        Returns: Array<{
          chunk_id: string;
          document_id: string;
          document_title: string;
          document_version: number;
          chunk_index: number;
          chunk_text: string;
          similarity: number;
        }>;
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
