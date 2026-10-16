do $$
declare
    application_table text;
    found_application_table boolean := false;
begin
    foreach application_table in array array[
        'recruitment_applications',
        'recruitment_application'
    ] loop
        if to_regclass(format('public.%I', application_table)) is not null then
            found_application_table := true;

            execute format(
                'alter table public.%I enable row level security',
                application_table
            );
            execute format(
                'drop policy if exists %I on public.%I',
                'Public can submit pending recruitment applications',
                application_table
            );
            execute format(
                'create policy %I on public.%I for insert to anon, authenticated with check (status = %L)',
                'Public can submit pending recruitment applications',
                application_table,
                'Pending'
            );
            execute format(
                'grant insert on table public.%I to anon, authenticated',
                application_table
            );
        end if;
    end loop;

    if not found_application_table then
        raise exception 'No recruitment application table exists';
    end if;
end;
$$;
