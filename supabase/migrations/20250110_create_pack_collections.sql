-- Create table to persist Pack NFT collections with all token URIs
create table if not exists public.pack_collections (
  id                bigserial primary key,
  created_at        timestamptz not null default now(),

  -- Chain identifiers
  collection_address text not null unique,
  owner_address      text not null,
  user_id            uuid not null,

  -- Display
  name               text,
  symbol             text,
  description        text,

  -- Images/URIs
  pack_image_uri     text,
  nft_image_uris     jsonb,   -- array of 5 strings
  all_token_uris     jsonb,   -- array of 6 strings in on-chain order
  token_id_map       jsonb,   -- { "0":0, ..., "5":5 } by convention

  -- Economics
  pack_price_wei     text,
  max_packs          text,
  royalty_bps        integer,
  royalty_recipient  text,

  active             boolean not null default true
);

create index if not exists pack_collections_user_id_idx on public.pack_collections(user_id);
create index if not exists pack_collections_owner_idx   on public.pack_collections(owner_address);

comment on table public.pack_collections is 'Pack-based NFT collections (5 NFTs + 1 pack cover), stores all token URIs and on-chain id mapping.';

