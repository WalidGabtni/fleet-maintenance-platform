create table features (
  key text primary key,
  name text not null,
  description text
);

alter table features enable row level security;

create policy "Authenticated users can read features" on features
  for select using (auth.uid() is not null);

insert into features (key, name, description) values
  ('work_orders', 'Bons de travail', 'Création et suivi des bons de travail, notes et pièces utilisées.'),
  ('parts_inventory', 'Pièces', 'Catalogue de pièces et suivi de l''inventaire.'),
  ('invoicing', 'Facturation', 'Génération des factures et paramètres de facturation.'),
  ('maintenance_scheduling', 'Entretien', 'Modèles et calendriers d''entretien préventif.'),
  ('reporting', 'Rapports', 'Rapports et analyses (revenus, productivité, historique des coûts).'),
  ('voice_notes', 'Notes vocales', 'Dictée de notes sur les bons de travail avec transcription automatique.'),
  ('manage_users', 'Gestion des utilisateurs', 'Invitation et gestion des rôles de l''équipe.');
