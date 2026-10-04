type SupabaseLikeError = { code?: string; message: string };

const FRIENDLY_MESSAGES: Record<string, string> = {
  "23505": "Cette valeur est déjà utilisée par un autre enregistrement. Vérifiez le champ signalé et réessayez.",
  "23502": "Un champ obligatoire est manquant ou vide. Vérifiez le formulaire et réessayez.",
  "23503": "Certaines informations liées n'existent plus (ex. client ou véhicule supprimé). Rafraîchissez la page et réessayez.",
  "23514": "Une valeur saisie ne respecte pas une règle de validation (ex. quantité ou montant invalide).",
  "22P02": "Une valeur saisie est dans un format invalide. Vérifiez le formulaire et réessayez.",
  "42501": "Vous n'avez pas la permission d'effectuer cette action.",
};

const GENERIC_FALLBACK = "Une erreur est survenue. Réessayez, ou contactez un administrateur si le problème persiste.";

export function friendlyError(error: SupabaseLikeError): string {
  return (error.code && FRIENDLY_MESSAGES[error.code]) || GENERIC_FALLBACK;
}

export function friendlyDeleteError(error: SupabaseLikeError): string {
  if (error.code === "23503") {
    return "Suppression impossible — d'autres enregistrements y font encore référence (ex. véhicules ou bons de travail).";
  }
  return friendlyError(error);
}
