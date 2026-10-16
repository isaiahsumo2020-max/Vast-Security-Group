insert into public.vsg_website_content (content_key, content_value)
values
    ('about_story_image_url', '/assests/images/VAST%20About.png'),
    ('site_name', 'VAST SECURITY GROUP')
on conflict (content_key) do nothing;
