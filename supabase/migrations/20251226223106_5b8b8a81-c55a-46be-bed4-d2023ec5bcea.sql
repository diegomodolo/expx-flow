-- Create table for board user queue (round-robin assignment)
CREATE TABLE public.crm_board_user_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.crm_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE,
  queue_position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Add queue_enabled flag to boards
ALTER TABLE public.crm_boards ADD COLUMN IF NOT EXISTS queue_enabled BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.crm_board_user_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for board user queue
CREATE POLICY "Users can view queue for their workspace boards"
ON public.crm_board_user_queue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.crm_boards b
    JOIN public.crm_workspaces w ON b.workspace_id = w.id
    WHERE b.id = crm_board_user_queue.board_id
  )
);

CREATE POLICY "Users can insert into queue for their workspace boards"
ON public.crm_board_user_queue
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_boards b
    JOIN public.crm_workspaces w ON b.workspace_id = w.id
    WHERE b.id = crm_board_user_queue.board_id
  )
);

CREATE POLICY "Users can update queue for their workspace boards"
ON public.crm_board_user_queue
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.crm_boards b
    JOIN public.crm_workspaces w ON b.workspace_id = w.id
    WHERE b.id = crm_board_user_queue.board_id
  )
);

CREATE POLICY "Users can delete from queue for their workspace boards"
ON public.crm_board_user_queue
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.crm_boards b
    JOIN public.crm_workspaces w ON b.workspace_id = w.id
    WHERE b.id = crm_board_user_queue.board_id
  )
);

-- Create function to get next user in queue and rotate
CREATE OR REPLACE FUNCTION public.get_next_queue_user_and_rotate(p_board_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_user_id UUID;
  v_current_position INTEGER;
  v_max_position INTEGER;
BEGIN
  -- Check if queue is enabled for this board
  IF NOT EXISTS (SELECT 1 FROM crm_boards WHERE id = p_board_id AND queue_enabled = true) THEN
    RETURN NULL;
  END IF;

  -- Get the user at position 0 (top of queue)
  SELECT user_id, queue_position INTO v_next_user_id, v_current_position
  FROM crm_board_user_queue
  WHERE board_id = p_board_id AND is_active = true
  ORDER BY queue_position ASC
  LIMIT 1;

  IF v_next_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get max position
  SELECT COALESCE(MAX(queue_position), 0) INTO v_max_position
  FROM crm_board_user_queue
  WHERE board_id = p_board_id AND is_active = true;

  -- Move all users up one position
  UPDATE crm_board_user_queue
  SET queue_position = queue_position - 1,
      updated_at = now()
  WHERE board_id = p_board_id 
    AND is_active = true 
    AND queue_position > v_current_position;

  -- Move the assigned user to the end
  UPDATE crm_board_user_queue
  SET queue_position = v_max_position,
      updated_at = now()
  WHERE board_id = p_board_id AND user_id = v_next_user_id;

  RETURN v_next_user_id;
END;
$$;

-- Create index for performance
CREATE INDEX idx_crm_board_user_queue_board_position ON public.crm_board_user_queue(board_id, queue_position) WHERE is_active = true;