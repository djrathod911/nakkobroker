REVOKE ALL ON FUNCTION public.notify_matching_alerts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_daily_alert_digests() FROM PUBLIC, anon, authenticated;