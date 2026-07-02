"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AdStrategy,
  ApprovalStatus,
  BrandKit,
  Business,
  BusinessIntelligence,
  CalendarItem,
  ContentItem,
  Strategy,
  User,
} from "./types";

export function emptyBrandKit(): BrandKit {
  return {
    colors: { palette: [] },
    typography: {},
    logos: [],
    visualStyle: { mood: [] },
    voiceTone: { toneTags: [] },
    brandKeywords: [],
    avoidList: [],
  };
}

export function emptyBusinessIntelligence(): BusinessIntelligence {
  return {
    socialLinks: [],
    contactInfo: {},
    conversionPaths: {},
    valuePropositions: [],
  };
}

// Estado del flujo guiado por negocio: Estrategia → Calendario → Contenidos
export interface FlowState {
  strategy: ApprovalStatus;
  calendar: ApprovalStatus;
  content: ApprovalStatus;
}

export const EMPTY_FLOW: FlowState = {
  strategy: "draft",
  calendar: "draft",
  content: "draft",
};
import { DEMO_BUSINESSES, DEMO_USER } from "./demo";
import { sanitizeBusiness } from "./sanitize";
import { nowIso, uid } from "./utils";

export function emptyBusiness(userId: string): Business {
  return {
    id: uid("biz"),
    userId,
    name: "",
    industry: "",
    subcategory: "",
    businessType: "",
    businessModel: "B2C",
    yearFounded: "",
    employees: "",
    country: "",
    state: "",
    city: "",
    shortDescription: "",
    fullDescription: "",
    values: [],
    competitiveAdvantages: [],
    marketingChannels: [],
    marketingStrategy: "",
    marketingActivities: [],
    hasSeasonality: undefined,
    seasonality: "",
    seasonalityTags: [],
    hasSpecialDates: undefined,
    specialDates: [],
    hasWebsite: undefined,
    websiteUrl: "",
    websiteExtractionConsent: false,
    websiteExtractionStatus: "idle",
    brandColors: ["#ec4899", "#84cc16", "#ffffff"],
    brandKit: emptyBrandKit(),
    businessIntelligence: emptyBusinessIntelligence(),
    fieldStatuses: {},
    businessInfoImportSource: "manual",
    productsServices: [],
    audience: {
      ageRanges: [],
      gender: "todos",
      locationLogic: "ciudad",
      locations: [],
      socioeconomicLevel: "medio",
      painPoints: [],
      behavior: "",
      segments: [],
    },
    goals: {
      primaryContentGoal: "visibilidad",
      businessObjectives: "",
      successMetrics: [],
      marketingObjectives: "",
      timeline: "",
    },
    onboardingComplete: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

interface AppState {
  hydrated: boolean;
  user: User | null;
  businesses: Business[];
  activeBusinessId: string | null;
  strategies: Record<string, Strategy>;
  calendars: Record<string, CalendarItem[]>;
  contents: ContentItem[];
  adStrategies: AdStrategy[];
  flows: Record<string, FlowState>;

  // auth
  signup: (email: string, name: string) => void;
  login: (email: string) => void;
  loginDemo: () => void;
  logout: () => void;
  /** Setea el usuario desde la sesión de Supabase (auth real). */
  setUser: (user: User | null) => void;
  /** Reemplaza los datos del negocio con lo que vino del servidor (hidratación). */
  hydrateFromServer: (snapshot: {
    businesses: Business[];
    strategies: Record<string, Strategy>;
    calendars: Record<string, CalendarItem[]>;
    contents: ContentItem[];
  }) => void;

  // business
  upsertBusiness: (b: Business) => void;
  deleteBusiness: (id: string) => void;
  setActiveBusiness: (id: string) => void;
  getActiveBusiness: () => Business | null;

  // strategy
  setStrategy: (businessId: string, s: Strategy) => void;

  // calendar
  setCalendar: (businessId: string, items: CalendarItem[]) => void;
  updateCalendarItem: (item: CalendarItem) => void;

  // content
  upsertContent: (c: ContentItem) => void;
  updateContent: (id: string, patch: Partial<ContentItem>) => void;
  deleteContent: (id: string) => void;

  // ads
  setAdStrategy: (s: AdStrategy) => void;

  // flujo guiado
  getFlow: (businessId: string) => FlowState;
  setFlow: (businessId: string, patch: Partial<FlowState>) => void;

  resetAll: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      user: null,
      businesses: [],
      activeBusinessId: null,
      strategies: {},
      calendars: {},
      contents: [],
      adStrategies: [],
      flows: {},

      signup: (email, name) => {
        const user: User = { id: uid("user"), email, name, createdAt: nowIso() };
        set({ user });
      },
      login: (email) => {
        const existing = get().user;
        if (existing && existing.email === email) return;
        const user: User = {
          id: uid("user"),
          email,
          name: email.split("@")[0],
          createdAt: nowIso(),
        };
        set({ user });
      },
      loginDemo: () => {
        const state = get();
        const hasDemo = state.businesses.some((b) => b.isDemo);
        set({
          user: DEMO_USER,
          businesses: hasDemo
            ? state.businesses
            : [...DEMO_BUSINESSES, ...state.businesses],
          activeBusinessId: state.activeBusinessId || DEMO_BUSINESSES[0].id,
        });
      },
      logout: () => set({ user: null, activeBusinessId: null }),
      setUser: (user) => set({ user }),

      hydrateFromServer: (snap) => {
        const st = get();
        // Merge por id: gana el más reciente (updatedAt). Los negocios demo
        // locales se conservan; el resto viene del servidor.
        const newer = <T extends { id: string; updatedAt?: string }>(
          local: T[],
          server: T[]
        ): T[] => {
          const byId = new Map<string, T>();
          for (const item of server) byId.set(item.id, item);
          for (const item of local) {
            const s = byId.get(item.id);
            if (!s || (item.updatedAt || "") > (s.updatedAt || "")) byId.set(item.id, item);
          }
          return [...byId.values()];
        };

        const demoBusinesses = st.businesses.filter((b) => b.isDemo);
        const localReal = st.businesses.filter((b) => !b.isDemo);
        const businesses = [...demoBusinesses, ...newer(localReal, snap.businesses)];

        const demoIds = new Set(demoBusinesses.map((b) => b.id));
        const strategies: Record<string, Strategy> = { ...snap.strategies };
        for (const [bid, s] of Object.entries(st.strategies)) {
          if (demoIds.has(bid) || !strategies[bid]) strategies[bid] = s;
        }
        const calendars: Record<string, CalendarItem[]> = { ...snap.calendars };
        for (const [bid, items] of Object.entries(st.calendars)) {
          if (demoIds.has(bid) || !calendars[bid]) calendars[bid] = items;
        }

        const localDemoContents = st.contents.filter((c) => demoIds.has(c.businessId));
        const localRealContents = st.contents.filter((c) => !demoIds.has(c.businessId));
        const contents = [...localDemoContents, ...newer(localRealContents, snap.contents)];

        // Restaurar el flujo guiado que viaja embebido en cada negocio.
        // Fallback para datos previos a flowState: si hay calendario/contenidos,
        // los pasos anteriores estuvieron necesariamente aprobados (el flujo
        // guiado no permite generarlos sin aprobar el paso previo).
        const flows: Record<string, FlowState> = { ...st.flows };
        for (const b of businesses) {
          const existing = flows[b.id];
          const fromServer = b.flowState;
          const hasCalendar = (calendars[b.id]?.length ?? 0) > 0;
          const hasContents = contents.some((c) => c.businessId === b.id);
          const inferred: FlowState = {
            strategy: hasCalendar || hasContents ? "approved" : EMPTY_FLOW.strategy,
            calendar: hasContents ? "approved" : EMPTY_FLOW.calendar,
            content: EMPTY_FLOW.content,
          };
          const pick = (key: keyof FlowState): ApprovalStatus => {
            if (existing && existing[key] !== "draft") return existing[key];
            if (fromServer && fromServer[key] !== "draft") return fromServer[key];
            return inferred[key];
          };
          flows[b.id] = {
            strategy: pick("strategy"),
            calendar: pick("calendar"),
            content: pick("content"),
          };
        }

        set({
          flows,
          businesses,
          strategies,
          calendars,
          contents,
          activeBusinessId:
            st.activeBusinessId && businesses.some((b) => b.id === st.activeBusinessId)
              ? st.activeBusinessId
              : businesses[0]?.id ?? null,
        });
      },

      upsertBusiness: (b) => {
        const businesses = get().businesses;
        const idx = businesses.findIndex((x) => x.id === b.id);
        const updated = { ...b, updatedAt: nowIso() };
        const next =
          idx >= 0
            ? businesses.map((x) => (x.id === b.id ? updated : x))
            : [...businesses, updated];
        set({ businesses: next, activeBusinessId: b.id });
      },
      deleteBusiness: (id) => {
        set((s) => {
          const businesses = s.businesses.filter((b) => b.id !== id);
          const { [id]: _s, ...strategies } = s.strategies;
          const { [id]: _c, ...calendars } = s.calendars;
          const { [id]: _f, ...flows } = s.flows;
          return {
            businesses,
            strategies,
            calendars,
            flows,
            activeBusinessId:
              s.activeBusinessId === id
                ? businesses[0]?.id ?? null
                : s.activeBusinessId,
            contents: s.contents.filter((c) => c.businessId !== id),
            adStrategies: s.adStrategies.filter((a) => a.businessId !== id),
          };
        });
      },
      setActiveBusiness: (id) => set({ activeBusinessId: id }),
      getActiveBusiness: () => {
        const { businesses, activeBusinessId } = get();
        return businesses.find((b) => b.id === activeBusinessId) || null;
      },

      setStrategy: (businessId, s) =>
        set((st) => ({ strategies: { ...st.strategies, [businessId]: s } })),

      setCalendar: (businessId, items) =>
        set((st) => ({ calendars: { ...st.calendars, [businessId]: items } })),
      updateCalendarItem: (item) =>
        set((st) => {
          const list = st.calendars[item.businessId] || [];
          return {
            calendars: {
              ...st.calendars,
              [item.businessId]: list.map((x) => (x.id === item.id ? item : x)),
            },
          };
        }),

      upsertContent: (c) =>
        set((st) => {
          const idx = st.contents.findIndex((x) => x.id === c.id);
          return {
            contents:
              idx >= 0
                ? st.contents.map((x) => (x.id === c.id ? c : x))
                : [...st.contents, c],
          };
        }),
      updateContent: (id, patch) =>
        set((st) => ({
          contents: st.contents.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c
          ),
        })),
      deleteContent: (id) =>
        set((st) => ({ contents: st.contents.filter((c) => c.id !== id) })),

      setAdStrategy: (s) =>
        set((st) => ({
          adStrategies: [
            ...st.adStrategies.filter(
              (x) => !(x.businessId === s.businessId && x.platform === s.platform)
            ),
            s,
          ],
        })),

      getFlow: (businessId) => get().flows[businessId] || EMPTY_FLOW,
      setFlow: (businessId, patch) =>
        set((st) => ({
          flows: {
            ...st.flows,
            [businessId]: { ...EMPTY_FLOW, ...st.flows[businessId], ...patch },
          },
        })),

      resetAll: () =>
        set({
          user: null,
          businesses: [],
          activeBusinessId: null,
          strategies: {},
          calendars: {},
          contents: [],
          adStrategies: [],
          flows: {},
        }),
    }),
    {
      name: "loca-store",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.businesses = state.businesses.map(sanitizeBusiness);
        state.hydrated = true;
      },
    }
  )
);

// Selectores util
export function useActiveBusiness(): Business | null {
  return useStore((s) =>
    s.businesses.find((b) => b.id === s.activeBusinessId) || null
  );
}

export function useFlow(businessId: string | null | undefined): FlowState {
  return useStore((s) => (businessId && s.flows[businessId]) || EMPTY_FLOW);
}
