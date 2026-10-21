B2. Formato y proporción de las imágenes por red
Problema. Hoy la proporción de la imagen no está garantizada. El modelo de imagen recibe el formato pedido solo en el camino de fallback, así que una pieza marcada 4:5 o 9:16 puede salir cuadrada o apaisada, y la regla de qué proporción corresponde a cada red y formato está dispersa en el código en vez de centralizada. Además no existe un chequeo nuestro antes de mostrarle la pieza al usuario ni antes de mandarla a Meta. Si la proporción está mal, Instagram rechaza el contenedor con un error genérico y el usuario ve una story con forma de post.

Regla de producto (fuente de verdad única).
Post de feed para cualquier red (Instagram, Facebook, LinkedIn o crosspost): siempre 4:5 (1080x1350).
Post que va solo a LinkedIn: se permite horizontal 1.91:1 (1200x627). Si la misma pieza también va a IG o FB, manda 4:5.
Story (IG y FB): siempre 9:16 (1080x1920).
Carrusel: 4:5 en todas las slides, idénticas entre sí.
Reel: deshabilitado por ahora (ver B4).

Solución propuesta.
Un único módulo de reglas de formato en el código que, dado canal y tipo de contenido, devuelve proporción, dimensiones y si es publicable. Lo usan el agente de contenido, los prompts, la UI de revisión y la ruta de publicación. Nada decide proporción fuera de ahí.
Refuerzo en la generación: pasar la proporción como parámetro al modelo de imagen y además escribirla explícitamente en el prompt (los modelos respetan mejor la instrucción en texto que el parámetro solo). Si el proveedor principal falla y entra el suplente, el suplente recibe la misma proporción.
Chequeo nuestro antes de mostrar: leer las dimensiones reales del archivo generado. Si no coincide con la proporción pedida (tolerancia 2%), regenerar una vez automáticamente. Si falla de nuevo, la pieza queda en estado de error con reintento, nunca se le muestra al usuario una imagen con proporción incorrecta.
Chequeo antes de publicar: si el par canal y formato no es publicable, o la proporción de la imagen no corresponde al destino, devolver un error claro al usuario ("esta imagen es 9:16 y el feed de Instagram necesita 4:5, regenerala") sin llegar a Meta.
Formato de archivo: Instagram solo acepta JPEG por URL. Asegurar que todo lo que se genera o convierte quede en JPEG con URL pública https.

Criterios de aceptación.
Un post de IG o FB generado mide 4:5 en el archivo real, no solo en el campo de la pieza.
Una story generada mide 9:16 real.
Un post solo LinkedIn puede salir 1.91:1, y si se agrega otra red pasa a 4:5.
Publicar con proporción incorrecta devuelve error claro antes de llamar a Meta.
El flag de formatos habilitados refleja exactamente lo que está end-to-end.



B5. Stories: publicación real y regla anti "story interactiva"
Problema. Dos cosas. Primera: las stories interactivas (encuestas, quiz, stickers de preguntas, sliders, cuenta regresiva, links, música, menciones) no se pueden publicar por la API de Meta, ninguna herramienta puede. Hoy nada impide que Eva las proponga en la estrategia, el calendario o una pieza, y el usuario espera una encuesta que nunca va a existir. Segunda: el formato story se genera pero la publicación como story no está implementada, así que una story aprobada se publica en el feed en 9:16.
Solución propuesta.
Implementar la publicación de stories de imagen en las dos redes. Instagram: contenedor con media_type=STORIES, sin caption, texto dentro de la imagen. Facebook: subir la foto sin publicar y crear la story con el endpoint de photo stories de la página. Ambas usan permisos que ya tenemos aprobados. LinkedIn no tiene stories.
Regla en los prompts de estrategia, calendario y contenido: las stories se publican como imagen o video, nunca proponer ni mencionar elementos interactivos. Si el contenido pide interacción, resolverlo con el texto de la imagen y el CTA ("respondeme por mensaje").
Validación en código, no solo en el prompt: en la normalización de piezas tipo story detectar palabras prohibidas (encuesta, poll, quiz, sticker, swipe up, deslizá hacia arriba, link en la story, cuenta regresiva, caja de preguntas) y limpiar o regenerar. Registrar un evento cada vez que el modelo lo intente para medir frecuencia.
Decírselo al usuario como consejo, no como disculpa, en la card de la pieza tipo story: "Las stories interactivas las subís vos. Instagram no permite publicar encuestas ni stickers de forma automática. Eva te deja la imagen lista, publicala desde el celular y agregá la encuesta ahí."
Las stories expiran a las 24 h. Leer sus métricas dentro de esa ventana y mostrar "esta story ya expiró" en vez de un link roto.
Revisar la web y los textos de planes para que no prometan stories interactivas.
A definir por producto (Sebastián). Si por alguna razón la publicación automática de stories no se puede garantizar, la alternativa es sacarlas del flujo automático y ofrecerlas como pack descargable para que el usuario las suba a mano, ya sea de regalo o como add-on.
Criterios de aceptación.
Una story aprobada se publica como story en IG y en FB, no en el feed.
Ningún prompt propone stories interactivas, y si el modelo lo intenta el código lo limpia y queda registrado.
La UI explica la limitación y ofrece el camino manual.
Una story publicada muestra su vencimiento a las 24 h.



B3. Carruseles end-to-end
Problema. El carrusel existe solo como modelo de datos. No hay generación de varias imágenes coherentes, no hay UI para verlo, revisarlo o aprobarlo en el estudio de contenidos, y no hay publicación. El flag lo tiene apagado, así que Eva nunca lo propone. La API de Meta no es el problema. El cuello es generar entre 2 y 8 imágenes que parezcan de la misma marca y con una narrativa.
Solución propuesta.
Generación: para una pieza tipo carrusel el agente devuelve un array de slides con concepto visual, prompt de imagen y rol de cada una (portada, punto 1 a N, cierre con CTA). A cada slide se le agrega el mismo bloque de estilo (paleta, tipografía, estilo visual del negocio, proporción 4:5 idéntica). Generación en paralelo con límite de 2 o 3 simultáneas. Estado por slide: una slide que falla se reintenta sola sin tumbar el carrusel. Entre 2 y 8 slides.
UI en el estudio de contenidos: preview navegable con flechas en desktop y swipe en mobile, indicador de posición, copy una sola vez (es del post, no de la slide), regenerar una slide puntual, reordenar slides, aprobar el conjunto. Tiene que verse bien, es el primer lugar donde el usuario juzga la calidad.
Publicación en las tres redes, como funciones nuevas con el mismo contrato de retorno que las actuales: Instagram con items hijos más contenedor CAROUSEL, Facebook con fotos sin publicar más post con attached_media, LinkedIn con post multi-imagen de la Posts API. Validar antes de publicar: misma proporción en todas, URL pública https, entre 2 y 10 items.
Encender el flag solo cuando generación, UI y publicación estén verificadas en producción. Ese flag es lo que hace que estrategia y calendario empiecen a proponer carruseles.
Límite por plan: cantidad máxima de carruseles por mes definida en los límites de plan (B13), porque un carrusel de 6 slides cuesta 6 veces una pieza estática en imágenes.
Nota para decidir. En LinkedIn el post multi-imagen se muestra como collage, no como carrusel deslizable. La experiencia de swipe en LinkedIn se logra subiendo un PDF como documento. Hay que elegir cuál de las dos usamos para carruseles en LinkedIn.
Criterios de aceptación.
Eva genera un carrusel de 2 a 8 slides con narrativa y estilo consistente entre sí.
En el estudio se puede navegar, regenerar una slide, reordenar y aprobar el conjunto, en desktop y mobile.
Se publica correctamente en IG, FB y LinkedIn y queda el permalink.
El límite de carruseles por mes se aplica server-side según el plan.




B4. Reels: en stand by, y que Eva no los proponga
Problema. Hoy LOCA sabe escribir el guion de un reel pero no puede producir el video ni publicarlo. Si cualquier parte del sistema propone un reel, el usuario queda esperando algo que no existe.
Decisión. Reels quedan fuera hasta tener usuarios reales. Se retoma con datos del piloto y después de definir proveedor y costo de video.
Solución propuesta.
Mantener reel en el flag de formatos deshabilitados.
Orden explícita en los prompts de estrategia, calendario y contenido: no proponer reels ni video. La estrategia no incluye reels en el mix de formatos, el calendario no asigna slots de reel, y el agente de contenido no genera guiones de video.
Validación en código: si el modelo igual devuelve una pieza tipo reel, convertirla al formato habilitado más cercano (post estático) o descartarla, y registrar el evento.
Revisar la web, el onboarding y los textos de planes para que no mencionen reels como algo que LOCA hace hoy. Si se quiere dejar la expectativa, que diga "próximamente".
Criterios de aceptación.
Ninguna estrategia, calendario ni pieza generada menciona reels.
Si el modelo lo intenta, el código lo corrige y queda registrado.
Ningún texto de la app o la web promete reels hoy.


Estilos visuales y lógica de prompteo de imágenes
Problema. Hoy el estilo visual se elige como una lista plana de 7 opciones y el prompt de imagen lo escribe el modelo de texto en un string libre que va tal cual al generador. Resultado: el estilo cambia pieza a pieza, la paleta del brand kit no se respeta, las fotos de producto y la foto del profesional no se usan como referencia, y las piezas con texto (promos, tips) salen con el texto dentro de la imagen y con errores. Además el selector no contempla que un mismo negocio necesita fotos para vender y diseño limpio para explicar o anunciar.
Decisión de producto. El usuario toma dos decisiones separadas en el brand kit, y la app deriva todo lo demás:
Look de las imágenes: una familia principal de 7 (fotografía, cinematográfico, 3D, vectorial, ilustración artística, cartoon, lo-fi/collage/retro), con thumbnail y default sugerido por industria. Opcionalmente una familia secundaria, solo entre pares compatibles, asignada a un propósito (típicamente educativo).
Sistema tipográfico: cómo se ven sus piezas con texto. Siempre existe porque el texto va por overlay. Elige 1 de 3 tratamientos (minimal serif, bold oversized, promo).
El estilo de cada pieza no lo elige el usuario: se deriva del propósito de la pieza en el calendario. Producto, venta y marca usan la familia de imagen. Educativo, promo y testimonio usan el sistema tipográfico con fondo plano o de la familia con zona calma. Fecha especial usa la familia con un titular corto. Así un mes se ve de una sola marca sin ser monótono.
Solución técnica. Un imagePromptBuilder determinístico: Eva escribe solo el concepto de la pieza (sujeto, escena, mood) y el código arma el prompt final en 7 capas en orden fijo: concepto, sujeto fiel (roles de las fotos de referencia y qué no cambiar), bloque de estilo curado de la variante, marca (hex con uso dominante o acento, tono), sabor local, formato (aspecto por parámetro, composición, zona calma si lleva overlay) y restricciones (sin texto, sin logos, sin marcas ajenas, anatomía). El modelo nunca recibe un prompt escrito libremente por otro modelo. El texto de las piezas siempre se compone por código con la fuente de marca sobre un fondo generado sin texto.
Requisitos nuevos que esto implica.
Cada pieza del calendario lleva un campo propósito explícito (venta, educativo, promo, testimonio, marca, fecha especial). Es la llave que une la elección del usuario con lo que se genera.
El brand kit guarda familia principal, familia secundaria opcional, sistema tipográfico y variante opcional, además de la paleta y el tono que ya tiene.
Compatibilidad familia y sujeto: el producto con fotos de referencia solo se respeta en fotografía, cinematográfico y tipográfico; en familias ilustradas se compone el producto fotográfico sobre el fondo o se avisa. El profesional con foto propia solo aparece en familias fotográficas; en las demás la composición va sin rostro.
Variedad del mes: 70% en la variante elegida, 30% rotando dentro de la misma familia. Un carrusel usa una sola variante y las mismas referencias en todas las slides.
Thumbnails del selector: 7 familias + 28 variantes + 3 tratamientos tipográficos, generados una vez con la misma escena y paleta neutra. Cuando el usuario ya cargó fotos de producto, mostrarle un preview con su producto real en la familia sugerida.
Documento de referencia con la lógica completa, la plantilla del prompt, las tablas de compatibilidad, el default por industria y el catálogo de estilos con descripción para el usuario, bloque de estilo y prompt de ejemplo para cada familia y variante acá. Qué modelo usar en cada caso está acá.
Criterios de aceptación.
Dos negocios con el mismo brief pero distinta familia generan piezas claramente distintas; el mismo negocio genera 12 piezas que se ven de la misma marca.
La paleta del brand kit se nota en las imágenes sin pedirlo en cada pieza.
Las piezas educativas y promocionales salen con texto exacto, con la fuente de marca, sobre fondo sin texto generado.
Un profesional independiente nunca aparece ilustrado ni con una cara que no es la suya.
El prompt final de cada pieza queda registrado junto con el modelo que la produjo.
