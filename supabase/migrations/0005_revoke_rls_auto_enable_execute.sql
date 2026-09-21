-- El EXECUTE de esta función está otorgado a PUBLIC (no individualmente a anon/authenticated),
-- por lo que ambos roles lo heredan; revocar solo de anon/authenticated no tiene efecto.
revoke execute on function public.rls_auto_enable() from public;
