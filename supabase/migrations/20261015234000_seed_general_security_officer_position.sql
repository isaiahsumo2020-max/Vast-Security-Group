do $$
begin
    if exists (
        select 1
        from public.recruitment_positions
        where lower(trim(title)) = 'general security officer'
    ) then
        update public.recruitment_positions
        set is_active = true,
            updated_at = now()
        where lower(trim(title)) = 'general security officer'
          and is_active is distinct from true;
    else
        insert into public.recruitment_positions (title, description, is_active)
        values (
            'General Security Officer',
            'General security officer opening. Applications are reviewed by the authorized recruitment team.',
            true
        );
    end if;
end;
$$;
