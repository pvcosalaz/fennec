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
          brand: "Music Production Pricing",
          calculatorTitle: "What should I charge?",
          calculatorSubtitle: "Calculate your minimum price based on your real costs and capacity.",
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
            business: "Business",
            content: "Content",
            dashboard: "Home",
            ideas: "Melody Bank",
            news: "News",
            community: "Fennec",
            audio: "Audio",
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
            subtitle: "Know your minimum rate before saying yes to any music production.",
            setupMissing: "You must complete setup before using the quote.",
            minimumPrice: "Minimum base price:",
            recommendedPrice: "Recommended price:",
            selectProjectType: "Select project type",
          },
        },
      },
      es: {
        translation: {
          brand: "Pricing de Producción Musical",
          calculatorTitle: "¿Cuánto debo cobrar?",
          calculatorSubtitle: "Calcula tu precio mínimo basado en tus costos reales y capacidad.",
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
            business: "Negocio",
            content: "Contenido",
            dashboard: "Home",
            ideas: "Melody Bank",
            news: "Noticias",
            community: "Fennec",
            audio: "Audio",
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
            subtitle: "Conoce tu tarifa mínima antes de decir sí a cualquier producción musical.",
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



/* ── Escritorio: dock + dashboard + recorrido ──
   Cobertura por capas (2026-08-04, trabajo nocturno): el ingles sigue siendo
   el default de la app —regla de la casa— y el español entra SOLO si el
   usuario lo elige en Settings. addResourceBundle fusiona sobre lo que ya
   habia sin tocar el bloque original del init. */
i18n.addResourceBundle("en", "translation", {
  navDashboard: "Dashboard", navBusiness: "Business", navTape: "The Tape",
  navMarketing: "Marketing", navCommunity: "Community", navNetwork: "Network",
  myProfile: "My community profile",
  goodMorning: "Good morning", goodAfternoon: "Good afternoon", goodEvening: "Good evening",
  addStudioPhoto: "Add your studio photo", shareMyId: "Share my ID", replayTour: "Show me around again",
  musicBusiness: "Music & Business", projects: "Projects", quotesSent: "Quotes sent",
  quotesOut: "Quotes out", karma: "Karma",
  audience: "Audience", followingYou: "following you", notConnected: "not connected", connect: "Connect",
  todayOnFennec: "Today on Fennec",
  noTrackFeedback: "No track feedback yet", newNote: "New note on your track",
  myTracksArrow: "My tracks →", uploadArrow: "Upload →",
  noOpenQuotes: "No open quotes", quotesAwaiting: "{{count}} quote awaiting reply", quotesAwaiting_other: "{{count}} quotes awaiting reply",
  viewArrow: "View →", sendArrow: "Send →",
  nothingScheduled: "Nothing scheduled", nextPost: "Next post", calendarArrow: "Calendar →", planArrow: "Plan →",
  contributions: "Contributions", contributionsSub: "work you logged · quotes, projects, tracks, feedback",
  thisYear: "this year", pickADay: "pick a day", tapToCompare: "tap a day to compare",
  less: "Less", more: "More", nothingLogged: "Nothing logged this day.", contribution: "contribution", contribution_other: "contributions",
  industryToday: "Industry today", allNews: "All news →",
  newsUnreachable: "Couldn't reach the newsroom right now.", noHeadlines: "No headlines right now.",
  tourDbTitle: "Your Fennec dB",
  tourDbBody: "Your signal strength as a producer, measured like decibels. It grows with your real reach.",
  tourIdTitle: "Your Fennec ID",
  tourIdBody: "Your identity here. The number is yours for good, and the lower it is the earlier you were.",
  tourContribTitle: "Contributions",
  tourContribBody: "The work you log through the year. Every square is a day, and you can click one to see what you did.",
  tourTapeTitle: "The Tape",
  tourTapeBody: "Upload a track and get timestamped notes from other producers. Leave notes on theirs too.",
  tourSkip: "Skip", tourNext: "Next", tourGotIt: "Got it", tourStep: "{{n}} of {{total}}",
}, true, true);

i18n.addResourceBundle("es", "translation", {
  navDashboard: "Inicio", navBusiness: "Negocio", navTape: "La Cinta",
  navMarketing: "Marketing", navCommunity: "Comunidad", navNetwork: "Red",
  myProfile: "Mi perfil de comunidad",
  goodMorning: "Buenos días", goodAfternoon: "Buenas tardes", goodEvening: "Buenas noches",
  addStudioPhoto: "Sube la foto de tu estudio", shareMyId: "Compartir mi ID", replayTour: "Vuelve a mostrarme la app",
  musicBusiness: "Música y negocio", projects: "Proyectos", quotesSent: "Cotizaciones enviadas",
  quotesOut: "Por cobrar", karma: "Karma",
  audience: "Audiencia", followingYou: "te siguen", notConnected: "sin conectar", connect: "Conectar",
  todayOnFennec: "Hoy en Fennec",
  noTrackFeedback: "Aún no hay notas en tus tracks", newNote: "Nota nueva en tu track",
  myTracksArrow: "Mis tracks →", uploadArrow: "Subir →",
  noOpenQuotes: "Sin cotizaciones abiertas", quotesAwaiting: "{{count}} cotización sin respuesta", quotesAwaiting_other: "{{count}} cotizaciones sin respuesta",
  viewArrow: "Ver →", sendArrow: "Enviar →",
  nothingScheduled: "Nada agendado", nextPost: "Próximo post", calendarArrow: "Calendario →", planArrow: "Planear →",
  contributions: "Contribuciones", contributionsSub: "tu trabajo registrado · cotizaciones, proyectos, tracks, notas",
  thisYear: "este año", pickADay: "elige un día", tapToCompare: "toca un día para comparar",
  less: "Menos", more: "Más", nothingLogged: "Nada registrado este día.", contribution: "contribución", contribution_other: "contribuciones",
  industryToday: "La industria hoy", allNews: "Todas las noticias →",
  newsUnreachable: "No pudimos alcanzar la redacción ahora.", noHeadlines: "Sin titulares por ahora.",
  tourDbTitle: "Tu Fennec dB",
  tourDbBody: "Tu fuerza de señal como productor, medida como decibeles. Crece con tu alcance real.",
  tourIdTitle: "Tu Fennec ID",
  tourIdBody: "Tu identidad aquí. El número es tuyo para siempre, y entre más bajo, más temprano llegaste.",
  tourContribTitle: "Contribuciones",
  tourContribBody: "El trabajo que registras en el año. Cada cuadro es un día, y puedes picarle para ver qué hiciste.",
  tourTapeTitle: "La Cinta",
  tourTapeBody: "Sube un track y recibe notas con marca de tiempo de otros productores. Deja notas en los suyos.",
  tourSkip: "Saltar", tourNext: "Siguiente", tourGotIt: "Listo", tourStep: "{{n}} de {{total}}",
}, true, true);

/* Settings (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  settings: "Settings", settingsTitle: "Settings",
  stProfile: "Profile", stLanguage: "Language", stCurrency: "Currency",
  stPassword: "Password", stPasswordSub: "Change your password",
  stData: "Data & Reset", stDataSub: "Manage your data",
  stNotifications: "Notifications", stNotificationsSub: "Manage notification preferences",
  stSuggest: "Suggest a feature", stSuggestSub: "Tell us what would make Fennec better",
  stSuggestBody: "What would make Fennec better for you? We read every suggestion.",
  stSignOut: "Sign out",
  stSave: "Save profile", stSaved: "Saved!",
  stChangePhotoClick: "Click to change photo", stChangePhotoTap: "Tap to change photo", stUploading: "Uploading…",
  stName: "Name", stRole: "Role", stCountry: "Country",
  stGenres: "Genres", stGenresMax: "(select up to 4)",
  stSocial: "Social profiles",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  settings: "Ajustes", settingsTitle: "Ajustes",
  stProfile: "Perfil", stLanguage: "Idioma", stCurrency: "Moneda",
  stPassword: "Contraseña", stPasswordSub: "Cambia tu contraseña",
  stData: "Datos y reinicio", stDataSub: "Administra tus datos",
  stNotifications: "Notificaciones", stNotificationsSub: "Preferencias de notificaciones",
  stSuggest: "Sugiere una función", stSuggestSub: "Dinos qué haría mejor a Fennec",
  stSuggestBody: "¿Qué haría mejor a Fennec para ti? Leemos cada sugerencia.",
  stSignOut: "Cerrar sesión",
  stSave: "Guardar perfil", stSaved: "¡Guardado!",
  stChangePhotoClick: "Haz clic para cambiar la foto", stChangePhotoTap: "Toca para cambiar la foto", stUploading: "Subiendo…",
  stName: "Nombre", stRole: "Rol", stCountry: "País",
  stGenres: "Géneros", stGenresMax: "(elige hasta 4)",
  stSocial: "Redes sociales",
}, true, true);

i18n.addResourceBundle("en", "translation", {
  stKicker: "Settings", stAddName: "Add your name", stSetRole: "Set your role", stNotSet: "Not set",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  stKicker: "Ajustes", stAddName: "Agrega tu nombre", stSetRole: "Define tu rol", stNotSet: "Sin definir",
}, true, true);

/* La Cinta (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  tpHowItWorks: "How it works", tpViewProfile: "view profile",
  tpLeaveNote: "Leave a note", tpNext: "Next", tpMyTracks: "My tracks & notes", tpUpload: "Upload a track",
  tpMarks: "{{count}} mark on this tape · click the tape to scrub, hit + to leave a note",
  tpMarks_other: "{{count}} marks on this tape · click the tape to scrub, hit + to leave a note",
  tpHelp: "SPACE play · CLICK scrub · ⌘scroll / pinch zoom · ＋ note",
  tpKarma: "karma",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  tpHowItWorks: "Cómo funciona", tpViewProfile: "ver perfil",
  tpLeaveNote: "Dejar una nota", tpNext: "Siguiente", tpMyTracks: "Mis tracks y notas", tpUpload: "Subir un track",
  tpMarks: "{{count}} marca en esta cinta · clic en la cinta para navegar, + para dejar nota",
  tpMarks_other: "{{count}} marcas en esta cinta · clic en la cinta para navegar, + para dejar nota",
  tpHelp: "ESPACIO reproducir · CLIC navegar · ⌘scroll / pellizco zoom · ＋ nota",
  tpKarma: "karma",
}, true, true);

/* Community (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  cmTitle: "Community", cmFennecCommunity: "Fennec Community",
  cmIndustryNews: "Industry News", cmUpdatedHourly: "Updated hourly",
  cmNewPost: "New post", cmPost: "Post", cmPlaceholder: "What's happening in your studio?",
  cmNoPosts: "No posts yet - be the first to drop something.", cmNoPostsProfile: "No posts yet.",
  cmPosts: "Posts", cmTracksOnTape: "Tracks on The Tape",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  cmTitle: "Comunidad", cmFennecCommunity: "Comunidad Fennec",
  cmIndustryNews: "Noticias de la industria", cmUpdatedHourly: "Se actualiza cada hora",
  cmNewPost: "Nuevo post", cmPost: "Publicar", cmPlaceholder: "Que esta pasando en tu estudio?",
  cmNoPosts: "Aun no hay posts - se quien estrene esto.", cmNoPostsProfile: "Aun no hay posts.",
  cmPosts: "Posts", cmTracksOnTape: "Tracks en La Cinta",
}, true, true);

/* ── Candado contra bucles de idioma (2026-08-05) ──
   En produccion, elegir español tumbaba la pestaña con "Maximum update depth
   exceeded": changeLanguage en bucle. La raiz del amplificador es que i18next
   VUELVE A EMITIR languageChanged aunque le pidas el idioma que ya esta
   activo, asi que cualquier efecto que "restaure" el idioma en cada render se
   convierte en un ciclo infinito (emit → render → efecto → changeLanguage →
   emit...).

   Dos defensas, las dos permanentes:
   1 · Idempotencia: pedir el idioma ya activo no hace nada. Mata la clase
       entera de bucles por restauracion, venga de donde venga.
   2 · Cortacircuitos: mas de 12 cambios REALES en 2s no es un usuario, es un
       bug — se deja de obedecer y se escribe el stack en consola con la marca
       [i18n-guard], para cazar al culpable en vez de tumbar la pestaña. */
{
  const orig = i18n.changeLanguage.bind(i18n);
  let cambios: number[] = [];
  i18n.changeLanguage = ((lng?: string, cb?: Parameters<typeof orig>[1]) => {
    if (lng && (i18n.resolvedLanguage === lng || i18n.language === lng)) {
      cb?.(null, i18n.t.bind(i18n));
      return Promise.resolve(i18n.t.bind(i18n));
    }
    const ahora = Date.now();
    cambios = cambios.filter((x) => ahora - x < 2000);
    cambios.push(ahora);
    if (cambios.length > 12) {
      console.error("[i18n-guard] bucle de changeLanguage detectado; ignorando", lng, new Error().stack);
      cb?.(null, i18n.t.bind(i18n));
      return Promise.resolve(i18n.t.bind(i18n));
    }
    return orig(lng, cb);
  }) as typeof i18n.changeLanguage;
}

/* Marketing (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  mkQuickIdeas: "Quick Ideas", mkMyScripts: "My Scripts", mkInspire: "Inspire", mkContentLab: "Content Lab",
  mkSavedIdeas: "{{count}} saved idea", mkSavedIdeas_other: "{{count}} saved ideas",
  mkScriptsWritten: "{{count}} script written", mkScriptsWritten_other: "{{count}} scripts written",
  mkCaptureIdeas: "Capture ideas in seconds", mkEverythingLands: "Everything you write lands here",
  mkStealTrending: "Steal what's trending", mkTurnMusic: "Turn your music into scripts",
  mkToday: "Today", mkSchedulePost: "Schedule a post for this day…",
  mkNothingThisDay: "Nothing scheduled for this day.",
  mkSrcInspire: "Inspire", mkSrcIdeas: "Ideas", mkSrcScript: "Script", mkSrcManual: "Manual",
  mkMon: "MON", mkTue: "TUE", mkWed: "WED", mkThu: "THU", mkFri: "FRI", mkSat: "SAT", mkSun: "SUN",
  mkPosts: "{{count}} post", mkPosts_other: "{{count}} posts",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  mkQuickIdeas: "Ideas rápidas", mkMyScripts: "Mis guiones", mkInspire: "Inspire", mkContentLab: "Content Lab",
  mkSavedIdeas: "{{count}} idea guardada", mkSavedIdeas_other: "{{count}} ideas guardadas",
  mkScriptsWritten: "{{count}} guion escrito", mkScriptsWritten_other: "{{count}} guiones escritos",
  mkCaptureIdeas: "Captura ideas en segundos", mkEverythingLands: "Todo lo que escribes cae aquí",
  mkStealTrending: "Róbate lo que es tendencia", mkTurnMusic: "Convierte tu música en guiones",
  mkToday: "Hoy", mkSchedulePost: "Agenda un post para este día…",
  mkNothingThisDay: "Nada agendado para este día.",
  mkSrcInspire: "Inspire", mkSrcIdeas: "Ideas", mkSrcScript: "Guion", mkSrcManual: "Manual",
  mkMon: "LUN", mkTue: "MAR", mkWed: "MIÉ", mkThu: "JUE", mkFri: "VIE", mkSat: "SÁB", mkSun: "DOM",
  mkPosts: "{{count}} post", mkPosts_other: "{{count}} posts",
}, true, true);

i18n.addResourceBundle("en", "translation", {
  mkM0:"January",mkM1:"February",mkM2:"March",mkM3:"April",mkM4:"May",mkM5:"June",
  mkM6:"July",mkM7:"August",mkM8:"September",mkM9:"October",mkM10:"November",mkM11:"December",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  mkM0:"Enero",mkM1:"Febrero",mkM2:"Marzo",mkM3:"Abril",mkM4:"Mayo",mkM5:"Junio",
  mkM6:"Julio",mkM7:"Agosto",mkM8:"Septiembre",mkM9:"Octubre",mkM10:"Noviembre",mkM11:"Diciembre",
}, true, true);

/* Business hub (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  bzKicker: "Business Hub", bzTitle: "Run your music business.",
  bzRevenue: "Revenue · This month", bzLast6: "Last 6 months",
  bzCalculator: "Pricing Calculator", bzClients: "Clients & Leads",
  bzQuotes: "Quotes", bzProjects: "Active Projects",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  bzKicker: "Centro de negocio", bzTitle: "Lleva tu negocio musical.",
  bzRevenue: "Ingresos · Este mes", bzLast6: "Últimos 6 meses",
  bzCalculator: "Calculadora de precios", bzClients: "Clientes y prospectos",
  bzQuotes: "Cotizaciones", bzProjects: "Proyectos activos",
}, true, true);

/* Cambio de contraseña con re-autenticacion (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  pwTitle: "Password",
  pwIntro: "Set a new password for your account. This works even if you originally signed in with Google, Apple, or Facebook.",
  pwNew: "New password", pwConfirm: "Confirm new password",
  pwSendCode: "Send verification code", pwSending: "Sending…",
  pwCodeSent: "We emailed you a 6-digit code. Enter it below to confirm it's you.",
  pwCode: "6-digit code",
  pwUpdate: "Update password", pwSaving: "Saving…", pwUpdated: "Password updated.",
  pwTooShort: "Password must be at least 6 characters.",
  pwNoMatch: "Passwords don't match.",
  pwWhy: "We ask for a code so that someone with access to your open session can't take over your account.",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  pwTitle: "Contraseña",
  pwIntro: "Define una contraseña nueva para tu cuenta. Funciona aunque hayas entrado con Google, Apple o Facebook.",
  pwNew: "Contraseña nueva", pwConfirm: "Confirma la contraseña",
  pwSendCode: "Enviar código de verificación", pwSending: "Enviando…",
  pwCodeSent: "Te enviamos un código de 6 dígitos por correo. Escríbelo abajo para confirmar que eres tú.",
  pwCode: "Código de 6 dígitos",
  pwUpdate: "Actualizar contraseña", pwSaving: "Guardando…", pwUpdated: "Contraseña actualizada.",
  pwTooShort: "La contraseña debe tener al menos 6 caracteres.",
  pwNoMatch: "Las contraseñas no coinciden.",
  pwWhy: "Pedimos un código para que alguien con acceso a tu sesión abierta no pueda quedarse con tu cuenta.",
}, true, true);

export default i18n;
