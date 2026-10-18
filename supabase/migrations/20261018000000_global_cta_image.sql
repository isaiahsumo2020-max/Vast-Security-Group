insert into public.vsg_website_content (content_key, content_value)
values
    ('cta_image_url', ''),
    ('cta_image_enabled', 'false'),
    ('cta_image_pages', '{"home":false,"about":false,"services":false,"recruitment":false,"contact":false,"legal":false,"verification":false}')
on conflict (content_key) do nothing;
