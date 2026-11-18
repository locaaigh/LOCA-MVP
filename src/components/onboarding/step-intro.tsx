"use client";


export function StepIntro({ step }: { step: number }) {
  const intros = [
    "Si tu negocio tiene una web, Eva puede leerla y completar gran parte del formulario por vos.",
    "Lo básico de tu negocio. No tiene que ser perfecto, podés cambiar todo después.",
    "Contanos cómo es tu marca y qué venís haciendo. Si no sabés algo, Eva te ayuda.",
    "Así Eva interpretó tu identidad visual. Revisá colores, tipografías y logos.",
    "Cargá tus productos o servicios más importantes. No hace falta todo el catálogo.",
    "¿A quién le hablás? Esto ayuda a Eva a afinar el contenido.",
    "¿Qué querés lograr? Con esto Eva arma tu estrategia.",
    "¿En qué cuentas querés que LOCA publique tus contenidos? Elegí una o varias.",
  ];
  return <p className="mt-2 text-[15px] text-muted-foreground">{intros[step]}</p>;
}
