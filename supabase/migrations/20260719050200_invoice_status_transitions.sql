-- ============================
-- V3: INVOICING
-- status transitions
-- Mirrors work_orders' closed_at pattern: paid_at is set automatically the
-- first time status becomes 'paid'. issued_at is set automatically the
-- first time status becomes 'sent', and due_at defaults to issued_at + 30
-- days unless the caller already supplied a due_at in the same update.
-- ============================

create or replace function public.set_invoice_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'sent' then
    if new.issued_at is null then
      new.issued_at := now();
    end if;
    if new.due_at is null then
      new.due_at := new.issued_at + interval '30 days';
    end if;
  end if;

  if new.status = 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;

  return new;
end;
$$;

create trigger trg_invoices_status_timestamps
before insert or update of status on invoices
for each row execute function public.set_invoice_status_timestamps();
