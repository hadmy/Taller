# Taller IA · SIAF-RP

Arquetipo para clases demostrativas: muestra cómo se arman las pantallas del SIAF-RP con los componentes del diseño de
Figma y **datos simulados**, sin backend. Trae el login, el escritorio virtual y un proceso de ejemplo completo
(Documentos y registros y la solicitud con su formulario), con usuarios de demostración para alternar roles y
perfiles.

> Es material de clase: corre solo en local y no se mantiene como producto. Nada de lo que se graba sale del navegador.

## Requisitos

- Node.js 20 (ver `.nvmrc`) y npm.

## Cómo correrlo

```bash
npm ci
npm start
```

Abrir <http://127.0.0.1:4200>. Otro puerto: `npm start -- --port 4300`.

## Usuarios de demostración

La contraseña de todos es **`Taller2026*`**. En el login, el campo «Usuario» acepta el correo o el DNI, y el panel
«Usuarios de demostración» llena el correo y la contraseña con un clic.

| Usuario | Correo | DNI | Perfil | Qué puede hacer |
| --- | --- | --- | --- | --- |
| Ana Torres Díaz | `ana.torres@taller.pe` | `11111111` | Creador | Crear, grabar, editar, verificar y eliminar solicitudes |
| Luis Ramírez Soto | `luis.ramirez@taller.pe` | `22222222` | Aprobador | Aprobar, observar (con comentario) o rechazar lo verificado |
| Carla Mendoza Ríos | `carla.mendoza@taller.pe` | `33333333` | Creador y Aprobador | Lo mismo que los dos anteriores: cambia de perfil desde su menú de usuario |
| Usuario Especialista OA | `especialista-oa@minedu.gob.pe` | `44444444` | Creador (Ministerio de Educación) | Registra las solicitudes del CMN, como el Anexo N.º 02 |
| Usuario Aprobador OA | `aprobador-oa@minedu.gob.pe` | `55555555` | Aprobador (Ministerio de Educación) | Aprueba, observa o rechaza las solicitudes de su entidad, como el Anexo N.º 02 |

«Olvidé mi contraseña» también funciona: con el correo de un usuario (por ejemplo `ana.torres@taller.pe`) el código de
verificación es `123456`.

## Recorrido sugerido para la clase

1. **Login** como Ana. El escritorio virtual muestra la bandeja, los contadores y sus notificaciones.
2. **Procesos → Gestión de abastecimiento → Cuadro Multianual de Necesidades → Solicitudes del Cuadro Multianual de
   Necesidades → Necesidades estratégicas** (Documentos y registros). La pestaña Documentos es la bandeja; Registros,
   los ítems ya aprobados (con el historial de la solicitud que los incluyó).
3. **Crear documento → Solicitud de necesidades estratégicas**: elegir los ítems y **Grabar**. La solicitud recibe su
   número (`CMN-SIE-00007-2026-MEF-OGA`) y queda Elaborada; luego **Verificar**.
4. **Cerrar sesión** y entrar como Luis: tiene la notificación «Solicitud por aprobar». Abrir la solicitud y
   **Aprobar** (los ítems aparecen en Registros), **Observar** o **Rechazar** (piden comentario).
5. Volver a entrar como Ana: le llega el aviso. Una solicitud observada se corrige y se vuelve a verificar, pero ya no
   se puede eliminar.
6. Entrar como Carla y cambiar de perfil desde el menú del usuario: el avatar pasa de «CR» a «AP» y cambian la bandeja,
   los botones y las notificaciones.
7. **CMN** como la Especialista OA: en **Procesos**, buscar «CMN Programación» (o Gestión de abastecimiento →
   Programación multianual de bienes, servicios y obras → CMN Programación) y, en Documentos y registros, **Crear
   documento → Solicitud de CMN - Anexo N.º 02**. Lo aprueba el **Aprobador OA**: cada perfil ve y responde solo las
   solicitudes de su entidad.
8. **Catálogo de componentes** en `/ui-kit`: cada componente con su ficha, sus entradas y su ejemplo.

Para empezar de cero: **Reiniciar datos** en el login (o borrar el almacenamiento del sitio).

## Pantallas

| Ruta | Pantalla | Plantilla o componente principal |
| --- | --- | --- |
| `/login` | Inicio de sesión y usuarios de demostración | `siaf-input`, `siaf-list` |
| `/login/recuperar-contrasena` | Recuperar contraseña con código | — |
| `/panel` | Escritorio virtual | `siaf-desk-card` |
| `/procesos/cmn-programacion` | CMN Programación: Documentos y registros | `siaf-documents-records-page` |
| `/procesos/cmn-programacion/anexo-2-fase-1` y `/:id` | Solicitud de CMN - Anexo N.º 02 | Fase 1 | `siaf-solicitude-page-layout` |
| `/procesos/cuadro-multianual-necesidades/solicitudes/necesidades-estrategicas` | Necesidades estratégicas: Documentos y registros | `siaf-documents-records-page` |
| `…/necesidades-estrategicas/solicitud` y `/solicitud/:id` | Solicitud de necesidades estratégicas | `siaf-solicitude-page-layout` |
| `/ui-kit` | Catálogo de componentes (sin sesión) | — |

## Cómo funcionan los datos simulados

- **`src/app/mock/mock-backend.interceptor.ts`** hace de backend: responde las llamadas a `/api/v1` con las mismas
  rutas y respuestas que el backend real del SIAF-RP, y aplica sus reglas (quién puede hacer cada cambio de estado,
  comentario obligatorio al observar o rechazar, datos obligatorios para elaborar, número al elaborar, registro al
  aprobar, notificaciones para cada rol). Simula 250 ms de latencia. Si una pantalla llama a una ruta que no simula,
  lo avisa en la consola con `[mock] Endpoint no simulado`.
- **`src/app/mock/mock-db.ts`** guarda los datos en el `localStorage` del navegador (clave `taller-siaf-rp:datos`): lo
  que graba un usuario lo ve otro al entrar, en el mismo navegador. Trae 6 solicitudes de necesidades estratégicas en
  todos los estados, sus ítems registrados, la configuración del CMN y notificaciones. Si cambian la forma de los datos, suban `VERSION` y se regeneran solos.
- **`src/app/mock/usuarios-demo.ts`** define los usuarios y sus perfiles. El token es un JWT sin firma: la app solo lee
  su vencimiento.
- Las notificaciones en tiempo real (socket) están apagadas: la campana se actualiza al iniciar sesión y al abrirla.

## Estructura

```text
src/app/
├── core/            API, sesión y permisos, interceptores, estado de las solicitudes y notificaciones
├── features/        login, recuperar contraseña y catálogo /ui-kit
├── layout/          armazón: barra superior, menú lateral, menú de procesos, bandeja y escritorio virtual
├── mock/            backend simulado, datos iniciales y usuarios de demostración
├── modules/
│   ├── abastecimiento/
│   │   ├── anexo-2-fase-1/      CMN Programación (proceso de ejemplo)
│   │   │   ├── api/     llamadas del proceso
│   │   │   ├── config/  rutas, columnas y filtros de Documentos y registros
│   │   │   ├── models/  tipos del Anexo N.º 02
│   │   │   ├── pages/   documents · solicitud
│   │   │   └── utils/   formato de montos
│   │   └── items-estrategicos/  Necesidades estratégicas
│   └── configuracion/           configuración del CMN
└── shared/
    ├── ui/          componentes del diseño de Figma (sin dependencias del dominio)
    ├── components/  componentes compuestos y plantillas de pantalla
    └── utils/       árbol de procesos del menú, migas de pan, fechas…
```

## Cómo sumar un proceso

Tomen como modelo `modules/abastecimiento/anexo-2-fase-1/`:

1. **Modelo y API** del proceso en `modules/<área>/<proceso>/`.
2. **Backend simulado**: sus rutas en `RUTAS` de `mock-backend.interceptor.ts` y sus datos iniciales en `mock-db.ts`.
3. **Pantallas** con las plantillas: `siaf-documents-records-page` (se arma con una configuración),
   `siaf-solicitude-page-layout` para la solicitud y `siaf-query-report-page` para las consultas.
4. **Rutas** en `modules/<área>/<área>.routes.ts`, cargadas desde `app.routes.ts`.
5. **Menú y migas de pan**: sus hojas en `shared/utils/process-tree.util.ts` (`DEFAULT_PROCESS_TREE`).
6. **Crear documento y notificaciones**: el tipo de documento en `/tipos-documento` del backend simulado, sus opciones
   en `layout/shell/app-shell.component.ts` (`ROUTE_BY_PROCESO`) y la ruta que abre cada aviso en
   `layout/notifications-panel` y `layout/tray-notifications-view` (`resolveRoute`).

Antes de escribir markup, busquen el componente en `/ui-kit`: casi todo ya existe.

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm start` | Servidor de desarrollo |
| `npx ng build --configuration=development` | Compilar |
| `npx ng test --watch=false --browsers=ChromeHeadless` | Pruebas unitarias |
| `npm run ui-kit:manifest` | Regenerar las fichas del catálogo tras crear o cambiar un componente |
| `npm run ui-kit:check` | Verificar que el catálogo está al día |
| `npm run icons:check` | Verificar que los íconos existen en Material Icons |
| `npm run tokens:build` | Regenerar los tokens de color desde `src/tokens/` |
