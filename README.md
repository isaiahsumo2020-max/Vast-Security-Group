# VAST Security Group Website

## Supabase backend

The admin API runs as a Supabase Edge Function in
`supabase/functions/admin-api`. Deploy it to the Supabase project configured in
`backend/config/supabase.js`:

```sh
npx supabase login
npx supabase link --project-ref uwfjtnirfqufgbifeabj
npx supabase db push
npx supabase functions deploy admin-api --project-ref uwfjtnirfqufgbifeabj --use-api
```

The Supabase CLI account must have access to that project.
The migrations create the contact-message, managed-service, and audit tables;
they also seed the existing public service cards and audit changes made to the
existing admin data tables. They are safe to reapply and do not create duplicate
tables.

The website content migration adds the `vsg_website_content` settings and the
public `vsg-website-assets` image bucket. Administrators granted
`settings_manage` can edit the public platform name, logo, page banners, About
page story image, CEO/Co-CEO photos, titles, names, and messages from Admin >
Settings. Image uploads accept JPEG, PNG, or WebP files up to 5 MB. Public
pages read published content from the `admin-api` function; edits are audit
logged.

The public officer verification page performs a live lookup by Officer ID
through `GET /public/officers/{officerId}`. It no longer relies on the
admin-only officers endpoint or a potentially stale browser cache. The public
content endpoint is `GET /public/site-content`.

The admin header displays the signed-in administrator's profile image (or
initials), plus a notification menu. New public contact messages notify active
Super Admins and administrators granted `messages_view`; new applications
notify administrators granted recruitment access. New officer and security
post records are also announced to admins with the corresponding view
permission. Notifications are private to their recipient and refresh while the
dashboard is open. Profile images can be uploaded from Admin > Settings.

Public contact submissions are stored in `vsg_contact_messages` and shown in
Admin > Messages. Public recruitment submissions are written to
`recruitment_applications`, the same table read by Admin > Recruitment; their
documents continue to be stored in the recruitment document tables/storage.
The public form reads active job openings through
`GET /public/recruitment-positions`; the General Security Officer opening is
seeded as active so the required position field can be completed.
After submission, applicants receive a unique six-digit tracking code. The
Recruitment page includes a status lookup that accepts this code and returns
only the application's current status through a restricted Supabase function.
Apply the migrations with `npx supabase db push` before using this feature.
Recruitment file uploads and document records are restricted to a pending
application and its tracking code; the public application cannot update
application records directly.
Active Super Admins and administrators with recruitment view/manage permissions
can view applications and their documents from the Admin Recruitment page.

The Edge Function uses the Supabase-provided `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` secrets. Never put the service-role key in browser
code. The website is static and can be previewed with Live Server or `npm start`.
The optional Express process only serves static files; it has no API routes.
All admin API requests go directly to the Supabase Edge Function.

Add the deployed website URL, and any local preview URL you use, to the
Supabase project's Authentication URL Configuration under Additional Redirect
URLs for password recovery.