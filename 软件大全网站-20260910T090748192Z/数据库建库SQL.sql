-- ============================================================
--  软件大全 · Supabase 建库脚本
--  用法：Supabase 后台 → 左侧 SQL Editor → New query →
--        把本文件全部内容粘贴进去 → 点 Run
--  说明：本脚本可重复执行（幂等），跑多次不会出错也不会重复建表。
-- ============================================================


-- ------------------------------------------------------------
-- 第 1 部分：用户资料表（存昵称）
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null default '匿名发布者',
  created_at  timestamptz not null default now()
);

comment on table public.profiles is '注册用户资料，id 与 auth.users 一一对应';

alter table public.profiles enable row level security;

-- 注册时自动建资料行，把注册表单里填的昵称存进来
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce (nullif (trim (new.raw_user_meta_data ->> 'nickname'), ''), '匿名发布者'))
  on conflict (id) do update set nickname = excluded.nickname;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();


-- ------------------------------------------------------------
-- 第 2 部分：软件表（核心数据）
-- ------------------------------------------------------------

create table if not exists public.software (
  id             uuid primary key default gen_random_uuid (),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null check (char_length (name) between 2 and 80),
  description    text not null default '',
  category       text not null default '其他',
  platform       text not null default 'Windows',
  version        text not null default '',
  size_text      text not null default '',
  size_bytes     bigint not null default 0,
  download_type  text not null default 'link' check (download_type in ('link', 'file')),
  download_url   text not null default '',
  storage_path   text not null default '',
  file_name      text not null default '',
  downloads      integer not null default 0,
  created_at     timestamptz not null default now ()
);

comment on table public.software is '用户发布的软件条目';

create index if not exists software_created_at_idx on public.software (created_at desc);
create index if not exists software_downloads_idx on public.software (downloads desc);
create index if not exists software_user_idx       on public.software (user_id);
create index if not exists software_category_idx   on public.software (category);

-- 补充 software.user_id 到 profiles.id 的外键关联
-- 代码用 select('*, profiles(nickname)') 关联查询昵称，必须存在这条外键路径
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'software_user_id_profiles_fkey'
  ) then
    alter table public.software
      add constraint software_user_id_profiles_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- 刷新 PostgREST 的 schema 缓存，让外键关联立刻生效
notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 第 3 部分：数据库权限策略（RLS）
-- 这是安全核心：决定谁能看、谁能发、谁能删。
-- ------------------------------------------------------------

alter table public.software enable row level security;

-- 未登录的访客也能浏览和下载
drop policy if exists "任何人可查看软件" on public.software;
create policy "任何人可查看软件"
  on public.software for select
  using (true);

-- 登录用户才能发布，且只能以自己的身份发布
drop policy if exists "登录用户可发布软件" on public.software;
create policy "登录用户可发布软件"
  on public.software for insert
  with check (auth.uid () is not null and auth.uid () = user_id);

-- 只能修改自己发布的（防止别人篡改你的条目）
drop policy if exists "只能修改自己发布的" on public.software;
create policy "只能修改自己发布的"
  on public.software for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

-- 只能删除自己发布的
drop policy if exists "只能删除自己发布的" on public.software;
create policy "只能删除自己发布的"
  on public.software for delete
  using (auth.uid () = user_id);

-- 昵称对所有人可见（否则列表里显示不出发布者）
drop policy if exists "任何人可查看昵称" on public.profiles;
create policy "任何人可查看昵称"
  on public.profiles for select
  using (true);

-- 只能改自己的资料
drop policy if exists "只能修改自己的资料" on public.profiles;
create policy "只能修改自己的资料"
  on public.profiles for update
  using (auth.uid () = id)
  with check (auth.uid () = id);


-- ------------------------------------------------------------
-- 第 4 部分：下载计数
-- 用数据库函数自增，避免任何人都能随意改写 downloads 字段。
-- ------------------------------------------------------------

create or replace function public.increment_download (p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  update public.software
     set downloads = downloads + 1
   where id = p_id
  returning downloads into v_new;
  return coalesce (v_new, 0);
end;
$$;

revoke all on function public.increment_download (uuid) from public;
grant execute on function public.increment_download (uuid) to anon, authenticated;


-- ------------------------------------------------------------
-- 第 5 部分：删除条目时自动清理已上传的文件
-- 避免文件变成没人管的垃圾，白白占用 1GB 存储额度。
-- ------------------------------------------------------------

create or replace function public.cleanup_software_file ()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if old.download_type = 'file' and old.storage_path <> '' then
    delete from storage.objects
     where bucket_id = 'software-files'
       and name = old.storage_path;
  end if;
  return old;
end;
$$;

drop trigger if exists software_after_delete on public.software;
create trigger software_after_delete
  after delete on public.software
  for each row execute function public.cleanup_software_file ();


-- ------------------------------------------------------------
-- 第 6 部分：文件存储桶
-- public = true 表示任何人拿到地址都能下载（软件分享站必需）
-- file_size_limit = 52428800 即 50MB，Supabase 免费版单文件上限
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('software-files', 'software-files', true, 52428800)
on conflict (id) do update
   set public = true,
       file_size_limit = 52428800;

-- 任何人可下载文件
drop policy if exists "任何人可下载软件文件" on storage.objects;
create policy "任何人可下载软件文件"
  on storage.objects for select
  using (bucket_id = 'software-files');

-- 登录用户可上传文件
drop policy if exists "登录用户可上传软件文件" on storage.objects;
create policy "登录用户可上传软件文件"
  on storage.objects for insert
  with check (bucket_id = 'software-files' and auth.uid () is not null);

-- 用户只能删自己目录下的文件
-- （前端上传路径以用户 ID 前 8 位作为文件夹名，据此判断归属）
drop policy if exists "用户可删除自己上传的文件" on storage.objects;
create policy "用户可删除自己上传的文件"
  on storage.objects for delete
  using (
    bucket_id = 'software-files'
    and auth.uid () is not null
    and (storage.foldername (name)) [1] = left (auth.uid ()::text, 8)
  );

-- 关于「禁止匿名写入」：无需单独建策略。
-- 开启 RLS 后，凡是没有对应 policy 放行的操作一律默认拒绝，
-- 因此未登录者本来就无法上传、改名或移动文件。
-- 上面三条（select / insert / delete）已经把权限精确限定好了。


-- ------------------------------------------------------------
-- 第 7 部分：接口访问授权
-- ------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.software to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.software to authenticated;
grant update on public.profiles to authenticated;


-- ------------------------------------------------------------
-- 执行完成后自检：下面三句应该都能跑通，不报错即成功。
-- 你可以选中这三句单独运行看看结果。
-- ------------------------------------------------------------

-- select count (*) as 软件条数 from public.software;
-- select count (*) as 注册用户数 from public.profiles;
-- select id, name, public as 是否公开 from storage.buckets where id = 'software-files';
