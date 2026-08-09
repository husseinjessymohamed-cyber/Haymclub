--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: academy_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.academy_role_enum AS ENUM (
    'SUPER_ADMIN',
    'ACADEMY_ADMIN',
    'BRANCH_MANAGER',
    'RECEPTIONIST',
    'ACCOUNTANT',
    'COACH',
    'PARENT',
    'TRAINEE'
);


--
-- Name: academy_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.academy_status_enum AS ENUM (
    'TRIAL',
    'ACTIVE',
    'SUSPENDED'
);


--
-- Name: attendance_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendance_status_enum AS ENUM (
    'NOT_MARKED',
    'PRESENT',
    'ABSENT',
    'LATE',
    'EXCUSED'
);


--
-- Name: enrollment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enrollment_status_enum AS ENUM (
    'ACTIVE',
    'WAITLISTED',
    'PAUSED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: guardian_relationship_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.guardian_relationship_enum AS ENUM (
    'FATHER',
    'MOTHER',
    'BROTHER',
    'SISTER',
    'RELATIVE',
    'OTHER'
);


--
-- Name: payment_method_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method_enum AS ENUM (
    'CASH',
    'CARD',
    'BANK_TRANSFER',
    'INSTAPAY',
    'VODAFONE_CASH',
    'OTHER'
);


--
-- Name: portal_relationship_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.portal_relationship_enum AS ENUM (
    'SELF',
    'PARENT',
    'GUARDIAN'
);


--
-- Name: trainee_gender_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trainee_gender_enum AS ENUM (
    'MALE',
    'FEMALE'
);


--
-- Name: trainee_portal_account_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trainee_portal_account_status_enum AS ENUM (
    'NOT_CREATED',
    'PENDING_APPROVAL',
    'INVITATION_SENT',
    'ACTIVE',
    'EXPIRED',
    'REJECTED'
);


--
-- Name: trainee_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trainee_status_enum AS ENUM (
    'ACTIVE',
    'PAUSED',
    'INACTIVE'
);


--
-- Name: trainee_subscription_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trainee_subscription_status_enum AS ENUM (
    'PENDING',
    'ACTIVE',
    'PAUSED',
    'EXPIRED',
    'CANCELLED'
);


--
-- Name: training_day_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.training_day_enum AS ENUM (
    'SATURDAY',
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY'
);


--
-- Name: training_group_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.training_group_status_enum AS ENUM (
    'ACTIVE',
    'PAUSED',
    'COMPLETED'
);


--
-- Name: training_level_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.training_level_enum AS ENUM (
    'ALL_LEVELS',
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'PROFESSIONAL'
);


--
-- Name: training_session_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.training_session_status_enum AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: user_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status_enum AS ENUM (
    'ACTIVE',
    'BLOCKED'
);




--
-- Name: academies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(160) NOT NULL,
    slug character varying(120) NOT NULL,
    legal_name character varying(200),
    email character varying(160),
    phone character varying(30),
    logo_url text,
    timezone character varying(80) DEFAULT 'Africa/Cairo'::character varying NOT NULL,
    currency character varying(3) DEFAULT 'EGP'::character varying NOT NULL,
    status public.academy_status_enum DEFAULT 'TRIAL'::public.academy_status_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    attendance_enabled boolean DEFAULT true NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL,
    rankings_enabled boolean DEFAULT true NOT NULL,
    gallery_enabled boolean DEFAULT true NOT NULL,
    subscriptions_enabled boolean DEFAULT true NOT NULL,
    reports_enabled boolean DEFAULT true NOT NULL
);


--
-- Name: academy_gallery_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_gallery_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    uploaded_by_user_id uuid NOT NULL,
    title character varying(180) NOT NULL,
    description text,
    media_type character varying(20) NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size integer NOT NULL,
    published_at timestamp with time zone NOT NULL
);


--
-- Name: academy_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_memberships (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    academy_id uuid,
    branch_id uuid,
    role public.academy_role_enum NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: academy_notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_notification_reads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone NOT NULL
);


--
-- Name: academy_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    branch_id uuid,
    sender_user_id uuid NOT NULL,
    title character varying(180) NOT NULL,
    body text NOT NULL,
    audience character varying(40) DEFAULT 'ALL_TRAINEES'::character varying NOT NULL,
    published_at timestamp with time zone NOT NULL
);


--
-- Name: academy_saas_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_saas_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "academyId" uuid NOT NULL,
    "planId" uuid NOT NULL,
    status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    "billingCycle" character varying(20) DEFAULT 'MONTHLY'::character varying NOT NULL,
    "startsAt" date NOT NULL,
    "endsAt" date NOT NULL,
    price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    session_id uuid NOT NULL,
    trainee_id uuid NOT NULL,
    status public.attendance_status_enum DEFAULT 'NOT_MARKED'::public.attendance_status_enum NOT NULL,
    check_in_at timestamp with time zone,
    notes text
);


--
-- Name: auth_password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_password_reset_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    name character varying(160) NOT NULL,
    code character varying(60) NOT NULL,
    email character varying(160),
    phone character varying(30),
    address text,
    governorate character varying(120),
    city character varying(120),
    is_main boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: group_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_enrollments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    trainee_id uuid NOT NULL,
    group_id uuid NOT NULL,
    enrollment_date date NOT NULL,
    status public.enrollment_status_enum DEFAULT 'ACTIVE'::public.enrollment_status_enum NOT NULL,
    notes text
);


--
-- Name: guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guardians (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(30) NOT NULL,
    email character varying(180),
    address text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    trainee_id uuid NOT NULL,
    received_by_user_id uuid,
    payment_number character varying(80) NOT NULL,
    receipt_number character varying(80) NOT NULL,
    amount numeric(12,2) NOT NULL,
    method public.payment_method_enum NOT NULL,
    paid_at timestamp with time zone NOT NULL,
    reference_number character varying(150),
    notes text
);


--
-- Name: portal_trainee_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_trainee_links (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    user_id uuid NOT NULL,
    trainee_id uuid NOT NULL,
    relationship public.portal_relationship_enum NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: saas_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saas_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "academyId" uuid NOT NULL,
    "subscriptionId" uuid,
    amount numeric(12,2) NOT NULL,
    "paymentMethod" character varying(40) DEFAULT 'CASH'::character varying NOT NULL,
    reference character varying(150),
    "paidAt" timestamp with time zone NOT NULL,
    notes text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: saas_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saas_plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(120) NOT NULL,
    code character varying(40) NOT NULL,
    "monthlyPrice" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "yearlyPrice" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "maxBranches" integer,
    "maxUsers" integer,
    "maxTrainees" integer,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    minimum_age smallint,
    maximum_age smallint,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    sport_id uuid,
    program_id uuid,
    name character varying(160) NOT NULL,
    code character varying(60) NOT NULL,
    description text,
    duration_days integer NOT NULL,
    price numeric(12,2) NOT NULL,
    registration_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    sessions_limit integer,
    freeze_days_allowed integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: super_admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admin_audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "actorUserId" uuid,
    action character varying(120) NOT NULL,
    "entityType" character varying(100),
    "entityId" character varying(180),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: super_admin_support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admin_support_tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "academyId" uuid,
    subject character varying(180) NOT NULL,
    description text NOT NULL,
    priority character varying(20) DEFAULT 'MEDIUM'::character varying NOT NULL,
    status character varying(30) DEFAULT 'OPEN'::character varying NOT NULL,
    "requesterEmail" character varying(180),
    "assignedToUserId" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: super_admin_system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admin_system_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key character varying(160) NOT NULL,
    value jsonb NOT NULL,
    category character varying(80) DEFAULT 'GENERAL'::character varying NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "updatedByUserId" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trainee_guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainee_guardians (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    trainee_id uuid NOT NULL,
    guardian_id uuid NOT NULL,
    relationship public.guardian_relationship_enum NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    can_pickup boolean DEFAULT true NOT NULL,
    receives_notifications boolean DEFAULT true NOT NULL
);


--
-- Name: trainee_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainee_rankings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    trainee_id uuid NOT NULL,
    updated_by_user_id uuid NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    note character varying(500)
);


--
-- Name: trainee_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainee_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    trainee_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    subscription_number character varying(80) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status public.trainee_subscription_status_enum DEFAULT 'ACTIVE'::public.trainee_subscription_status_enum NOT NULL,
    subtotal_amount numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    paid_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    balance_amount numeric(12,2) NOT NULL,
    paid_in_full_at timestamp with time zone,
    notes text,
    renewed_from_subscription_id uuid,
    sessions_limit integer
);


--
-- Name: trainees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    registration_code character varying(60) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth date NOT NULL,
    gender public.trainee_gender_enum NOT NULL,
    phone character varying(30),
    email character varying(180),
    medical_notes text,
    emergency_notes text,
    status public.trainee_status_enum DEFAULT 'ACTIVE'::public.trainee_status_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    profile_image_url character varying(500),
    portal_account_status public.trainee_portal_account_status_enum DEFAULT 'NOT_CREATED'::public.trainee_portal_account_status_enum NOT NULL,
    portal_approved_at timestamp with time zone,
    portal_rejected_at timestamp with time zone,
    portal_invitation_sent_at timestamp with time zone,
    portal_invitation_expires_at timestamp with time zone
);


--
-- Name: training_group_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_group_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    group_id uuid NOT NULL,
    day_of_week public.training_day_enum NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    venue_name character varying(200),
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: training_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_groups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    program_id uuid NOT NULL,
    coach_id uuid,
    name character varying(160) NOT NULL,
    code character varying(60) NOT NULL,
    capacity integer DEFAULT 20 NOT NULL,
    status public.training_group_status_enum DEFAULT 'ACTIVE'::public.training_group_status_enum NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: training_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_programs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    sport_id uuid NOT NULL,
    name character varying(160) NOT NULL,
    code character varying(60) NOT NULL,
    description text,
    level public.training_level_enum DEFAULT 'ALL_LEVELS'::public.training_level_enum NOT NULL,
    minimum_age smallint,
    maximum_age smallint,
    sessions_per_week smallint DEFAULT '2'::smallint NOT NULL,
    session_duration_minutes smallint DEFAULT '60'::smallint NOT NULL,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: training_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    academy_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    group_id uuid NOT NULL,
    coach_id uuid,
    session_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    venue_name character varying(200),
    status public.training_session_status_enum DEFAULT 'SCHEDULED'::public.training_session_status_enum NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(180) NOT NULL,
    phone character varying(30),
    password_hash character varying(255) NOT NULL,
    status public.user_status_enum DEFAULT 'ACTIVE'::public.user_status_enum NOT NULL,
    last_login_at timestamp with time zone
);


--
-- Name: workflow_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_events (
    id uuid NOT NULL,
    academy_id uuid,
    branch_id uuid,
    event_type character varying(140) NOT NULL,
    entity_type character varying(80) NOT NULL,
    entity_id uuid,
    actor_user_id uuid,
    task_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_feedback (
    id uuid NOT NULL,
    academy_id uuid,
    branch_id uuid,
    created_by uuid NOT NULL,
    feedback_type character varying(80) NOT NULL,
    subject character varying(255) NOT NULL,
    message text NOT NULL,
    status character varying(40) DEFAULT 'OPEN'::character varying NOT NULL,
    entity_type character varying(80),
    entity_id uuid,
    assigned_task_id uuid,
    admin_response text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_outbox (
    id uuid NOT NULL,
    event_type character varying(140) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(40) DEFAULT 'PENDING'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_task_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_task_dependencies (
    id uuid NOT NULL,
    task_id uuid NOT NULL,
    depends_on_task_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_tasks (
    id uuid NOT NULL,
    academy_id uuid,
    branch_id uuid,
    entity_type character varying(80) NOT NULL,
    entity_id uuid,
    task_type character varying(120) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(40) DEFAULT 'READY'::character varying NOT NULL,
    priority character varying(30) DEFAULT 'NORMAL'::character varying NOT NULL,
    assigned_role character varying(80),
    assigned_user_id uuid,
    parent_task_id uuid,
    blocked_by_task_id uuid,
    next_route text,
    due_at timestamp with time zone,
    completed_at timestamp with time zone,
    failure_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: academy_gallery_items PK_0951f51da0e2ead0cd84e413d58; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_gallery_items
    ADD CONSTRAINT "PK_0951f51da0e2ead0cd84e413d58" PRIMARY KEY (id);


--
-- Name: group_enrollments PK_0d6111a0d2e5a2923ce0c19b259; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_enrollments
    ADD CONSTRAINT "PK_0d6111a0d2e5a2923ce0c19b259" PRIMARY KEY (id);


--
-- Name: training_groups PK_0f25b6661560a37c73b240ab3a6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_groups
    ADD CONSTRAINT "PK_0f25b6661560a37c73b240ab3a6" PRIMARY KEY (id);


--
-- Name: trainee_guardians PK_1476ed5a222acdcfb2612ef6939; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_guardians
    ADD CONSTRAINT "PK_1476ed5a222acdcfb2612ef6939" PRIMARY KEY (id);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: saas_payments PK_213143244f869cd8c39f8cb8c73; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saas_payments
    ADD CONSTRAINT "PK_213143244f869cd8c39f8cb8c73" PRIMARY KEY (id);


--
-- Name: academy_memberships PK_22e5b3fa2d81e9d7d2ca8e6b719; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_memberships
    ADD CONSTRAINT "PK_22e5b3fa2d81e9d7d2ca8e6b719" PRIMARY KEY (id);


--
-- Name: portal_trainee_links PK_23bc60c644f1bb4c2228376a8cc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_trainee_links
    ADD CONSTRAINT "PK_23bc60c644f1bb4c2228376a8cc" PRIMARY KEY (id);


--
-- Name: trainees PK_2bd729692b507a33410dbfc7604; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainees
    ADD CONSTRAINT "PK_2bd729692b507a33410dbfc7604" PRIMARY KEY (id);


--
-- Name: super_admin_support_tickets PK_30b5a290ad9cddbf3aee70244f1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_support_tickets
    ADD CONSTRAINT "PK_30b5a290ad9cddbf3aee70244f1" PRIMARY KEY (id);


--
-- Name: academy_notifications PK_35538de369d1103e7ed20e2e4a0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_notifications
    ADD CONSTRAINT "PK_35538de369d1103e7ed20e2e4a0" PRIMARY KEY (id);


--
-- Name: guardians PK_3dcf02f3dc96a2c017106f280be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT "PK_3dcf02f3dc96a2c017106f280be" PRIMARY KEY (id);


--
-- Name: trainee_subscriptions PK_41197f05dd553ef43c7bf97e75c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_subscriptions
    ADD CONSTRAINT "PK_41197f05dd553ef43c7bf97e75c" PRIMARY KEY (id);


--
-- Name: training_group_schedules PK_4314d9ec49adc914ce4e67e2a76; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_group_schedules
    ADD CONSTRAINT "PK_4314d9ec49adc914ce4e67e2a76" PRIMARY KEY (id);


--
-- Name: sports PK_4fa1063d368e1fd68ea63c7d860; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT "PK_4fa1063d368e1fd68ea63c7d860" PRIMARY KEY (id);


--
-- Name: training_sessions PK_6678399f77ed9db5176459befa9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT "PK_6678399f77ed9db5176459befa9" PRIMARY KEY (id);


--
-- Name: saas_plans PK_7828a0c1b0c60456fdd27e9c31c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saas_plans
    ADD CONSTRAINT "PK_7828a0c1b0c60456fdd27e9c31c" PRIMARY KEY (id);


--
-- Name: branches PK_7f37d3b42defea97f1df0d19535; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY (id);


--
-- Name: attendance_records PK_946920332f5bc9efad3f3023b96; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "PK_946920332f5bc9efad3f3023b96" PRIMARY KEY (id);


--
-- Name: subscription_plans PK_9ab8fe6918451ab3d0a4fb6bb0c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY (id);


--
-- Name: trainee_rankings PK_a1eea4e00253d1f437b7779406c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_rankings
    ADD CONSTRAINT "PK_a1eea4e00253d1f437b7779406c" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: academies PK_abce78680fbad7d56c23118f9e0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academies
    ADD CONSTRAINT "PK_abce78680fbad7d56c23118f9e0" PRIMARY KEY (id);


--
-- Name: academy_saas_subscriptions PK_b548b7c07a4cc339a221cf76f6b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_saas_subscriptions
    ADD CONSTRAINT "PK_b548b7c07a4cc339a221cf76f6b" PRIMARY KEY (id);


--
-- Name: academy_notification_reads PK_b7651ff70d022e9a974ca9b508f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_notification_reads
    ADD CONSTRAINT "PK_b7651ff70d022e9a974ca9b508f" PRIMARY KEY (id);


--
-- Name: password_reset_tokens PK_d16bebd73e844c48bca50ff8d3d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY (id);


--
-- Name: training_programs PK_d2f7c8d9677739e09110067656a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_programs
    ADD CONSTRAINT "PK_d2f7c8d9677739e09110067656a" PRIMARY KEY (id);


--
-- Name: super_admin_audit_logs PK_d8c3d642fd245ae36b503944d2c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_audit_logs
    ADD CONSTRAINT "PK_d8c3d642fd245ae36b503944d2c" PRIMARY KEY (id);


--
-- Name: super_admin_system_settings PK_e106cb86ee859972a47c57f4f66; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_system_settings
    ADD CONSTRAINT "PK_e106cb86ee859972a47c57f4f66" PRIMARY KEY (id);


--
-- Name: academies UQ_24497f5876129df5078cf97003a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academies
    ADD CONSTRAINT "UQ_24497f5876129df5078cf97003a" UNIQUE (slug);


--
-- Name: payments UQ_37f40df34aab6084881c0ceebdc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "UQ_37f40df34aab6084881c0ceebdc" UNIQUE (payment_number);


--
-- Name: trainee_subscriptions UQ_491921fbfff01264267ce3dbdb4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_subscriptions
    ADD CONSTRAINT "UQ_491921fbfff01264267ce3dbdb4" UNIQUE (subscription_number);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: payments UQ_a6659e5eb1bf3b467c819e7f167; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "UQ_a6659e5eb1bf3b467c819e7f167" UNIQUE (receipt_number);


--
-- Name: trainee_subscriptions UQ_add868ad05a15f16605f402f8da; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_subscriptions
    ADD CONSTRAINT "UQ_add868ad05a15f16605f402f8da" UNIQUE (renewed_from_subscription_id);


--
-- Name: attendance_records UQ_attendance_session_trainee; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "UQ_attendance_session_trainee" UNIQUE (session_id, trainee_id);


--
-- Name: branches UQ_branches_academy_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "UQ_branches_academy_code" UNIQUE (academy_id, code);


--
-- Name: super_admin_system_settings UQ_cbc3f7e90b31f8b67cc81ad7060; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_system_settings
    ADD CONSTRAINT "UQ_cbc3f7e90b31f8b67cc81ad7060" UNIQUE (key);


--
-- Name: saas_plans UQ_ee5374051982b5e9a0610c78707; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saas_plans
    ADD CONSTRAINT "UQ_ee5374051982b5e9a0610c78707" UNIQUE (code);


--
-- Name: group_enrollments UQ_group_enrollments_trainee_group; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_enrollments
    ADD CONSTRAINT "UQ_group_enrollments_trainee_group" UNIQUE (trainee_id, group_id);


--
-- Name: guardians UQ_guardians_academy_phone; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT "UQ_guardians_academy_phone" UNIQUE (academy_id, phone);


--
-- Name: portal_trainee_links UQ_portal_links_user_trainee; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_trainee_links
    ADD CONSTRAINT "UQ_portal_links_user_trainee" UNIQUE (user_id, trainee_id);


--
-- Name: sports UQ_sports_academy_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT "UQ_sports_academy_code" UNIQUE (academy_id, code);


--
-- Name: subscription_plans UQ_subscription_plans_academy_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT "UQ_subscription_plans_academy_code" UNIQUE (academy_id, code);


--
-- Name: trainee_guardians UQ_trainee_guardians_link; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_guardians
    ADD CONSTRAINT "UQ_trainee_guardians_link" UNIQUE (trainee_id, guardian_id);


--
-- Name: trainees UQ_trainees_academy_registration_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainees
    ADD CONSTRAINT "UQ_trainees_academy_registration_code" UNIQUE (academy_id, registration_code);


--
-- Name: training_group_schedules UQ_training_group_schedule_slot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_group_schedules
    ADD CONSTRAINT "UQ_training_group_schedule_slot" UNIQUE (group_id, day_of_week, start_time);


--
-- Name: training_groups UQ_training_groups_academy_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_groups
    ADD CONSTRAINT "UQ_training_groups_academy_code" UNIQUE (academy_id, code);


--
-- Name: training_programs UQ_training_programs_academy_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_programs
    ADD CONSTRAINT "UQ_training_programs_academy_code" UNIQUE (academy_id, code);


--
-- Name: training_sessions UQ_training_sessions_group_date_time; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT "UQ_training_sessions_group_date_time" UNIQUE (group_id, session_date, start_time);


--
-- Name: auth_password_reset_tokens auth_password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_password_reset_tokens
    ADD CONSTRAINT auth_password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: workflow_events workflow_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_events
    ADD CONSTRAINT workflow_events_pkey PRIMARY KEY (id);


--
-- Name: workflow_feedback workflow_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_feedback
    ADD CONSTRAINT workflow_feedback_pkey PRIMARY KEY (id);


--
-- Name: workflow_outbox workflow_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_outbox
    ADD CONSTRAINT workflow_outbox_pkey PRIMARY KEY (id);


--
-- Name: workflow_task_dependencies workflow_task_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_task_dependencies
    ADD CONSTRAINT workflow_task_dependencies_pkey PRIMARY KEY (id);


--
-- Name: workflow_task_dependencies workflow_task_dependencies_task_id_depends_on_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_task_dependencies
    ADD CONSTRAINT workflow_task_dependencies_task_id_depends_on_task_id_key UNIQUE (task_id, depends_on_task_id);


--
-- Name: workflow_tasks workflow_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_tasks
    ADD CONSTRAINT workflow_tasks_pkey PRIMARY KEY (id);


--
-- Name: IDX_29d9aab122f66e54f160fe7224; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_29d9aab122f66e54f160fe7224" ON public.academy_saas_subscriptions USING btree ("planId");


--
-- Name: IDX_455a967d5abd57794c3d80efe8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_455a967d5abd57794c3d80efe8" ON public.saas_payments USING btree ("academyId");


--
-- Name: IDX_683c01bb864c9e62c2eebd57fe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_683c01bb864c9e62c2eebd57fe" ON public.super_admin_support_tickets USING btree (status);


--
-- Name: IDX_84df2bd8d5ccbd34fec192ee3f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_84df2bd8d5ccbd34fec192ee3f" ON public.super_admin_support_tickets USING btree ("academyId");


--
-- Name: IDX_9b4c09854969da91078c760e21; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9b4c09854969da91078c760e21" ON public.super_admin_audit_logs USING btree ("actorUserId");


--
-- Name: IDX_academy_notification_reads_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_academy_notification_reads_user" ON public.academy_notification_reads USING btree (user_id);


--
-- Name: IDX_academy_notifications_academy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_academy_notifications_academy" ON public.academy_notifications USING btree (academy_id);


--
-- Name: IDX_academy_notifications_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_academy_notifications_branch" ON public.academy_notifications USING btree (branch_id);


--
-- Name: IDX_academy_notifications_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_academy_notifications_published" ON public.academy_notifications USING btree (published_at);


--
-- Name: IDX_auth_password_reset_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_auth_password_reset_expiry" ON public.auth_password_reset_tokens USING btree (expires_at);


--
-- Name: IDX_auth_password_reset_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_auth_password_reset_user" ON public.auth_password_reset_tokens USING btree (user_id);


--
-- Name: IDX_c66e7f15007d7c82da7eb4e90e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c66e7f15007d7c82da7eb4e90e" ON public.saas_payments USING btree ("subscriptionId");


--
-- Name: IDX_cbc3f7e90b31f8b67cc81ad706; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_cbc3f7e90b31f8b67cc81ad706" ON public.super_admin_system_settings USING btree (key);


--
-- Name: IDX_dfeed265fac19e285eeabf838a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dfeed265fac19e285eeabf838a" ON public.super_admin_audit_logs USING btree (action);


--
-- Name: IDX_ef45c7edb48299574f6305cb17; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ef45c7edb48299574f6305cb17" ON public.academy_saas_subscriptions USING btree ("academyId");


--
-- Name: IDX_gallery_items_academy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_gallery_items_academy" ON public.academy_gallery_items USING btree (academy_id);


--
-- Name: IDX_gallery_items_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_gallery_items_published" ON public.academy_gallery_items USING btree (published_at);


--
-- Name: IDX_memberships_academy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_memberships_academy" ON public.academy_memberships USING btree (academy_id);


--
-- Name: IDX_memberships_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_memberships_branch" ON public.academy_memberships USING btree (branch_id);


--
-- Name: IDX_memberships_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_memberships_user" ON public.academy_memberships USING btree (user_id);


--
-- Name: IDX_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_password_reset_tokens_user_id" ON public.password_reset_tokens USING btree (user_id);


--
-- Name: IDX_portal_links_academy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_portal_links_academy" ON public.portal_trainee_links USING btree (academy_id);


--
-- Name: IDX_portal_links_trainee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_portal_links_trainee" ON public.portal_trainee_links USING btree (trainee_id);


--
-- Name: IDX_portal_links_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_portal_links_user" ON public.portal_trainee_links USING btree (user_id);


--
-- Name: IDX_trainee_rankings_academy_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_trainee_rankings_academy_points" ON public.trainee_rankings USING btree (academy_id, points);


--
-- Name: UQ_academy_notification_reads_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UQ_academy_notification_reads_pair" ON public.academy_notification_reads USING btree (notification_id, user_id);


--
-- Name: UQ_auth_password_reset_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UQ_auth_password_reset_token_hash" ON public.auth_password_reset_tokens USING btree (token_hash);


--
-- Name: UQ_password_reset_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UQ_password_reset_tokens_token_hash" ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: UQ_trainee_rankings_academy_trainee; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UQ_trainee_rankings_academy_trainee" ON public.trainee_rankings USING btree (academy_id, trainee_id);


--
-- Name: idx_workflow_events_academy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_events_academy ON public.workflow_events USING btree (academy_id, created_at DESC);


--
-- Name: idx_workflow_feedback_academy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_feedback_academy ON public.workflow_feedback USING btree (academy_id, status);


--
-- Name: idx_workflow_tasks_academy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_academy ON public.workflow_tasks USING btree (academy_id);


--
-- Name: idx_workflow_tasks_assigned_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_assigned_role ON public.workflow_tasks USING btree (assigned_role);


--
-- Name: idx_workflow_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_status ON public.workflow_tasks USING btree (status);


--
-- Name: uq_workflow_open_task; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_workflow_open_task ON public.workflow_tasks USING btree (COALESCE((academy_id)::text, ''::text), entity_type, COALESCE((entity_id)::text, ''::text), task_type) WHERE ((status)::text <> ALL (ARRAY[('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text]));


--
-- Name: academy_notifications FK_0f2f8143d76ee56db060a4f9bad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_notifications
    ADD CONSTRAINT "FK_0f2f8143d76ee56db060a4f9bad" FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sports FK_13b65608cfafd0a0b40604c9e0b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT "FK_13b65608cfafd0a0b40604c9e0b" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: training_groups FK_176b037cb5517e4f762c04a8e81; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_groups
    ADD CONSTRAINT "FK_176b037cb5517e4f762c04a8e81" FOREIGN KEY (program_id) REFERENCES public.training_programs(id) ON DELETE CASCADE;


--
-- Name: trainees FK_1f8df59ea6a961aa7d7284042ec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainees
    ADD CONSTRAINT "FK_1f8df59ea6a961aa7d7284042ec" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: portal_trainee_links FK_1faba24250ad02178aa0251e1c3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_trainee_links
    ADD CONSTRAINT "FK_1faba24250ad02178aa0251e1c3" FOREIGN KEY (trainee_id) REFERENCES public.trainees(id) ON DELETE CASCADE;


--
-- Name: academy_notification_reads FK_219d43cafa5e2323fd1cb8e9b47; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_notification_reads
    ADD CONSTRAINT "FK_219d43cafa5e2323fd1cb8e9b47" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: academy_memberships FK_2bb02def9c318793c182782fcc8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_memberships
    ADD CONSTRAINT "FK_2bb02def9c318793c182782fcc8" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments FK_2d41a84786b3feea87bf36e5da1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_2d41a84786b3feea87bf36e5da1" FOREIGN KEY (received_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: group_enrollments FK_4006ea46a065c5f913c34402a92; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_enrollments
    ADD CONSTRAINT "FK_4006ea46a065c5f913c34402a92" FOREIGN KEY (trainee_id) REFERENCES public.trainees(id) ON DELETE CASCADE;


--
-- Name: guardians FK_4901e006fa3613fa40727c57344; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT "FK_4901e006fa3613fa40727c57344" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: attendance_records FK_4adff1196e749b784fdaa3daa80; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "FK_4adff1196e749b784fdaa3daa80" FOREIGN KEY (trainee_id) REFERENCES public.trainees(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens FK_52ac39dd8a28730c63aeb428c9c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscription_plans FK_680d22b1f63a73ae7038da61928; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT "FK_680d22b1f63a73ae7038da61928" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: trainee_subscriptions FK_685ac15e9ac44657a7c1a86065a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_subscriptions
    ADD CONSTRAINT "FK_685ac15e9ac44657a7c1a86065a" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: academy_memberships FK_705bf7d9a319139b8f40599aec8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_memberships
    ADD CONSTRAINT "FK_705bf7d9a319139b8f40599aec8" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: branches FK_71d24fe7245d2cdcf13a22d31bd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "FK_71d24fe7245d2cdcf13a22d31bd" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: payments FK_75848dfef07fd19027e08ca81d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_75848dfef07fd19027e08ca81d2" FOREIGN KEY (subscription_id) REFERENCES public.trainee_subscriptions(id) ON DELETE CASCADE;


--
-- Name: training_programs FK_79b08c8a641943f7eb48514b2e7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_programs
    ADD CONSTRAINT "FK_79b08c8a641943f7eb48514b2e7" FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE;


--
-- Name: academy_notification_reads FK_7cb39164c493a2012e092e3e24c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_notification_reads
    ADD CONSTRAINT "FK_7cb39164c493a2012e092e3e24c" FOREIGN KEY (notification_id) REFERENCES public.academy_notifications(id) ON DELETE CASCADE;


--
-- Name: trainees FK_80c55a0fff0aa56249628816da3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainees
    ADD CONSTRAINT "FK_80c55a0fff0aa56249628816da3" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: training_programs FK_83d49aa27bbbc96f48b33ecc9a6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_programs
    ADD CONSTRAINT "FK_83d49aa27bbbc96f48b33ecc9a6" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: subscription_plans FK_853350b343618ad93e85565e5dd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT "FK_853350b343618ad93e85565e5dd" FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE SET NULL;


--
-- Name: portal_trainee_links FK_90e90579a88d6f4403310b92e58; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_trainee_links
    ADD CONSTRAINT "FK_90e90579a88d6f4403310b92e58" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trainee_rankings FK_92d1c99d8aeac165e4ded73571d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_rankings
    ADD CONSTRAINT "FK_92d1c99d8aeac165e4ded73571d" FOREIGN KEY (trainee_id) REFERENCES public.trainees(id) ON DELETE CASCADE;


--
-- Name: training_group_schedules FK_a6a25bf8dd3eea92e0b37cb0c8d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_group_schedules
    ADD CONSTRAINT "FK_a6a25bf8dd3eea92e0b37cb0c8d" FOREIGN KEY (group_id) REFERENCES public.training_groups(id) ON DELETE CASCADE;


--
-- Name: trainee_subscriptions FK_add868ad05a15f16605f402f8da; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_subscriptions
    ADD CONSTRAINT "FK_add868ad05a15f16605f402f8da" FOREIGN KEY (renewed_from_subscription_id) REFERENCES public.trainee_subscriptions(id) ON DELETE SET NULL;


--
-- Name: training_sessions FK_af356d4c013db9b1ad558320553; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT "FK_af356d4c013db9b1ad558320553" FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auth_password_reset_tokens FK_auth_password_reset_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_password_reset_tokens
    ADD CONSTRAINT "FK_auth_password_reset_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trainee_guardians FK_b5021864ee0ae73f7273daf57be; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_guardians
    ADD CONSTRAINT "FK_b5021864ee0ae73f7273daf57be" FOREIGN KEY (guardian_id) REFERENCES public.guardians(id) ON DELETE CASCADE;


--
-- Name: payments FK_b50ef2c264e6c0fda8c639935af; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_b50ef2c264e6c0fda8c639935af" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: payments FK_b57bb6cdb436f075a43b88c8557; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_b57bb6cdb436f075a43b88c8557" FOREIGN KEY (trainee_id) REFERENCES public.trainees(id) ON DELETE CASCADE;


--
-- Name: trainee_subscriptions FK_b6441e65af85c3f86c9bdef8e77; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_subscriptions
    ADD CONSTRAINT "FK_b6441e65af85c3f86c9bdef8e77" FOREIGN KEY (trainee_id) REFERENCES public.trainees(id) ON DELETE CASCADE;


--
-- Name: trainee_subscriptions FK_b8601e4ed55379130676a84d73f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_subscriptions
    ADD CONSTRAINT "FK_b8601e4ed55379130676a84d73f" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT;


--
-- Name: academy_notifications FK_ba2f3fa11ab2089faa1ffd71aa1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_notifications
    ADD CONSTRAINT "FK_ba2f3fa11ab2089faa1ffd71aa1" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: attendance_records FK_c51be2c1149e22de76b17626cb7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "FK_c51be2c1149e22de76b17626cb7" FOREIGN KEY (session_id) REFERENCES public.training_sessions(id) ON DELETE CASCADE;


--
-- Name: academy_notifications FK_c903a104b74b049c48f23115960; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_notifications
    ADD CONSTRAINT "FK_c903a104b74b049c48f23115960" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: academy_memberships FK_cc9eac41197bdd0e0879e6a2cd0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_memberships
    ADD CONSTRAINT "FK_cc9eac41197bdd0e0879e6a2cd0" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: training_groups FK_d48d57ffabf27b75f702838367f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_groups
    ADD CONSTRAINT "FK_d48d57ffabf27b75f702838367f" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: training_groups FK_d52b35715a2b6197e4aca088402; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_groups
    ADD CONSTRAINT "FK_d52b35715a2b6197e4aca088402" FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: training_sessions FK_d5b5641189ef3ba9b1bcaba0ffa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT "FK_d5b5641189ef3ba9b1bcaba0ffa" FOREIGN KEY (group_id) REFERENCES public.training_groups(id) ON DELETE CASCADE;


--
-- Name: subscription_plans FK_d75899b488f298849b1b1f77df8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT "FK_d75899b488f298849b1b1f77df8" FOREIGN KEY (program_id) REFERENCES public.training_programs(id) ON DELETE SET NULL;


--
-- Name: portal_trainee_links FK_da88659583d922442c02bd27d23; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_trainee_links
    ADD CONSTRAINT "FK_da88659583d922442c02bd27d23" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: group_enrollments FK_e49a331a2281bbe5250fcf617ab; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_enrollments
    ADD CONSTRAINT "FK_e49a331a2281bbe5250fcf617ab" FOREIGN KEY (group_id) REFERENCES public.training_groups(id) ON DELETE CASCADE;


--
-- Name: trainee_subscriptions FK_e910c388ac04acd5dcadbfbe3a4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_subscriptions
    ADD CONSTRAINT "FK_e910c388ac04acd5dcadbfbe3a4" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: training_sessions FK_ef5b31a5d62b4cb343f9a58b2a1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT "FK_ef5b31a5d62b4cb343f9a58b2a1" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: training_sessions FK_f59dff7011d57d82825593302ae; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT "FK_f59dff7011d57d82825593302ae" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: trainee_guardians FK_f7dc03e33c5092e82c27c451059; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainee_guardians
    ADD CONSTRAINT "FK_f7dc03e33c5092e82c27c451059" FOREIGN KEY (trainee_id) REFERENCES public.trainees(id) ON DELETE CASCADE;


--
-- Name: payments FK_ff075ff238d34cfe538132c8208; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_ff075ff238d34cfe538132c8208" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- Name: training_groups FK_ffa94338539212955fa3b30fe50; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_groups
    ADD CONSTRAINT "FK_ffa94338539212955fa3b30fe50" FOREIGN KEY (academy_id) REFERENCES public.academies(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
