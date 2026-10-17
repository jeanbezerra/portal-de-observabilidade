-- Additive: export authorization is independent of audit consultation.
insert into public.iam_permission(id,permission_key,description,created_at)
values ('00000000-0000-0000-0000-000000000113','audit:export','Exportar evidências de auditoria com finalidade registrada',current_timestamp);
insert into public.iam_role_permission(role_id,permission_id)
select r.id,p.id from public.iam_role r cross join public.iam_permission p
where r.role_key='OBS_ADMIN' and p.permission_key='audit:export';

create table public.audit_export_receipt (
    id uuid primary key,
    requested_by varchar(255) not null,
    created_at timestamptz not null,
    format varchar(5) not null check(format in ('csv','json','xlsx','pdf')),
    purpose varchar(500) not null,
    record_count integer not null check(record_count between 1 and 10000),
    dataset_sha256 varchar(64) not null,
    filters jsonb not null
);
comment on table public.audit_export_receipt is 'Evidence of generated exports; does not prove download, delivery or legal compliance.';
