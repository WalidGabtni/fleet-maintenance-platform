-- ============================
-- PDF INVOICE EXPORT
-- shop letterhead info, needed for the invoice PDF header
-- ============================

alter table shop_settings
  add column shop_name text,
  add column shop_address text,
  add column shop_phone text,
  add column shop_email text;
