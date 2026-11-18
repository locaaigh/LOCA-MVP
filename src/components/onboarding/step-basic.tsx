"use client";

import { EvaOptionsChooser, HelpField, SearchableCountrySelect, SearchableRegionSelect } from "@/components/inputs";
import { withCurrent } from "@/components/select-utils";
import { Card, Input, Select } from "@/components/ui";
import { BUSINESS_STAGES, BUSINESS_TYPES, EMPLOYEE_OPTIONS, INDUSTRIES, foundingYearOptions } from "@/lib/constants";
import { CURRENT_YEAR } from "@/lib/onboarding/steps";
import { isFieldRequired } from "@/lib/onboarding/wizard-layout";
import type { Business, FieldStatusKind } from "@/lib/types";

// ── Paso 1: Negocio ──────────────────────────────────────────
export function StepBasic({
  b,
  set,
  subcats,
  missing,
  statusOf,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  subcats: string[];
  missing: Set<string>;
  statusOf: (f: string) => FieldStatusKind | undefined;
}) {
  return (
    <Card className="space-y-5">
      <HelpField label="Nombre de la empresa" required={isFieldRequired("name")} error={missing.has("name")} id="name" status={statusOf("name")}>
        <Input value={b.name} onChange={(e) => set({ name: e.target.value })} placeholder="Café Bruma" />
      </HelpField>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Industria" required={isFieldRequired("industry")} error={missing.has("industry")} id="industry" status={statusOf("industry")}>
          <Select value={b.industry} onChange={(e) => set({ industry: e.target.value, subcategory: "" })}>
            <option value="">Elegí una industria</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </Select>
          <EvaOptionsChooser
            options={b.fieldStatuses?.industry?.options}
            value={b.industry}
            onPick={(v) => set({ industry: v, subcategory: "" })}
          />
        </HelpField>
        <HelpField label="Subcategoría" required={isFieldRequired("subcategory")} error={missing.has("subcategory")} id="subcategory" help="Elegí la opción más parecida. No tiene que ser perfecta." status={statusOf("subcategory")}>
          {subcats.length ? (
            <Select value={b.subcategory} onChange={(e) => set({ subcategory: e.target.value })}>
              <option value="">Elegí una subcategoría</option>
              {withCurrent(subcats, b.subcategory).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          ) : (
            <Input value={b.subcategory} onChange={(e) => set({ subcategory: e.target.value })} placeholder="Ej: Café" />
          )}
          <EvaOptionsChooser
            options={b.fieldStatuses?.subcategory?.options}
            value={b.subcategory}
            onPick={(v) => set({ subcategory: v })}
          />
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Tipo de negocio" required={isFieldRequired("businessType")} error={missing.has("businessType")} id="businessType" status={statusOf("businessType")}>
          <Select value={b.businessType} onChange={(e) => set({ businessType: e.target.value })}>
            <option value="">Elegí</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </HelpField>
        <HelpField
          label="A quién le vendés (modelo de negocio)"
          id="businessModel"
          status={statusOf("businessModel")}
        >
          <Select value={b.businessModel} onChange={(e) => set({ businessModel: e.target.value as Business["businessModel"] })}>
            <option value="B2C">Le vendo a personas (B2C)</option>
            <option value="B2B">Le vendo a empresas (B2B)</option>
            <option value="Ambos">A ambos</option>
          </Select>
          <EvaOptionsChooser
            options={b.fieldStatuses?.businessModel?.options}
            value={b.businessModel}
            onPick={(v) => set({ businessModel: v as Business["businessModel"] })}
          />
        </HelpField>
      </div>

      <HelpField
        label="Tipo de organización"
        required={isFieldRequired("businessStage")}
        error={missing.has("businessStage")}
        id="businessStage"
        help="Nos ayuda a pedirte la info y generar el contenido adecuado para tu caso."
        status={statusOf("businessStage")}
      >
        <Select
          value={b.businessStage || ""}
          onChange={(e) => set({ businessStage: (e.target.value || undefined) as Business["businessStage"] })}
        >
          <option value="">Elegí</option>
          {BUSINESS_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} — {s.help}
            </option>
          ))}
        </Select>
      </HelpField>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Año de fundación" required={isFieldRequired("yearFounded")} error={missing.has("yearFounded")} id="yearFounded">
          <Select value={b.yearFounded} onChange={(e) => set({ yearFounded: e.target.value })}>
            {foundingYearOptions(CURRENT_YEAR).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </HelpField>
        <HelpField label="Cantidad de empleados" required={isFieldRequired("employees")} error={missing.has("employees")} id="employees">
          <Select value={b.employees} onChange={(e) => set({ employees: e.target.value })}>
            <option value="">Elegí</option>
            {withCurrent(EMPLOYEE_OPTIONS, b.employees).map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HelpField label="País" required={isFieldRequired("country")} error={missing.has("country")} id="country" status={statusOf("country")}>
          <SearchableCountrySelect
            value={b.country}
            onChange={(v) => set({ country: v, state: "" })}
            error={missing.has("country")}
          />
        </HelpField>
        <HelpField label="Provincia / Estado" required={isFieldRequired("state")} error={missing.has("state")} id="state">
          <SearchableRegionSelect country={b.country} value={b.state} onChange={(v) => set({ state: v })} />
        </HelpField>
        <HelpField label="Ciudad" required={isFieldRequired("city")} error={missing.has("city")} id="city">
          <Input value={b.city} onChange={(e) => set({ city: e.target.value })} placeholder="Buenos Aires" />
        </HelpField>
      </div>
    </Card>
  );
}
