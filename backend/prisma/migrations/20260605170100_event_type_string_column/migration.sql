-- Convert events.type from the EventType enum to a free string (event type is now a Master),
-- preserving existing values (campus_drive, ppt, test_assessment, internship_drive, workshop)
-- via an explicit text cast so no data is dropped.
ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE VARCHAR(150) USING "type"::text;

-- Drop the now-unused EventType enum.
DROP TYPE "EventType";
