-- Remove duplicate leave policies, keeping only the oldest entry for each type

-- Step 1: Delete duplicates (keep only the first created entry of each name)
DELETE FROM leave_policies
WHERE id NOT IN (
    SELECT DISTINCT ON (name) id
    FROM leave_policies
    ORDER BY name, created_at ASC
);

-- Step 2: Verify - should show only 5 unique policies
SELECT * FROM leave_policies ORDER BY name;
