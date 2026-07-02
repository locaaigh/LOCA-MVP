import { geminiImageProvider } from "../src/lib/ai/providers/gemini-image";

async function main() {
  console.log("model:", geminiImageProvider.model);
  console.log("configured:", geminiImageProvider.isConfigured());
  const start = Date.now();
  try {
    const r = await geminiImageProvider.generate({
      prompt:
        "Professional photo of a latte art coffee cup on a wooden table, warm cafe lighting",
      format: "1:1",
    });
    console.log("RESULT: SUCCESS");
    console.log("duration_ms:", Date.now() - start);
    console.log("image_size_chars:", r.imageUrl.length);
    console.log("is_data_url:", r.imageUrl.startsWith("data:image"));
  } catch (e) {
    console.log("RESULT: FAILED");
    console.log("duration_ms:", Date.now() - start);
    console.log("error:", e instanceof Error ? e.message : String(e));
  }
}

main();
