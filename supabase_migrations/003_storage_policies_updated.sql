-- =====================================================
-- DealView CRM - Storage Buckets Configuration
-- Updated for your bucket names
-- =====================================================

-- Bucket: property-images (your existing bucket name)
-- Users can upload images for their own deals
CREATE POLICY "Users can upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view property images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-images'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
    UNION
    SELECT deal_id::text FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own property images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
  )
);

-- Bucket: deal-documents (your existing bucket name)
-- Users can upload documents for their deals
CREATE POLICY "Users can upload deal documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-documents'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view deal documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-documents'
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
  bucket_id = 'deal-documents'
  AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE owner_id = auth.uid()
  )
);

-- Bucket: map-tiles (your existing bucket name)
-- Public read access for map tiles
CREATE POLICY "Public can view map tiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'map-tiles');

CREATE POLICY "Service role can manage map tiles"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'map-tiles');
