import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

const STORAGE_KEY = 'editor.zoom';

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1.0;

const isFiniteZoom = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

const clampZoom = (value: number): number => {
    if (value < ZOOM_MIN) return ZOOM_MIN;
    if (value > ZOOM_MAX) return ZOOM_MAX;
    return value;
};

const roundZoomStep = (value: number): number => Math.round(value * 100) / 100;

const readStoredZoom = (): number => {
    if (typeof window === 'undefined') return ZOOM_DEFAULT;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === null) return ZOOM_DEFAULT;
        const parsed = Number.parseFloat(raw);
        if (!isFiniteZoom(parsed)) return ZOOM_DEFAULT;
        return clampZoom(parsed);
    } catch {
        return ZOOM_DEFAULT;
    }
};

interface EditorZoomContextValue {
    zoom: number;
    setZoom: (zoom: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    canZoomIn: boolean;
    canZoomOut: boolean;
}

const EditorZoomContext = createContext<EditorZoomContextValue | null>(null);

interface EditorZoomProviderProps {
    children: ReactNode;
    className?: string;
}

export function EditorZoomProvider({ children, className }: EditorZoomProviderProps) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [zoom, setZoomState] = useState<number>(readStoredZoom);

    useEffect(() => {
        const host = hostRef.current;
        if (host) host.style.setProperty('--editor-zoom', String(zoom));
        try {
            window.localStorage.setItem(STORAGE_KEY, String(zoom));
        } catch {
            /* localStorage unavailable */
        }
    }, [zoom]);

    const setZoom = useCallback((value: number) => {
        if (!isFiniteZoom(value)) return;
        setZoomState(roundZoomStep(clampZoom(value)));
    }, []);

    const zoomIn = useCallback(() => {
        setZoomState((current) => roundZoomStep(clampZoom(current + ZOOM_STEP)));
    }, []);

    const zoomOut = useCallback(() => {
        setZoomState((current) => roundZoomStep(clampZoom(current - ZOOM_STEP)));
    }, []);

    const resetZoom = useCallback(() => setZoomState(ZOOM_DEFAULT), []);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                setZoomState((current) => roundZoomStep(clampZoom(current + ZOOM_STEP)));
            } else if (e.key === '-') {
                e.preventDefault();
                setZoomState((current) => roundZoomStep(clampZoom(current - ZOOM_STEP)));
            } else if (e.key === '0') {
                e.preventDefault();
                setZoomState(ZOOM_DEFAULT);
            }
        };
        host.addEventListener('keydown', onKeyDown);
        return () => host.removeEventListener('keydown', onKeyDown);
    }, []);

    const value = useMemo<EditorZoomContextValue>(() => ({
        zoom,
        setZoom,
        zoomIn,
        zoomOut,
        resetZoom,
        canZoomIn: zoom < ZOOM_MAX,
        canZoomOut: zoom > ZOOM_MIN,
    }), [zoom, setZoom, zoomIn, zoomOut, resetZoom]);

    const wrapperClassName = className ? `editor-zoom-host ${className}` : 'editor-zoom-host';

    return (
        <EditorZoomContext.Provider value={value}>
            <div ref={hostRef} className={wrapperClassName} style={{ '--editor-zoom': zoom } as React.CSSProperties}>
                {children}
            </div>
        </EditorZoomContext.Provider>
    );
}

export function useEditorZoom(): EditorZoomContextValue {
    const ctx = useContext(EditorZoomContext);
    if (!ctx) throw new Error('useEditorZoom must be used within EditorZoomProvider');
    return ctx;
}

/**
 * Reads the effective zoom factor by comparing an element's transformed bounding rect
 * to its unscaled offset width. Returns 1 if the element is unscaled or width is zero.
 * Safe to call from inside hooks that already have a `.editor-page` reference.
 */
export function readEffectiveZoom(el: HTMLElement): number {
    const layoutWidth = el.offsetWidth;
    if (!layoutWidth) return 1;
    const visualWidth = el.getBoundingClientRect().width;
    const ratio = visualWidth / layoutWidth;
    if (!Number.isFinite(ratio) || ratio <= 0) return 1;
    return ratio;
}
