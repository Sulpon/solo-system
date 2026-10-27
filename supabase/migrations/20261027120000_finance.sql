-- Atlas Finance: accounts, statement imports, transactions, categories,
-- categorisation rules, budgets, internal transfer links and required
-- monthly payments.
--
-- Additive only. Creates new tables, policies and a private storage
-- bucket; never alters or drops anything that existed before. Safe to
-- re-run: tables use IF NOT EXISTS, and policies/triggers are dropped
-- IF EXISTS and recreated.
--
-- OWNERSHIP MODEL
--
-- Every row carries user_id, and RLS limits every table to
-- auth.uid() = user_id. RLS alone only checks the row being written, so a
-- user could still insert a transaction pointing at SOMEONE ELSE'S account
-- id. Every cross-table reference is therefore a composite foreign key on
-- (id, user_id): a reference can only resolve to a row owned by the same
-- user, whatever ids a modified request sends.
--
-- MONEY
--
-- Amounts are bigint minor units (cents, tiyn) plus an ISO currency code.
-- Never floats. Signed: positive = money in, negative = money out.

-- ---------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------

create or replace function public.finance_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  -- Parser id ('revolut', 'alatau', ...) or 'manual' / 'csv'.
  bank text not null default 'manual' check (char_length(bank) between 1 and 40),
  -- Masked only (e.g. '•••• 1234'). Full account numbers are never stored.
  account_identifier text check (account_identifier is null or char_length(account_identifier) <= 40),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  -- 'current', 'vault', ... - distinguishes products a bank reports under
  -- one identifier (Revolut's current account vs its vaults).
  product text not null default 'current' check (char_length(product) between 1 and 40),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique nulls not distinct (user_id, bank, account_identifier, currency, product)
);

create index if not exists finance_accounts_user_idx on public.finance_accounts (user_id);

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Stable key for built-in categories (so seeding is idempotent and
  -- built-in rules still find them after a rename); null for user-made ones.
  slug text check (slug is null or slug ~ '^[a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  -- What the category MEANS for reporting. 'transfer' and 'exchange' are
  -- never income or expense; 'debt' is tracked apart from living costs.
  kind text not null check (kind in ('expense', 'income', 'transfer', 'exchange', 'debt')),
  color text not null default '#a855f7' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_enabled boolean not null default true,
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, slug)
);

create index if not exists finance_categories_user_idx on public.finance_categories (user_id);

-- ---------------------------------------------------------------------
-- Statement imports (one per uploaded file)
-- ---------------------------------------------------------------------

create table if not exists public.finance_statement_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_size integer not null check (file_size > 0),
  file_type text not null check (file_type in ('pdf', 'csv')),
  -- Same bytes uploaded twice resolve to the same import.
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  -- Path inside the private 'finance-statements' bucket: '<user_id>/<id>.<ext>'.
  storage_path text,
  bank text,
  status text not null check (status in ('needs_review', 'committed', 'failed')),
  -- Machine-readable failure reason ('no_text', 'unrecognized', ...) and a
  -- user-facing message. Never raw parser exceptions or file contents.
  error_code text,
  error_message text,
  -- The parsed preview awaiting review. Cleared on commit: from then on the
  -- transactions table is the record.
  preview jsonb,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, file_sha256)
);

create index if not exists finance_statement_imports_user_idx on public.finance_statement_imports (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Statements (one per account section inside an import)
-- ---------------------------------------------------------------------

create table if not exists public.finance_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  import_id uuid not null,
  -- Position of this account section inside the file. With import_id this
  -- makes re-running a commit idempotent.
  section_index integer not null check (section_index >= 0),
  account_id uuid not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  period_start date,
  period_end date,
  opening_balance_minor bigint,
  closing_balance_minor bigint,
  credits_minor bigint not null default 0,
  debits_minor bigint not null default 0,
  reconciliation_status text not null check (reconciliation_status in ('balanced', 'mismatch', 'unverifiable')),
  reconciliation_difference_minor bigint,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (import_id, section_index),
  check (period_start is null or period_end is null or period_start <= period_end),
  foreign key (import_id, user_id) references public.finance_statement_imports (id, user_id) on delete cascade,
  foreign key (account_id, user_id) references public.finance_accounts (id, user_id) on delete cascade
);

create index if not exists finance_statements_account_idx on public.finance_statements (user_id, account_id, period_end desc);

-- ---------------------------------------------------------------------
-- Categorisation rules
-- ---------------------------------------------------------------------

create table if not exists public.finance_category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  field text not null check (field in ('merchant', 'description', 'any')),
  match_type text not null check (match_type in ('contains', 'equals', 'starts_with')),
  pattern text not null check (char_length(btrim(pattern)) between 1 and 200),
  account_id uuid,
  direction text check (direction in ('in', 'out')),
  category_id uuid not null,
  -- Higher runs first. User rules always outrank built-in rules regardless.
  priority integer not null default 100,
  is_enabled boolean not null default true,
  -- 'user' (made in the rules editor) or 'correction' (made from "apply to
  -- future transactions from this merchant").
  source text not null default 'user' check (source in ('user', 'correction')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.finance_categories (id, user_id) on delete cascade,
  foreign key (account_id, user_id) references public.finance_accounts (id, user_id) on delete cascade
);

create index if not exists finance_category_rules_user_idx on public.finance_category_rules (user_id);

-- ---------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  statement_id uuid,
  import_id uuid,
  booked_on date not null,
  posted_on date,
  -- Exactly what the bank wrote. Immutable (see trigger below), so editing
  -- the merchant or category never loses the source of truth.
  description_original text not null check (char_length(description_original) between 1 and 1000),
  merchant text check (merchant is null or char_length(merchant) <= 200),
  amount_minor bigint not null check (amount_minor <> 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  -- Card payments in a foreign currency: what was charged at the merchant.
  original_amount_minor bigint,
  original_currency char(3) check (original_currency is null or original_currency ~ '^[A-Z]{3}$'),
  fee_minor bigint check (fee_minor is null or fee_minor >= 0),
  bank_reference text check (bank_reference is null or char_length(bank_reference) <= 120),
  category_id uuid,
  categorization_method text not null default 'none' check (categorization_method in ('rule_user', 'rule_builtin', 'manual', 'none')),
  categorization_rule_id uuid,
  review_status text not null default 'needs_review' check (review_status in ('needs_review', 'confirmed')),
  source text not null check (source in ('pdf', 'csv', 'manual')),
  -- Deterministic identity of a bank line (see finance/dedupe.ts) and its
  -- position among identical lines, so two genuinely identical coffees on
  -- one day stay two transactions while re-importing the same statement
  -- adds nothing.
  fingerprint text not null check (char_length(fingerprint) between 8 and 128),
  occurrence integer not null default 1 check (occurrence >= 1),
  -- Set when the import flagged this as a POSSIBLE duplicate the user chose
  -- to keep. Never used to delete anything automatically.
  possible_duplicate_of uuid,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, account_id, fingerprint, occurrence),
  foreign key (account_id, user_id) references public.finance_accounts (id, user_id) on delete cascade,
  foreign key (statement_id, user_id) references public.finance_statements (id, user_id) on delete set null (statement_id),
  foreign key (import_id, user_id) references public.finance_statement_imports (id, user_id) on delete set null (import_id),
  foreign key (category_id, user_id) references public.finance_categories (id, user_id) on delete set null (category_id),
  foreign key (categorization_rule_id, user_id) references public.finance_category_rules (id, user_id) on delete set null (categorization_rule_id),
  foreign key (possible_duplicate_of, user_id) references public.finance_transactions (id, user_id) on delete set null (possible_duplicate_of)
);

create index if not exists finance_transactions_user_date_idx on public.finance_transactions (user_id, booked_on desc);
create index if not exists finance_transactions_account_date_idx on public.finance_transactions (account_id, booked_on desc);
create index if not exists finance_transactions_category_idx on public.finance_transactions (user_id, category_id);
create index if not exists finance_transactions_review_idx on public.finance_transactions (user_id) where review_status = 'needs_review';
create index if not exists finance_transactions_import_idx on public.finance_transactions (import_id);

create or replace function public.finance_protect_original_description()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.description_original is distinct from old.description_original then
    raise exception 'description_original is immutable';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Internal transfer links (money moving between the user's own accounts)
-- ---------------------------------------------------------------------

create table if not exists public.finance_transfer_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  outgoing_transaction_id uuid not null,
  incoming_transaction_id uuid not null,
  -- 'transfer' (same currency) or 'exchange' (currency conversion).
  kind text not null default 'transfer' check (kind in ('transfer', 'exchange')),
  created_at timestamptz not null default now(),
  -- A transaction can be one side of at most one link.
  unique (outgoing_transaction_id),
  unique (incoming_transaction_id),
  check (outgoing_transaction_id <> incoming_transaction_id),
  foreign key (outgoing_transaction_id, user_id) references public.finance_transactions (id, user_id) on delete cascade,
  foreign key (incoming_transaction_id, user_id) references public.finance_transactions (id, user_id) on delete cascade
);

create index if not exists finance_transfer_links_user_idx on public.finance_transfer_links (user_id);

-- Linking two transactions must describe a real movement: money leaving
-- one account and arriving in a different one.
create or replace function public.finance_validate_transfer_link()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  outgoing record;
  incoming record;
begin
  select amount_minor, account_id, currency into outgoing from public.finance_transactions where id = new.outgoing_transaction_id;
  select amount_minor, account_id, currency into incoming from public.finance_transactions where id = new.incoming_transaction_id;

  if outgoing.amount_minor >= 0 then
    raise exception 'outgoing side of a transfer must be negative';
  end if;
  if incoming.amount_minor <= 0 then
    raise exception 'incoming side of a transfer must be positive';
  end if;
  if outgoing.account_id = incoming.account_id then
    raise exception 'a transfer must link two different accounts';
  end if;
  if new.kind = 'transfer' and outgoing.currency <> incoming.currency then
    raise exception 'a same-currency transfer cannot link different currencies; use kind exchange';
  end if;
  if new.kind = 'exchange' and outgoing.currency = incoming.currency then
    raise exception 'an exchange must link two different currencies';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Budgets (monthly, per category and currency)
-- ---------------------------------------------------------------------

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  monthly_amount_minor bigint not null check (monthly_amount_minor > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, category_id, currency),
  foreign key (category_id, user_id) references public.finance_categories (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Required payments (rent, phone, subscriptions ...) and monthly checks
-- ---------------------------------------------------------------------

create table if not exists public.finance_required_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- Day of the month the payment is due. 29-31 fall back to the month's
  -- last day in short months.
  due_day smallint not null check (due_day between 1 and 31),
  -- Text that identifies the payment in a statement (merchant or
  -- description contains it, case-insensitive). Null = manual checks only.
  match_pattern text check (match_pattern is null or char_length(btrim(match_pattern)) between 1 and 200),
  -- Optional. When set, an imported transaction only counts if its amount
  -- is within amount_tolerance_pct of this.
  expected_amount_minor bigint check (expected_amount_minor is null or expected_amount_minor > 0),
  currency char(3) check (currency is null or currency ~ '^[A-Z]{3}$'),
  amount_tolerance_pct numeric(5, 2) not null default 5 check (amount_tolerance_pct between 0 and 100),
  account_id uuid,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (expected_amount_minor is null or currency is not null),
  foreign key (account_id, user_id) references public.finance_accounts (id, user_id) on delete set null (account_id)
);

create table if not exists public.finance_required_payment_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  required_payment_id uuid not null,
  -- First day of the month this check is for.
  period_month date not null check (extract(day from period_month) = 1),
  -- A manual decision. Overrides whatever the statements say, both ways:
  -- 'paid' for a payment made in cash, 'unpaid' to reject a wrong match.
  status text not null check (status in ('paid', 'unpaid')),
  checked_at timestamptz not null default now(),
  unique (required_payment_id, period_month),
  foreign key (required_payment_id, user_id) references public.finance_required_payments (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

drop trigger if exists finance_accounts_touch on public.finance_accounts;
create trigger finance_accounts_touch before update on public.finance_accounts for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_categories_touch on public.finance_categories;
create trigger finance_categories_touch before update on public.finance_categories for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_statement_imports_touch on public.finance_statement_imports;
create trigger finance_statement_imports_touch before update on public.finance_statement_imports for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_category_rules_touch on public.finance_category_rules;
create trigger finance_category_rules_touch before update on public.finance_category_rules for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_transactions_touch on public.finance_transactions;
create trigger finance_transactions_touch before update on public.finance_transactions for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_transactions_protect_description on public.finance_transactions;
create trigger finance_transactions_protect_description before update on public.finance_transactions for each row execute function public.finance_protect_original_description();

drop trigger if exists finance_budgets_touch on public.finance_budgets;
create trigger finance_budgets_touch before update on public.finance_budgets for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_required_payments_touch on public.finance_required_payments;
create trigger finance_required_payments_touch before update on public.finance_required_payments for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_transfer_links_validate on public.finance_transfer_links;
create trigger finance_transfer_links_validate before insert or update on public.finance_transfer_links for each row execute function public.finance_validate_transfer_link();

-- ---------------------------------------------------------------------
-- Row Level Security: every finance table, own rows only
-- ---------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'finance_accounts',
    'finance_categories',
    'finance_statement_imports',
    'finance_statements',
    'finance_category_rules',
    'finance_transactions',
    'finance_transfer_links',
    'finance_budgets',
    'finance_required_payments',
    'finance_required_payment_checks'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists "Own rows: select" on public.%I', table_name);
    execute format('create policy "Own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name);

    execute format('drop policy if exists "Own rows: insert" on public.%I', table_name);
    execute format('create policy "Own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name);

    execute format('drop policy if exists "Own rows: update" on public.%I', table_name);
    execute format('create policy "Own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);

    execute format('drop policy if exists "Own rows: delete" on public.%I', table_name);
    execute format('create policy "Own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Private storage for uploaded statements
-- ---------------------------------------------------------------------
--
-- Not public. Objects live under '<user_id>/...', and every policy checks
-- that first folder against the caller, so a guessed or modified path to
-- another user's file is refused.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finance-statements', 'finance-statements', false, 4194304, array['application/pdf', 'text/csv'])
on conflict (id) do nothing;

drop policy if exists "Finance statements: owner read" on storage.objects;
create policy "Finance statements: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'finance-statements' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Finance statements: owner insert" on storage.objects;
create policy "Finance statements: owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'finance-statements' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Finance statements: owner delete" on storage.objects;
create policy "Finance statements: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'finance-statements' and (storage.foldername(name))[1] = (select auth.uid())::text);
