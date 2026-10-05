CREATE TABLE public.scheduler_calendar_entry
(
    id                  varchar(80)  NOT NULL,
    name                varchar(120) NOT NULL,
    normalized_name     varchar(120) NOT NULL,
    calendar_date       date         NOT NULL,
    entry_type          varchar(40)  NOT NULL,
    scope               varchar(20)  NOT NULL,
    location            varchar(120) NOT NULL,
    normalized_location varchar(120) NOT NULL,
    notes               varchar(500) NOT NULL,
    created_at          timestamp with time zone NOT NULL,
    updated_at          timestamp with time zone NOT NULL,
    CONSTRAINT pk_scheduler_calendar_entry PRIMARY KEY (id),
    CONSTRAINT ck_scheduler_calendar_entry_type CHECK (
        entry_type IN ('Feriado', 'Data comemorativa', 'Ponto facultativo', 'Data institucional')
    ),
    CONSTRAINT ck_scheduler_calendar_entry_scope CHECK (
        scope IN ('Nacional', 'Estadual', 'Municipal', 'Corporativa')
    ),
    CONSTRAINT ck_scheduler_calendar_entry_location CHECK (
        scope NOT IN ('Estadual', 'Municipal') OR length(trim(location)) > 0
    ),
    CONSTRAINT uq_scheduler_calendar_entry UNIQUE (
        calendar_date, scope, normalized_name, normalized_location
    )
);

CREATE INDEX idx_scheduler_calendar_entry_date
    ON public.scheduler_calendar_entry (calendar_date, name);

CREATE TABLE public.scheduler_time_zone
(
    id             varchar(80)  NOT NULL,
    label          varchar(80)  NOT NULL,
    time_zone      varchar(100) NOT NULL,
    description    varchar(300) NOT NULL,
    active         boolean      NOT NULL,
    is_default     boolean      NOT NULL,
    default_marker varchar(16),
    created_at     timestamp with time zone NOT NULL,
    updated_at     timestamp with time zone NOT NULL,
    CONSTRAINT pk_scheduler_time_zone PRIMARY KEY (id),
    CONSTRAINT uq_scheduler_time_zone_name UNIQUE (time_zone),
    CONSTRAINT uq_scheduler_time_zone_default UNIQUE (default_marker),
    CONSTRAINT ck_scheduler_time_zone_default CHECK (
        (is_default AND active AND default_marker = 'DEFAULT')
        OR (NOT is_default AND default_marker IS NULL)
    )
);

CREATE TABLE public.scheduler_job_group
(
    id          varchar(80)  NOT NULL,
    group_key   varchar(80)  NOT NULL,
    name        varchar(80)  NOT NULL,
    description varchar(300) NOT NULL,
    active      boolean      NOT NULL,
    created_at  timestamp with time zone NOT NULL,
    updated_at  timestamp with time zone NOT NULL,
    CONSTRAINT pk_scheduler_job_group PRIMARY KEY (id),
    CONSTRAINT uq_scheduler_job_group_key UNIQUE (group_key)
);

CREATE TABLE public.scheduler_job_metadata
(
    job_name             varchar(200) NOT NULL,
    job_group            varchar(200) NOT NULL,
    description          varchar(500) NOT NULL,
    logical_job_class    varchar(500) NOT NULL,
    disallow_concurrent  boolean      NOT NULL,
    persist_job_data     boolean      NOT NULL,
    interruptable        boolean      NOT NULL,
    created_at           timestamp with time zone NOT NULL,
    updated_at           timestamp with time zone NOT NULL,
    CONSTRAINT pk_scheduler_job_metadata PRIMARY KEY (job_name, job_group)
);

CREATE TABLE public.scheduler_job_data
(
    job_name   varchar(200) NOT NULL,
    job_group  varchar(200) NOT NULL,
    data_key   varchar(200) NOT NULL,
    data_type  varchar(16)  NOT NULL,
    data_value varchar(4000) NOT NULL,
    sensitive  boolean      NOT NULL,
    CONSTRAINT pk_scheduler_job_data PRIMARY KEY (job_name, job_group, data_key),
    CONSTRAINT fk_scheduler_job_data_job FOREIGN KEY (job_name, job_group)
        REFERENCES public.scheduler_job_metadata (job_name, job_group) ON DELETE CASCADE,
    CONSTRAINT ck_scheduler_job_data_type CHECK (
        data_type IN ('String', 'Integer', 'Boolean', 'JSON')
    )
);

CREATE TABLE public.scheduler_trigger_metadata
(
    trigger_name        varchar(200) NOT NULL,
    trigger_group       varchar(200) NOT NULL,
    job_name            varchar(200) NOT NULL,
    job_group           varchar(200) NOT NULL,
    trigger_type        varchar(40)  NOT NULL,
    expression          varchar(500) NOT NULL,
    time_zone           varchar(100) NOT NULL,
    calendar_name       varchar(200),
    misfire_instruction varchar(80)  NOT NULL,
    created_at          timestamp with time zone NOT NULL,
    updated_at          timestamp with time zone NOT NULL,
    CONSTRAINT pk_scheduler_trigger_metadata PRIMARY KEY (trigger_name, trigger_group),
    CONSTRAINT fk_scheduler_trigger_metadata_job FOREIGN KEY (job_name, job_group)
        REFERENCES public.scheduler_job_metadata (job_name, job_group) ON DELETE CASCADE,
    CONSTRAINT ck_scheduler_trigger_metadata_type CHECK (
        trigger_type IN ('CronTrigger', 'SimpleTrigger', 'CalendarIntervalTrigger', 'DailyTimeIntervalTrigger')
    )
);

CREATE INDEX idx_scheduler_trigger_metadata_job
    ON public.scheduler_trigger_metadata (job_name, job_group);

CREATE TABLE public.scheduler_execution_history
(
    id                    bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    fire_instance_id      varchar(200) NOT NULL,
    job_name              varchar(200) NOT NULL,
    job_group             varchar(200) NOT NULL,
    trigger_name          varchar(200),
    trigger_group         varchar(200),
    scheduler_instance    varchar(200) NOT NULL,
    scheduled_fire_time   timestamp with time zone,
    actual_fire_time      timestamp with time zone NOT NULL,
    finished_at           timestamp with time zone,
    duration_ms           bigint,
    result                varchar(24) NOT NULL,
    message               varchar(1000) NOT NULL,
    refire_count          integer NOT NULL,
    recovering            boolean NOT NULL,
    interruption_requested boolean NOT NULL,
    CONSTRAINT pk_scheduler_execution_history PRIMARY KEY (id),
    CONSTRAINT uq_scheduler_execution_fire_instance UNIQUE (fire_instance_id),
    CONSTRAINT ck_scheduler_execution_result CHECK (
        result IN ('RUNNING', 'SUCCESS', 'FAILED', 'RECOVERED', 'INTERRUPTION_REQUESTED')
    )
);

CREATE INDEX idx_scheduler_execution_history_started
    ON public.scheduler_execution_history (actual_fire_time DESC, id DESC);
CREATE INDEX idx_scheduler_execution_history_job
    ON public.scheduler_execution_history (job_group, job_name, actual_fire_time DESC);

INSERT INTO public.scheduler_time_zone (
    id, label, time_zone, description, active, is_default, default_marker, created_at, updated_at
) VALUES
    ('TZ-america-sao-paulo', 'Horário de Brasília', 'America/Sao_Paulo',
     'Fuso horário padrão para rotinas operacionais no Brasil.', true, true, 'DEFAULT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('TZ-utc', 'Tempo Universal Coordenado', 'UTC',
     'Referência universal para integrações e processamento técnico.', true, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO public.scheduler_job_group (
    id, group_key, name, description, active, created_at, updated_at
) VALUES
    ('JOB-GROUP-financeiro', 'financeiro', 'Financeiro', 'Rotinas de faturamento, fechamento e processamento financeiro.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('JOB-GROUP-plataforma', 'plataforma', 'Plataforma', 'Serviços compartilhados e rotinas internas da plataforma.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('JOB-GROUP-grc', 'grc', 'GRC', 'Governança, riscos, conformidade e entregas regulatórias.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('JOB-GROUP-observabilidade', 'observabilidade', 'Observabilidade', 'Processamentos internos de métricas, logs e telemetria.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('JOB-GROUP-mensageria', 'mensageria', 'Mensageria', 'Processamento, recuperação e manutenção de filas e eventos.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('JOB-GROUP-operacoes', 'operacoes', 'Operações', 'Conciliações e rotinas recorrentes de operação.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('JOB-GROUP-exportacao', 'exportacao', 'Exportação', 'Geração e entrega de arquivos sob demanda.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
