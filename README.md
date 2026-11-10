# Two Glass · Registro de causas

Prototipos del equipo **TeamGlass** (Proyecto Integrador I, Pontificia Universidad Javeriana Cali) para el reto de Two Glass S.A.S. BIC:

> ¿Cómo podríamos reducir los errores en el estampado de envases de vidrio y plástico de Two Glass, teniendo en cuenta que entre el 1 % y el 10 % de los envases producidos presentan defectos?

La idea priorizada es una plataforma para que el operario registre cada defecto con su causa (categorías 6M del diagrama de Ishikawa) en el momento en que ocurre, y para que la gerencia vea el Pareto de las causas más frecuentes.

## Los tres niveles

| Nivel | Qué es | Dónde está |
|---|---|---|
| **Bajo** | Kit en papel (pantalla de TV, tarjetas de causas para recortar, hoja de verificación para la planta y formato para las pruebas con usuarios) + un script que crea el Google Form con su hoja de Pareto. | Fuera de este repositorio (carpeta del equipo) |
| **Medio** | Prototipo navegable en un solo archivo HTML, con datos de ejemplo y sin base de datos. Incluye una pestaña que mide el tiempo y los toques de cada registro durante las pruebas con usuarios. | `public/prototipos/nivel-medio.html` (publicado en `/prototipos/nivel-medio.html`) |
| **Alto** | Plataforma funcional: Next.js + MongoDB Atlas, desplegada en Vercel. | Todo el resto del repositorio |

## Qué hace la plataforma (nivel alto)

Al entrar, cada persona toca su tarjeta en «¿Quién eres?», escribe su contraseña y la plataforma abre la interfaz de su rol. Funciona en computador, tablet y celular (Windows, iOS y Android).

### Gerencia (`angelica` y las cuentas de gerencia que se creen)
- **Resumen**: % de envases con defecto frente a la meta de 1 % a 5 %, Pareto de causas, defectos por día y por categoría 6M.
- **Trabajos**: tablero (en producción, en cola y terminados) para crear pedidos con su boceto.
- **Registros**: cada defecto registrado, con descarga a Excel (CSV).
- **Inventario**: qué hay de cada material para trabajar (la tinta por tipo **y color**), cuánto necesitan los trabajos en producción y en cola (con su merma), cuánto queda después, el mínimo y cuántos días dura con el consumo de los últimos 30 días. Avisa qué trabajo no tiene material o espera envases del cliente. **Al terminar un trabajo se descuenta solo** lo que se gastó: tinta (piezas × colores × gramos por pieza), catalizador, una plancha por color, PRIME si es PET y diluyente. Con «Corregir» se pone lo que se midió de verdad y la app ajusta los gramos por pieza. En «Ajustes» se cambian los mínimos, si cada tinta se mide en kg o en L y cuánto se gasta por pieza.
- **Reporte**, con dos vistas:
  - *Del día*: resumen para compartir por WhatsApp, copiar o imprimir.
  - *Del mes · materia prima*: se registra cuándo llegan los envases del cliente y las compras y consumos de tinta, catalizador, PRIME, diluyente, emulsión y planchas. Se filtra por mes y por cliente, y muestra unidades buenas, defectos, envases recibidos y usados, tinta consumida, lo que entró, salió y queda (inventario), los últimos 6 meses, un estimado a 12 meses para presupuestar y la línea de tiempo de cada trabajo (llegada de envases → inicio → fin). Se puede imprimir. Los envases usados no se registran a mano: salen de buenas + descartes.
- **Usuarios**: cuentas de la plataforma, solicitudes de «Olvidé mi contraseña», cambiar contraseñas y eliminar cuentas.

### Producción (`diego`, `joshua` y las cuentas de producción que se creen)
Pantalla pensada para el portátil conectado por HDMI al televisor del taller. Muestra el boceto, los datos del trabajo (cliente, envase, material, tinta, técnica, unidades), el avance, las indicaciones de gerencia y **lo que falló antes en trabajos parecidos** (mismo material, misma tinta, envase con relieve, misma técnica o mismo cliente), con una recomendación por causa. Se registra un defecto en dos toques: categoría 6M y causa. También funciona con el teclado: teclas 1 a 6, y luego el número de la causa. Se actualiza sola cada 12 segundos.

### Usuarios y contraseñas
- **Crear cuenta** (en la pantalla de ingreso): cualquiera puede crear una cuenta de producción; para una de gerencia hace falta el código de gerencia (`CODIGO_GERENCIA`).
- Cada cuenta nueva aparece como tarjeta en «¿Quién eres?», igual que Angélica, Diego y Joshua. Las de producción también salen en el selector «Registra» de la pantalla del televisor.
- La **×** de cada tarjeta la quita **solo de ese dispositivo** (se guarda en el navegador); «Mostrar todos» la devuelve. Para borrar una cuenta de verdad: **Gerencia → Usuarios**.
- **¿Olvidaste tu contraseña?** No hay correo, así que funciona de dos maneras:
  - *Pedirle a gerencia*: la persona escribe su usuario y la solicitud aparece en **Gerencia → Usuarios**. La gerente le pone una contraseña nueva con el botón «Contraseña» y se la dice en persona.
  - *Tengo el código de gerencia*: con el código se pone una contraseña nueva a cualquier cuenta. Es la salida si la que olvidó la clave es la gerente.
- También se puede desde la terminal (con `MONGODB_URI` en `.env.local`):
  ```bash
  node --env-file=.env.local scripts/cambiar-clave.mjs diego NuevaClave123
  ```

## Desplegar (gratis): GitHub + MongoDB Atlas + Vercel

### 1. Subir el código a GitHub
**Si el repositorio ya existe** (actualizar a una versión nueva): copia los archivos del proyecto encima de los de tu copia del repositorio (sin borrar la carpeta `.git`) y ejecuta:
```bash
git add .
git commit -m "Describe aquí el cambio"
git push
```
Vercel publica la versión nueva solo, en uno o dos minutos.

**Si es la primera vez:**
1. En GitHub crea un repositorio vacío llamado `twoglass-registro-6m` (sin README).
2. Descomprime el proyecto y, dentro de la carpeta, ejecuta:
   ```bash
   git init
   git add .
   git commit -m "Plataforma de registro de causas 6M (nivel alto) y prototipos"
   git remote add origin https://github.com/Niko2361920/twoglass-registro-6m.git
   git branch -M main
   git push -u origin main
   ```

### 2. Preparar MongoDB Atlas (plan gratis M0)
1. **Network Access** → *Add IP Address* → `0.0.0.0/0` (Vercel no tiene una IP fija).
2. **Database Access**: crea un usuario solo para la app (`twoglass_app`, rol `readWrite` sobre la base `twoglass`) y úsalo en la cadena, no el administrador. Si alguna contraseña quedó visible en algún lado, cámbiala aquí (*Edit → Edit Password*).
3. **Connect → Drivers → Node.js**: copia la cadena `mongodb+srv://...` y reemplaza `<db_password>` por la contraseña.

### 3. Publicar en Vercel (plan Hobby gratis)
1. Entra a vercel.com con tu cuenta de GitHub → *Add New → Project* → elige `twoglass-registro-6m`.
2. En *Environment Variables* agrega:
   | Nombre | Valor |
   |---|---|
   | `MONGODB_URI` | la cadena de Atlas |
   | `MONGODB_DB` | `twoglass` |
   | `SESSION_SECRET` | una clave larga y aleatoria (32 caracteres o más) |
   | `CODIGO_GERENCIA` | código de 8 caracteres o más. Sin él no se pueden crear cuentas de gerencia ni usar «Tengo el código de gerencia». No lo escribas en el código ni en este README. |
3. *Deploy*. Cada vez que hagan `git push`, Vercel publica la nueva versión sola.
4. Si cambias o agregas una variable, hay que **volver a desplegar** (*Deployments → ⋯ → Redeploy*): las variables solo aplican en despliegues nuevos.

### Si Vercel no conecta a MongoDB
Abre `https://TU-PROYECTO.vercel.app/api/salud`. Revisa paso a paso las variables, la conexión y la escritura, y dice la causa probable y qué hacer. No muestra la cadena, el usuario ni la contraseña. Las mismas explicaciones salen en la pantalla de ingreso y en `/configurar`; el error completo queda en *Deployments → Logs*.

| Lo que dice `/api/salud` | Qué hacer |
|---|---|
| Falta la variable MONGODB_URI | Agregarla en Vercel (marcar *Production*) y redesplegar. |
| No se pudo llegar al cluster | Atlas → *Network Access* → agregar `0.0.0.0/0`. Revisar que el cluster no esté pausado. |
| Atlas rechazó el usuario o la contraseña | La contraseña de la cadena no es la actual (por ejemplo, después de cambiarla). Actualizarla en Vercel y redesplegar. |
| Ya existe la base «TwoGlass»… | MongoDB no permite `twoglass` y `TwoGlass` a la vez. Borrar la que sobra o poner `MONGODB_DB` con el nombre exacto que ya existe. |
| No tiene permiso sobre la base | Darle al usuario de la app el rol `readWrite` sobre la misma base de `MONGODB_DB`. |
| La cadena está mal escrita | Quitar comillas o espacios. Si la contraseña tiene símbolos, cambiarla por una solo con letras y números. |

### 4. Primer uso
Abre `https://TU-PROYECTO.vercel.app/configurar`, escribe la contraseña de Angélica, Diego y Joshua y marca si quieres **datos de prueba** (trabajos, defectos y materia prima de clientes ficticios, marcados como «prueba», para mostrar la plataforma). Esa página se bloquea después del primer uso. Los datos de prueba se borran con un botón desde Gerencia → Resumen. Las demás cuentas se crean después desde **Crear cuenta**.

### En el taller
- En el portátil del televisor, entra con `diego` o `joshua` y pon pantalla completa (botón arriba a la derecha o F11). La sesión de producción dura 30 días.
- En el celular (Android o iPhone), gerencia puede usar «Agregar a pantalla de inicio» para abrirla como una app.
- Cuando lleguen envases o se compre material: Gerencia → **Inventario** → «Registrar entrada» (o el **+** de cada material). Se puede escribir en g o kg, ml o L: la app convierte sola.
- Lo que se gasta en los trabajos no se anota: se descuenta solo al terminar el trabajo.

## Probar en un computador sin MongoDB

1. En la carpeta del proyecto (la que tiene `package.json`) crea un archivo `.env.local` con lo siguiente. Git no lo sube a GitHub.
   ```
   MONGODB_URI=memoria
   CODIGO_GERENCIA=el-codigo-de-gerencia
   ```
2. Abre esa carpeta en PowerShell y ejecuta:
   ```bash
   npm ci
   npm run dev
   ```

Cuando aparezca que el servidor está listo, abre http://localhost:3000/configurar. Crea las contraseñas de Angélica, Diego y Joshua; puedes dejar marcada la opción de datos de prueba. Después inicia sesión en http://localhost:3000.

Los datos de prueba quedan guardados localmente en `.data/memdb.json` y se conservan al reiniciar el servidor. Para detenerlo, pulsa `Ctrl+C` en la terminal. Este modo es solo para desarrollo local; no sirve en Vercel.

Los mismos comandos sirven en macOS, Linux y Git Bash.

## Cómo está hecho

```
app/                 páginas y API (Next.js App Router)
  page.js            ingreso (tarjetas «¿Quién eres?»)
  configurar/        primer uso
  registro/          crear cuenta
  recuperar/         olvidé mi contraseña
  gerencia/          Resumen, Trabajos, Registros, Inventario, Reporte (día y mes), Usuarios
  produccion/        pantalla de TV
  api/               rutas: trabajos, defectos, avances, resumen, mensual,
                     materia, inventario, usuarios, clave, exportar…
components/          logo, íconos 6M, gráficos (Pareto en SVG), utilidades
lib/
  catalogo.js        categorías 6M, las 18 causas del Ishikawa, materiales, tintas, insumos
  calculos.js        Pareto, indicadores y «trabajos parecidos»
  datos.js           acceso a MongoDB (trabajos, defectos, avances)
  materia.js         materia prima y reporte mensual
  inventario.js      existencias, ¿alcanza para la cola?, consumo automático, unidades
  usuarios.js        utilidades de cuentas y del código de gerencia
  semilla.js         datos de prueba
middleware.js        separa Gerencia y Producción según el rol
```

Colecciones en MongoDB: `usuarios`, `trabajos`, `bocetos` (imagen del arte), `defectos` (un registro por causa, con cantidad y si fue reproceso o descarte), `avances` (unidades buenas), `materia` (entradas y consumos de materia prima), `solicitudes_clave` (olvidé mi contraseña), `config` (ajustes del inventario), `reportes` (reportes del día guardados), `auditoria` (ingresos y cambios) y `contadores`.

Para cambiar o agregar causas o insumos, se edita `lib/catalogo.js`.

## Notas
- La identidad visual (colores, tipografía Quicksand y logo) se tomó de twoglass.co.
- Los gráficos usan un solo eje: las barras muestran el % de cada causa y la línea, el % acumulado.
- Los tiempos meta (menos de 30 s y máximo 3 toques) son una propuesta del equipo para validar con los operarios.
- Las recomendaciones que aparecen junto a cada causa son sugerencias del equipo, y hay que validarlas con Two Glass.
- El gasto de tinta (1,5 g por color y pieza), el catalizador (10 %), el PRIME (2 ml por pieza) y el diluyente (0,3 L por trabajo) son supuestos del equipo. Hay que validarlos con Diego y Joshua; se cambian en Inventario → Ajustes.

## Siguientes módulos (propuesta)
- Ficha de montaje: guardar cómo se montó un trabajo que salió bien y mostrarlo cuando el cliente repite.
- Fotos de evidencia desde producción (prueba aprobada, defectos raros).
- Acta de entrega por trabajo: envases recibidos, buenas entregadas, merma y sobrantes devueltos.
- Costos: precio de cada insumo para ver el costo de materia prima por trabajo y por cliente.

## Decisiones

**10 nov 2026 · inventario**
- El inventario no tiene tabla propia: se calcula de `materia` (entradas − consumos) → no se desincroniza. Las tintas se cuentan por tipo y color (`insumo|Color`), porque tener tinta UV negra no sirve para un trabajo dorado.
- Consumo automático al pasar un trabajo a «terminado» (en `actualizarTrabajo`, el único lugar donde cambia el estado). Piezas estampadas = buenas + todos los defectos, porque la reprocesada se estampó dos veces. Si el trabajo se reabre o se borra, se quita su consumo automático.
- «Corregir» ajusta los g por pieza con el promedio entre lo que había y lo medido → se acerca sin saltar por una sola medida rara.
- Cada material se guarda en una sola unidad base (kg, L o unid.); al registrar se puede escribir g o ml y se convierte. Cambiar una tinta de kg a L solo se permite si no tiene registros, para no mezclar unidades (no se sabe la densidad).
- «¿Alcanza para la cola?» reparte el material en orden: primero lo que está en producción, luego pausado y después la cola. Así el aviso dice qué trabajo es el primero que se queda sin material.
- Si el inventario da negativo es porque se gastó más de lo que se registró como entrada; se muestra como aviso en vez de esconderlo.

**10 nov 2026**
- Materia prima como movimientos (entrada / consumo) en una sola colección → el inventario es entradas − consumos, sin otra tabla que se desincronice. Contra: si nadie registra los consumos, el inventario queda alto; por eso el reporte muestra el estimado solo con los meses que tienen registros.
- Los envases son del cliente: solo se registra su llegada; lo usado sale de producción (buenas + descartes), para no pedirle a nadie que lo cuente dos veces.
- El reporte mensual va dentro de «Reporte» (Del día / Del mes) y no como sección nueva → la barra del celular ya tiene 5 botones.
- Lo registra gerencia, no producción → la pantalla del televisor se mantiene en dos toques. Queda como siguiente paso que producción marque el consumo de tinta al terminar un trabajo.
- El registro de defectos acepta como operario cualquier cuenta existente (antes solo diego, joshua y angelica), para que cuenten los operarios nuevos.

**9 nov 2026**
- `/api/usuarios` (GET) es pública → la pantalla de ingreso necesita la lista antes de iniciar sesión. Solo da usuario, nombre y rol. Contra: cualquiera ve los nombres de usuario; ya pasaba con las 3 tarjetas fijas.
- «Olvidé mi contraseña» sin correo → la empresa no usa correo con los operarios. La solicitud responde igual exista o no el usuario, y tiene límite de 10 por hora por IP. El restablecer con código comparte el límite de 5 fallos por hora con el registro de gerencia.
- Quitar una tarjeta es local (localStorage) y no borra la cuenta → cualquiera en el taller puede tocar la ×; borrar de verdad queda solo para gerencia. No se puede borrar la cuenta propia ni la última de gerencia; los registros de esa persona se conservan.
- Cambiar una contraseña no cierra las sesiones abiertas (la sesión es un JWT sin estado); vencen solas (7 días gerencia, 30 producción).

**26 oct 2026**
- `/api/salud` es pública → hace falta antes de que exista algún usuario. Por eso solo muestra sí/no y la causa, nunca la cadena ni el host. Se descartó protegerla con sesión porque el fallo más común (no hay conexión) impide iniciar sesión.
- Los errores de MongoDB se traducen en `lib/mongo-config.js` → el driver solo dice «Server selection timed out» o «bad auth», y la pantalla mostraba «No hay conexión» sin la causa.
- El error de mayúsculas y el de permisos ya no se esconden al crear los índices → antes se ignoraban y la app fallaba después, al guardar.
- Límite de ingreso: 5 fallos por usuario y 20 por IP en 15 minutos, contados en `auditoria` → no hace falta otra colección. Contra: alguien puede bloquear 15 minutos una cuenta a propósito. Se descartó contar solo por IP porque, cambiando de IP, se podría seguir probando claves.
- Bocetos SVG con `Content-Security-Policy: sandbox` y `nosniff` → un SVG con script no se ejecuta aunque alguien abra la URL directamente.
- PostCSS (aviso de `npm audit`, GHSA-qx2v-qp2m-jg93) no se cambió en esta versión → no se pudo instalar ni probar el build aquí. Corre en el build sobre CSS propio, así que el riesgo es bajo.
