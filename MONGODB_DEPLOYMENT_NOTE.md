# MongoDB Migration Configuration
# 
# This file exists to allow Emergent deployment to pass MongoDB migration steps,
# even though this application does NOT actively use MongoDB.
#
# The application uses Supabase (PostgreSQL) for all database operations.
# MongoDB is only present for deployment compatibility with the base image.
#
# During deployment:
# - Emergent will provide Atlas MongoDB credentials
# - Migration step will run against empty MongoDB
# - Application will continue using Supabase (not MongoDB)
# - No MongoDB operations will be performed by application code

# Environment Variables Explanation:
# MONGO_URL="" - Empty in local dev, Emergent fills during deployment
# DB_NAME="" - Empty in local dev, Emergent fills during deployment
#
# These are ONLY for deployment migration step compatibility.
# The application does NOT use these variables in runtime code.
