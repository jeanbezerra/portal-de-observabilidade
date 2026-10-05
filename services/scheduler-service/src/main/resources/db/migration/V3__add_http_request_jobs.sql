ALTER TABLE public.scheduler_job_metadata
    ADD COLUMN job_type varchar(40) NOT NULL DEFAULT 'LEGACY_JAVA';

ALTER TABLE public.scheduler_job_metadata
    ADD COLUMN execution_configuration text;

ALTER TABLE public.scheduler_job_metadata
    ADD CONSTRAINT ck_scheduler_job_metadata_type CHECK (
        job_type IN ('HTTP_REQUEST', 'LEGACY_JAVA')
    );

ALTER TABLE public.scheduler_job_metadata
    ADD CONSTRAINT ck_scheduler_job_metadata_configuration CHECK (
        (job_type = 'HTTP_REQUEST' AND execution_configuration IS NOT NULL)
        OR (job_type = 'LEGACY_JAVA')
    );
