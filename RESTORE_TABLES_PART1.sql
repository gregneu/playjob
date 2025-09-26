-- ЧАСТЬ 1: УДАЛЕНИЕ СТАРЫХ ТАБЛИЦ
-- Выполните эту часть в SQL Editor Supabase

-- Удаляем старые таблицы (если есть)
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS zone_cells CASCADE;
DROP TABLE IF EXISTS hex_cells CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS projects CASCADE; 