import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageLayout } from '@/components/layout/PageLayout';

describe('PageLayout', () => {
    it('renders slots', () => {
        const html = renderToStaticMarkup(
            <PageLayout
                title="Books"
                subtitle="subtitle"
                actions={<button type="button">new</button>}
                filters={<div>filters</div>}
            >
                <div>content</div>
            </PageLayout>,
        );
        expect(html).toMatchSnapshot();
    });
});
