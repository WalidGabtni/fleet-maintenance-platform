export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  { id: "length", label: "Au moins 8 caractères", test: (v) => v.length >= 8 },
  { id: "upper", label: "Une lettre majuscule", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "Une lettre minuscule", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "Un chiffre", test: (v) => /[0-9]/.test(v) },
  { id: "special", label: "Un caractère spécial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function isPasswordStrong(password: string): boolean {
  return passwordRules.every((rule) => rule.test(password));
}
