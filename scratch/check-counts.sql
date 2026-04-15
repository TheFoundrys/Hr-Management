SELECT 'biometric_logs' as table_name, count(*) FROM biometric_logs
UNION ALL
SELECT 'attendance' as table_name, count(*) FROM attendance;
