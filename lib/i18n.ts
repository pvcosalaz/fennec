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
  cmNewPost: "Nuevo post", cmPost: "Publicar", cmPlaceholder: "¿Qué está pasando en tu estudio?",
  cmNoPosts: "Aún no hay posts. Sé quien estrene esto.", cmNoPostsProfile: "Aún no hay posts.",
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
  pwCodeSent: "We emailed you a verification code. Enter it below to confirm it's you.",
  pwCode: "Verification code",
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
  pwCodeSent: "Te enviamos un código de verificación por correo. Escríbelo abajo para confirmar que eres tú.",
  pwCode: "Código de verificación",
  pwUpdate: "Actualizar contraseña", pwSaving: "Guardando…", pwUpdated: "Contraseña actualizada.",
  pwTooShort: "La contraseña debe tener al menos 6 caracteres.",
  pwNoMatch: "Las contraseñas no coinciden.",
  pwWhy: "Pedimos un código para que alguien con acceso a tu sesión abierta no pueda quedarse con tu cuenta.",
}, true, true);

/* TapeIntro — "How the tape works" (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  tiKicker: "Track Reviews", tiTitle: "How the tape works",
  tiStep1Title: "Every track is a tape",
  tiStep1BodyDesktop: "Time runs across the tape. The amber marks are notes other producers left at exact moments.",
  tiStep1BodyMobile: "Time runs down the reel. The amber marks are notes other producers left at exact moments.",
  tiStep2TitleDesktop: "Click to mark", tiStep2TitleMobile: "Hold to mark",
  tiStep2BodyDesktop: "Click the tape to scrub through time. Hit the + button to write a note at the exact moment.",
  tiStep2BodyMobile: "Press and hold anywhere on the tape to write a note at that second. Drag to scrub through time.",
  tiStep3Title: "Upload your own",
  tiStep3Body: "Share a track of yours and other producers will leave notes on it, exactly like you do here.",
  tiFooter: "Bailing early on 4 tracks in a row pauses the queue — a real listen or a mark keeps it rolling.",
  tiStartListening: "Start listening", tiUploadFirst: "Upload your first track",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  tiKicker: "Reseñas de tracks", tiTitle: "Cómo funciona la cinta",
  tiStep1Title: "Cada track es una cinta",
  tiStep1BodyDesktop: "El tiempo corre a lo largo de la cinta. Las marcas ámbar son notas que otros productores dejaron en momentos exactos.",
  tiStep1BodyMobile: "El tiempo corre hacia abajo en el carrete. Las marcas ámbar son notas que otros productores dejaron en momentos exactos.",
  tiStep2TitleDesktop: "Clic para marcar", tiStep2TitleMobile: "Mantén presionado para marcar",
  tiStep2BodyDesktop: "Haz clic en la cinta para navegar por el tiempo. Presiona el botón + para escribir una nota en ese momento exacto.",
  tiStep2BodyMobile: "Mantén presionado en cualquier parte de la cinta para escribir una nota en ese segundo. Arrastra para navegar por el tiempo.",
  tiStep3Title: "Sube la tuya",
  tiStep3Body: "Comparte uno de tus tracks y otros productores dejarán notas en él, igual que tú haces aquí.",
  tiFooter: "Salir temprano de 4 tracks seguidos pausa la cola — una escuchada real o una marca la mantiene rodando.",
  tiStartListening: "Empezar a escuchar", tiUploadFirst: "Sube tu primer track",
}, true, true);

/* My Tracks & notes (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  mtCatDemo: "Demo", mtCatMissingMix: "Missing Mix", mtCatIdea: "Idea",
  mtCatMissingMaster: "Missing Master", mtCatFinal: "Final Version",
  mtFileTooLarge: "File too large. Max {{max}} MB.",
  mtTrackLimit: "You've reached the limit of {{max}} active tracks.",
  mtNeedKarmaUpload: "You need {{cost}} karma to upload. Earn it when artists seal your marks, or grab a karma pack.",
  mtUploadFailed: "Upload failed: {{msg}}",
  mtConfirmDelete: "Delete this track? This cannot be undone.",
  mtDeleteFailed: "Could not delete track. Please try again.",
  mtBuyKarmaPack: "+{{karma}} karma · {{price}}",
  mtProFreeUploads: "Pro · {{left}}/{{total}} free uploads this month",
  mtShareMusic: "Share your music with the community for feedback",
  mtNewTrack: "New Track",
  mtFreeProLeft: "free · Pro ({{left}} left this month)",
  mtCostsKarma: "costs {{cost}} karma",
  mtTrackTitlePlaceholder: "Track title",
  mtDropReel: "Drop it on the reel",
  mtSelectTrack: "Select or drop your track (WAV, MP3, AIFF...)",
  mtArtworkOptional: "Artwork (optional)",
  mtNotEnoughKarma: "You have {{karma}} karma — you need {{cost}}. Earn +{{reward}} each time an artist seals one of your marks, or grab a pack:",
  mtOpeningCheckout: "Opening checkout…",
  mtGetKarmaPack: "Get {{karma}} karma · {{price}}",
  mtCancel: "Cancel",
  mtUploading: "Uploading...",
  mtSubmitFree: "Submit (free)",
  mtSubmitKarma: "Submit · −{{cost}} karma",
  mtLoadingTracks: "Loading your tracks...",
  mtNoTracksYet: "No tracks submitted yet. Hit the button above to get feedback from the community.",
  mtMarksShort: "{{count}} mark", mtMarksShort_other: "{{count}} marks",
  mtMarcasEtiqueta: "mark", mtMarcasEtiqueta_other: "marks",
  mtSueltaOElige: "Drop a file or click to pick one",
  mtLimiteAlcanzado: "You've hit the limit of {{max}} active tracks",
  mtGratisPro: "free · {{left}} left", mtCuestaKarma: "−{{cost}} karma",
  mtLoadingMarks: "Loading marks…",
  mtNobodyMarked: "Nobody's marked this tape yet.",
  mtUnknownUser: "unknown",
  mtThisHelped: "this helped",
  mtHelpedButton: "✓ this helped (+{{reward}} karma)",
  mtSealedAlreadyPaid: "Sealed. Karma was already paid to this producer on this tape (1 payout per producer per track).",
  mtSealedWeeklyCap: "Sealed. Weekly karma cap with this producer reached (max 3 payouts per week). The seal still shows.",
  mtSealedNoKarma: "Sealed. No karma paid this time.",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  mtCatDemo: "Demo", mtCatMissingMix: "Falta mezcla", mtCatIdea: "Idea",
  mtCatMissingMaster: "Falta master", mtCatFinal: "Versión final",
  mtFileTooLarge: "El archivo es muy grande. Máximo {{max}} MB.",
  mtTrackLimit: "Llegaste al límite de {{max}} tracks activos.",
  mtNeedKarmaUpload: "Necesitas {{cost}} karma para subir. Lo ganas cuando artistas sellan tus marcas, o consigue un paquete de karma.",
  mtUploadFailed: "Falló la subida: {{msg}}",
  mtConfirmDelete: "¿Eliminar este track? No se puede deshacer.",
  mtDeleteFailed: "No se pudo eliminar el track. Intenta de nuevo.",
  mtBuyKarmaPack: "+{{karma}} karma · {{price}}",
  mtProFreeUploads: "Pro · {{left}}/{{total}} subidas gratis este mes",
  mtShareMusic: "Comparte tu música con la comunidad para recibir notas",
  mtNewTrack: "Track nuevo",
  mtFreeProLeft: "gratis · Pro ({{left}} restantes este mes)",
  mtCostsKarma: "cuesta {{cost}} karma",
  mtTrackTitlePlaceholder: "Título del track",
  mtDropReel: "Suéltalo en el carrete",
  mtSelectTrack: "Selecciona o suelta tu track (WAV, MP3, AIFF...)",
  mtArtworkOptional: "Portada (opcional)",
  mtNotEnoughKarma: "Tienes {{karma}} karma — necesitas {{cost}}. Gana +{{reward}} cada vez que un artista sella una de tus marcas, o consigue un paquete:",
  mtOpeningCheckout: "Abriendo el pago…",
  mtGetKarmaPack: "Consigue {{karma}} karma · {{price}}",
  mtCancel: "Cancelar",
  mtUploading: "Subiendo...",
  mtSubmitFree: "Enviar (gratis)",
  mtSubmitKarma: "Enviar · −{{cost}} karma",
  mtLoadingTracks: "Cargando tus tracks...",
  mtNoTracksYet: "Aún no has subido tracks. Toca el botón de arriba para recibir notas de la comunidad.",
  mtMarksShort: "{{count}} marca", mtMarksShort_other: "{{count}} marcas",
  mtMarcasEtiqueta: "marca", mtMarcasEtiqueta_other: "marcas",
  mtSueltaOElige: "Suelta un archivo o haz clic para elegirlo",
  mtLimiteAlcanzado: "Llegaste al límite de {{max}} tracks activos",
  mtGratisPro: "gratis · quedan {{left}}", mtCuestaKarma: "−{{cost}} karma",
  mtLoadingMarks: "Cargando marcas…",
  mtNobodyMarked: "Nadie ha marcado esta cinta todavía.",
  mtUnknownUser: "desconocido",
  mtThisHelped: "esto ayudó",
  mtHelpedButton: "✓ esto ayudó (+{{reward}} karma)",
  mtSealedAlreadyPaid: "Sellado. Ya se le pagó karma a este productor en esta cinta (1 pago por productor por track).",
  mtSealedWeeklyCap: "Sellado. Se alcanzó el tope semanal de karma con este productor (máximo 3 pagos por semana). El sello sigue apareciendo.",
  mtSealedNoKarma: "Sellado. No se pagó karma esta vez.",
}, true, true);

/* Script detail overlay + Teleprompter (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  sdEditingScript: "Editing script", sdScript: "Script",
  sdSaved: "Saved", sdSave: "Save",
  sdEditAria: "Edit script", sdDeleteAria: "Delete script",
  sdReadTeleprompter: "Read in Teleprompter", sdScheduleContent: "Schedule this content",
  sdReference: "Reference ↗",
  sdTitlePlaceholder: "Title", sdPublishDate: "Publish date",
  sdScriptPlaceholder: "Write your script here...",
  sdNoScript: "No script written yet.",
  telTitle: "Teleprompter", telMirror: "MIRROR",
  telNoScript: "No script to read.", telTapStart: "Tap to start",
  telEndOfScript: "End of script", telSpeed: "speed",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  sdEditingScript: "Editando guion", sdScript: "Guion",
  sdSaved: "Guardado", sdSave: "Guardar",
  sdEditAria: "Editar guion", sdDeleteAria: "Eliminar guion",
  sdReadTeleprompter: "Leer en Teleprompter", sdScheduleContent: "Agendar este contenido",
  sdReference: "Referencia ↗",
  sdTitlePlaceholder: "Título", sdPublishDate: "Fecha de publicación",
  sdScriptPlaceholder: "Escribe tu guion aquí...",
  sdNoScript: "Aún no hay guion escrito.",
  telTitle: "Teleprompter", telMirror: "ESPEJO",
  telNoScript: "No hay guion que leer.", telTapStart: "Toca para empezar",
  telEndOfScript: "Fin del guion", telSpeed: "velocidad",
}, true, true);

/* Content module — Quick Ideas / My Scripts / Inspire (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  icMusicIdeas: "Music Ideas", icMusicIdeaSingular: "Music Idea",
  icMemes: "Memes", icMemeSingular: "Meme",
  icQuotes: "Quotes", icQuoteSingular: "Quote",
  icTutorials: "Tutorials", icTutorialSingular: "Tutorial",
  icReferences: "References", icReferenceSingular: "Reference",
  ibNewIdea: "New idea",
  ibNewCategory: "New {{category}}",
  ibTitlePlaceholder: "Title or idea...", ibNotesPlaceholder: "Notes (optional)", ibUrlPlaceholder: "URL (optional)",
  ibNoneYet: "No {{category}} yet.", ibHitNewIdea: "Hit \"New idea\" to add one.",
  ibAddToCalendar: "Add to calendar", ibWriteScript: "Write script",
  svContentGenerator: "Content Generator", svCreate: "Create",
  svMyTake: "My take: {{title}}",
  svInspireReference: "Inspire Reference",
  svTitleHookPlaceholder: "Title or hook for this piece...",
  svScriptPlaceholder: "Write your script, idea, or execution notes...",
  svSaveScript: "Save script",
  svReadyToWrite: "Ready to write?", svTapBelow: "Tap below to create a new script brief.",
  svNewScript: "New Script",
  svNoScriptsYet: "No scripts yet.", svGoToCreate: "Go to Create and pick a format + line to start.",
  svGoToCreateArrow: "Go to Create →",
  tvLoading1: "Scanning YouTube trends…", tvLoading2: "Finding what's working this week…",
  tvLoading3: "Analyzing music production content…", tvLoading4: "Almost there…",
  tvContentPro: "Content · Pro", tvDailyIdeas: "Daily Ideas", tvUpdated: "Updated {{time}}",
  tvUpgradeToPro: "Upgrade to Pro",
  tvUpgradeBody: "Get a daily feed of trending YouTube videos in the music production niche — analyzed by AI so you know exactly why they work and how to adapt them.",
  tvTryAgain: "Try again", tvNoneFound: "No trending videos found. Check back tomorrow.",
  tvLoadError: "Could not load trending ideas. Try again later.",
  tvWhyItWorks: "Why it works", tvYourAngle: "Your angle", tvWatchOnYoutube: "Watch on YouTube",
  tvUseAsReference: "Use as reference",
  cmBackToCalendar: "Back to calendar",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  icMusicIdeas: "Ideas de música", icMusicIdeaSingular: "Idea de música",
  icMemes: "Memes", icMemeSingular: "Meme",
  icQuotes: "Frases", icQuoteSingular: "Frase",
  icTutorials: "Tutoriales", icTutorialSingular: "Tutorial",
  icReferences: "Referencias", icReferenceSingular: "Referencia",
  ibNewIdea: "Idea nueva",
  ibNewCategory: "{{category}} nueva",
  ibTitlePlaceholder: "Título o idea...", ibNotesPlaceholder: "Notas (opcional)", ibUrlPlaceholder: "URL (opcional)",
  ibNoneYet: "Aún no hay {{category}}.", ibHitNewIdea: "Toca \"Idea nueva\" para agregar una.",
  ibAddToCalendar: "Agregar al calendario", ibWriteScript: "Escribir guion",
  svContentGenerator: "Generador de contenido", svCreate: "Crear",
  svMyTake: "Mi versión: {{title}}",
  svInspireReference: "Referencia de Inspire",
  svTitleHookPlaceholder: "Título o gancho para esta pieza...",
  svScriptPlaceholder: "Escribe tu guion, idea o notas de ejecución...",
  svSaveScript: "Guardar guion",
  svReadyToWrite: "¿Listo para escribir?", svTapBelow: "Toca abajo para crear un guion nuevo.",
  svNewScript: "Guion nuevo",
  svNoScriptsYet: "Aún no hay guiones.", svGoToCreate: "Ve a Crear y elige un formato + línea para empezar.",
  svGoToCreateArrow: "Ir a Crear →",
  tvLoading1: "Buscando tendencias en YouTube…", tvLoading2: "Encontrando qué está funcionando esta semana…",
  tvLoading3: "Analizando contenido de producción musical…", tvLoading4: "Ya casi…",
  tvContentPro: "Contenido · Pro", tvDailyIdeas: "Ideas del día", tvUpdated: "Actualizado {{time}}",
  tvUpgradeToPro: "Actualiza a Pro",
  tvUpgradeBody: "Recibe un feed diario de videos en tendencia de YouTube en el nicho de producción musical — analizados por IA para que sepas exactamente por qué funcionan y cómo adaptarlos.",
  tvTryAgain: "Intentar de nuevo", tvNoneFound: "No se encontraron videos en tendencia. Vuelve mañana.",
  tvLoadError: "No se pudieron cargar las ideas en tendencia. Intenta más tarde.",
  tvWhyItWorks: "Por qué funciona", tvYourAngle: "Tu ángulo", tvWatchOnYoutube: "Ver en YouTube",
  tvUseAsReference: "Usar como referencia",
  cmBackToCalendar: "Volver al calendario",
}, true, true);

/* Upgrade sheet (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  upCalcLine1: "Your price is set.", upCalcLine2: "Now see the exact number.",
  upCalcSub: "Unlock your precise minimum & recommended rates, and turn them into income.",
  upContentLine1: "Your content engine,", upContentLine2: "unlocked.",
  upContentSub: "Inspire, Content Lab & Trending. Plan a month of content in minutes.",
  upGenericLine1: "Go Pro.", upGenericLine2: "Unlock everything.",
  upGenericSub: "Every Fennec Pro tool, one plan.",
  upFeature1Label: "Exact rate reveal", upFeature1Desc: "Your precise minimum & recommended prices",
  upFeature2Label: "Marketing Pro tools", upFeature2Desc: "Inspire, Content Lab & Trending",
  upFeature3Label: "5 free uploads/month", upFeature3Desc: "Timestamped track feedback from producers",
  upMonthly: "Monthly", upMonthlyPrice: "$14.99 / month",
  upYearly: "Yearly", upSave33: "SAVE 33%", upYearlyPrice: "$119.99 / year · ≈ $10 / mo",
  upRedirecting: "Redirecting…",
  upStartYearly: "Start Pro · $119.99 / year", upStartMonthly: "Start Pro · $14.99 / month",
  upMaybeLater: "Maybe later",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  upCalcLine1: "Ya tienes tu precio.", upCalcLine2: "Ahora ve el número exacto.",
  upCalcSub: "Desbloquea tus tarifas mínima y recomendada precisas, y conviértelas en ingreso.",
  upContentLine1: "Tu motor de contenido,", upContentLine2: "desbloqueado.",
  upContentSub: "Inspire, Content Lab y Tendencias. Planea un mes de contenido en minutos.",
  upGenericLine1: "Hazte Pro.", upGenericLine2: "Desbloquea todo.",
  upGenericSub: "Todas las herramientas Pro de Fennec, un solo plan.",
  upFeature1Label: "Tarifa exacta revelada", upFeature1Desc: "Tus precios mínimo y recomendado precisos",
  upFeature2Label: "Herramientas Pro de marketing", upFeature2Desc: "Inspire, Content Lab y Tendencias",
  upFeature3Label: "5 subidas gratis al mes", upFeature3Desc: "Notas con marca de tiempo de otros productores",
  upMonthly: "Mensual", upMonthlyPrice: "$14.99 / mes",
  upYearly: "Anual", upSave33: "AHORRA 33%", upYearlyPrice: "$119.99 / año · ≈ $10 / mes",
  upRedirecting: "Redirigiendo…",
  upStartYearly: "Empezar Pro · $119.99 / año", upStartMonthly: "Empezar Pro · $14.99 / mes",
  upMaybeLater: "Tal vez después",
}, true, true);

i18n.addResourceBundle("en", "translation", {
  pcClose: "Close", pcMyExpenses: "My expenses",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  pcClose: "Cerrar", pcMyExpenses: "Mis gastos",
}, true, true);

/* Business empty states (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  apEmptyTitle: "No active projects",
  apEmptyBody: "Projects start when a client approves a quote. Head to Quotes and hit “Mark as approved”.",
  apEmptyManual: "Or log work that started outside Fennec",
  qgNoClientsSaved: "No clients saved yet.", qgAddClientFirst: "Add a client first →",
  qgNoQuotesYet: "No quotes yet.", qgNoQuotesBody: "Create your first quote and send it to a client in seconds.",
  qgAddPaymentMethod: "Add at least one so the client knows where to send the money.",
  clNoClientsYet: "No clients yet.", clNoClientsBody: "Add your first contact to start sending quotes.",
  pdNoReferences: "No references yet. Add the tracks the client sent as “make it like this”.",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  apEmptyTitle: "Sin proyectos activos",
  apEmptyBody: "Los proyectos empiezan cuando un cliente aprueba una cotización. Ve a Cotizaciones y toca “Marcar como aprobada”.",
  apEmptyManual: "O registra trabajo que empezó fuera de Fennec",
  qgNoClientsSaved: "Aún no hay clientes guardados.", qgAddClientFirst: "Agrega un cliente primero →",
  qgNoQuotesYet: "Aún no hay cotizaciones.", qgNoQuotesBody: "Crea tu primera cotización y envíala a un cliente en segundos.",
  qgAddPaymentMethod: "Agrega al menos uno para que el cliente sepa dónde enviar el dinero.",
  clNoClientsYet: "Aún no hay clientes.", clNoClientsBody: "Agrega tu primer contacto para empezar a enviar cotizaciones.",
  pdNoReferences: "Aún no hay referencias. Agrega los tracks que el cliente mandó como “hazlo como este”.",
}, true, true);

/* Project detail — Creative brief (2026-08-05) */
i18n.addResourceBundle("en", "translation", {
  pdCreativeBrief: "Creative brief",
  pdCreativeBriefHint: "What the client asked for, in one place instead of scattered across a chat thread.",
  pdReference: "Reference",
  pdPasteLink: "Paste a Spotify or YouTube link",
  pdTrackNameOptional: "Track name (optional)",
  pdWhatToTake: "What to take from it: the drums, not the vocal",
  pdAddReference: "Add reference",
  pdGenre: "Genre", pdGenrePlaceholder: "Orchestral, indie pop…",
  pdMood: "Mood", pdMoodPlaceholder: "Hopeful, tense…",
  pdTempo: "Tempo", pdKey: "Key", pdKeyPlaceholder: "D minor",
  pdInstrumentation: "Instrumentation", pdInstrumentationPlaceholder: "Strings, piano, light percussion",
  pdFormatsNeeded: "Formats needed",
  pdOpenX: "Open {{title}}", pdRemoveX: "Remove {{title}}",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  pdCreativeBrief: "Brief creativo",
  pdCreativeBriefHint: "Lo que pidió el cliente, en un solo lugar en vez de disperso en un chat.",
  pdReference: "Referencia",
  pdPasteLink: "Pega un link de Spotify o YouTube",
  pdTrackNameOptional: "Nombre del track (opcional)",
  pdWhatToTake: "Qué tomar de ahí: la batería, no la voz",
  pdAddReference: "Agregar referencia",
  pdGenre: "Género", pdGenrePlaceholder: "Orquestal, indie pop…",
  pdMood: "Ánimo", pdMoodPlaceholder: "Esperanzador, tenso…",
  pdTempo: "Tempo", pdKey: "Tonalidad", pdKeyPlaceholder: "Re menor",
  pdInstrumentation: "Instrumentación", pdInstrumentationPlaceholder: "Cuerdas, piano, percusión ligera",
  pdFormatsNeeded: "Formatos necesarios",
  pdOpenX: "Abrir {{title}}", pdRemoveX: "Eliminar {{title}}",
}, true, true);

/* Business — hub de escritorio (2026-08-06) */
i18n.addResourceBundle("en", "translation", {
  bdNuevaCotizacion: "+ New quote",
  bdIngresosMes: "Revenue · MTD",
  bdPagosEsteMes: "{{count}} payment this month", bdPagosEsteMes_other: "{{count}} payments this month",
  bdNadaCobrado: "Nothing collected yet",
  bdSinIngresos: "No revenue logged yet.", bdSinIngresosSub: "Mark a project paid and it lands here.",
  bdPipeline: "Pipeline",
  bdEsperandoRespuesta: "Awaiting reply",
  bdCotizacionesFuera: "{{count}} quote out", bdCotizacionesFuera_other: "{{count}} quotes out",
  bdEnCurso: "In progress",
  bdProyectosCuenta: "{{count}} project", bdProyectosCuenta_other: "{{count}} projects",
  bdTeDeben: "Owed to you",
  bdSinAnticipo: "{{count}} without deposit", bdSinAnticipo_other: "{{count}} without deposit",
  bdVerTodas: "View all →",
  bdSinCotizaciones: "No quotes yet. Turn a calculated rate into a client-ready quote.",
  bdColCliente: "Client", bdColProyecto: "Project", bdColMonto: "Amount", bdColEstado: "Status",
  bdEstadoEnviada: "sent", bdEstadoPagada: "paid", bdEstadoBorrador: "draft",
  bdCotizacionesFueraPunto: "One quote out.", bdCotizacionesFueraPunto_other: "{{count}} quotes out.",
  bdArmaLaSiguiente: "Build the next one →",
  bdHerramientas: "Tools",
  bdSaberQueCobrar: "Know what to charge",
  bdEnCursoCuenta: "{{count}} in progress", bdEnCursoCuenta_other: "{{count}} in progress",
  bdEnTuCartera: "{{count}} in your roster", bdEnTuCartera_other: "{{count}} in your roster",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  bdNuevaCotizacion: "+ Nueva cotización",
  bdIngresosMes: "Ingresos · Del mes",
  bdPagosEsteMes: "{{count}} pago este mes", bdPagosEsteMes_other: "{{count}} pagos este mes",
  bdNadaCobrado: "Aún no has cobrado nada",
  bdSinIngresos: "Aún no hay ingresos registrados.", bdSinIngresosSub: "Marca un proyecto como pagado y aparece aquí.",
  bdPipeline: "Embudo",
  bdEsperandoRespuesta: "Esperando respuesta",
  bdCotizacionesFuera: "{{count}} cotización enviada", bdCotizacionesFuera_other: "{{count}} cotizaciones enviadas",
  bdEnCurso: "En curso",
  bdProyectosCuenta: "{{count}} proyecto", bdProyectosCuenta_other: "{{count}} proyectos",
  bdTeDeben: "Te deben",
  bdSinAnticipo: "{{count}} sin anticipo", bdSinAnticipo_other: "{{count}} sin anticipo",
  bdVerTodas: "Ver todas →",
  bdSinCotizaciones: "Aún no hay cotizaciones. Convierte una tarifa calculada en una cotización lista para el cliente.",
  bdColCliente: "Cliente", bdColProyecto: "Proyecto", bdColMonto: "Monto", bdColEstado: "Estado",
  bdEstadoEnviada: "enviada", bdEstadoPagada: "pagada", bdEstadoBorrador: "borrador",
  bdCotizacionesFueraPunto: "Una cotización enviada.", bdCotizacionesFueraPunto_other: "{{count}} cotizaciones enviadas.",
  bdArmaLaSiguiente: "Arma la siguiente →",
  bdHerramientas: "Herramientas",
  bdSaberQueCobrar: "Saber qué cobrar",
  bdEnCursoCuenta: "{{count}} en curso", bdEnCursoCuenta_other: "{{count}} en curso",
  bdEnTuCartera: "{{count}} en tu cartera", bdEnTuCartera_other: "{{count}} en tu cartera",
}, true, true);

/* Business — proyectos activos (2026-08-06) */
i18n.addResourceBundle("en", "translation", {
  apEstEnCurso: "In Progress", apEstRevision: "In Review",
  apEstEntregado: "Delivered", apEstPagado: "Paid",
  apSinFecha: "No deadline", apVenceHoy: "Due today",
  apVencido: "{{count}}d overdue", apVencido_other: "{{count}}d overdue",
  apRestan: "{{count}}d left", apRestan_other: "{{count}}d left",
  apCobrado: "{{monto}} in", apSinAnticipoAun: "No deposit yet",
  apPendiente: "{{monto}} pending",
  apVolverA: "Back to {{estado}}", apMarcarComo: "Mark as {{estado}}",
  apProyectoNuevo: "New project", apNombreProyecto: "Project name *",
  apNombreEjemplo: "e.g. Score for short film",
  apCliente: "Client", apSinCliente: "No client",
  apClientesOpcional: "Optional. Add clients with Pro to track who pays you.",
  apTipoProyecto: "Project type", apSelecciona: "Select…",
  apPrecioAcordado: "Agreed price *", apFechaEntrega: "Delivery deadline",
  apNotas: "Notes", apNotasEjemplo: "Deliverables, revisions, special requirements...",
  apGuardarProyecto: "Save project", apEliminar: "Delete", apNuevo: "New",
  apCobradoTotal: "Collected", apPendienteTotal: "Pending",
  apCerrados: "{{count}} closed", apCerrados_other: "{{count}} closed",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  apEstEnCurso: "En curso", apEstRevision: "En revisión",
  apEstEntregado: "Entregado", apEstPagado: "Pagado",
  apSinFecha: "Sin fecha límite", apVenceHoy: "Vence hoy",
  apVencido: "{{count}} día de retraso", apVencido_other: "{{count}} días de retraso",
  apRestan: "queda {{count}} día", apRestan_other: "quedan {{count}} días",
  apCobrado: "{{monto}} cobrado", apSinAnticipoAun: "Sin anticipo aún",
  apPendiente: "{{monto}} pendiente",
  apVolverA: "Volver a {{estado}}", apMarcarComo: "Marcar como {{estado}}",
  apProyectoNuevo: "Proyecto nuevo", apNombreProyecto: "Nombre del proyecto *",
  apNombreEjemplo: "ej. Música para cortometraje",
  apCliente: "Cliente", apSinCliente: "Sin cliente",
  apClientesOpcional: "Opcional. Agrega clientes con Pro para llevar quién te paga.",
  apTipoProyecto: "Tipo de proyecto", apSelecciona: "Selecciona…",
  apPrecioAcordado: "Precio acordado *", apFechaEntrega: "Fecha de entrega",
  apNotas: "Notas", apNotasEjemplo: "Entregables, revisiones, requerimientos especiales...",
  apGuardarProyecto: "Guardar proyecto", apEliminar: "Eliminar", apNuevo: "Nuevo",
  apCobradoTotal: "Cobrado", apPendienteTotal: "Pendiente",
  apCerrados: "{{count}} cerrado", apCerrados_other: "{{count}} cerrados",
}, true, true);

/* Business — clientes y embudo de etapas (2026-08-06) */
i18n.addResourceBundle("en", "translation", {
  clVolverBusiness: "Back to Business",
  clTusContactos: "Your contacts.",
  clSubtitulo: "Prospects, clients, everyone you've worked with.",
  clAgregarCliente: "Add client", clClienteGuardado: "Client saved",
  clEditarCliente: "Edit client", clClienteNuevo: "New client",
  clNombre: "Name *", clEmail: "Email *", clTelefono: "Phone",
  clEmpresaProyecto: "Company / Project",
  clEjNombre: "Jordan Rivers", clEjEmpresa: "Label XYZ",
  clGuardarCambios: "Save changes",
  plBorrador: "Draft", plEnviada: "Sent", plAprobada: "Approved",
  plEtapaActual: "Current stage: {{etapa}}", plMoverA: "Move to {{etapa}}",
  plEtapaDe: "Stage {{n}} of {{total}}",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  clVolverBusiness: "Volver a Negocio",
  clTusContactos: "Tus contactos.",
  clSubtitulo: "Prospectos, clientes, todos con los que has trabajado.",
  clAgregarCliente: "Agregar cliente", clClienteGuardado: "Cliente guardado",
  clEditarCliente: "Editar cliente", clClienteNuevo: "Cliente nuevo",
  clNombre: "Nombre *", clEmail: "Correo *", clTelefono: "Teléfono",
  clEmpresaProyecto: "Empresa / Proyecto",
  clEjNombre: "Jordan Rivers", clEjEmpresa: "Disquera XYZ",
  clGuardarCambios: "Guardar cambios",
  plBorrador: "Borrador", plEnviada: "Enviada", plAprobada: "Aprobada",
  plEtapaActual: "Etapa actual: {{etapa}}", plMoverA: "Mover a {{etapa}}",
  plEtapaDe: "Etapa {{n}} de {{total}}",
}, true, true);

/* Business — detalle de proyecto (2026-08-06) */
i18n.addResourceBundle("en", "translation", {
  pdDinero: "Money", pdRegistrarPago: "Log payment",
  pdAcordado: "Agreed", pdEditarPrecio: "Edit the agreed price",
  pdMonto: "Amount", pdAnticipo: "Deposit", pdPago: "Payment",
  pdSegundoPago: "Second installment", pdAgregar: "Add",
  pdNadaCobradoAun: "Nothing collected yet. Log the deposit when it lands.",
  pdEntregables: "Deliverables",
  pdEntregablesHint: "Copied from the approved quote. What you charged for is what you owe.",
  pdEjEntregable: "e.g. 30s cutdown",
  pdSinPartidas: "This project came from a quote with no line items. Add what you owe.",
  pdSinEntregables: "Nothing listed yet. Add what you owe the client.",
  pdVolverProyectos: "Back to projects", pdFechaEntrega: "Delivery date",
  pdNotasPlaceholder: "Anything that doesn't fit above.",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  pdDinero: "Dinero", pdRegistrarPago: "Registrar pago",
  pdAcordado: "Acordado", pdEditarPrecio: "Editar el precio acordado",
  pdMonto: "Monto", pdAnticipo: "Anticipo", pdPago: "Pago",
  pdSegundoPago: "Segundo pago", pdAgregar: "Agregar",
  pdNadaCobradoAun: "Aún no has cobrado nada. Registra el anticipo cuando caiga.",
  pdEntregables: "Entregables",
  pdEntregablesHint: "Copiados de la cotización aprobada. Lo que cobraste es lo que debes.",
  pdEjEntregable: "ej. corte de 30s",
  pdSinPartidas: "Este proyecto vino de una cotización sin partidas. Agrega lo que debes entregar.",
  pdSinEntregables: "Aún no hay nada. Agrega lo que le debes al cliente.",
  pdVolverProyectos: "Volver a proyectos", pdFechaEntrega: "Fecha de entrega",
  pdNotasPlaceholder: "Cualquier cosa que no entre arriba.",
}, true, true);

/* Business — generador de cotizaciones (2026-08-06) */
i18n.addResourceBundle("en", "translation", {
  qgTitulo: "Quote Generator", qgCrearCotizacion: "Create a quote.",
  qgSubtitulo: "Price your project and send it directly to your client.",
  qgNuevaCotizacion: "New quote",
  qgConfiguraPrimero: "Set up your pricing first",
  qgConfiguraPrimeroSub: "The Quote Generator uses your Pricing Calculator to set minimum rates.",
  qgAbrirCalculadora: "Open Pricing Calculator",
  qgCotizacionGuardada: "Quote saved. Ready to send.",
  qgProyectoActualizado: "Its project was updated too",
  qgEntregablesNuevos: "{{count}} new deliverable", qgEntregablesNuevos_other: "{{count}} new deliverables",
  qgEjNombreProyecto: "Original Soundtrack – Short Film",
  qgTipoProyecto: "Project type *",
  qgPrecioMinimo: "Minimum price", qgRecomendado: "Recommended",
  qgComoSeCalcula: "How these prices are calculated",
  qgAmbosVienenDe: "Both come from your Pricing Calculator. Change your expenses or hours there and these move with them.",
  qgDesglose: "Breakdown *", qgCantidad: "Quantity", qgPrecioUnitario: "Unit price",
  qgQuitarConcepto: "Remove concept",
  qgEtiquetaImpuesto: "Tax label", qgIvaOpcional: "VAT (optional)", qgTasa: "Rate %",
  qgOpcionesPago: "Payment options", qgNombreMetodo: "Method name", qgNombralo: "Name it",
  qgAgregarMetodo: "Add a payment method",
  qgClienteReq: "Client *", qgSeleccionaCliente: "Select a client",
  qgNotasTerminos: "Notes & terms (optional)",
  qgGuardarPorDefecto: "Save as default", qgGuardadoPorDefecto: "Saved as your default",
  qgGuardarPorDefectoFuturas: "Save as default for future quotes",
  qgInsertarTerminos: "Insert my default terms",
  qgGuardarCotizacion: "Save quote", qgCotizacionesGuardadas: "Saved quotes",
  qgAbrirPdf: "Open the client-ready PDF", qgEditarCotizacion: "Edit this quote", qgEditar: "Edit",
  qgEnviarCorreo: "Email this quote to the client",
  qgEnviadaOtroMedio: "You sent it another way (WhatsApp, PDF, in person)",
  qgMarcarEnviada: "Mark as sent",
  qgClienteAcepto: "The client said yes. This starts the project.",
  qgSiAprobada: "Yes, approved", qgMarcarAprobada: "Mark as approved",
  qgClienteRechazo: "The client passed on this quote", qgRechazada: "Declined",
  qgVerProyecto: "View project",
  qgProyectoBorrado: "Its project was deleted. Create it again from this quote.",
  qgRecrearProyecto: "Rebuild project",
  qgVolvieron: "They came back — put it back in play", qgReabrir: "Reopen",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  qgTitulo: "Generador de cotizaciones", qgCrearCotizacion: "Crea una cotización.",
  qgSubtitulo: "Ponle precio a tu proyecto y mándasela directo a tu cliente.",
  qgNuevaCotizacion: "Nueva cotización",
  qgConfiguraPrimero: "Primero configura tus precios",
  qgConfiguraPrimeroSub: "El generador usa tu calculadora de precios para fijar las tarifas mínimas.",
  qgAbrirCalculadora: "Abrir calculadora de precios",
  qgCotizacionGuardada: "Cotización guardada. Lista para enviar.",
  qgProyectoActualizado: "Su proyecto también se actualizó",
  qgEntregablesNuevos: "{{count}} entregable nuevo", qgEntregablesNuevos_other: "{{count}} entregables nuevos",
  qgEjNombreProyecto: "Banda sonora original – Cortometraje",
  qgTipoProyecto: "Tipo de proyecto *",
  qgPrecioMinimo: "Precio mínimo", qgRecomendado: "Recomendado",
  qgComoSeCalcula: "Cómo se calculan estos precios",
  qgAmbosVienenDe: "Los dos salen de tu calculadora de precios. Cambia tus gastos o tus horas ahí y estos se mueven contigo.",
  qgDesglose: "Desglose *", qgCantidad: "Cantidad", qgPrecioUnitario: "Precio unitario",
  qgQuitarConcepto: "Quitar concepto",
  qgEtiquetaImpuesto: "Etiqueta de impuesto", qgIvaOpcional: "IVA (opcional)", qgTasa: "Tasa %",
  qgOpcionesPago: "Formas de pago", qgNombreMetodo: "Nombre del método", qgNombralo: "Ponle nombre",
  qgAgregarMetodo: "Agregar una forma de pago",
  qgClienteReq: "Cliente *", qgSeleccionaCliente: "Selecciona un cliente",
  qgNotasTerminos: "Notas y términos (opcional)",
  qgGuardarPorDefecto: "Guardar como predeterminado", qgGuardadoPorDefecto: "Guardado como predeterminado",
  qgGuardarPorDefectoFuturas: "Guardar como predeterminado para futuras cotizaciones",
  qgInsertarTerminos: "Insertar mis términos guardados",
  qgGuardarCotizacion: "Guardar cotización", qgCotizacionesGuardadas: "Cotizaciones guardadas",
  qgAbrirPdf: "Abrir el PDF listo para el cliente", qgEditarCotizacion: "Editar esta cotización", qgEditar: "Editar",
  qgEnviarCorreo: "Enviar esta cotización por correo al cliente",
  qgEnviadaOtroMedio: "La mandaste por otro medio (WhatsApp, PDF, en persona)",
  qgMarcarEnviada: "Marcar como enviada",
  qgClienteAcepto: "El cliente dijo que sí. Esto arranca el proyecto.",
  qgSiAprobada: "Sí, aprobada", qgMarcarAprobada: "Marcar como aprobada",
  qgClienteRechazo: "El cliente no tomó esta cotización", qgRechazada: "Rechazada",
  qgVerProyecto: "Ver proyecto",
  qgProyectoBorrado: "Su proyecto fue eliminado. Créalo otra vez desde esta cotización.",
  qgRecrearProyecto: "Recrear proyecto",
  qgVolvieron: "Regresaron, ponla otra vez en juego", qgReabrir: "Reabrir",
}, true, true);

/* Business móvil + hero de red (2026-08-06) */
i18n.addResourceBundle("en", "translation", {
  bzSubtitulo: "Projects, quotes, clients, and the revenue they bring in.",
  nhMiRed: "My Network",
  nhBeatMakers: "Beat Makers", nhCompositores: "Composers",
  nhIngMezcla: "Mix Engineers", nhDisenoSonoro: "Sound Designers",
  nhVocalistas: "Vocalists", nhProductores: "Producers",
  nhArreglistas: "Arrangers", nhFoley: "Foley Artists",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  bzSubtitulo: "Proyectos, cotizaciones, clientes y el dinero que traen.",
  nhMiRed: "Mi red",
  nhBeatMakers: "Beatmakers", nhCompositores: "Compositores",
  nhIngMezcla: "Ing. de mezcla", nhDisenoSonoro: "Diseño sonoro",
  nhVocalistas: "Vocalistas", nhProductores: "Productores",
  nhArreglistas: "Arreglistas", nhFoley: "Artistas foley",
}, true, true);

/* Community + pantalla de acceso (2026-08-07).
   Fennec, PRO, Fennec ID, Melody Bank y GIFs NO se traducen: son nombres de
   producto, no texto. */
i18n.addResourceBundle("en", "translation", {
  agEsloganL1: "Your music business", agEsloganL2: "& community hub.",
  agApple: "Continue with Apple", agGoogle: "Continue with Google",
  agFacebook: "Continue with Facebook",
  agPassword: "Password", agOlvidaste: "Forgot password?", agO: "or",
  agCorreoReenviado: "Confirmation email sent again.",
  agReenviar: "Didn't get it? Resend confirmation email",
  agCargando: "Loading...", agEntrar: "Log in / Sign up",
  agConsentimiento: "By continuing, you agree to Fennec's",
  agTerminos: "Terms of Service", agY: "and", agPrivacidad: "Privacy Policy",
  agProveedorNoDisponible: "{{proveedor}} sign-in isn't available yet. Please use Google or email for now.",
  agRevisaCorreo: "Check your email to confirm your account.",
  agEscribeCorreoPrimero: "Enter your email above first, then tap \"Forgot password?\".",
  agRevisaCorreoReset: "Check your email for a link to reset your password.",

  cmHilo: "Thread", cmEscribeComentario: "Write a comment...",
  cmTuMarcaAqui: "Your brand here →", cmTuMarcaAquiPregunta: "Your brand here?",
  cmAnunciate: "Advertise on Fennec",
  cmNoticiasError: "Couldn't load news right now. Try again later.",
  cmAdjuntarAudio: "Attach audio from Melody Bank",
  cmAdjuntarImagen: "Attach image", cmAdjuntarGif: "Attach GIF",
  cmBuscarGifs: "Search GIFs...", cmVibe: "Vibe",
  cmEligeUsuario: "Choose your username",
  cmAsiTeVeran: "This is how other producers will see you",
  cmTuUsuario: "yourusername",
  cmEditarPerfil: "Edit profile", cmFotoEstudio: "Studio photo",
  cmSubirFotoEstudio: "Upload studio photo",
  cmBio: "Bio", cmBioPlaceholder: "Tell us about yourself...",
  cmGenerosEjemplo: "e.g. Dark Trap, Neoclassical...",
  cmTrabajoCon: "Worked with", cmTrabajoConEjemplo: "e.g. Bad Bunny, Hans Zimmer, Sony Music",
  cmTrabajoEn: "Worked in", cmTrabajoEnEjemplo: "e.g. Succession, FIFA 25, Coca-Cola ad",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  agEsloganL1: "Tu negocio musical", agEsloganL2: "y tu comunidad.",
  agApple: "Continuar con Apple", agGoogle: "Continuar con Google",
  agFacebook: "Continuar con Facebook",
  agPassword: "Contraseña", agOlvidaste: "¿Olvidaste tu contraseña?", agO: "o",
  agCorreoReenviado: "Correo de confirmación reenviado.",
  agReenviar: "¿No te llegó? Reenviar correo de confirmación",
  agCargando: "Cargando...", agEntrar: "Entrar / Crear cuenta",
  agConsentimiento: "Al continuar, aceptas los",
  agTerminos: "Términos de servicio", agY: "y la", agPrivacidad: "Política de privacidad",
  agProveedorNoDisponible: "Entrar con {{proveedor}} todavía no está disponible. Usa Google o tu correo por ahora.",
  agRevisaCorreo: "Revisa tu correo para confirmar tu cuenta.",
  agEscribeCorreoPrimero: "Escribe tu correo arriba y luego toca \"¿Olvidaste tu contraseña?\".",
  agRevisaCorreoReset: "Revisa tu correo, ahí va el enlace para cambiar tu contraseña.",

  cmHilo: "Hilo", cmEscribeComentario: "Escribe un comentario...",
  cmTuMarcaAqui: "Tu marca aquí →", cmTuMarcaAquiPregunta: "¿Tu marca aquí?",
  cmAnunciate: "Anúnciate en Fennec",
  cmNoticiasError: "No se pudieron cargar las noticias. Intenta más tarde.",
  cmAdjuntarAudio: "Adjuntar audio del Melody Bank",
  cmAdjuntarImagen: "Adjuntar imagen", cmAdjuntarGif: "Adjuntar GIF",
  cmBuscarGifs: "Buscar GIFs...", cmVibe: "Vibe",
  cmEligeUsuario: "Elige tu nombre de usuario",
  cmAsiTeVeran: "Así te van a ver los demás productores",
  cmTuUsuario: "tunombredeusuario",
  cmEditarPerfil: "Editar perfil", cmFotoEstudio: "Foto del estudio",
  cmSubirFotoEstudio: "Sube la foto de tu estudio",
  cmBio: "Bio", cmBioPlaceholder: "Cuéntanos de ti...",
  cmGenerosEjemplo: "ej. Dark Trap, Neoclásico...",
  cmTrabajoCon: "Ha trabajado con", cmTrabajoConEjemplo: "ej. Bad Bunny, Hans Zimmer, Sony Music",
  cmTrabajoEn: "Ha trabajado en", cmTrabajoEnEjemplo: "ej. Succession, FIFA 25, comercial de Coca-Cola",
}, true, true);

/* Categorías del feed + pestañas de Comunidad (2026-08-07).
   Viven en lib/communityTypes.ts y en PostCard como LLAVES, para que el filtro
   y la insignia de cada post cambien de idioma sin recalcular el feed. */
i18n.addResourceBundle("en", "translation", {
  catMusica: "Music", catEquipo: "Gear & Tools", catSync: "Sync & Scoring",
  catNegocio: "Business", catMentalidad: "Mindset", catGeneral: "General",
  cmTodas: "All", cmFeed: "Feed", cmNoticias: "News",
  cmCargarMas: "Load more", cmCargando: "Loading…", cmUsuarioNoEncontrado: "User not found.",
  myProfileCorto: "{{name}} — my profile",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  catMusica: "Música", catEquipo: "Equipo y herramientas", catSync: "Sync y scoring",
  catNegocio: "Negocio", catMentalidad: "Mentalidad", catGeneral: "General",
  cmTodas: "Todas", cmFeed: "Feed", cmNoticias: "Noticias",
  cmCargarMas: "Cargar más", cmCargando: "Cargando…", cmUsuarioNoEncontrado: "Usuario no encontrado.",
  myProfileCorto: "{{name}} — mi perfil",
}, true, true);

/* Melody Bank + Settings (2026-08-07).
   "Melody Bank" y "BPM" no se traducen: nombre de producto y término universal. */
i18n.addResourceBundle("en", "translation", {
  mbSubtitulo: "Capture your ideas before they disappear",
  mbTocaParaGrabar: "Tap to start recording",
  mbNombraIdea: "Name this idea...",
  mbNotasPlaceholder: "Notes (optional). Context, references, project ideas...",
  mbBuscar: "Search by title or notes...",
  mbAnimo: "Mood", mbSuenaA: "Sounds like", mbDetalles: "Details",
  mbMisMelodias: "My Melodies", mbFiltrarAnimo: "Filter by mood",
  mbSinIdeas: "No ideas saved yet.", mbSinResultados: "No results for that filter.",
  mbCompartir: "Share", mbCompartido: "Shared ✓", mbAbriendo: "Opening…",
  mbCompartirArchivo: "Share audio file",
  mbPublicando: "Posting…", mbPublicado: "Posted to Community!",
  mbCompartirFeed: "Share to Fennec feed", mbCompartirFennec: "Share to Fennec",
  mbPublicarEnFeed: "Post to the community feed",
  mbErrorCompartir: "Error sharing. Try again.",
  mbNoSoportado: "Sharing not supported on this browser.",
  mbAnimoOscuro: "Dark", mbAnimoLuminoso: "Uplifting", mbAnimoRelajado: "Chill",
  mbAnimoMelancolico: "Melancholic", mbAnimoAgresivo: "Aggressive",
  mbAnimoEpico: "Epic", mbAnimoRomantico: "Romantic", mbAnimoGroovy: "Groovy",
  mbBpmLento: "Slow", mbBpmMedio: "Mid", mbBpmRapido: "Fast",
  mbInsPiano: "Piano", mbInsGuitarra: "Guitar", mbInsCuerdas: "Strings",
  mbInsSinte: "Synth", mbInsBajo: "Bass", mbInsBateria: "Drums",
  mbInsMetales: "Brass", mbInsFlauta: "Flute",
  mbEstadoCruda: "Raw idea", mbEstadoEnCurso: "In progress", mbEstadoUsada: "Used",

  stSesionExpirada: "Your session expired. Please sign in again.",
  stErrorBorrarCuenta: "Could not delete your account. Please try again.",
  stErrorFoto: "Couldn't update the photo. Try again.",
  stSugRecibida: "Received", stSugPlaneada: "Planned", stSugEnCurso: "In progress",
  stSugPlaceholder: "I wish Fennec could…", stTusSugerencias: "Your suggestions",
  stTuNombre: "Your name", stEligeRol: "Select your role", stEligePais: "Select your country",
  stArtistaUrl: "Artist name / URL", stCanalUrl: "Channel URL",
  stSeguro: "Sure?", stBorrarCuenta: "Delete account",
  stBorrando: "Deleting...", stSiBorrar: "Yes, permanently delete",
  stBorrarCuentaAviso: "Permanently delete your Fennec account and all associated data: your profile, projects, quotes, clients, tracks, and social connections. This cannot be undone. Any active Pro subscription is cancelled.",
  dsVerMiPerfil: "{{name}} — view my community profile",
  dsCuentaAjustes: "{{name}} — account and settings",
  stReiniciar: "Reset",
  stReiniciarAviso: "Reset individual modules. This cannot be undone.",
  stLineasContenido: "Content Lines", stFormatosContenido: "Content Formats",
  stGuionesIdeas: "Scripts & Ideas", stPostsCalendario: "Calendar Posts",
}, true, true);
i18n.addResourceBundle("es", "translation", {
  mbSubtitulo: "Captura tus ideas antes de que se te vayan",
  mbTocaParaGrabar: "Toca para empezar a grabar",
  mbNombraIdea: "Ponle nombre a esta idea...",
  mbNotasPlaceholder: "Notas (opcional). Contexto, referencias, ideas de proyecto...",
  mbBuscar: "Busca por título o notas...",
  mbAnimo: "Ánimo", mbSuenaA: "Suena a", mbDetalles: "Detalles",
  mbMisMelodias: "Mis melodías", mbFiltrarAnimo: "Filtrar por ánimo",
  mbSinIdeas: "Aún no has guardado ideas.", mbSinResultados: "Sin resultados para ese filtro.",
  mbCompartir: "Compartir", mbCompartido: "Compartido ✓", mbAbriendo: "Abriendo…",
  mbCompartirArchivo: "Compartir archivo de audio",
  mbPublicando: "Publicando…", mbPublicado: "¡Publicado en la comunidad!",
  mbCompartirFeed: "Compartir en el feed de Fennec", mbCompartirFennec: "Compartir en Fennec",
  mbPublicarEnFeed: "Publicar en el feed de la comunidad",
  mbErrorCompartir: "Error al compartir. Intenta de nuevo.",
  mbNoSoportado: "Este navegador no permite compartir.",
  mbAnimoOscuro: "Oscuro", mbAnimoLuminoso: "Luminoso", mbAnimoRelajado: "Relajado",
  mbAnimoMelancolico: "Melancólico", mbAnimoAgresivo: "Agresivo",
  mbAnimoEpico: "Épico", mbAnimoRomantico: "Romántico", mbAnimoGroovy: "Groovy",
  mbBpmLento: "Lento", mbBpmMedio: "Medio", mbBpmRapido: "Rápido",
  mbInsPiano: "Piano", mbInsGuitarra: "Guitarra", mbInsCuerdas: "Cuerdas",
  mbInsSinte: "Sinte", mbInsBajo: "Bajo", mbInsBateria: "Batería",
  mbInsMetales: "Metales", mbInsFlauta: "Flauta",
  mbEstadoCruda: "Idea cruda", mbEstadoEnCurso: "En curso", mbEstadoUsada: "Usada",

  stSesionExpirada: "Tu sesión expiró. Vuelve a entrar.",
  stErrorBorrarCuenta: "No se pudo eliminar tu cuenta. Intenta de nuevo.",
  stErrorFoto: "No se pudo actualizar la foto. Intenta de nuevo.",
  stSugRecibida: "Recibida", stSugPlaneada: "Planeada", stSugEnCurso: "En curso",
  stSugPlaceholder: "Ojalá Fennec pudiera…", stTusSugerencias: "Tus sugerencias",
  stTuNombre: "Tu nombre", stEligeRol: "Elige tu rol", stEligePais: "Elige tu país",
  stArtistaUrl: "Nombre de artista / URL", stCanalUrl: "URL del canal",
  stSeguro: "¿Seguro?", stBorrarCuenta: "Eliminar cuenta",
  stBorrando: "Eliminando...", stSiBorrar: "Sí, eliminar para siempre",
  stBorrarCuentaAviso: "Elimina para siempre tu cuenta de Fennec y todos sus datos: tu perfil, proyectos, cotizaciones, clientes, tracks y conexiones. No se puede deshacer. Si tienes Pro activo, se cancela.",
  dsVerMiPerfil: "{{name}} — ver mi perfil de comunidad",
  dsCuentaAjustes: "{{name}} — cuenta y ajustes",
  stReiniciar: "Reiniciar",
  stReiniciarAviso: "Reinicia módulos por separado. No se puede deshacer.",
  stLineasContenido: "Líneas de contenido", stFormatosContenido: "Formatos de contenido",
  stGuionesIdeas: "Guiones e ideas", stPostsCalendario: "Posts del calendario",
}, true, true);

export default i18n;
