# Sistema de Cartera Eli

Aplicación local que reemplaza el libro `Sistema_Cartera_Eli.xlsm` por una arquitectura web separada y escalable:

- Angular para la interfaz.
- NestJS sobre Node.js para la API.
- PostgreSQL para persistencia.
- Docker Compose para ejecutar todo localmente.

El Excel original no se modifica. La información extraída se carga automáticamente la primera vez que PostgreSQL está vacío.

## Inicio rápido

Requisito: Docker Desktop instalado y abierto.

Desde PowerShell, en esta carpeta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\iniciar.ps1
```

Después abre:

```text
http://localhost:8080
```

Acceso inicial:

```text
Usuario: admin
Contraseña temporal: 1234
```

El sistema solicita obligatoriamente una contraseña nueva de mínimo ocho caracteres en el primer ingreso.

Para detenerlo sin borrar datos:

```powershell
.\scripts\detener.ps1
```

## Información migrada

| Módulo | Registros |
|---|---:|
| Clientes | 341 |
| Préstamos | 41 |
| Cuotas | 1.526 |
| Pagos | 12 |
| Usuarios | 1 |
| Auditoría | 505 |
| Configuraciones de origen | 17 |
| Rutas | 4 |
| Cierres de caja | 0 |

## Funcionalidad incluida

- Inicio de sesión JWT, roles Administrador/Operador, guards e interceptor.
- Dashboard ejecutivo como página Inicio.
- Clientes con formulario por pasos, validaciones, Lista Negra y estado del préstamo actual.
- Préstamos nuevos, edición, cuota editable, interés fijo mínimo del 20 % y refinanciación `RF-000001`.
- Refinanciación sobre refinanciación, sin interés moratorio diario.
- Registro y edición de pagos con redistribución de cuotas y saldos.
- Cartera, mora, rutas, exportación Excel por ruta y valores en moneda.
- Cierre de caja con resumen precargado desde pagos, cuotas y refinanciaciones.
- Configuración editable, usuarios, roles y auditoría.
- Modales reutilizables, servicios por dominio, DTO, validación y migraciones de base de datos.

## Estructura

```text
sistema-cartera-web/
├── frontend/              Angular: páginas, componentes, guards, interceptor y servicios
├── backend/               NestJS: módulos, controladores, servicios, DTO y entidades
├── database/seed-data/    Datos extraídos del Excel para la carga inicial
├── scripts/               Inicio, parada, respaldo, restauración y prueba de humo
├── docker-compose.yml     PostgreSQL + API + web
└── .env                   Configuración local no versionada
```

Consulta [Arquitectura](docs/ARQUITECTURA.md), [Migración](docs/MIGRACION.md) y [Operación](docs/OPERACION.md) para el detalle.

## Respaldo y restauración

Crear un respaldo:

```powershell
.\scripts\backup.ps1
```

Los archivos quedan en `backups/`.

Restaurar un respaldo existente:

```powershell
.\scripts\restaurar.ps1 -BackupPath .\backups\cartera_YYYYMMDD_HHMMSS.sql
```

La restauración exige escribir `RESTAURAR` y reemplaza la base actual. Crea antes otro respaldo.

## Verificación

Compilar ambos proyectos:

```powershell
pnpm build
```

Ejecutar pruebas unitarias:

```powershell
pnpm test
```

Probar el sistema levantado, sin crear información:

```powershell
.\scripts\smoke-test.ps1
```

Si la contraseña inicial ya cambió:

```powershell
.\scripts\smoke-test.ps1 -Username admin -Password 'TU_CONTRASEÑA'
```

Documentación interactiva de la API:

```text
http://localhost:8080/api/docs
```

## Configuración de entrega

Antes de instalarlo en el equipo definitivo, cambia `POSTGRES_PASSWORD` y `JWT_SECRET` en `.env`. No borres el volumen `sistema-cartera-eli_postgres_data`: allí vive la base de datos. `docker compose down` conserva el volumen; no uses `docker compose down -v` salvo que realmente quieras eliminar toda la información.

