-- Migration: Enable PostGIS extension
-- Purpose: Enable geospatial queries for map clustering and location-based searches

CREATE EXTENSION IF NOT EXISTS postgis;
