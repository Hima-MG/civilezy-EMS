"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Clock, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LeadStatusBadge } from "./lead-status-badge";
import { addNoteAction } from "@/actions/cre/notes";
import { updateLeadStatusAction } from "@/actions/cre/leads";
import type { Lead, LeadNote, LeadStatus } from "@/types";

const noteSchema = z.object({
  note: z.string().min(1, "Note is required").max(2000, "Note too long"),
});

type NoteFormValues = z.infer<typeof noteSchema>;

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "follow_up", label: "Follow-up" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface LeadNotesDialogProps {
  lead: Lead;
  initialNotes: LeadNote[];
  children: React.ReactNode;
}

export function LeadNotesDialog({
  lead,
  initialNotes,
  children,
}: LeadNotesDialogProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(lead.status);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { note: "" },
  });

  const onSubmitNote = form.handleSubmit(async (values) => {
    setSubmitting(true);
    const result = await addNoteAction({ lead_id: lead.id, note: values.note });
    setSubmitting(false);

    if (result.success) {
      toast.success("Note added.");
      form.reset();
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  });

  async function handleStatusChange(newStatus: LeadStatus) {
    if (newStatus === currentStatus) return;
    setUpdatingStatus(true);
    const result = await updateLeadStatusAction(lead.id, newStatus);
    setUpdatingStatus(false);

    if (result.success) {
      setCurrentStatus(newStatus);
      toast.success(`Status updated to ${newStatus.replace("_", " ")}.`);
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-base">{lead.name}</DialogTitle>
        </DialogHeader>

        {/* Lead meta strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground -mt-1">
          <span>{lead.phone}</span>
          {lead.email && <span>{lead.email}</span>}
          {lead.course_interest && <span>{lead.course_interest}</span>}
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground shrink-0">Status:</span>
          <Select
            value={currentStatus}
            onValueChange={(v) => handleStatusChange(v as LeadStatus)}
            disabled={updatingStatus}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              {updatingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LeadStatusBadge status={currentStatus} />
              )}
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Notes timeline */}
        <div className="flex-1 min-h-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Note History ({initialNotes.length})
          </p>
          <ScrollArea className="h-52 pr-2">
            {initialNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                <StickyNote className="w-6 h-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  No notes yet. Add the first note below.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {initialNotes.map((n) => (
                  <div key={n.id} className="flex gap-2.5">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                      {getInitials(lead.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {fmtDateTime(n.created_at)}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {n.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator />

        {/* Add note form */}
        <form onSubmit={onSubmitNote} className="space-y-2">
          <Label className="text-xs font-semibold">Add Follow-up Note</Label>
          <Textarea
            placeholder="Write your follow-up note here…"
            rows={3}
            {...form.register("note")}
          />
          {form.formState.errors.note && (
            <p className="text-xs text-destructive">
              {form.formState.errors.note.message}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? "Saving…" : "Add Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
