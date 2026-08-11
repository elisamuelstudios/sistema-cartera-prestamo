# Migración desde Excel

Fuente: `Sistema_Cartera_Eli.xlsm`.

La extracción se guardó como JSON estructurado en `database/seed-data`. El libro original permanece intacto y no se requiere Microsoft Excel para ejecutar el nuevo sistema.

## Correspondencia

| Hoja del Excel | Destino PostgreSQL |
|---|---|
| `BD_Clientes` | `clients` |
| `BD_Prestamos` | `loans` |
| `BD_PlanPagos` | `installments` |
| `BD_Pagos` | `payments` y `payment_allocations` |
| `BD_Usuarios` | `users` |
| `BD_Auditoria` | `audit_logs` |
| `BD_Config` | `settings` |
| `BD_Rutas` | `routes` |
| `BD_CierresCaja` | `cash_closures` |

Las relaciones usan identificadores internos UUID, pero conservan los códigos visibles del Excel (`CL-`, `PR-`, `RC-`, `RT-`). Los nombres visibles de clientes en préstamos y pagos se obtienen por relación con el código/cliente correspondiente, por lo que una edición del cliente se refleja en todos los módulos.

## Carga inicial

Al arrancar una base vacía:

1. TypeORM ejecuta la migración del esquema.
2. Se crean rutas y usuarios.
3. Se insertan clientes y sus relaciones de ruta.
4. Se insertan préstamos y cuotas.
5. Se insertan pagos, configuraciones y auditoría.
6. La contraseña heredada se transforma a un hash bcrypt.

La carga no vuelve a ejecutarse cuando la base ya contiene usuarios. Para reiniciar datos se debe seguir un procedimiento controlado de respaldo/restauración; nunca borres el volumen en producción por accidente.

