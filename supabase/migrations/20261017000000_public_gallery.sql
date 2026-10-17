create table if not exists public.vsg_gallery_items (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    event_date date not null,
    preview text not null default '',
    caption text not null default '',
    event_details text not null default '',
    message text not null default '',
    media_type text not null check (media_type in ('image', 'video')),
    media_url text not null,
    cover_image_url text,
    is_published boolean not null default true,
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists vsg_gallery_items_public_date_idx
    on public.vsg_gallery_items (is_published, event_date desc, created_at desc);

alter table public.vsg_gallery_items enable row level security;

drop policy if exists "Public can view published VAST gallery items"
    on public.vsg_gallery_items;
create policy "Public can view published VAST gallery items"
    on public.vsg_gallery_items
    for select
    to anon, authenticated
    using (is_published = true);

grant select on public.vsg_gallery_items to anon, authenticated;
grant select, insert, update, delete on public.vsg_gallery_items to service_role;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'vsg-gallery-assets',
    'vsg-gallery-assets',
    true,
    104857600,
    array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
