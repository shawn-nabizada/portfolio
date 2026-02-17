"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BulkActionOption {
  value: string;
  label: string;
}

interface BulkActionToolbarProps {
  allSelected: boolean;
  pageCount: number;
  selectedCount: number;
  actionValue: string;
  actions: BulkActionOption[];
  applyDisabled?: boolean;
  labels: {
    selectAll: string;
    selected: string;
    actionPlaceholder: string;
    apply: string;
  };
  onToggleAll: (checked: boolean) => void;
  onActionChange: (value: string) => void;
  onApply: () => void;
}

export function BulkActionToolbar({
  allSelected,
  pageCount,
  selectedCount,
  actionValue,
  actions,
  applyDisabled = false,
  labels,
  onToggleAll,
  onActionChange,
  onApply,
}: BulkActionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected && pageCount > 0}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
        />
        <span className="text-sm text-muted-foreground">{labels.selectAll}</span>
      </div>

      <span className="text-sm text-muted-foreground">
        {labels.selected}: {selectedCount}
      </span>

      <Select value={actionValue} onValueChange={onActionChange}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder={labels.actionPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {actions.map((action) => (
            <SelectItem key={action.value} value={action.value}>
              {action.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        onClick={onApply}
        disabled={applyDisabled || selectedCount === 0 || !actionValue}
      >
        {labels.apply}
      </Button>
    </div>
  );
}
