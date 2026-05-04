export interface HocuspocusProviderRuntime {
    status?: string;
    isConnected?: boolean;
    synced?: boolean;
    isSynced?: boolean;
    configuration?: {
        websocketProvider?: {
            status?: string;
            shouldConnect?: boolean;
            connect?: () => Promise<unknown> | void;
        };
    };
}
