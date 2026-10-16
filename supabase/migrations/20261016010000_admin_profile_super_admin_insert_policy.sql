create or replace function public.is_active_vsg_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.admin_profiles
        where user_id = auth.uid()
          and role = 'Super Admin'
          and status = 'Active'
    );
$$;

revoke all on function public.is_active_vsg_super_admin()
    from public, anon;
grant execute on function public.is_active_vsg_super_admin()
    to authenticated, service_role;

grant insert on public.admin_profiles to authenticated, service_role;

drop policy if exists "Active Super Admins can create administrator profiles"
    on public.admin_profiles;
create policy "Active Super Admins can create administrator profiles"
    on public.admin_profiles
    for insert
    to authenticated
    with check (public.is_active_vsg_super_admin());

drop policy if exists "Service role can create administrator profiles"
    on public.admin_profiles;
create policy "Service role can create administrator profiles"
    on public.admin_profiles
    for insert
    to service_role
    with check (true);
