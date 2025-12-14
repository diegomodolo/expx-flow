-- Delete approvals first (child records)
DELETE FROM presentation_creative_approvals 
WHERE meeting_id IN (
  SELECT id FROM presentation_meetings 
  WHERE presentation_id = '03bc2c89-0732-45ad-aa20-3d9b63abdbe4'
);

-- Delete participants (child records)
DELETE FROM presentation_meeting_participants 
WHERE meeting_id IN (
  SELECT id FROM presentation_meetings 
  WHERE presentation_id = '03bc2c89-0732-45ad-aa20-3d9b63abdbe4'
);

-- Delete the meetings
DELETE FROM presentation_meetings 
WHERE presentation_id = '03bc2c89-0732-45ad-aa20-3d9b63abdbe4';

-- Reset creative statuses back to pending
UPDATE presentation_creatives 
SET current_status = 'pending', 
    manager_approved_at = NULL, 
    manager_approved_by = NULL,
    scheduled_post_id = NULL
WHERE presentation_id = '03bc2c89-0732-45ad-aa20-3d9b63abdbe4';