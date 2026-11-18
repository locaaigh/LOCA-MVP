"use client";

import { HelpField, OptionCards } from "@/components/inputs";
import { withCurrent } from "@/components/select-utils";
import { Card, ChipSelect, Select, Textarea } from "@/components/ui";
import { CONTENT_GOALS, SUCCESS_METRIC_OPTIONS, TIMELINE_OPTIONS } from "@/lib/constants";
import { getFieldExample } from "@/lib/examples";
import { isFieldRequired } from "@/lib/onboarding/wizard-layout";
import type { Business } from "@/lib/types";

// ── Paso 5: Objetivos ────────────────────────────────────────
export function StepGoals({
  b,
  set,
  missing,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
}) {
  const g = b.goals;
  const setG = (patch: Partial<Business["goals"]>) => set({ goals: { ...g, ...patch } });
  return (
    <Card className="space-y-5">
      <HelpField label="¿Qué buscás principalmente?" required={isFieldRequired("primaryContentGoal")} error={missing.has("primaryContentGoal")} id="primaryContentGoal">
        <OptionCards
          columns={3}
          options={CONTENT_GOALS}
          value={g.primaryContentGoal}
          onChange={(v) => setG({ primaryContentGoal: v })}
        />
      </HelpField>

      {g.primaryContentGoal === "ventas" && (
        <HelpField label="¿Qué tipo de venta?">
          <OptionCards
            columns={2}
            options={[
              { value: "compra_ecommerce", label: "Compra online" },
              { value: "mensaje_whatsapp", label: "Mensaje / WhatsApp" },
              { value: "visita_local", label: "Visita al local" },
              { value: "lead_magnet", label: "Conseguir contactos (leads)" },
            ]}
            value={g.salesGoalType || ""}
            onChange={(v) => setG({ salesGoalType: v })}
          />
        </HelpField>
      )}

      <HelpField label="¿Qué querés lograr con tu negocio?" required={isFieldRequired("businessObjectives")} error={missing.has("businessObjectives")} id="businessObjectives">
        <Textarea
          value={g.businessObjectives}
          onChange={(e) => setG({ businessObjectives: e.target.value })}
          placeholder={getFieldExample("businessObjectives", b.industry)}
        />
      </HelpField>

      <HelpField label="¿Cómo vas a medir el éxito?" required={isFieldRequired("successMetrics")} error={missing.has("successMetrics")} id="successMetrics">
        <ChipSelect
          options={SUCCESS_METRIC_OPTIONS}
          value={g.successMetrics}
          onChange={(v) => setG({ successMetrics: v })}
          allowCustom
        />
      </HelpField>

      <HelpField label="¿Qué querés lograr con tu marketing?" required={isFieldRequired("marketingObjectives")} error={missing.has("marketingObjectives")} id="marketingObjectives">
        <Textarea
          value={g.marketingObjectives}
          onChange={(e) => setG({ marketingObjectives: e.target.value })}
          placeholder={getFieldExample("marketingObjectives", b.industry)}
        />
      </HelpField>

      <HelpField label="¿En cuánto tiempo?" required={isFieldRequired("timeline")} error={missing.has("timeline")} id="timeline">
        <Select value={g.timeline} onChange={(e) => setG({ timeline: e.target.value })}>
          <option value="">Elegí</option>
          {withCurrent(TIMELINE_OPTIONS, g.timeline).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </HelpField>
    </Card>
  );
}
