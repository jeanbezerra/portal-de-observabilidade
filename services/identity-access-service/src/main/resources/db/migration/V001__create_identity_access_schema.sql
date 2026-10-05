create table identity_provider (
    id uuid primary key,
    provider_key varchar(63) not null unique,
    display_name varchar(120) not null,
    type varchar(16) not null check (type in ('SAML', 'OIDC', 'LDAP')),
    interaction varchar(16) not null check (interaction in ('REDIRECT', 'CREDENTIALS')),
    status varchar(16) not null check (status in ('DRAFT', 'VALIDATED', 'ENABLED', 'DISABLED', 'ERROR')),
    priority integer not null check (priority >= 0),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    version bigint not null default 0
);

create index idx_identity_provider_status_priority
    on identity_provider (status, priority, display_name);

create table identity_provider_setting (
    provider_id uuid not null references identity_provider(id) on delete cascade,
    setting_key varchar(100) not null,
    setting_value varchar(2048) not null,
    primary key (provider_id, setting_key)
);

create table provider_attribute_mapping (
    provider_id uuid not null references identity_provider(id) on delete cascade,
    platform_attribute varchar(100) not null,
    external_attribute varchar(255) not null,
    primary key (provider_id, platform_attribute)
);

create table platform_identity (
    id uuid primary key,
    subject varchar(64) not null unique,
    username varchar(255) not null,
    email varchar(320),
    display_name varchar(255) not null,
    enabled boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create unique index uq_platform_identity_username_lower on platform_identity (lower(username));

create table external_identity_link (
    id uuid primary key,
    identity_id uuid not null references platform_identity(id) on delete cascade,
    provider_id uuid not null references identity_provider(id),
    external_subject varchar(512) not null,
    last_authenticated_at timestamptz,
    created_at timestamptz not null,
    unique (provider_id, external_subject)
);

create table iam_role (
    id uuid primary key,
    role_key varchar(100) not null unique,
    display_name varchar(160) not null,
    description varchar(500),
    enabled boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table iam_permission (
    id uuid primary key,
    permission_key varchar(140) not null unique,
    description varchar(500),
    created_at timestamptz not null,
    check (permission_key ~ '^[a-z][a-z0-9-]{1,62}:[a-z][a-z0-9-]{1,62}$')
);

create table iam_role_permission (
    role_id uuid not null references iam_role(id) on delete cascade,
    permission_id uuid not null references iam_permission(id) on delete cascade,
    primary key (role_id, permission_id)
);

create table iam_principal_role (
    principal_subject varchar(255) not null,
    role_id uuid not null references iam_role(id) on delete cascade,
    granted_at timestamptz not null,
    granted_by varchar(255) not null,
    primary key (principal_subject, role_id)
);

create index idx_iam_principal_role_subject on iam_principal_role (principal_subject);

create table iam_group_role_mapping (
    id uuid primary key,
    provider_id varchar(63) not null,
    external_group varchar(255) not null,
    role_id uuid not null references iam_role(id) on delete cascade,
    created_at timestamptz not null,
    unique (provider_id, external_group, role_id)
);

create index idx_iam_group_role_mapping_lookup
    on iam_group_role_mapping (provider_id, external_group);

create table authorization_policy (
    id uuid primary key,
    policy_key varchar(100) not null unique,
    description varchar(500),
    effect varchar(10) not null check (effect in ('ALLOW', 'DENY')),
    resource_pattern varchar(255) not null,
    action_pattern varchar(255) not null,
    conditions jsonb not null default '{}'::jsonb,
    enabled boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table audit_event (
    id uuid primary key,
    occurred_at timestamptz not null,
    event_type varchar(100) not null,
    actor_subject varchar(255) not null,
    target varchar(255) not null,
    provider_id varchar(63),
    outcome varchar(20) not null,
    trace_id varchar(64),
    source_context varchar(255)
);

create index idx_audit_event_occurred_at on audit_event (occurred_at desc);
create index idx_audit_event_actor on audit_event (actor_subject, occurred_at desc);
create index idx_audit_event_type on audit_event (event_type, occurred_at desc);

insert into iam_role (id, role_key, display_name, description, enabled, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000001', 'OBS_ADMIN', 'OBS Administrator',
        'Full administration of identity and access configuration', true, current_timestamp, current_timestamp);

insert into iam_permission (id, permission_key, description, created_at) values
    ('00000000-0000-0000-0000-000000000101', 'identity-provider:read', 'Read identity providers', current_timestamp),
    ('00000000-0000-0000-0000-000000000102', 'identity-provider:create', 'Create identity providers', current_timestamp),
    ('00000000-0000-0000-0000-000000000103', 'identity-provider:update', 'Update and validate identity providers', current_timestamp),
    ('00000000-0000-0000-0000-000000000104', 'identity-provider:enable', 'Enable identity providers', current_timestamp),
    ('00000000-0000-0000-0000-000000000105', 'identity-provider:disable', 'Disable identity providers', current_timestamp),
    ('00000000-0000-0000-0000-000000000106', 'identity:read', 'Read normalized identities', current_timestamp),
    ('00000000-0000-0000-0000-000000000107', 'role:read', 'Read roles and permissions', current_timestamp),
    ('00000000-0000-0000-0000-000000000108', 'role:write', 'Manage roles and permissions', current_timestamp),
    ('00000000-0000-0000-0000-000000000109', 'audit:read', 'Read security audit events', current_timestamp);

insert into iam_role_permission (role_id, permission_id)
select '00000000-0000-0000-0000-000000000001'::uuid, id from iam_permission;
