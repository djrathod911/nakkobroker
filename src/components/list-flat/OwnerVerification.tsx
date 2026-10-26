import { BadgeCheck, Smartphone } from "lucide-react";

export function OwnerVerification({ verified }: { verified: boolean }) {
  const Icon = verified ? BadgeCheck : Smartphone;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4" role="status">
      <Icon className={`mt-0.5 size-5 shrink-0 ${verified ? "text-success" : "text-muted-foreground"}`} aria-hidden />
      <div>
        <p className={`text-sm font-medium ${verified ? "text-success" : "text-foreground"}`}>
          {verified ? "Phone verified" : "Contact number not verified"}
        </p>
        <p className="text-xs text-muted-foreground">
          {verified
            ? "This number was previously confirmed by SMS."
            : "Phone verification is optional and currently unavailable. You can publish with a valid contact number; it will not receive a verified badge."}
        </p>
      </div>
    </div>
  );
}
