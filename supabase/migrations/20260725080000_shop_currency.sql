-- ============================
-- Shop currency (display only — invoices themselves are always recorded and
-- generated in this currency; the invoice detail page separately offers a
-- live-converted view in other currencies for reference).
-- ============================

alter table shop_settings
  add column currency text not null default 'CAD' check (currency in ('CAD', 'USD', 'EUR'));
