# Two Glass · Registro de causas

Prototipos del equipo **TeamGlass** (Proyecto Integrador I, Pontificia Universidad Javeriana Cali) para el reto de Two Glass S.A.S. BIC:

> ¿Cómo podríamos reducir los errores en el estampado de envases de vidrio y plástico de Two Glass, teniendo en cuenta que entre el 1 % y el 10 % de los envases producidos presentan defectos?

La idea priorizada es una plataforma para que el operario registre cada defecto con su causa (categorías 6M del diagrama de Ishikawa) en el momento en que ocurre, y para que la gerencia vea el Pareto de las causas más frecuentes.

## Los tres niveles

| Nivel | Qué es | Dónde está |
|---|---|---|
| **Bajo** | Kit en papel (pantalla de TV, tarjetas de causas para recortar, hoja de verificación para la planta y formato para las pruebas con usuarios) + un script que crea el Google Form con su hoja de Pareto. | `prototipos/nivel-bajo/` |
| **Medio** | Prototipo navegable en un solo archivo HTML, con datos de ejemplo y sin base de datos. Incluye una pestaña que mide el tiempo y los toques de cada registro durante las pruebas con usuarios. | `public/prototipos/nivel-medio.html` (publicado en `/prototipos/nivel-medio.html`) |
| **Alto** | Plataforma funcional: Next.js + MongoDB Atlas, desplegada en Vercel. | Todo el resto del repositorio |

## Qué hace la plataforma (nivel alto)

Al entrar, el usuario decide la interfaz:

- **Gerencia** (`angelica`): resumen con % de envases con defecto frente a la meta de 1 % a 5 %, Pareto de causas, defectos por día y por categoría 6M; tablero de trabajos (en producción, en cola y terminados) para crear pedidos con su boceto; registros con descarga a Excel (CSV), y reporte del día para compartir por WhatsApp. Funciona en computador, tablet y celular (Windows, iOS y Android).
- **Producción** (`diego`, `joshua`): pantalla pensada para el portátil conectado por HDMI al televisor del taller. Muestra el boceto, los datos del trabajo (cliente, envase, material, tinta, técnica, unidades), el avance, las indicaciones de gerencia y **lo que falló antes en trabajos parecidos** (mismo material, misma tinta, envase con relieve, misma técnica o mismo cliente), con una recomendación por causa. Se registra un defecto en dos toques: categoría 6M y causa. También funciona con el teclado: teclas 1 a 6, y luego el número de la causa. Se actualiza sola cada 12 segundos.

## Desplegar (gratis): GitHub + MongoDB Atlas + Vercel

### 1. Subir el código a GitHub
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
2. **Database Access**: usa el usuario de la base de datos. Si su contraseña quedó visible en algún lado, cámbiala aquí (*Edit → Edit Password*).
3. **Connect → Drivers → Node.js**: copia la cadena `mongodb+srv://...` y reemplaza `<db_password>` por la contraseña.

### 3. Publicar en Vercel (plan Hobby gratis)
1. Entra a vercel.com con tu cuenta de GitHub → *Add New → Project* → elige `twoglass-registro-6m`.
2. En *Environment Variables* agrega:
   | Nombre | Valor |
   |---|---|
   | `MONGODB_URI` | la cadena de Atlas |
   | `MONGODB_DB` | `twoglass` |
   | `SESSION_SECRET` | una clave larga y aleatoria (32 caracteres o más) |
3. *Deploy*. Cada vez que hagan `git push`, Vercel publica la nueva versión sola.

### 4. Primer uso
Abre `https://TU-PROYECTO.vercel.app/configurar`, escribe la contraseña de Angélica, Diego y Joshua y marca si quieres **datos de prueba** (clientes ficticios marcados como «prueba», para mostrar la plataforma). Esa página se bloquea después del primer uso. Los datos de prueba se borran con un botón desde Gerencia → Resumen.

### En el taller
- En el portátil del televisor, entra con `diego` o `joshua` y pon pantalla completa (botón arriba a la derecha o F11). La sesión de producción dura 30 días.
- En el celular (Android o iPhone), Angélica puede usar «Agregar a pantalla de inicio» para abrirla como una app.

## Probar en un computador sin MongoDB

Desde PowerShell, abre la carpeta del proyecto y ejecuta:

```bash
cd "C:\Users\nicol\OneDrive\Desktop\twoglass-registro-6m\twoglass-registro-6m"
npm ci
$env:MONGODB_URI = "memoria"
npm run dev
```

Cuando aparezca que el servidor está listo, abre http://localhost:3000/configurar. Crea las contraseñas de Angélica, Diego y Joshua; puedes dejar marcada la opción de datos de prueba. Después inicia sesión en http://localhost:3000.

La variable `MONGODB_URI` solo se configura en esa ventana de PowerShell. Los datos de prueba quedan guardados localmente en `.data/memdb.json` y se conservan al reiniciar el servidor. Para detenerlo, pulsa `Ctrl+C` en la terminal. Este modo es solo para desarrollo local; no sirve en Vercel.

En macOS, Linux o Git Bash, ejecuta `npm ci` y luego `MONGODB_URI=memoria npm run dev`.

Si alguien olvida su contraseña:
```bash
node --env-file=.env.local scripts/cambiar-clave.mjs diego NuevaClave123
```

## Cómo está hecho

```
app/                 páginas y API (Next.js App Router)
  page.js            ingreso (el usuario decide la interfaz)
  configurar/        primer uso
  gerencia/          Resumen, Trabajos, Registros, Reporte
  produccion/        pantalla de TV
  api/               rutas: trabajos, defectos, avances, resumen, exportar…
components/          logo, íconos 6M, gráficos (Pareto en SVG), utilidades
lib/
  catalogo.js        categorías 6M, las 18 causas del Ishikawa, materiales, tintas
  calculos.js        Pareto, indicadores y «trabajos parecidos»
  datos.js           acceso a MongoDB
  semilla.js         datos de prueba
middleware.js        separa Gerencia y Producción según el rol
```

Colecciones en MongoDB: `usuarios`, `trabajos`, `bocetos` (imagen del arte), `defectos` (un registro por causa, con cantidad y si fue reproceso o descarte), `avances` (unidades buenas) y `contadores`.

Para cambiar o agregar causas, se edita `lib/catalogo.js`.

## Notas
- La identidad visual (colores, tipografía Quicksand y logo) se tomó de twoglass.co.
- Los gráficos usan un solo eje: las barras muestran el % de cada causa y la línea, el % acumulado.
- Los tiempos meta (menos de 30 s y máximo 3 toques) son una propuesta del equipo para validar con los operarios.
- Las recomendaciones que aparecen junto a cada causa son sugerencias del equipo, y hay que validarlas con Two Glass.
