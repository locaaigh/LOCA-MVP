// Un <Select> de opciones fijas no puede mostrar un valor que no esté en la
// lista: se ve "Elegí" aunque el dato EXISTA (lo cargó Eva como texto libre o
// el usuario en "Completá lo que falta"). Se suma el valor actual como opción.
export function withCurrent(options: string[], current?: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}
