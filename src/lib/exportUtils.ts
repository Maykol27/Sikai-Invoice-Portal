import * as XLSX from 'xlsx';

export type ExportType = 'csv' | 'xlsx' | 'json' | 'txt';

export const triggerSmartExport = (
    file: File,
    dataList: any[], // Array of scan objects or result objects
    onComplete?: () => void
) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wbTemplate = XLSX.read(bstr, { type: 'binary' });
        const wsName = wbTemplate.SheetNames[0];
        const wsTemplate = wbTemplate.Sheets[wsName];

        // 1. Get Template Headers (Row 1)
        const headers: string[] = [];
        const range = XLSX.utils.decode_range(wsTemplate['!ref'] || 'A1:A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = wsTemplate[XLSX.utils.encode_cell({ r: 0, c: C })];
            headers.push(cell ? cell.v : '');
        }

        // 2. Map Data Use Heuristics
        const mappedData: any[] = [];

        const getValue = (item: any, scanResult: any, header: string): any => {
            const h = header.toLowerCase();

            // Priority 1: Direct Item Match
            if (h.includes('descrip') || h.includes('nombre') || h.includes('producto')) return item.description || '';
            if (h.includes('cantidad') || h.includes('cant')) return item.quantity || 0;
            if ((h.includes('precio') || h.includes('unitario')) && !h.includes('total')) return item.unit_price || 0;
            if (h.includes('medida') || h.includes('unidad')) return item.unit_measure || 'Und';
            if (h.includes('impuesto') || h.includes('iva')) return item.tax_amount || 0;

            // Priority 2: Calculated Item Match
            if (h.includes('subtotal')) return (item.unit_price || 0) * (item.quantity || 0);
            if (h.includes('total')) return item.total || 0;

            // Priority 3: Invoice Level
            if (h.includes('proveedor')) return scanResult.provider_name || '';
            if (h.includes('nit')) return scanResult.nit || '';
            if (h.includes('fecha')) return scanResult.date || new Date().toLocaleDateString();
            if (h.includes('factura') || h.includes('doc')) return scanResult.invoice_number || '';

            // Priority 4: Constants / Defaults
            if (h.includes('estampilla')) return 0;
            if (h.includes('impoconsumo')) return 0;

            return '';
        };

        dataList.forEach(data => {
            // Support both direct result objects or wrapped scan objects
            const result = data.result || data;
            const isItemTemplate = headers.some(h => h.toLowerCase().includes('cantidad') || h.toLowerCase().includes('descrip'));

            if (isItemTemplate) {
                const items = result.items || [];
                if (items.length > 0) {
                    items.forEach((item: any) => {
                        const row: any = {};
                        headers.forEach(header => {
                            row[header] = getValue(item, result, header);
                        });
                        mappedData.push(row);
                    });
                } else {
                    const row: any = {};
                    headers.forEach(header => {
                        row[header] = getValue({}, result, header);
                    });
                    mappedData.push(row);
                }
            } else {
                const row: any = {};
                headers.forEach(header => {
                    row[header] = getValue({}, result, header);
                });
                mappedData.push(row);
            }
        });

        // 3. Generate New Excel
        const wsNew = XLSX.utils.json_to_sheet(mappedData, { header: headers });
        const wbNew = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wbNew, wsNew, "Exportación SIKAI");
        XLSX.writeFile(wbNew, `sikai_smart_export_${new Date().getTime()}.xlsx`);

        if (onComplete) onComplete();
    };
    reader.readAsBinaryString(file);
};

export const triggerStandardExport = (
    dataList: any[],
    type: ExportType,
    fileNamePrefix: string = 'sikai_export'
) => {
    // Determine if we need to flatten items (for Table export) or just Summary
    // For "Content" export, we usually want one row per ITEM if possible, or a rich structure.
    // For CSV/XLSX standard, let's do a "Flatted" version where invoice data repeats for each item.

    const flatRows: any[] = [];

    dataList.forEach(data => {
        const result = data.result || data;
        const baseInfo = {
            Fecha: result.date || new Date(data.created_at || new Date()).toLocaleDateString(),
            Proveedor: result.provider_name || 'Desconocido',
            NIT: result.nit || '',
            Factura: result.invoice_number || '',
            Total: result.total_amount || 0,
            IVA: result.total_iva || 0,
            Subtotal: result.subtotal || 0,
        };

        if (result.items && result.items.length > 0) {
            result.items.forEach((item: any) => {
                flatRows.push({
                    ...baseInfo,
                    Codigo: item.code || '',
                    Producto: item.description || '',
                    Cantidad: item.quantity || 0,
                    PrecioUnit: item.unit_price || 0,
                    TotalLinea: item.total || 0
                });
            });
        } else {
            flatRows.push(baseInfo);
        }
    });

    const fileName = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}`;

    if (type === 'json') {
        const blob = new Blob([JSON.stringify(dataList, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.json`;
        a.click();
    } else if (type === 'txt') {
        const textContent = flatRows.map(r =>
            Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(' | ')
        ).join('\n');
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.txt`;
        a.click();
    } else {
        const ws = XLSX.utils.json_to_sheet(flatRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos");

        if (type === 'csv') {
            XLSX.writeFile(wb, `${fileName}.csv`);
        } else {
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        }
    }
};
