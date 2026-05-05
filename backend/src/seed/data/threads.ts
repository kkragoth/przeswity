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

interface ThreadSpec {
    suffix: string;
    quote: string;
    occurrenceIndex: number;
    author: SeedActor;
    targetRole: SeedThread['targetRole'];
    body: string;
    minutesAgo: number;
    status: SeedThread['status'];
    resolvedBy?: string;
    resolvedMinutesAgo?: number;
    replies: SeedThread['replies'];
}

function buildSpecs(actors: {
    editor: SeedActor;
    proof: SeedActor;
    author: SeedActor;
    translator: SeedActor;
    coordinator: SeedActor;
}): ThreadSpec[] {
    const { editor, proof, author, translator, coordinator } = actors;
    return [
        {
            suffix: 'open-style-1',
            quote: 'Centralny akapit roboczy wymaga decyzji redaktora.',
            occurrenceIndex: 0,
            author: proof,
            targetRole: 'editor',
            body: 'Ten akapit jest dobrym miejscem na decyzję redakcyjną: zostawiamy jako przejście czy skracamy do jednego zdania?',
            minutesAgo: 220,
            status: 'open',
            replies: [
                { author: editor, body: 'Zostawię sens, ale skrócę rytm i usunę powtórzenie.', minutesAgo: 190 },
                { author, body: 'Zależy mi na tonie eseistycznym, ale zgadzam się na krótszą wersję.', minutesAgo: 160 },
            ],
        },
        {
            suffix: 'open-style-2',
            quote: 'Centralny akapit roboczy wymaga decyzji redaktora.',
            occurrenceIndex: 2,
            author: editor,
            targetRole: null,
            body: 'Tutaj raczej zostawiłabym oryginalny rytm. To dobry oddech między dwiema technicznymi sekcjami.',
            minutesAgo: 110,
            status: 'open',
            replies: [
                { author: proof, body: 'Zgoda, w tej części akurat działa.', minutesAgo: 80 },
            ],
        },
        {
            suffix: 'resolved-style-3',
            quote: 'Centralny akapit roboczy wymaga decyzji redaktora.',
            occurrenceIndex: 4,
            author: coordinator,
            targetRole: 'editor',
            body: 'Decyzja: skracamy ten do dwóch zdań. Pozostałe zostają.',
            minutesAgo: 360,
            status: 'resolved',
            resolvedBy: coordinator.name,
            resolvedMinutesAgo: 200,
            replies: [
                { author: editor, body: 'Zrobione, sprawdzam ostatnie wystąpienie.', minutesAgo: 220 },
            ],
        },
        {
            suffix: 'open-source-1',
            quote: 'Ten fragment powinien mieć potwierdzone źródło.',
            occurrenceIndex: 0,
            author: editor,
            targetRole: 'author',
            body: 'Potrzebuję źródła przed zamknięciem redakcji. Bez tego fragment zostaje oznaczony jako ryzyko do składu.',
            minutesAgo: 175,
            status: 'open',
            replies: [
                { author, body: 'Sprawdzę notatki i podeślę pełny opis bibliograficzny.', minutesAgo: 110 },
            ],
        },
        {
            suffix: 'open-source-2',
            quote: 'Ten fragment powinien mieć potwierdzone źródło.',
            occurrenceIndex: 2,
            author: proof,
            targetRole: 'author',
            body: 'I tutaj brakuje przypisu — w wersji przed składem wszystkie liczby muszą być potwierdzone.',
            minutesAgo: 95,
            status: 'open',
            replies: [
                { author, body: 'Dorobię. Mam te dane w arkuszu z zeszłego tygodnia.', minutesAgo: 60 },
            ],
        },
        {
            suffix: 'resolved-source-3',
            quote: 'Ten fragment powinien mieć potwierdzone źródło.',
            occurrenceIndex: 3,
            author: editor,
            targetRole: 'author',
            body: 'Tę cytację już mamy w bibliografii roboczej.',
            minutesAgo: 480,
            status: 'resolved',
            resolvedBy: editor.name,
            resolvedMinutesAgo: 240,
            replies: [],
        },
        {
            suffix: 'open-source-4',
            quote: 'Ten fragment powinien mieć potwierdzone źródło.',
            occurrenceIndex: 5,
            author: editor,
            targetRole: 'author',
            body: 'Ostatnia prosta — tu też potrzebuję pełnego adresu bibliograficznego do przypisu.',
            minutesAgo: 30,
            status: 'open',
            replies: [],
        },
        {
            suffix: 'open-term-1',
            quote: 'Termin roboczy pozostaje niespójny w całym rozdziale.',
            occurrenceIndex: 0,
            author: translator,
            targetRole: 'editor',
            body: 'Proszę o decyzję terminologiczną. Po decyzji mogę przejść przez cały tekst i ujednolicić wystąpienia.',
            minutesAgo: 145,
            status: 'open',
            replies: [
                { author: editor, body: 'Wybierzmy wariant prostszy dla czytelnika, a techniczny dopiszmy w glosariuszu.', minutesAgo: 100 },
                { author: proof, body: 'Po decyzji sprawdzę odmianę i podpisy ilustracji.', minutesAgo: 70 },
            ],
        },
        {
            suffix: 'open-term-2',
            quote: 'Termin roboczy pozostaje niespójny w całym rozdziale.',
            occurrenceIndex: 3,
            author: translator,
            targetRole: 'editor',
            body: 'Drugi rozdział używa innej formy. Po decyzji powyżej zrobię globalne search-and-replace.',
            minutesAgo: 75,
            status: 'open',
            replies: [],
        },
        {
            suffix: 'open-shortening-1',
            quote: 'To zdanie jest zbyt długie i wymaga skrócenia.',
            occurrenceIndex: 1,
            author: proof,
            targetRole: 'editor',
            body: 'Sugeruję podział na dwa zdania. Obecny zapis utrudnia korektę interpunkcji i rytmu.',
            minutesAgo: 105,
            status: 'open',
            replies: [
                { author: editor, body: 'Zrobię podział po sprawdzeniu, czy nie gubimy puenty akapitu.', minutesAgo: 75 },
            ],
        },
        {
            suffix: 'open-shortening-2',
            quote: 'To zdanie jest zbyt długie i wymaga skrócenia.',
            occurrenceIndex: 4,
            author: proof,
            targetRole: 'editor',
            body: 'I jeszcze tutaj — wyliczenie po przecinkach męczy oko, zwłaszcza w składzie ścisłym.',
            minutesAgo: 45,
            status: 'open',
            replies: [],
        },
        {
            suffix: 'resolved-context-1',
            quote: 'W tym miejscu autor dopowiada kontekst dla korekty.',
            occurrenceIndex: 0,
            author: coordinator,
            targetRole: 'editor',
            body: 'Ustalone: zostawiamy kontekst, ale bez rozbudowywania przypisu w tej wersji.',
            minutesAgo: 320,
            status: 'resolved',
            resolvedBy: coordinator.name,
            resolvedMinutesAgo: 100,
            replies: [
                { author: editor, body: 'Wprowadzone. Korekta może sprawdzić tylko zapis nazw własnych.', minutesAgo: 120 },
            ],
        },
        {
            suffix: 'open-context-2',
            quote: 'W tym miejscu autor dopowiada kontekst dla korekty.',
            occurrenceIndex: 3,
            author: editor,
            targetRole: 'author',
            body: 'Możesz potwierdzić, że ten kontekst jest jeszcze aktualny? Notatka ma kilka tygodni.',
            minutesAgo: 50,
            status: 'open',
            replies: [],
        },
        {
            suffix: 'open-coordination',
            quote: 'Po akceptacji wersji końcowej trzeba uruchomić wyszukiwanie i ujednolicić wszystkie wystąpienia.',
            occurrenceIndex: 0,
            author: coordinator,
            targetRole: 'proofreader',
            body: 'To zadanie zostaje na koniec etapu. Dajcie znać, czy potrzebujemy dodatkowej rundy po eksporcie DOCX.',
            minutesAgo: 65,
            status: 'open',
            replies: [
                { author: proof, body: 'Wystarczy jedna runda, jeśli glosariusz będzie zamknięty przed korektą.', minutesAgo: 40 },
            ],
        },
    ];
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

    const actors = {
        editor: actorByEmail(spec, editorEmail, idByEmail, userByEmail),
        proof: actorByEmail(spec, proofEmail, idByEmail, userByEmail),
        author: actorByEmail(spec, authorEmail, idByEmail, userByEmail),
        translator: actorByEmail(spec, translatorEmail, idByEmail, userByEmail),
        coordinator: actorByEmail(spec, coordinatorEmail, idByEmail, userByEmail),
    };

    return buildSpecs(actors).map((s) => ({
        id: `seed-${spec.slug}-${s.suffix}`,
        anchorId: `seed-anchor-${spec.slug}-${s.suffix}`,
        author: s.author,
        targetRole: s.targetRole,
        originalQuote: s.quote,
        occurrenceIndex: s.occurrenceIndex,
        body: s.body,
        minutesAgo: s.minutesAgo,
        status: s.status,
        resolvedBy: s.resolvedBy,
        resolvedMinutesAgo: s.resolvedMinutesAgo,
        replies: s.replies,
    }));
}
