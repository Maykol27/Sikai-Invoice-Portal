# SIKAI Invoice Portal - API Documentation

## 📋 Tabla de Contenidos
1. [Descripción General](#descripción-general)
2. [Autenticación](#autenticación)
3. [Edge Functions](#edge-functions)
4. [Códigos de Error](#códigos-de-error)
5. [Límites y Cuotas](#límites-y-cuotas)

---

## Descripción General

SIKAI Invoice Portal expone dos Edge Functions principales mediante Supabase Functions:

| Función | Endpoint | Método | Descripción |
|---------|----------|--------|-------------|
| `scan-invoice` | `/functions/v1/scan-invoice` | POST | Escanea y extrae datos de facturas |
| `adjust-invoice` | `/functions/v1/adjust-invoice` | POST | Ajusta facturas con comandos IA |

**Base URL**: `https://eimpxyqxopfticglxhqt.supabase.co`

**Runtime**: Deno (TypeScript)

---

## Autenticación

Todas las requests requieren autenticación mediante **Supabase Auth JWT**.

### Headers Requeridos

```http
Content-Type: application/json
Authorization: Bearer <ACCESS_TOKEN>
apikey: <SUPABASE_ANON_KEY>
```

### Obtener Access Token

**Desde el Frontend**:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

**Verificación en Edge Function**:
```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');
const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
```

---

## Edge Functions

### 1. `scan-invoice`

**Descripción**: Procesa imágenes o PDFs de facturas y extrae datos estructurados usando Google Gemini AI.

#### Request

**Endpoint**: `POST /functions/v1/scan-invoice`

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:
```json
{
  "file": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "fileName": "factura_001.jpg",
  "mimeType": "image/jpeg"
}
```

**Parámetros**:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | string | ✅ | Archivo en base64 con data URI |
| `fileName` | string | ✅ | Nombre del archivo original |
| `mimeType` | string | ✅ | Tipo MIME (image/*, application/pdf) |

#### Response

**Success (200)**:
```json
{
  "result": {
    "date": "2026-01-27",
    "due_date": "2026-02-27",
    "invoice_number": "FE363690",
    "provider_name": "LISSIA",
    "nit": "79421317-3",
    "address": "Calle 123 #45-67",
    "city": "Bogotá",
    "phone": "601-2345678",
    "total_amount": 45600,
    "iva_amount": 7200,
    "subtotal": 38400,
    "items": [
      {
        "code": "001",
        "description": "Producto X",
        "quantity": 2,
        "unit_price": 10000,
        "tax_rate": "19%",
        "tax_amount": 3800,
        "total": 23800
      }
    ],
    "payment_method": "Efectivo",
    "seller": "Juan Pérez"
  },
  "scanId": "uuid-here",
  "creditsRemaining": 9
}
```

**Error (402 - No Credits)**:
```json
{
  "error": "Insufficient credits",
  "code": "NO_CREDITS"
}
```

**Error (400 - Validation)**:
```json
{
  "error": "Archivo no válido. Solo imágenes y PDFs son soportados."
}
```

**Error (500 - Processing)**:
```json
{
  "error": "Fallo al procesar PDF: Documento muy extenso (15KB de respuesta). Por favor, intente dividir el PDF en archivos más pequeños o contacte soporte."
}
```

#### Límites
- **Max file size**: 10MB
- **Max output tokens**: 32,768
- **Timeout**: 60 segundos
- **Credits consumed**: 1 per successful scan

---

### 2. `adjust-invoice`

**Descripción**: Ajusta datos de facturas existentes usando comandos en lenguaje natural procesados por Gemini AI.

#### Request

**Endpoint**: `POST /functions/v1/adjust-invoice`

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:
```json
{
  "currentData": {
    "date": "2026-01-27",
    "invoice_number": "FE363690",
    "provider_name": "LISSIA",
    "total_amount": 45600,
    "items": [
      {
        "description": "Cerveza",
        "unit_price": 3000,
        "quantity": 6,
        "total": 18000
      }
    ]
  },
  "userPrompt": "Cambia el precio de la cerveza a 5000",
  "scanId": "uuid-here"
}
```

**Parámetros**:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `currentData` | object | ✅ | Datos actuales de la factura |
| `userPrompt` | string | ✅ | Comando en lenguaje natural |
| `scanId` | string | ✅ | UUID del scan a ajustar |

#### Response

**Success (200)**:
```json
{
  "result": {
    "date": "2026-01-27",
    "invoice_number": "FE363690",
    "provider_name": "LISSIA",
    "total_amount": 55600,
    "items": [
      {
        "description": "Cerveza",
        "unit_price": 5000,
        "quantity": 6,
        "total": 30000
      }
    ]
  },
  "learningRuleSaved": true,
  "message": "Ajuste realizado con éxito"
}
```

**Error (500 - Complex Command)**:
```json
{
  "error": "Fallo al ajustar factura: Comando muy complejo (18KB de respuesta). Intente con un comando más simple."
}
```

#### Límites
- **Max output tokens**: 32,768
- **Timeout**: 30 segundos
- **Credits consumed**: 0 (adjustments are free)

---

## Códigos de Error

### HTTP Status Codes

| Código | Descripción |
|--------|-------------|
| `200` | Success |
| `400` | Bad Request (validación falló) |
| `401` | Unauthorized (token inválido) |
| `402` | Payment Required (sin créditos) |
| `500` | Internal Server Error |

### Error Codes (Custom)

| Code | Message | Solución |
|------|---------|----------|
| `NO_CREDITS` | Créditos insuficientes | Comprar más créditos |
| `INVALID_FILE` | Archivo no válido | Verificar formato y tamaño |
| `PDF_TOO_LARGE` | PDF muy extenso | Dividir PDF o reducir páginas |
| `COMMAND_TOO_COMPLEX` | Comando muy complejo | Simplificar comando o dividir en partes |
| `GEMINI_ERROR` | Error de Gemini API | Reintentar o contactar soporte |

---

## Límites y Cuotas

### Rate Limits

| Recurso | Límite | Período |
|---------|--------|---------|
| `scan-invoice` | 60 requests | Por minuto |
| `adjust-invoice` | 120 requests | Por minuto |

### Token Limits

| Función | Input Tokens | Output Tokens |
|---------|--------------|---------------|
| `scan-invoice` | Unlimited | 32,768 |
| `adjust-invoice` | Unlimited | 32,768 |

### File Limits

| Tipo | Tamaño Máximo | Formato |
|------|---------------|---------|
| Imágenes | 10MB | JPG, PNG, WEBP |
| PDFs | 10MB | PDF |

---

## Ejemplos de Uso

### JavaScript/TypeScript (Supabase Client)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eimpxyqxopfticglxhqt.supabase.co',
  'ANON_KEY'
);

// Escanear factura
async function scanInvoice(fileBase64: string, fileName: string) {
  const { data, error } = await supabase.functions.invoke('scan-invoice', {
    body: {
      file: fileBase64,
      fileName: fileName,
      mimeType: 'image/jpeg'
    }
  });
  
  if (error) throw error;
  return data.result;
}

// Ajustar factura
async function adjustInvoice(scanId: string, prompt: string, currentData: any) {
  const { data, error } = await supabase.functions.invoke('adjust-invoice', {
    body: {
      scanId,
      userPrompt: prompt,
      currentData
    }
  });
  
  if (error) throw error;
  return data.result;
}
```

### cURL

```bash
# Scan invoice
curl -X POST \
  'https://eimpxyqxopfticglxhqt.supabase.co/functions/v1/scan-invoice' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "file": "data:image/jpeg;base64,/9j/4AAQ...",
    "fileName": "factura.jpg",
    "mimeType": "image/jpeg"
  }'

# Adjust invoice
curl -X POST \
  'https://eimpxyqxopfticglxhqt.supabase.co/functions/v1/adjust-invoice' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "currentData": {...},
    "userPrompt": "Cambia el precio a 5000",
    "scanId": "uuid-here"
  }'
```

---

## Deployment

### Deploy Edge Functions

```bash
# Deploy specific function
npx supabase functions deploy scan-invoice
npx supabase functions deploy adjust-invoice

# Deploy all functions
npx supabase functions deploy
```

### Environment Variables

Las funciones requieren las siguientes variables de entorno en Supabase:

```bash
GEMINI_API_KEY=<your-gemini-api-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

**Configurar en Supabase Dashboard**:
1. Project Settings → Edge Functions
2. Add Secret
3. Deploy functions nuevamente

---

## Changelog

### v1.1.0 (2026-01-27)
- ✅ Aumentado `max_output_tokens` a 32,768 en ambas funciones
- ✅ Mejorado manejo de errores para PDFs grandes
- ✅ Agregado logging detallado

### v1.0.0 (2026-01-15)
- 🎉 Release inicial
- ✅ `scan-invoice` funcional
- ✅ `adjust-invoice` funcional

---

**Versión de API**: 1.1  
**Última Actualización**: 2026-01-27  
**Soporte**: support@sikaiconsulting.com
