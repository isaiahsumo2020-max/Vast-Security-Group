create table if not exists public.vsg_certificate_number_sequences (
    certificate_year integer primary key,
    last_number integer not null default 0 check (last_number >= 0)
);

create table if not exists public.vsg_training_programs (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) between 1 and 160),
    duration_hours numeric(8, 2) not null check (duration_hours > 0),
    description text,
    certificate_template_id uuid,
    is_active boolean not null default true,
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.vsg_certificate_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) between 1 and 160),
    current_version integer not null default 1 check (current_version > 0),
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.vsg_certificate_template_versions (
    id uuid primary key default gen_random_uuid(),
    template_id uuid not null references public.vsg_certificate_templates (id) on delete restrict,
    version integer not null check (version > 0),
    configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    unique (template_id, version),
    unique (id, template_id)
);

alter table public.vsg_training_programs
    add constraint vsg_training_programs_template_fk
    foreign key (certificate_template_id)
    references public.vsg_certificate_templates (id)
    on delete set null;

create table if not exists public.vsg_training_batches (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references public.vsg_training_programs (id) on delete restrict,
    name text not null check (length(trim(name)) between 1 and 160),
    start_date date not null,
    completion_date date,
    description text,
    status text not null default 'Planned'
        check (status in ('Planned', 'In Progress', 'Completed', 'Cancelled')),
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (completion_date is null or completion_date >= start_date)
);

create table if not exists public.vsg_training_enrollments (
    id uuid primary key default gen_random_uuid(),
    batch_id uuid not null references public.vsg_training_batches (id) on delete restrict,
    officer_id uuid not null references public.officers (id) on delete restrict,
    enrollment_status text not null default 'Enrolled'
        check (enrollment_status in ('Enrolled', 'In Progress', 'Completed', 'Withdrawn')),
    completion_date date,
    notes text,
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (batch_id, officer_id),
    check (enrollment_status <> 'Completed' or completion_date is not null)
);

create table if not exists public.vsg_certificates (
    id uuid primary key default gen_random_uuid(),
    certificate_id text not null unique,
    public_verification_id uuid not null unique default gen_random_uuid(),
    officer_id uuid not null references public.officers (id) on delete restrict,
    program_id uuid not null references public.vsg_training_programs (id) on delete restrict,
    batch_id uuid not null references public.vsg_training_batches (id) on delete restrict,
    enrollment_id uuid not null references public.vsg_training_enrollments (id) on delete restrict,
    template_version_id uuid not null references public.vsg_certificate_template_versions (id) on delete restrict,
    status text not null default 'Draft'
        check (status in ('Draft', 'Pending Approval', 'Issued', 'Revoked')),
    issued_at timestamptz,
    revoked_at timestamptz,
    revocation_reason text,
    snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
    reissued_from uuid references public.vsg_certificates (id) on delete restrict,
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (
        (status not in ('Issued', 'Revoked') or issued_at is not null)
        and (status <> 'Revoked' or
            (revoked_at is not null and length(trim(coalesce(revocation_reason, ''))) > 0))
    )
);

create table if not exists public.vsg_certificate_status_history (
    id uuid primary key default gen_random_uuid(),
    certificate_id uuid not null references public.vsg_certificates (id) on delete restrict,
    previous_status text,
    new_status text not null
        check (new_status in ('Draft', 'Pending Approval', 'Issued', 'Revoked')),
    reason text,
    actor_user_id uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists vsg_training_batches_program_dates_idx
    on public.vsg_training_batches (program_id, start_date desc);
create index if not exists vsg_training_enrollments_batch_status_idx
    on public.vsg_training_enrollments (batch_id, enrollment_status);
create index if not exists vsg_certificates_officer_created_idx
    on public.vsg_certificates (officer_id, created_at desc);
create index if not exists vsg_certificates_status_created_idx
    on public.vsg_certificates (status, created_at desc);
create unique index if not exists vsg_certificates_original_enrollment_unique
    on public.vsg_certificates (enrollment_id)
    where reissued_from is null;
create index if not exists vsg_certificate_status_history_certificate_idx
    on public.vsg_certificate_status_history (certificate_id, created_at desc);

alter table public.vsg_certificate_number_sequences enable row level security;
alter table public.vsg_training_programs enable row level security;
alter table public.vsg_training_batches enable row level security;
alter table public.vsg_training_enrollments enable row level security;
alter table public.vsg_certificate_templates enable row level security;
alter table public.vsg_certificate_template_versions enable row level security;
alter table public.vsg_certificates enable row level security;
alter table public.vsg_certificate_status_history enable row level security;

revoke all on public.vsg_certificate_number_sequences from anon, authenticated;
revoke all on public.vsg_training_programs from anon, authenticated;
revoke all on public.vsg_training_batches from anon, authenticated;
revoke all on public.vsg_training_enrollments from anon, authenticated;
revoke all on public.vsg_certificate_templates from anon, authenticated;
revoke all on public.vsg_certificate_template_versions from anon, authenticated;
revoke all on public.vsg_certificates from anon, authenticated;
revoke all on public.vsg_certificate_status_history from anon, authenticated;
grant all on public.vsg_certificate_number_sequences to service_role;
grant all on public.vsg_training_programs to service_role;
grant all on public.vsg_training_batches to service_role;
grant all on public.vsg_training_enrollments to service_role;
grant all on public.vsg_certificate_templates to service_role;
grant all on public.vsg_certificate_template_versions to service_role;
grant all on public.vsg_certificates to service_role;
grant all on public.vsg_certificate_status_history to service_role;

insert into storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
)
values (
    'vsg-certificate-assets',
    'vsg-certificate-assets',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create or replace function public.prevent_issued_certificate_changes()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if old.status = 'Revoked' then
        raise exception 'Revoked certificates are immutable';
    end if;

    if old.status = 'Issued' and (
        new.certificate_id is distinct from old.certificate_id
        or new.public_verification_id is distinct from old.public_verification_id
        or new.officer_id is distinct from old.officer_id
        or new.program_id is distinct from old.program_id
        or new.batch_id is distinct from old.batch_id
        or new.enrollment_id is distinct from old.enrollment_id
        or new.template_version_id is distinct from old.template_version_id
        or new.issued_at is distinct from old.issued_at
        or (
            new.status = 'Issued'
            and (
                new.revoked_at is distinct from old.revoked_at
                or new.revocation_reason is distinct from old.revocation_reason
            )
        )
        or new.snapshot is distinct from old.snapshot
        or new.reissued_from is distinct from old.reissued_from
    ) then
        raise exception 'Issued certificate details are immutable; create a reissue';
    end if;

    if old.status = 'Issued' and new.status not in ('Issued', 'Revoked') then
        raise exception 'Issued certificate status cannot be changed';
    end if;

    if old.status = 'Issued' and new.status = 'Revoked' and
        length(trim(coalesce(new.revocation_reason, ''))) = 0 then
        raise exception 'A revocation reason is required';
    end if;

    return new;
end;
$$;

drop trigger if exists prevent_issued_certificate_changes_trigger
    on public.vsg_certificates;
create trigger prevent_issued_certificate_changes_trigger
    before update on public.vsg_certificates
    for each row execute function public.prevent_issued_certificate_changes();

create or replace function public.prevent_certificate_template_version_changes()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    raise exception 'Certificate template versions are immutable; create a new version';
end;
$$;

drop trigger if exists prevent_certificate_template_version_changes_trigger
    on public.vsg_certificate_template_versions;
create trigger prevent_certificate_template_version_changes_trigger
    before update or delete on public.vsg_certificate_template_versions
    for each row execute function public.prevent_certificate_template_version_changes();

create or replace function public.vsg_create_certificate_template(
    p_name text,
    p_configuration jsonb,
    p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    new_template public.vsg_certificate_templates;
    new_version public.vsg_certificate_template_versions;
begin
    insert into public.vsg_certificate_templates (name, created_by)
    values (trim(p_name), p_actor_user_id)
    returning * into new_template;

    insert into public.vsg_certificate_template_versions (
        template_id, version, configuration, created_by
    )
    values (
        new_template.id, 1, p_configuration, p_actor_user_id
    )
    returning * into new_version;

    return jsonb_build_object(
        'template', to_jsonb(new_template),
        'version', to_jsonb(new_version)
    );
end;
$$;

create or replace function public.vsg_add_certificate_template_version(
    p_template_id uuid,
    p_configuration jsonb,
    p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    existing_template public.vsg_certificate_templates;
    new_version public.vsg_certificate_template_versions;
begin
    select * into existing_template
    from public.vsg_certificate_templates
    where id = p_template_id
    for update;

    if not found then
        raise exception 'Certificate template not found';
    end if;

    insert into public.vsg_certificate_template_versions (
        template_id, version, configuration, created_by
    )
    values (
        existing_template.id,
        existing_template.current_version + 1,
        p_configuration,
        p_actor_user_id
    )
    returning * into new_version;

    update public.vsg_certificate_templates
    set current_version = new_version.version,
        updated_at = now()
    where id = existing_template.id;
    existing_template.current_version := new_version.version;

    return jsonb_build_object(
        'template', to_jsonb(existing_template),
        'version', to_jsonb(new_version)
    );
end;
$$;

revoke all on function public.vsg_create_certificate_template(text, jsonb, uuid)
    from public, anon, authenticated;
grant execute on function public.vsg_create_certificate_template(text, jsonb, uuid)
    to service_role;
revoke all on function public.vsg_add_certificate_template_version(uuid, jsonb, uuid)
    from public, anon, authenticated;
grant execute on function public.vsg_add_certificate_template_version(uuid, jsonb, uuid)
    to service_role;

create or replace function public.vsg_revoke_certificate(
    p_certificate_id uuid,
    p_reason text,
    p_actor_user_id uuid
)
returns public.vsg_certificates
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    existing_certificate public.vsg_certificates;
    revoked_certificate public.vsg_certificates;
begin
    if length(trim(coalesce(p_reason, ''))) = 0 or length(p_reason) > 2000 then
        raise exception 'A valid certificate revocation reason is required';
    end if;

    select * into existing_certificate
    from public.vsg_certificates
    where id = p_certificate_id
    for update;

    if not found then
        raise exception 'Certificate not found';
    end if;
    if existing_certificate.status <> 'Issued' then
        raise exception 'Only an issued certificate can be revoked';
    end if;

    update public.vsg_certificates
    set status = 'Revoked',
        revoked_at = now(),
        revocation_reason = trim(p_reason),
        updated_at = now()
    where id = existing_certificate.id
    returning * into revoked_certificate;

    insert into public.vsg_certificate_status_history (
        certificate_id, previous_status, new_status, reason, actor_user_id
    )
    values (
        revoked_certificate.id, 'Issued', 'Revoked',
        trim(p_reason), p_actor_user_id
    );

    return revoked_certificate;
end;
$$;

revoke all on function public.vsg_revoke_certificate(uuid, text, uuid)
    from public, anon, authenticated;
grant execute on function public.vsg_revoke_certificate(uuid, text, uuid)
    to service_role;

create or replace function public.vsg_issue_certificate(
    p_enrollment_id uuid,
    p_template_version_id uuid,
    p_actor_user_id uuid,
    p_reissued_from uuid default null
)
returns public.vsg_certificates
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    enrollment record;
    selected_template record;
    sequence_number integer;
    new_certificate public.vsg_certificates;
    current_year integer := extract(year from now())::integer;
    certificate_snapshot jsonb;
begin
    select
        e.id as enrollment_id,
        e.officer_id,
        e.batch_id,
        e.completion_date,
        o.officer_id as officer_code,
        o.name as officer_name,
        b.program_id,
        b.name as batch_name,
        b.start_date,
        b.completion_date as batch_completion_date,
        p.name as program_name,
        p.duration_hours,
        p.certificate_template_id
    into enrollment
    from public.vsg_training_enrollments e
    join public.officers o on o.id = e.officer_id
    join public.vsg_training_batches b on b.id = e.batch_id
    join public.vsg_training_programs p on p.id = b.program_id
    where e.id = p_enrollment_id
      and e.enrollment_status = 'Completed'
      and p.is_active = true
      and b.status <> 'Cancelled';

    if not found then
        raise exception 'Officer must have a completed enrollment in an active program';
    end if;

    select tv.id, tv.configuration, tv.template_id, tv.version
    into selected_template
    from public.vsg_certificate_template_versions tv
    where tv.id = p_template_version_id;

    if not found then
        raise exception 'Selected certificate template does not exist';
    end if;

    if enrollment.certificate_template_id is not null
        and selected_template.template_id <> enrollment.certificate_template_id then
        raise exception 'Selected certificate template is not assigned to this program';
    end if;

    if p_reissued_from is not null and not exists (
        select 1 from public.vsg_certificates c
        where c.id = p_reissued_from
          and c.officer_id = enrollment.officer_id
          and c.program_id = enrollment.program_id
          and c.batch_id = enrollment.batch_id
          and c.enrollment_id = enrollment.enrollment_id
          and c.status in ('Issued', 'Revoked')
    ) then
        raise exception 'Reissue must reference an issued or revoked certificate for the same officer';
    end if;

    if p_reissued_from is null and exists (
        select 1
        from public.vsg_certificates c
        where c.enrollment_id = enrollment.enrollment_id
          and c.reissued_from is null
    ) then
        raise exception 'An original certificate already exists for this training enrollment; reissue it instead';
    end if;

    insert into public.vsg_certificate_number_sequences (certificate_year, last_number)
    values (current_year, 1)
    on conflict (certificate_year)
    do update set last_number =
        public.vsg_certificate_number_sequences.last_number + 1
    returning last_number into sequence_number;

    certificate_snapshot := jsonb_build_object(
        'officer_name', enrollment.officer_name,
        'officer_id', enrollment.officer_code,
        'program_name', enrollment.program_name,
        'duration_hours', enrollment.duration_hours,
        'batch_name', enrollment.batch_name,
        'start_date', enrollment.start_date,
        'completion_date', coalesce(enrollment.completion_date, enrollment.batch_completion_date),
        'completion_statement', coalesce(
            selected_template.configuration ->> 'completion_statement',
            'has successfully completed the training program'
        ),
        'title', coalesce(
            selected_template.configuration ->> 'title',
            'CERTIFICATE OF COMPLETION'
        ),
        'name_font', coalesce(selected_template.configuration ->> 'name_font', 'Georgia'),
        'body_font', coalesce(selected_template.configuration ->> 'body_font', 'Arial'),
        'layout', coalesce(selected_template.configuration -> 'layout', '{}'::jsonb),
        'signatories', coalesce(
            selected_template.configuration -> 'signatories',
            '[]'::jsonb
        ),
        'template_configuration', selected_template.configuration,
        'template_version', selected_template.version,
        'template_id', selected_template.template_id
    );

    insert into public.vsg_certificates (
        certificate_id,
        officer_id,
        program_id,
        batch_id,
        enrollment_id,
        template_version_id,
        status,
        issued_at,
        snapshot,
        reissued_from,
        created_by
    )
    values (
        'VSG-TRN-' || current_year::text || '-' || lpad(sequence_number::text, 3, '0'),
        enrollment.officer_id,
        enrollment.program_id,
        enrollment.batch_id,
        enrollment.enrollment_id,
        selected_template.id,
        'Issued',
        now(),
        certificate_snapshot,
        p_reissued_from,
        p_actor_user_id
    )
    returning * into new_certificate;

    insert into public.vsg_certificate_status_history (
        certificate_id, previous_status, new_status, reason, actor_user_id
    )
    values (
        new_certificate.id,
        null,
        'Issued',
        case when p_reissued_from is null then 'Certificate issued' else 'Certificate reissued' end,
        p_actor_user_id
    );

    return new_certificate;
end;
$$;

revoke all on function public.vsg_issue_certificate(uuid, uuid, uuid, uuid)
    from public, anon, authenticated;
grant execute on function public.vsg_issue_certificate(uuid, uuid, uuid, uuid)
    to service_role;
