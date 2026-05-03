import { env } from '../env.js';
import { AppError } from '../lib/errors.js';

// Returns the dev/seed password. Refuses to run in production. Call at use-site rather
// than reading at module load so tests that don't touch dev-auth need not set the var.
export function getDevSeedPassword(): string {
    if (env.NODE_ENV === 'production') {
        throw new AppError('errors.config.devSeedInProd', 500, 'dev seed password is not available in production');
    }
    if (!env.DEV_SEED_PASSWORD) {
        throw new AppError('errors.config.missingDevSeedPassword', 500, 'DEV_SEED_PASSWORD env var is required for dev seed/auth');
    }
    return env.DEV_SEED_PASSWORD;
}
