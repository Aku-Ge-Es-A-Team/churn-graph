import Link from "next/link";
import { routes } from "@/lib/site-config";

export default function AccountNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold">Account not found</h1>
      <p className="text-sm text-muted-foreground">There is no customer account with this ID.</p>
      <Link href={routes.dashboard} className="text-sm underline underline-offset-4">
        Back to the ranking
      </Link>
    </main>
  );
}
