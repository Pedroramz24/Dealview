# Supabase Storage Buckets Setup Guide

## Overview
The application requires two storage buckets for file uploads:
1. `property-images` - For property/deal images
2. `deal-documents` - For deal-related documents

## Important Note
⚠️ **Storage buckets cannot be created via SQL migrations**. They must be created manually through the Supabase Dashboard.

## Step-by-Step Setup Instructions

### 1. Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: **ygezobmpewthqvsfqrbk**

### 2. Create Storage Buckets

#### Create `property-images` Bucket
1. Navigate to **Storage** in the left sidebar
2. Click **New Bucket**
3. Fill in the details:
   - **Name**: `property-images`
   - **Public bucket**: ✅ **Yes** (check this box)
   - **File size limit**: 50 MB (recommended)
   - **Allowed MIME types**: Leave empty or specify: `image/jpeg, image/png, image/webp`
4. Click **Create Bucket**

#### Create `deal-documents` Bucket
1. Click **New Bucket** again
2. Fill in the details:
   - **Name**: `deal-documents`
   - **Public bucket**: ❌ **No** (leave unchecked)
   - **File size limit**: 100 MB (recommended)
   - **Allowed MIME types**: Leave empty to allow all document types
3. Click **Create Bucket**

### 3. Apply RLS Policies

After creating the buckets, you need to apply Row Level Security (RLS) policies.

#### For `property-images` Bucket:
1. Go to Storage → property-images → Policies
2. Click **New Policy** → **Get started quickly** → **Custom**
3. Create the following policies:

**SELECT Policy (Users can view own property images):**
```sql
CREATE POLICY "Users can view own property images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**INSERT Policy (Users can upload property images):**
```sql
CREATE POLICY "Users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**DELETE Policy (Users can delete own property images):**
```sql
CREATE POLICY "Users can delete own property images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### For `deal-documents` Bucket:
1. Go to Storage → deal-documents → Policies
2. Click **New Policy** → **Get started quickly** → **Custom**
3. Create the following policies:

**SELECT Policy (Users can view own documents):**
```sql
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deal-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**INSERT Policy (Users can upload documents):**
```sql
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deal-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**DELETE Policy (Users can delete own documents):**
```sql
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'deal-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Verify Setup

After creating the buckets and applying policies:

1. Test image upload:
   - Login to the application
   - Go to a deal details page
   - Try uploading an image
   - Should succeed without 403 errors

2. Test document upload:
   - From the same deal details page
   - Try uploading a PDF or other document
   - Should succeed without 403 errors

## File Path Structure

The application uses the following path structure for uploads:
- **Property Images**: `{user_id}/{deal_id}/{timestamp}.{ext}`
- **Documents**: `{user_id}/{deal_id}/{timestamp}_{filename}`

This structure ensures:
- User isolation (files organized by user_id)
- Deal organization (files grouped by deal_id)
- Uniqueness (timestamp prevents name collisions)

## Troubleshooting

### 403 Error on Upload
**Problem**: File upload fails with 403 Forbidden error  
**Solution**: 
1. Verify buckets exist in Storage
2. Check RLS policies are applied correctly
3. Ensure user is authenticated before uploading

### Bucket Not Found Error
**Problem**: Error message says bucket doesn't exist  
**Solution**: 
1. Double-check bucket names are exactly: `property-images` and `deal-documents`
2. Verify buckets are visible in Supabase Dashboard → Storage

### Files Not Accessible
**Problem**: Uploaded files can't be accessed/viewed  
**Solution**:
1. For property-images: Ensure bucket is set to **Public**
2. For deal-documents: Ensure proper SELECT policy is applied
3. Check file path follows the correct structure

## Next Steps

Once storage buckets are set up:
1. ✅ Frontend testing can be performed
2. ✅ File upload functionality will work
3. ✅ Full end-to-end testing can be completed

## Migration Files Reference

The RLS policies are also documented in:
- `/app/supabase_migrations/003_storage_policies_updated.sql`

However, these cannot be run until the buckets are created manually first.
