import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: ReactNode;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    confirmLabel,
    cancelLabel,
    destructive,
    onConfirm,
}: ConfirmDialogProps) {
    const { t } = useTranslation('common');
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel ?? t('actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
                        onClick={() => void onConfirm()}
                    >
                        {confirmLabel ?? t('actions.confirm')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
