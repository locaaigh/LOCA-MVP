"use client";

import { HelpField, OptionCards } from "@/components/inputs";
import { Card, ChipSelect, Select, Textarea } from "@/components/ui";
import { AGE_RANGES, GENDER_OPTIONS } from "@/lib/constants";
import { getFieldExample } from "@/lib/examples";
import { isFieldRequired, wizardTexts } from "@/lib/onboarding/wizard-layout";
import type { Business } from "@/lib/types";

// ── Paso 4: Audiencia ────────────────────────────────────────
export function StepAudience({
  b,
  set,
  missing,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
}) {
  const a = b.audience;
  const setA = (patch: Partial<Business["audience"]>) => set({ audience: { ...a, ...patch } });
  return (
    <Card className="space-y-5">
      <HelpField label={wizardTexts("ageRanges").label} required={isFieldRequired("ageRanges")} error={missing.has("ageRanges")} id="ageRanges" help={wizardTexts("ageRanges").help}>
        <ChipSelect options={AGE_RANGES} value={a.ageRanges} onChange={(v) => setA({ ageRanges: v })} />
      </HelpField>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Género">
          <OptionCards
            columns={2}
            options={GENDER_OPTIONS}
            value={a.gender}
            onChange={(v) => setA({ gender: v })}
          />
        </HelpField>
        <HelpField label="Nivel socioeconómico">
          <Select value={a.socioeconomicLevel} onChange={(e) => setA({ socioeconomicLevel: e.target.value as Business["audience"]["socioeconomicLevel"] })}>
            <option value="alto">Alto</option>
            <option value="medio_alto">Medio-alto</option>
            <option value="medio">Medio</option>
            <option value="bajo">Bajo</option>
          </Select>
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="¿Dónde está tu cliente?">
          <Select value={a.locationLogic} onChange={(e) => setA({ locationLogic: e.target.value as Business["audience"]["locationLogic"] })}>
            <option value="ciudad">En mi ciudad</option>
            <option value="pais">En todo el país</option>
            <option value="regional">En la región</option>
            <option value="global">En todo el mundo</option>
          </Select>
        </HelpField>
        <HelpField label={wizardTexts("locations").label} required={isFieldRequired("locations")} error={missing.has("locations")} id="locations" help={wizardTexts("locations").help}>
          <ChipSelect options={[]} value={a.locations} onChange={(v) => setA({ locations: v })} allowCustom />
        </HelpField>
      </div>

      <HelpField label={wizardTexts("painPoints").label} required={isFieldRequired("painPoints")} error={missing.has("painPoints")} id="painPoints" help={wizardTexts("painPoints").help ?? getFieldExample("painPoint", b.industry)}>
        <ChipSelect options={[]} value={a.painPoints} onChange={(v) => setA({ painPoints: v })} allowCustom />
      </HelpField>

      <HelpField label={wizardTexts("behavior").label} required={isFieldRequired("behavior")} error={missing.has("behavior")} id="behavior" help={wizardTexts("behavior").help}>
        <Textarea
          value={a.behavior}
          onChange={(e) => setA({ behavior: e.target.value })}
          placeholder={getFieldExample("behavior", b.industry)}
        />
      </HelpField>

      <HelpField label={wizardTexts("segments").label} required={isFieldRequired("segments")} error={missing.has("segments")} id="segments" help={wizardTexts("segments").help}>
        <ChipSelect options={[]} value={a.segments} onChange={(v) => setA({ segments: v })} allowCustom />
      </HelpField>
    </Card>
  );
}
