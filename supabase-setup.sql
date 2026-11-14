-- KAAM AANGAN database setup. Paste this whole file into Supabase > SQL Editor > New query > Run.

create table profiles (id uuid primary key references auth.users on delete cascade, role text not null default 'customer' check (role in ('customer','provider','admin')), full_name text, mobile text, created_at timestamptz default now());
create table categories (id uuid primary key default gen_random_uuid(), name text not null, parent_id uuid references categories on delete cascade, created_at timestamptz default now());
create table providers (id uuid primary key references profiles on delete cascade, full_name text, photo_url text, category_id uuid references categories on delete set null, subcategory_id uuid references categories on delete set null, description text, experience text, starting_price int, city text, locality text, areas text[] default '{}', available boolean default true, status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')), created_at timestamptz default now());
create table provider_contacts (provider_id uuid primary key references providers on delete cascade, phone text, address text);
create table work_photos (id uuid primary key default gen_random_uuid(), provider_id uuid references providers on delete cascade, url text not null, created_at timestamptz default now());
create table payments (id uuid primary key default gen_random_uuid(), customer_id uuid references profiles, provider_id uuid references providers, type text, amount int, razorpay_payment_id text unique, created_at timestamptz default now());
create table unlocks (customer_id uuid references profiles, provider_id uuid references providers on delete cascade, created_at timestamptz default now(), primary key (customer_id, provider_id));
create table enquiries (id uuid primary key default gen_random_uuid(), customer_id uuid references profiles, provider_id uuid references providers on delete cascade, customer_name text, customer_mobile text, message text, created_at timestamptz default now());
create table reviews (id uuid primary key default gen_random_uuid(), provider_id uuid references providers on delete cascade, customer_id uuid references profiles, rating int not null check (rating between 1 and 5), comment text, display_name text, hidden boolean default false, created_at timestamptz default now(), unique (provider_id, customer_id));

create function is_admin() returns boolean language sql security definer set search_path=public stable as $$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- Create profile (and provider rows) automatically when someone signs up. Nobody can sign up as admin.
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare m jsonb := new.raw_user_meta_data; r text := case when m->>'role' = 'provider' then 'provider' else 'customer' end;
begin
  insert into profiles(id, role, full_name, mobile) values (new.id, r, m->>'full_name', m->>'mobile');
  if r = 'provider' then
    insert into providers(id, full_name, category_id, subcategory_id, description, experience, city, locality, areas)
    values (new.id, m->>'full_name', nullif(m->>'category_id','')::uuid, nullif(m->>'subcategory_id','')::uuid, m->>'description', m->>'experience', m->>'city', m->>'locality',
      array(select trim(x) from unnest(string_to_array(coalesce(m->>'areas',''), ',')) x where trim(x) <> ''));
    insert into provider_contacts(provider_id, phone) values (new.id, m->>'mobile');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create view provider_cards with (security_invoker = true) as
select p.*, c.name as category_name, sc.name as subcategory_name, coalesce(r.avg, 0) as avg_rating, coalesce(r.cnt, 0) as review_count
from providers p left join categories c on c.id = p.category_id left join categories sc on sc.id = p.subcategory_id
left join (select provider_id, round(avg(rating), 1) avg, count(*) cnt from reviews where not hidden group by provider_id) r on r.provider_id = p.id;

alter table profiles enable row level security; alter table categories enable row level security; alter table providers enable row level security; alter table provider_contacts enable row level security;
alter table work_photos enable row level security; alter table payments enable row level security; alter table unlocks enable row level security; alter table enquiries enable row level security; alter table reviews enable row level security;

create policy "profiles read" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles update" on profiles for update using (id = auth.uid()) with check (role = (select role from profiles where id = auth.uid()));
create policy "categories read" on categories for select using (true);
create policy "categories admin" on categories for all using (is_admin()) with check (is_admin());
create policy "providers read" on providers for select using (status = 'approved' or id = auth.uid() or is_admin());
create policy "providers update own" on providers for update using (id = auth.uid()) with check (status = (select status from providers where id = auth.uid()));
create policy "providers admin" on providers for all using (is_admin()) with check (is_admin());
create policy "contacts read" on provider_contacts for select using (provider_id = auth.uid() or is_admin() or exists (select 1 from unlocks u where u.customer_id = auth.uid() and u.provider_id = provider_contacts.provider_id));
create policy "contacts write" on provider_contacts for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "photos read" on work_photos for select using (true);
create policy "photos write" on work_photos for all using (provider_id = auth.uid() or is_admin()) with check (provider_id = auth.uid());
create policy "payments read" on payments for select using (customer_id = auth.uid() or is_admin());
create policy "unlocks read" on unlocks for select using (customer_id = auth.uid() or is_admin());
create policy "enquiries read" on enquiries for select using (customer_id = auth.uid() or provider_id = auth.uid() or is_admin());
create policy "reviews read" on reviews for select using (not hidden or is_admin());
create policy "reviews insert" on reviews for insert with check (customer_id = auth.uid() and (exists (select 1 from unlocks u where u.customer_id = auth.uid() and u.provider_id = reviews.provider_id) or exists (select 1 from enquiries e where e.customer_id = auth.uid() and e.provider_id = reviews.provider_id)));
create policy "reviews admin" on reviews for update using (is_admin());
-- payments, unlocks and enquiries have no insert policy on purpose: only the verify-payment function (service role) can write them.

insert into storage.buckets (id, name, public) values ('media', 'media', true);
create policy "media read" on storage.objects for select using (bucket_id = 'media');
create policy "media upload" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Starting categories
insert into categories(name) values ('Sculptor'),('Tailor'),('Carpenter'),('Artisan'),('Beauty and Care');
insert into categories(name, parent_id) select s.n, c.id from (values
 ('Sculptor','Stone sculptor'),('Sculptor','Marble sculptor'),('Sculptor','Wood sculptor'),('Sculptor','Clay sculptor'),
 ('Tailor','Men''s tailoring'),('Tailor','Women''s tailoring'),('Tailor','Custom stitching'),('Tailor','Alterations'),('Tailor','Embroidery'),
 ('Carpenter','Furniture making'),('Carpenter','Furniture repair'),('Carpenter','Wooden doors'),('Carpenter','Custom furniture'),
 ('Artisan','Handmade products'),('Artisan','Pottery'),('Artisan','Handicrafts'),('Artisan','Decorative items'),('Artisan','Traditional artwork'),
 ('Beauty and Care','Hair styling'),('Beauty and Care','Makeup'),('Beauty and Care','Beautician'),('Beauty and Care','Bridal services'),('Beauty and Care','Grooming')
) s(p, n) join categories c on c.name = s.p and c.parent_id is null;

-- AFTER you sign up once on your own site, make yourself admin (change the email, then run this line alone):
-- update profiles set role = 'admin' where id = (select id from auth.users where email = 'your-email@example.com');
