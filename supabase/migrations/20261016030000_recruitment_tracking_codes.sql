do $$
declare
    application_table text;
    found_application_table boolean := false;
    tracking_index text;
    tracking_constraint text;
begin
    foreach application_table in array array[
        'recruitment_applications',
        'recruitment_application'
    ] loop
        if to_regclass(format('public.%I', application_table)) is not null then
            found_application_table := true;
            tracking_index := application_table || '_tracking_code_uidx';
            tracking_constraint := application_table || '_tracking_code_check';

            execute format(
                'alter table public.%I add column if not exists tracking_code text',
                application_table
            );
            execute format(
                'create unique index if not exists %I on public.%I (tracking_code) where tracking_code is not null',
                tracking_index,
                application_table
            );

            if not exists (
                select 1
                from pg_constraint
                where conname = tracking_constraint
                  and conrelid = to_regclass(format('public.%I', application_table))
            ) then
                execute format(
                    'alter table public.%I add constraint %I check (tracking_code is null or tracking_code ~ %L) not valid',
                    application_table,
                    tracking_constraint,
                    '^[0-9]{6}$'
                );
            end if;

            execute format(
                'drop policy if exists %I on public.%I',
                'Public can submit pending recruitment applications',
                application_table
            );
            execute format(
                'create policy %I on public.%I for insert to anon, authenticated with check (status = %L and tracking_code ~ %L)',
                'Public can submit pending recruitment applications',
                application_table,
                'Pending',
                '^[0-9]{6}$'
            );
        end if;
    end loop;

    if not found_application_table then
        raise exception 'No recruitment application table exists';
    end if;
end;
$$;

create or replace function public.get_recruitment_application_status(
    tracking_code_input text
)
returns table (application_status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    application_table text;
begin
    if tracking_code_input is null
       or tracking_code_input !~ '^[0-9]{6}$' then
        return;
    end if;

    if to_regclass('public.recruitment_applications') is not null then
        application_table := 'recruitment_applications';
    elsif to_regclass('public.recruitment_application') is not null then
        application_table := 'recruitment_application';
    else
        raise exception 'No recruitment application table exists';
    end if;

    return query execute format(
        'select status::text from public.%I where tracking_code = $1 limit 1',
        application_table
    ) using tracking_code_input;
end;
$$;

revoke all on function public.get_recruitment_application_status(text)
    from public, anon, authenticated;
grant execute on function public.get_recruitment_application_status(text)
    to anon, authenticated;
