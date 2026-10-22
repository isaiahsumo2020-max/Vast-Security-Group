insert into public.vsg_training_programs (
    name,
    duration_hours,
    description
)
select
    'Mandatory Security Training',
    672,
    'Sample default program matching the certificate preview. Replace these details with the approved course information before enrollment.'
where not exists (
    select 1
    from public.vsg_training_programs
);
