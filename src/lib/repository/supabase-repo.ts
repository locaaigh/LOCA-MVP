import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSnapshotInput } from "@/lib/schemas";
import { mergeStrategyJob } from "@/lib/strategy-job-utils";
import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DataRepository } from "./types";

type ContentRow = {
  id: string;
  business_id: string;
  data: Record<string, unknown>;
  image_url: string | null;
  image_status: string | null;
  image_error: string | null;
};

/**
 * Une el JSONB del contenido con las columnas de imagen.
 * Las columnas las escribe solo el servidor al generar la imagen,
 * así que ganan sobre un `data` viejo sin imageUrl.
 */
function mergeContentRow(row: ContentRow): ContentItem {
  const data = row.data as unknown as ContentItem;
  return {
    ...data,
    imageUrl: data.imageUrl || row.image_url || undefined,
    imageStatus: (row.image_status as ContentItem["imageStatus"]) || data.imageStatus,
    imageError: row.image_error || data.imageError,
  };
}

function db(): SupabaseClient {
  return getSupabaseAdmin();
}

/** Repositorio en Supabase (PostgreSQL): persistencia real por usuario. */
export const supabaseRepository: DataRepository = {
  async sync(snapshot) {
    const userId = snapshot.userId;
    const now = new Date().toISOString();
    const client = db();

    const mergedBusinesses: Business[] = [];
    for (const b of snapshot.businesses as Business[]) {
      const existing = await this.getBusiness(userId, b.id);
      if (existing?.strategyJob) {
        mergedBusinesses.push({
          ...b,
          strategyJob: mergeStrategyJob(b.strategyJob, existing.strategyJob),
        });
      } else {
        mergedBusinesses.push(b);
      }
    }

    const bizRows = mergedBusinesses.map((b) => ({
      id: b.id,
      user_id: userId,
      data: b,
      updated_at: now,
    }));
    if (bizRows.length) {
      const { error } = await client
        .from("businesses")
        .upsert(bizRows, { onConflict: "user_id,id" });
      if (error) throw new Error(`Sync negocios: ${error.message}`);
    }

    const bizIds = new Set(bizRows.map((r) => r.id));

    // Estrategias/calendarios/contenidos solo de negocios presentes en el
    // snapshot (si el cliente tiene datos colgados de un negocio borrado,
    // no deben romper el sync por FK).
    const stratRows = Object.entries(snapshot.strategies)
      .filter(([businessId]) => bizIds.has(businessId))
      .map(([businessId, s]) => ({
        business_id: businessId,
        user_id: userId,
        data: s,
        updated_at: now,
      }));
    if (stratRows.length) {
      const { error } = await client
        .from("strategies")
        .upsert(stratRows, { onConflict: "user_id,business_id" });
      if (error) throw new Error(`Sync estrategias: ${error.message}`);
    }

    const calRows = Object.entries(snapshot.calendars)
      .filter(([businessId]) => bizIds.has(businessId))
      .flatMap(([businessId, items]) =>
        (items as CalendarItem[]).map((it) => ({
          id: it.id,
          business_id: businessId,
          user_id: userId,
          data: it,
          updated_at: now,
        }))
      );
    if (calRows.length) {
      const { error } = await client
        .from("calendar_items")
        .upsert(calRows, { onConflict: "user_id,id" });
      if (error) throw new Error(`Sync calendario: ${error.message}`);
    }

    const contentRows = (snapshot.contents as ContentItem[])
      .filter((c) => bizIds.has(c.businessId))
      .map((c) => ({
        id: c.id,
        business_id: c.businessId,
        user_id: userId,
        data: c,
        updated_at: now,
      }));
    if (contentRows.length) {
      const { error } = await client
        .from("contents")
        .upsert(contentRows, { onConflict: "user_id,id" });
      if (error) throw new Error(`Sync contenidos: ${error.message}`);
    }

    // IMPORTANTE: el sync NUNCA borra negocios ni estrategias. Borrar un
    // negocio es una acción explícita (DELETE /api/business); si el sync
    // borrara todo lo que falta en el snapshot, un cliente desactualizado
    // podría arrasar con los datos (nos pasó). Solo limpiamos contenidos y
    // calendario DENTRO de los negocios que este snapshot sí incluye.
    for (const bizId of bizIds) {
      const keepContents = contentRows.filter((r) => r.business_id === bizId).map((r) => r.id);
      await deleteMissingInBusiness(client, "contents", userId, bizId, keepContents);
      const keepCal = calRows.filter((r) => r.business_id === bizId).map((r) => r.id);
      await deleteMissingInBusiness(client, "calendar_items", userId, bizId, keepCal);
    }
  },

  async deleteBusiness(userId, businessId) {
    // Las imágenes del negocio en Storage: buscar los ids de contenidos primero.
    const client = db();
    const { data: rows } = await client
      .from("contents")
      .select("id")
      .eq("user_id", userId)
      .eq("business_id", businessId);
    const contentIds = new Set((rows ?? []).map((r) => r.id as string));

    const { error } = await client
      .from("businesses")
      .delete()
      .eq("user_id", userId)
      .eq("id", businessId);
    if (error) throw new Error(`Eliminar negocio: ${error.message}`);

    // Limpieza de Storage (best effort: si falla no rompe el borrado).
    if (contentIds.size) {
      try {
        const { data: files } = await client.storage.from("content-images").list(userId, {
          limit: 1000,
        });
        const toRemove = (files ?? [])
          .filter((f) => [...contentIds].some((id) => f.name.startsWith(`${id}-`)))
          .map((f) => `${userId}/${f.name}`);
        if (toRemove.length) {
          await client.storage.from("content-images").remove(toRemove);
        }
      } catch {
        /* huérfanos en storage: no crítico */
      }
    }
  },

  async getBusiness(userId, businessId) {
    const { data } = await db()
      .from("businesses")
      .select("data")
      .eq("user_id", userId)
      .eq("id", businessId)
      .maybeSingle();
    return (data?.data as Business | undefined) ?? null;
  },

  async getStrategy(userId, businessId) {
    const { data } = await db()
      .from("strategies")
      .select("data")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .maybeSingle();
    return (data?.data as Strategy | undefined) ?? null;
  },

  async upsertStrategy(userId, businessId, strategy) {
    const now = new Date().toISOString();
    const { error } = await db()
      .from("strategies")
      .upsert(
        {
          business_id: businessId,
          user_id: userId,
          data: strategy,
          updated_at: now,
        },
        { onConflict: "user_id,business_id" }
      );
    if (error) throw new Error(`Guardar estrategia: ${error.message}`);
  },

  async patchBusiness(userId, businessId, patch) {
    const existing = await this.getBusiness(userId, businessId);
    if (!existing) return null;
    const updated: Business = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const { error } = await db()
      .from("businesses")
      .upsert(
        {
          id: businessId,
          user_id: userId,
          data: updated,
          updated_at: updated.updatedAt,
        },
        { onConflict: "user_id,id" }
      );
    if (error) throw new Error(`Actualizar negocio: ${error.message}`);
    return updated;
  },

  async getCalendarItem(userId, businessId, itemId) {
    const { data } = await db()
      .from("calendar_items")
      .select("data")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .eq("id", itemId)
      .maybeSingle();
    return (data?.data as CalendarItem | undefined) ?? null;
  },

  async getContent(userId, businessId, contentId) {
    const { data } = await db()
      .from("contents")
      .select("id, business_id, data, image_url, image_status, image_error")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .eq("id", contentId)
      .maybeSingle();
    return data ? mergeContentRow(data as ContentRow) : null;
  },

  async upsertContent(userId, content) {
    const { error } = await db()
      .from("contents")
      .upsert(
        {
          id: content.id,
          business_id: content.businessId,
          user_id: userId,
          data: content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,id" }
      );
    if (error) throw new Error(`Guardar contenido: ${error.message}`);
  },

  async deleteContent(userId, contentId) {
    const client = db();
    const { error } = await client
      .from("contents")
      .delete()
      .eq("user_id", userId)
      .eq("id", contentId);
    if (error) throw new Error(`Eliminar contenido: ${error.message}`);
    try {
      const { data: files } = await client.storage.from("content-images").list(userId, {
        limit: 1000,
      });
      const toRemove = (files ?? [])
        .filter((f) => f.name.startsWith(`${contentId}-`))
        .map((f) => `${userId}/${f.name}`);
      if (toRemove.length) await client.storage.from("content-images").remove(toRemove);
    } catch {
      /* huérfanos en storage: no crítico */
    }
  },

  async setContentImage(userId, contentId, image) {
    const { error } = await db()
      .from("contents")
      .update({
        image_url: image.imageUrl ?? null,
        image_status: image.imageStatus ?? null,
        image_error: image.imageError ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", contentId);
    if (error) throw new Error(`Guardar imagen: ${error.message}`);
  },

  async getSnapshot(userId) {
    const client = db();
    const [biz, strat, cal, cont] = await Promise.all([
      client.from("businesses").select("data").eq("user_id", userId),
      client.from("strategies").select("business_id, data").eq("user_id", userId),
      client.from("calendar_items").select("business_id, data").eq("user_id", userId),
      client
        .from("contents")
        .select("id, business_id, data, image_url, image_status, image_error")
        .eq("user_id", userId),
    ]);

    const strategies: Record<string, Strategy> = {};
    for (const row of strat.data ?? []) {
      strategies[row.business_id as string] = row.data as Strategy;
    }
    const calendars: Record<string, CalendarItem[]> = {};
    for (const row of cal.data ?? []) {
      const bid = row.business_id as string;
      (calendars[bid] ||= []).push(row.data as CalendarItem);
    }

    return {
      businesses: (biz.data ?? []).map((r) => r.data as Business),
      strategies,
      calendars,
      contents: (cont.data ?? []).map((r) => mergeContentRow(r as ContentRow)),
    };
  },
};

async function deleteMissingInBusiness(
  client: SupabaseClient,
  table: string,
  userId: string,
  businessId: string,
  keepIds: string[]
) {
  let query = client.from(table).delete().eq("user_id", userId).eq("business_id", businessId);
  if (keepIds.length) {
    query = query.not("id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
  }
  const { error } = await query;
  if (error) throw new Error(`Limpieza de ${table}: ${error.message}`);
}
