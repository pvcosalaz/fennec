import i18n from "i18next";
import { initReactI18next } from "react-i18next";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "es"],
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          brand: "Fennec Pricing",
          calculatorTitle: "Pricing Calculator",
          stepCounter: "Step {{step}} of 4",
          language: "Language",
          languageEnglish: "EN",
          languageSpanish: "ES",
          previous: "Previous",
          next: "Next",
          finishSetup: "Finish setup",
          openSetup: "Open setup",
          settings: "Settings",
          currencyPlaceholder: "0",

          tabs: {
            pricing: "Pricing",
            content: "Content",
            dashboard: "Dashboard",
            ideas: "Ideas",
            news: "News",
          },

          module: {
            title: "Fennec Module",
          },

          step1: {
            title: "1. Monthly personal expenses",
            total: "Personal total:",
            vivienda: "Housing",
            alimentacion: "Food",
            transporte: "Transportation",
            servicios: "Utilities (electricity, water, gas, internet)",
            saludSeguro: "Health / insurance",
            deudas: "Debt",
            otros: "Other",
          },

          step2: {
            title: "2. Studio expenses",
            total: "Studio total:",
            suscripcionesPlugins: "Subscriptions / plugins",
            equipoProrrateado: "Equipment (prorated)",
            internetEstudio: "Studio internet",
            contador: "Accountant",
            marketing: "Marketing",
            asistentes: "Assistants",
            otros: "Other",
          },

          step3: {
            title: "3. Safety and taxes",
            impuestos: "% Taxes",
            reinversion: "% Reinvestment",
            fondo: "Monthly emergency fund",
            base: "Monthly base:",
            impuestosMonto: "Taxes:",
            reinversionMonto: "Reinvestment:",
            totalObjetivo: "Total COP target:",
          },

          step4: {
            title: "4. Capacity",
            horasSemana: "Hours per week",
            semanasMes: "Weeks per month",
            horasProyecto: "Hours per project",
            horasMensuales: "Available monthly hours:",
            proyectosMaximos: "Maximum projects per month:",
          },

          step5: {
            title: "5. Minimum price per project",
            formula: "Formula: Total monthly COP / maximum projects per month",
            resultado: "Result",
            defineCapacidad: "Set your capacity first",
          },

          step6: {
            title: "6. Project type with multipliers",
            selecciona: "Select project type",
            precioMinimo: "Minimum base price:",
            precioRecomendado: "Recommended price:",
            cortoEstudiantil: "Student short film",
            cortoProfesional: "Professional short film",
            largometrajeBajo: "Low-budget feature film",
            largometrajeMedio: "Mid-budget feature film",
            largometrajeGrande: "Large-budget feature film",
            serieTv: "TV series",
            documental: "Documentary",
            publiBajo: "Low-budget advertising",
            publiAlto: "High-budget advertising",
            artistaIndie: "Independent artist",
            artistaEmergenteEquipo: "Emerging artist with team",
            artistaFirmado: "Signed artist / label",
            syncLibreria: "Sync composition / library",
          },

          quote: {
            title: "Quote",
            subtitle: "Get your minimum and recommended price instantly.",
            setupMissing: "You must complete setup before using the quote.",
            minimumPrice: "Minimum base price:",
            recommendedPrice: "Recommended price:",
            selectProjectType: "Select project type",
          },
        },
      },
      es: {
        translation: {
          brand: "Fennec Pricing",
          calculatorTitle: "Calculadora de Pricing",
          stepCounter: "Paso {{step}} de 4",
          language: "Idioma",
          languageEnglish: "EN",
          languageSpanish: "ES",
          previous: "Anterior",
          next: "Siguiente",
          finishSetup: "Finalizar setup",
          openSetup: "Abrir setup",
          settings: "Configuración",
          currencyPlaceholder: "0",

          tabs: {
            pricing: "Pricing",
            content: "Contenido",
            dashboard: "Dashboard",
            ideas: "Ideas",
            news: "Noticias",
          },

          module: {
            title: "Módulo Fennec",
          },

          step1: {
            title: "1. Gastos personales mensuales",
            total: "Total personal:",
            vivienda: "Vivienda",
            alimentacion: "Alimentación",
            transporte: "Transporte",
            servicios: "Servicios (luz, agua, gas, internet)",
            saludSeguro: "Salud / seguro",
            deudas: "Deudas",
            otros: "Otros",
          },

          step2: {
            title: "2. Gastos del estudio",
            total: "Total estudio:",
            suscripcionesPlugins: "Suscripciones / plugins",
            equipoProrrateado: "Equipo prorrateado",
            internetEstudio: "Internet estudio",
            contador: "Contador",
            marketing: "Marketing",
            asistentes: "Asistentes",
            otros: "Otros",
          },

          step3: {
            title: "3. Seguridad e impuestos",
            impuestos: "% Impuestos",
            reinversion: "% Reinversión",
            fondo: "Fondo de emergencia mensual",
            base: "Base mensual:",
            impuestosMonto: "Impuestos:",
            reinversionMonto: "Reinversión:",
            totalObjetivo: "Total objetivo COP:",
          },

          step4: {
            title: "4. Capacidad",
            horasSemana: "Horas por semana",
            semanasMes: "Semanas al mes",
            horasProyecto: "Horas por proyecto",
            horasMensuales: "Horas mensuales disponibles:",
            proyectosMaximos: "Proyectos máximos al mes:",
          },

          step5: {
            title: "5. Precio mínimo por proyecto",
            formula: "Fórmula: COP total mensual / proyectos máximos al mes",
            resultado: "Resultado",
            defineCapacidad: "Define la capacidad",
          },

          step6: {
            title: "6. Tipo de proyecto con multiplicadores",
            selecciona: "Selecciona tipo de proyecto",
            precioMinimo: "Precio mínimo base:",
            precioRecomendado: "Precio recomendado:",
            cortoEstudiantil: "Cortometraje estudiantil",
            cortoProfesional: "Cortometraje profesional",
            largometrajeBajo: "Largometraje bajo presupuesto",
            largometrajeMedio: "Largometraje medio",
            largometrajeGrande: "Largometraje grande",
            serieTv: "Serie de TV",
            documental: "Documental",
            publiBajo: "Publicidad bajo presupuesto",
            publiAlto: "Publicidad alto presupuesto",
            artistaIndie: "Artista independiente",
            artistaEmergenteEquipo: "Artista emergente con equipo",
            artistaFirmado: "Artista firmado / disquera",
            syncLibreria: "Composición sync / librería",
          },

          quote: {
            title: "Cotizador",
            subtitle: "Obtén tu precio mínimo y recomendado al instante.",
            setupMissing: "Debes completar el setup antes de usar el cotizador.",
            minimumPrice: "Precio mínimo base:",
            recommendedPrice: "Precio recomendado:",
            selectProjectType: "Selecciona tipo de proyecto",
          },
        },
      },
    },
  });
}

export default i18n;
