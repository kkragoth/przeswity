import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable } from '@/components/tables/DataTable';

describe('DataTable', () => {
    it('renders columns and rows', () => {
        const getRowKey = vi.fn((row: { id: string }) => row.id);
        const html = renderToStaticMarkup(
            <DataTable
                columns={[
                    { key: 'name', header: 'Name', cell: (row: { name: string }) => row.name },
                    { key: 'email', header: 'Email', cell: (row: { email: string }) => row.email },
                ]}
                rows={[{ id: 'u1', name: 'Anna', email: 'a@example.com' }]}
                getRowKey={getRowKey}
            />,
        );
        expect(html).toContain('Name');
        expect(html).toContain('a@example.com');
        expect(getRowKey).toHaveBeenCalled();
    });

    it('renders empty content', () => {
        const html = renderToStaticMarkup(
            <DataTable
                columns={[{ key: 'name', header: 'Name', cell: (row: { name: string }) => row.name }]}
                rows={[]}
                getRowKey={(row: { name: string }) => row.name}
                empty={<span>empty</span>}
            />,
        );
        expect(html).toContain('empty');
    });
});
