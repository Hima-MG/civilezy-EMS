import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="flex flex-col items-center text-center gap-4 max-w-sm">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
          <FileQuestion className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Page not found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The page you&apos;re looking for doesn&apos;t exist or you don&apos;t
            have permission to access it.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    </div>
  );
}
