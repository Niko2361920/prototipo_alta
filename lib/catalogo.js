// Catálogo de la plataforma: categorías 6M, causas del Ishikawa del equipo,
// tipos de defecto, materiales, tintas y máquinas de Two Glass.
// Si la empresa cambia o agrega causas, se editan aquí y todo lo demás se ajusta solo.

export const CATEGORIAS = [
  { id: 'mano_obra', nombre: 'Mano de obra', tecla: '1' },
  { id: 'medio_ambiente', nombre: 'Medio ambiente', tecla: '2' },
  { id: 'maquinaria', nombre: 'Maquinaria', tecla: '3' },
  { id: 'materia_prima', nombre: 'Materia prima', tecla: '4' },
  { id: 'metodo', nombre: 'Método', tecla: '5' },
  { id: 'medicion', nombre: 'Medición', tecla: '6' },
];

// Las 18 causas del diagrama de Ishikawa (Apéndice B de la bitácora).
// marca: 'prioritaria' = señalada para registrar primero; 'hipotesis' = por validar con los operarios.
// consejo: recomendación que ve producción cuando la causa aparece en trabajos parecidos.
export const CAUSAS = [
  { id: 'tinta_corrida', categoria: 'mano_obra', nombre: 'Tinta corrida o derramada al manipular', corto: 'Tinta corrida al manipular', marca: 'prioritaria',
    consejo: 'Dejar secar antes de mover las piezas y manipular con guantes limpios.' },
  { id: 'limpieza_sin_reportar', categoria: 'mano_obra', nombre: 'Limpieza y reproceso sin reportar', corto: 'Reproceso sin reportar',
    consejo: 'Si se limpia y se vuelve a estampar, registrarlo como reproceso.' },
  { id: 'presion_entrega', categoria: 'mano_obra', nombre: 'Presión por entregar la producción', corto: 'Presión por entregar', marca: 'hipotesis',
    consejo: 'Si el tiempo no alcanza, avisar a gerencia antes de saltarse la prueba.' },
  { id: 'temor_reportar', categoria: 'mano_obra', nombre: 'Temor a reportar errores', corto: 'Temor a reportar', marca: 'hipotesis',
    consejo: 'Registrar no es castigo: los datos sirven para decidir dónde mejorar.' },

  { id: 'polvo_avenida', categoria: 'medio_ambiente', nombre: 'Polvo de la avenida principal', corto: 'Polvo de la avenida', marca: 'prioritaria',
    consejo: 'Cerrar la puerta a la avenida y limpiar el envase antes de estampar.' },
  { id: 'particulas_cortadora', categoria: 'medio_ambiente', nombre: 'Partículas de la cortadora de vidrio', corto: 'Partículas de la cortadora', marca: 'prioritaria',
    consejo: 'No usar la cortadora mientras se estampa y limpiar la mesa antes del lote.' },
  { id: 'espacio_reducido', categoria: 'medio_ambiente', nombre: 'Espacio reducido de trabajo', corto: 'Espacio reducido',
    consejo: 'Despejar la mesa y dejar un lugar fijo para las piezas recién estampadas.' },

  { id: 'maquinas_uso', categoria: 'maquinaria', nombre: 'Dos máquinas con años de uso', corto: 'Máquinas con años de uso',
    consejo: 'Revisar ajuste y desgaste de la máquina antes de empezar el lote.' },
  { id: 'carga_manual', categoria: 'maquinaria', nombre: 'Carga manual, unidad por unidad', corto: 'Carga manual',
    consejo: 'Usar la guía de posición y revisar la alineación cada cierto número de piezas.' },
  { id: 'desajuste', categoria: 'maquinaria', nombre: 'Desajuste de la máquina', corto: 'Desajuste de la máquina', marca: 'hipotesis',
    consejo: 'Verificar el registro con una pieza de prueba antes de seguir.' },

  { id: 'relieve_no_adhiere', categoria: 'materia_prima', nombre: 'Envases con relieve: la tinta no adhiere', corto: 'Relieve: no adhiere',
    consejo: 'Hacer prueba de adhesión con cinta en una pieza del cliente antes del lote.' },
  { id: 'tinta_ataca', categoria: 'materia_prima', nombre: 'Tinta fuerte que ataca el plástico', corto: 'Tinta ataca el plástico',
    consejo: 'Probar la tinta en una pieza del cliente antes de producir.' },

  { id: 'registro_whatsapp', categoria: 'metodo', nombre: 'Registro informal en WhatsApp Business', corto: 'Registro solo en WhatsApp',
    consejo: 'Registrar el defecto aquí, además de avisar por WhatsApp.' },
  { id: 'prueba_opcional', categoria: 'metodo', nombre: 'Prueba de impresión opcional', corto: 'Sin prueba de impresión',
    consejo: 'Hacer y aprobar la prueba de impresión antes de producir: es la referencia del lote.' },
  { id: 'tecnica_inadecuada', categoria: 'metodo', nombre: 'Técnica inadecuada para el envase', corto: 'Técnica inadecuada', marca: 'hipotesis',
    consejo: 'Confirmar con gerencia si la técnica es la adecuada para este envase.' },

  { id: 'sin_indicadores', categoria: 'medicion', nombre: 'Sin indicadores de defectos', corto: 'Sin indicadores',
    consejo: 'Registrar cada defecto para que la gerencia vea la tendencia.' },
  { id: 'inspeccion_ojo', categoria: 'medicion', nombre: 'Inspección «a ojo»', corto: 'Inspección «a ojo»',
    consejo: 'Comparar cada pieza contra la prueba aprobada, no de memoria.' },
  { id: 'no_registro', categoria: 'medicion', nombre: 'No se registran las causas', corto: 'Causa sin registrar',
    consejo: 'Registrar la causa en el momento en que ocurre.' },
];

export const TIPOS_DEFECTO = [
  'Tinta corrida o derramada',
  'Polvo o partículas',
  'Tinta no adhiere',
  'Tinta ataca el plástico',
  'Desalineado',
  'Exceso o falta de tinta',
  'Impresión incompleta',
  'Otro',
];

export const ACCIONES = [
  { id: 'reproceso', nombre: 'Reproceso' },
  { id: 'descarte', nombre: 'Descarte' },
];

export const MATERIALES = ['Vidrio', 'Plástico PET', 'Plástico PP', 'Plástico PEAD', 'Otro'];
export const FORMAS = ['Cilíndrico', 'Cónico', 'Cuadrado', 'Ovalado', 'Irregular'];
export const TECNICAS = [
  { id: 'serigrafia', nombre: 'Serigrafía', maquina: 'Serigrafía Screen' },
  { id: 'tampografia', nombre: 'Tampografía', maquina: 'Tampografía SP-824SC' },
];
export const TIPOS_TINTA = ['UV', 'Solvente', 'Catalizada (2 componentes)', 'Base agua', 'Otra'];

export const ESTADOS = [
  { id: 'en_proceso', nombre: 'En producción' },
  { id: 'pendiente', nombre: 'En cola' },
  { id: 'pausado', nombre: 'Pausado' },
  { id: 'terminado', nombre: 'Terminado' },
];

// Usuarios de la empresa. El rol decide qué interfaz se abre al entrar.
export const USUARIOS_BASE = [
  { usuario: 'angelica', nombre: 'Angélica Alejo Aguilar', corto: 'Angélica', rol: 'gerente' },
  { usuario: 'diego', nombre: 'Diego', corto: 'Diego', rol: 'produccion' },
  { usuario: 'joshua', nombre: 'Joshua', corto: 'Joshua', rol: 'produccion' },
];

// Meta de merma de la empresa: 1 % a 5 % (en lotes grandes el cliente puede fijar cerca de 10 %).
export const META_MERMA = 5;

export const categoriaPorId = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));
export const causaPorId = Object.fromEntries(CAUSAS.map((c) => [c.id, c]));
export const causasDe = (categoriaId) => CAUSAS.filter((c) => c.categoria === categoriaId);
export const tecnicaPorId = Object.fromEntries(TECNICAS.map((t) => [t.id, t]));
export const nombreUsuario = (u) => USUARIOS_BASE.find((x) => x.usuario === u)?.corto || u;
