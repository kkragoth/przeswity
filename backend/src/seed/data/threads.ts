import type { SeedActor, SeedBook, SeedThread, SeedUser } from './types.js';

function actorByEmail(spec: SeedBook, email: string, idByEmail: Map<string, string>, userByEmail: Map<string, SeedUser>): SeedActor {
    const uid = idByEmail.get(email);
    const u = userByEmail.get(email);
    if (!uid || !u) {
        throw new Error(`[seed] missing actor for ${email}`);
    }
    const assignedRole = spec.assignments.find((a) => a.email === email)?.role;
    return { id: uid, name: u.name, role: assignedRole ?? 'editor', color: u.color };
}

export function buildSeedThreads(
    spec: SeedBook,
    idByEmail: Map<string, string>,
    userByEmail: Map<string, SeedUser>,
): SeedThread[] {
    const editorEmail = spec.assignments.find((a) => a.role === 'editor')?.email ?? spec.ownerEmail;
    const proofEmail = spec.assignments.find((a) => a.role === 'proofreader')?.email ?? editorEmail;
    const authorEmail = spec.assignments.find((a) => a.role === 'author')?.email ?? spec.ownerEmail;
    const translatorEmail = spec.assignments.find((a) => a.role === 'translator')?.email ?? editorEmail;
    const coordinatorEmail = spec.ownerEmail;

    const editor = actorByEmail(spec, editorEmail, idByEmail, userByEmail);
    const proof = actorByEmail(spec, proofEmail, idByEmail, userByEmail);
    const author = actorByEmail(spec, authorEmail, idByEmail, userByEmail);
    const translator = actorByEmail(spec, translatorEmail, idByEmail, userByEmail);
    const coordinator = actorByEmail(spec, coordinatorEmail, idByEmail, userByEmail);

    return [
        {
            id: `seed-${spec.slug}-open-style`,
            anchorId: `seed-anchor-${spec.slug}-open-style`,
            author: proof,
            targetRole: 'editor',
            originalQuote: 'Centralny akapit roboczy wymaga decyzji redaktora.',
            body: 'Ten akapit jest dobrym miejscem na decyzję redakcyjną: zostawiamy jako przejście czy skracamy do jednego zdania?',
            minutesAgo: 180,
            status: 'open',
            replies: [
                { author: editor, body: 'Zostawię sens, ale skrócę rytm i usunę powtórzenie.', minutesAgo: 150 },
                { author: author, body: 'Zależy mi na tonie eseistycznym, ale zgadzam się na krótszą wersję.', minutesAgo: 120 },
            ],
        },
        {
            id: `seed-${spec.slug}-open-source`,
            anchorId: `seed-anchor-${spec.slug}-open-source`,
            author: editor,
            targetRole: 'author',
            originalQuote: 'Ten fragment powinien mieć potwierdzone źródło.',
            body: 'Potrzebuję źródła przed zamknięciem redakcji. Bez tego fragment zostaje oznaczony jako ryzyko do składu.',
            minutesAgo: 150,
            status: 'open',
            replies: [
                { author, body: 'Sprawdzę notatki i podeślę pełny opis bibliograficzny.', minutesAgo: 90 },
            ],
        },
        {
            id: `seed-${spec.slug}-open-term`,
            anchorId: `seed-anchor-${spec.slug}-open-term`,
            author: translator,
            targetRole: 'editor',
            originalQuote: 'Termin roboczy pozostaje niespójny w całym rozdziale.',
            body: 'Proszę o decyzję terminologiczną. Po decyzji mogę przejść przez cały tekst i ujednolicić wystąpienia.',
            minutesAgo: 125,
            status: 'open',
            replies: [
                { author: editor, body: 'Wybierzmy wariant prostszy dla czytelnika, a techniczny dopiszmy w glosariuszu.', minutesAgo: 80 },
                { author: proof, body: 'Po decyzji sprawdzę odmianę i podpisy ilustracji.', minutesAgo: 50 },
            ],
        },
        {
            id: `seed-${spec.slug}-open-shortening`,
            anchorId: `seed-anchor-${spec.slug}-open-shortening`,
            author: proof,
            targetRole: 'editor',
            originalQuote: 'To zdanie jest zbyt długie i wymaga skrócenia.',
            body: 'Sugeruję podział na dwa zdania. Obecny zapis utrudnia korektę interpunkcji i rytmu.',
            minutesAgo: 95,
            status: 'open',
            replies: [
                { author: editor, body: 'Zrobię podział po sprawdzeniu, czy nie gubimy puenty akapitu.', minutesAgo: 65 },
            ],
        },
        {
            id: `seed-${spec.slug}-resolved-context`,
            anchorId: `seed-anchor-${spec.slug}-resolved-context`,
            author: coordinator,
            targetRole: 'editor',
            originalQuote: 'W tym miejscu autor dopowiada kontekst dla korekty.',
            body: 'Ustalone: zostawiamy kontekst, ale bez rozbudowywania przypisu w tej wersji.',
            minutesAgo: 300,
            status: 'resolved',
            resolvedBy: coordinator.name,
            resolvedMinutesAgo: 90,
            replies: [
                { author: editor, body: 'Wprowadzone. Korekta może sprawdzić tylko zapis nazw własnych.', minutesAgo: 100 },
            ],
        },
        {
            id: `seed-${spec.slug}-open-coordination`,
            anchorId: `seed-anchor-${spec.slug}-open-coordination`,
            author: coordinator,
            targetRole: 'proofreader',
            originalQuote: 'Po akceptacji wersji końcowej trzeba uruchomić wyszukiwanie i ujednolicić wszystkie wystąpienia.',
            body: 'To zadanie zostaje na koniec etapu. Dajcie znać, czy potrzebujemy dodatkowej rundy po eksporcie DOCX.',
            minutesAgo: 60,
            status: 'open',
            replies: [
                { author: proof, body: 'Wystarczy jedna runda, jeśli glosariusz będzie zamknięty przed korektą.', minutesAgo: 35 },
            ],
        },
    ];
}
