create table if not exists app_schema_migrations (
  name text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);

-- statement-breakpoint

create table if not exists source_posts (
  id text primary key,
  source text not null,
  source_deal_id text not null,
  source_mode text not null check (source_mode in ('public_page', 'official_api', 'approved_feed')),
  source_url text not null,
  latest_product_url text,
  destination_host text,
  latest_title text not null,
  normalized_title text not null,
  category_hint text,
  latest_image_url text,
  published_at timestamptz not null,
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  unique (source, source_deal_id)
);

-- statement-breakpoint

create table if not exists source_post_observations (
  idempotency_key text primary key,
  source_post_id text not null references source_posts(id) on delete cascade,
  crawl_run_id text not null,
  observed_at timestamptz not null,
  expires_at timestamptz,
  listed_price_amount bigint check (listed_price_amount is null or listed_price_amount > 0),
  seller_reference_amount bigint check (seller_reference_amount is null or seller_reference_amount > 0),
  shipping_amount bigint check (shipping_amount is null or shipping_amount >= 0),
  currency char(3) not null default 'KRW',
  free_shipping boolean not null default false,
  option_price boolean not null default false,
  recommendations integer check (recommendations is null or recommendations >= 0),
  comments integer check (comments is null or comments >= 0),
  views integer check (views is null or views >= 0),
  purchases integer check (purchases is null or purchases >= 0),
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (source_post_id, observed_at)
);

-- statement-breakpoint

create index if not exists source_posts_last_observed_idx
  on source_posts (last_observed_at desc);

-- statement-breakpoint

create index if not exists source_post_observations_post_time_idx
  on source_post_observations (source_post_id, observed_at desc);

-- statement-breakpoint

create index if not exists source_post_observations_crawl_run_idx
  on source_post_observations (crawl_run_id);
