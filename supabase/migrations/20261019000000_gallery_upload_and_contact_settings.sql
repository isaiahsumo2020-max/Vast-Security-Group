alter table public.vsg_gallery_items
    add column if not exists client_request_id uuid;

create unique index if not exists vsg_gallery_items_client_request_id_idx
    on public.vsg_gallery_items (client_request_id)
    where client_request_id is not null;

insert into public.vsg_website_content (content_key, content_value)
values
    ('contact_phone_numbers', E'+231 775 857 702\n+231 889 222 406\n+231 776 553 409\n+231 880 866 870'),
    ('contact_email', 'vastsecuritygroup20@gmail.com'),
    ('contact_address', 'Parker Paint Road, Wood Camp Community, Paynesville City, Montserrado, Liberia'),
    ('contact_business_days', 'Monday - Friday'),
    ('contact_open_time', '08:00'),
    ('contact_close_time', '17:00')
on conflict (content_key) do nothing;

update storage.buckets
set file_size_limit = 104857600,
    allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ]
where id = 'vsg-gallery-assets';

create or replace function public.can_manage_vsg_gallery()
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
              or permissions -> 'settings_manage' = 'true'::jsonb
          )
    );
$$;

revoke all on function public.can_manage_vsg_gallery()
    from public, anon;
grant execute on function public.can_manage_vsg_gallery()
    to authenticated, service_role;

grant insert on table storage.objects to authenticated, service_role;

drop policy if exists "Authorized VAST admins can upload gallery assets"
    on storage.objects;
create policy "Authorized VAST admins can upload gallery assets"
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'vsg-gallery-assets'
        and (name like 'media/%' or name like 'cover/%')
        and (
            name not like 'cover/%'
            or coalesce(metadata ->> 'mimetype', '') like 'image/%'
        )
        and coalesce(metadata ->> 'mimetype', '') in (
            'image/jpeg',
            'image/png',
            'image/webp',
            'video/mp4',
            'video/webm',
            'video/quicktime'
        )
        and case
            when name like 'cover/%' or coalesce(metadata ->> 'mimetype', '') like 'image/%'
                then case
                    when coalesce(metadata ->> 'size', '') ~ '^\d+$'
                        then (metadata ->> 'size')::bigint <= 10485760
                    else false
                end
            else case
                when coalesce(metadata ->> 'size', '') ~ '^\d+$'
                    then (metadata ->> 'size')::bigint <= 104857600
                else false
            end
        end
        and public.can_manage_vsg_gallery()
    );
