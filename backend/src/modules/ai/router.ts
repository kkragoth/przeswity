import { Router } from 'express';
import { z } from 'zod';
import { requireSession } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { registry } from '../../openapi/registry.js';
import { env } from '../../env.js';

export const aiRouter = Router();

const ProofreadBody = z.object({
    text: z.string().min(1).max(20_000),
}).openapi('AiProofreadBody');

const AiSuggestion = z.object({
    range: z.object({ from: z.number(), to: z.number() }),
    replacement: z.string(),
    reason: z.string(),
}).openapi('AiSuggestion');

const ProofreadResponse = z.object({
    suggestions: z.array(AiSuggestion),
}).openapi('AiProofreadResponse');

registry.registerPath({
    method: 'post', path: '/api/ai/proofread',
    operationId: 'aiProofread',
    request: { body: { content: { 'application/json': { schema: ProofreadBody } } } },
    responses: { 200: { description: 'suggestions', content: { 'application/json': { schema: ProofreadResponse } } } },
});

type Suggestion = z.infer<typeof AiSuggestion>;

// Canned dev-only proofreader. Detects the common Polish typo "ktore" → "które" and,
// if no real issue surfaces, returns one tautological suggestion so the editor wiring
// remains exercisable. Real provider integration replaces this entire branch.
function stubProofread(text: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const lower = text.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf('ktore', idx)) !== -1) {
        suggestions.push({
            range: { from: idx, to: idx + 5 },
            replacement: 'które',
            reason: 'Niepoprawna pisownia — brak znaku diakrytycznego.',
        });
        idx += 5;
    }
    if (suggestions.length === 0 && text.length > 30) {
        suggestions.push({
            range: { from: 0, to: Math.min(10, text.length) },
            replacement: text.slice(0, Math.min(10, text.length)),
            reason: 'AI: brak sugestii — tekst wygląda poprawnie. (Stage 1 stub)',
        });
    }
    return suggestions;
}

aiRouter.post('/api/ai/proofread', requireSession, asyncHandler(async (req, res) => {
    if (env.AI_PROVIDER === 'none') {
        throw new AppError('errors.ai.notImplemented', 501, 'AI provider not configured');
    }
    const body = ProofreadBody.parse(req.body);
    res.json({ suggestions: stubProofread(body.text) });
}));
