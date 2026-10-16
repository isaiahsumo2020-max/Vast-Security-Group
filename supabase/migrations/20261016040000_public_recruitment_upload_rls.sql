insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit
)
values
    ('recruitment-photos', 'recruitment-photos', true, 5242880),
    ('recruitment-documents', 'recruitment-documents', true, 10485760)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit;

create or replace function public.can_upload_recruitment_file(
    bucket_id_input text,
    object_name_input text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
    application_table text;
    application_exists boolean;
begin
    if bucket_id_input not in ('recruitment-photos', 'recruitment-documents')
       or split_part(object_name_input, '/', 1) !~*
           '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or split_part(object_name_input, '/', 2) !~ '^[0-9]{6}$' then
        return false;
    end if;

    if to_regclass('public.recruitment_applications') is not null then
        application_table := 'recruitment_applications';
    elsif to_regclass('public.recruitment_application') is not null then
        application_table := 'recruitment_application';
    else
        return false;
    end if;

    execute format(
        'select exists (select 1 from public.%I where id = $1::uuid and tracking_code = $2 and status = %L)',
        application_table,
        'Pending'
    ) into application_exists using
        split_part(object_name_input, '/', 1),
        split_part(object_name_input, '/', 2);

    return application_exists;
end;
$$;

revoke all on function public.can_upload_recruitment_file(text, text)
    from public, anon, authenticated;
grant execute on function public.can_upload_recruitment_file(text, text)
    to anon, authenticated;

grant insert on table storage.objects to anon, authenticated;

drop policy if exists "Applicants can upload files for their pending applications"
    on storage.objects;
create policy "Applicants can upload files for their pending applications"
    on storage.objects
    for insert
    to anon, authenticated
    with check (
        public.can_upload_recruitment_file(bucket_id, name)
    );

create or replace function public.register_recruitment_document(
    application_id_input uuid,
    tracking_code_input text,
    document_type_input text,
    file_name_input text,
    file_url_input text,
    file_size_input bigint,
    mime_type_input text,
    is_required_input boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if not exists (
        select 1
        from public.recruitment_applications
        where id = application_id_input
          and tracking_code = tracking_code_input
          and status = 'Pending'
    ) then
        raise exception 'Application tracking code was not accepted';
    end if;

    if document_type_input not in ('cv', 'application_letter', 'other')
       or file_size_input <= 0
       or position(
            '/storage/v1/object/public/recruitment-documents/'
            || application_id_input::text || '/'
            || tracking_code_input || '/'
            in file_url_input
       ) = 0 then
        raise exception 'Recruitment document details are invalid';
    end if;

    insert into public.recruitment_documents (
        application_id,
        document_type,
        file_name,
        file_url,
        file_size,
        mime_type,
        is_required
    ) values (
        application_id_input,
        document_type_input,
        file_name_input,
        file_url_input,
        file_size_input,
        mime_type_input,
        is_required_input
    );
end;
$$;

revoke all on function public.register_recruitment_document(
    uuid, text, text, text, text, bigint, text, boolean
) from public, anon, authenticated;
grant execute on function public.register_recruitment_document(
    uuid, text, text, text, text, bigint, text, boolean
) to anon, authenticated;

create or replace function public.set_recruitment_application_photo(
    application_id_input uuid,
    tracking_code_input text,
    photo_url_input text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if position(
        '/storage/v1/object/public/recruitment-photos/'
        || application_id_input::text || '/'
        || tracking_code_input || '/'
        in photo_url_input
    ) = 0 then
        raise exception 'Recruitment photo URL is invalid';
    end if;

    update public.recruitment_applications
    set photo_url = photo_url_input
    where id = application_id_input
      and tracking_code = tracking_code_input
      and status = 'Pending';

    if not found then
        raise exception 'Application tracking code was not accepted';
    end if;
end;
$$;

revoke all on function public.set_recruitment_application_photo(uuid, text, text)
    from public, anon, authenticated;
grant execute on function public.set_recruitment_application_photo(uuid, text, text)
    to anon, authenticated;
