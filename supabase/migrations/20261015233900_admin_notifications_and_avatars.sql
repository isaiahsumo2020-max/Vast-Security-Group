alter table public.admin_profiles
    add column if not exists avatar_url text;

create table if not exists public.vsg_admin_notifications (
    id uuid primary key default gen_random_uuid(),
    admin_user_id uuid not null references auth.users (id) on delete cascade,
    notification_type text not null,
    title text not null,
    body text not null,
    target_path text not null,
    entity_id text,
    created_at timestamptz not null default now(),
    read_at timestamptz
);

create index if not exists vsg_admin_notifications_user_created_idx
    on public.vsg_admin_notifications (admin_user_id, created_at desc);

create index if not exists vsg_admin_notifications_unread_idx
    on public.vsg_admin_notifications (admin_user_id, created_at desc)
    where read_at is null;

alter table public.vsg_admin_notifications enable row level security;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'vsg-admin-avatars',
    'vsg-admin-avatars',
    true,
    3145728,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.notify_vsg_admins_of_new_work()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    recipient record;
    notification_type_value text;
    notification_title_value text;
    notification_body_value text;
    target_path_value text;
    entity_id_value text;
begin
    if tg_table_name = 'vsg_contact_messages' then
        notification_type_value := 'contact_message';
        notification_title_value := 'New contact message';
        notification_body_value := 'A new message was submitted through the public contact form.';
        target_path_value := '/admin/messages/messages.html';
        entity_id_value := coalesce(
            to_jsonb(new) ->> 'id',
            to_jsonb(new) ->> 'officer_id'
        );
    elsif tg_table_name = 'recruitment_applications' then
        notification_type_value := 'recruitment_application';
        notification_title_value := 'New recruitment application';
        notification_body_value := 'A new application was submitted through the public recruitment form.';
        target_path_value := '/admin/recruitment/recruitment.html';
        entity_id_value := coalesce(
            to_jsonb(new) ->> 'id',
            to_jsonb(new) ->> 'officer_id'
        );
    elsif tg_table_name = 'officers' then
        notification_type_value := 'officer_created';
        notification_title_value := 'New officer record';
        notification_body_value := 'A new officer record was added to the admin portal.';
        target_path_value := '/admin/officers/officers.html';
        entity_id_value := coalesce(
            to_jsonb(new) ->> 'id',
            to_jsonb(new) ->> 'officer_id'
        );
    elsif tg_table_name = 'security_posts' then
        notification_type_value := 'security_post_created';
        notification_title_value := 'New security post';
        notification_body_value := 'A new security post was added to the admin portal.';
        target_path_value := '/admin/posts/posts.html';
        entity_id_value := coalesce(
            to_jsonb(new) ->> 'id',
            to_jsonb(new) ->> 'officer_id'
        );
    else
        return new;
    end if;

    for recipient in
        select user_id
        from public.admin_profiles
        where status = 'Active'
          and (
              role = 'Super Admin'
              or (permissions -> 'all') = 'true'::jsonb
              or (
                  notification_type_value = 'contact_message'
                  and (permissions -> 'messages_view') = 'true'::jsonb
              )
              or (
                  notification_type_value = 'recruitment_application'
                  and (
                      (permissions -> 'recruitment_view') = 'true'::jsonb
                      or (permissions -> 'recruitment_manage') = 'true'::jsonb
                  )
              )
              or (
                  notification_type_value = 'officer_created'
                  and (permissions -> 'officers_view') = 'true'::jsonb
              )
              or (
                  notification_type_value = 'security_post_created'
                  and (permissions -> 'posts_view') = 'true'::jsonb
              )
          )
    loop
        insert into public.vsg_admin_notifications (
            admin_user_id,
            notification_type,
            title,
            body,
            target_path,
            entity_id
        ) values (
            recipient.user_id,
            notification_type_value,
            notification_title_value,
            notification_body_value,
            target_path_value,
            entity_id_value
        );
    end loop;

    return new;
end;
$$;

revoke all on function public.notify_vsg_admins_of_new_work()
    from public, anon, authenticated;

drop trigger if exists vsg_notify_admins_contact_message
    on public.vsg_contact_messages;
create trigger vsg_notify_admins_contact_message
    after insert on public.vsg_contact_messages
    for each row execute function public.notify_vsg_admins_of_new_work();

drop trigger if exists vsg_notify_admins_recruitment_application
    on public.recruitment_applications;
create trigger vsg_notify_admins_recruitment_application
    after insert on public.recruitment_applications
    for each row execute function public.notify_vsg_admins_of_new_work();

drop trigger if exists vsg_notify_admins_new_officer
    on public.officers;
create trigger vsg_notify_admins_new_officer
    after insert on public.officers
    for each row execute function public.notify_vsg_admins_of_new_work();

drop trigger if exists vsg_notify_admins_new_security_post
    on public.security_posts;
create trigger vsg_notify_admins_new_security_post
    after insert on public.security_posts
    for each row execute function public.notify_vsg_admins_of_new_work();
