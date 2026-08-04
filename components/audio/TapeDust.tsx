"use client";

/* ═══════════════════════════════════════════════════════════════
   POLVO — el aire del cuarto donde vive la maquina.

   La Cinta se sentia vacia (Paco 2026-08-03). El fondo no es un
   adorno pegado encima: una grabadora de cinta vive en un cuarto
   en penumbra, y lo que hay alrededor es polvo cruzando muy
   despacio la luz. Sale del objeto, no de las ganas de rellenar.

   APENAS PERCEPTIBLE, a peticion expresa: se nota si te quedas
   viendo, no si estas trabajando. En un modulo donde escuchas y
   dejas notas, un fondo que llama la atencion es un error — tus
   ojos tienen que estar en la linea de tiempo.

   TRES REGLAS DE CONSTRUCCION, y las tres importan:

   1 · Cero estado de React por cuadro. Las particulas son CSS puro
       con `animation`, que corre fuera del hilo principal. Con
       requestAnimationFrame y useState esto tiraria cuadros en
       cuanto el usuario arrastre la cinta.

   2 · Posiciones FIJAS, no Math.random(). Un valor aleatorio da
       resultados distintos en servidor y cliente y revienta la
       hidratacion.

   3 · `prefers-reduced-motion` apaga el movimiento y deja solo el
       haz de luz. El movimiento lento y a la deriva es justo el
       que peor le cae a quien se marea.
   ═══════════════════════════════════════════════════════════════ */

/** x% · y% · tamaño px · duracion s · retraso negativo s · opacidad tope.
 *  El retraso negativo arranca cada mota a media animacion, asi que al abrir
 *  el modulo el aire ya esta en movimiento en vez de empezar todo junto.
 *
 *  CALIBRADO A OJO, no a numero. El primer intento (18 motas de 1-2.6px al
 *  5-12% de opacidad) no se veia NADA, y no por timidez: una mota de 1.19px al
 *  6% sobre #131216 esta a cuatro niveles de luminancia del fondo, o sea que es
 *  matematicamente invisible (medido 2026-08-03). "Apenas perceptible" quiere
 *  decir que lo notes si te quedas viendo, no que no exista. */
const MOTAS: [number, number, number, number, number, number][] = [
  [33, 16, 3.2, 42, -34, 0.18], [58, 89, 2.1, 43, -27, 0.24],
  [25, 55, 1.7, 45, -14, 0.27], [58,  8, 3.0, 41, -14, 0.17],
  [85, 30, 1.9, 45, -36, 0.22], [81, 19, 3.0, 50, -23, 0.18],
  [71, 56, 3.1, 69, -68, 0.24], [32, 58, 2.7, 57, -15, 0.30],
  [70, 25, 3.0, 69, -43, 0.29], [29, 96, 1.9, 64, -21, 0.30],
  [16, 49, 1.7, 42, -35, 0.26], [87, 32, 3.3, 69, -58, 0.17],
  [10, 28, 3.3, 42,  -3, 0.29], [31, 57, 3.2, 66, -36, 0.29],
  [88, 35, 3.9, 60, -10, 0.27], [49, 23, 2.3, 53, -25, 0.23],
  [86, 10, 2.7, 55,  -8, 0.31], [86, 29, 2.6, 60, -43, 0.32],
  [95, 16, 2.0, 52, -42, 0.20], [49, 59, 2.2, 38,  -9, 0.24],
  [37, 56, 3.9, 70,  -6, 0.24], [86, 93, 3.2, 63, -50, 0.23],
  [11, 63, 1.7, 42, -13, 0.24], [12, 60, 1.8, 47, -34, 0.18],
  [37,  4, 3.7, 62,  -9, 0.27], [95, 60, 2.7, 45, -31, 0.34],
  [47, 48, 1.8, 44, -21, 0.29], [48, 68, 2.8, 51, -33, 0.23],
  [69, 90, 3.4, 57, -41, 0.32], [69, 27, 2.5, 48, -22, 0.30],
  [53, 77, 2.4, 52, -39, 0.31], [98, 84, 3.5, 63, -29, 0.20],
  [49, 72, 4.0, 55, -30, 0.21], [69, 94, 2.7, 60, -23, 0.17],
  [11, 47, 2.4, 68,   0, 0.25], [65, 79, 1.8, 45, -24, 0.30],
  [75, 48, 2.0, 59,  -5, 0.30], [96, 40, 2.6, 43, -10, 0.19],
  [13, 17, 3.8, 47, -39, 0.31], [97, 65, 2.4, 46,  -1, 0.16],
  [96, 64, 2.9, 46, -27, 0.34], [20, 86, 1.7, 51, -18, 0.25],
];


export default function TapeDust() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* El haz. Un ambar muy bajo cayendo de arriba a la izquierda: da la
          direccion de luz que hace creible que el polvo se vea. Sin el, las
          motas flotan en la nada y se leen como ruido de pantalla. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 18% -10%, rgba(245,166,35,0.055) 0%, rgba(245,166,35,0.018) 34%, transparent 66%)",
        }}
      />
      {/* Segundo foco, mas frio y del lado opuesto, para que el cuarto no se
          vea iluminado por una sola bombilla plana. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 88% 108%, rgba(120,140,190,0.035) 0%, transparent 62%)",
        }}
      />

      {MOTAS.map(([x, y, tam, dur, retraso, op], i) => (
        <span
          key={i}
          className="tape-dust absolute rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: tam,
            height: tam,
            background: "rgba(255,240,215,0.85)",
            /* El desenfoque las vuelve motas de polvo y no puntos: un circulo
               nitido de 2px se lee como pixel muerto de la pantalla. */
            filter: "blur(0.6px)",
            opacity: 0,
            ["--dust-op" as string]: op,
            animationDuration: `${dur}s`,
            animationDelay: `${retraso}s`,
          }}
        />
      ))}
    </div>
  );
}
