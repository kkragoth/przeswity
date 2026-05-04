import { FilterChip } from '@/containers/coordinator/components/FilterChip';

type FilterChipGroupProps<T> = {
    options: ReadonlyArray<{ label: string; value: T }>;
    activeValue: T;
    onChange: (value: T) => void;
};

export function FilterChipGroup<T>({ options, activeValue, onChange }: FilterChipGroupProps<T>) {
    return (
        <>
            {options.map((opt) => (
                <FilterChip
                    key={String(opt.value)}
                    active={opt.value === activeValue}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </FilterChip>
            ))}
        </>
    );
}
