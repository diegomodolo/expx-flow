// Temporary script - run this in browser console or remove after use
import { supabase } from '@/integrations/supabase/client';

export const fixCreativesStatus = async () => {
  const presentationId = '03bc2c89-0732-45ad-aa20-3d9b63abdbe4';
  
  const { data, error } = await supabase
    .from('presentation_creatives')
    .update({
      current_status: 'approved',
      scheduled_post_id: null,
    })
    .eq('presentation_id', presentationId)
    .select();

  if (error) {
    console.error('Error updating creatives:', error);
    return;
  }

  console.log('Updated creatives:', data);
  return data;
};

// Execute
fixCreativesStatus();
