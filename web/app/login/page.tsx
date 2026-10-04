import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { RecoveryHashGate } from "./RecoveryHashGate";

export default function LoginPage() {
  return (
    <Suspense>
      <RecoveryHashGate>
        <LoginForm />
      </RecoveryHashGate>
    </Suspense>
  );
}
