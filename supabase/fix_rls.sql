-- Fix for team_members RLS policies

-- 1. Fix the INSERT policy
drop policy if exists "Users can insert team members" on public.team_members;
create policy "Users can insert team members"
  on public.team_members for insert
  with check ( 
    auth.uid() = user_id OR 
    exists (
      select 1 from public.team_members tm 
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role in ('admin', 'owner')
    )
  );

-- 2. Add missing UPDATE policy
drop policy if exists "Admins and owners can update team members" on public.team_members;
create policy "Admins and owners can update team members"
  on public.team_members for update
  using ( 
    exists (
      select 1 from public.team_members tm 
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role in ('admin', 'owner')
    )
  );

-- 3. Add missing DELETE policy
drop policy if exists "Admins and owners can delete team members" on public.team_members;
create policy "Admins and owners can delete team members"
  on public.team_members for delete
  using ( 
    exists (
      select 1 from public.team_members tm 
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role in ('admin', 'owner')
    )
  );

-- 4. Fix the SELECT policy (avoid infinite recursion)
drop policy if exists "Users can view team members" on public.team_members;
create policy "Users can view team members"
  on public.team_members for select
  using ( true );

-- 5. Fix users table RLS to allow viewing all users (needed for Discovered Users)
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can view all profiles" on public.users;
create policy "Users can view all profiles"
  on public.users for select
  using ( true );

-- 6. Fix teams table RLS to allow viewing all teams (prevents 'parallel universe' bug where new users create their own teams)
drop policy if exists "Users can view teams they belong to" on public.teams;
drop policy if exists "Users can view all teams" on public.teams;
create policy "Users can view all teams"
  on public.teams for select
  using ( true );

-- 7. Fix folders table RLS
drop policy if exists "Authorized users can create folders" on public.folders;
create policy "Authorized users can create folders"
  on public.folders for insert
  with check ( exists (
    select 1 from public.team_members tm
    where tm.team_id = folders.team_id and tm.user_id = auth.uid() and tm.role in ('member', 'admin', 'owner')
  ));

-- 8. Fix files table RLS
drop policy if exists "Authorized users can upload files" on public.files;
create policy "Authorized users can upload files"
  on public.files for insert
  with check ( exists (
    select 1 from public.team_members tm
    where tm.team_id = files.team_id and tm.user_id = auth.uid() and tm.role in ('member', 'admin', 'owner')
  ));

drop policy if exists "Authorized users can update files" on public.files;
create policy "Authorized users can update files"
  on public.files for update
  using ( 
    exists (
      select 1 from public.team_members tm
      where tm.team_id = files.team_id and tm.user_id = auth.uid() and tm.role in ('member', 'admin', 'owner')
    ) OR 
    exists (
      select 1 from public.file_permissions fp
      where fp.file_id = files.id and fp.user_id = auth.uid() and fp.permission in ('write', 'admin')
    )
  );

-- 9. Add missing file_permissions policies
drop policy if exists "Users can view file permissions" on public.file_permissions;
create policy "Users can view file permissions"
  on public.file_permissions for select
  using ( true );
