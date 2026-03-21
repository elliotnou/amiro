create table if not exists friend_groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  color       text not null default '#457b9d',
  symbol      text not null default '✦',
  description text,
  created_at  timestamptz default now()
);

alter table friend_groups enable row level security;
create policy "Users manage own groups" on friend_groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists friend_group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references friend_groups(id) on delete cascade not null,
  friend_id  uuid references friends(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(group_id, friend_id)
);

alter table friend_group_members enable row level security;
create policy "Users manage own group members" on friend_group_members
  for all using (
    exists (
      select 1 from friend_groups
      where friend_groups.id = friend_group_members.group_id
        and friend_groups.user_id = auth.uid()
    )
  );
