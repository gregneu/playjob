-- ПОЛНАЯ ДИАГНОСТИКА REALTIME ДЛЯ ТИКЕТОВ
-- Выполните этот скрипт в Supabase SQL Editor

-- ============================================
-- 1. Проверка REALTIME Publication
-- ============================================
SELECT 
  'Step 1: Realtime Publication' as check_step,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ object_tickets IS in realtime publication'
    ELSE '❌ object_tickets is NOT in realtime publication - RUN enable_realtime_object_tickets.sql!'
  END as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'object_tickets';

-- ============================================
-- 2. Проверка REPLICA IDENTITY
-- ============================================
SELECT 
  'Step 2: Replica Identity' as check_step,
  CASE c.relreplident
    WHEN 'd' THEN '⚠️ DEFAULT - only PK in old payload (run migration!)'
    WHEN 'f' THEN '✅ FULL - all columns in old payload'
    WHEN 'i' THEN '⚠️ INDEX'
    WHEN 'n' THEN '❌ NOTHING'
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'object_tickets';

-- ============================================
-- 3. Проверка RLS (Row Level Security)
-- ============================================
SELECT 
  'Step 3: RLS Status' as check_step,
  CASE 
    WHEN rowsecurity THEN '✅ RLS enabled'
    ELSE '❌ RLS disabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'object_tickets';

-- ============================================
-- 4. Проверка RLS Политик для SELECT
-- ============================================
SELECT 
  'Step 4: RLS SELECT Policies' as check_step,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO SELECT policies - users cannot read tickets!'
    WHEN COUNT(*) > 0 THEN '✅ SELECT policies exist'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'object_tickets'
  AND cmd = 'SELECT';

-- Детали SELECT политик
SELECT 
  '  Policy details:' as info,
  policyname,
  qual as using_expression,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'object_tickets'
  AND cmd = 'SELECT';

-- ============================================
-- 5. Проверка column project_id в object_tickets
-- ============================================
SELECT 
  'Step 5: Column Check' as check_step,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ zone_object_id column exists'
    ELSE '❌ zone_object_id column missing!'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'object_tickets'
  AND column_name = 'zone_object_id';

-- Проверяем есть ли project_id (его НЕ должно быть)
SELECT 
  'Step 5b: project_id column' as check_step,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ project_id does NOT exist (correct)'
    ELSE '⚠️ project_id exists (unexpected)'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'object_tickets'
  AND column_name = 'project_id';

-- ============================================
-- 6. Проверка связи zone_objects -> zones -> projects
-- ============================================
SELECT 
  'Step 6: Data Relationship Test' as check_step,
  COUNT(DISTINCT ot.id) as total_tickets,
  COUNT(DISTINCT zo.id) as zone_objects_count,
  COUNT(DISTINCT z.id) as zones_count,
  COUNT(DISTINCT z.project_id) as projects_count,
  CASE 
    WHEN COUNT(DISTINCT ot.id) > 0 AND COUNT(DISTINCT z.project_id) > 0 
    THEN '✅ Relationships look good'
    ELSE '⚠️ Some relationships missing'
  END as status
FROM object_tickets ot
LEFT JOIN zone_objects zo ON zo.id = ot.zone_object_id
LEFT JOIN zones z ON z.id = zo.zone_id;

-- ============================================
-- 7. Проверка индексов для производительности
-- ============================================
SELECT 
  'Step 7: Indexes' as check_step,
  COUNT(*) as index_count,
  string_agg(indexname, ', ') as index_names
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'object_tickets';

-- ============================================
-- 8. Проверка недавних изменений (последние 10 тикетов)
-- ============================================
SELECT 
  'Step 8: Recent Activity' as check_step,
  id as ticket_id,
  zone_object_id,
  title,
  updated_at,
  created_at
FROM object_tickets 
ORDER BY updated_at DESC NULLS LAST
LIMIT 5;

-- ============================================
-- ИТОГОВАЯ СВОДКА
-- ============================================
SELECT 
  '========================================' as summary,
  'CRITICAL CHECKS SUMMARY' as description;

-- Проверка что все критично важные условия выполнены
WITH checks AS (
  SELECT 
    (SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'object_tickets') > 0 as realtime_enabled,
    (SELECT relreplident FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'object_tickets') = 'f' as replica_full,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'object_tickets' AND cmd = 'SELECT') > 0 as has_select_policy,
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'object_tickets') as rls_enabled
)
SELECT 
  CASE WHEN realtime_enabled THEN '✅' ELSE '❌' END || ' Realtime Publication' as check_1,
  CASE WHEN replica_full THEN '✅' ELSE '⚠️' END || ' Replica Identity FULL' as check_2,
  CASE WHEN has_select_policy THEN '✅' ELSE '❌' END || ' SELECT Policies' as check_3,
  CASE WHEN rls_enabled THEN '✅' ELSE '❌' END || ' RLS Enabled' as check_4,
  CASE 
    WHEN realtime_enabled AND replica_full AND has_select_policy AND rls_enabled 
    THEN '🎉 ALL CHECKS PASSED - Realtime should work!'
    ELSE '⚠️ SOME CHECKS FAILED - See details above'
  END as overall_status
FROM checks;

