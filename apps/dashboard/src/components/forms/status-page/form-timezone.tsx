"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Expand } from "@openstatus/icons";
import { Button } from "@openstatus/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@openstatus/ui/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openstatus/ui/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openstatus/ui/components/ui/popover";
import { cn } from "@openstatus/ui/lib/utils";
import {
  isWholeHourTimeZone,
  timeZoneAbbreviation,
  timeZoneOffsetMs,
  wholeHourTimeZones,
} from "@openstatus/utils";
import { isTRPCClientError } from "@trpc/client";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  FormCard,
  FormCardContent,
  FormCardDescription,
  FormCardFooter,
  FormCardFooterInfo,
  FormCardHeader,
  FormCardSeparator,
  FormCardTitle,
} from "@/components/forms/form-card";

const schema = z.object({
  defaultTimezone: z.string().refine(isWholeHourTimeZone, {
    message: "Only time zones with a whole-hour offset are supported for now",
  }),
});

type FormValues = z.infer<typeof schema>;

// "Asia/Tokyo (JST)" / "Europe/Berlin (GMT+1)" — the same label the public
// page will show next to its timestamps, so what you pick is what readers see.
function zoneLabel(timeZone: string) {
  if (timeZone === "UTC") return "UTC";
  const abbreviation = timeZoneAbbreviation(timeZone);
  const hours = timeZoneOffsetMs(new Date(), timeZone) / 3_600_000;
  const offset = `GMT${hours >= 0 ? "+" : "-"}${Math.abs(hours)}`;
  return `${timeZone} (${abbreviation ?? offset})`;
}

export function FormTimezone({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const zones = useMemo(() => wholeHourTimeZones(), []);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { defaultTimezone: "UTC" },
  });

  function submitAction(values: FormValues) {
    if (isPending) return;

    startTransition(async () => {
      try {
        const promise = onSubmit(values);
        toast.promise(promise, {
          loading: "Saving...",
          success: "Saved",
          error: (error) => {
            if (isTRPCClientError(error)) {
              return error.message;
            }
            return "Failed to save";
          },
        });
        await promise;
      } catch (error) {
        console.error(error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitAction)}>
        <FormCard>
          <FormCardHeader>
            <FormCardTitle>Time zone</FormCardTitle>
            <FormCardDescription>
              The clock your status page, its emails and its daily bars are
              shown in. Every visitor sees the same time.
            </FormCardDescription>
          </FormCardHeader>
          <FormCardSeparator />
          <FormCardContent>
            <FormField
              control={form.control}
              name="defaultTimezone"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Time zone</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between font-normal"
                        >
                          {zoneLabel(field.value)}
                          <Expand className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search time zones…"
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No time zone found.</CommandEmpty>
                          <CommandGroup>
                            {zones.map((zone) => (
                              <CommandItem
                                key={zone}
                                value={zone}
                                onSelect={() => {
                                  field.onChange(zone);
                                  setOpen(false);
                                }}
                              >
                                {zoneLabel(zone)}
                                <Check
                                  className={cn(
                                    "ml-auto size-4",
                                    zone === field.value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    UTC unless your readers are mostly in one place. Zones with
                    a half-hour offset are not available yet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormCardContent>
          <FormCardFooter>
            <FormCardFooterInfo>
              Checks are stored in UTC; only the way days and times are shown
              changes.
            </FormCardFooterInfo>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit"}
            </Button>
          </FormCardFooter>
        </FormCard>
      </form>
    </Form>
  );
}
