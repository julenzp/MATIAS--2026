import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DayContentProps } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Map of "YYYY-MM-DD" → record count to display inside each day cell */
  dayCounts?: Record<string, number>;
};

function Calendar({ className, classNames, showOutsideDays = true, dayCounts, ...props }: CalendarProps) {
  // Build modifiers for days with data
  const daysWithData = React.useMemo(() => {
    if (!dayCounts) return [];
    return Object.keys(dayCounts)
      .filter((k) => dayCounts[k] > 0)
      .map((k) => new Date(k + "T12:00:00"));
  }, [dayCounts]);

  const hasCounts = dayCounts && Object.keys(dayCounts).length > 0;

  // Cell & day sizes: enlarge when counts are present
  const cellSize = hasCounts ? "h-14 w-14" : "h-9 w-9";
  const headCellSize = hasCounts ? "w-14" : "w-9";

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      modifiers={{ hasData: daysWithData }}
      modifiersStyles={{
        hasData: { backgroundColor: "hsl(142 63% 92%)", borderRadius: "0.5rem" },
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: cn("text-muted-foreground rounded-md font-normal text-[0.8rem]", headCellSize),
        row: "flex w-full mt-1",
        cell: cn("text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20", cellSize),
        day: cn(buttonVariants({ variant: "ghost" }), "p-0 font-normal aria-selected:opacity-100", cellSize),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        ...(hasCounts
          ? {
              DayContent: ({ date, activeModifiers }: DayContentProps) => {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                const count = dayCounts?.[key];
                const isOutside = activeModifiers?.outside;
                return (
                  <div className="flex flex-col items-center justify-center leading-none gap-0.5">
                    <span className={cn("text-sm font-semibold", isOutside && "opacity-50")}>{date.getDate()}</span>
                    {count && count > 0 && !isOutside ? (
                      <span className="text-[10px] font-bold text-secondary">{count}</span>
                    ) : null}
                  </div>
                );
              },
            }
          : {}),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
