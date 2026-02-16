import * as XLSX from 'xlsx';

export type ExportType = 'csv' | 'xlsx' | 'json' | 'txt' | 'xml';

export const triggerSmartExport = (
    file: File,
    dataList: any[],
    onComplete?: () => void,
    _customTaxValue?: number
) => {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });


            // Convert to JSON to inspect structure (optional, depends on needs)
            // But usually for templates we just want to fill specific cells or add rows.
            // For this implementation, let's assume we are appending rows starting from a specific point
            // OR filling a specific format.
            // Given the 'smart' requirement usually implies maintaining a layout.

            // Simplification: We'll append data to the end or a new sheet if template is complex.
            // BETTER APPROACH for 'plantilla': Load template, populate data, export.

            // NOTE: 'xlsx' library basic version is limited for template editing (styles etc lost).
            // Ideally we use a library like 'exceljs' for templates, but we stick to 'xlsx' as per project.

            const resultData = dataList.map((item: any) => {
                const result = item.result || item;
                // Flat map standard fields
                return {
                    Fecha: result.date || new Date().toLocaleDateString(),
                    Proveedor: result.provider_name || 'Desconocido',
                    NIT: result.nit || '',
                    Factura: result.invoice_number || '',
                    Total: result.total_amount || 0,
                    IVA: result.total_iva || 0,
                    Subtotal: result.subtotal || 0,
                    // Add items summary or first item?
                    // Typically smart export might want detailed items.
                    Items: (result.items || []).map((i: any) => `${i.quantity}x ${i.description} (${i.total})`).join('; ')
                };
            });

            // If we want to restart/overwrite sheet with new data but keep 'styles' (hard with xlsx pro version only)
            // We will just create a new sheet with the data for now to ensure data is out.

            const newSheet = XLSX.utils.json_to_sheet(resultData);
            XLSX.utils.book_append_sheet(workbook, newSheet, "Resultados_Sikai");

            XLSX.writeFile(workbook, `sikai_smart_export.xlsx`);

            if (onComplete) onComplete();

        } catch (error) {
            console.error('Smart export error:', error);
            alert('Error al procesar la plantilla');
        }
    };

    reader.readAsBinaryString(file);
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
        } else if (type === 'xml') {
            let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<Invoices>\n';

            dataList.forEach(data => {
                const result = data.result || data;
                xmlContent += '  <Invoice>\n';

                // Add base info
                xmlContent += `    <Fecha>${result.date || new Date(data.created_at || new Date()).toLocaleDateString()}</Fecha>\n`;
                xmlContent += `    <Proveedor>${(result.provider_name || 'Desconocido').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Proveedor>\n`;
                xmlContent += `    <NIT>${result.nit || ''}</NIT>\n`;
                xmlContent += `    <Factura>${result.invoice_number || ''}</Factura>\n`;
                xmlContent += `    <Total>${result.total_amount || 0}</Total>\n`;
                xmlContent += `    <IVA>${result.total_iva || 0}</IVA>\n`;
                xmlContent += `    <Subtotal>${result.subtotal || 0}</Subtotal>\n`;

                // Add Items
                if (result.items && result.items.length > 0) {
                    xmlContent += '    <Items>\n';
                    result.items.forEach((item: any) => {
                        xmlContent += '      <Item>\n';
                        xmlContent += `        <Codigo>${item.code || ''}</Codigo>\n`;
                        xmlContent += `        <Producto>${(item.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Producto>\n`;
                        xmlContent += `        <Cantidad>${item.quantity || 0}</Cantidad>\n`;
                        xmlContent += `        <PrecioUnit>${item.unit_price || 0}</PrecioUnit>\n`;
                        xmlContent += `        <TotalLinea>${item.total || 0}</TotalLinea>\n`;
                        xmlContent += '      </Item>\n';
                    });
                    xmlContent += '    </Items>\n';
                }

                // Add Raw Data if exists
                if (result.raw_data && Object.keys(result.raw_data).length > 0) {
                    xmlContent += '    <DatosAdicionales>\n';
                    Object.entries(result.raw_data).forEach(([k, v]) => {
                        xmlContent += `      <${k.replace(/[^a-zA-Z0-9]/g, '_')}>${String(v).replace(/&/g, '&amp;')}</${k.replace(/[^a-zA-Z0-9]/g, '_')}>\n`;
                    });
                    xmlContent += '    </DatosAdicionales>\n';
                }

                xmlContent += '  </Invoice>\n';
            });

            xmlContent += '</Invoices>';

            const blob = new Blob([xmlContent], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.xml`;
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
