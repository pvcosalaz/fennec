-- Add color_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS color_id text DEFAULT NULL;

-- Network connections table
CREATE TABLE IF NOT EXISTS network_connections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(owner_id, contact_id)
);

ALTER TABLE network_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_connections" ON network_connections
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "users_insert_own_connections" ON network_connections
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "users_delete_own_connections" ON network_connections
  FOR DELETE USING (auth.uid() = owner_id);
