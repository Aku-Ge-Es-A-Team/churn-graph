import { ArrowLeftIcon } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { routes } from "@/lib/site-config";

export default function AccountNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold">Account not found</h1>
      <p className="text-sm text-muted-foreground">There is no customer account with this ID.</p>
      <LinkButton href={routes.dashboard} variant="outline" size="sm">
        <ArrowLeftIcon />
        Back to the ranking
      </LinkButton>
    </main>
  );
}
