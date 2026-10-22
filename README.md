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

The Global CTA Image Manager is available in Admin > Settings to administrators
with `settings_manage`. Upload one shared image, then enable it globally and
select which existing CTA sections display it on Home, About, Services,
Recruitment, Contact, Legal, or Officer Verification. The image is stored once
in `vsg-website-assets`; page visibility and the image URL are saved centrally
in `vsg_website_content`. Apply the CTA image migration and redeploy `admin-api`
before using the manager. When disabled, unselected, or unavailable, the
existing CTA content and layout remain in place.

The gallery migration creates the `vsg_gallery_items` table and the public
`vsg-gallery-assets` storage bucket. Administrators with `settings_manage` can
upload photos, videos (up to 100 MB), and video cover images in Admin > Gallery,
then edit or unpublish gallery stories. Published items are served by
`GET /public/gallery`; visitors can open each card to view the full media,
caption, event details, and an optional speech or message. Apply the migration
and redeploy `admin-api` before using the gallery.

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

## Training certificates

The Certificate Management page is available to Super Admins and administrators
with the `certificates_manage` permission. HR Admin defaults include this
permission; other roles must be explicitly granted access by a Super Admin.
Apply `20261021000000_certificate_management.sql` and redeploy the
`admin-api` Edge Function before using training programs, batches, enrollments,
templates, or certificate issuance.

Certificates can only be issued for completed enrollments. Certificate IDs are
assigned atomically by the database, and duplicate original issuance for an
enrollment is blocked. Issued records contain a versioned template/data snapshot;
corrections use reissuance and revocations retain their history and reason.
Public lookups are served by `GET /public/certificates/{certificateId}` at
`/certificate-verification.html`; only issued or revoked certificate details
needed for public verification are returned.

Certificate background images and approved signature images are stored in the
private `vsg-certificate-assets` bucket. Signature uploads require explicit
management approval in the admin interface. Signature images are not shown
until enabled on a template, and new templates default to empty signature slots.
Use the certificate print action and the browser's Save as PDF option for a
print-ready certificate. The QR code links to the live public verification page.

The Edge Function uses the Supabase-provided `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` secrets. Never put the service-role key in browser
code. The website is static and can be previewed with Live Server or `npm start`.
The optional Express process only serves static files; it has no API routes.
All admin API requests go directly to the Supabase Edge Function.

Add the deployed website URL, and any local preview URL you use, to the
Supabase project's Authentication URL Configuration under Additional Redirect
URLs for password recovery.