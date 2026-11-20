-- One profile per Better Auth user. Fields match the contract in docs/design.md.
create table profiles (
    user_id text primary key,
    profile_type text not null check (profile_type in ('student', 'alumnus')),
    student_year text,
    graduation_year integer check (graduation_year between 1900 and 2100),
    major text not null default '',
    industry text not null default '',
    job_title text not null default '',
    goals text[] not null check (cardinality(goals) > 0),
    goal_details text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
