REVOKE EXECUTE ON FUNCTION public.get_profile_display_names(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_daily_alert_digests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_in_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_display_names(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_daily_alert_digests() TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_in_phone(text) TO service_role;