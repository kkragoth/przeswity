import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';

export const Route = createFileRoute('/_public')({ component: PublicLayout });

function PublicLayout() {
    return (
        <div className="min-h-dvh bg-background text-foreground">
            <header className="flex justify-end items-center gap-1 px-4 h-12">
                <LanguageSwitcher />
                <ThemeToggle />
            </header>
            <Outlet />
        </div>
    );
}
