# Arquitectura

## Capas

El navegador consume únicamente `/api`. Nginx entrega Angular y redirige esas solicitudes al contenedor NestJS. La API aplica autenticación, validaciones y reglas de negocio antes de usar PostgreSQL mediante TypeORM.

```text
Navegador
   │ http://localhost:8080
   ▼
Angular + Nginx
   │ /api
   ▼
NestJS
   │ TypeORM
   ▼
PostgreSQL 17
```

## Frontend

- `core/guards`: control de sesión y rol administrativo.
- `core/interceptors`: adjunta JWT y controla sesiones vencidas.
- `core/services`: acceso HTTP, autenticación, avisos y servicios por dominio.
- `shared`: modal, insignias de estado y elementos reutilizables.
- `features`: dashboard, clientes, préstamos, pagos, cartera, rutas, cierres, configuración y usuarios.
- `layout`: menú lateral, encabezado y cierre de sesión.

La aplicación usa componentes standalone, carga diferida por ruta, formularios reactivos y señales.

## Backend

Cada dominio contiene módulo, controlador, servicio y DTO. Las entidades están en `src/entities` y la migración SQL versionada en `src/database/migrations`.

Módulos principales:

- `auth`, `users`, `audit`
- `clients`, `loans`, `payments`, `portfolio`
- `routes`, `reports`, `cash-closures`
- `settings`, `dashboard`, `health`

Las operaciones financieras que modifican varias tablas usan transacciones. Los pagos recalculan asignaciones, cuotas y saldo; una refinanciación cierra el préstamo origen y crea uno nuevo con trazabilidad.

## Persistencia

El volumen Docker `postgres_data` mantiene la base aunque se detengan o recreen los contenedores. El cargador inicial solo importa los JSON de `database/seed-data` cuando no existen usuarios en la base, evitando duplicar datos en reinicios posteriores.

## Seguridad

- Contraseñas almacenadas con bcrypt.
- Tokens JWT y rutas protegidas por defecto.
- Roles para funciones administrativas.
- DTO con lista blanca y rechazo de propiedades desconocidas.
- Encabezados HTTP seguros con Helmet.
- Auditoría de las operaciones principales.
- Cambio obligatorio de la contraseña temporal inicial.

