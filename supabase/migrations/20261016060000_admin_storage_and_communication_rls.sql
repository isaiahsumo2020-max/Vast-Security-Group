insert into public.vsg_website_content (content_key, content_value)
values ('officer_id_prefix', 'VSG')
on conflict (content_key) do nothing;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'officer-photos',
    'officer-photos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_upload_vsg_officer_photo()
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
              or permissions -> 'officers_create' = 'true'::jsonb
              or permissions -> 'officers_edit' = 'true'::jsonb
          )
    );
$$;

create or replace function public.can_delete_vsg_officer_photo()
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
              or permissions -> 'officers_edit' = 'true'::jsonb
              or permissions -> 'officers_delete' = 'true'::jsonb
          )
    );
$$;

revoke all on function public.can_upload_vsg_officer_photo()
    from public, anon;
revoke all on function public.can_delete_vsg_officer_photo()
    from public, anon;
grant execute on function public.can_upload_vsg_officer_photo()
    to authenticated, service_role;
grant execute on function public.can_delete_vsg_officer_photo()
    to authenticated, service_role;

grant insert, delete on table storage.objects to authenticated, service_role;

drop policy if exists "Active VAST admins can upload officer photos"
    on storage.objects;
create policy "Active VAST admins can upload officer photos"
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'officer-photos'
        and public.can_upload_vsg_officer_photo()
    );

drop policy if exists "Active VAST admins can remove officer photos"
    on storage.objects;
create policy "Active VAST admins can remove officer photos"
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'officer-photos'
        and public.can_delete_vsg_officer_photo()
    );

create or replace function public.can_edit_vsg_recruitment_communications()
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
              or permissions -> 'recruitment_manage' = 'true'::jsonb
          )
    );
$$;

revoke all on function public.can_edit_vsg_recruitment_communications()
    from public, anon;
grant execute on function public.can_edit_vsg_recruitment_communications()
    to authenticated, service_role;

alter table public.recruitment_communications enable row level security;
grant select, insert, update on public.recruitment_communications
    to authenticated, service_role;

drop policy if exists "Recruitment admins can view communications"
    on public.recruitment_communications;
create policy "Recruitment admins can view communications"
    on public.recruitment_communications
    for select
    to authenticated
    using (public.can_manage_vsg_recruitment());

drop policy if exists "Recruitment managers can add communications"
    on public.recruitment_communications;
create policy "Recruitment managers can add communications"
    on public.recruitment_communications
    for insert
    to authenticated
    with check (public.can_edit_vsg_recruitment_communications());

drop policy if exists "Recruitment managers can update communications"
    on public.recruitment_communications;
create policy "Recruitment managers can update communications"
    on public.recruitment_communications
    for update
    to authenticated
    using (public.can_edit_vsg_recruitment_communications())
    with check (public.can_edit_vsg_recruitment_communications());
