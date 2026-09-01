-- Add availability_status and map_visible columns to listings table.
-- availability_status: whether the property is currently available, occupied, or available soon.
-- map_visible: owner-controlled toggle to show/hide the listing on the map.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'occupied', 'available_soon')),
  ADD COLUMN IF NOT EXISTS available_from_date DATE,
  ADD COLUMN IF NOT EXISTS map_visible BOOLEAN NOT NULL DEFAULT true;

-- Grant read access to all authenticated and anonymous users
GRANT SELECT (availability_status, available_from_date, map_visible)
  ON public.listings TO anon, authenticated;

-- Backfill: existing listings default to 'available' and map_visible = true (already handled by column defaults)
