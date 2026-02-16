# SIKAI Invoice Portal - Manual de Usuario

## 📖 Guía Completa para Usuarios

## 📋 Tabla de Contenidos
1. [Introducción](#introducción)
2. [Primeros Pasos](#primeros-pasos)
3. [Escanear Facturas](#escanear-facturas)
4. [Ver y Gestionar Historial](#ver-y-gestionar-historial)
5. [Ajustar Facturas con IA](#ajustar-facturas-con-ia)
6. [Exportar Datos](#exportar-datos)
7. [Gestionar Categorías](#gestionar-categorías)
8. [Créditos y Facturación](#créditos-y-facturación)
9. [Consejos y Mejores Prácticas](#consejos-y-mejores-prácticas)
10. [Solución de Problemas](#solución-de-problemas)

---

## Introducción

### ¿Qué es SIKAI Invoice Portal?

**SIKAI Invoice Portal** es una aplicación web inteligente que te permite:
- ✅ Escanear facturas desde imágenes o archivos PDF
- 🤖 Extraer automáticamente todos los datos mediante IA
- 💬 Ajustar facturas usando comandos de voz o texto
- 📊 Exportar datos a Excel con tu propio template
- 📂 Organizar facturas por categorías
- 🎓 Aprender tus preferencias para automatizar tareas

### ¿Qué necesitas?

- 🌐 Navegador web moderno (Chrome, Edge, Firefox, Safari)
- 📧 Cuenta registrada en SIKAI
- 💳 Créditos disponibles para escanear

---

## Primeros Pasos

### 1. Iniciar Sesión

1. Ve a https://sikai-invoice-app.web.app
2. Ingresa tu **email** y **contraseña**
3. Haz clic en **"Iniciar Sesión"**

> 💡 **Tip**: Puedes ver tus créditos disponibles en la esquina superior derecha

### 2. Dashboard Principal

Al iniciar sesión verás:
- **Facturas Escaneadas**: Total de facturas procesadas
- **Créditos Disponibles**: Cuántos escaneos puedes hacer
- **Actividad Reciente**: Últimas facturas escaneadas

**Opciones disponibles**:
- 📸 **Escanear Nueva Factura**: Procesar una nueva factura
- 📂 **Ver Historial**: Ver todas tus facturas

---

## Escanear Facturas

### Método 1: Subir Archivo

1. Haz clic en **"Escanear Nueva Factura"** o navega a **Scanner**
2. Haz clic en el área de upload o arrastra el archivo
3. Selecciona:
   - **Imagen** (JPG, PNG, WEBP)
   - **PDF** (máximo 10 páginas recomendado)
4. Haz clic en **"🔍 Escanear"**
5. Espera mientras la IA procesa (10-30 segundos)
6. ¡Listo! Verás los datos extraídos

> ⚠️ **Importante**: Cada escaneo consume 1 crédito

### Método 2: Capturar con Cámara

1. En Scanner, haz clic en el icono de **📷 Cámara**
2. Permite acceso a la cámara
3. Coloca la factura frente a la cámara
4. Haz clic en **"Capturar"**
5. Revisa la imagen y confirma
6. Haz clic en **"🔍 Escanear"**

### ¿Qué datos se extraen?

La IA extrae automáticamente:
- ✅ Número de factura
- ✅ Fecha de emisión y vencimiento
- ✅ Proveedor (nombre, NIT, dirección)
- ✅ Totales (Subtotal, IVA, Total)
- ✅ Lista de productos con:
  - Código
  - Descripción
  - Cantidad
  - Precio unitario
  - IVA
  - Total

---

## Ver y Gestionar Historial

### Ver Lista de Facturas

1. Navega a **"Historial"**
2. Verás tarjetas con:
   - Nombre del proveedor
   - Número de factura
   - Fecha
   - Total
   - Vista previa de imagen

### Buscar Facturas

1. En Historial, usa la barra de búsqueda
2. Escribe:
   - Nombre del proveedor (ej: "LISSIA")
   - Número de factura (ej: "FE363690")
   - Palabra clave

### Ver Detalles Completos

1. Haz clic en cualquier factura
2. Se abre modal con:
   - **Panel izquierdo**: Imagen/PDF original
   - **Panel derecho**: Datos extraídos

**Pestañas disponibles**:
- **Detalles**: Todos los datos y productos
- **Historial de Cambios**: Ajustes realizados

---

## Ajustar Facturas con IA

### Abrir Asistente SikaiBrain

1. Abre los detalles de una factura
2. Haz clic en el **🧠 Cerebro** (esquina superior derecha)
3. Se abre el chat del asistente

### Ajustar con Texto

1. Escribe tu comando en el chat
2. Ejemplos:
   ```
   "Cambia el precio de la cerveza a 5000"
   "El IVA es del 19%"
   "La cantidad de aceite es 12 unidades"
   "Cambia Esm.l.oro por ESMALTE LIGNE D'OR"
   ```
3. Presiona **Enter** o haz clic en **Enviar ➤**
4. La IA procesará el comando
5. Verás mensaje de confirmación
6. La página se recargará con los nuevos datos

### Ajustar con Voz

1. En el chat, haz clic en el **🎤 Micrófono**
2. Permite acceso al micrófono
3. Habla claramente tu comando:
   - "Cambia el nombre del cliente a Juan Pérez"
   - "El descuento es del 10%"
4. El sistema transcribe automáticamente
5. Se envía y procesa como comando de texto

> 💡 **Tip**: Habla claro y enfócate en un cambio a la vez

### Historial de Cambios

1. Ve a la pestaña **"Historial de Cambios"**
2. Verás lista de todos los ajustes:
   - Comando que usaste
   - Fecha y hora
   - Qué cambió (antes → después)

---

## Exportar Datos

### Exportación Estándar

1. Abre detalles de factura o selecciona varias en historial
2. Haz clic en dropdown **"⬇ Exportar"**
3. Selecciona formato:
   - **Excel (.xlsx)**: Hoja de cálculo
   - **CSV (.csv)**: Valores separados por comas
   - **JSON (.json)**: Formato para programadores
   - **TXT (.txt)**: Texto plano

4. El archivo se descarga automáticamente

**Estructura del Excel estándar**:
```
Columna A: Fecha
Columna B: Factura #
Columna C: Proveedor
Columna D: NIT
Columna E: Subtotal
Columna F: IVA
Columna G: Total
... (productos en filas siguientes)
```

### Smart Template Export

> 🎯 **Para usuarios avanzados**: Usa tu propio template de Excel

1. Haz clic en **"Smart Template Export"**
2. Selecciona tu archivo template (.xlsx)
3. La IA mapea automáticamente:
   - Datos de factura → Columnas del template
   - Preserva fórmulas existentes
   - Respeta formato del template
4. Opcionalmente, ingresa valor de impuesto personalizado
5. Se descarga nuevo Excel con tus datos

**Ventajas**:
- ✅ Mantiene formato de tu ERP
- ✅ Preserva fórmulas (SUM, VLOOKUP, etc.)
- ✅ Listo para importar a tu sistema

---

## Gestionar Categorías

### ¿Para qué sirven las categorías?

Las categorías te permiten:
- Organizar facturas por tipo de negocio
- Exportar con templates específicos por categoría
- Auto-clasificar facturas de proveedores conocidos

### Crear Nueva Categoría

1. Abre detalles de una factura
2. En el selector de categoría, haz clic
3. Selecciona **"+ Nueva Categoría..."**
4. Ingresa nombre (ej: "Licorera", "Ferretería")
5. Haz clic en **Aceptar**

### Asignar Categoría a Factura

1. Abre detalles de factura
2. Haz clic en dropdown de categoría
3. Selecciona la categoría deseada
4. Se guarda automáticamente

### Auto-Clasificación (Learning)

**¿Cómo funciona?**
1. Asignas categoría "Licorera" a factura de "ABC Licores"
2. SIKAI aprende: "ABC Licores" = "Licorera"
3. La próxima factura de "ABC Licores" se categoriza automáticamente

> 🎓 **Inteligente**: Mientras más uses SIKAI, más aprende tus preferencias

---

## Créditos y Facturación

### Ver Créditos Disponibles

- Mira el badge en la esquina superior derecha
- Número indica créditos restantes
- Si quedan < 5: Badge se vuelve amarillo/rojo

### ¿Cuándo se consumen créditos?

✅ **Se consume 1 crédito**:
- Al escanear una factura nueva (imagen o PDF)

❌ **NO se consume**:
- Ver historial
- Ver detalles de factura
- Ajustar con SikaiBrain
- Exportar datos
- Gestionar categorías

### Comprar Más Créditos

(Próximamente - PayPal/Stripe integration)

---

## Consejos y Mejores Prácticas

### Para Mejores Resultados de Escaneo

✅ **Haz**:
- Usar imágenes claras y bien iluminadas
- Enfocar bien la factura
- Usar PDFs originales (no escaneos de baja calidad)
- Verificar que el texto sea legible

❌ **Evita**:
- Fotos borrosas o con sombras
- PDFs de más de 15 páginas (muy lentos)
- Facturas arrugadas o dañadas
- Documentos en idiomas no soportados

### Para Ajustes con SikaiBrain

✅ **Comandos claros**:
```
✓ "Cambia el precio de X a 5000"
✓ "El cliente es Juan Pérez"
✓ "Aumenta cantidad de cerveza a 12"
```

❌ **Evita comandos ambiguos**:
```
✗ "Arregla los precios"
✗ "Ponle lo de siempre"
✗ "Cámbialo todo"
```

### Para Exportaciones

1. **Exportación rápida**: Usa formatos estándar (Excel/CSV)
2. **Integración con ERP**: Usa Smart Template Export
3. **Múltiples facturas**: Selecciona varias desde historial antes de exportar

---

## Solución de Problemas

### "Créditos Insuficientes"

**Problema**: No puedes escanear  
**Solución**: Compra más créditos o contacta soporte

### "Error al procesar PDF"

**Problema**: PDF muy grande (>15KB respuesta)  
**Solución**: 
1. Divide el PDF en archivos más pequeños
2. Usa imágenes en lugar de PDF
3. Contacta soporte para PDFs especiales

### "No se detectó voz"

**Problema**: Comando de voz no funciona  
**Solución**:
1. Verifica permisos de micrófono en el navegador
2. Usa Google Chrome (mejor compatibilidad)
3. Habla más cerca del micrófono
4. Como alternativa, usa texto

### "Comando muy complejo (18KB de respuesta)"

**Problema**: Ajuste demasiado grande  
**Solución**:
1. Divide el comando en partes más pequeñas
2. Ejemplo: En lugar de "Cambia todos los productos...", haz uno por uno
3. Usa comandos específicos

### "Template no válido"

**Problema**: Smart Export falla  
**Solución**:
1. Verifica que el archivo sea .xlsx (no .xls ni .csv)
2. Asegúrate que tenga estructura tabular
3. Usa plantilla con encabezados claros

### La página no carga

**Problema**: Pantalla en blanco o error  
**Solución**:
1. Refresca la página (Ctrl+R / Cmd+R)
2. Limpia caché del navegador
3. Cierra sesión y vuelve a entrar
4. Prueba en modo incógnito
5. Contacta soporte si persiste

---

## Soporte

### Contacto

- **Email**: support@sikaiconsulting.com
- **Web**: https://sikaiconsulting.com
- **Horario**: Lunes a Viernes, 9 AM - 6 PM (Colombia)

### Recursos

- [Video Tutoriales](https://www.youtube.com/@sikaicx) (próximamente)
- [FAQ](https://sikaiconsulting.com/faq)
- [Actualizaciones](https://github.com/Maykol27/Sikai-Invoice-Portal)

---

**Versión del Manual**: 1.0  
**Última Actualización**: 2026-01-27  
**Producto**: SIKAI Invoice Portal  
**Marca**: SIKAI CX
