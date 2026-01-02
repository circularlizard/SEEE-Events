"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, Stethoscope, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers } from "@/hooks/useMembers";
import { getMemberIssues } from "@/lib/member-issues";
import type { NormalizedContact } from "@/lib/schemas";

interface MemberDetailClientProps {
  memberId: string;
}

const BACK_LINKS: Record<string, { href: string; label: string }> = {
  members: { href: "/dashboard/planning/members", label: "Back to Members" },
  issues: { href: "/dashboard/planning/members/issues", label: "Back to Data Quality" },
};

export function MemberDetailClient({ memberId }: MemberDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backKey = searchParams.get("from") ?? "members";
  const backLink = BACK_LINKS[backKey] ?? BACK_LINKS.members;

  const { members, isLoading, loadMemberCustomData } = useMembers();
  const member = members.find((m) => m.id === memberId);
  const issues = useMemo(() => (member ? getMemberIssues(member) : []), [member]);
  const [customStatus, setCustomStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [customError, setCustomError] = useState<string | null>(null);
  const memberUniqueId = member?.id ?? null;
  const memberLoadingState = member?.loadingState;
  const memberErrorMessage = member?.errorMessage ?? null;
  const memberHydrated = memberLoadingState === "complete" || memberLoadingState === "error";

  const onBack = () => {
    router.push(backLink.href);
  };

  useEffect(() => {
    if (!member) return;
    if (member.loadingState === "complete") {
      setCustomStatus("success");
      setCustomError(null);
    } else if (member.loadingState === "error") {
      setCustomStatus("error");
      setCustomError(member.errorMessage ?? "Unable to load custom data.");
    }
  }, [memberLoadingState, memberErrorMessage, member]);

  useEffect(() => {
    if (!memberUniqueId || memberHydrated) return;

    const controller = new AbortController();
    setCustomStatus("loading");
    setCustomError(null);

    loadMemberCustomData(memberUniqueId, { signal: controller.signal })
      .then((result) => {
        if (result.status === "loaded" || result.status === "skipped") {
          setCustomStatus("success");
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setCustomStatus("error");
        setCustomError(error instanceof Error ? error.message : "Failed to load custom data.");
      });

    return () => controller.abort();
  }, [memberUniqueId, memberHydrated, loadMemberCustomData]);

  if (isLoading && !member) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Loading member details…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLink.label}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Member not found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This scout isn’t available in the current section. Please return to the previous view.
          </CardContent>
        </Card>
      </div>
    );
  }

  const age = formatAge(member.dateOfBirth);
  const hasIssues = issues.length > 0;
  const showCustomDataNotice = customStatus === "loading" || customStatus === "error";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button variant="ghost" size="sm" className="inline-flex items-center gap-2 w-fit" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLink.label}
      </Button>

      <div className="rounded-lg bg-primary text-primary-foreground px-4 py-4 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold">
            {member.firstName} {member.lastName}
          </h1>
          <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs uppercase tracking-wide">
            {member.patrolName}
          </span>
        </div>
        <p className="text-sm opacity-90">
          Age: {age} • Section member since {member.startedSection || "N/A"}
        </p>
      </div>

      {showCustomDataNotice ? (
        <Card className="border border-dashed">
          <CardContent className="py-4 text-sm flex flex-col gap-2">
            {customStatus === "loading" ? (
              <>
                <p className="font-medium">Loading contact & medical details…</p>
                <p className="text-muted-foreground">
                  We fetch custom data the first time you open a profile. You can navigate away while this finishes.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-destructive">Couldn’t load full details</p>
                <p className="text-muted-foreground">{customError ?? "Unknown error"}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => {
                    setCustomStatus("loading");
                    setCustomError(null);
                    loadMemberCustomData(member.id).catch((error) => {
                      setCustomStatus("error");
                      setCustomError(error instanceof Error ? error.message : "Failed to load custom data.");
                    });
                  }}
                >
                  Retry
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {hasIssues ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              Data quality issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.type}
                className={cn(
                  "rounded-md border p-3 text-sm",
                  issue.severity === "critical" && "border-destructive/50 bg-destructive/10 text-destructive",
                  issue.severity === "medium" && "border-amber-400/60 bg-amber-50 text-amber-900",
                  issue.severity === "low" && "border-blue-300 bg-blue-50 text-blue-900"
                )}
              >
                <p className="font-medium">{issue.description}</p>
                {issue.missingFields?.length ? (
                  <p className="text-xs mt-1 opacity-80">Missing: {issue.missingFields.join(", ")}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">No outstanding issues</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This member has complete contact, medical, and consent information.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContactCard title="Member contact" contact={member.memberContact} />
        <ContactCard title="Primary contact 1" contact={member.primaryContact1} />
        <ContactCard title="Primary contact 2" contact={member.primaryContact2} />
        <ContactCard title="Emergency contact" contact={member.emergencyContact} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" aria-hidden />
              Medical summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Doctor">{member.doctorName || "—"}</DetailRow>
            <DetailRow label="Doctor phone">{member.doctorPhone || "—"}</DetailRow>
            <DetailRow label="Doctor address">{member.doctorAddress || "—"}</DetailRow>
            <DetailRow label="Medical notes">{member.medicalNotes || "—"}</DetailRow>
            <DetailRow label="Dietary notes">{member.dietaryNotes || "—"}</DetailRow>
            <DetailRow label="Allergies">{member.allergyNotes || "—"}</DetailRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ConsentPill label="Photo consent" enabled={member.consents?.photoConsent ?? false} />
            <ConsentPill label="Medical consent" enabled={member.consents?.medicalConsent ?? false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatAge(dob: string | null | undefined) {
  if (!dob) return "—";
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  if (now.getDate() < birthDate.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years}y ${months}m`;
}

function ContactCard({ title, contact }: { title: string; contact: NormalizedContact | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {contact ? (
          <>
            <DetailRow label="Name">
              {contact.firstName} {contact.lastName}
            </DetailRow>
            <DetailRow label="Address">
              {[contact.address1, contact.address2, contact.address3, contact.address4, contact.postcode]
                .filter(Boolean)
                .join(", ") || "—"}
            </DetailRow>
            <DetailRow label="Phone">
              <ContactLine icon={Phone} value={contact.phone1} fallback="—" />
            </DetailRow>
            <DetailRow label="Alt phone">
              <ContactLine icon={Phone} value={contact.phone2} fallback="—" />
            </DetailRow>
            <DetailRow label="Email">
              <ContactLine icon={Mail} value={contact.email1} fallback="—" />
            </DetailRow>
            <DetailRow label="Alt email">
              <ContactLine icon={Mail} value={contact.email2} fallback="—" />
            </DetailRow>
            {contact.relationship ? <DetailRow label="Relationship">{contact.relationship}</DetailRow> : null}
          </>
        ) : (
          <p className="text-muted-foreground">No contact recorded.</p>
        )}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}

function ContactLine({
  icon: Icon,
  value,
  fallback,
}: {
  icon: typeof Phone | typeof Mail | typeof MapPin;
  value?: string | null;
  fallback?: string;
}) {
  if (!value) return fallback || "—";
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {value}
    </span>
  );
}

function ConsentPill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2",
        enabled ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-muted bg-muted/60 text-muted-foreground"
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs uppercase tracking-wide">{enabled ? "Granted" : "Missing"}</span>
    </div>
  );
}
