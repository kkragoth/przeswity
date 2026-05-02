export interface Match {
    from: number;
    to: number;
}

export interface FRState {
    query: string;
    caseSensitive: boolean;
    matches: Match[];
    current: number;
}

export const DEFAULT_FR_STATE: FRState = {
    query: '',
    caseSensitive: false,
    matches: [],
    current: 0,
};
