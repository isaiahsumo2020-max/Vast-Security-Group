create or replace function public.can_manage_vsg_recruitment()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select exists (
        select 1
        from public.admin_profiles
        where user_id = auth.uid()
          and status = 'Active'
          and (
              role = 'Super Admin'
              or permissions -> 'all' = 'true'::jsonb
              or permissions -> 'recruitment_view' = 'true'::jsonb
              or permissions -> 'recruitment_manage' = 'true'::jsonb
          )
    );
$$;

revoke all on function public.can_manage_vsg_recruitment()
    from public, anon;
grant execute on function public.can_manage_vsg_recruitment()
    to authenticated, service_role;

grant select, update on public.recruitment_applications
    to authenticated, service_role;

drop policy if exists "Recruitment admins can view applications"
    on public.recruitment_applications;
create policy "Recruitment admins can view applications"
    on public.recruitment_applications
    for select
    to authenticated
    using (public.can_manage_vsg_recruitment());

drop policy if exists "Recruitment admins can update applications"
    on public.recruitment_applications;
create policy "Recruitment admins can update applications"
    on public.recruitment_applications
    for update
    to authenticated
    using (public.can_manage_vsg_recruitment())
    with check (public.can_manage_vsg_recruitment());

grant select on public.recruitment_documents
    to authenticated, service_role;

drop policy if exists "Recruitment admins can view application documents"
    on public.recruitment_documents;
create policy "Recruitment admins can view application documents"
    on public.recruitment_documents
    for select
    to authenticated
    using (public.can_manage_vsg_recruitment());
