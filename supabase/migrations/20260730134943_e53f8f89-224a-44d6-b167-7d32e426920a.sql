CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_admin_select_all" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.assign_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_assign_role
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_first_user_admin();

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
ORDER BY p.created_at
LIMIT 1;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::public.app_role FROM public.profiles p
ON CONFLICT DO NOTHING;