import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  labels: {
    previous: string;
    next: string;
    page: string;
    of: string;
  };
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  isLoading = false,
  onPageChange,
  labels,
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const canGoPrevious = !isLoading && page > 1;
  const canGoNext = !isLoading && page < safeTotalPages;

  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {labels.page} {page} {labels.of} {safeTotalPages}
        {typeof totalItems === "number" ? ` (${totalItems})` : ""}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
        >
          {labels.previous}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
        >
          {labels.next}
        </Button>
      </div>
    </div>
  );
}
