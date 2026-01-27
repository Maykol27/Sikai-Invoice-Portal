import * as XLSX from 'xlsx';

export type ExportType = 'csv' | 'xlsx' | 'json' | 'txt';

export const triggerSmartExport = (
    file: File,
    dataList: any[], // Array of scan objects or result objects
    onComplete?: () => void,
    customTaxValue?: number
) => {
    console.log('[ExportUtils] Starting smart export:', {
        fileName: file.name,
        fileSize: file.size,
        dataCount: dataList.length,
        customTax: customTaxValue
    });

    try {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                console.log('[ExportUtils] Template file loaded successfully');
                const bstr = evt.target?.result;
                const wbTemplate = XLSX.read(bstr, { type: 'binary' });
                const wsName = wbTemplate.SheetNames[0];
                const wsTemplate = wbTemplate.Sheets[wsName];
                console.log('[ExportUtils] Template sheet loaded:', wsName);

                // 1. Get Template Headers (Row 1 - index 0) and Formulae (Row 2 - index 1)
                const headerRowIndex = 0;
                const templateRowIndex = 1; // Assuming Row 2 contains the "template" logic/formulas

                const headers: { col: number, text: string, type: 'value' | 'formula', formula?: string }[] = [];

                // Find range
                const range = XLSX.utils.decode_range(wsTemplate['!ref'] || 'A1:A1');

                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const headerCellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
                    const headerCell = wsTemplate[headerCellRef];
                    const headerText = headerCell ? String(headerCell.v) : '';

                    // Check formula in template row
                    const tplCellRef = XLSX.utils.encode_cell({ r: templateRowIndex, c: C });
                    const tplCell = wsTemplate[tplCellRef];

                    if (tplCell && tplCell.f) {
                        headers.push({ col: C, text: headerText, type: 'formula', formula: tplCell.f });
                    } else {
                        headers.push({ col: C, text: headerText, type: 'value' });
                    }
                }
                console.log('[ExportUtils] Template headers parsed:', headers.length);

                // 2. Map Data Helper
                const getValue = (item: any, scanResult: any, header: string): any => {
                    const h = header.toLowerCase();

                    // Priority 0: Custom Tax Override
                    if (customTaxValue !== undefined && (h.includes('impuesto') || h.includes('iva'))) {
                        return customTaxValue;
                    }

                    // Priority 1: Direct Item Match
                    if (h.includes('descrip') || h.includes('nombre') || h.includes('producto')) return item.description || '';
                    if (h.includes('cantidad') || h.includes('cant')) return item.quantity || 0;
                    if ((h.includes('precio') || h.includes('unitario')) && !h.includes('total')) return item.unit_price || 0;
                    if (h.includes('medida') || h.includes('unidad')) return item.unit_measure || 'Und';
                    // Note: Tax check below only falls through if customTaxValue was NOT provided
                    if (h.includes('impuesto') || h.includes('iva')) return item.tax_amount || 0;

                    // Priority 2: Calculated Item Match (Only if NOT formula column - handled by main loop)
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

                    // Priority 5: Safety for likely numeric fields used in formulas
                    // If we haven't found a match yet, but the header sounds numeric, return 0 instead of ""
                    const numericKeywords = ['descuento', 'rete', 'valor', 'saldo', 'abono', 'ajuste', 'copago', 'base', 'anticipo'];
                    if (numericKeywords.some(key => h.includes(key))) return 0;

                    return '';
                };

                // 3. Write Data
                // We start writing at Row 2 (index 1), effectively overwriting the template row and expanding
                let currentRow = 1;

                dataList.forEach(data => {
                    const result = data.result || data;
                    const items = result.items || [];
                    const rowsToWrite = items.length > 0 ? items : [{}];

                    rowsToWrite.forEach((item: any) => {
                        headers.forEach(hObj => {
                            const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: hObj.col });

                            if (hObj.type === 'formula' && hObj.formula) {
                                // Shift Formula
                                // Simple regex to shift row numbers by offset
                                const offset = currentRow - templateRowIndex;
                                const newFormula = hObj.formula.replace(/([A-Z]+)(\d+)/g, (_match, col, row) => {
                                    // If row matches the template row index (+1 for 1-based), shift it
                                    // Or just shift ALL row refs assuming relative? 
                                    // Let's assume standard relative rows.
                                    const rNum = parseInt(row);
                                    return `${col}${rNum + offset}`;
                                });

                                wsTemplate[cellRef] = { t: 'n', f: newFormula };
                            } else {
                                // Value
                                const val = getValue(item, result, hObj.text);
                                if (val !== undefined && val !== '') {
                                    wsTemplate[cellRef] = {
                                        v: val,
                                        t: typeof val === 'number' ? 'n' : 's'
                                    };
                                } else {
                                    // Ensure cell is cleared if it had content
                                    wsTemplate[cellRef] = { v: '', t: 's' };
                                }
                            }
                        });
                        currentRow++;
                    });
                });
                console.log('[ExportUtils] Data mapped to template, total rows:', currentRow);

                // Update Range
                const newRange = {
                    s: range.s,
                    e: { c: range.e.c, r: currentRow - 1 }
                };
                wsTemplate['!ref'] = XLSX.utils.encode_range(newRange);

                // 4. Download
                // We output the SAME workbook structure, just modified sheet
                const wbOut = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wbOut, wsTemplate, wsName);

                const fileName = `sikai_smart_export_${new Date().getTime()}.xlsx`;
                XLSX.writeFile(wbOut, fileName);
                console.log('[ExportUtils] Excel file generated:', fileName);

                if (onComplete) {
                    console.log('[ExportUtils] Smart export completed successfully');
                    onComplete();
                }
            } catch (error) {
                console.error('[ExportUtils] Error during smart export processing:', error, { fileName: file.name });
                alert(`Error al procesar el template: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
        };

        reader.onerror = (error) => {
            console.error('[ExportUtils] Error reading template file:', error);
            alert('Error al leer el archivo template. Verifica que sea un archivo Excel válido.');
        };

        reader.readAsBinaryString(file);
    } catch (error) {
        console.error('[ExportUtils] Error initializing smart export:', error);
        alert(`Error al iniciar exportación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
};

export const triggerStandardExport = (
    dataList: any[],
    type: ExportType,
    fileNamePrefix: string = 'sikai_export'
) => {
    console.log('[ExportUtils] Starting standard export:', { type, dataCount: dataList.length, prefix: fileNamePrefix });

    try {
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
        console.log('[ExportUtils] Data flattened to rows:', flatRows.length);

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
            console.log('[ExportUtils] Excel/CSV export completed:', fileName);
        }
    } catch (error) {
        console.error('[ExportUtils] Error during standard export:', error, { type, dataCount: dataList.length });
        alert(`Error al exportar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
};
