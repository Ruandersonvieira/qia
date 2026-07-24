"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

type Option = { value: string; label: React.ReactNode };

type SelectFieldProps = {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  options: Option[];
  onValueChange?: (value: string | null) => void;
  className?: string;
};

export function SelectField({ name, id, defaultValue, placeholder, options, onValueChange, className }: SelectFieldProps) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select name={name} defaultValue={defaultValue} items={items} onValueChange={onValueChange}>
      <SelectTrigger id={id ?? name} className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
