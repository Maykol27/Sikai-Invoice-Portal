# 📊 SIKAI Invoice Portal - Documentation Hub

> Aplicación web inteligente para escaneo, procesamiento y gestión de facturas con IA

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Maykol27/Sikai-Invoice-Portal)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/react-18.3.1-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.6.2-blue.svg)](https://www.typescriptlang.org/)

---

## 🚀 Quick Start

```bash
# Clonar repositorio
git clone https://github.com/Maykol27/Sikai-Invoice-Portal.git
cd sikai-invoice-app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase y Gemini

# Desarrollo
npm run dev

# Build para producción
npm run build

# Deploy
firebase deploy
```

**URL Producción**: https://sikai-invoice-app.web.app

---

## 📖 Índice de Documentación

### Para Usuarios

| Documento | Descripción | Link |
|-----------|-------------|------|
| **Manual de Usuario** | Guía completa paso a paso | [📘 user-manual.md](docs/user-manual.md) |
| **Casos de Uso** | Flujos y escenarios de uso | [📋 use-cases.md](docs/use-cases.md) |

### Para Desarrolladores

| Documento | Descripción | Link |
|-----------|-------------|------|
| **Arquitectura del Sistema** | Componentes, flujos, deployment | [🏗️ architecture.md](docs/architecture.md) |
| **Base de Datos** | ER Diagram, tablas, RLS policies | [🗄️ database.md](docs/database.md) |
| **API Documentation** | Edge Functions, endpoints, errores | [🔌 api.md](docs/api.md) |

---

## 🎯 ¿Qué es SIKAI Invoice Portal?

SIKAI Invoice Portal permite a usuarios:

- ✅ **Escanear facturas** desde imágenes o PDFs
- 🤖 **Extraer datos automáticamente** con Google Gemini AI
- 💬 **Ajustar facturas** mediante comandos de voz o texto
- 📊 **Exportar a Excel** con templates personalizados
- 📂 **Organizar por categorías** y aprender preferencias
- 🎓 **Automatizar tareas** con machine learning

---

## 🏗️ Stack Tecnológico

### Frontend
```yaml
Framework: React 18 + TypeScript
Build: Vite 7.3.1
Styling: TailwindCSS
Icons: Lucide React
State: React Context API
Routing: Wouter
```

### Backend
```yaml
BaaS: Supabase
  - Auth: Supabase Auth
  - DB: PostgreSQL
  - Storage: Supabase Storage
  - Functions: Deno Edge Functions
AI: Google Gemini 2.0 Flash
Hosting: Firebase
```

### Integraciones
```yaml
PDF Processing: PDF.js
Excel: SheetJS (xlsx)
Speech: Web Speech API
```

---

## 📁 Estructura del Proyecto

```
sikai-invoice-app/
├── docs/                       # 📚 Documentación técnica
│   ├── architecture.md         # Arquitectura del sistema
│   ├── database.md             # Esquema de BD  
│   ├── use-cases.md            # Casos de uso
│   ├── user-manual.md          # Manual de usuario
│   └── api.md                  # API documentation
│
├── src/
│   ├── components/             # 🧩 Componentes React
│   │   ├── Auth/              # Login, signup
│   │   ├── Dashboard.tsx      # Vista principal
│   │   ├── InvoiceScanner.tsx # Upload y escaneo
│   │   ├── ResultViewer.tsx   # Visualización de datos
│   │   ├── SikaiBrainChatModal.tsx  # Chat con IA
│   │   ├── History.tsx        # Historial de facturas
│   │   └── InvoiceDetails.tsx # Detalles completos
│   │
│   ├── lib/                   # 🔧 Utilidades
│   │   ├── supabase.ts       # Cliente Supabase
│   │   ├── auth.tsx          # Auth context
│   │   ├── exportUtils.ts    # Exportación Excel
│   │   └── utils.ts          # Helpers generales
│   │
│   └── App.tsx               # App principal
│
├── supabase/
│   └── functions/             # ⚡ Edge Functions
│       ├── scan-invoice/     # Escaneo con Gemini
│       └── adjust-invoice/   # Ajustes con IA
│
├── public/                    # 🌐 Assets estáticos
└── package.json              # 📦 Dependencias
```

---

## 🗺️ Roadmap de Documentación

### ✅ Completado

- [x] Arquitectura del Sistema
- [x] Diagrama ER y Esquema de BD
- [x] Casos de Uso con Flujos
- [x] Manual de Usuario
- [x] API Documentation

### 🔄 En Progreso

- [ ] Guía de Deployment (CI/CD)
- [ ] Guía de Contribución
- [ ] Testing Documentation

### 📋 Planeado

- [ ] Video Tutoriales
- [ ] Storybook de Componentes
- [ ] Performance Benchmarks
- [ ] Security Audit Report

---

## 🔧 Desarrollo

### Prerequisitos

- Node.js 18+
- npm o pnpm
- Cuenta Supabase
- Google Gemini API Key
- Firebase CLI (para deploy)

### Variables de Entorno

Crear archivo `.env` en la raíz:

```env
# Supabase
VITE_SUPABASE_URL=https://eimpxyqxopfticglxhqt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini API (solo server-side, en Edge Functions)
GEMINI_API_KEY=your-gemini-api-key
```

### Scripts Disponibles

```bash
# Desarrollo local
npm run dev

# Build producción
npm run build

# Preview build
npm run preview

# Lint código
npm run lint

# Deploy Edge Functions
npx supabase functions deploy

# Deploy Frontend a Firebase
firebase deploy
```

---

## 📊 Base de Datos

**PostgreSQL via Supabase**

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios (Supabase Auth) |
| `users_credits` | Créditos por usuario |
| `scans` | Facturas escaneadas |
| `adjustment_history` | Historial de ajustes IA |
| `invoice_categories` | Categorías de facturas |
| `provider_learning` | Auto-clasificación de proveedores |
| `product_learning` | Reglas de ajuste aprendidas |

Ver detalles completos en [database.md](docs/database.md)

---

## 🔌 API

### Edge Functions

**`scan-invoice`**: Procesa imágenes/PDFs de facturas
```typescript
POST /functions/v1/scan-invoice
Body: { file, fileName, mimeType }
Response: { result, scanId, creditsRemaining }
```

**`adjust-invoice`**: Ajusta facturas con comandos IA
```typescript
POST /functions/v1/adjust-invoice
Body: { currentData, userPrompt, scanId }
Response: { result, learningRuleSaved, message }
```

Ver documentación completa en [api.md](docs/api.md)

---

## 🧪 Testing

```bash
# TODO: Tests unitarios
npm run test

# TODO: Tests E2E
npm run test:e2e
```

---

## 📝 Changelog

### v1.1.0 (2026-01-27)
- ✅ Integrado SikaiBrain Chat Modal
- ✅ Aumentado límite de tokens a 32,768
- ✅ Mejorado manejo de errores
- ✅ Agregado logging comprehensivo
- ✅ Documentación técnica completa

### v1.0.0 (2026-01-15)
- 🎉 Release inicial
- ✅ Escaneo de facturas
- ✅ Exportación a Excel
- ✅ Sistema de créditos

---

## 👥 Equipo

**Desarrollado por**: SIKAI CX Team  
**Contacto**: support@sikaiconsulting.com  
**Web**: https://sikaiconsulting.com

---

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para detalles

---

## 🙏 Agradecimientos

- [Supabase](https://supabase.com) - Backend as a Service
- [Google Gemini](https://ai.google.dev) - AI Processing
- [Firebase](https://firebase.google.com) - Hosting
- [React](https://reactjs.org) - Frontend Framework
- [TailwindCSS](https://tailwindcss.com) - Styling

---

**Documentación actualizada**: 2026-01-27  
**Versión del proyecto**: 1.1.0
