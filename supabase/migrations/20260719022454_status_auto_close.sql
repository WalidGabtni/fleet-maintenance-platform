-- ============================
-- STATUS AUTO-CLOSE
-- Keeps work_orders.closed_at consistent with status, so the
-- app no longer has to compute this itself.
-- ============================

create or replace function public.set_work_order_closed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('completed', 'cancelled') then
    if new.closed_at is null then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_work_orders_closed_at
before insert or update of status on work_orders
for each row execute function public.set_work_order_closed_at();
