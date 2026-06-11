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
