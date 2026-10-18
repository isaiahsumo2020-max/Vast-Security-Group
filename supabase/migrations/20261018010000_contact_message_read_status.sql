alter table public.vsg_contact_messages
    add column if not exists is_read boolean not null default false;

comment on column public.vsg_contact_messages.is_read is
    'Whether an administrator has marked the contact message as read.';
