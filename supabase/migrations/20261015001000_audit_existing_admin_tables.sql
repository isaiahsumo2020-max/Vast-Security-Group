create or replace function public.capture_vsg_admin_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    actor_id uuid := auth.uid();
    actor_name_value text;
    actor_email_value text := auth.jwt() ->> 'email';
    old_row jsonb;
    new_row jsonb;
    entity_id_value text;
    changed_fields jsonb;
begin
    if actor_id is null then
        if tg_op = 'DELETE' then
            return old;
        end if;
        return new;
    end if;

    select full_name
    into actor_name_value
    from public.admin_profiles
    where user_id = actor_id;

    if actor_name_value is null then
        if tg_op = 'DELETE' then
            return old;
        end if;
        return new;
    end if;

    if tg_op = 'DELETE' then
        old_row := to_jsonb(old);
        entity_id_value := coalesce(
            old_row ->> 'id',
            old_row ->> 'officer_id',
            old_row ->> 'user_id'
        );
        changed_fields := '[]'::jsonb;
    elsif tg_op = 'INSERT' then
        new_row := to_jsonb(new);
        entity_id_value := coalesce(
            new_row ->> 'id',
            new_row ->> 'officer_id',
            new_row ->> 'user_id'
        );
        select coalesce(jsonb_agg(key), '[]'::jsonb)
        into changed_fields
        from jsonb_object_keys(new_row) as field(key);
    else
        old_row := to_jsonb(old);
        new_row := to_jsonb(new);
        entity_id_value := coalesce(
            new_row ->> 'id',
            new_row ->> 'officer_id',
            new_row ->> 'user_id'
        );
        select coalesce(jsonb_agg(new_fields.key), '[]'::jsonb)
        into changed_fields
        from jsonb_object_keys(new_row) as new_fields(key)
        where old_row -> new_fields.key is distinct from
            new_row -> new_fields.key;
    end if;

    insert into public.vsg_admin_audit_logs (
        actor_user_id,
        actor_name,
        actor_email,
        action,
        entity_type,
        entity_id,
        details
    ) values (
        actor_id,
        actor_name_value,
        actor_email_value,
        lower(tg_table_name) || '.' || lower(tg_op),
        tg_table_name,
        entity_id_value,
        jsonb_build_object(
            'operation', tg_op,
            'changed_fields', changed_fields
        )
    );

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

revoke all on function public.capture_vsg_admin_audit_event()
    from public, anon, authenticated;

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'admin_profiles',
        'officers',
        'clients',
        'security_posts',
        'security_post_assignments',
        'recruitment_applications',
        'recruitment_communications',
        'recruitment_documents',
        'recruitment_positions'
    ] loop
        execute format(
            'drop trigger if exists vsg_admin_audit on public.%I',
            table_name
        );
        execute format(
            'create trigger vsg_admin_audit after insert or update or delete on public.%I for each row execute function public.capture_vsg_admin_audit_event()',
            table_name
        );
    end loop;
end;
$$;
