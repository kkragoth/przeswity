import { Check, Moon, Sun, SunDim, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Theme, useTheme } from '@/contexts/ThemeContext';

const THEME_OPTIONS: readonly Theme[] = [Theme.Light, Theme.PaperWhite, Theme.Dark];

const ICON_BY_THEME: Record<Theme, LucideIcon> = {
    [Theme.Light]: Sun,
    [Theme.PaperWhite]: SunDim,
    [Theme.Dark]: Moon,
};

const LABEL_KEY_BY_THEME = {
    [Theme.Light]: 'theme.light',
    [Theme.PaperWhite]: 'theme.paperWhite',
    [Theme.Dark]: 'theme.dark',
} as const;

export function ThemeToggle() {
    const { t } = useTranslation('common');
    const { theme, setTheme } = useTheme();
    const CurrentIcon = ICON_BY_THEME[theme];
    const currentLabel = t(LABEL_KEY_BY_THEME[theme]) as string;
    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button
                    type="button"
                    className="topbar-theme-toggle"
                    aria-label={t('theme.toggle', { current: currentLabel }) as string}
                    title={currentLabel}
                >
                    <CurrentIcon size={16} aria-hidden="true" />
                </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content align="end" sideOffset={6} className="topbar-dropdown-content">
                    <div className="topbar-dropdown-label">{t('theme.label') as string}</div>
                    {THEME_OPTIONS.map((option) => {
                        const Icon = ICON_BY_THEME[option];
                        const label = t(LABEL_KEY_BY_THEME[option]) as string;
                        const isActive = option === theme;
                        return (
                            <DropdownMenuPrimitive.Item
                                key={option}
                                className="topbar-dropdown-item"
                                onSelect={() => setTheme(option)}
                            >
                                <Icon size={14} aria-hidden="true" />
                                <span>{label}</span>
                                {isActive && <Check size={14} className="topbar-dropdown-item-check" aria-hidden="true" />}
                            </DropdownMenuPrimitive.Item>
                        );
                    })}
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    );
}
