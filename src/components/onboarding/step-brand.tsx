"use client";

import { ChannelSelector } from "@/components/channel-selector";
import { EvaSuggestionButton, HelpField, OptionCards, YesNoChoice } from "@/components/inputs";
import { Card, ChipSelect, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { ADVANTAGE_SUGGESTIONS, MARKETING_ACTIVITIES, VALUE_SUGGESTIONS, seasonalityOptionsFor, specialDatesOptionsFor } from "@/lib/constants";
import { getFieldExample } from "@/lib/examples";
import { isFieldRequired, wizardTexts } from "@/lib/onboarding/wizard-layout";
import type { Business, FieldStatusKind } from "@/lib/types";
import { useEffect, useState } from "react";

// ── Paso 2: Marca ────────────────────────────────────────────
export function StepBrand({
  b,
  set,
  missing,
  statusOf,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
  statusOf: (f: string) => FieldStatusKind | undefined;
}) {
  const suggest = (field: "shortDescription" | "fullDescription") => {
    const v = getFieldExample(field, b.industry);
    set(field === "shortDescription" ? { shortDescription: v } : { fullDescription: v });
  };

  const activitiesHasOther = b.marketingActivities.includes("Otro");
  const seasonalityHasOther = b.seasonalityTags.includes("Otra");
  const datesHasOther = b.specialDates.includes("Otra");

  // Sugerencias por industria: se muestran las estáticas al instante y,
  // si el catálogo en Supabase difiere (se puede editar sin redeploy),
  // se actualizan en segundo plano. Si no hay Supabase o falla, se quedan
  // las estáticas (mismo resultado).
  const [dateOptions, setDateOptions] = useState(() => ({
    seasonality: seasonalityOptionsFor(b.industry),
    specialDates: specialDatesOptionsFor(b.industry),
  }));
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/special-dates?industry=${encodeURIComponent(b.industry)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setDateOptions(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [b.industry]);

  return (
    <Card className="space-y-5">
      <HelpField
        label={wizardTexts("shortDescription").label}
        required={isFieldRequired("shortDescription")}
        error={missing.has("shortDescription")}
        id="shortDescription" help={wizardTexts("shortDescription").help}
        status={statusOf("shortDescription")}
        hint={`${b.shortDescription.length}/280`}
      >
        <div className="space-y-2">
          <Textarea
            maxLength={280}
            value={b.shortDescription}
            onChange={(e) => set({ shortDescription: e.target.value })}
            placeholder={getFieldExample("shortDescription", b.industry)}
          />
          <EvaSuggestionButton label="Que Eva lo sugiera" onClick={() => suggest("shortDescription")} />
        </div>
      </HelpField>

      <HelpField label={wizardTexts("fullDescription").label} required={isFieldRequired("fullDescription")} error={missing.has("fullDescription")} id="fullDescription" help={wizardTexts("fullDescription").help} status={statusOf("fullDescription")}>
        <div className="space-y-2">
          <Textarea
            value={b.fullDescription}
            onChange={(e) => set({ fullDescription: e.target.value })}
            placeholder={getFieldExample("fullDescription", b.industry)}
          />
          <EvaSuggestionButton label="Que Eva lo sugiera" onClick={() => suggest("fullDescription")} />
        </div>
      </HelpField>

      <HelpField label={wizardTexts("values").label} required={isFieldRequired("values")} error={missing.has("values")} id="values" help={wizardTexts("values").help}>
        <ChipSelect options={VALUE_SUGGESTIONS} value={b.values} onChange={(v) => set({ values: v.slice(0, 5) })} allowCustom />
      </HelpField>

      <HelpField
        label={wizardTexts("competitiveAdvantages").label}
        required={isFieldRequired("competitiveAdvantages")}
        error={missing.has("competitiveAdvantages")}
        id="competitiveAdvantages"
        status={statusOf("competitiveAdvantages")}
        help={wizardTexts("competitiveAdvantages").help ?? getFieldExample("competitiveAdvantage", b.industry)}
      >
        <ChipSelect
          options={ADVANTAGE_SUGGESTIONS}
          value={b.competitiveAdvantages}
          onChange={(v) => set({ competitiveAdvantages: v })}
          allowCustom
        />
      </HelpField>

      <HelpField
        label={wizardTexts("marketingChannels").label}
        required={isFieldRequired("marketingChannels")}
        error={missing.has("marketingChannels")}
        id="marketingChannels"
        status={statusOf("marketingChannels")}
        help={wizardTexts("marketingChannels").help}
      >
        <ChannelSelector value={b.marketingChannels} onChange={(v) => set({ marketingChannels: v })} />
      </HelpField>

      <HelpField
        label={wizardTexts("marketingActivities").label}
        required={isFieldRequired("marketingActivities")}
        error={missing.has("marketingActivities")}
        id="marketingActivities"
        help={wizardTexts("marketingActivities").help}
      >
        <OptionCards
          multi
          columns={2}
          options={MARKETING_ACTIVITIES.map((a) => ({ value: a, label: a }))}
          value={b.marketingActivities}
          onChange={(v) => set({ marketingActivities: v })}
        />
        {activitiesHasOther && (
          <Input
            className="mt-2"
            value={b.marketingStrategy}
            onChange={(e) => set({ marketingStrategy: e.target.value })}
            placeholder={wizardTexts("marketingActivities").placeholder ?? "Contanos qué otra cosa hacés…"}
          />
        )}
      </HelpField>

      <HelpField label={wizardTexts("hasSeasonality").label} required={isFieldRequired("hasSeasonality")} error={missing.has("hasSeasonality")} id="hasSeasonality" help={wizardTexts("hasSeasonality").help}>
        <YesNoChoice value={b.hasSeasonality} onChange={(v) => set({ hasSeasonality: v })} />
        {b.hasSeasonality && (
          <div className="mt-3">
            <OptionCards
              multi
              columns={3}
              options={dateOptions.seasonality.map((s) => ({ value: s, label: s }))}
              value={b.seasonalityTags}
              onChange={(v) => set({ seasonalityTags: v })}
            />
            {seasonalityHasOther && (
              <Input
                className="mt-2"
                value={b.seasonality}
                onChange={(e) => set({ seasonality: e.target.value })}
                placeholder={wizardTexts("hasSeasonality").placeholder ?? "¿Qué otra temporada?"}
              />
            )}
          </div>
        )}
      </HelpField>

      <HelpField label={wizardTexts("hasSpecialDates").label} required={isFieldRequired("hasSpecialDates")} error={missing.has("hasSpecialDates")} id="hasSpecialDates" help={wizardTexts("hasSpecialDates").help}>
        <YesNoChoice value={b.hasSpecialDates} onChange={(v) => set({ hasSpecialDates: v })} />
        {b.hasSpecialDates && (
          <div className="mt-3">
            <OptionCards
              multi
              columns={2}
              options={dateOptions.specialDates.map((s) => ({ value: s, label: s }))}
              value={b.specialDates}
              onChange={(v) => set({ specialDates: v })}
            />
            {datesHasOther && (
              <Input
                className="mt-2"
                value={b.seasonality}
                onChange={(e) => set({ seasonality: e.target.value })}
                placeholder={wizardTexts("hasSpecialDates").placeholder ?? "¿Qué otra fecha?"}
              />
            )}
          </div>
        )}
      </HelpField>
    </Card>
  );
}
