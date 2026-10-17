create table public.local_credential (
    identity_id uuid primary key references public.platform_identity(id) on delete cascade,
    password_hash varchar(255) not null,
    failed_attempts integer not null default 0,
    locked_until timestamptz,
    updated_at timestamptz not null default current_timestamp
);

create table public.iam_group (
    id uuid primary key,
    group_key varchar(100) not null unique,
    display_name varchar(160) not null,
    description varchar(500) not null default '',
    enabled boolean not null default true,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp
);
create table public.iam_group_member (
    group_id uuid not null references public.iam_group(id) on delete cascade,
    identity_id uuid not null references public.platform_identity(id) on delete cascade,
    primary key (group_id, identity_id)
);
create index idx_iam_group_member_identity on public.iam_group_member(identity_id);
create table public.iam_group_role (
    group_id uuid not null references public.iam_group(id) on delete cascade,
    role_id uuid not null references public.iam_role(id) on delete cascade,
    primary key (group_id, role_id)
);
create index idx_iam_group_role_role on public.iam_group_role(role_id);

insert into public.iam_permission (id, permission_key, description, created_at) values
    ('00000000-0000-0000-0000-000000000110', 'identity:write', 'Gerenciar usuários locais e acessos', current_timestamp),
    ('00000000-0000-0000-0000-000000000111', 'session:read', 'Consultar sessões ativas', current_timestamp),
    ('00000000-0000-0000-0000-000000000112', 'session:revoke', 'Encerrar sessões ativas', current_timestamp);
insert into public.iam_role_permission (role_id, permission_id)
select '00000000-0000-0000-0000-000000000001'::uuid, p.id
from public.iam_permission p
where p.permission_key in ('identity:write', 'session:read', 'session:revoke');

