create table if not exists public.vsg_website_content (
    content_key text primary key,
    content_value text not null default '',
    updated_at timestamptz not null default now()
);

alter table public.vsg_website_content enable row level security;

insert into public.vsg_website_content (content_key, content_value)
values
    ('site_logo_url', '/assests/images/VAST%20LOGO.png'),
    ('home_banner_url', ''),
    ('about_banner_url', ''),
    ('services_banner_url', ''),
    ('recruitment_banner_url', ''),
    ('contact_banner_url', ''),
    ('verification_banner_url', ''),
    ('ceo_photo_url', '/assests/images/officers/CEO.png'),
    ('ceo_heading', 'Message from the CEO'),
    ('ceo_name', 'Mr. Moses Sumo'),
    ('ceo_title', 'Chief Executive Officer'),
    ('ceo_message', E'Welcome to VAST Security Group.\n\nOur commitment is simple: to provide professional, reliable, and trusted security services that protect lives, assets, and businesses. We believe security is built on discipline, integrity, vigilance, and respect for those we serve.\n\nAs we continue to grow, our focus remains on delivering exceptional service through well-trained personnel and continuous improvement. We value every client and every opportunity to make a positive impact on the safety of our communities.\n\nThank you for considering VAST Security Group as your trusted security partner.'),
    ('co_ceo_photo_url', '/assests/images/officers/Co-CEO.png'),
    ('co_ceo_heading', 'Message from the Co-Chief Executive Officer'),
    ('co_ceo_name', 'Levi B. Sendolo'),
    ('co_ceo_title', 'Chief Executive Officer'),
    ('co_ceo_message', E'At VAST Security Group, we recognize that true security goes beyond physical presence, it is built on professionalism, integrity, discipline, and an unwavering commitment to those we serve. Every assignment entrusted to us is approached with diligence and a strong sense of responsibility.\n\nOur vision is to build lasting partnerships with our clients by delivering dependable security solutions tailored to their unique needs. Through continuous training, ethical conduct, and teamwork, we strive to exceed expectations while maintaining the highest standards of service.\n\nAs Co-Chief Executive Officer, I remain committed to supporting the growth of our organization, empowering our personnel, and ensuring that VAST Security Group continues to be recognized as a trusted partner in safeguarding people, property, businesses, and communities across Liberia.')
on conflict (content_key) do nothing;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'vsg-website-assets',
    'vsg-website-assets',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
