-- ============================
-- V2: PARTS & INVENTORY
-- stock deduction trigger
-- ============================

-- Applies `delta` to a part's quantity_on_hand and aborts the whole
-- transaction (via exception) if that would take it negative. The UPDATE
-- itself row-locks `parts`, so this is safe under concurrent writes.
create or replace function public.apply_part_stock_delta(target_part_id uuid, delta int)
returns void
language plpgsql
as $$
declare
  new_qty int;
  part_name text;
begin
  update parts
  set quantity_on_hand = quantity_on_hand + delta
  where id = target_part_id
  returning quantity_on_hand, name into new_qty, part_name;

  if new_qty < 0 then
    raise exception 'Insufficient stock for "%": % on hand, this operation requires %',
      part_name, new_qty - delta, -delta
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.adjust_part_stock()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.apply_part_stock_delta(new.part_id, -new.quantity_used);
    return new;

  elsif TG_OP = 'DELETE' then
    perform public.apply_part_stock_delta(old.part_id, old.quantity_used);
    return old;

  elsif TG_OP = 'UPDATE' then
    if new.part_id = old.part_id then
      perform public.apply_part_stock_delta(new.part_id, old.quantity_used - new.quantity_used);
    else
      perform public.apply_part_stock_delta(old.part_id, old.quantity_used);
      perform public.apply_part_stock_delta(new.part_id, -new.quantity_used);
    end if;
    return new;
  end if;

  return null;
end;
$$;

create trigger trg_work_order_parts_stock
after insert or delete or update of quantity_used, part_id on work_order_parts
for each row execute function public.adjust_part_stock();
