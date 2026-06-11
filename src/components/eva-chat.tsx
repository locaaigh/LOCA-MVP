"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { EvaAvatar } from "@/components/brand";
import { MessageCircle, X, Sparkles } from "lucide-react";

interface QuickAction {
  label: string;
  reply: string;
  emit?: string; // dispara window event "eva:action" para que la página reaccione
}

interface EvaContext {
  intro: string;
  actions: QuickAction[];
}

function contextFor(pathname: string): EvaContext {
  if (pathname.startsWith("/onboarding")) {
    return {
      intro: "Estoy acá para ayudarte a completar el formulario. Elegí una opción y te guío.",
      actions: [
        {
          label: "No sé qué poner",
          reply:
            "Tranqui 💗 No tenés que saber de marketing. Elegí la opción más parecida o tocá “Que Eva lo sugiera” en los campos que tengan ese botón. Después podés cambiar todo.",
        },
        {
          label: "Dame un ejemplo",
          reply:
            "Mirá los textos grises dentro de cada campo: son ejemplos reales pensados para tu tipo de negocio. Podés copiar la idea y adaptarla.",
        },
        {
          label: "Que Eva lo sugiera",
          reply:
            "En los campos de descripción vas a ver el botón “Generar con Eva”. Lo tocás y completo yo una primera versión que después podés editar.",
        },
        {
          label: "¿Por qué me preguntan esto?",
          reply:
            "Cuanto más claro seas, mejores contenidos voy a generar. Cada dato me ayuda a entender tu negocio y tu público. Igual, si algo no aplica, seguí tranquilo.",
        },
      ],
    };
  }
  if (pathname.startsWith("/strategy")) {
    return {
      intro: "Puedo ayudarte a entender o modificar esta estrategia.",
      actions: [
        {
          label: "Explicámela más simple",
          reply:
            "Tu estrategia es el plan de qué comunicar y cómo. Arriba ves lo esencial: a quién le hablás, qué objetivo tenés este mes y de qué vas a postear. Si algo no te cierra, tocá “Modificar estrategia”.",
        },
        { label: "Quiero cambiar el tono", reply: "Genial. Abro las opciones para cambiar el tono 👇", emit: "modificar" },
        { label: "Quiero que venda más", reply: "Lo hacemos más vendedor. Abro las opciones 👇", emit: "modificar" },
        {
          label: "Qué hago ahora",
          reply:
            "Si te gusta cómo quedó, tocá “Aprobar estrategia” y paso a armar tu calendario. Si querés ajustarla, tocá “Modificar”.",
        },
      ],
    };
  }
  if (pathname.startsWith("/calendar")) {
    return {
      intro: "Puedo ayudarte a ajustar el calendario antes de generar contenidos.",
      actions: [
        { label: "Quiero más reels", reply: "Sumamos más reels. Abro las opciones 👇", emit: "modificar" },
        { label: "Quiero más ventas", reply: "Metemos más contenido vendedor. Abro las opciones 👇", emit: "modificar" },
        { label: "Quiero menos publicaciones", reply: "Podés elegir 8 publicaciones arriba y regenerar, o tocá “Modificar calendario”.", emit: "modificar" },
        {
          label: "Qué significa este calendario",
          reply:
            "Cada fila es una publicación: el día, el canal, el formato y de qué se trata. Cuando lo apruebes, genero los textos de cada una.",
        },
      ],
    };
  }
  if (pathname.startsWith("/content")) {
    return {
      intro: "Puedo ayudarte a mejorar estas piezas.",
      actions: [
        { label: "Hacer más corto", reply: "Lo acortamos. En la pieza, tocá “Modificar contenido” y elegí “Más corto”.", emit: "modificar" },
        { label: "Hacer más vendedor", reply: "Lo hacemos más vendedor desde “Modificar contenido”.", emit: "modificar" },
        { label: "Cambiar imagen", reply: "Podés regenerar la imagen desde el bloque Imagen → “Modificar imagen”.", emit: "imagen" },
        { label: "Cambiar CTA", reply: "Editá el campo CTA directamente, o pedí el cambio en “Modificar contenido”.", emit: "modificar" },
      ],
    };
  }
  return {
    intro: "¡Hola! Soy Eva. Te acompaño en cada paso: completá lo mínimo y yo me encargo del resto.",
    actions: [
      {
        label: "¿Por dónde empiezo?",
        reply:
          "El orden es: Estrategia → Calendario → Contenidos. Generá y aprobá cada paso, y yo voy armando el siguiente.",
      },
      {
        label: "¿Qué podés hacer?",
        reply:
          "Genero tu estrategia, el calendario del mes, los textos de cada publicación, las imágenes y hasta la estrategia de anuncios. Vos revisás y aprobás.",
      },
    ],
  };
}

interface Msg {
  from: "eva" | "user";
  text: string;
}

export function EvaChatBubble() {
  const pathname = usePathname() || "";
  const ctx = React.useMemo(() => contextFor(pathname), [pathname]);
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Reinicia el saludo al cambiar de pantalla.
  React.useEffect(() => {
    setMessages([{ from: "eva", text: ctx.intro }]);
  }, [ctx]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const handleAction = (a: QuickAction) => {
    setMessages((m) => [...m, { from: "user", text: a.label }, { from: "eva", text: a.reply }]);
    if (a.emit) {
      window.dispatchEvent(new CustomEvent("eva:action", { detail: { action: a.emit } }));
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir asistente Eva"
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lg transition hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-100 bg-gradient-to-r from-loca-600 to-loca-700 px-4 py-3 text-white">
            <EvaAvatar size={32} />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">Eva</p>
              <p className="text-xs text-loca-100">Tu asistente de marketing</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.from === "eva"
                    ? "bg-zinc-100 text-zinc-700"
                    : "ml-auto bg-loca-600 text-white"
                )}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-100 p-3">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-zinc-400">
              <Sparkles className="h-3 w-3" /> Acciones rápidas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ctx.actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => handleAction(a)}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 transition hover:border-loca-400 hover:bg-loca-50 hover:text-loca-700"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
