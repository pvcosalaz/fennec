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
 *  el modulo el aire ya esta en movimiento en vez de empezar todo junto. */
const MOTAS: [number, number, number, number, number, number][] = [
  [ 8, 22, 2.0, 46, -3,  0.10], [17, 71, 1.4, 58, -21, 0.07],
  [24, 12, 2.6, 39, -14, 0.12], [31, 55, 1.2, 63, -30, 0.06],
  [38, 84, 1.8, 51, -8,  0.09], [45, 31, 2.2, 44, -25, 0.11],
  [52, 66, 1.3, 60, -12, 0.06], [58, 18, 2.4, 41, -33, 0.12],
  [64, 47, 1.6, 55, -5,  0.08], [71, 78, 2.0, 48, -19, 0.10],
  [77, 27, 1.1, 66, -28, 0.05], [83, 59, 2.3, 43, -10, 0.11],
  [89, 36, 1.5, 57, -23, 0.07], [94, 74, 1.9, 50, -16, 0.09],
  [13, 44, 1.7, 53, -37, 0.08], [42, 91, 1.2, 61, -2,  0.06],
  [68, 9,  2.1, 45, -26, 0.10], [96, 15, 1.4, 59, -11, 0.07],
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
