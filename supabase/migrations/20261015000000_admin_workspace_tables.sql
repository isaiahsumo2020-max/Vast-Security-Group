create table if not exists public.vsg_contact_messages (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    phone text,
    subject text not null,
    message text not null,
    status text not null default 'New'
        check (status in ('New', 'In Progress', 'Resolved')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists vsg_contact_messages_created_at_idx
    on public.vsg_contact_messages (created_at desc);

alter table public.vsg_contact_messages enable row level security;

create table if not exists public.vsg_website_services (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text not null,
    icon text not null default 'fa-shield-halved',
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists vsg_website_services_order_idx
    on public.vsg_website_services (display_order, created_at);

alter table public.vsg_website_services enable row level security;

drop policy if exists "Public can view active VAST services"
    on public.vsg_website_services;
create policy "Public can view active VAST services"
    on public.vsg_website_services
    for select
    to anon, authenticated
    using (is_active = true);

grant select on public.vsg_website_services to anon, authenticated;

insert into public.vsg_website_services
    (title, description, icon, display_order, is_active)
select seed.title, seed.description, seed.icon, seed.display_order, true
from (values
    ('Corporate Security', 'Professional security officers for offices, NGOs, banks, and commercial facilities.', 'fa-building-shield', 1),
    ('Residential Security', 'Protecting homes, apartments, estates, and residential communities.', 'fa-house-shield', 2),
    ('Industrial Security', 'Security services for factories, warehouses, and industrial facilities.', 'fa-industry', 3),
    ('Static Guard Services', 'Dedicated officers assigned to protect fixed posts and facilities.', 'fa-user-shield', 4),
    ('Access Control', 'Visitor management, identity verification, and entry monitoring.', 'fa-id-card', 5),
    ('Reception Security', 'Professional front-desk security and visitor reception services.', 'fa-door-open', 6),
    ('Event Security', 'Professional crowd management and event protection.', 'fa-people-group', 7),
    ('Security Patrol', 'Routine patrol services to maintain safe environments.', 'fa-route', 8),
    ('Emergency Response', 'Rapid response support for security incidents.', 'fa-bell', 9),
    ('Security Training', 'Professional security training and capacity development.', 'fa-user-graduate', 10)
) as seed(title, description, icon, display_order)
where not exists (
    select 1
    from public.vsg_website_services existing
    where lower(existing.title) = lower(seed.title)
);

create table if not exists public.vsg_admin_audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_user_id uuid references auth.users (id) on delete set null,
    actor_name text not null,
    actor_email text,
    action text not null,
    entity_type text not null,
    entity_id text,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists vsg_admin_audit_logs_created_at_idx
    on public.vsg_admin_audit_logs (created_at desc);

alter table public.vsg_admin_audit_logs enable row level security;
