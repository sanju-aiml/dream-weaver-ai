REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spend_tokens(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_tokens(integer, text) TO authenticated;