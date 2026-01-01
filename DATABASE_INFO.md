# Database Configuration

This application uses **Supabase (PostgreSQL)** as its database, NOT MongoDB.

## Database Type
- **Provider**: Supabase (Managed PostgreSQL)
- **Connection**: Via SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
- **Migration**: Not required (using managed service)

## Important Notes
- This app does NOT use MongoDB
- MongoDB migration steps should be SKIPPED during deployment
- All database operations use the Supabase Python SDK
- No local database is required

## Environment Variables Required
```
SUPABASE_URL=https://ygezobmpewthqvsfqrbk.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_KEY=<service_role_key>
```

## MongoDB Status
MongoDB has been completely removed from this application:
- ✅ No MongoDB code in backend
- ✅ No MongoDB dependencies in requirements.txt
- ✅ No MONGO_URL environment variable
- ✅ MongoDB service disabled in supervisor

Please skip all MongoDB-related deployment steps.
