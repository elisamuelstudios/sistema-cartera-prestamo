# Operación local

## Puesta en marcha

1. Instala Docker Desktop.
2. Copia toda la carpeta `sistema-cartera-web` al equipo del cliente.
3. Abre Docker Desktop y espera a que el motor esté disponible.
4. Ejecuta `scripts\iniciar.ps1`.
5. Abre `http://localhost:8080`.

El primer arranque tarda más porque construye las imágenes y crea la base. Los siguientes arranques reutilizan lo descargado.

## Uso diario

Puede dejarse Docker funcionando. Si se detiene el equipo, vuelve a ejecutar `scripts\iniciar.ps1`. Para apagar los servicios manualmente usa `scripts\detener.ps1`; los datos se conservan.

## Respaldo recomendado

Ejecuta `scripts\backup.ps1` al final de cada jornada y copia periódicamente la carpeta `backups` a una unidad externa o almacenamiento seguro. Prueba una restauración en un equipo distinto antes de depender del procedimiento en producción.

## Actualización del código

Después de reemplazar archivos por una nueva versión:

```powershell
docker compose up -d --build
```

Las migraciones pendientes se aplican al iniciar la API. Haz siempre un respaldo antes de actualizar.

## Diagnóstico

Estado de los servicios:

```powershell
docker compose ps
```

Registros recientes:

```powershell
docker compose logs --tail 200
```

Prueba automática:

```powershell
.\scripts\smoke-test.ps1 -Username admin -Password 'CONTRASEÑA_ACTUAL'
```

Un resultado correcto informa la cantidad de clientes, préstamos y pagos y valida la regla del interés mínimo.

