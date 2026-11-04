-- NUEVO-v2 fix 4: metadatos de generación de imagen en COLUMNA propia.
-- Antes vivían dentro del `data` jsonb de contents, y el sync del cliente
-- (que reemplaza `data` entero) los borraba. Igual que image_url/status/error,
-- esta columna la escribe SOLO el servidor al generar la imagen y se re-une al
-- leer (mergeContentRow), así un sync con datos viejos no la pisa.
alter table public.contents
  add column if not exists generation jsonb;
