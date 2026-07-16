// ─────────────────────────────────────────────────────────────
// Opciones de feedback seleccionables (estrategia / calendario / contenido)
// + helper para combinar opciones elegidas + texto libre en una instrucción
// que entiende Eva (o el ajuste mock).
// ─────────────────────────────────────────────────────────────

export interface FeedbackOption {
  value: string;
  label: string;
  /** instrucción que se le pasa a Eva cuando se elige esta opción */
  instruction: string;
}

export const STRATEGY_FEEDBACK: FeedbackOption[] = [
  { value: "vendedora", label: "Más vendedora", instruction: "Hacela más vendedora y orientada a conversión." },
  { value: "emocional", label: "Más emocional", instruction: "Dale un tono más emocional y humano." },
  { value: "premium", label: "Más premium", instruction: "Subí el posicionamiento, que se sienta más premium." },
  { value: "cercana", label: "Más cercana", instruction: "Hacela más cercana y cálida." },
  { value: "divertida", label: "Más divertida", instruction: "Dale un tono más divertido y desenfadado." },
  { value: "profesional", label: "Más profesional", instruction: "Hacela más profesional y seria." },
  { value: "otro_publico", label: "Apuntar a otro público", instruction: "Reorientá la estrategia hacia otro público objetivo." },
  { value: "cambiar_tono", label: "Cambiar el tono", instruction: "Cambiá el tono de voz de la marca." },
  { value: "cambiar_canales", label: "Cambiar los canales", instruction: "Revisá y cambiá los canales recomendados." },
  { value: "cambiar_pilares", label: "Cambiar los pilares", instruction: "Replanteá los pilares de contenido." },
  { value: "mas_simple", label: "Más simple", instruction: "Hacela más simple y fácil de entender." },
  { value: "mas_agresiva", label: "Más agresiva comercialmente", instruction: "Hacela más agresiva comercialmente." },
];

/** Secciones editables de la vista resumida de estrategia (1 card = 1 ajuste). */
export type StrategySectionKey =
  | "brandPositioning"
  | "monthlyGoal"
  | "audienceSummary"
  | "toneOfVoice"
  | "channels"
  | "contentPillars"
  | "nextActions";

export const STRATEGY_SECTION_LABELS: Record<StrategySectionKey, string> = {
  brandPositioning: "Posicionamiento",
  monthlyGoal: "Objetivo del mes",
  audienceSummary: "Audiencia principal",
  toneOfVoice: "Tono de voz",
  channels: "Canales y CTA",
  contentPillars: "Pilares de contenido",
  nextActions: "Próximas acciones",
};

/** Tags de feedback contextual por card de estrategia. */
export const STRATEGY_SECTION_FEEDBACK: Record<StrategySectionKey, FeedbackOption[]> = {
  brandPositioning: [
    { value: "mas_premium", label: "Más premium", instruction: "Subí el posicionamiento: que se sienta más premium y diferenciado." },
    { value: "mas_cercano", label: "Más cercano", instruction: "Hacelo más cercano, humano y accesible." },
    { value: "mas_diferenciado", label: "Más diferenciado", instruction: "Destacá mejor qué hace única a la marca frente a la competencia." },
    { value: "mas_simple", label: "Más simple", instruction: "Simplificá el mensaje de posicionamiento, más claro y directo." },
    { value: "menos_generico", label: "Menos genérico", instruction: "Evitá frases genéricas; que suene específico de este negocio." },
    { value: "mas_emocional", label: "Más emocional", instruction: "Dale un ángulo más emocional y memorable." },
  ],
  monthlyGoal: [
    { value: "mas_ventas", label: "Más orientado a ventas", instruction: "Orientá el objetivo del mes hacia generar más ventas o consultas." },
    { value: "mas_visibilidad", label: "Más visibilidad", instruction: "Priorizá visibilidad y alcance como objetivo principal del mes." },
    { value: "mas_confianza", label: "Más confianza", instruction: "Enfocá el objetivo en construir confianza y credibilidad." },
    { value: "mas_ambicioso", label: "Más ambicioso", instruction: "Subí la ambición del objetivo, que inspire más acción." },
    { value: "mas_realista", label: "Más realista", instruction: "Hacé el objetivo más alcanzable y concreto para un mes." },
    { value: "cambiar_foco", label: "Cambiar el foco", instruction: "Replanteá el foco del mes con otro objetivo principal." },
  ],
  audienceSummary: [
    { value: "otro_publico", label: "Otro público", instruction: "Reorientá la audiencia hacia otro perfil de cliente." },
    { value: "mas_especifica", label: "Más específica", instruction: "Afiná la descripción: menos amplia, más concreta." },
    { value: "mas_amplia", label: "Más amplia", instruction: "Ampliá la audiencia sin perder claridad." },
    { value: "mas_joven", label: "Más joven", instruction: "Apuntá a un público más joven." },
    { value: "mas_dolores", label: "Más dolores / necesidades", instruction: "Incluí mejor los problemas o necesidades que resuelve el negocio." },
    { value: "menos_tecnica", label: "Menos técnica", instruction: "Usá un lenguaje menos técnico y más cotidiano." },
  ],
  toneOfVoice: [
    { value: "mas_calido", label: "Más cálido", instruction: "Hacé el tono más cálido y empático." },
    { value: "mas_profesional", label: "Más profesional", instruction: "Hacé el tono más profesional y serio." },
    { value: "mas_divertido", label: "Más divertido", instruction: "Dale un tono más divertido y desenfadado." },
    { value: "mas_formal", label: "Más formal", instruction: "Subí el nivel de formalidad del tono." },
    { value: "menos_vendedor", label: "Menos vendedor", instruction: "Bajá el tono comercial; más conversacional y menos pushy." },
    { value: "mas_cercano_publico", label: "Más cercano al público", instruction: "Que el tono hable como habla realmente el cliente ideal." },
  ],
  channels: [
    { value: "mas_instagram", label: "Más Instagram", instruction: "Priorizá Instagram entre los canales recomendados." },
    { value: "mas_tiktok", label: "Más TikTok", instruction: "Sumá o priorizá TikTok como canal." },
    { value: "menos_canales", label: "Menos canales", instruction: "Reducí la cantidad de canales; enfocate en los esenciales." },
    { value: "mas_whatsapp", label: "Más WhatsApp", instruction: "Incluí o priorizá WhatsApp como canal de conversión." },
    { value: "cambiar_cta", label: "Cambiar el CTA", instruction: "Proponé otro llamado a la acción principal." },
    { value: "cta_mas_directo", label: "CTA más directo", instruction: "Hacé el CTA más directo y orientado a la acción." },
  ],
  contentPillars: [
    { value: "menos_pilares", label: "Menos pilares", instruction: "Reducí la cantidad de pilares y consolidá los temas." },
    { value: "mas_educativo", label: "Más educativo", instruction: "Sumá o reforzá pilares educativos y de valor." },
    { value: "mas_vendedor", label: "Más vendedor", instruction: "Incluí pilares más orientados a venta y conversión." },
    { value: "mas_marca", label: "Más emocional / marca", instruction: "Reforzá pilares de marca, historia y conexión emocional." },
    { value: "replantejar", label: "Replantejar pilares", instruction: "Cambiá los nombres y enfoques de los pilares actuales." },
    { value: "mas_variedad", label: "Más variedad", instruction: "Ampliá la variedad de temas entre los pilares." },
  ],
  nextActions: [
    { value: "mas_accionables", label: "Más accionables", instruction: "Hacé las acciones más concretas y ejecutables esta semana." },
    { value: "corto_plazo", label: "Más corto plazo", instruction: "Priorizá acciones para los próximos 7 días." },
    { value: "menos_acciones", label: "Menos acciones", instruction: "Reducí la lista a las 2–3 acciones más importantes." },
    { value: "foco_contenido", label: "Más foco en contenido", instruction: "Orientá las acciones a crear y publicar contenido." },
    { value: "foco_ventas", label: "Más foco en ventas", instruction: "Orientá las acciones a generar consultas o ventas." },
    { value: "mas_simples", label: "Más simples", instruction: "Simplificá cada acción para que sea fácil de arrancar." },
  ],
};

/** Instrucción acotada a una sola sección de la estrategia. */
export function applyStrategySectionFeedback(
  section: StrategySectionKey,
  selectedValues: string[],
  customFeedback?: string
): string {
  const label = STRATEGY_SECTION_LABELS[section];
  const detail = applyStructuredFeedback(STRATEGY_SECTION_FEEDBACK[section], selectedValues, customFeedback);
  return `Ajustá únicamente la sección "${label}" de la estrategia. Mantené el resto igual salvo ajustes mínimos de coherencia. ${detail}`;
}

export const CALENDAR_FEEDBACK: FeedbackOption[] = [
  { value: "mas_vendedor", label: "Más contenido vendedor", instruction: "Sumá más publicaciones orientadas a venta." },
  { value: "mas_educativo", label: "Más contenido educativo", instruction: "Sumá más contenido educativo y de valor." },
  { value: "mas_emocional", label: "Más contenido emocional", instruction: "Sumá más contenido emocional y de marca." },
  { value: "mas_reels", label: "Más reels", instruction: "Aumentá la proporción de reels / video." },
  { value: "menos_reels", label: "Menos reels", instruction: "Reducí la proporción de reels / video." },
  { value: "mas_historias", label: "Más historias", instruction: "Sumá más historias (stories)." },
  { value: "foco_producto", label: "Más foco en producto", instruction: "Poné más foco en producto." },
  { value: "foco_marca", label: "Más foco en marca", instruction: "Poné más foco en marca." },
  { value: "mas_variedad", label: "Más variedad", instruction: "Variá más los formatos y temas." },
  { value: "cambiar_frecuencia", label: "Cambiar frecuencia", instruction: "Ajustá la frecuencia de publicación." },
  { value: "cambiar_canales", label: "Cambiar canales", instruction: "Cambiá los canales de las publicaciones." },
];

export const CONTENT_FEEDBACK: FeedbackOption[] = [
  { value: "mas_corto", label: "Más corto", instruction: "Hacelo más corto y directo." },
  { value: "mas_vendedor", label: "Más vendedor", instruction: "Hacelo más vendedor." },
  { value: "mas_emocional", label: "Más emocional", instruction: "Hacelo más emocional." },
  { value: "mas_premium", label: "Más premium", instruction: "Dale un tono más premium." },
  { value: "mas_simple", label: "Más simple", instruction: "Hacelo más simple y fácil de entender." },
  { value: "cambiar_tono", label: "Cambiar tono", instruction: "Cambiá el tono del texto." },
  { value: "cambiar_cta", label: "Cambiar el CTA", instruction: "Cambiá el llamado a la acción (CTA)." },
];

/**
 * Combina las opciones seleccionadas + el texto libre en una única instrucción
 * de ajuste para Eva. La lógica interna (regenerate) la consume tal cual.
 */
export function applyStructuredFeedback(
  options: FeedbackOption[],
  selectedValues: string[],
  customFeedback?: string
): string {
  const parts = options
    .filter((o) => selectedValues.includes(o.value))
    .map((o) => o.instruction);
  if (customFeedback && customFeedback.trim()) parts.push(customFeedback.trim());
  return parts.join(" ");
}
