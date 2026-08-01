# Spec · La cotización como documento

> Nace del dogfooding de Paco (2026-07-31) cotizando un proyecto real de $55,000 MXN:
> soundtrack principal + variación de 1 min + premium por entrega en una semana.
> No pudo desglosarlo, ni agregar IVA, ni editar, ni mandar un PDF.

---

## 1. El reencuadre

No son cuatro features sueltas. Son **un solo trabajo**: hoy una cotización es
**un número**; lo que se necesita es **un documento**.

Hoy: `finalPrice: 55000` + un campo de `notes` de texto libre.
Debe ser: conceptos → subtotal → impuesto → total → PDF que el cliente recibe.

Y hay un orden de dependencia claro:

```
Conceptos (desglose)  ──►  es la base: el total se calcula, ya no se teclea
        │
        ├──►  Impuesto: se aplica sobre el subtotal de los conceptos
        ├──►  PDF: sin conceptos, el PDF no tiene nada que imprimir
        └──►  Editar: en cuanto hay conceptos, editar deja de ser opcional
```

**El desglose es el cimiento.** Todo lo demás cuelga de él.

## 2. Hallazgo previo: la moneda está mal (bloqueante para el PDF)

Verificado en código, y esto importa mucho antes de mandarle un PDF a un cliente:

- `lib/pricingData.ts:78` — `formatCOP()` está **hardcodeado a pesos colombianos**
  (`currency: "COP"`, locale `es-CO`).
- `BusinessHubDesktop` usa **dos formateadores distintos**: `formatCOP` para el
  revenue y un `usd()` local (solo antepone `$` con separadores en-US) para las
  cotizaciones.
- Existe un setting de moneda (`CURRENCY_KEY` en Settings, default `"COP"`) que
  **ningún formateador respeta**.

Resultado: Paco está en México cotizando en MXN y la app formatea en COP/US.
Un PDF con la moneda equivocada es peor que no tener PDF. **Se arregla primero.**

## 3. Modelo de datos

### Conceptos (line items)

Opción recomendada: **columna `items jsonb`** en `business_quotes`, no una tabla
aparte. Los conceptos no se consultan por separado, siempre viven con su
cotización, y así no hay que mantener joins ni RLS de otra tabla.

```ts
type QuoteItem = {
  id: string;
  concept: string;      // "Soundtrack principal", "Variación 1 min", "Entrega express"
  qty: number;          // default 1
  unitPrice: number;
  note?: string;        // opcional, por concepto
};
```

### Impuesto

**No hardcodear IVA 16%.** Fennec tiene usuarios en México, Colombia y Argentina.
Guardar en la cotización:

```ts
taxLabel: string;   // "IVA" | "VAT" | "IGV" | libre
taxRate: number;    // 0.16, 0.19, 0.21 … o 0 (sin impuesto)
```

Default sugerido por país del perfil, editable por cotización, recordado como
preferencia. Una cotización sin impuesto es legítima (freelance sin factura).

### Campos nuevos en `business_quotes`

```sql
alter table business_quotes add column if not exists items      jsonb   not null default '[]'::jsonb;
alter table business_quotes add column if not exists tax_label  text;
alter table business_quotes add column if not exists tax_rate   numeric not null default 0;
alter table business_quotes add column if not exists currency   text;      -- "MXN" | "COP" | …
alter table business_quotes add column if not exists updated_at timestamptz;
alter table business_quotes add column if not exists valid_until date;      -- vigencia (opcional)
```

`final_price` se conserva (compatibilidad y consultas rápidas) pero pasa a ser
**derivado**: `subtotal(items) * (1 + tax_rate)`.

### Compatibilidad

Las cotizaciones existentes tienen `items = []`. Al abrirlas, se migran en memoria
a **un solo concepto** con el `projectName` y el `finalPrice` actual. Nada se rompe.

## 4. Editar

El `upsert` de `lib/businessDb.ts` **ya soporta guardar sobre una existente** (usa
`upsert` por `id`), así que esto es puro UI: abrir el QuoteGenerator con la
cotización cargada y guardar sobre ella. Añadir `updated_at`.

Regla de producto a decidir: ¿una cotización ya **enviada** se edita en su lugar,
o se versiona (v2)? Recomendación: editar en su lugar y mostrar "actualizada el X".
El versionado es sobre-ingeniería hasta que alguien lo pida.

## 5. PDF

**Recomendación: ruta de impresión propia, cero dependencias.**

Una ruta `/quote/[id]/print` que renderiza la cotización con CSS de papel
(`@page`, tamaño carta, márgenes), y un botón "Descargar PDF" que llama a
`window.print()`. En Mac/Chrome el diálogo ya trae "Guardar como PDF" y el
resultado es texto real, seleccionable y nítido — mejor que un PDF generado por
canvas.

Se descartó:
- `jsPDF` / `html2canvas` → PDF de imagen, texto no seleccionable, pesa ~300KB.
- `@react-pdf/renderer` → potente pero es otro motor de layout que aprender y
  mantener, ~500KB.
- PDF en servidor (Puppeteer) → costo de infraestructura para algo que el
  navegador ya hace bien.

**Decisión de marca importante:** el PDF es un documento **de Paco para su
cliente**, no un anuncio de Fennec. Lleva el nombre/logo del productor. Un
"Hecho con Fennec" discreto al pie es opcional y debería poder apagarse.

Contenido del documento:
```
[Logo/nombre del productor]              Cotización #0007
                                         Fecha · Vigencia

Para: [Cliente]

CONCEPTO                        CANT.   P. UNITARIO      IMPORTE
Soundtrack principal              1       $45,000        $45,000
Variación 1 min                   1        $6,000         $6,000
Entrega express (1 semana)        1        $4,000         $4,000
                                              Subtotal    $55,000
                                              IVA 16%      $8,800
                                                 TOTAL    $63,800

Notas / condiciones
[texto libre]
```

## 6. Orden de construcción

| # | Qué | Por qué en ese orden | Tamaño |
|---|-----|---------------------|--------|
| 0 | **Arreglar la moneda** | Sin esto el PDF sale con moneda equivocada | S |
| 1 | **Conceptos (desglose)** | El cimiento; todo lo demás depende | M |
| 2 | **Impuesto** | Cuelga del subtotal; trivial una vez hay conceptos | S |
| 3 | **Editar** | Persistencia ya lista, solo UI; y con conceptos se vuelve necesario | S |
| 4 | **PDF** | El pago de todo lo anterior | M |

## 7. Lo que NO entra (por ahora)

- Versionado de cotizaciones (v1/v2).
- Firma o aceptación en línea del cliente.
- Envío por correo desde la app (hoy: descargar PDF y mandarlo tú).
- Conversión automática cotización → proyecto → factura.

Todo eso es defendible después; ninguno bloquea el caso real de Paco.
