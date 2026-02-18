import * as XLSX from 'xlsx';

export type ExportType = 'csv' | 'xlsx' | 'json' | 'txt' | 'xml';

// --- Smart Export: Header label → data field mapping ---
const HEADER_FIELD_MAP: Record<string, string> = {
    // Spanish labels (common in Colombian invoices)
    'fecha': 'date',
    'fecha emision': 'date',
    'fecha emisión': 'date',
    'fecha factura': 'date',
    'vencimiento': 'due_date',
    'fecha vencimiento': 'due_date',
    'proveedor': 'provider_name',
    'nombre proveedor': 'provider_name',
    'razon social': 'provider_name',
    'razón social': 'provider_name',
    'nit': 'nit',
    'nit proveedor': 'nit',
    'factura': 'invoice_number',
    'numero factura': 'invoice_number',
    'número factura': 'invoice_number',
    'no. factura': 'invoice_number',
    'n° factura': 'invoice_number',
    'no factura': 'invoice_number',
    'total': 'total_amount',
    'total operacion': 'total_amount',
    'total operación': 'total_amount',
    'valor total': 'total_amount',
    'iva': 'total_iva',
    'total iva': 'total_iva',
    'monto iva': 'total_iva',
    'subtotal': 'subtotal',
    'sub total': 'subtotal',
    'base': 'subtotal',
    'descuento': 'discount',
    'base grabable': 'subtotal_after_discount',
    'ciudad': 'city',
    'direccion': 'address',
    'dirección': 'address',
    'telefono': 'phone',
    'teléfono': 'phone',
    'cliente': 'client_name',
    'nombre cliente': 'client_name',
    'nit cliente': 'client_nit',
    'hora': 'time',
    'resolucion dian': 'resolution_dian',
    'resolución dian': 'resolution_dian',
    'metodo pago': 'payment_method',
    'método pago': 'payment_method',
    'forma de pago': 'payment_method',
    'vendedor': 'seller',
    'orden compra': 'order_number',
    'remision': 'remission_number',
    'remisión': 'remission_number',
    'valor en letras': 'amount_text',
    // Item-level fields
    'codigo': 'item_code',
    'código': 'item_code',
    'cod': 'item_code',
    'producto': 'item_description',
    'descripcion': 'item_description',
    'descripción': 'item_description',
    'detalle': 'item_description',
    'cantidad': 'item_quantity',
    'cant': 'item_quantity',
    'cant.': 'item_quantity',
    'unidad': 'item_unit_measure',
    'unidad medida': 'item_unit_measure',
    'u. medida': 'item_unit_measure',
    'u.med': 'item_unit_measure',
    'precio unitario': 'item_unit_price',
    'precio unit': 'item_unit_price',
    'precio unit.': 'item_unit_price',
    'vlr unitario': 'item_unit_price',
    'valor unitario': 'item_unit_price',
    'prc unitario': 'item_unit_price',
    'tasa iva': 'item_tax_rate',
    'iva %': 'item_tax_rate',
    '% iva': 'item_tax_rate',
    'tarifa iva': 'item_tax_rate',
    'iva item': 'item_tax_amount',
    'monto iva item': 'item_tax_amount',
    'valor iva': 'item_tax_amount',
    'total linea': 'item_total',
    'total línea': 'item_total',
    'total item': 'item_total',
    'vlr total': 'item_total',
    'items': 'items_summary',
};

/**
 * Normalize a header string for fuzzy matching.
 */
const normalizeHeader = (h: string): string =>
    h.toLowerCase().trim()
        .replace(/[.:_\-#°]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Flatten scan data into rows (one per item, with invoice data repeated).
 * Returns the full flat data for each row including item-level fields.
 */
const flattenDataForExport = (dataList: any[]): Record<string, any>[] => {
    const flatRows: Record<string, any>[] = [];

    dataList.forEach(data => {
        const result = data.result || data;
        const baseInfo: Record<string, any> = {
            date: result.date || new Date(data.created_at || new Date()).toLocaleDateString(),
            due_date: result.due_date || '',
            provider_name: result.provider_name || 'Desconocido',
            nit: result.nit || '',
            invoice_number: result.invoice_number || '',
            total_amount: result.total_amount || 0,
            total_iva: result.total_iva || 0,
            subtotal: result.subtotal || 0,
            discount: result.discount || 0,
            subtotal_after_discount: result.subtotal_after_discount || '',
            city: result.city || '',
            address: result.address || '',
            phone: result.phone || '',
            client_name: result.client_name || '',
            client_nit: result.client_nit || '',
            time: result.time || '',
            resolution_dian: result.resolution_dian || result.dian_resolution_text || '',
            payment_method: result.payment_method || '',
            seller: result.seller || '',
            order_number: result.order_number || '',
            remission_number: result.remission_number || '',
            amount_text: result.amount_text || '',
        };

        // Add raw_data fields as extra columns prefixed
        if (result.raw_data && typeof result.raw_data === 'object') {
            Object.entries(result.raw_data).forEach(([k, v]) => {
                baseInfo[`raw_${k}`] = typeof v === 'object' ? JSON.stringify(v) : String(v);
            });
        }

        if (result.items && result.items.length > 0) {
            result.items.forEach((item: any) => {
                flatRows.push({
                    ...baseInfo,
                    item_code: item.code || '',
                    item_description: item.description || '',
                    item_quantity: item.quantity || 0,
                    item_unit_measure: item.unit_measure || '',
                    item_unit_price: item.unit_price || 0,
                    item_tax_rate: item.tax_rate || '0%',
                    item_tax_amount: item.tax_amount || 0,
                    item_total: item.total || 0,
                    items_summary: `${item.quantity}x ${item.description} ($${item.total})`,
                });
            });
        } else {
            flatRows.push({
                ...baseInfo,
                item_code: '',
                item_description: '',
                item_quantity: 0,
                item_unit_measure: '',
                item_unit_price: 0,
                item_tax_rate: '0%',
                item_tax_amount: 0,
                item_total: 0,
                items_summary: '',
            });
        }
    });

    return flatRows;
};

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

            // 1. Get the first (template) sheet
            const sheetName = workbook.SheetNames[0];
            const templateSheet = workbook.Sheets[sheetName];

            // 2. Detect header row (row 1) and map columns
            const range = XLSX.utils.decode_range(templateSheet['!ref'] || 'A1');
            const headerRow = range.s.r; // Usually 0
            const columnMapping: { col: number; field: string; header: string }[] = [];

            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c });
                const cell = templateSheet[cellAddress];
                if (cell && cell.v) {
                    const headerText = String(cell.v);
                    const normalized = normalizeHeader(headerText);
                    const mappedField = HEADER_FIELD_MAP[normalized];
                    if (mappedField) {
                        columnMapping.push({ col: c, field: mappedField, header: headerText });
                    }
                }
            }

            console.log('[SmartExport] Column mapping detected:', columnMapping);

            // 3. Flatten the data
            const flatRows = flattenDataForExport(dataList);

            // 4. Write data rows starting from row after headers (headerRow + 1)
            const startRow = headerRow + 1;

            flatRows.forEach((row, rowIdx) => {
                columnMapping.forEach(({ col, field }) => {
                    const cellAddress = XLSX.utils.encode_cell({ r: startRow + rowIdx, c: col });
                    const value = row[field];

                    if (value !== undefined && value !== null && value !== '') {
                        // Try to preserve number types for numeric fields
                        if (typeof value === 'number') {
                            templateSheet[cellAddress] = { v: value, t: 'n' };
                        } else {
                            templateSheet[cellAddress] = { v: String(value), t: 's' };
                        }
                    }
                });
            });

            // 5. Update the sheet range to include new rows
            const newEndRow = startRow + flatRows.length - 1;
            const currentEnd = range.e.r;
            if (newEndRow > currentEnd) {
                range.e.r = newEndRow;
                templateSheet['!ref'] = XLSX.utils.encode_range(range);
            }

            // 6. Remove any extra sheets that are not the template (keep only one tab)
            while (workbook.SheetNames.length > 1) {
                const extraName = workbook.SheetNames[workbook.SheetNames.length - 1];
                delete workbook.Sheets[extraName];
                workbook.SheetNames.pop();
            }

            // 7. Export the workbook — single tab with data in the template
            const outputName = file.name.replace(/\.xlsx$/i, '') + '_export.xlsx';
            XLSX.writeFile(workbook, outputName);

            console.log('[SmartExport] Export completed:', {
                rows: flatRows.length,
                columns: columnMapping.length,
                outputName
            });

            if (onComplete) onComplete();

        } catch (error) {
            console.error('[SmartExport] Error:', error);
            alert('Error al procesar la plantilla. Verifica que el archivo sea un .xlsx válido con encabezados en la primera fila.');
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
        const flatRows: any[] = [];

        dataList.forEach(data => {
            const result = data.result || data;
            const baseInfo: Record<string, any> = {
                Fecha: result.date || new Date(data.created_at || new Date()).toLocaleDateString(),
                Proveedor: result.provider_name || 'Desconocido',
                NIT: result.nit || '',
                Factura: result.invoice_number || '',
                Total: result.total_amount || 0,
                IVA: result.total_iva || 0,
                Subtotal: result.subtotal || 0,
                Descuento: result.discount || 0,
                Ciudad: result.city || '',
                Cliente: result.client_name || '',
                NITCliente: result.client_nit || '',
                MetodoPago: result.payment_method || '',
            };

            // Include raw_data as additional columns
            if (result.raw_data && typeof result.raw_data === 'object') {
                Object.entries(result.raw_data).forEach(([k, v]) => {
                    const safeKey = k.replace(/[^a-zA-Z0-9_]/g, '_');
                    baseInfo[`Extra_${safeKey}`] = typeof v === 'object' ? JSON.stringify(v) : String(v);
                });
            }

            if (result.items && result.items.length > 0) {
                result.items.forEach((item: any) => {
                    flatRows.push({
                        ...baseInfo,
                        Codigo: item.code || '',
                        Producto: item.description || '',
                        Cantidad: item.quantity || 0,
                        UnidadMedida: item.unit_measure || '',
                        PrecioUnit: item.unit_price || 0,
                        TasaIVA: item.tax_rate || '0%',
                        MontoIVA: item.tax_amount || 0,
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
                xmlContent += `    <Descuento>${result.discount || 0}</Descuento>\n`;
                xmlContent += `    <Ciudad>${result.city || ''}</Ciudad>\n`;
                xmlContent += `    <Cliente>${(result.client_name || '').replace(/&/g, '&amp;')}</Cliente>\n`;
                xmlContent += `    <MetodoPago>${result.payment_method || ''}</MetodoPago>\n`;

                // Add Items with all fields
                if (result.items && result.items.length > 0) {
                    xmlContent += '    <Items>\n';
                    result.items.forEach((item: any) => {
                        xmlContent += '      <Item>\n';
                        xmlContent += `        <Codigo>${item.code || ''}</Codigo>\n`;
                        xmlContent += `        <Producto>${(item.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Producto>\n`;
                        xmlContent += `        <Cantidad>${item.quantity || 0}</Cantidad>\n`;
                        xmlContent += `        <UnidadMedida>${item.unit_measure || ''}</UnidadMedida>\n`;
                        xmlContent += `        <PrecioUnit>${item.unit_price || 0}</PrecioUnit>\n`;
                        xmlContent += `        <TasaIVA>${item.tax_rate || '0%'}</TasaIVA>\n`;
                        xmlContent += `        <MontoIVA>${item.tax_amount || 0}</MontoIVA>\n`;
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
