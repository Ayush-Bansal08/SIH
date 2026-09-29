import { SearchX } from "lucide-react";
import { EmptyState, LinkButton } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="py-10">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState icon={<SearchX className="size-6" aria-hidden />} title="Page not found" action={<LinkButton href="/">Back to overview</LinkButton>}>
        The page or project you are looking for is not in the prototype dataset.
      </EmptyState>
    </div>
  );
}
