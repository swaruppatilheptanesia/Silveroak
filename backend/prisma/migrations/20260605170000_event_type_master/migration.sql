-- Add the new `event_type` category to the MasterCategory enum.
ALTER TYPE "MasterCategory" ADD VALUE IF NOT EXISTS 'event_type';
