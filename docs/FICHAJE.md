# Fichaje — la vacante que se recluta sola

**Qué es:** una empresa pega la descripción de un puesto y en 60 segundos recibe:

1. **Aviso listo para publicar**, escrito para que la gente se postule.
2. **Guion de reel de 15 s** y posts para LinkedIn, Instagram y WhatsApp.
3. **Un link de postulación con entrevistador propio**: el candidato responde 5–7 preguntas desde el celular (sin CV, sin registrarse).
4. **Ranking automático**: cada postulante llega con puntaje 0–100, veredicto (*Fichar ya · Entrevistar · En reserva · Descartado*), razones y alertas. Si falla un requisito excluyente, queda descartado.

**Lo nuevo:** el aviso ya no pide un CV, pide pruebas. Cada vacante trae su propia preselección y el producto junta las tres empresas: el criterio de reclutamiento de Elite Hunters, la IA de Rushy y el contenido de Yazak.

## Modelo de ingresos

| Plan | Precio (configurable) | Qué incluye |
|---|---|---|
| Gratis | US$ 0 | Kit completo + ranking; se ven completos los primeros 5 candidatos |
| Fichaje | `FICHAJE_PRICE` (US$ 29) por vacante | Candidatos ilimitados, contactos, respuestas, exportación CSV |
| Pro | `FICHAJE_PRO_PRICE` (US$ 149) por vacante | Lo anterior + un headhunter de Elite Hunters entrevista a los 5 mejores y entrega terna en 72 h |

El gancho de venta: a partir del 6.º postulante la empresa **ve** que hay candidatos "Fichar ya" pero bloqueados. Ese es el momento de pagar.
Cada vacante gratis es además **un lead calificado para Elite Hunters**: aparece en Demian OS como notificación (`fichaje.vacancy`) con el contacto de la empresa.

## Cómo cobrar (hoy, sin integrar nada)

1. Creá un **link de pago** en Mercado Pago ("Link de pago") o Stripe ("Payment Links") por US$ 29 y otro por US$ 149.
2. Cargá `FICHAJE_PAY_URL` y `FICHAJE_PRO_PAY_URL` en las variables del servidor (Render → Environment). Si todavía no tenés links, cargá solo `FICHAJE_WHATSAPP` y el botón abre tu WhatsApp con el pedido y el código de la vacante.
3. Cuando entra el pago, abrí **`/fichaje/admin`** (con tu sesión de Demian OS) y cambiá el plan de esa vacante a *Pagada* o *Pro*. Se desbloquea en el acto, en el mismo link del cliente.

> Hoy la confirmación del pago es **manual**: no hay webhook de Mercado Pago/Stripe conectado. Es lo próximo que conviene automatizar cuando haya ventas.

## Direcciones

- `/fichaje`: landing + alta de vacante
- `/v/<código>`: postulación (lo que se comparte)
- `/v/<código>/panel#k=<llave>`: panel privado de la empresa (la llave va después del `#` y no viaja en los registros)
- `/fichaje/admin`: tu caja (vacantes, contactos, quién está listo para pagar, cambio de plan)

## Plan de las primeras 24 horas

1. **Desplegar** (el mismo servicio de Render; no hay que tocar nada más) y cargar `FICHAJE_WHATSAPP` o los links de pago.
2. **Crear 3 vacantes reales** de clientes actuales de Elite Hunters y mandarles el panel ya armado:
   > "Hola {nombre}! Te armé la búsqueda de {puesto} con un entrevistador automático. Compartí este link y te ordena a los candidatos solo: {link}. Los primeros 5 son gratis."
3. **20 mensajes a empresas que estén publicando avisos hoy** (LinkedIn, grupos de empleo locales, Computrabajo/Bumeran): "Vi que buscan {puesto}. Te armé gratis el aviso + un link que filtra a los candidatos. ¿Te lo paso?". Creás la vacante vos y les mandás el panel.
4. **Yazak publica un reel** con el guion que genera Fichaje para una vacante real: muestra el producto funcionando.
5. **A la noche**, en `/fichaje/admin` filtrá las vacantes con más de 5 candidatos y escribiles con el botón de WhatsApp (el mensaje ya viene armado con la cantidad de candidatos).

Meta realista del día 1: 10–20 vacantes creadas, 1–3 pagos. No hay garantía: depende de que el link llegue a empresas que estén contratando ahora.

## IA y costos

- Con `ANTHROPIC_API_KEY`: el kit lo escribe Claude (modelo `WORKER_MODEL`) y el puntaje lo hace `LIGHT_MODEL`. El gasto se registra en el mismo control de gasto de Demian OS y respeta los límites diario/mensual.
- Sin clave, o si se alcanza el límite: plantillas y reglas deterministas. El producto **nunca se cae** por falta de IA.
- Protección contra abuso: límite por IP (6 vacantes/h, 20 postulaciones/h), trampa anti-bots y tope diario `FICHAJE_LLM_DAILY`.
