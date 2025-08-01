-- Check if the user can update companies
SELECT 
  c.id,
  c.name,
  c.email,
  c.phone,
  c.logo,
  cm.role
FROM companies c
JOIN company_members cm ON cm.company_id = c.id
WHERE cm.user_id = '86793064-6fb0-44c4-8c24-26b6fdfabdc7';