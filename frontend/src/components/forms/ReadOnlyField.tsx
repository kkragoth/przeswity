import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReadOnlyFieldProps {
    label: string;
    value: string;
    help?: string;
}

export function ReadOnlyField({ label, value, help }: ReadOnlyFieldProps) {
    return (
        <div>
            <Label>{label}</Label>
            <Input value={value} disabled />
            {help ? <p className="mt-1 text-xs text-muted-foreground">{help}</p> : null}
        </div>
    );
}
