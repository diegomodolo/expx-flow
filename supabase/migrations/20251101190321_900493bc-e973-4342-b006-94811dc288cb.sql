-- Add icon column to funnel_block_types table if it doesn't exist
ALTER TABLE funnel_block_types ADD COLUMN IF NOT EXISTS icon TEXT;

-- Update existing block types with appropriate icons
UPDATE funnel_block_types SET icon = 'facebook' WHERE name LIKE '%facebook%' OR display_name ILIKE '%facebook%';
UPDATE funnel_block_types SET icon = 'google' WHERE name LIKE '%google%' OR display_name ILIKE '%google%';
UPDATE funnel_block_types SET icon = 'youtube' WHERE name LIKE '%youtube%' OR display_name ILIKE '%youtube%';
UPDATE funnel_block_types SET icon = 'mail' WHERE name LIKE '%email%' OR display_name ILIKE '%email%';
UPDATE funnel_block_types SET icon = 'book-open' WHERE name LIKE '%ebook%' OR display_name ILIKE '%ebook%' OR display_name ILIKE '%e-book%';
UPDATE funnel_block_types SET icon = 'newspaper' WHERE name LIKE '%blog%' OR display_name ILIKE '%blog%' OR display_name ILIKE '%artigo%';
UPDATE funnel_block_types SET icon = 'video' WHERE name LIKE '%webinar%' OR display_name ILIKE '%webinar%' OR display_name ILIKE '%video%';
UPDATE funnel_block_types SET icon = 'megaphone' WHERE name LIKE '%ad%' OR display_name ILIKE '%anúncio%' OR display_name ILIKE '%anuncio%';
UPDATE funnel_block_types SET icon = 'file-text' WHERE name LIKE '%whitepaper%' OR display_name ILIKE '%whitepaper%';
UPDATE funnel_block_types SET icon = 'message-square' WHERE name LIKE '%chat%' OR display_name ILIKE '%chat%' OR display_name ILIKE '%conversa%';
UPDATE funnel_block_types SET icon = 'users' WHERE name LIKE '%landing%' OR display_name ILIKE '%landing%' OR display_name ILIKE '%cadastro%';
UPDATE funnel_block_types SET icon = 'target' WHERE name LIKE '%retargeting%' OR display_name ILIKE '%retargeting%';
UPDATE funnel_block_types SET icon = 'trending-up' WHERE name LIKE '%diagnos%' OR display_name ILIKE '%diagnós%' OR display_name ILIKE '%analise%';
UPDATE funnel_block_types SET icon = 'check-circle' WHERE name LIKE '%proposta%' OR display_name ILIKE '%proposta%' OR display_name ILIKE '%fechamento%';

-- Set default icon for any remaining blocks without an icon
UPDATE funnel_block_types SET icon = 'target' WHERE icon IS NULL;