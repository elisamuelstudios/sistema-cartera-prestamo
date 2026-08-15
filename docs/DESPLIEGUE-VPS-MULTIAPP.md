# Despliegue VPS con aplicaciones independientes

## Decisión de arquitectura

El VPS comparte únicamente la IP pública, los puertos 80/443 y el proxy HTTPS. Cada producto conserva su propio repositorio, frontend, backend, framework, base de datos, usuarios técnicos, volúmenes, variables, migraciones, versiones y copias de seguridad.

```text
Internet
   |
DNS + HTTPS (Traefik)
   |-- cartera.tudominio.com ------> Angular/Nginx -> NestJS -> PostgreSQL Cartera
   |-- facturacion.tudominio.com --> Frontend propio -> Backend propio -> Base Facturación
   `-- otro.tudominio.com ---------> Stack independiente
```

Facturación no debe agregarse como módulo dentro del código de Cartera. Se crea en otra carpeta y puede usar otro framework sin modificar este proyecto. Ambos stacks se conectan solamente a la red Docker externa `edge`; ninguna base de datos publica un puerto hacia Internet.

## Estructura recomendada en el servidor

```text
/opt/plataforma/
├── gateway/
│   ├── compose.yml
│   └── .env
└── apps/
    ├── cartera/
    │   ├── docker-compose.vps.yml
    │   ├── .env
    │   └── releases/
    └── facturacion/
        ├── compose.yml
        ├── .env
        └── releases/
/srv/backups/
├── cartera/
└── facturacion/
```

## Dominios

En el proveedor DNS se crean registros `A` que apunten a la IP pública del VPS:

- `cartera.tudominio.com`
- `facturacion.tudominio.com`

Traefik obtiene y renueva certificados TLS con Let's Encrypt. El VPS debe aceptar conexiones públicas en los puertos 80 y 443; PostgreSQL y las API permanecen dentro de redes Docker privadas.

## Primer despliegue de Cartera

1. Instalar Docker Engine y el complemento Docker Compose en un servidor Linux mantenido.
2. Crear `/opt/plataforma/gateway` y copiar allí `deploy/vps/gateway/compose.yml`.
3. Copiar `gateway.example.env` como `.env`, indicar un correo real y ejecutar `docker compose --env-file .env up -d`.
4. Crear el DNS `cartera.tudominio.com` y comprobar que apunta al VPS.
5. Copiar este proyecto a `/opt/plataforma/apps/cartera`.
6. Copiar `deploy/vps/cartera.example.env` como `.env`, generar secretos nuevos y ajustar el dominio.
7. Ejecutar `docker compose --env-file .env -f docker-compose.vps.yml up -d --build`.
8. Comprobar `https://cartera.tudominio.com/api/health`, iniciar sesión y cambiar la contraseña inicial.
9. Ejecutar un respaldo y copiarlo cifrado fuera del VPS antes de cargar información real.

## Cómo agregar Facturación

Facturación tendrá su propio `compose.yml`. Su servicio web se conecta a la red externa `edge` y declara etiquetas Traefik con una regla distinta, por ejemplo ``Host(`facturacion.tudominio.com`)``. Sus servicios internos usan otra red, otro volumen y otra base. El nombre de sus routers y servicios Traefik también debe ser único.

## Varias empresas usando el mismo producto

“Varios productos” y “varias empresas” son problemas distintos:

- Para pocos clientes y máxima separación, desplegar una instancia de Cartera por empresa: subdominio, stack, base y secretos propios.
- Para convertir Cartera en SaaS centralizado, se requiere una migración multiempresa: entidad `tenant`, `tenant_id` obligatorio en todas las tablas, aislamiento en consultas, índices compuestos, roles por empresa, almacenamiento y auditoría por tenant. No basta con agregar un selector de empresa.

La primera opción es la más segura para comenzar y permite migrar después a multiempresa sin mezclar hoy los datos de los clientes.

## Operación obligatoria

- No subir archivos `.env`, respaldos ni datos reales al repositorio.
- Usar claves SSH, desactivar acceso SSH por contraseña y restringir el firewall a 22, 80 y 443.
- Programar respaldo diario de cada base y una copia externa cifrada; probar restauraciones periódicamente.
- Desplegar imágenes con versión fija y aplicar actualizaciones mediante una ventana controlada.
- Supervisar salud, espacio en disco, memoria, certificados y errores; conservar auditoría de aplicación.
- Probar migraciones y restauración en staging antes de actualizar producción.

El archivo `docker-compose.vps.yml` ya aplica esta separación a Cartera. La red `cartera_internal` es privada y únicamente el frontend entra a `edge` para recibir tráfico HTTPS.
