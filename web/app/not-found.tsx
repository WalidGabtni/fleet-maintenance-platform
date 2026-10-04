import Link from "next/link";
import { cardClass, buttonClass } from "@/lib/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className={`flex max-w-md flex-col items-center gap-4 p-8 text-center ${cardClass}`}>
        <h1 className="text-xl font-semibold text-app-fg dark:text-brand-fg">Page introuvable</h1>
        <p className="text-sm text-app-fg-muted dark:text-brand-fg-muted">
          Cette page n&apos;existe pas ou a été déplacée. Vérifiez le lien, ou revenez au tableau de bord.
        </p>
        <Link href="/" className={buttonClass}>
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
