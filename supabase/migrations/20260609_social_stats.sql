-- Add social stats columns to profiles table
-- Run in Supabase SQL Editor

alter table profiles
  add column if not exists ig_followers       integer,
  add column if not exists tiktok_followers   integer,
  add column if not exists yt_subscribers     integer,
  add column if not exists social_synced_at   timestamptz;
