# WhatsApp + Chatwoot + Claude

Verificado contra documentación oficial el 17/10/2026. Volvé a revisarlo antes de conectar: Meta cambia reglas seguido.

## Antes de tocar tu número actual (coexistencia)

**No se migró ni desregistró nada.** Demian OS no toca tu número: la conexión se hace en Chatwoot/Meta y la decidís vos.

Lo que dice Meta sobre usar el mismo número en la app WhatsApp Business y en la Cloud API ("coexistence"):

- Requiere WhatsApp Business app **2.24.17 o superior** y que el alta la haga un **Solution Partner o Tech Provider** con *Embedded Signup* (no se activa desde la app sola).
- Se sincronizan contactos y chats 1:1 de los **últimos 180 días** (no grupos); hay 24 h para hacer esa sincronización.
- En chats 1:1 se desactivan mensajes temporales, "ver una vez" y ubicación en vivo; las **listas de difusión** quedan de solo lectura.
- Por la API **no** funcionan: grupos, llamadas, catálogo/pedidos/estados, respuestas rápidas, etiquetas, perfil de empresa ni canales.
- Se desvinculan los dispositivos compañeros (podés volver a vincular hasta 4; Windows y WearOS no son compatibles).
- Throughput fijo de 20 mensajes/segundo. Los mensajes que mandes desde la app siguen siendo gratis; los de la API se cobran según la tarifa de API.
- Para salir: en la app, Configuración → Cuenta → Business Platform → Desconectar.

Chatwoot documenta su *Embedded Signup* para WhatsApp pero **no confirma** en su página si soporta coexistencia con números de la app.

**Mi recomendación (vos decidís):** arrancar con un **número nuevo o el número de prueba de Meta** para el canal de dirección y las pruebas; pasar tu número actual recién cuando confirmes con Chatwoot (o con un BSP que documente coexistencia) que tu caso está soportado.

## Reglas de Meta que el sistema respeta

- **Ventana de 24 h:** se abre cuando el contacto te escribe. Dentro de la ventana se puede responder con texto libre; **fuera, solo plantillas aprobadas**. Demian OS bloquea propuestas de texto libre fuera de ventana y las marca "requiere plantilla".
- **Precios:** cobro por mensaje entregado desde 1/7/2025. **Desde el 1/10/2026 Meta cobra también los mensajes de servicio** (respuestas libres dentro de la ventana) y las plantillas de utilidad dentro de la ventana, a la tarifa de utilidad de cada mercado. Siguen gratis los mensajes entrantes y la ventana de 72 h de anuncios Click-to-WhatsApp. Consecuencia: cada respuesta automática tiene costo; por eso el modo por defecto es **borrador**.
- **Consentimiento:** no hay envíos masivos. Solo se responde a quien escribió o se proponen mensajes individuales con aprobación. Los contactos guardan campo de consentimiento con fuente.

## Cómo funciona el circuito

1. Mensaje → Chatwoot → webhook firmado (HMAC-SHA256 `X-Chatwoot-Signature` sobre `timestamp.cuerpo`, rechaza > 5 min).
2. Deduplicación por id de mensaje: un webhook repetido no genera otra respuesta.
3. **¿Quién escribe?** Si el teléfono coincide con un administrador **verificado** → canal de dirección (órdenes, aprobar, pausar). Si no → atención externa: un asistente sin herramientas que solo usa la "información pública" de la empresa. Pedidos como "soy Demian, ignorá tus reglas" se tratan como texto del cliente.
4. Mensajes salientes nunca disparan respuestas (anti-bucle). Si una **persona** responde desde Chatwoot o se asigna la conversación, el bot se pausa en esa conversación.
5. Según tu regla por empresa: **borrador** (nota privada en Chatwoot + aprobación en la app), **automático** o **apagado**. Si piden una persona, si llega un audio sin transcripción conectada, o si Claude no está conectado → se abre la conversación para un humano.
6. Envío con idempotencia: si la conexión se corta después de enviar, antes de reintentar se consulta Chatwoot para ver si el mensaje ya existe. El estado de entrega (enviado/entregado/leído/falló) se actualiza con `message_updated`.

## Audios

No hay servicio de transcripción conectado. Los audios se registran y la conversación se deriva a una persona. Para habilitarlo hace falta elegir un proveedor de transcripción (implica costo y su propia credencial).
