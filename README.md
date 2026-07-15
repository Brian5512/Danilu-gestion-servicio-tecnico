# Danilu - Sistema Local de Gestion de Boletas

Aplicacion local para administrar boletas de servicio tecnico, registrar reparaciones, controlar pendientes e imprimir comprobantes para clientes.

---

## Informacion del Servicio

**Nombre:** Danilu  
**Direccion:** Mario Gongora 102  
**Correo:** LYMSERVICIO@GMAIL.COM  
**WhatsApp:** +56 9 9659 6155

---

## Como Abrir la Aplicacion

1. Abre la carpeta del proyecto.
2. Ejecuta el archivo `abrir-danilu.bat`.
3. La aplicacion se abrira en el navegador.

No requiere internet, instalacion adicional ni servidor externo.

---

## Flujo de Trabajo Recomendado

1. Presiona `Nueva boleta`.
2. Ingresa los datos del cliente.
3. Registra el equipo recibido, accesorios, falla reportada y fechas.
4. Completa diagnostico, trabajo realizado, tecnico, garantia y valores.
5. Presiona `Guardar boleta`.
6. Revisa la boleta con `Vista previa`.
7. Imprime o guarda como PDF desde la vista previa.

---

## Funciones Incluidas

- Folio automatico para cada boleta.
- Historial de reparaciones guardado localmente.
- Busqueda por cliente, folio, telefono, equipo, marca, modelo o serie.
- Filtro por estado del trabajo.
- Panel de equipos pendientes y atrasados.
- Resumen mensual con ventas, pagos, saldos, entregas y pagos por tipo.
- Registro de garantia en dias.
- Registro de clave o PIN del equipo, si corresponde.
- Registro de tecnico responsable.
- Registro de tipo de pago.
- Calculo de total, abono y saldo pendiente.
- Vista previa profesional de la boleta.
- Impresion de boleta.
- Guardado como PDF desde la ventana de impresion.
- Exportacion del historial a CSV.
- Respaldo e importacion de datos en formato JSON.
- Eliminacion protegida: para borrar una boleta se debe escribir su folio exacto.

---

## Estados Disponibles

- Recibido
- Diagnosticando
- Esperando repuesto
- Listo para retiro
- Entregado
- Anulado

---

## Boleta de Servicio

La boleta incluye:

- Logo de Danilu.
- Datos de contacto del servicio tecnico.
- Folio de la boleta.
- Datos del cliente.
- Datos del equipo recibido.
- Falla reportada.
- Diagnostico.
- Trabajo realizado.
- Repuestos usados, si aplica.
- Condiciones de garantia.
- Total, abono y saldo pendiente.
- Firma del cliente.
- Firma del tecnico.

---

## Respaldo de Informacion

La informacion se guarda localmente en el navegador usando IndexedDB.

Para evitar perdida de datos:

1. Usa el boton `Respaldo JSON` periodicamente.
2. Guarda el archivo en una carpeta segura.
3. Si cambias de computador o navegador, usa `Importar` para recuperar el respaldo.

Importante: si se borran los datos del navegador, se pueden perder las boletas guardadas si no existe un respaldo JSON.

---

## Archivos del Proyecto

- `abrir-danilu.bat`: acceso directo para abrir la aplicacion.
- `static/index.html`: estructura principal de la aplicacion.
- `static/styles.css`: diseno visual.
- `static/app.js`: funcionamiento y base de datos local.
- `static/assets/danilu-logo.png`: logo del servicio tecnico.
- `static/assets/tech-background.jpg`: fondo visual de la aplicacion.

---

## Recomendaciones de Uso

- Haz respaldos al menos una vez por semana.
- Guarda PDF de las boletas importantes.
- Completa siempre la fecha prometida para controlar atrasos.
- Usa el estado `Entregado` cuando el cliente retire el equipo.
- Revisa `Resumen mensual` para controlar ventas, pagos y saldos del mes.
- Evita borrar o mover la carpeta `static`.

---

## Version

**Danilu - Sistema Local de Boletas**  
Version local para uso interno del servicio tecnico.
