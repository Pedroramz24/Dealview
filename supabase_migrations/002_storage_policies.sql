-- =====================================================
-- DealView CRM - Storage Buckets Configuration
-- Run this AFTER running 001_create_schema.sql
-- =====================================================

-- Note: Storage buckets must be created through Supabase Dashboard
-- Then run these RLS policies

-- =====================================================
-- Storage Bucket RLS Policies
-- =====================================================

-- Bucket: deal-images
-- Users can upload images for their own deals
CREATE POLICY "Users can upload deal images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-images'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view deal images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-images'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
    UNION
    SELECT deal_id::text FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own deal images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-images'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
  )
);

-- Bucket: documents
-- Users can upload documents for their deals
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
    UNION
    SELECT deal_id::text FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
  )
);

-- Bucket: map-tiles
-- Public read access for map tiles
CREATE POLICY "Public can view map tiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'map-tiles');

CREATE POLICY "Service role can manage map tiles"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'map-tiles');
