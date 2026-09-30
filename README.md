# TextHuman Hub

Hub web sin IA con 43 herramientas de PDF, imagen, audio, video, texto y desarrollo. Las conversiones se ejecutan en el navegador. Cloudflare Worker aplica límites, registra usos, conecta cuentas, soporte y cobros; Supabase guarda usuarios y métricas.

## Ejecutar en local

1. `npm install --cache ./work/npm-cache`
2. Copia `.env.example` a `.env.local` y `.dev.vars.example` a `.dev.vars`. Sustituye los valores `YOUR_*` cuando tengas las cuentas.
3. Ejecuta `supabase/schema.sql` en el editor SQL de Supabase. Activa confirmación por email y añade `http://localhost:5173/restablecer` y el futuro dominio a las URLs permitidas de Auth.
4. En una terminal, `npm run dev`; en otra, `npx wrangler dev --port 8787`. Abre `http://localhost:5173`.

Las herramientas de texto y desarrollo funcionan antes de configurar servicios. Las tareas con archivos necesitan cuenta y Worker para aplicar límites de forma fiable. El panel `/admin` lee los datos reales y solo permite acceso al correo guardado en `ADMIN_EMAIL` del Worker.

## Servicios y secretos

| Servicio | Uso | Variables |
|---|---|---|
| Supabase | Usuarios, recuperación por email, usos, pagos | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Mercado Pago | Suscripción semanal y mensual | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` |
| Resend | Formulario de soporte | `RESEND_API_KEY`, `SUPPORT_FROM_EMAIL` |
| Cloudflare Workers | Sitio y API | `APP_ORIGIN`, `ADMIN_EMAIL` |
| Google AdSense | Anuncios solo en páginas de herramientas | `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT` |

Los secretos del Worker se cargan con `npx wrangler secret put NOMBRE`; nunca coloques `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `RESEND_API_KEY` o `ADMIN_EMAIL` en variables `VITE_` ni en GitHub. `ADMIN_EMAIL` debe ser tu correo privado; nunca aparece en el sitio.

## Publicar

Cuando tengas dominio, establece `VITE_PUBLIC_ORIGIN=https://tu-dominio` y `APP_ORIGIN=https://tu-dominio`, ejecuta `npm run deploy` y registra `/api/mp-webhook` como Webhook de Mercado Pago para `subscription_preapproval` y `payment`. Supabase debe permitir el dominio y su ruta `/restablecer` como URL de redirección. El build crea 43 páginas HTML individuales, metadatos, schema.org, `robots.txt` y `sitemap.xml`; sin dominio deja la indexación desactivada para evitar URLs falsas. Luego añade el sitemap a Google Search Console y verifica la propiedad. La indexación y AdSense necesitan aprobación de Google; ningún código puede garantizarla.

El anuncio se muestra solo si se configuran un cliente y slot de AdSense reales. Debes aprobar la cuenta y cumplir las políticas de anuncios antes de activarlo. El código no almacena los archivos procesados.

## Límites y notas

Free: 2 tareas de archivos al día, máximo 5 MB. Pro: 100 tareas al día, máximo 50 MB. Las utilidades de texto y desarrollo son libres. Los límites se cobran al iniciar una tarea; si el navegador falla luego, ese intento cuenta. El panel muestra usuarios, Pro activos, usos, ingresos aprobados y los 100 usuarios recientes. No incluye gastos externos ni margen neto.

Los costos de los planes gratuitos de Cloudflare, Supabase, Resend o Mercado Pago dependen de sus límites, tarifas y uso real. No se puede prometer costo cero para siempre. No publiques hasta verificar en modo de prueba los pagos recurrentes, la recuperación por email y el webhook con tus cuentas reales.

El motor de audio y video incluye FFmpeg.wasm (`@ffmpeg/core`), que utiliza GPL-2.0-or-later. Por eso el código de este Hub se distribuye bajo GPL-2.0-or-later y el repositorio permanece público. La primera conversión de audio o video descarga el motor de unos 32 MB; puede tardar y consumir memoria en dispositivos pequeños.
