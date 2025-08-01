-- First, let's check and fix users without companies
-- Step 1: Create companies for users who don't have any
DO $$
DECLARE
    user_record RECORD;
    new_company_id UUID;
BEGIN
    -- Loop through users who are not associated with any company
    FOR user_record IN 
        SELECT DISTINCT au.id, au.email, p.full_name
        FROM auth.users au
        LEFT JOIN profiles p ON p.user_id = au.id
        LEFT JOIN company_members cm ON cm.user_id = au.id
        WHERE cm.user_id IS NULL
    LOOP
        -- Create a new company for this user
        INSERT INTO companies (name, created_by, email)
        VALUES (
            COALESCE(user_record.full_name || '''s Company', 'Minha Empresa'),
            user_record.id,
            user_record.email
        )
        RETURNING id INTO new_company_id;
        
        -- Create the company membership (this will be done automatically by the trigger, but let's be explicit)
        INSERT INTO company_members (user_id, company_id, role, joined_at)
        VALUES (user_record.id, new_company_id, 'owner', now())
        ON CONFLICT (user_id, company_id) DO NOTHING;
        
        RAISE NOTICE 'Created company % for user %', new_company_id, user_record.email;
    END LOOP;
END $$;

-- Step 2: Update all records to associate them with the user's company
-- Update clients
UPDATE clients 
SET company_id = (
    SELECT cm.company_id 
    FROM company_members cm 
    WHERE cm.user_id = clients.user_id 
    LIMIT 1
)
WHERE company_id IS NULL;

-- Update campaigns
UPDATE campaigns 
SET company_id = (
    SELECT cm.company_id 
    FROM company_members cm 
    WHERE cm.user_id = campaigns.user_id 
    LIMIT 1
)
WHERE company_id IS NULL;

-- Update sectors
UPDATE sectors 
SET company_id = (
    SELECT cm.company_id 
    FROM company_members cm 
    WHERE cm.user_id = sectors.user_id 
    LIMIT 1
)
WHERE company_id IS NULL;

-- Update tasks
UPDATE tasks 
SET company_id = (
    SELECT cm.company_id 
    FROM company_members cm 
    WHERE cm.user_id = tasks.user_id 
    LIMIT 1
)
WHERE company_id IS NULL;

-- Update teams
UPDATE teams 
SET company_id = (
    SELECT cm.company_id 
    FROM company_members cm 
    WHERE cm.user_id = teams.user_id 
    LIMIT 1
)
WHERE company_id IS NULL;

-- Update employees
UPDATE employees 
SET company_id = (
    SELECT cm.company_id 
    FROM company_members cm 
    WHERE cm.user_id = employees.user_id 
    LIMIT 1
)
WHERE company_id IS NULL;

-- Step 3: Make company_id required for future records (optional, but recommended)
-- We can add NOT NULL constraints later if needed

-- Step 4: Verify the results
SELECT 
    'Users without companies' as check_type,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN company_members cm ON cm.user_id = au.id
WHERE cm.user_id IS NULL

UNION ALL

SELECT 
    'Clients without companies' as check_type,
    COUNT(*) as count
FROM clients
WHERE company_id IS NULL

UNION ALL

SELECT 
    'Campaigns without companies' as check_type,
    COUNT(*) as count
FROM campaigns
WHERE company_id IS NULL

UNION ALL

SELECT 
    'Tasks without companies' as check_type,
    COUNT(*) as count
FROM tasks
WHERE company_id IS NULL

UNION ALL

SELECT 
    'Teams without companies' as check_type,
    COUNT(*) as count
FROM teams
WHERE company_id IS NULL

UNION ALL

SELECT 
    'Employees without companies' as check_type,
    COUNT(*) as count
FROM employees
WHERE company_id IS NULL

UNION ALL

SELECT 
    'Sectors without companies' as check_type,
    COUNT(*) as count
FROM sectors
WHERE company_id IS NULL;