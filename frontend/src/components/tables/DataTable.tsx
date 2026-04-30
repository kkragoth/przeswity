import type { ReactNode } from 'react';

interface DataTableColumn<T> {
    key: string;
    header: ReactNode;
    cell: (row: T) => ReactNode;
    width?: string;
}

interface DataTableProps<T> {
    columns: Array<DataTableColumn<T>>;
    rows: T[];
    getRowKey: (row: T) => string;
    empty?: ReactNode;
}

export function DataTable<T>({ columns, rows, getRowKey, empty }: DataTableProps<T>) {
    return (
        <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
                <tr>
                    {columns.map((column) => (
                        <th key={column.key} className="py-2 font-medium" style={column.width ? { width: column.width } : undefined}>
                            {column.header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td colSpan={columns.length} className="py-6 text-sm text-muted-foreground">
                            {empty ?? null}
                        </td>
                    </tr>
                ) : (
                    rows.map((row) => (
                        <tr key={getRowKey(row)} className="border-b">
                            {columns.map((column) => (
                                <td key={column.key} className="py-2">
                                    {column.cell(row)}
                                </td>
                            ))}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
}
