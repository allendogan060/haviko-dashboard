const GERMAN_FEDERAL_STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg",
  "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen",
  "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
];
const SUPABASE_URL = "https://dlapwemckfhxklytbqkk.supabase.co";
const SUPABASE_KEY = "sb_publishable_VeeQLARNn-sULZ4snvp3HA_Hd78H5RN";
const DEVELOPMENT_MODE = true;
const AUTH_STORAGE_KEY = "servora-web-session";
const LAST_RESTAURANT_KEY = "servora-web-restaurant";
const WEB_MUTATION_QUEUE_KEY = "haviko-web-mutation-queue";
const SHARED_SESSION_COOKIE = "haviko_web_session";
const SHARED_RESTAURANT_COOKIE = "haviko_web_restaurant";
const LOGIN_URL = "https://login.haviko.de/";
const DASHBOARD_URL = "https://dashboard.haviko.de/";
const IS_LOGIN_HOST = window.location.hostname === "login.haviko.de";
const IS_DASHBOARD_HOST = window.location.hostname === "dashboard.haviko.de";
const SWIFT_REFERENCE_SECONDS = 978307200;
const FALLBACK_ROUTE = new URLSearchParams(window.location.search).get("__route");
if (FALLBACK_ROUTE?.startsWith("/") && !FALLBACK_ROUTE.startsWith("//")) {
  window.history.replaceState(null, "", FALLBACK_ROUTE);
}
const INITIAL_AUTH_MODE =
  new URLSearchParams(window.location.search).get("mode") === "register"
    ? "register"
    : "login";

const $ = (id) => document.getElementById(id);
const app = {
  session: null,
  workspace: null,
  data: null,
  updatedAt: null,
  route: "overview",
  reservationDate: localDateInput(new Date()),
  tableArea: "",
  tableViewMode: "grid",
  teamViewMode: "grid",
  settingsTab: "restaurant",
  scheduleWeekOffset: 0,
  orderCart: [],
  orderTableID: null,
  counterCart: [],
  counterCategory: "Alle",
  appearanceMode: localStorage.getItem("haviko-appearance-mode") || "System",
  chatKind: "direct",
  chatConversations: [],
  chatMessages: [],
  chatConversationID: null,
  reviews: [],
  loading: false,
  isLoggingOut: false,
  isFlushingQueue: false,
  fiscalStatus: null
};

const roleTitles = {
  restaurant_manager: "Restaurantleitung",
  management: "Management",
  service: "Service",
  kitchen: "Küche",
  bar: "Bar"
};

const stateRoleToDatabaseRole = {
  Restaurantleitung: "restaurant_manager",
  Management: "management",
  Service: "service",
  Küche: "kitchen",
  Bar: "bar"
};

const teamPermissions = [
  ["closeOwnShift", "Eigene Schicht schließen", "Die eigene laufende Schicht beenden."],
  ["editOwnProfile", "Eigenes Profil bearbeiten", "Name und Telefonnummer des eigenen Profils ändern."],
  ["manageCashDay", "Tagesbetrieb verwalten", "Tage öffnen und Tagesabschlüsse durchführen."],
  ["viewStatistics", "Statistiken ansehen", "Umsatz- und Betriebsstatistiken öffnen."],
  ["manageProducts", "Produkte verwalten", "Produkte, Kategorien und Preise bearbeiten."],
  ["manageReservations", "Reservierungen verwalten", "Reservierungen anlegen und bearbeiten."],
  ["manageGuests", "Gästeregister verwalten", "Gastprofile ansehen und bearbeiten."],
  ["manageTables", "Tische und Bereiche verwalten", "Tischplan und Bereiche bearbeiten."],
  ["manageTeam", "Team und Schichtplan verwalten", "Zugänge und geplante Schichten bearbeiten."],
  ["manageStations", "Stationen und Drucker verwalten", "Ausgabewege und Geräte konfigurieren."],
  ["managePayments", "Zahlungen und Stornos bearbeiten", "Zahlungen korrigieren oder stornieren."],
  ["viewReports", "Berichte ansehen", "Abschlüsse und exportierbare Berichte öffnen."]
];

function defaultPermissions(role) {
  if (role === "Restaurantleitung") return teamPermissions.map(([id]) => id);
  if (role === "Service") {
    return ["closeOwnShift", "manageReservations", "manageGuests", "manageTables"];
  }
  return ["closeOwnShift"];
}

const routes = [
  { id: "overview", title: "Start", roles: ["restaurant_manager", "management", "service", "kitchen", "bar"] },
  { id: "tables", title: "Tische", roles: ["restaurant_manager", "management", "service"] },
  { id: "orders", title: "Bestellungen", roles: ["restaurant_manager", "management", "service", "kitchen", "bar"] },
  { id: "counter", title: "Theke", roles: ["restaurant_manager", "management", "service"] },
  { id: "vouchers", title: "Gutscheine", roles: ["restaurant_manager", "management", "service"] },
  { id: "reservations", title: "Reservierungen", roles: ["restaurant_manager", "management", "service"] },
  { id: "availability", title: "Verfügbarkeit", roles: ["restaurant_manager", "management"] },
  { id: "guests", title: "Gästeregister", roles: ["restaurant_manager", "management", "service"] },
  { id: "products", title: "Produkte", roles: ["restaurant_manager"] },
  { id: "team", title: "Team", roles: ["restaurant_manager"] },
  { id: "shifts", title: "Schicht", roles: ["restaurant_manager", "management", "service", "kitchen", "bar"] },
  { id: "chat", title: "Chat", roles: ["restaurant_manager", "management", "service", "kitchen", "bar"] },
  { id: "analytics", title: "Statistik", roles: ["restaurant_manager", "management"] },
  { id: "reviews", title: "Bewertungen", roles: ["restaurant_manager", "management"] },
  { id: "reports", title: "Berichte", roles: ["restaurant_manager", "management"] },
  { id: "inbox", title: "Postfach", roles: ["restaurant_manager", "management"] },
  { id: "stations", title: "Stationen", roles: ["restaurant_manager"] },
  { id: "settings", title: "Einstellungen", roles: ["restaurant_manager"] }
];

const routeSlugs = {
  overview: "start",
  tables: "tische",
  orders: "bestellungen",
  counter: "theke",
  vouchers: "gutscheine",
  reservations: "reservierungen",
  availability: "verfuegbarkeit",
  guests: "gaesteregister",
  products: "produkte",
  team: "team",
  shifts: "schicht",
  chat: "chat",
  analytics: "statistik",
  reviews: "bewertungen",
  reports: "berichte",
  inbox: "postfach",
  stations: "stationen",
  settings: "einstellungen"
};

const slugRoutes = Object.fromEntries(
  Object.entries(routeSlugs).map(([routeID, slug]) => [slug, routeID])
);

function routeFromLocation() {
  const segments = window.location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
  const slug = segments[0] === "r" ? segments[2] : segments[0];
  return slugRoutes[slug] || null;
}

function routePath(routeID) {
  const code = String(app.workspace?.restaurantCode || app.data?.restaurantCode || "")
    .trim()
    .toUpperCase();
  const slug = routeSlugs[routeID] || routeSlugs.overview;
  return `/r/${encodeURIComponent(code)}/${slug}`;
}

function syncRouteURL(mode = "push") {
  if (!IS_DASHBOARD_HOST || !app.workspace) return;
  const path = routePath(app.route);
  if (window.location.pathname === path) return;
  const method = mode === "replace" ? "replaceState" : "pushState";
  window.history[method]({ route: app.route }, "", path);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uuid() {
  return crypto.randomUUID();
}

function swiftDate(date = new Date()) {
  return date.getTime() / 1000 - SWIFT_REFERENCE_SECONDS;
}

function dateFromSwift(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    return new Date((value + SWIFT_REFERENCE_SECONDS) * 1000);
  }
  return new Date(value);
}

function localDateInput(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function dateTimeFromInputs(date, time) {
  return new Date(`${date}T${time}:00`);
}

function formatDate(value, options = { dateStyle: "medium", timeStyle: "short" }) {
  const date = dateFromSwift(value);
  if (!date || Number.isNaN(date.getTime())) return "–";
  return new Intl.DateTimeFormat("de-DE", options).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

function inferKitchenOperatingMode(stations) {
  const modes = new Set(stations.map((station) => station.defaultMode));
  if (modes.has("print") && modes.has("digital")) return "hybrid";
  if (modes.size === 1 && modes.has("print")) return "printedKitchen";
  return "digitalKitchen";
}

function kitchenOperatingModeTitle(mode) {
  if (mode === "printedKitchen") return "Nur Bondruck";
  if (mode === "hybrid") return "Kombiniert";
  return "Nur digitale Stationen";
}

function operatingModeSupports(mode, stationMode) {
  return mode === "hybrid" ||
    (mode === "printedKitchen" && stationMode === "print") ||
    (mode === "digitalKitchen" && stationMode === "digital");
}

function productRoutingIssue(product) {
  const station = app.data?.stations?.find(
    (item) => String(item.name).localeCompare(String(product.station), "de", { sensitivity: "base" }) === 0
  );
  if (!station) return "Keine Station zugewiesen";
  if (station.isActive === false) return `Station „${station.name}“ ist deaktiviert`;
  if (!operatingModeSupports(app.data.kitchenOperatingMode, station.defaultMode)) {
    return "Station passt nicht zur Ausgabeart";
  }
  if (station.defaultMode === "print") {
    const printer = app.data.printers.find((item) => item.id === station.printerID);
    if (!printer) return "Kein Drucker zugewiesen";
    if (printer.isActive === false) return `Drucker „${printer.name}“ ist deaktiviert`;
  }
  return "";
}

function sameDay(value, dateInput = localDateInput(new Date())) {
  const date = dateFromSwift(value);
  return date && localDateInput(date) === dateInput;
}

function activeCashDay() {
  return (app.data?.cashDaySessions || []).find((session) => session.status === "open") || null;
}

function cashMovementsForSession(session) {
  if (!session) return [];
  return (app.data?.cashMovements || [])
    .filter((movement) => movement.cashDaySessionID === session.id)
    .sort((a, b) => dateFromSwift(b.createdAt) - dateFromSwift(a.createdAt));
}

function movementTitle(kind) {
  return kind === "deposit" ? "Einlage" : "Entnahme";
}

function netCashMovementsForSession(session, until = new Date()) {
  return cashMovementsForSession(session)
    .filter((movement) => {
      const createdAt = dateFromSwift(movement.createdAt);
      return createdAt && createdAt <= until;
    })
    .reduce((sum, movement) => {
      const amount = Number(movement.amount || 0);
      return sum + (movement.kind === "deposit" ? amount : -amount);
    }, 0);
}

function cashRevenueForSession(session, until = new Date()) {
  if (!session) return 0;
  const openedAt = dateFromSwift(session.openedAt);
  const cashMethodIDs = new Set(
    app.data.paymentMethods.filter((method) => method.kind === "Bar").map((method) => method.id)
  );
  return app.data.paymentRecords
    .filter((payment) => {
      const createdAt = dateFromSwift(payment.createdAt);
      return cashMethodIDs.has(payment.methodID)
        && createdAt
        && createdAt >= openedAt
        && createdAt <= until;
    })
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function expectedCashForSession(session, until = new Date()) {
  return Number(session?.openingFloat || 0)
    + cashRevenueForSession(session, until)
    + netCashMovementsForSession(session, until);
}

function activePaymentMethods() {
  return (app.data?.paymentMethods || []).filter((method) => method.isEnabled !== false);
}

function counterCartTotal() {
  return app.counterCart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
}

function voucherStatus(voucher) {
  if (voucher.isActive === false) return { title: "Gesperrt", className: "red" };
  if (Number(voucher.remainingBalance || 0) <= 0) return { title: "Eingelöst", className: "" };
  return { title: "Aktiv", className: "green" };
}

function voucherCodePreview(configuration = app.data?.voucherConfiguration || {}) {
  const prefix = String(configuration.prefix || "GUT").trim().toUpperCase() || "GUT";
  const length = Math.max(4, Math.min(16, Number(configuration.length || 6)));
  const sample = configuration.style === "Nur Zahlen"
    ? "1234567890".slice(0, length)
    : configuration.style === "Nur Buchstaben"
      ? "ABCDEFGHJKLMNPQRSTUVWXYZ".slice(0, length)
      : "A7K2B9X4".slice(0, length);
  return configuration.usesSeparator === false ? `${prefix}${sample}` : `${prefix}-${sample}`;
}

function timeFromMinutes(minutes) {
  const value = Math.max(0, Math.min(23 * 60 + 59, Number(minutes || 0)));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function minutesFromTime(value, fallback) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  return Math.max(0, Math.min(23 * 60 + 59, hours * 60 + minutes));
}

function weekdayName(weekday) {
  return {
    1: "Sonntag",
    2: "Montag",
    3: "Dienstag",
    4: "Mittwoch",
    5: "Donnerstag",
    6: "Freitag",
    7: "Samstag"
  }[weekday] || "Tag";
}

function currentMember() {
  return (app.data?.team || []).find(
    (member) =>
      String(member.username || "").toLowerCase() ===
      String(app.workspace?.username || "").toLowerCase()
  );
}

function canManage() {
  return app.workspace?.role === "restaurant_manager";
}

async function enforceActiveMemberSession() {
  const member = currentMember();
  if (member && member.isActive === false) {
    toast("Zugang deaktiviert", "Dieser Mitarbeiterzugang wurde deaktiviert.", "error");
    await logout();
    throw new Error("Member access disabled");
  }
}

function routeAllowed(routeID) {
  const route = routes.find((item) => item.id === routeID);
  return Boolean(route?.roles.includes(app.workspace?.role));
}

function roleRouteList() {
  return routes.filter((route) => route.roles.includes(app.workspace?.role));
}

const CORE_NAV_ROUTES = ["overview", "tables", "orders", "counter", "reservations"];

function authHeaders(includeJSON = true) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${app.session?.access_token || SUPABASE_KEY}`
  };
  if (includeJSON) headers["Content-Type"] = "application/json";
  return headers;
}

async function parseResponse(response) {
  const text = await response.text();
  let value = null;
  if (text) {
    try {
      value = JSON.parse(text);
    } catch {
      value = text;
    }
  }
  if (!response.ok) {
    const message =
      value?.message ||
      value?.msg ||
      value?.error_description ||
      value?.hint ||
      `Anfrage fehlgeschlagen (${response.status})`;
    throw new Error(message);
  }
  return value;
}

async function rpc(name, parameters = {}) {
  await ensureSession();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(parameters)
  });
  return parseResponse(response);
}

function saveSession(session) {
  app.session = session;
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  document.cookie =
    `${SHARED_SESSION_COOKIE}=; Max-Age=0; Path=/; Domain=.haviko.de; Secure; SameSite=Lax`;
}

function readCookie(name) {
  const prefix = `${name}=`;
  const item = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function readStoredSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || "null");
    return (session?.access_token || session?.refresh_token) ? session : null;
  } catch {
    return null;
  }
}

function saveLastRestaurant(restaurantID) {
  localStorage.setItem(LAST_RESTAURANT_KEY, restaurantID);
  document.cookie =
    `${SHARED_RESTAURANT_COOKIE}=${encodeURIComponent(restaurantID)}; ` +
    "Max-Age=2592000; Path=/; Domain=.haviko.de; Secure; SameSite=Lax";
}

function readLastRestaurant() {
  return localStorage.getItem(LAST_RESTAURANT_KEY) || readCookie(SHARED_RESTAURANT_COOKIE);
}

function clearSession() {
  app.session = null;
  app.workspace = null;
  app.data = null;
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LAST_RESTAURANT_KEY);
  document.cookie =
    `${SHARED_SESSION_COOKIE}=; Max-Age=0; Path=/; Domain=.haviko.de; Secure; SameSite=Lax`;
  document.cookie =
    `${SHARED_RESTAURANT_COOKIE}=; Max-Age=0; Path=/; Domain=.haviko.de; Secure; SameSite=Lax`;
}

async function createAnonymousSession() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ data: { client: "servora-web" } })
  });
  const session = await parseResponse(response);
  session.expires_at = Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
  saveSession(session);
  return session;
}

async function refreshSession(refreshToken) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    }
  );
  const session = await parseResponse(response);
  session.expires_at = Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
  saveSession(session);
  return session;
}

async function ensureSession() {
  if (!app.session) {
    app.session = readStoredSession();
  }
  if (
    app.session?.access_token &&
    Number(app.session.expires_at || 0) > Math.floor(Date.now() / 1000) + 60
  ) {
    return app.session;
  }
  if (app.session?.refresh_token) {
    try {
      return await refreshSession(app.session.refresh_token);
    } catch {
      clearSession();
    }
  }
  return createAnonymousSession();
}

function defaultState(session) {
  const ownerID = uuid();
  return {
    restaurantName: session.restaurant_name,
    restaurantCode: session.restaurant_code,
    tables: [],
    areas: [],
    hiddenAreas: [],
    products: [],
    categories: ["Speisen"],
    categoryColors: { Speisen: "blue" },
    categoryParents: {},
    kitchenOperatingMode: "digitalKitchen",
    stations: [
      {
        id: uuid(),
        name: "Küche",
        icon: "flame",
        defaultMode: "digital",
        accessUsername: null,
        colorName: "orange",
        isActive: true,
        warningMinutes: 12,
        printerID: null
      }
    ],
    team: [
      {
        id: ownerID,
        name: session.display_name,
        role: "Restaurantleitung",
        phone: "",
        username: session.username
      }
    ],
    devices: [],
    currentMemberID: ownerID,
    tickets: [],
    reservations: [],
    guestReviews: [],
    tableOrders: {},
    tableSaleItems: {},
    tableRevenue: {},
    tablePaidAmounts: {},
    activeShiftStart: null,
    activeBreakStart: null,
    accumulatedBreak: 0,
    shiftRecords: [],
    scheduledShifts: [],
    shiftRequests: [],
    absenceRequests: [],
    paymentMethods: [
      { id: uuid(), name: "Barzahlung", kind: "Bar", isEnabled: true, isBuiltIn: true },
      { id: uuid(), name: "Kartenzahlung", kind: "Karte", isEnabled: true, isBuiltIn: true },
      { id: uuid(), name: "Gutschein", kind: "Gutschein", isEnabled: true, isBuiltIn: true }
    ],
    paymentRecords: [],
    counterSales: [],
    vouchers: [],
    voucherConfiguration: {
      style: "Buchstaben + Zahlen",
      prefix: "GUT",
      length: 6,
      usesSeparator: true
    },
    printers: [],
    printJobs: [],
    onlineBookingConfiguration: defaultOnlineBookingConfiguration(session),
    servoraPlusEntitlement: {
      restaurantID: session.restaurant_id,
      plan: "free",
      accessSource: "free",
      isActive: false,
      validUntil: null,
      grantedAt: null,
      grantedBy: null
    },
    fiscalConfiguration: {
      receiptPrefix: "SV",
      nextReceiptSequence: 1,
      isTestMode: true,
      fiscalizationState: "notConfigured",
      cashRegisterSerialNumber: null,
      tseSerialNumber: null,
      tseCertificateID: null,
      dsfinvKVersion: "2.4"
    },
    fiscalReceipts: [],
    cashDaySessions: [],
    cashMovements: [],
    fiscalAuditEvents: [],
    inboxNotifications: []
  };
}

function defaultOnlineBookingConfiguration(session = {}) {
  const publicID = session.restaurant_id || session.restaurantId || uuid();
  const restaurantName =
    session.restaurant_name || session.restaurantName || "Restaurant";
  return {
    publicID,
    restaurant: {
      id: uuid(),
      slug: String(restaurantName)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      name: restaurantName,
      description: "",
      restaurantType: "Restaurant",
      address: "",
      phone: "",
      email: "",
      website: "",
      directions: "",
      openingHoursText: "",
      languageCode: "de",
      logoData: null,
      titleImageData: null,
      settings: {
        bookingEnabled: false,
        automaticConfirmation: true,
        standardDurationMinutes: 90,
        minimumLeadMinutes: 120,
        maximumAdvanceDays: 90,
        maximumPartySize: 10,
        allowsSameDay: true,
        bufferMinutes: 15,
        slotIntervalMinutes: 15,
        dayAvailability: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
          id: weekday,
          isOpen: weekday !== 2,
          windows: [{
            id: uuid(),
            startMinutes: 18 * 60,
            endMinutes: 21 * 60
          }]
        })),
        allowedAreas: [],
        allowsAreaPreference: true,
        allowsConcreteTable: false,
        cancellationHours: 24,
        latestArrivalMinutes: 15,
        waitlistEnabled: true,
        maximumWaitlistEntriesPerSlot: 20,
        blockedPeriods: [],
        clockInRequiresLocation: false,
        clockInLatitude: null,
        clockInLongitude: null,
        clockInRadiusMeters: 150,
        allowsManagerLocationOverride: true,
        fieldVisibility: {
          Vorname: "Pflichtfeld",
          Nachname: "Pflichtfeld",
          "E-Mail-Adresse": "Pflichtfeld",
          Telefonnummer: "Optional",
          Adresse: "Optional",
          Hinweise: "Optional",
          "Freiwillige Allergiehinweise": "Optional"
        }
      }
    }
  };
}

function pairsToObject(value) {
  if (Array.isArray(value)) {
    const result = {};
    for (let i = 0; i < value.length - 1; i += 2) {
      result[value[i]] = value[i + 1];
    }
    return result;
  }
  if (value && typeof value === "object") return value;
  return {};
}

function objectToPairs(value) {
  if (Array.isArray(value)) return value;
  return Object.entries(value || {}).flatMap(([key, val]) => [key, val]);
}

function patchForRPC(patch) {
  const outgoingPatch = { ...patch };
  for (const key of ["tableOrders", "tableSaleItems", "tableRevenue", "tablePaidAmounts"]) {
    if (key in outgoingPatch) outgoingPatch[key] = objectToPairs(outgoingPatch[key]);
  }
  return outgoingPatch;
}

function queuedMutations() {
  try {
    return JSON.parse(localStorage.getItem(WEB_MUTATION_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueuedMutations(queue) {
  if (queue.length) localStorage.setItem(WEB_MUTATION_QUEUE_KEY, JSON.stringify(queue));
  else localStorage.removeItem(WEB_MUTATION_QUEUE_KEY);
}

function applyLocalPatch(patch) {
  app.data = normalizeState({ ...(app.data || {}), ...patch });
  app.updatedAt = `local-${Date.now()}`;
  render();
}

function queuePatchForSync(patch, message) {
  const queue = queuedMutations();
  queue.push({
    id: uuid(),
    restaurantID: app.workspace?.restaurantId || null,
    patch,
    message,
    queuedAt: new Date().toISOString()
  });
  writeQueuedMutations(queue);
  applyLocalPatch(patch);
  setSyncState("error", `${queue.length} offline`);
  const banner = $("offline-banner");
  banner.textContent = `${queue.length} Änderung${queue.length === 1 ? "" : "en"} warten auf Synchronisierung.`;
  banner.classList.remove("hidden");
  toast("Offline vorgemerkt", "Die Änderung wird bei Wiederverbindung synchronisiert.", "success");
  return true;
}

async function flushQueuedMutations() {
  if (app.isFlushingQueue || !navigator.onLine || !app.workspace?.restaurantId) return;
  let queue = queuedMutations().filter((item) => item.restaurantID === app.workspace.restaurantId);
  if (!queue.length) return;
  app.isFlushingQueue = true;
  setSyncState("saving", `${queue.length} wartet`);
  try {
    await loadWorkspace(app.workspace.restaurantId);
    queue = queuedMutations().filter((item) => item.restaurantID === app.workspace.restaurantId);
    while (queue.length) {
      const mutation = queue[0];
      const result = await rpc("web_patch_restaurant_state", {
        p_restaurant_id: app.workspace.restaurantId,
        p_patch: patchForRPC(mutation.patch),
        p_expected_updated_at: app.updatedAt
      });
      app.data = normalizeState(result.state);
      app.updatedAt = result.updatedAt;
      await enforceActiveMemberSession();
      const remaining = queuedMutations().filter((item) => item.id !== mutation.id);
      writeQueuedMutations(remaining);
      queue = remaining.filter((item) => item.restaurantID === app.workspace.restaurantId);
    }
    setSyncState("ready", "Aktuell");
    $("offline-banner").classList.add("hidden");
    toast("Synchronisiert", "Offline-Änderungen wurden übertragen.", "success");
    render();
  } catch (error) {
    if (String(error?.message || "").includes("STATE_CONFLICT")) {
      await loadWorkspace(app.workspace.restaurantId);
      setSyncState("error", "Konflikt");
      toast("Konflikt", "Offline-Änderungen wurden nicht automatisch gemerged. Prüfe den aktuellen Stand und speichere erneut.", "error");
    } else {
      setSyncState("error", "Wartet");
      const banner = $("offline-banner");
      banner.textContent = "Offline-Änderungen warten weiter auf Synchronisierung.";
      banner.classList.remove("hidden");
    }
  } finally {
    app.isFlushingQueue = false;
  }
}

function normalizeState(state = {}) {
  return {
    restaurantName: state.restaurantName || app.workspace?.restaurantName || "Restaurant",
    restaurantCode: state.restaurantCode || app.workspace?.restaurantCode || "",
    tables: state.tables || [],
    areas: state.areas || [],
    hiddenAreas: state.hiddenAreas || [],
    products: state.products || [],
    categories: state.categories?.length ? state.categories : ["Speisen"],
    categoryColors: state.categoryColors || { Speisen: "blue" },
    categoryParents: state.categoryParents || {},
    kitchenOperatingMode:
      state.kitchenOperatingMode ||
      inferKitchenOperatingMode(state.stations || []),
    stations: state.stations || [],
    team: state.team || [],
    devices: state.devices || [],
    currentMemberID: state.currentMemberID || null,
    tickets: state.tickets || [],
    reservations: state.reservations || [],
    guestReviews: state.guestReviews || [],
    tableOrders: pairsToObject(state.tableOrders),
    tableSaleItems: pairsToObject(state.tableSaleItems),
    tableRevenue: pairsToObject(state.tableRevenue),
    tablePaidAmounts: pairsToObject(state.tablePaidAmounts),
    activeShiftStart: state.activeShiftStart ?? null,
    activeBreakStart: state.activeBreakStart ?? null,
    accumulatedBreak: state.accumulatedBreak || 0,
    shiftRecords: state.shiftRecords || [],
    scheduledShifts: state.scheduledShifts || [],
    shiftRequests: state.shiftRequests || [],
    absenceRequests: state.absenceRequests || [],
    paymentMethods: state.paymentMethods || [],
    paymentRecords: state.paymentRecords || [],
    counterSales: state.counterSales || [],
    vouchers: state.vouchers || [],
    voucherConfiguration: state.voucherConfiguration || {
      style: "Buchstaben + Zahlen",
      prefix: "GUT",
      length: 6,
      usesSeparator: true
    },
    printers: state.printers || [],
    printJobs: state.printJobs || [],
    onlineBookingConfiguration:
      state.onlineBookingConfiguration ||
      defaultOnlineBookingConfiguration(app.workspace || {}),
    servoraPlusEntitlement: state.servoraPlusEntitlement || null,
    fiscalConfiguration: state.fiscalConfiguration || {
      receiptPrefix: "SV",
      nextReceiptSequence: 1,
      isTestMode: true,
      fiscalizationState: "notConfigured"
    },
    fiscalReceipts: state.fiscalReceipts || [],
    cashDaySessions: state.cashDaySessions || [],
    cashMovements: state.cashMovements || [],
    fiscalAuditEvents: state.fiscalAuditEvents || [],
    inboxNotifications: state.inboxNotifications || [],
    notificationConfiguration: state.notificationConfiguration || {
      inAppBannersEnabled: true,
      reservationNotifications: true,
      shiftNotifications: true,
      cashDayNotifications: true,
      quietHoursEnabled: false,
      quietHoursStartMinutes: 22 * 60,
      quietHoursEndMinutes: 7 * 60
    },
    loyaltyConfiguration: state.loyaltyConfiguration || {
      enabled: false,
      visitsRequired: 5,
      rewardKind: "freeProduct",
      voucherValue: 10,
      discountPercentage: 10,
      freeProductName: "Gratis Dessert"
    },
    digitalReceiptConfiguration: state.digitalReceiptConfiguration || {
      enabled: false,
      tipLinkURL: ""
    }
  };
}

async function initializeRestaurantState(session) {
  const initial = defaultState(session);
  const result = await rpc("web_initialize_restaurant_state", {
    p_restaurant_id: session.restaurant_id,
    p_state: initial
  });
  return result;
}

async function loadWorkspace(restaurantID = null) {
  if (app.isLoggingOut) return;
  setSyncState("saving", "Wird geladen");
  const result = await rpc("web_get_restaurant_workspace", {
    p_restaurant_id: restaurantID
  });
  if (app.isLoggingOut) return;
  if (!result?.restaurantId) throw new Error("Kein Restaurantzugang gefunden.");
  app.workspace = result;
  app.data = normalizeState(result.state);
  app.updatedAt = result.updatedAt;
  await enforceActiveMemberSession();
  saveLastRestaurant(result.restaurantId);
  showWorkspace();
  setSyncState("ready", "Aktuell");
}

function redirectToDashboardIfOnLoginHost() {
  if (IS_LOGIN_HOST) window.location.replace(DASHBOARD_URL);
}

async function checkSessionStillValid() {
  if (!app.workspace?.restaurantId || app.isLoggingOut) return;
  try {
    const result = await rpc("web_get_restaurant_workspace", {
      p_restaurant_id: app.workspace.restaurantId
    });
    if (!result?.restaurantId) {
      toast(
        "Abgemeldet",
        "Du hast dich an einem anderen Gerät angemeldet. Diese Sitzung wurde beendet.",
        "error"
      );
      clearSession();
      if (IS_DASHBOARD_HOST) {
        window.location.replace(LOGIN_URL);
      } else {
        showAuth();
      }
    } else if (
      result.updatedAt
      && result.updatedAt !== app.updatedAt
      && !queuedMutations().some((item) => item.restaurantID === app.workspace.restaurantId)
    ) {
      app.workspace = result;
      app.data = normalizeState(result.state);
      app.updatedAt = result.updatedAt;
      await enforceActiveMemberSession();
      setSyncState("ready", "Aktualisiert");
      render();
    }
  } catch {
    /* transient network errors shouldn't force a logout */
  }
}

async function savePatch(patch, message = "Gespeichert") {
  if (!navigator.onLine) {
    return queuePatchForSync(patch, message);
  }
  setSyncState("saving", "Synchronisiert");
  try {
    const result = await rpc("web_patch_restaurant_state", {
      p_restaurant_id: app.workspace.restaurantId,
      p_patch: patchForRPC(patch),
      p_expected_updated_at: app.updatedAt
    });
    app.data = normalizeState(result.state);
    app.updatedAt = result.updatedAt;
    await enforceActiveMemberSession();
    setSyncState("ready", "Aktuell");
    toast("Erledigt", message, "success");
    render();
    return true;
  } catch (error) {
    if (error.message.includes("STATE_CONFLICT")) {
      await loadWorkspace(app.workspace.restaurantId);
      toast(
        "Daten wurden aktualisiert",
        "Eine andere Haviko-Instanz war schneller. Der aktuelle Stand wurde neu geladen.",
        "error"
      );
    } else {
      setSyncState("error", "Fehler");
      if (navigator.onLine && /network|fetch|failed|timeout|timed out/i.test(String(error?.message || ""))) {
        queuePatchForSync(patch, message);
        setSyncState("error", "Backend nicht erreichbar");
        return true;
      }
      toast("Nicht gespeichert", friendlyError(error), "error");
    }
    return false;
  }
}

function friendlyError(error) {
  const message = String(error?.message || "Unbekannter Fehler");
  if (message.includes("Invalid restaurant credentials")) {
    return "Restaurantkennung, Name oder Passwort stimmen nicht.";
  }
  if (message.includes("Anonymous sign-ins are disabled")) {
    return "Anonyme Supabase-Anmeldung ist noch nicht aktiviert.";
  }
  if (message.includes("Failed to fetch")) {
    return "Haviko konnte den Server nicht erreichen.";
  }
  if (message.includes("Access denied")) {
    return "Deine Rolle darf diese Aktion nicht ausführen.";
  }
  return message;
}

function setSyncState(kind, text) {
  const element = $("sync-state");
  if (!element) return;
  element.classList.toggle("saving", kind === "saving");
  element.classList.toggle("error", kind === "error");
  element.querySelector("span").textContent = text;
}

function blockOperationalAction() {
  toast(
    "Nur in der App",
    "Bestellen, Platzieren, Bezahlen und Abschließen sind ausschließlich in der Haviko-App möglich. Das Web-Dashboard ist zur Ansicht und Verwaltung gedacht.",
    "error"
  );
  return true;
}

function toast(title, message, type = "success") {
  const item = document.createElement("div");
  item.className = "toast no-icon";
  item.innerHTML = `
    <div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span></div>
    <button type="button" aria-label="Hinweis schließen">×</button>
  `;
  item.querySelector("button").addEventListener("click", () => item.remove());
  $("toast-region").append(item);
  setTimeout(() => item.remove(), 4500);
}

function showAuth() {
  document.title = "Anmelden | Haviko";
  document.body.classList.remove("is-booting");
  $("boot-shell")?.classList.add("hidden");
  $("auth-shell").classList.remove("hidden");
  $("app-shell").classList.add("hidden");
}

function showWorkspace() {
  document.body.classList.remove("is-booting");
  $("boot-shell")?.classList.add("hidden");
  $("auth-shell").classList.add("hidden");
  $("app-shell").classList.remove("hidden");
  $("restaurant-name").textContent = app.data.restaurantName;
  $("restaurant-code").textContent = app.workspace.restaurantCode;
  $("restaurant-role").textContent = roleTitles[app.workspace.role] || app.workspace.role;
  $("sidebar-user-name").textContent = app.workspace.displayName;
  $("sidebar-user-role").textContent = roleTitles[app.workspace.role] || app.workspace.role;
  const requestedRoute = routeFromLocation();
  if (requestedRoute && routeAllowed(requestedRoute)) app.route = requestedRoute;
  if (!routeAllowed(app.route)) app.route = roleRouteList()[0]?.id || "overview";
  buildNavigation();
  render();
  syncRouteURL("replace");
}

function routeCount(route) {
  if (route.id === "orders") {
    return app.data.tickets.filter((ticket) => !["Serviert", "Abgebrochen"].includes(ticket.status)).length;
  }
  if (route.id === "reservations") {
    return app.data.reservations.filter(
      (reservation) =>
        sameDay(reservation.time) &&
        ["Zu bestätigen", "Geplant", "Platziert", "Warteliste"].includes(reservation.status)
    ).length;
  }
  if (route.id === "reviews") return app.reviews.length || app.data.guestReviews.length;
  return 0;
}

function navButton(route, mobile = false) {
  const count = routeCount(route);
  const mobileTitles = {
    overview: "Start",
    tables: "Tische",
    orders: "Bons",
    reservations: "Reserv.",
    shifts: "Schicht",
    more: "Mehr"
  };
  const title = mobile ? (mobileTitles[route.id] || route.title) : route.title;
  return `
    <button class="nav-button ${app.route === route.id ? "selected" : ""}"
      type="button" data-route="${route.id}" aria-current="${app.route === route.id ? "page" : "false"}">
      <span>${escapeHTML(title)}</span>
      ${count && !mobile ? `<span class="nav-count">${count}</span>` : ""}
    </button>
  `;
}

function buildNavigation() {
  const allowed = roleRouteList();
  const core = CORE_NAV_ROUTES.map((id) => allowed.find((route) => route.id === id)).filter(Boolean);
  const tucked = allowed.filter((route) => !core.some((item) => item.id === route.id));
  const desktopItems = tucked.length ? [...core, { id: "more-desktop", title: "Mehr", roles: [] }] : core;
  $("desktop-navigation").innerHTML = desktopItems.map((route) => navButton(route)).join("");
  const preferred = ["overview", "tables", "orders", "reservations", "shifts"];
  const mobileRoutes = preferred
    .map((id) => allowed.find((route) => route.id === id))
    .filter(Boolean)
    .slice(0, 4);
  const remaining = allowed.filter((route) => !mobileRoutes.some((item) => item.id === route.id));
  if (remaining.length) {
    mobileRoutes.push({ id: "more", title: "Mehr", roles: [] });
  } else {
    mobileRoutes.push(...allowed.filter((route) => !mobileRoutes.includes(route)).slice(0, 5 - mobileRoutes.length));
  }
  $("mobile-navigation").innerHTML = mobileRoutes.map((route) => navButton(route, true)).join("");
}

function navigate(routeID, options = {}) {
  if (routeID === "more") {
    showMoreNavigation();
    return;
  }
  if (routeID === "more-desktop") {
    showHiddenDesktopNavigation();
    return;
  }
  if (!routeAllowed(routeID)) return;
  app.route = routeID;
  syncRouteURL(options.historyMode || "push");
  buildNavigation();
  render();
  window.scrollTo({
    top: 0,
    behavior: options.smooth === false ? "auto" : "smooth"
  });
}

function render() {
  const route = routes.find((item) => item.id === app.route);
  document.title = `${route?.title || "Dashboard"} | Haviko`;
  $("page-title").textContent = route?.title || "Haviko";
  switch (app.route) {
    case "tables": renderTables(); break;
    case "orders": renderOrders(); break;
    case "counter": renderCounter(); break;
    case "vouchers": renderVouchers(); break;
    case "reservations": renderReservations(); break;
    case "availability": renderAvailability(); break;
    case "guests": renderGuests(); break;
    case "products": renderProducts(); break;
    case "team": renderTeam(); break;
    case "shifts": renderShifts(); break;
    case "chat": renderTeamChat(); break;
    case "analytics": renderAnalytics(); break;
    case "reviews": renderReviews(); break;
    case "reports": renderReports(); break;
    case "inbox": renderInbox(); break;
    case "stations": renderStations(); break;
    case "settings": renderSettings(); break;
    default: renderOverview();
  }
}

function metric(title, value, note) {
  return `
    <article class="metric">
      <div class="metric-head"><span>${escapeHTML(title)}</span></div>
      <strong>${escapeHTML(value)}</strong>
      <small>${escapeHTML(note)}</small>
    </article>
  `;
}

function dashboardMetric(route, title, value, note, tone = "") {
  const isAllowed = routeAllowed(route);
  const tag = isAllowed ? "button" : "article";
  const attrs = isAllowed ? `type="button" data-route="${escapeHTML(route)}"` : "";
  return `
    <${tag} class="metric dashboard-metric ${tone}" ${attrs}>
      <div class="metric-head"><span>${escapeHTML(title)}</span>${isAllowed ? `<small>Öffnen</small>` : ""}</div>
      <strong>${escapeHTML(value)}</strong>
      <small>${escapeHTML(note)}</small>
    </${tag}>
  `;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function germanHolidays(year) {
  const easter = easterSunday(year);
  const offset = (days) => { const d = new Date(easter); d.setDate(d.getDate() + days); return d; };
  return [
    { name: "Neujahr", date: new Date(year, 0, 1) },
    { name: "Karfreitag", date: offset(-2) },
    { name: "Ostersonntag", date: easter },
    { name: "Ostermontag", date: offset(1) },
    { name: "Tag der Arbeit", date: new Date(year, 4, 1) },
    { name: "Christi Himmelfahrt", date: offset(39) },
    { name: "Pfingstmontag", date: offset(50) },
    { name: "Tag der Deutschen Einheit", date: new Date(year, 9, 3) },
    { name: "1. Weihnachtstag", date: new Date(year, 11, 25) },
    { name: "2. Weihnachtstag", date: new Date(year, 11, 26) }
  ];
}

function upcomingHoliday(days = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today.getTime() + days * 86400000);
  const years = new Set([today.getFullYear(), horizon.getFullYear()]);
  const candidates = [...years].flatMap((year) => germanHolidays(year));
  return candidates
    .filter((holiday) => holiday.date >= today && holiday.date <= horizon)
    .sort((a, b) => a.date - b.date)[0] || null;
}

// Last 7 days vs the 7 days before that - a lightweight week-over-week
// trend for the Start tab, distinct from the deeper renderAnalytics()/
// renderReports() screens which cover much longer ranges.
function weeklyRevenueTrend() {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const total = app.data.paymentRecords
      .filter((payment) => sameDay(payment.createdAt, localDateInput(day)))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    days.push({ date: day, total });
  }
  const thisWeekTotal = days.reduce((sum, day) => sum + day.total, 0);
  let lastWeekTotal = 0;
  for (let offset = 13; offset >= 7; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    lastWeekTotal += app.data.paymentRecords
      .filter((payment) => sameDay(payment.createdAt, localDateInput(day)))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }
  const changePercent = lastWeekTotal > 0
    ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
    : (thisWeekTotal > 0 ? 100 : 0);
  return { days, thisWeekTotal, lastWeekTotal, changePercent };
}

function renderWeeklyTrendSection() {
  const trend = weeklyRevenueTrend();
  const maxDay = Math.max(1, ...trend.days.map((day) => day.total));
  const changeLabel = trend.changePercent > 0 ? `+${trend.changePercent}%` : `${trend.changePercent}%`;
  const changeClass = trend.changePercent > 0 ? "green" : trend.changePercent < 0 ? "red" : "";
  return `
    <section class="section">
      <header class="section-header"><div><h2>Woche im Vergleich</h2><span>Letzte 7 Tage vs. die 7 Tage davor</span></div>${canManage() ? `<span class="badge ${changeClass}">${changeLabel}</span>` : ""}</header>
      <div class="section-body">
        ${canManage() ? `
          <div class="sparkline">
            ${trend.days.map((day) => `
              <div class="sparkline-bar" style="--bar-height:${Math.max(4, Math.round((day.total / maxDay) * 100))}%" title="${escapeHTML(formatDate(day.date, { dateStyle: "medium" }))}: ${escapeHTML(formatCurrency(day.total))}">
                <span>${day.date.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")}</span>
              </div>`).join("")}
          </div>
          <div class="compact-list">
            ${settingStatus("Diese Woche", formatCurrency(trend.thisWeekTotal), true)}
            ${settingStatus("Vorherige Woche", formatCurrency(trend.lastWeekTotal), true)}
          </div>
        ` : `<p class="field-hint">Umsatzvergleich ist nur für die Restaurantleitung sichtbar.</p>`}
      </div>
    </section>`;
}

function renderOverview() {
  const todayReservations = app.data.reservations.filter(
    (reservation) => sameDay(reservation.time) && !["Storniert", "Nicht erschienen"].includes(reservation.status)
  );
  const activeTables = app.data.tables.filter((table) => table.status === "besetzt");
  const openTickets = app.data.tickets.filter((ticket) => ["Neu", "In Zubereitung", "Fertig"].includes(ticket.status));
  const readyTickets = openTickets.filter((ticket) => ticket.status === "Fertig");
  const seatedReservations = todayReservations.filter((reservation) => reservation.status === "Platziert");
  const expectedReservations = todayReservations.filter((reservation) => reservation.status !== "Platziert");
  const revenue = app.data.paymentRecords
    .filter((payment) => sameDay(payment.createdAt))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const cashDay = activeCashDay();
  const nextReservation = [...todayReservations]
    .filter((reservation) => dateFromSwift(reservation.time) >= new Date())
    .sort((a, b) => dateFromSwift(a.time) - dateFromSwift(b.time))[0];
  const activities = [
    ...todayReservations.map((reservation) => ({
      symbol: "R",
      title: reservation.name,
      subtitle: `${reservation.guests} Personen · ${reservation.status}`,
      date: reservation.time
    })),
    ...openTickets.map((ticket) => ({
      symbol: "B",
      title: `${ticket.table} · ${ticket.station}`,
      subtitle: `${ticket.lineItems?.length || ticket.items?.length || 0} Positionen · ${ticket.status}`,
      date: ticket.createdAt
    }))
  ].sort((a, b) => dateFromSwift(a.date) - dateFromSwift(b.date)).slice(0, 8);

  const holiday = upcomingHoliday();
  $("view").innerHTML = `
    <section class="dashboard-hero">
      <div>
        <p class="eyebrow">Heute</p>
        <h2>${escapeHTML(app.data.restaurantName || app.workspace?.restaurantName || "Haviko")}</h2>
        <p>${formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}${nextReservation ? ` · Nächste Reservierung ${formatDate(nextReservation.time, { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
      </div>
      <div class="dashboard-hero-status">
        <span class="badge ${cashDay ? "green" : "orange"}">${cashDay ? "Kassentag offen" : "Kassentag geschlossen"}</span>
        <span class="badge ${app.data.fiscalizationState === "ready" ? "green" : "orange"}">${app.data.fiscalizationState === "ready" ? "Fiskal bereit" : "Fiskal prüfen"}</span>
      </div>
    </section>
    ${holiday ? `<div class="compact-row no-icon" style="background:var(--purple-soft, #f2edfa);border-radius:var(--radius, 8px);padding:12px 14px;margin-bottom:16px;"><div class="activity-copy"><strong>${escapeHTML(holiday.name)}</strong><span>${holiday.date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} · oft mehr Gäste als sonst</span></div></div>` : ""}
    <div id="dashboard-incident-banner"></div>
    <div id="weather-widget"></div>
    <div class="metric-grid dashboard-metric-grid">
      ${canManage() ? dashboardMetric("analytics", "Umsatz heute", formatCurrency(revenue), "Tippen für Statistik", "green") : dashboardMetric("analytics", "Umsatz heute", "—", "Nur für Restaurantleitung")}
      ${dashboardMetric("reservations", "Reservierungen", String(todayReservations.length), `${todayReservations.reduce((sum, item) => sum + Number(item.guests || 0), 0)} Personen · ${expectedReservations.length} erwartet`, "orange")}
      ${dashboardMetric("tables", "Aktive Tische", String(activeTables.length), `${app.data.tables.length} Tische insgesamt · ${seatedReservations.length} platziert`, "blue")}
      ${dashboardMetric("orders", "Offene Bons", String(openTickets.length), `${readyTickets.length} abholbereit`, "purple")}
    </div>
    <div class="split-layout">
      <section class="section">
        <header class="section-header"><div><h2>Live-Betrieb</h2><span>Reservierungen und Bons in zeitlicher Reihenfolge</span></div></header>
        <div class="section-body">
          ${activities.length ? `
            <div class="activity-list">${activities.map((item) => `
              <div class="activity-row no-icon">
                <div class="activity-copy"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.subtitle)}</span></div>
                <time>${formatDate(item.date, { hour: "2-digit", minute: "2-digit" })}</time>
              </div>`).join("")}
            </div>` : emptyHTML("Noch nichts los", "Reservierungen und Bestellungen erscheinen hier automatisch.")}
        </div>
      </section>
      <section class="section">
        <header class="section-header"><div><h2>Schnellzugriff</h2><span>Die wichtigsten Arbeitsbereiche</span></div></header>
        <div class="section-body compact-list">
          ${canManage() ? quickAction("analytics", "Statistik öffnen", "Umsatz, Bons und Team auswerten") : ""}
          ${quickAction("reservations", "Reservierung anlegen", "Gast und Tisch eintragen")}
          ${routeAllowed("tables") ? quickAction("tables", "Tisch öffnen", "Walk-in platzieren oder bestellen") : ""}
          ${routeAllowed("orders") ? quickAction("orders", "Bons prüfen", "Küche und Abholung") : ""}
          ${routeAllowed("counter") ? quickAction("counter", "Theke öffnen", "Schnellverkauf vorbereiten") : ""}
          ${routeAllowed("shifts") ? quickAction("shifts", "Schicht verwalten", "Ein- und ausstempeln") : ""}
        </div>
      </section>
    </div>
    ${renderWeeklyTrendSection()}
  `;
  renderDashboardIncidentBanner();
  loadWeatherWidget();
}

const WEATHER_CODE_TEXT = {
  0: "Klarer Himmel", 1: "Überwiegend klar", 2: "Teilweise bewölkt", 3: "Bedeckt",
  45: "Nebel", 48: "Reifnebel",
  51: "Leichter Nieselregen", 53: "Nieselregen", 55: "Starker Nieselregen",
  61: "Leichter Regen", 63: "Regen", 65: "Starker Regen",
  71: "Leichter Schneefall", 73: "Schneefall", 75: "Starker Schneefall",
  80: "Regenschauer", 81: "Regenschauer", 82: "Heftige Regenschauer",
  95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Gewitter mit Hagel"
};

async function loadWeatherWidget() {
  const el = $("weather-widget");
  if (!el) return;
  const settings = app.data.onlineBookingConfiguration?.restaurant?.settings;
  const lat = settings?.clockInLatitude;
  const lon = settings?.clockInLongitude;
  if (lat == null || lon == null) {
    el.innerHTML = `<div class="compact-row no-icon" style="background:var(--surface-soft, #f4f4f6);border-radius:var(--radius, 8px);padding:12px 14px;margin-bottom:16px;"><div class="activity-copy"><strong>Wetter nicht verfügbar</strong><span>Adresse in den Einstellungen vervollständigen und Standort übernehmen.</span></div></div>`;
    return;
  }
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    if (!response.ok) throw new Error("weather request failed");
    const data = await response.json();
    const current = data?.current_weather;
    if (!current) throw new Error("no current weather");
    const description = WEATHER_CODE_TEXT[current.weathercode] || "Aktuelles Wetter";
    const temp = Math.round(current.temperature);
    el.innerHTML = `<div class="compact-row no-icon" style="background:var(--blue-soft, #eaf2fb);border-radius:var(--radius, 8px);padding:12px 14px;margin-bottom:16px;"><div class="activity-copy"><strong>${temp}°C · ${escapeHTML(description)}</strong><span>Am Restaurantstandort</span></div></div>`;
  } catch (error) {
    el.innerHTML = `<div class="compact-row no-icon" style="background:var(--surface-soft, #f4f4f6);border-radius:var(--radius, 8px);padding:12px 14px;margin-bottom:16px;"><div class="activity-copy"><strong>Wetter nicht verfügbar</strong><span>Bitte später erneut versuchen.</span></div></div>`;
  }
}

function quickAction(route, title, subtitle) {
  if (!routeAllowed(route)) return "";
  return `
    <button class="compact-row quiet full no-icon" type="button" data-route="${route}">
      <span class="activity-copy"><strong>${escapeHTML(title)}</strong>${subtitle ? `<span>${escapeHTML(subtitle)}</span>` : ""}</span>
      <span>›</span>
    </button>
  `;
}

function emptyHTML(title, text) {
  return `
    <div class="empty-state">
      <img class="empty-mark" src="https://login.haviko.de/assets/haviko-app-icon.png" alt="">
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(text)}</p>
    </div>
  `;
}

function tableStatusColor(status) {
  return {
    frei: "#0a8f70",
    besetzt: "#2878c7",
    reserviert: "#e9ad28",
    reinigen: "#7a55b3"
  }[status] || "#68746f";
}

function itemColor(name) {
  return {
    mint: "#0a8f70",
    green: "#3d9b55",
    orange: "#ef7b45",
    red: "#c83d4d",
    purple: "#7a55b3",
    blue: "#2878c7"
  }[name] || "#2878c7";
}

// Deterministic color per role name (same role always gets the same color,
// no matter which member has it) - mirrors the colored role-corner used in
// the reference admin UI Allen wants Team's card view to match.
const ROLE_COLOR_PALETTE = ["#c83d4d", "#ef7b45", "#e9ad28", "#3d9b55", "#0a8f70", "#2878c7", "#7a55b3"];
function roleColor(role) {
  const text = String(role || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return ROLE_COLOR_PALETTE[hash % ROLE_COLOR_PALETTE.length];
}

function memberInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function tableRunningTotal(tableID) {
  const bookedRevenue = Number(app.data.tableRevenue?.[tableID] || 0);
  const openSaleItems = (app.data.tableSaleItems?.[tableID] || [])
    .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  return bookedRevenue + openSaleItems;
}

function tableRemainingBalance(tableID) {
  return Math.max(0, tableRunningTotal(tableID) - Number(app.data.tablePaidAmounts?.[tableID] || 0));
}

function cashDayClosingIssues() {
  const occupiedTables = app.data.tables.filter((table) => table.status === "besetzt").length;
  const unsubmittedItems = Object.values(app.data.tableOrders || {})
    .flat()
    .reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const unpaidTables = app.data.tables
    .filter((table) => table.status === "besetzt" && tableRemainingBalance(table.id) > 0.005)
    .length;
  const issues = [];
  if (occupiedTables > 0) issues.push(`${occupiedTables} belegte Tische`);
  if (unsubmittedItems > 0) issues.push(`${unsubmittedItems} noch nicht bonierte Positionen`);
  if (unpaidTables > 0) issues.push(`${unpaidTables} Tische mit offenem Betrag`);
  return issues;
}

function upcomingReservationForTable(tableID, date = new Date()) {
  return app.data.reservations
    .filter(
      (reservation) =>
        reservation.tableID === tableID &&
        sameDay(reservation.time, localDateInput(date)) &&
        ["Zu bestätigen", "Geplant", "Platziert"].includes(reservation.status)
    )
    .sort((a, b) => dateFromSwift(a.time) - dateFromSwift(b.time))[0];
}

function renderTables() {
  const areas = [...new Set(app.data.tables.map((table) => table.area).filter(Boolean))];
  if (!areas.includes(app.tableArea)) app.tableArea = areas[0] || "";
  const tables = app.data.tables.filter((table) => table.area === app.tableArea);
  const viewMode = app.tableViewMode === "list" ? "list" : "grid";
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Tischübersicht</h2><p>Belegung, Reservierungen und laufende Umsätze.</p></div>
      <div class="tool-actions">
        <div class="segmented" role="tablist" aria-label="Ansicht" style="min-width:180px;margin-bottom:0;">
          <button class="${viewMode === "grid" ? "selected" : ""}" type="button" data-view-mode="grid">Plan</button>
          <button class="${viewMode === "list" ? "selected" : ""}" type="button" data-view-mode="list">Liste</button>
        </div>
        ${canManage() ? `<button class="secondary" type="button" data-action="add-table">+ Tisch</button>` : ""}
      </div>
    </div>
    <div class="filter-row">
      ${areas.map((area) => `<button class="filter-button ${area === app.tableArea ? "selected" : ""}" type="button" data-area="${escapeHTML(area)}">${escapeHTML(area)}</button>`).join("")}
    </div>
    ${tables.length ? (viewMode === "list" ? renderTableList(tables) : renderTableGrid(tables)) : emptyHTML("Noch keine Tische", canManage() ? "Lege deinen ersten Bereich und Tisch an." : "Die Restaurantleitung hat noch keine Tische angelegt.")}
  `;
}

function renderTableGrid(tables) {
  return `<div class="table-grid">
    ${tables.map((table) => {
      const reservation = upcomingReservationForTable(table.id);
      const total = tableRunningTotal(table.id);
      const seatedReservation = table.status === "besetzt"
        ? app.data.reservations.find((item) => item.tableID === table.id && item.status === "Platziert")
        : null;
      return `
        <button class="table-tile" type="button" data-table-id="${table.id}"
          style="--table-color:${tableStatusColor(table.status)};--status-color:${tableStatusColor(table.status)}">
          <span class="status-dot"></span>
          <div>
            <h3>${escapeHTML(table.number ? `${table.name} · ${table.number}` : table.name)}</h3>
            <p>${escapeHTML(table.area)} · ${escapeHTML(table.status)}</p>
            ${reservation ? `<span class="badge orange">${escapeHTML(reservation.name)} · ${formatDate(reservation.time, { hour: "2-digit", minute: "2-digit" })}</span>` : ""}
            ${seatedReservation?.moodFlag ? `<span class="badge">Stimmung: ${MOOD_LABELS[seatedReservation.moodFlag] || ""}</span>` : ""}
          </div>
          <div class="table-meta">
            <strong>${table.guests ? `${table.guests}/${table.capacity} Gäste` : `bis ${table.capacity} Gäste`}</strong>
            ${total ? `<span class="table-total">${formatCurrency(total)}</span>` : ""}
          </div>
        </button>`;
    }).join("")}
  </div>`;
}

function renderTableList(tables) {
  return `<section class="section table-section">
    <table class="data-table">
      <thead><tr><th>Tisch</th><th>Status</th><th>Gäste</th><th>Reservierung</th><th>Umsatz</th></tr></thead>
      <tbody>
        ${tables.map((table) => {
          const reservation = upcomingReservationForTable(table.id);
          const total = tableRunningTotal(table.id);
          return `
            <tr>
              <td><button class="row-button" type="button" data-table-id="${table.id}">${escapeHTML(table.number ? `${table.name} · ${table.number}` : table.name)}</button></td>
              <td><span class="badge" style="background:color-mix(in srgb, ${tableStatusColor(table.status)} 16%, white);color:${tableStatusColor(table.status)}">${escapeHTML(table.status)}</span></td>
              <td>${table.guests ? `${table.guests}/${table.capacity}` : `bis ${table.capacity}`}</td>
              <td>${reservation ? `${escapeHTML(reservation.name)} · ${formatDate(reservation.time, { hour: "2-digit", minute: "2-digit" })}` : "–"}</td>
              <td>${total ? formatCurrency(total) : "–"}</td>
            </tr>`;
        }).join("")}
      </tbody>
    </table>
  </section>`;
}

function ticketColor(status) {
  return status === "Neu" ? "#2878c7" : status === "In Zubereitung" ? "#ef7b45" : "#0a8f70";
}

function kitchenLoadForecast() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 2 * 3600000);
  const expectedGuests = app.data.reservations
    .filter((reservation) => {
      const time = dateFromSwift(reservation.time);
      return ["Geplant", "Platziert"].includes(reservation.status) && time >= now && time <= horizon;
    })
    .reduce((sum, reservation) => sum + Number(reservation.guests || 0), 0);
  const openTicketCount = app.data.tickets.filter((ticket) => ticket.status !== "Serviert" && ticket.status !== "Storniert").length;
  if (expectedGuests <= 0 && openTicketCount < 5) return null;
  const parts = [];
  if (expectedGuests > 0) parts.push(`in den nächsten 2 Std. ca. ${expectedGuests} Gäste erwartet`);
  if (openTicketCount >= 5) parts.push(`aktuell ${openTicketCount} offene Bons`);
  return `Stoßzeit voraus: ${parts.join(", ")}`;
}

function renderOrders() {
  const lanes = [
    { status: "Neu", title: "Neu" },
    { status: "In Zubereitung", title: "In Vorbereitung" },
    { status: "Fertig", title: "Fertig" }
  ];
  const forecast = kitchenLoadForecast();
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Küchen- und Servicebons</h2><p>Statusänderungen sind sofort für App und Web sichtbar.</p></div>
      ${routeAllowed("tables") ? `<button class="secondary" type="button" data-route="tables">Tisch auswählen</button>` : ""}
    </div>
    ${forecast ? `<div class="compact-row no-icon" style="background:var(--orange-soft, #fff0e8);border-radius:var(--radius, 8px);padding:12px 14px;margin-bottom:16px;"><div class="activity-copy"><strong>${escapeHTML(forecast)}</strong></div></div>` : ""}
    <div class="ticket-board">
      ${lanes.map((lane) => {
        const tickets = app.data.tickets.filter((ticket) => ticket.status === lane.status);
        return `
          <section class="ticket-lane">
            <header class="ticket-lane-header"><h3>${lane.title}</h3><span>${tickets.length}</span></header>
            <div class="ticket-stack">
              ${tickets.length ? tickets.map(ticketCard).join("") : emptyHTML("Leer", `Keine Bons in „${lane.title}“.`)}
            </div>
          </section>`;
      }).join("")}
    </div>
  `;
}

function ticketCard(ticket) {
  return `
    <article class="ticket-card" style="--ticket-color:${ticketColor(ticket.status)}">
      <header>
        <div><h4>${escapeHTML(ticket.table)}</h4><span class="badge">${escapeHTML(ticket.station)}</span></div>
        <time>${formatDate(ticket.createdAt, { hour: "2-digit", minute: "2-digit" })}</time>
      </header>
      <ul class="ticket-items">
        ${(ticket.lineItems || []).map((item) => `<li><strong>${Number(item.quantity || 1)}×</strong> ${escapeHTML(item.name)}${item.notes ? `<br><small>${escapeHTML(item.notes)}</small>` : ""}</li>`).join("") ||
          (ticket.items || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
      </ul>
      ${ticket.isReorder ? `<span class="badge orange">Nachbestellung</span>` : ""}
    </article>
  `;
}

function renderCounter() {
  const categories = ["Alle", ...new Set(app.data.categories || [])];
  if (!categories.includes(app.counterCategory)) app.counterCategory = "Alle";
  const products = [...app.data.products]
    .filter((product) => product.isAvailable !== false)
    .filter((product) => app.counterCategory === "Alle" || product.category === app.counterCategory)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));
  const cartTotal = counterCartTotal();
  const cashDay = activeCashDay();
  const fiscalReady = app.data.fiscalizationState === "ready" || app.data.fiscalizationState === "testMode";
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Theke</h2><p>Schnellverkauf mit denselben Produkten, Preisen und Zahlungsarten wie in der App.</p></div>
      <div class="tool-actions">
        <span class="badge ${cashDay ? "green" : "orange"}">${cashDay ? "Kassentag offen" : "Kassentag geschlossen"}</span>
        <span class="badge ${fiscalReady ? "green" : "orange"}">${fiscalReady ? "Fiskal bereit" : "Fiskal offen"}</span>
      </div>
    </div>
    <div class="filter-row">
      ${categories.map((category) => `<button class="filter-button ${category === app.counterCategory ? "selected" : ""}" type="button" data-counter-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("")}
    </div>
    <div class="counter-layout">
      <section class="section">
        <header class="section-header"><h2>Produkte</h2><span class="badge">${products.length}</span></header>
        <div class="section-body">
          ${products.length ? `<div class="product-grid equal-tile-grid">
            ${products.map((product) => `
              <button class="product-card counter-product-card" type="button" data-counter-product-id="${escapeHTML(product.id)}" style="--product-color:${itemColor(product.colorName)}">
                <header><div><h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(product.category)} · ${escapeHTML(product.station)}</p></div></header>
                <strong>${formatCurrency(product.price)}</strong>
                <footer><span class="badge">${Number(product.taxRate || 0)} % MwSt.</span><span class="row-button">Hinzufügen</span></footer>
              </button>`).join("")}
          </div>` : emptyHTML("Keine Produkte", "Aktive Produkte erscheinen hier für den Thekenverkauf.")}
        </div>
      </section>
      <aside class="section">
        <header class="section-header"><h2>Warenkorb</h2><strong>${formatCurrency(cartTotal)}</strong></header>
        <div class="section-body compact-list">
          ${app.counterCart.length ? app.counterCart.map((item) => `
            <div class="compact-row no-icon">
              <div class="activity-copy"><strong>${Number(item.quantity || 1)}× ${escapeHTML(item.name)}</strong><span>${formatCurrency(item.price)} Einzelpreis</span></div>
              <div class="row-actions">
                <button class="row-button" type="button" data-counter-dec-id="${escapeHTML(item.id)}">−</button>
                <button class="row-button" type="button" data-counter-inc-id="${escapeHTML(item.id)}">+</button>
                <button class="row-button danger-text" type="button" data-counter-remove-id="${escapeHTML(item.id)}">Entfernen</button>
              </div>
            </div>`).join("") : emptyHTML("Warenkorb leer", "Wähle links Produkte aus.")}
        </div>
        <div class="section-body">
          <div class="inline-alert">
            <strong>Web-Abschluss benötigt zentrale Fiskal-RPC</strong>
            <span>Produktauswahl und Warenkorb sind vorbereitet. Zahlung/Beleg werden erst aktiviert, sobald Web und App dieselbe serverseitige Checkout-Transaktion nutzen.</span>
          </div>
          <button class="primary full" type="button" data-action="counter-checkout" ${!app.counterCart.length || !cashDay || !fiscalReady ? "disabled" : ""}>Zahlung vorbereiten</button>
        </div>
      </aside>
    </div>
  `;
}

function renderVouchers() {
  const vouchers = [...app.data.vouchers].sort(
    (a, b) => dateFromSwift(b.createdAt) - dateFromSwift(a.createdAt)
  );
  const active = vouchers.filter((voucher) => voucher.isActive !== false && Number(voucher.remainingBalance || 0) > 0);
  const remaining = active.reduce((sum, voucher) => sum + Number(voucher.remainingBalance || 0), 0);
  const configuration = app.data.voucherConfiguration || {};
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Gutscheine</h2><p>Gutscheinbestand, Restwerte und Codeformat wie in der App.</p></div>
      <div class="tool-actions"><button class="secondary" type="button" data-action="voucher-settings">Codeformat</button></div>
    </div>
    <div class="metric-grid">
      ${metric("Aktive Gutscheine", String(active.length), "mit offenem Restwert")}
      ${metric("Offener Wert", formatCurrency(remaining), "noch nicht eingelöst")}
      ${metric("Ausgestellt", String(vouchers.length), "gesamt")}
      ${metric("Code-Beispiel", voucherCodePreview(configuration), "aktuelles Format")}
    </div>
    <section class="section table-section">
      <header class="section-header"><h2>Gutscheinliste</h2><span class="badge">${vouchers.length}</span></header>
      ${vouchers.length ? `<table class="data-table">
        <thead><tr><th>Code</th><th>Ausgestellt</th><th>Startwert</th><th>Restwert</th><th>Status</th><th></th></tr></thead>
        <tbody>${vouchers.map((voucher) => {
          const status = voucherStatus(voucher);
          return `
            <tr>
              <td><strong>${escapeHTML(voucher.code)}</strong><br><small>${escapeHTML(voucher.createdBy || "–")}</small></td>
              <td>${formatDate(voucher.createdAt, { dateStyle: "medium" })}</td>
              <td>${formatCurrency(voucher.initialBalance)}</td>
              <td>${formatCurrency(voucher.remainingBalance)}</td>
              <td><span class="badge ${status.className}">${status.title}</span></td>
              <td><button class="row-button" type="button" data-voucher-id="${escapeHTML(voucher.id)}">Details</button></td>
            </tr>`;
        }).join("")}</tbody>
      </table>` : emptyHTML("Noch keine Gutscheine", "Verkaufte Gutscheine erscheinen nach dem Checkout hier.")}
    </section>
  `;
}

function addCounterProduct(productID) {
  const product = app.data.products.find((item) => item.id === productID);
  if (!product || product.isAvailable === false) return;
  const existing = app.counterCart.find((item) => item.productID === productID);
  if (existing) {
    existing.quantity = Number(existing.quantity || 1) + 1;
  } else {
    app.counterCart.push({
      id: uuid(),
      productID: product.id,
      name: product.name,
      price: Number(product.price || 0),
      quantity: 1,
      taxRate: Number(product.taxRate || 0),
      station: product.station,
      itemKind: "product"
    });
  }
  renderCounter();
}

function updateCounterCartItem(itemID, delta) {
  const item = app.counterCart.find((entry) => entry.id === itemID);
  if (!item) return;
  item.quantity = Math.max(1, Number(item.quantity || 1) + delta);
  renderCounter();
}

function removeCounterCartItem(itemID) {
  app.counterCart = app.counterCart.filter((item) => item.id !== itemID);
  renderCounter();
}

function openCounterCheckout() {
  const cashDay = activeCashDay();
  const methods = activePaymentMethods();
  openModal({
    eyebrow: "Theke",
    title: "Zahlung vorbereiten",
    body: `
      <div class="detail-list">
        <div><span>Summe</span><strong>${formatCurrency(counterCartTotal())}</strong></div>
        <div><span>Kassentag</span><strong>${cashDay ? "Offen" : "Geschlossen"}</strong></div>
        <div><span>Zahlungsarten</span><strong>${methods.map((method) => method.name).join(", ") || "Keine"}</strong></div>
      </div>
      <div class="inline-alert">
        <strong>Checkout noch nicht freigeschaltet</strong>
        <span>Für App/Web-Gleichstand fehlt noch die gemeinsame serverseitige Checkout-Transaktion mit Fiskalbeleg, Idempotency und Gutscheinbuchung.</span>
      </div>
    `,
    footer: `<button class="primary" type="button" data-modal-action="close">Fertig</button>`
  });
}

function openVoucherDetail(voucherID) {
  const voucher = app.data.vouchers.find((item) => item.id === voucherID);
  if (!voucher) return;
  const status = voucherStatus(voucher);
  const canManage = ["restaurant_manager", "management"].includes(app.workspace?.role);
  openModal({
    eyebrow: "Gutschein",
    title: voucher.code,
    body: `
      <div class="detail-list">
        <div><span>Status</span><strong><span class="badge ${status.className}">${status.title}</span></strong></div>
        <div><span>Startwert</span><strong>${formatCurrency(voucher.initialBalance)}</strong></div>
        <div><span>Restwert</span><strong>${formatCurrency(voucher.remainingBalance)}</strong></div>
        <div><span>Ausgestellt</span><strong>${formatDate(voucher.createdAt)}</strong></div>
        <div><span>Erstellt von</span><strong>${escapeHTML(voucher.createdBy || "–")}</strong></div>
      </div>
    `,
    footer: `${canManage ? `<button class="secondary" type="button" data-modal-action="toggle-voucher" data-id="${escapeHTML(voucher.id)}">${voucher.isActive === false ? "Aktivieren" : "Sperren"}</button>` : ""}<button class="primary" type="button" data-modal-action="close">Fertig</button>`
  });
}

async function toggleVoucher(voucherID) {
  const vouchers = app.data.vouchers.map((voucher) =>
    voucher.id === voucherID ? { ...voucher, isActive: voucher.isActive === false } : voucher
  );
  if (await savePatch({ vouchers }, "Gutscheinstatus wurde gespeichert.")) closeModal();
}

function openVoucherSettings() {
  const configuration = app.data.voucherConfiguration || {};
  openModal({
    eyebrow: "Gutscheine",
    title: "Codeformat",
    body: `
      <form id="voucher-settings-form">
        <div class="field-grid">
          <label class="field"><span>Format</span><select id="voucher-style">
            ${["Buchstaben + Zahlen", "Nur Zahlen", "Nur Buchstaben"].map((style) => `<option value="${style}" ${configuration.style === style ? "selected" : ""}>${style}</option>`).join("")}
          </select></label>
          <label class="field"><span>Prefix</span><input id="voucher-prefix" maxlength="8" value="${escapeHTML(configuration.prefix || "GUT")}"></label>
          <label class="field"><span>Länge</span><input id="voucher-length" type="number" min="4" max="16" value="${Number(configuration.length || 6)}"></label>
          <label class="check-row"><input id="voucher-separator" type="checkbox" ${configuration.usesSeparator === false ? "" : "checked"}><span>Trennzeichen verwenden</span></label>
        </div>
        <p class="modal-note">Beispiel: <strong>${escapeHTML(voucherCodePreview(configuration))}</strong></p>
      </form>
    `,
    footer: `<button class="secondary" type="button" data-modal-action="close">Abbrechen</button><button class="primary" type="button" data-modal-action="save-voucher-settings">Speichern</button>`
  });
}

async function saveVoucherSettings() {
  const prefix = $("voucher-prefix")?.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "GUT";
  const length = Math.max(4, Math.min(16, Number($("voucher-length")?.value || 6)));
  const configuration = {
    style: $("voucher-style")?.value || "Buchstaben + Zahlen",
    prefix,
    length,
    usesSeparator: $("voucher-separator")?.checked !== false
  };
  if (await savePatch({ voucherConfiguration: configuration }, "Gutscheinformat wurde gespeichert.")) closeModal();
}

function renderReservations() {
  const reservations = app.data.reservations
    .filter((reservation) => sameDay(reservation.time, app.reservationDate))
    .sort((a, b) => dateFromSwift(a.time) - dateFromSwift(b.time));
  const active = reservations.filter((item) => !["Storniert", "Nicht erschienen"].includes(item.status));
  const tableCount = new Set(active.map((item) => item.tableID).filter(Boolean)).size;
  const guests = active.reduce((sum, item) => sum + Number(item.guests || 0), 0);
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Reservierungen</h2><p>Gäste, Tischzuweisung und Status an einem Ort.</p></div>
      <div class="tool-actions">
        <input id="reservation-date" type="date" value="${app.reservationDate}" aria-label="Reservierungsdatum">
        <button class="primary" type="button" data-action="add-reservation">+ Reservierung</button>
      </div>
    </div>
    <div class="metric-grid">
      ${metric("Buchungen", String(active.length), "am ausgewählten Tag")}
      ${metric("Tische", String(tableCount), `${active.filter((item) => !item.tableID).length} ohne Tisch`)}
      ${metric("Personen", String(guests), "erwartete Gäste")}
      ${metric("Platziert", String(active.filter((item) => item.status === "Platziert").length), "aktuell im Restaurant")}
    </div>
    <section class="section table-section">
      ${reservations.length ? `
        <table class="data-table">
          <thead><tr><th>Zeit</th><th>Gast</th><th>Personen</th><th>Tisch</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${reservations.map((reservation) => `
              <tr>
                <td>${formatDate(reservation.time, { hour: "2-digit", minute: "2-digit" })}</td>
                <td><button class="row-button" type="button" data-guest-id="${escapeHTML(guestKeyFor(reservation))}"><strong>${escapeHTML(reservation.name)}</strong></button><br><small>${escapeHTML(reservation.phone || reservation.email || "")}</small></td>
                <td>${Number(reservation.guests || 0)}</td>
                <td>${escapeHTML(reservation.table || "Nicht zugewiesen")}</td>
                <td>${statusBadge(reservation.status)}</td>
                <td><div class="row-actions"><button class="row-button" type="button" data-reservation-id="${reservation.id}">Öffnen</button></div></td>
              </tr>`).join("")}
          </tbody>
        </table>` : emptyHTML("Keine Reservierungen", "Für dieses Datum wurden noch keine Gäste eingetragen.")}
    </section>
  `;
}

function renderAvailability() {
  const configuration = structuredClone(
    app.data.onlineBookingConfiguration || defaultOnlineBookingConfiguration(app.workspace)
  );
  const settings = configuration.restaurant.settings;
  const days = [...(settings.dayAvailability || [])].sort((a, b) => {
    const order = (weekday) => (weekday === 1 ? 7 : weekday - 1);
    return order(a.id) - order(b.id);
  });
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Verfügbarkeit</h2><p>Online-Buchungszeiten, Vorlauf und Sperrzeiten wie in der App.</p></div>
      <div class="tool-actions"><button class="primary" type="button" data-action="save-availability">Speichern</button></div>
    </div>
    <section class="section">
      <header class="section-header"><h2>Buchungsregeln</h2><span class="badge ${settings.bookingEnabled ? "green" : "orange"}">${settings.bookingEnabled ? "Online aktiv" : "Online pausiert"}</span></header>
      <div class="section-body">
        <form id="availability-form">
          <div class="field-grid">
            <label class="check-row"><input id="availability-enabled" type="checkbox" ${settings.bookingEnabled ? "checked" : ""}><span>Online-Reservierung aktiv</span></label>
            <label class="check-row"><input id="availability-auto-confirm" type="checkbox" ${settings.automaticConfirmation ? "checked" : ""}><span>Automatisch bestätigen</span></label>
            <label class="field"><span>Standarddauer (Min.)</span><input id="availability-duration" type="number" min="15" max="360" step="15" value="${Number(settings.standardDurationMinutes || 90)}"></label>
            <label class="field"><span>Mindestvorlauf (Min.)</span><input id="availability-lead" type="number" min="0" max="10080" step="15" value="${Number(settings.minimumLeadMinutes || 120)}"></label>
            <label class="field"><span>Max. Tage im Voraus</span><input id="availability-advance" type="number" min="1" max="365" value="${Number(settings.maximumAdvanceDays || 90)}"></label>
            <label class="field"><span>Max. Personen</span><input id="availability-party" type="number" min="1" max="99" value="${Number(settings.maximumPartySize || 10)}"></label>
            <label class="field"><span>Slot-Intervall (Min.)</span><input id="availability-slot" type="number" min="5" max="120" step="5" value="${Number(settings.slotIntervalMinutes || 15)}"></label>
            <label class="field"><span>Puffer (Min.)</span><input id="availability-buffer" type="number" min="0" max="180" step="5" value="${Number(settings.bufferMinutes || 15)}"></label>
          </div>
        </form>
      </div>
    </section>
    <section class="section table-section">
      <header class="section-header"><h2>Wochentage</h2></header>
      <table class="data-table availability-table">
        <thead><tr><th>Tag</th><th>Online</th><th>Von</th><th>Bis</th></tr></thead>
        <tbody>${days.map((day) => {
          const window = day.windows?.[0] || { startMinutes: 18 * 60, endMinutes: 21 * 60 };
          return `
            <tr data-availability-day="${day.id}">
              <td><strong>${weekdayName(day.id)}</strong></td>
              <td><label class="switch"><input id="availability-day-${day.id}" type="checkbox" ${day.isOpen ? "checked" : ""}><span></span></label></td>
              <td><input id="availability-start-${day.id}" type="time" value="${timeFromMinutes(window.startMinutes)}"></td>
              <td><input id="availability-end-${day.id}" type="time" value="${timeFromMinutes(window.endMinutes)}"></td>
            </tr>`;
        }).join("")}</tbody>
      </table>
    </section>
    <section class="section table-section">
      <header class="section-header">
        <h2>Sperrzeiten</h2>
        <button class="secondary" type="button" data-action="add-blocked-period">+ Sperrzeit</button>
      </header>
      ${(settings.blockedPeriods || []).length ? `<table class="data-table">
        <thead><tr><th>Titel</th><th>Von</th><th>Bis</th><th></th></tr></thead>
        <tbody>${settings.blockedPeriods.map((period) => `
          <tr>
            <td><strong>${escapeHTML(period.title || "Sperrzeit")}</strong></td>
            <td>${formatDate(period.startsAt || period.start, { dateStyle: "medium", timeStyle: "short" })}</td>
            <td>${formatDate(period.endsAt || period.end, { dateStyle: "medium", timeStyle: "short" })}</td>
            <td><button class="row-button danger-text" type="button" data-blocked-period-remove="${escapeHTML(period.id)}">Entfernen</button></td>
          </tr>`).join("")}</tbody>
      </table>` : emptyHTML("Keine Sperrzeiten", "Geschlossene Tage oder Sonderzeiten kannst du hier sperren.")}
    </section>
  `;
}

async function saveAvailability() {
  const configuration = structuredClone(
    app.data.onlineBookingConfiguration || defaultOnlineBookingConfiguration(app.workspace)
  );
  const settings = configuration.restaurant.settings;
  settings.bookingEnabled = $("availability-enabled")?.checked || false;
  settings.automaticConfirmation = $("availability-auto-confirm")?.checked || false;
  settings.standardDurationMinutes = Math.max(15, Math.min(360, Number($("availability-duration")?.value || 90)));
  settings.minimumLeadMinutes = Math.max(0, Math.min(10080, Number($("availability-lead")?.value || 120)));
  settings.maximumAdvanceDays = Math.max(1, Math.min(365, Number($("availability-advance")?.value || 90)));
  settings.maximumPartySize = Math.max(1, Math.min(99, Number($("availability-party")?.value || 10)));
  settings.slotIntervalMinutes = Math.max(5, Math.min(120, Number($("availability-slot")?.value || 15)));
  settings.bufferMinutes = Math.max(0, Math.min(180, Number($("availability-buffer")?.value || 15)));
  settings.dayAvailability = [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const existing = (settings.dayAvailability || []).find((day) => day.id === weekday) || {};
    const start = minutesFromTime($(`availability-start-${weekday}`)?.value, 18 * 60);
    const end = minutesFromTime($(`availability-end-${weekday}`)?.value, 21 * 60);
    return {
      ...existing,
      id: weekday,
      isOpen: $(`availability-day-${weekday}`)?.checked || false,
      windows: [{
        id: existing.windows?.[0]?.id || uuid(),
        startMinutes: Math.min(start, Math.max(start + 15, end)),
        endMinutes: Math.max(end, start + 15)
      }]
    };
  });
  await savePatch({ onlineBookingConfiguration: configuration }, "Verfügbarkeit wurde gespeichert.");
}

function openBlockedPeriodEditor() {
  const today = localDateInput(new Date());
  openModal({
    eyebrow: "Verfügbarkeit",
    title: "Sperrzeit",
    body: `
      <form id="blocked-period-form">
        <label class="field"><span>Titel</span><input id="blocked-title" value="Geschlossen"></label>
        <div class="field-grid">
          <label class="field"><span>Von</span><input id="blocked-start" type="datetime-local" value="${today}T12:00"></label>
          <label class="field"><span>Bis</span><input id="blocked-end" type="datetime-local" value="${today}T23:00"></label>
        </div>
      </form>
    `,
    footer: `<button class="secondary" type="button" data-modal-action="close">Abbrechen</button><button class="primary" type="button" data-modal-action="save-blocked-period">Speichern</button>`
  });
}

async function saveBlockedPeriod() {
  const start = new Date($("blocked-start")?.value || "");
  const end = new Date($("blocked-end")?.value || "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    toast("Sperrzeit prüfen", "Ende muss nach Beginn liegen.", "error");
    return;
  }
  const configuration = structuredClone(
    app.data.onlineBookingConfiguration || defaultOnlineBookingConfiguration(app.workspace)
  );
  const periods = configuration.restaurant.settings.blockedPeriods || [];
  periods.push({
    id: uuid(),
    title: $("blocked-title")?.value.trim() || "Sperrzeit",
    startsAt: swiftDate(start),
    endsAt: swiftDate(end)
  });
  configuration.restaurant.settings.blockedPeriods = periods;
  if (await savePatch({ onlineBookingConfiguration: configuration }, "Sperrzeit wurde gespeichert.")) closeModal();
}

async function removeBlockedPeriod(periodID) {
  const configuration = structuredClone(
    app.data.onlineBookingConfiguration || defaultOnlineBookingConfiguration(app.workspace)
  );
  configuration.restaurant.settings.blockedPeriods =
    (configuration.restaurant.settings.blockedPeriods || []).filter((period) => period.id !== periodID);
  await savePatch({ onlineBookingConfiguration: configuration }, "Sperrzeit wurde entfernt.");
}

function statusBadge(status) {
  const type =
    ["Geplant", "Zu bestätigen"].includes(status) ? "blue" :
    ["Platziert", "Aktiv"].includes(status) ? "green" :
    ["Storniert", "Nicht erschienen", "Deaktiviert"].includes(status) ? "red" :
    status === "Warteliste" ? "purple" : "";
  return `<span class="badge ${type}">${escapeHTML(status)}</span>`;
}

function renderProducts() {
  const categories = ["Alle", ...new Set(app.data.categories)];
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Produkte</h2><p>Preise, Steuern, Kategorien und Stationen.</p></div>
      <div class="row-actions"><button class="secondary" type="button" data-action="manage-categories">Kategorien</button><button class="primary" type="button" data-action="add-product">+ Produkt</button></div>
    </div>
    <div class="filter-row">${categories.map((category, index) => `<span class="badge ${index === 0 ? "green" : ""}">${escapeHTML(category)}</span>`).join("")}</div>
    ${app.data.products.length ? `<div class="product-grid">
      ${app.data.products.map((product) => `
        <article class="product-card" style="--product-color:${itemColor(product.colorName)}">
          <header><div><h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(product.category)} · ${escapeHTML(product.station)}</p>${productRoutingIssue(product) ? `<span class="routing-warning">Hinweis: ${escapeHTML(productRoutingIssue(product))}</span>` : ""}</div>${product.isAvailable ? `<span class="badge green">Aktiv</span>` : `<span class="badge red">Pausiert</span>`}</header>
          <strong>${formatCurrency(product.price)}</strong>
          <footer><span class="badge">${Number(product.taxRate || 0)} % MwSt.</span><button class="row-button" type="button" data-product-id="${product.id}">Bearbeiten</button></footer>
        </article>`).join("")}
    </div>` : emptyHTML("Noch keine Produkte", "Erstelle Speisen und Getränke mit Preis, Steuer und Zielstation.")}
  `;
}

function openCategoryManager() {
  const rootCategories = app.data.categories.filter((category) => !app.data.categoryParents[category]);
  openModal({
    eyebrow: "Produkte",
    title: "Kategorien",
    body: `
      <form id="category-form">
        <div class="field-grid">
          <label class="field"><span>Name</span><input id="category-name" required></label>
          <label class="field"><span>Übergeordnet</span><select id="category-parent"><option value="">Keine</option>${rootCategories.map((category) => `<option>${escapeHTML(category)}</option>`).join("")}</select></label>
        </div>
        <label class="field"><span>Farbe</span><select id="category-color">${["blue", "mint", "green", "orange", "red", "purple"].map((color) => `<option value="${color}">${color}</option>`).join("")}</select></label>
        <button class="primary" type="button" data-modal-action="save-category">Hinzufügen</button>
      </form>
      <div class="compact-list category-manager-list">
        ${app.data.categories.map((category, index) => `
          <div class="compact-row category-row">
            <span class="category-swatch" style="background:${itemColor(app.data.categoryColors[category] || "blue")}"></span>
            <div class="activity-copy"><strong>${escapeHTML(category)}</strong><span>${app.data.categoryParents[category] ? `Unterkategorie von ${escapeHTML(app.data.categoryParents[category])}` : "Hauptkategorie"}</span></div>
            <div class="category-actions">
              <button class="row-button" type="button" data-modal-action="move-category-up" data-id="${escapeHTML(category)}" aria-label="${escapeHTML(category)} nach oben verschieben" ${index === 0 ? "disabled" : ""}>↑</button>
              <button class="row-button" type="button" data-modal-action="move-category-down" data-id="${escapeHTML(category)}" aria-label="${escapeHTML(category)} nach unten verschieben" ${index === app.data.categories.length - 1 ? "disabled" : ""}>↓</button>
              <button class="row-button danger-text" type="button" data-modal-action="delete-category" data-id="${escapeHTML(category)}" aria-label="${escapeHTML(category)} löschen" ${category === "Speisen" || app.data.products.some((product) => product.category === category) ? "disabled" : ""}>−</button>
            </div>
          </div>`).join("")}
      </div>`,
    footer: `<button class="primary" type="button" data-modal-action="close">Fertig</button>`
  });
}

async function saveCategory() {
  const name = $("category-name")?.value.trim();
  if (!name || app.data.categories.some((category) => category.toLowerCase() === name.toLowerCase())) {
    toast("Kategorie nicht angelegt", "Gib einen eindeutigen Namen ein.", "error");
    return;
  }
  const categories = [...app.data.categories, name];
  const categoryColors = { ...app.data.categoryColors, [name]: $("category-color").value };
  const categoryParents = { ...app.data.categoryParents };
  if ($("category-parent").value) categoryParents[name] = $("category-parent").value;
  if (await savePatch({ categories, categoryColors, categoryParents }, "Kategorie wurde angelegt.")) {
    openCategoryManager();
  }
}

async function moveCategory(name, direction) {
  const categories = [...app.data.categories];
  const index = categories.indexOf(name);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= categories.length) return;
  [categories[index], categories[destination]] = [categories[destination], categories[index]];
  if (await savePatch({ categories }, "Reihenfolge wurde gespeichert.")) openCategoryManager();
}

async function deleteCategory(name) {
  if (name === "Speisen" || app.data.products.some((product) => product.category === name)) return;
  const categoryColors = { ...app.data.categoryColors };
  const categoryParents = { ...app.data.categoryParents };
  delete categoryColors[name];
  delete categoryParents[name];
  Object.keys(categoryParents).forEach((child) => {
    if (categoryParents[child] === name) delete categoryParents[child];
  });
  if (await savePatch({
    categories: app.data.categories.filter((category) => category !== name),
    categoryColors,
    categoryParents
  }, "Kategorie wurde entfernt.")) openCategoryManager();
}

function renderTeam() {
  const seenNames = new Set();
  const visibleTeam = app.data.team.filter((member) => {
    const key = member.name.trim().toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
  const viewMode = app.teamViewMode === "list" ? "list" : "grid";
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Team & Geräte</h2><p>Persönliche Zugänge und fest zugewiesene Betriebsgeräte getrennt verwalten.</p></div>
      <div class="tool-actions">
        <div class="segmented" role="tablist" aria-label="Ansicht" style="min-width:180px;margin-bottom:0;">
          <button class="${viewMode === "grid" ? "selected" : ""}" type="button" data-team-view-mode="grid">Kacheln</button>
          <button class="${viewMode === "list" ? "selected" : ""}" type="button" data-team-view-mode="list">Liste</button>
        </div>
        <button class="secondary" type="button" data-action="add-device">Gerät hinzufügen</button>
        <button class="primary" type="button" data-action="add-member">Mitarbeiter hinzufügen</button>
      </div>
    </div>
    <section class="section table-section">
      <div class="section-heading"><div><p class="eyebrow">Persönliche Zugänge</p><h3>Mitarbeiter</h3></div></div>
      ${viewMode === "list" ? renderMemberList(visibleTeam) : renderMemberGrid(visibleTeam)}
    </section>
    <section class="section table-section">
      <div class="section-heading"><div><p class="eyebrow">Festes Gerät</p><h3>Geräte</h3><p>Der Gerätename ist zugleich der eindeutige Anmeldename.</p></div></div>
      ${app.data.devices.length ? `
        <table class="data-table">
          <thead><tr><th>Name und Anmeldung</th><th>Typ</th><th>Station</th><th></th></tr></thead>
          <tbody>
            ${app.data.devices.map((device) => {
              const station = app.data.stations.find((item) => item.id === device.stationID);
              return `<tr>
                <td><strong>${escapeHTML(device.name)}</strong><br><span class="muted">${escapeHTML(device.loginName || device.name)}</span></td>
                <td>${statusBadge(device.kind === "Küchenanzeige" ? "Digitales Stationsdisplay" : "Kasse")}</td>
                <td>${escapeHTML(station?.name || "–")}</td>
                <td><button class="row-button" type="button" data-device-id="${device.id}">Bearbeiten</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      ` : `<div class="empty-inline"><strong>Noch keine Gerätezugänge</strong><span>Lege eine Kasse oder ein digitales Stationsdisplay an.</span></div>`}
    </section>
  `;
}

function renderMemberGrid(members) {
  if (!members.length) return emptyHTML("Noch keine Mitarbeiter", "Lege dein erstes Teammitglied über den Button oben an.");
  return `<div class="member-grid">
    ${members.map((member) => {
      const isActive = member.isActive !== false;
      const color = roleColor(member.role);
      return `
        <button class="member-card${isActive ? "" : " is-disabled"}" type="button" data-member-id="${member.id}">
          <div class="member-card-top" style="background:${color}">
            <span class="member-card-mail" title="${member.phone ? escapeHTML(member.phone) : "Keine Telefonnummer"}">☏</span>
            ${!isActive ? `<span class="member-card-flag" title="Deaktiviert">⏸</span>` : ""}
          </div>
          <div class="member-avatar" style="border-color:${color}">${memberInitials(member.name)}</div>
          <strong class="member-card-name">${escapeHTML(member.name)}</strong>
          <span class="badge" style="background:color-mix(in srgb, ${color} 16%, white);color:${color}">${escapeHTML(member.role)}</span>
        </button>`;
    }).join("")}
  </div>`;
}

function renderMemberList(members) {
  return `<table class="data-table">
    <thead><tr><th>Name und Anmeldung</th><th>Rolle</th><th>Status</th><th>Telefon</th><th></th></tr></thead>
    <tbody>
      ${members.map((member) => {
        // Optional-safe wie im iOS-Model: fehlt das Feld (ältere
        // Daten), gilt das Konto als aktiv.
        const isActive = member.isActive !== false;
        return `
        <tr${isActive ? "" : ' class="is-disabled"'}>
          <td><strong>${escapeHTML(member.name)}</strong></td>
          <td>${statusBadge(member.role)}</td>
          <td>${statusBadge(isActive ? "Aktiv" : "Deaktiviert")}</td>
          <td>${escapeHTML(member.phone || "–")}</td>
          <td><div class="row-actions"><button class="row-button" type="button" data-member-id="${member.id}">Bearbeiten</button></div></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>`;
}

function staffingSuggestions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const suggestions = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    let totalGuests = 0;
    let weeksSampled = 0;
    for (let weeksBack = 1; weeksBack <= 8; weeksBack += 1) {
      const pastDay = new Date(day);
      pastDay.setDate(pastDay.getDate() - 7 * weeksBack);
      const dayGuests = app.data.reservations
        .filter((reservation) =>
          sameDay(reservation.time, localDateInput(pastDay)) && !["Storniert", "Nicht erschienen"].includes(reservation.status)
        )
        .reduce((sum, reservation) => sum + Number(reservation.guests || 0), 0);
      if (dayGuests > 0) {
        totalGuests += dayGuests;
        weeksSampled += 1;
      }
    }
    if (weeksSampled < 2) continue;
    const average = totalGuests / weeksSampled;
    const suggestedStaff = Math.max(1, Math.ceil(average / 15));
    const plannedStaff = new Set(
      app.data.scheduledShifts
        .filter((shift) => sameDay(shift.start, localDateInput(day)))
        .map((shift) => shift.memberID)
    ).size;
    suggestions.push({ date: day, average, weeksSampled, suggestedStaff, plannedStaff });
  }
  return suggestions;
}

// Monday-first week, matching the app's Wochenplan-Editor.
function scheduleWeekDays(offset) {
  const now = new Date();
  const day = now.getDay(); // 0 = Sonntag .. 6 = Samstag
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function renderScheduleGrid() {
  const days = scheduleWeekDays(app.scheduleWeekOffset || 0);
  const members = app.data.team.filter((member) => member.isActive !== false);
  const rangeLabel = `${days[0].toLocaleDateString("de-DE", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`;
  return `
    <section class="section table-section">
      <header class="section-header">
        <h2>Dienstplan</h2>
        <div class="tool-actions" style="margin:0;">
          <button class="row-button" type="button" data-week-offset="prev">←</button>
          <span class="badge">${rangeLabel}</span>
          <button class="row-button" type="button" data-week-offset="today">Heute</button>
          <button class="row-button" type="button" data-week-offset="next">→</button>
        </div>
      </header>
      <div class="section-body" style="overflow-x:auto;">
        ${members.length ? `<table class="data-table schedule-grid">
          <thead>
            <tr>
              <th>Mitarbeiter</th>
              ${days.map((date) => `<th>${date.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")}<br><span class="muted">${date.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })}</span></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${members.map((member) => `
              <tr>
                <td>${memberNameBadge(member.id, member.name)}</td>
                ${days.map((date) => {
                  const shift = app.data.scheduledShifts.find(
                    (item) => item.memberID === member.id && sameDay(item.start, localDateInput(date))
                  );
                  return `<td>
                    <button class="schedule-cell${shift ? " filled" : ""}" type="button"
                      data-schedule-cell="1" data-member-id="${member.id}" data-date="${localDateInput(date)}"
                      ${shift ? `data-shift-id="${shift.id}"` : ""}
                      style="${shift ? `border-color:${roleColor(member.role)};background:color-mix(in srgb, ${roleColor(member.role)} 12%, white);` : ""}">
                      ${shift ? `${formatDate(shift.start, { hour: "2-digit", minute: "2-digit" })}–${formatDate(shift.end, { hour: "2-digit", minute: "2-digit" })}` : "+"}
                    </button>
                  </td>`;
                }).join("")}
              </tr>`).join("")}
          </tbody>
        </table>` : emptyHTML("Noch keine aktiven Mitarbeiter", "Lege zuerst Teammitglieder im Team-Tab an.")}
      </div>
    </section>`;
}

function renderShifts() {
  const activeStart = app.data.activeShiftStart;
  const records = [...app.data.shiftRecords].sort(
    (a, b) => dateFromSwift(b.start) - dateFromSwift(a.start)
  );
  const current = currentMember();
  const planned = [...app.data.scheduledShifts]
    .filter((shift) => canManage() || shift.memberID === current?.id)
    .sort((a, b) => dateFromSwift(a.start) - dateFromSwift(b.start));
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Meine Schicht</h2><p>${activeStart ? `Gestartet um ${formatDate(activeStart, { hour: "2-digit", minute: "2-digit" })}` : "Derzeit nicht eingestempelt."}</p></div>
      <div class="tool-actions">
        ${canManage() ? `<button class="secondary" type="button" data-action="plan-shift">Schicht planen</button>` : ""}
        ${activeStart ? `
          <button class="secondary" type="button" data-action="toggle-break">${app.data.activeBreakStart ? "Pause beenden" : "Pause starten"}</button>
          <button class="danger" type="button" data-action="end-shift">Ausstempeln</button>
        ` : `<button class="primary" type="button" data-action="start-shift">Einstempeln</button>`}
      </div>
    </div>
    <div class="metric-grid">
      ${metric("Status", activeStart ? (app.data.activeBreakStart ? "Pause" : "Im Dienst") : "Nicht im Dienst", current?.name || app.workspace.displayName)}
      ${metric("Schichten", String(records.length), "gespeicherte Einsätze")}
      ${metric("Arbeitszeit", durationText(records.reduce((sum, record) => sum + workedSeconds(record), 0)), "gesamte Aufzeichnung")}
      ${metric("Offene Anfragen", String(app.data.shiftRequests.filter((request) => request.status === "Offen").length), "Schichtübernahmen")}
    </div>
    ${canManage() ? (() => {
      const suggestions = staffingSuggestions();
      return suggestions.length ? `
        <section class="section"><header class="section-header"><h2>Dienstplan-Vorschläge</h2></header><div class="section-body compact-list">
          ${suggestions.map((suggestion) => `
            <div class="compact-row no-icon"><div class="activity-copy">
              <strong>${suggestion.date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "short" })}</strong>
              <span>Ø ${Math.round(suggestion.average)} Gäste (letzte ${suggestion.weeksSampled} Wochen) · Vorschlag: ${suggestion.suggestedStaff} im Dienst, aktuell ${suggestion.plannedStaff} geplant${suggestion.average < 15 && suggestion.plannedStaff > suggestion.suggestedStaff ? " · Ruhiger Tag – Personal reduzieren oder früher schließen erwägen." : ""}</span>
            </div></div>`).join("")}
        </div></section>` : "";
    })() : ""}
    ${canManage() ? renderScheduleGrid() : `
    <section class="section table-section">
      <header class="section-header"><h2>Meine geplanten Schichten</h2><span class="badge">${planned.length}</span></header>
      ${planned.length ? `<table class="data-table">
        <thead><tr><th>Mitarbeiter</th><th>Datum</th><th>Beginn</th><th>Ende</th><th>Notiz</th></tr></thead>
        <tbody>${planned.slice(0, 50).map((shift) => `
          <tr><td>${memberNameBadge(shift.memberID, shift.memberName)}</td><td>${formatDate(shift.start, { dateStyle: "medium" })}</td><td>${formatDate(shift.start, { hour: "2-digit", minute: "2-digit" })}</td><td>${formatDate(shift.end, { hour: "2-digit", minute: "2-digit" })}</td><td>${escapeHTML(shift.note || "–")}</td></tr>`).join("")}</tbody>
      </table>` : emptyHTML("Noch keine geplanten Schichten", "Die Restaurantleitung kann hier den Dienstplan aufbauen.")}
    </section>`}
    <section class="section table-section">
      <header class="section-header"><h2>Schichtberichte</h2></header>
      ${records.length ? `<table class="data-table">
        <thead><tr><th>Mitarbeiter</th><th>Datum</th><th>Beginn</th><th>Ende</th><th>Pause</th><th>Arbeitszeit</th></tr></thead>
        <tbody>${records.slice(0, 30).map((record) => `
          <tr><td>${memberNameBadge(record.memberID)}</td><td>${formatDate(record.start, { dateStyle: "medium" })}</td><td>${formatDate(record.start, { hour: "2-digit", minute: "2-digit" })}</td><td>${formatDate(record.end, { hour: "2-digit", minute: "2-digit" })}</td><td>${durationText(record.breakDuration || 0)}</td><td><strong>${durationText(workedSeconds(record))}</strong></td></tr>`).join("")}</tbody>
      </table>` : emptyHTML("Noch keine Schichten", "Nach dem Ausstempeln erscheint deine Arbeitszeit hier.")}
    </section>
  `;
}

async function renderTeamChat() {
  $("view").innerHTML = emptyHTML("Chat wird geladen", "Konversationen werden aus Haviko geladen.");
  try {
    const conversations = await rpc("list_chat_conversations", {
      p_restaurant_id: app.workspace.restaurantId,
      p_kind: app.chatKind
    }) || [];
    app.chatConversations = conversations;
    if (!app.chatConversationID && conversations.length) app.chatConversationID = conversations[0].id;
    if (!conversations.some((item) => item.id === app.chatConversationID)) app.chatConversationID = conversations[0]?.id || null;
    if (app.chatConversationID) {
      app.chatMessages = await rpc("list_chat_messages", {
        p_conversation_id: app.chatConversationID,
        p_restaurant_id: app.workspace.restaurantId,
        p_before: null,
        p_limit: 50
      }) || [];
      await rpc("mark_chat_conversation_delivered", {
        p_conversation_id: app.chatConversationID,
        p_restaurant_id: app.workspace.restaurantId
      }).catch(() => {});
      await rpc("mark_chat_conversation_read", {
        p_conversation_id: app.chatConversationID,
        p_restaurant_id: app.workspace.restaurantId
      }).catch(() => {});
    } else {
      app.chatMessages = [];
    }
  } catch (error) {
    $("view").innerHTML = emptyHTML("Chat nicht erreichbar", friendlyError(error));
    return;
  }
  const currentUsername = app.workspace?.username || currentMember()?.username || "";
  const titleFor = (conversation) => {
    const usernames = conversation.member_usernames || conversation.memberUsernames || [];
    const names = conversation.member_display_names || conversation.memberDisplayNames || [];
    const otherIndex = usernames.findIndex((username) => String(username).toLowerCase() !== String(currentUsername).toLowerCase());
    return conversation.name || names[otherIndex] || names[0] || "Chat";
  };
  const selected = app.chatConversations.find((item) => item.id === app.chatConversationID);
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Chat</h2><p>Direkt- und Gruppenchats über dieselben Haviko-RPCs wie in der App.</p></div>
      <div class="tool-actions">
        <button class="secondary ${app.chatKind === "direct" ? "selected" : ""}" type="button" data-chat-kind="direct">Direkt</button>
        <button class="secondary ${app.chatKind === "group" ? "selected" : ""}" type="button" data-chat-kind="group">Gruppen</button>
      </div>
    </div>
    <div class="chat-layout">
      <section class="section">
        <header class="section-header"><h2>Konversationen</h2><span class="badge">${app.chatConversations.length}</span></header>
        <div class="section-body compact-list">
          ${app.chatConversations.length ? app.chatConversations.map((conversation) => `
            <button class="compact-row no-icon chat-row ${conversation.id === app.chatConversationID ? "selected" : ""}" type="button" data-chat-conversation-id="${escapeHTML(conversation.id)}">
              <div class="activity-copy"><strong>${escapeHTML(titleFor(conversation))}</strong><span>${escapeHTML(conversation.last_message_body || conversation.lastMessageBody || "Noch keine Nachrichten")}</span></div>
              ${Number(conversation.unread_count || conversation.unreadCount || 0) ? `<span class="badge green">${Number(conversation.unread_count || conversation.unreadCount)}</span>` : `<span class="badge">${formatDate(conversation.last_message_at || conversation.lastMessageAt, { dateStyle: "short", timeStyle: "short" })}</span>`}
            </button>`).join("") : emptyHTML("Noch keine Chats", "Starte neue Chats in der App; vorhandene Konversationen erscheinen hier.")}
        </div>
      </section>
      <section class="section">
        <header class="section-header"><h2>${selected ? escapeHTML(titleFor(selected)) : "Nachrichten"}</h2></header>
        <div class="section-body">
          ${selected ? `
            <div class="message-list">
              ${app.chatMessages.length ? app.chatMessages.map((message) => {
                const sender = message.sender_username || message.senderUsername || "";
                const mine = String(sender).toLowerCase() === String(currentUsername).toLowerCase();
                return `<article class="message-bubble ${mine ? "mine" : ""}">
                  <strong>${escapeHTML(message.sender_display_name || message.senderDisplayName || "Team")}</strong>
                  <p>${escapeHTML(message.body || "")}</p>
                  <span>${formatDate(message.created_at || message.createdAt, { dateStyle: "short", timeStyle: "short" })}</span>
                </article>`;
              }).join("") : emptyHTML("Noch keine Nachrichten", "Schreibe die erste Nachricht.")}
            </div>
            <form id="chat-message-form" class="chat-composer">
              <input id="chat-message-body" maxlength="2000" placeholder="Nachricht schreiben ..." required>
              <button class="primary" type="submit">Senden</button>
            </form>` : emptyHTML("Kein Chat ausgewählt", "Wähle links eine Konversation aus.")}
        </div>
      </section>
    </div>
  `;
}

async function sendChatMessage(event) {
  event.preventDefault();
  const body = $("chat-message-body")?.value.trim();
  if (!app.chatConversationID || !body) return;
  try {
    await rpc("send_chat_message", {
      p_conversation_id: app.chatConversationID,
      p_restaurant_id: app.workspace.restaurantId,
      p_body: body
    });
    await renderTeamChat();
  } catch (error) {
    toast("Nachricht nicht gesendet", friendlyError(error), "error");
  }
}

// Small colored dot per role (same roleColor() used by the Team card view)
// next to the name, so Dienstplan/Schichtberichte read at a glance who does
// what - matches the colored role-corner idea from the reference UI.
function memberNameBadge(memberID, fallbackName) {
  const member = app.data.team.find((item) => item.id === memberID);
  const name = escapeHTML(member?.name || fallbackName || "Mitarbeiter");
  if (!member) return `<strong>${name}</strong>`;
  return `<span style="display:inline-flex;align-items:center;gap:7px;"><span style="width:8px;height:8px;border-radius:50%;background:${roleColor(member.role)};flex:0 0 auto;"></span><strong>${name}</strong></span>`;
}

function guestKeyFor(reservation) {
  const contactKey = String(reservation.email || reservation.phone || "").trim().toLowerCase();
  return contactKey || `name:${String(reservation.name || "").trim().toLowerCase()}`;
}

function guestProfiles() {
  const profiles = new Map();
  for (const reservation of app.data.reservations) {
    const contactKey = String(reservation.email || reservation.phone || "").trim().toLowerCase();
    const key = contactKey || `name:${String(reservation.name || "").trim().toLowerCase()}`;
    if (!key || key === "name:") continue;
    const existing = profiles.get(key) || {
      id: key,
      name: reservation.name,
      email: reservation.email || "",
      phone: reservation.phone || "",
      street: reservation.street || "",
      houseNumber: reservation.houseNumber || "",
      postalCode: reservation.postalCode || "",
      city: reservation.city || "",
      reservations: []
    };
    existing.reservations.push(reservation);
    if (dateFromSwift(reservation.time) > dateFromSwift(existing.latest?.time || 0)) {
      existing.latest = reservation;
      Object.assign(existing, {
        name: reservation.name,
        email: reservation.email || existing.email,
        phone: reservation.phone || existing.phone,
        street: reservation.street || existing.street,
        houseNumber: reservation.houseNumber || existing.houseNumber,
        postalCode: reservation.postalCode || existing.postalCode,
        city: reservation.city || existing.city
      });
    }
    profiles.set(key, existing);
  }
  const loyalty = app.data.loyaltyConfiguration;
  const visitsRequired = Math.max(1, Number(loyalty?.visitsRequired || 5));
  return [...profiles.values()].map((profile) => {
    const stampCount = profile.reservations.filter(
      (reservation) => !["Storniert", "Nicht erschienen"].includes(reservation.status)
    ).length;
    const rewardsEarned = Math.floor(stampCount / visitsRequired);
    const stampsIntoCurrentCard = stampCount % visitsRequired;
    const birthdayReservation = [...profile.reservations]
      .sort((a, b) => dateFromSwift(b.time) - dateFromSwift(a.time))
      .find((reservation) => reservation.guestBirthday);
    const birthday = birthdayReservation ? dateFromSwift(birthdayReservation.guestBirthday) : null;
    const today = new Date();
    const isBirthdayToday = birthday && birthday.getMonth() === today.getMonth() && birthday.getDate() === today.getDate();
    return {
      ...profile,
      stampCount,
      rewardsEarned,
      stampsIntoCurrentCard,
      rewardReady: loyalty?.enabled && stampCount > 0 && stampsIntoCurrentCard === 0,
      birthday,
      isBirthdayToday
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function loyaltyRewardDescription(loyalty) {
  if (!loyalty) return "";
  if (loyalty.rewardKind === "voucher") {
    return `Gutschein im Wert von ${formatCurrency(Number(loyalty.voucherValue || 0))}`;
  }
  if (loyalty.rewardKind === "discount") {
    return `${Number(loyalty.discountPercentage || 10)}% Rabatt`;
  }
  return loyalty.freeProductName || loyalty.rewardDescription || "Gratis Produkt";
}

function renderGuests() {
  const guests = guestProfiles();
  const loyalty = app.data.loyaltyConfiguration;
  const visitsRequired = Math.max(1, Number(loyalty?.visitsRequired || 5));
  $("view").innerHTML = `
    <div class="page-tools"><div><h2>Gästeregister</h2><p>Kontaktdaten und Besuchshistorie aus Reservierungen und Walk-ins.</p></div><span class="badge">${guests.length}</span></div>
    <section class="section table-section">
      ${guests.length ? `<table class="data-table">
        <thead><tr><th>Gast</th><th>Kontakt</th><th>Besuche</th>${loyalty?.enabled ? `<th>Stempelkarte</th>` : ""}<th>Letzter Besuch</th><th></th></tr></thead>
        <tbody>${guests.map((guest) => `
          <tr>
            <td><strong>${escapeHTML(guest.name)}</strong></td>
            <td>${escapeHTML(guest.email || guest.phone || "–")}</td>
            <td>${guest.reservations.length}</td>
            ${loyalty?.enabled ? `<td>${guest.stampsIntoCurrentCard}/${visitsRequired}${guest.rewardReady ? ` <span class="badge green">Belohnung fällig</span>` : ""}</td>` : ""}
            <td>${formatDate(guest.latest?.time, { dateStyle: "medium" })}</td>
            <td><button class="row-button" type="button" data-guest-id="${escapeHTML(guest.id)}">Profil</button></td>
          </tr>`).join("")}</tbody>
      </table>` : emptyHTML("Noch keine Gäste", "Gäste erscheinen automatisch nach der ersten Reservierung oder einem Walk-in.")}
    </section>`;
}

function openGuestProfile(guestID) {
  const guest = guestProfiles().find((item) => item.id === guestID);
  if (!guest) return;
  const loyalty = app.data.loyaltyConfiguration;
  const visitsRequired = Math.max(1, Number(loyalty?.visitsRequired || 5));
  const visits = [...guest.reservations].sort((a, b) => dateFromSwift(b.time) - dateFromSwift(a.time));
  openModal({
    eyebrow: "Gästeregister",
    title: guest.name,
    body: `
      <div class="detail-list">
        <div><span>E-Mail</span><strong>${escapeHTML(guest.email || "–")}</strong></div>
        <div><span>Telefon</span><strong>${escapeHTML(guest.phone || "–")}</strong></div>
        <div><span>Adresse</span><strong>${escapeHTML([guest.street, guest.houseNumber, guest.postalCode, guest.city].filter(Boolean).join(" ") || "–")}</strong></div>
        <div><span>Besuche</span><strong>${visits.length}</strong></div>
        ${guest.isBirthdayToday ? `<div><span>Geburtstag</span><strong>Heute</strong></div>` : ""}
        ${loyalty?.enabled ? `
        <div><span>Stempelkarte</span><strong>${guest.stampsIntoCurrentCard}/${visitsRequired}${guest.rewardReady ? " · Belohnung fällig" : ""}</strong></div>
        <div><span>Eingelöste Belohnungen</span><strong>${guest.rewardsEarned}</strong></div>
        <div><span>Prämie</span><strong>${escapeHTML(loyaltyRewardDescription(loyalty) || "–")}</strong></div>` : ""}
      </div>
      <div class="activity-list">${visits.map((visit) => `
        <article class="activity-row no-icon"><div class="activity-copy"><strong>${formatDate(visit.time)}</strong><span>${Number(visit.guests)} Personen · ${escapeHTML(visit.status)}</span></div></article>`).join("")}</div>`,
    footer: `
      <button class="secondary" type="button" data-modal-action="edit-guest" data-id="${escapeHTML(guest.latest?.id || "")}">Bearbeiten</button>
      <button class="primary" type="button" data-modal-action="close">Fertig</button>`
  });
}

function workedSeconds(record) {
  const start = dateFromSwift(record.start);
  const end = dateFromSwift(record.end);
  if (!start || !end) return 0;
  return Math.max(0, (end - start) / 1000 - Number(record.breakDuration || 0));
}

function durationText(seconds) {
  const hours = Math.floor(Number(seconds || 0) / 3600);
  const minutes = Math.floor((Number(seconds || 0) % 3600) / 60);
  return `${hours} Std. ${minutes} Min.`;
}

function weeklyRhythmInsight() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 84);
  const recent = app.data.paymentRecords.filter((payment) => dateFromSwift(payment.createdAt) >= cutoff);
  if (recent.length < 14) return null;
  const byWeekday = {};
  recent.forEach((payment) => {
    const date = dateFromSwift(payment.createdAt);
    const weekday = date.getDay();
    if (!byWeekday[weekday]) byWeekday[weekday] = { total: 0, weeks: new Set() };
    byWeekday[weekday].total += Number(payment.amount || 0);
    const weekKey = `${date.getFullYear()}-${Math.floor(date.getDate() / 7)}-${date.getMonth()}`;
    byWeekday[weekday].weeks.add(weekKey);
  });
  const weekdayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  let best = null;
  Object.entries(byWeekday).forEach(([weekday, data]) => {
    const average = data.total / data.weeks.size;
    if (!best || average > best.average) best = { weekday: Number(weekday), average };
  });
  if (!best) return null;
  return `${weekdayNames[best.weekday]} ist bei dir normalerweise dein umsatzstärkster Tag (Ø ${formatCurrency(best.average)}, letzte 12 Wochen).`;
}

function reservationSourceRows() {
  const groups = {};
  app.data.reservations.forEach((reservation) => {
    const source = reservation.source || "Mitarbeiter";
    groups[source] = (groups[source] || 0) + 1;
  });
  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([name, count]) => `
    <div class="compact-row"><span class="activity-icon">${count}</span><div class="activity-copy"><strong>${escapeHTML(name)}</strong><span>Reservierungen</span></div></div>`).join("") : emptyHTML("Keine Reservierungen", "Herkunft erscheint, sobald Reservierungen vorliegen.");
}

async function loadIndustryBenchmark() {
  if (!app.data.onlineBookingConfiguration?.restaurant?.settings?.benchmarkOptIn) return null;
  try {
    return await rpc("get_industry_benchmark", { p_restaurant_id: app.workspace.restaurantId });
  } catch {
    return null;
  }
}

function annualRecap(payments) {
  const year = new Date().getFullYear();
  const yearPayments = payments.filter((payment) => dateFromSwift(payment.createdAt).getFullYear() === year);
  const totalRevenue = yearPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const byDay = {};
  yearPayments.forEach((payment) => {
    const key = localDateInput(dateFromSwift(payment.createdAt));
    byDay[key] = (byDay[key] || 0) + Number(payment.amount || 0);
  });
  const bestDayEntry = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const productTotals = {};
  Object.values(app.data.tableSaleItems).flat().forEach((item) => {
    productTotals[item.name] = (productTotals[item.name] || 0) + Number(item.quantity || 1);
  });
  const topProductEntry = Object.entries(productTotals).sort((a, b) => b[1] - a[1])[0];
  return { year, totalRevenue, bestDayEntry, topProductEntry };
}

function renderAnalytics() {
  const payments = app.data.paymentRecords;
  const revenue = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const tableRevenue = Object.values(app.data.tableRevenue).reduce((sum, item) => sum + Number(item || 0), 0);
  const reservationGuests = app.data.reservations.reduce((sum, item) => sum + Number(item.guests || 0), 0);
  const productSales = {};
  Object.values(app.data.tableSaleItems).flat().forEach((item) => {
    productSales[item.name] = (productSales[item.name] || 0) + Number(item.quantity || 1);
  });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const rhythmInsight = weeklyRhythmInsight();
  const recap = annualRecap(payments);
  $("view").innerHTML = `
    <div class="page-tools"><div><h2>Betriebsstatistik</h2><p>Aus den synchronisierten Haviko-Vorgängen.</p></div></div>
    <div class="metric-grid">
      ${metric("Erfasster Umsatz", formatCurrency(revenue || tableRevenue), `${payments.length} Zahlungen`)}
      ${metric("Reservierungsgäste", String(reservationGuests), `${app.data.reservations.length} Buchungen`)}
      ${metric("Bons", String(app.data.tickets.length), `${app.data.tickets.filter((item) => item.status === "Serviert").length} serviert`)}
      ${metric("Bewertung", reviewAverage(), `${app.reviews.length || app.data.guestReviews.length} Rückmeldungen`)}
    </div>
    ${rhythmInsight ? `<div class="compact-row no-icon"><div class="activity-copy"><strong>Wochenrhythmus</strong><span>${escapeHTML(rhythmInsight)}</span></div></div>` : ""}
    <div class="split-layout">
      <section class="section"><header class="section-header"><h2>Meistbestellte Produkte</h2></header><div class="section-body compact-list">
        ${topProducts.length ? topProducts.map(([name, quantity], index) => `
          <div class="compact-row"><span class="activity-icon">${index + 1}</span><div class="activity-copy"><strong>${escapeHTML(name)}</strong><span>Bestellmenge</span></div><strong>${quantity}</strong></div>`).join("") : emptyHTML("Noch keine Produktdaten", "Nach den ersten Bestellungen entsteht hier die Auswertung.")}
      </div></section>
      <section class="section"><header class="section-header"><h2>Zahlungsarten</h2></header><div class="section-body compact-list">
        ${paymentMethodRows(payments)}
      </div></section>
    </div>
    <section class="section"><header class="section-header"><h2>Reservierungsherkunft</h2></header><div class="section-body compact-list">
      ${reservationSourceRows()}
    </div></section>
    <section class="section"><header class="section-header"><h2>Jahresrückblick ${recap.year}</h2></header><div class="section-body compact-list">
      <div class="compact-row no-icon"><div class="activity-copy"><strong>Umsatz gesamt</strong><span>${formatCurrency(recap.totalRevenue)}</span></div></div>
      ${recap.bestDayEntry ? `<div class="compact-row no-icon"><div class="activity-copy"><strong>Bester Tag</strong><span>${recap.bestDayEntry[0]} · ${formatCurrency(recap.bestDayEntry[1])}</span></div></div>` : ""}
      ${recap.topProductEntry ? `<div class="compact-row no-icon"><div class="activity-copy"><strong>Beliebtestes Gericht</strong><span>${escapeHTML(recap.topProductEntry[0])} (${recap.topProductEntry[1]}×)</span></div></div>` : ""}
    </div></section>
    <section class="section" id="benchmark-section"></section>
  `;
  loadIndustryBenchmark().then((benchmark) => {
    if (!benchmark || !benchmark.participantCount) return;
    const averageOrderValue = payments.length ? revenue / payments.length : 0;
    $("benchmark-section").innerHTML = `
      <header class="section-header"><h2>Branchenvergleich</h2></header>
      <div class="section-body compact-list">
        <div class="compact-row no-icon"><div class="activity-copy"><strong>Dein Ø Bon</strong><span>${formatCurrency(averageOrderValue)}</span></div></div>
        <div class="compact-row no-icon"><div class="activity-copy"><strong>Branchenschnitt (anonym, ${benchmark.participantCount} Restaurants)</strong><span>${formatCurrency(benchmark.averageTicket || 0)}</span></div></div>
      </div>`;
  });
}

function paymentMethodRows(payments) {
  const groups = {};
  payments.forEach((payment) => {
    groups[payment.methodName] = (groups[payment.methodName] || 0) + Number(payment.amount || 0);
  });
  const entries = Object.entries(groups);
  return entries.length ? entries.map(([name, amount]) => `
    <div class="compact-row"><span class="activity-icon">€</span><div class="activity-copy"><strong>${escapeHTML(name)}</strong><span>Zahlungen</span></div><strong>${formatCurrency(amount)}</strong></div>`).join("") : emptyHTML("Noch keine Zahlungen", "Zahlungsarten werden nach dem Kassieren ausgewertet.");
}

function reviewAverage() {
  const reviews = app.reviews.length ? app.reviews : app.data.guestReviews;
  if (!reviews.length) return "–";
  return `${(reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)} / 5`;
}

async function renderReviews() {
  $("view").innerHTML = emptyHTML("Bewertungen werden geladen", "Einen Moment bitte.");
  try {
    app.reviews = await rpc("list_guest_reviews", {
      p_restaurant_id: app.workspace.restaurantId
    }) || [];
  } catch {
    app.reviews = app.data.guestReviews || [];
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recentReviews = app.reviews.filter((review) => dateFromSwift(review.created_at || review.createdAt) >= cutoff);
  const rollingAverage = recentReviews.length
    ? (recentReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / recentReviews.length).toFixed(1)
    : null;
  $("view").innerHTML = `
    <div class="page-tools"><div><h2>Gästebewertungen</h2><p>${reviewAverage()} aus ${app.reviews.length} Rückmeldungen.${rollingAverage ? ` · Letzte 30 Tage: ${rollingAverage} / 5` : ""}</p></div></div>
    <section class="section"><div class="section-body">
      ${app.reviews.length ? `<div class="activity-list">${app.reviews.map((review) => `
        <article class="activity-row no-icon">
          <div class="activity-copy"><strong>${escapeHTML(review.guest_name || review.guestName)} · ${Math.max(1, Math.min(5, Number(review.rating)))} von 5</strong><span>${escapeHTML(review.comment || "Keine schriftliche Rückmeldung")}${review.contact_requested || review.contactRequested ? " · Kontakt gewünscht" : ""}</span></div>
          <time>${formatDate(review.created_at || review.createdAt, { dateStyle: "medium" })}</time>
        </article>`).join("")}</div>` : emptyHTML("Noch keine Bewertungen", "Nach abgeschlossenen Besuchen können Gäste eine verifizierte Rückmeldung senden.")}
    </div></section>
  `;
}

function cashDayReport(session) {
  const opened = dateFromSwift(session.openedAt);
  const closed = session.closedAt ? dateFromSwift(session.closedAt) : new Date();
  const inWindow = (record) => {
    const at = dateFromSwift(record.createdAt);
    return at && at >= opened && at <= closed;
  };
  const payments = app.data.paymentRecords.filter(inWindow);
  const methodKind = (id) => app.data.paymentMethods.find((method) => method.id === id)?.kind;
  const sumBy = (kind) => payments
    .filter((payment) => methodKind(payment.methodID) === kind)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const movements = cashMovementsForSession(session).filter((movement) => {
    const at = dateFromSwift(movement.createdAt);
    return at && at >= opened && at <= closed;
  });
  const netMovements = movements.reduce((sum, movement) => {
    const amount = Number(movement.amount || 0);
    return sum + (movement.kind === "deposit" ? amount : -amount);
  }, 0);
  const receiptCount = app.data.fiscalReceipts.filter(inWindow).length;
  const guestCount = app.data.reservations
    .filter((reservation) =>
      sameDay(reservation.time, localDateInput(opened)) &&
      !["Storniert", "Nicht erschienen"].includes(reservation.status))
    .reduce((sum, reservation) => sum + Number(reservation.guests || 0), 0);
  const team = app.data.shiftRecords
    .filter((record) => dateFromSwift(record.start) < closed && dateFromSwift(record.end) > opened)
    .map((record) => {
      const name = app.data.team.find((member) => member.id === record.memberID)?.name || "Mitarbeiter";
      const memberRevenue = payments
        .filter((payment) => payment.createdBy === name)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      return { name, revenue: memberRevenue, workedSeconds: workedSeconds(record) };
    });
  return {
    revenue,
    cashRevenue: sumBy("Bar"),
    cardRevenue: sumBy("Karte"),
    voucherRevenue: sumBy("Gutschein"),
    movements,
    netMovements,
    receiptCount,
    guestCount,
    team
  };
}

function fiscalReceiptNumberGaps() {
  const sequences = (app.data.fiscalReceipts || [])
    .map((receipt) => {
      const parts = String(receipt.invoiceNumber || "").split("-");
      if (parts.length !== 3 || Number.isNaN(Number(parts[2]))) return null;
      return { group: `${parts[0]}-${parts[1]}`, number: Number(parts[2]) };
    })
    .filter(Boolean);
  const groups = {};
  sequences.forEach(({ group, number }) => {
    if (!groups[group]) groups[group] = new Set();
    groups[group].add(number);
  });
  const gaps = [];
  Object.entries(groups).forEach(([group, numbers]) => {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    for (let n = min; n <= max; n += 1) {
      if (!numbers.has(n)) gaps.push(`${group}-${String(n).padStart(6, "0")}`);
    }
  });
  return gaps;
}

const fiscalStateTitles = {
  notConfigured: "Nicht eingerichtet",
  testMode: "Testmodus",
  ready: "Bereit",
  error: "Fehler",
  offline: "Offline"
};

function fiscalizationBadge(state) {
  const type = state === "ready" ? "green" : state === "testMode" ? "blue" : state === "error" ? "red" : "";
  return `<span class="badge ${type}">${escapeHTML(fiscalStateTitles[state] || state || "–")}</span>`;
}

function renderReports() {
  const sessions = [...app.data.cashDaySessions]
    .filter((session) => session.status === "closed")
    .sort((a, b) => dateFromSwift(b.closedAt) - dateFromSwift(a.closedAt));
  const shiftRecords = [...app.data.shiftRecords].sort(
    (a, b) => dateFromSwift(b.start) - dateFromSwift(a.start)
  );
  const receipts = [...app.data.fiscalReceipts].sort(
    (a, b) => dateFromSwift(b.createdAt) - dateFromSwift(a.createdAt)
  );
  const receiptGaps = fiscalReceiptNumberGaps();
  $("view").innerHTML = `
    <div class="page-tools"><div><h2>Berichte</h2><p>Tagesabschlüsse und Schichtauswertungen.</p></div></div>
    ${receiptGaps.length ? `<div class="compact-row no-icon" style="background:var(--orange-soft, #fff0e8);border-radius:var(--radius, 8px);padding:12px 14px;margin-bottom:16px;"><div class="activity-copy"><strong>Lücke in der Belegnummerierung</strong><span>${escapeHTML(receiptGaps.join(", "))} · kann bedeuten, dass ein Beleg beim Speichern fehlgeschlagen ist.</span></div></div>` : ""}
    <section class="section table-section">
      <header class="section-header"><h2>Belege</h2><span class="badge">${receipts.length}</span></header>
      ${receipts.length ? `<table class="data-table">
        <thead><tr><th>Rechnungsnummer</th><th>Datum</th><th>Betrag</th><th>Zahlungsart</th><th>TSE-Status</th><th></th></tr></thead>
        <tbody>${receipts.slice(0, 60).map((receipt) => `
          <tr>
            <td><strong>${escapeHTML(receipt.invoiceNumber || "–")}</strong></td>
            <td>${formatDate(receipt.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
            <td>${formatCurrency(receipt.grossAmount)}</td>
            <td>${escapeHTML(receipt.paymentMethodName || "–")}</td>
            <td>${fiscalizationBadge(receipt.fiscalizationState)}</td>
            <td><button class="row-button" type="button" data-receipt-id="${escapeHTML(receipt.id)}">Details</button></td>
          </tr>`).join("")}</tbody>
      </table>` : emptyHTML("Noch keine Belege", "Nach der ersten Zahlung erscheint hier der Beleg.")}
    </section>
    <section class="section table-section">
      <header class="section-header"><h2>Tagesberichte</h2><span class="badge">${sessions.length}</span></header>
      ${sessions.length ? `<table class="data-table">
        <thead><tr><th>Datum</th><th>Geschlossen von</th><th>Umsatz</th><th>Differenz</th><th></th></tr></thead>
        <tbody>${sessions.slice(0, 60).map((session) => {
          const report = cashDayReport(session);
          const difference = Number(session.actualCash || 0) - Number(session.expectedCash || 0);
          return `
          <tr>
            <td>${formatDate(session.businessDate, { dateStyle: "medium" })}</td>
            <td>${escapeHTML(session.closedBy || "–")}</td>
            <td>${formatCurrency(report.revenue)}</td>
            <td>${formatCurrency(difference)}</td>
            <td><button class="row-button" type="button" data-cash-day-id="${escapeHTML(session.id)}">Bericht</button></td>
          </tr>`;
        }).join("")}</tbody>
      </table>` : emptyHTML("Noch keine Tagesberichte", "Nach dem ersten abgeschlossenen Betriebstag erscheint hier der Bericht.")}
    </section>
    <section class="section table-section">
      <header class="section-header"><h2>Schichtberichte</h2><span class="badge">${shiftRecords.length}</span></header>
      ${shiftRecords.length ? `<table class="data-table">
        <thead><tr><th>Mitarbeiter</th><th>Datum</th><th>Arbeitszeit</th><th>Umsatz</th><th></th></tr></thead>
        <tbody>${shiftRecords.slice(0, 60).map((record) => {
          const name = app.data.team.find((member) => member.id === record.memberID)?.name || "Mitarbeiter";
          const revenue = app.data.paymentRecords
            .filter((payment) => {
              const at = dateFromSwift(payment.createdAt);
              return payment.createdBy === name && at >= dateFromSwift(record.start) && at <= dateFromSwift(record.end);
            })
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
          return `
          <tr>
            <td><strong>${escapeHTML(name)}</strong></td>
            <td>${formatDate(record.start, { dateStyle: "medium" })}</td>
            <td>${durationText(workedSeconds(record))}</td>
            <td>${formatCurrency(revenue)}</td>
            <td><button class="row-button" type="button" data-shift-report-id="${escapeHTML(record.id)}">Bericht</button></td>
          </tr>`;
        }).join("")}</tbody>
      </table>` : emptyHTML("Noch keine Schichtberichte", "Nach dem Ausstempeln erscheint die Auswertung hier.")}
    </section>
  `;
}

function openCashDayReport(sessionID) {
  const session = app.data.cashDaySessions.find((item) => item.id === sessionID);
  if (!session) return;
  const report = cashDayReport(session);
  const difference = Number(session.actualCash || 0) - Number(session.expectedCash || 0);
  openModal({
    eyebrow: "Tagesbericht",
    title: formatDate(session.businessDate, { dateStyle: "full" }),
    body: `
      <div class="detail-list">
        <div><span>Geöffnet</span><strong>${formatDate(session.openedAt)} · ${escapeHTML(session.openedBy || "–")}</strong></div>
        <div><span>Geschlossen</span><strong>${session.closedAt ? formatDate(session.closedAt) : "–"} · ${escapeHTML(session.closedBy || "–")}</strong></div>
        <div><span>Startbestand</span><strong>${formatCurrency(session.openingFloat)}</strong></div>
        <div><span>Umsatz gesamt</span><strong>${formatCurrency(report.revenue)}</strong></div>
        <div><span>Bar</span><strong>${formatCurrency(report.cashRevenue)}</strong></div>
        <div><span>Karte</span><strong>${formatCurrency(report.cardRevenue)}</strong></div>
        <div><span>Gutschein</span><strong>${formatCurrency(report.voucherRevenue)}</strong></div>
        <div><span>Kassenbewegungen</span><strong>${formatCurrency(report.netMovements)}</strong></div>
        <div><span>Sollbestand</span><strong>${formatCurrency(session.expectedCash)}</strong></div>
        <div><span>Istbestand</span><strong>${formatCurrency(session.actualCash)}</strong></div>
        <div><span>Differenz</span><strong>${formatCurrency(difference)}</strong></div>
        <div><span>Belege</span><strong>${report.receiptCount}</strong></div>
        <div><span>Gäste</span><strong>${report.guestCount}</strong></div>
      </div>
      ${report.movements.length ? `<div class="activity-list">${report.movements.map((movement) => `
        <article class="activity-row no-icon"><div class="activity-copy"><strong>${escapeHTML(movementTitle(movement.kind))}</strong><span>${formatDate(movement.createdAt)}${movement.note ? ` · ${escapeHTML(movement.note)}` : ""}</span></div><strong>${movement.kind === "deposit" ? "+" : "-"}${formatCurrency(movement.amount)}</strong></article>`).join("")}</div>` : ""}
      ${report.team.length ? `<div class="activity-list">${report.team.map((member) => `
        <article class="activity-row no-icon"><div class="activity-copy"><strong>${escapeHTML(member.name)}</strong><span>${durationText(member.workedSeconds)}</span></div><strong>${formatCurrency(member.revenue)}</strong></article>`).join("")}</div>` : ""}
      ${session.closingNote ? `<p class="modal-note">${escapeHTML(session.closingNote)}</p>` : ""}
    `,
    footer: `<button class="primary" type="button" data-modal-action="close">Fertig</button>`
  });
}

function openShiftReport(recordID) {
  const record = app.data.shiftRecords.find((item) => item.id === recordID);
  if (!record) return;
  const name = app.data.team.find((member) => member.id === record.memberID)?.name || "Mitarbeiter";
  const payments = app.data.paymentRecords.filter((payment) => {
    const at = dateFromSwift(payment.createdAt);
    return payment.createdBy === name && at >= dateFromSwift(record.start) && at <= dateFromSwift(record.end);
  });
  const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  openModal({
    eyebrow: "Schichtbericht",
    title: name,
    body: `
      <div class="detail-list">
        <div><span>Beginn</span><strong>${formatDate(record.start)}</strong></div>
        <div><span>Ende</span><strong>${formatDate(record.end)}</strong></div>
        <div><span>Pause</span><strong>${durationText(record.breakDuration || 0)}</strong></div>
        <div><span>Arbeitszeit</span><strong>${durationText(workedSeconds(record))}</strong></div>
        <div><span>Zahlungen</span><strong>${payments.length}</strong></div>
        <div><span>Umsatz</span><strong>${formatCurrency(revenue)}</strong></div>
      </div>
    `,
    footer: `<button class="primary" type="button" data-modal-action="close">Fertig</button>`
  });
}

function openReceiptDetail(receiptID) {
  const receipt = app.data.fiscalReceipts.find((item) => item.id === receiptID);
  if (!receipt) return;
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const qrCodeData = receipt.qrCodeData || receipt.tseProcessData || "";
  openModal({
    eyebrow: "Beleg",
    title: receipt.invoiceNumber || "Beleg",
    body: `
      <div class="detail-list">
        <div><span>Datum</span><strong>${formatDate(receipt.createdAt, { dateStyle: "medium", timeStyle: "short" })}</strong></div>
        <div><span>Betrag</span><strong>${formatCurrency(receipt.grossAmount)}</strong></div>
        <div><span>Zahlungsart</span><strong>${escapeHTML(receipt.paymentMethodName || "–")}</strong></div>
        <div><span>Quelle</span><strong>${escapeHTML(receipt.sourceName || "–")}</strong></div>
        <div><span>Status</span><strong>${fiscalizationBadge(receipt.fiscalizationState)}</strong></div>
      </div>
      ${items.length ? `<div class="activity-list">${items.map((item) => `
        <article class="activity-row no-icon"><div class="activity-copy"><strong>${item.quantity}× ${escapeHTML(item.name)}</strong><span>${Number(item.taxRate || 0)}% MwSt.</span></div><strong>${formatCurrency(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</strong></article>`).join("")}</div>` : ""}
      <h3 class="modal-subheading">TSE</h3>
      <div class="detail-list">
        <div><span>Kassen-Ser.-Nr.</span><strong>${escapeHTML(receipt.cashRegisterSerialNumber || "–")}</strong></div>
        <div><span>TSE-Ser.-Nr.</span><strong>${escapeHTML(receipt.tseSerialNumber || "–")}</strong></div>
        <div><span>Transaktion Nr.</span><strong>${receipt.tseTransactionNumber ?? "–"}</strong></div>
        <div><span>Signaturzähler</span><strong>${receipt.tseSignatureCounter ?? "–"}</strong></div>
        <div><span>Signatur</span><strong style="word-break:break-all;">${escapeHTML(receipt.tseSignature || "–")}</strong></div>
        <div><span>QR-/Prozessdaten</span><strong style="word-break:break-all;">${escapeHTML(qrCodeData || "–")}</strong></div>
      </div>
    `,
    footer: `<button class="primary" type="button" data-modal-action="close">Fertig</button>`
  });
}

const INBOX_CATEGORY_COLOR = { Haviko: "#2878c7", Reservierungen: "#0a8f70", Konto: "#7a55b3", Team: "#ef7b45" };

function renderInbox() {
  const notifications = [...app.data.inboxNotifications].sort(
    (a, b) => dateFromSwift(b.createdAt) - dateFromSwift(a.createdAt)
  );
  $("view").innerHTML = `
    <div class="page-tools">
      <div><h2>Postfach</h2><p>Mitteilungen aus App und Betrieb, dieselben wie im Postfach der App.</p></div>
    </div>
    ${notifications.length ? `<section class="section">
      <div class="activity-list">
        ${notifications.map((notification) => {
          const color = notification.iconColorHex ? `#${String(notification.iconColorHex).replace("#", "")}` : (INBOX_CATEGORY_COLOR[notification.category] || "#68746f");
          const recipient = notification.recipientMemberID
            ? app.data.team.find((member) => member.id === notification.recipientMemberID)?.name || "Ein Teammitglied"
            : "Für alle";
          return `
            <article class="activity-row">
              <span class="activity-icon" style="background:color-mix(in srgb, ${color} 16%, white);color:${color}">${notification.isProblem ? "!" : "✉"}</span>
              <div class="activity-copy">
                <strong>${escapeHTML(notification.title || "Mitteilung")}</strong>
                <span>${escapeHTML(notification.message || "")}</span>
                <span>${escapeHTML(notification.category || "Haviko")} · ${escapeHTML(recipient)}</span>
              </div>
              <span class="muted">${formatDate(notification.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
            </article>`;
        }).join("")}
      </div>
    </section>` : emptyHTML("Noch keine Mitteilungen", "Hier erscheinen dieselben Mitteilungen wie im Postfach der App.")}
  `;
}

function renderStations() {
  $("view").innerHTML = `
    <div class="page-tools"><div><h2>Stationen & Ausgabe</h2><p>Lege fest, ob Aufträge digital, gedruckt oder über beide Wege ausgegeben werden.</p></div><button class="primary" type="button" data-action="add-station">Station hinzufügen</button></div>
    <section class="section">
      <header class="section-header"><div><h2>Auftragsausgabe</h2><p>Diese Einstellung gilt für Küche, Bar, Getränke und weitere Stationen.</p></div></header>
      <div class="section-body setting-choice">
        <div>
          <select id="kitchen-operating-mode" aria-label="Ausgabeart">
          <option value="digitalKitchen" ${app.data.kitchenOperatingMode === "digitalKitchen" ? "selected" : ""}>Nur digitale Stationen</option>
          <option value="printedKitchen" ${app.data.kitchenOperatingMode === "printedKitchen" ? "selected" : ""}>Nur Bondruck</option>
          <option value="hybrid" ${app.data.kitchenOperatingMode === "hybrid" ? "selected" : ""}>Kombiniert</option>
          </select>
          <p>Digitale Stationen zeigen Aufträge auf einem Display. Beim Bondruck werden sie an einen zugewiesenen Drucker übergeben.</p>
        </div>
        <button class="secondary" type="button" data-action="save-operating-mode">Übernehmen</button>
      </div>
    </section>
    <section class="section table-section">
      ${app.data.stations.length ? `<table class="data-table"><thead><tr><th>Name</th><th>Ausgabeweg</th><th>Warnzeit</th><th>Status</th><th></th></tr></thead><tbody>
        ${app.data.stations.map((station) => `<tr class="${station.isActive === false ? "is-disabled" : ""}"><td><strong>${escapeHTML(station.name)}</strong></td><td>${station.defaultMode === "digital" ? "Digitales Stationsdisplay" : "Bondruck"}</td><td>${Number(station.warningMinutes || 12)} Min.</td><td>${station.isActive ? `<span class="badge green">Aktiv</span>` : `<span class="badge red">Deaktiviert</span>`}</td><td><div class="row-actions"><button class="row-button" type="button" data-station-id="${station.id}">Bearbeiten</button></div></td></tr>`).join("")}
      </tbody></table>` : emptyHTML("Noch keine Station", "Lege Küche, Bar oder eine eigene Station an.")}
    </section>
  `;
}

async function saveKitchenOperatingMode() {
  const mode = $("kitchen-operating-mode")?.value;
  if (!mode) return;
  const incompatible = app.data.stations.some(
    (station) => station.isActive !== false && !operatingModeSupports(mode, station.defaultMode)
  );
  if (incompatible) {
    toast("Ausgabeart nicht geändert", "Deaktiviere oder ändere zuerst unpassende Stationen.", "error");
    return;
  }
  await savePatch({ kitchenOperatingMode: mode }, `${kitchenOperatingModeTitle(mode)} ist aktiv.`);
  renderStations();
}

const SETTINGS_TABS = [
  { id: "restaurant", title: "Restaurant" },
  { id: "billing", title: "Abrechnung" },
  { id: "betrieb", title: "Betrieb" },
  { id: "reservierung", title: "Online-Reservierung" },
  { id: "kundenbindung", title: "Kundenbindung" },
  { id: "kasse", title: "Kasse" },
  { id: "geraete", title: "Geräte & Drucker" },
  { id: "notifications", title: "Benachrichtigungen" },
  { id: "appearance", title: "Darstellung" },
  { id: "legal", title: "Rechtliches" },
  { id: "support", title: "Hilfe-Center" },
  { id: "about", title: "Über Haviko" },
  { id: "systemStatus", title: "Systemstatus" }
];

const HAVIKO_PLUS_MONTHLY_PRICE = 0;

function accountCreatedDate() {
  const candidates = [
    app.workspace?.createdAt,
    app.data?.accountCreatedAt,
    app.data?.servoraPlusEntitlement?.grantedAt,
    app.data?.servoraPlusEntitlement?.validUntil
  ].map(dateFromSwift).filter((date) => date && !Number.isNaN(date.getTime()));
  return candidates.sort((a, b) => a - b)[0] || new Date();
}

function hasHavikoPlusAccess() {
  const entitlement = app.data?.servoraPlusEntitlement;
  if (!entitlement) return false;
  if (entitlement.plan !== "servoraPlus" || entitlement.isActive === false) return false;
  const validUntil = dateFromSwift(entitlement.validUntil);
  return !validUntil || validUntil > new Date();
}

function havikoPlusStatusTitle() {
  const entitlement = app.data?.servoraPlusEntitlement;
  if (hasHavikoPlusAccess()) {
    if (entitlement?.accessSource === "servoraPlusBetaAccess") return "Haviko+ Testzugang aktiv";
    if (entitlement?.accessSource === "servoraPlusManualEntitlement") return "Haviko+ freigeschaltet";
    return "Haviko+ aktiv";
  }
  return "Haviko+ nicht aktiviert";
}

function billingMonths() {
  const start = accountCreatedDate();
  const today = new Date();
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 1);
  const months = [];
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(cursor);
    months.push({
      key,
      label,
      amount: hasHavikoPlusAccess() ? HAVIKO_PLUS_MONTHLY_PRICE : 0,
      status: hasHavikoPlusAccess() ? "Haviko+" : "Free"
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months.reverse();
}

function billingInvoiceNumber(month) {
  const code = String(app.workspace?.restaurantCode || app.data?.restaurantCode || "HAVIKO").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return `HAV-${code}-${month.key}`;
}

function billingInvoiceHTML(month) {
  const invoiceNumber = billingInvoiceNumber(month);
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${invoiceNumber}</title>
    <style>
      @page { size: A4; margin: 18mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #10231f; margin: 0; }
      header { display:flex; justify-content:space-between; border-bottom:2px solid #0b4f43; padding-bottom:18px; margin-bottom:28px; }
      h1 { margin:0; font-size:28px; } h2 { margin:0 0 8px; font-size:16px; }
      .muted { color:#66736f; } .box { border:1px solid #d9e1de; border-radius:8px; padding:14px; }
      table { width:100%; border-collapse:collapse; margin-top:24px; } th, td { padding:12px; border-bottom:1px solid #d9e1de; text-align:left; }
      th:last-child, td:last-child { text-align:right; } tfoot td { font-weight:800; font-size:17px; }
      footer { position:fixed; bottom:0; left:0; right:0; border-top:1px solid #d9e1de; padding-top:10px; font-size:11px; color:#66736f; }
    </style></head><body>
    <header><div><h1>Haviko</h1><div class="muted">Monatsabrechnung</div></div><div><strong>${invoiceNumber}</strong><br><span class="muted">${escapeHTML(month.label)}</span></div></header>
    <section class="box"><h2>Rechnung an</h2><strong>${escapeHTML(app.data.restaurantName || app.workspace?.restaurantName || "Restaurant")}</strong><br><span class="muted">Restaurantkennung ${escapeHTML(app.workspace?.restaurantCode || app.data.restaurantCode || "–")}</span></section>
    <table><thead><tr><th>Leistung</th><th>Zeitraum</th><th>Betrag</th></tr></thead><tbody>
      <tr><td>Haviko+ ${month.status === "Haviko+" ? "Mitgliedschaft" : "Free / kein aktives Haviko+"}</td><td>${escapeHTML(month.label)}</td><td>${formatCurrency(month.amount)}</td></tr>
    </tbody><tfoot><tr><td colspan="2">Gesamt</td><td>${formatCurrency(month.amount)}</td></tr></tfoot></table>
    <p class="muted">Diese Rechnung wird aus dem gemeinsamen Haviko Konto- und Haviko+ Status erzeugt.</p>
    <footer>Haviko · Monatsabrechnung · ${invoiceNumber}</footer></body></html>`;
}

function downloadBillingInvoice(monthKey) {
  const month = billingMonths().find((item) => item.key === monthKey);
  if (!month) return;
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    toast("Popup blockiert", "Erlaube Popups, um die Rechnung als PDF zu speichern.", "error");
    return;
  }
  win.document.write(billingInvoiceHTML(month));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

function settingsRestaurantTab() {
  return `
    <section class="section">
      <header class="section-header"><h2>Restaurant</h2></header>
      <div class="section-body">
        <label class="field"><span>Name</span><input value="${escapeHTML(app.data.restaurantName)}" readonly aria-readonly="true"></label>
        <label class="field"><span>Restaurantkennung</span><input value="${escapeHTML(app.workspace.restaurantCode)}" readonly aria-readonly="true"></label>
      </div>
    </section>`;
}

function settingsBillingTab() {
  const months = billingMonths();
  const plusActive = hasHavikoPlusAccess();
  return `
    <section class="section">
      <header class="section-header"><h2>Abrechnung</h2><span class="badge ${plusActive ? "green" : ""}">${escapeHTML(havikoPlusStatusTitle())}</span></header>
      <div class="section-body">
        <div class="compact-list">
          ${settingStatus("Konto erstellt", formatDate(accountCreatedDate(), { dateStyle: "long" }), true)}
          ${settingStatus("Tarif", plusActive ? "Haviko+" : "Free", plusActive)}
          ${settingStatus("Monatlicher Betrag", formatCurrency(HAVIKO_PLUS_MONTHLY_PRICE), true)}
        </div>
        <table class="data-table">
          <thead><tr><th>Monat</th><th>Status</th><th>Betrag</th><th>Rechnung</th><th></th></tr></thead>
          <tbody>
            ${months.map((month) => `
              <tr>
                <td><strong>${escapeHTML(month.label)}</strong></td>
                <td><span class="badge ${month.status === "Haviko+" ? "green" : ""}">${escapeHTML(month.status)}</span></td>
                <td>${formatCurrency(month.amount)}</td>
                <td>${escapeHTML(billingInvoiceNumber(month))}</td>
                <td><button class="row-button" type="button" data-action="download-billing-invoice" data-month="${escapeHTML(month.key)}">PDF</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
        <p class="field-hint">Die Monatsabrechnungen werden aus Kontoerstellung und Haviko+ Status erzeugt. Solange Haviko+ nicht aktiv ist, beträgt der Monatsbetrag 0,00 €.</p>
      </div>
    </section>`;
}

function settingsBetriebTab() {
  const cashDay = activeCashDay();
  const movements = cashMovementsForSession(cashDay);
  const expectedCash = expectedCashForSession(cashDay);
  return `
    <section class="section">
      <header class="section-header"><h2>Betriebstag</h2>${cashDay ? `<span class="badge ${sameDay(cashDay.businessDate) ? "green" : "warning"}">${sameDay(cashDay.businessDate) ? "Heute geöffnet" : "Vortag offen"}</span>` : `<span class="badge">Geschlossen</span>`}</header>
      <div class="section-body">
        ${cashDay ? `
          <div class="compact-list">
            ${settingStatus("Geschäftsdatum", formatDate(cashDay.businessDate, { dateStyle: "long" }), sameDay(cashDay.businessDate))}
            ${settingStatus("Geöffnet von", cashDay.openedBy || app.workspace.displayName, true)}
            ${settingStatus("Startbestand", formatCurrency(cashDay.openingFloat), true)}
            ${settingStatus("Barumsatz", formatCurrency(cashRevenueForSession(cashDay)), true)}
            ${settingStatus("Kassenbewegungen", formatCurrency(netCashMovementsForSession(cashDay)), true)}
            ${settingStatus("Aktueller Sollbestand", formatCurrency(expectedCash), true)}
          </div>
          <form id="cash-movement-form">
            <label class="field"><span>Bewegungsart</span><select id="cash-movement-kind">
              <option value="deposit">Bareinlage</option>
              <option value="withdrawal">Barentnahme</option>
            </select></label>
            <label class="field"><span>Betrag</span><input id="cash-movement-amount" type="number" min="0.01" step="0.01" required></label>
            <label class="field"><span>Notiz</span><input id="cash-movement-note" maxlength="160" placeholder="Optional"></label>
            <button class="secondary" type="submit">Kassenbewegung buchen</button>
          </form>
          ${movements.length ? `<div class="compact-list">${movements.slice(0, 8).map((movement) => `
            <div class="compact-row no-icon">
              <div class="activity-copy"><strong>${escapeHTML(movementTitle(movement.kind))}</strong><span>${formatDate(movement.createdAt)}${movement.note ? ` · ${escapeHTML(movement.note)}` : ""}</span></div>
              <strong>${movement.kind === "deposit" ? "+" : "-"}${formatCurrency(movement.amount)}</strong>
            </div>`).join("")}</div>` : ""}
          <form id="cash-day-close-form">
            <label class="field"><span>Gezählter Kassenbestand</span><input id="cash-day-actual" type="number" min="0" step="0.01" required></label>
            <label class="field"><span>Abschlussnotiz</span><textarea id="cash-day-note"></textarea></label>
            <button class="danger" type="submit">Tag abschließen</button>
          </form>` : `
          <form id="cash-day-open-form">
            <label class="field"><span>Startbestand</span><input id="cash-day-float" type="number" min="0" step="0.01" value="0" required></label>
            <button class="primary" type="submit">Tag öffnen</button>
          </form>`}
      </div>
    </section>`;
}

function settingsReservierungTab() {
  const booking = app.data.onlineBookingConfiguration;
  return `
    <section class="section">
      <header class="section-header"><h2>Online-Reservierung</h2></header>
      <div class="section-body">
        <form id="business-settings-form">
          <label class="field"><span>Straße</span><input id="business-street" value="${escapeHTML(booking?.restaurant?.street || "")}" autocomplete="address-line1" required></label>
          <div class="field-grid">
            <label class="field"><span>Hausnummer</span><input id="business-house-number" value="${escapeHTML(booking?.restaurant?.houseNumber || "")}"></label>
            <label class="field"><span>Postleitzahl</span><input id="business-postal-code" value="${escapeHTML(booking?.restaurant?.postalCode || "")}" autocomplete="postal-code" required></label>
          </div>
          <div class="field-grid">
            <label class="field"><span>Ort</span><input id="business-city" value="${escapeHTML(booking?.restaurant?.city || "")}" autocomplete="address-level2" required></label>
            <label class="field"><span>Bundesland</span>
              <select id="business-state">
                <option value="" ${!booking?.restaurant?.state ? "selected" : ""}>Keine Angabe</option>
                ${GERMAN_FEDERAL_STATES.map(state => `<option value="${state}" ${booking?.restaurant?.state === state ? "selected" : ""}>${state}</option>`).join("")}
              </select>
            </label>
          </div>
          <label class="field"><span>Land</span>
            <select id="business-country">
              <option value="Deutschland" selected>Deutschland</option>
            </select>
          </label>
          <p class="field-hint">Eine vollständige, sauber getrennte Adresse lässt sich zuverlässiger einem Standort zuordnen (u. a. fürs Wetter im Start-Tab).</p>
          <div class="field-grid">
            <label class="field"><span>Telefon</span><input id="business-phone" value="${escapeHTML(booking?.restaurant?.phone || "")}" autocomplete="tel"></label>
            <label class="field"><span>E-Mail</span><input id="business-email" type="email" value="${escapeHTML(booking?.restaurant?.email || "")}" autocomplete="email"></label>
          </div>
          <label class="field"><span>Öffnungszeiten-Hinweis</span><textarea id="business-opening-text" placeholder="z. B. Dienstag bis Sonntag, 17:00–23:00 Uhr">${escapeHTML(booking?.restaurant?.openingHoursText || "")}</textarea></label>
          <label class="check"><input id="business-booking-enabled" type="checkbox" ${booking?.restaurant?.settings?.bookingEnabled ? "checked" : ""}><span>Online-Reservierung veröffentlichen</span></label>
          <label class="check"><input id="business-auto-confirm" type="checkbox" ${booking?.restaurant?.settings?.automaticConfirmation !== false ? "checked" : ""}><span>Reservierungen automatisch bestätigen</span></label>
          <label class="check"><input id="business-location-required" type="checkbox" ${booking?.restaurant?.settings?.clockInRequiresLocation ? "checked" : ""}><span>Einstempeln nur am Restaurant erlauben</span></label>
          <label class="check"><input id="business-outdoor-seating" type="checkbox" ${booking?.restaurant?.settings?.hasOutdoorSeating ? "checked" : ""}><span>Terrasse / Außenbereich vorhanden</span></label>
          <label class="check"><input id="business-benchmark-optin" type="checkbox" ${booking?.restaurant?.settings?.benchmarkOptIn ? "checked" : ""}><span>Am anonymen Branchenvergleich teilnehmen</span></label>
          <label class="field"><span>Erlaubter Radius</span><input id="business-location-radius" type="number" min="50" max="1000" step="25" value="${Number(booking?.restaurant?.settings?.clockInRadiusMeters || 150)}"></label>
          <button class="secondary" type="button" data-action="use-current-location">Aktuellen Standort übernehmen</button>
          <p class="field-hint">${booking?.restaurant?.settings?.clockInLatitude != null ? "Standort ist hinterlegt." : "Für die Standortprüfung zuerst den Standort übernehmen oder die Adresse in der App bestätigen."}</p>
          <button class="primary" type="submit">Betriebsdaten speichern</button>
        </form>
        ${booking?.publicID ? `<a class="secondary" href="../?r=${encodeURIComponent(booking.publicID)}" target="_blank" rel="noopener">Reservierungsseite öffnen</a>` : ""}
      </div>
    </section>`;
}

function settingsKundenbindungTab() {
  return `
    <section class="section">
      <header class="section-header"><h2>Kundenbindungsprogramm</h2></header>
      <div class="section-body">
        <form id="loyalty-settings-form">
          <label class="check"><input id="loyalty-enabled" type="checkbox" ${app.data.loyaltyConfiguration?.enabled ? "checked" : ""}><span>Stempelkarte aktivieren</span></label>
          <label class="field"><span>Besuche bis zur Belohnung</span><input id="loyalty-visits-required" type="number" min="1" max="100" step="1" value="${Number(app.data.loyaltyConfiguration?.visitsRequired || 5)}" required></label>
          <label class="field"><span>Art der Belohnung</span>
            <select id="loyalty-reward-kind">
              <option value="freeProduct" ${(app.data.loyaltyConfiguration?.rewardKind || "freeProduct") === "freeProduct" ? "selected" : ""}>Gratis Produkt</option>
              <option value="discount" ${app.data.loyaltyConfiguration?.rewardKind === "discount" ? "selected" : ""}>Rabatt</option>
              <option value="voucher" ${app.data.loyaltyConfiguration?.rewardKind === "voucher" ? "selected" : ""}>Gutschein</option>
            </select>
          </label>
          <label class="field" id="loyalty-freeproduct-field"><span>Produkt</span><input id="loyalty-free-product-name" value="${escapeHTML(app.data.loyaltyConfiguration?.freeProductName || "Gratis Dessert")}" placeholder="z. B. Gratis Dessert"></label>
          <label class="field" id="loyalty-discount-field"><span>Rabatt in %</span><input id="loyalty-discount-percentage" type="number" min="1" max="100" step="1" value="${Number(app.data.loyaltyConfiguration?.discountPercentage || 10)}"></label>
          <label class="field" id="loyalty-voucher-field"><span>Gutscheinwert</span><input id="loyalty-voucher-value" type="number" min="0" step="0.5" value="${Number(app.data.loyaltyConfiguration?.voucherValue || 10)}"></label>
          <label class="check"><input id="loyalty-review-bonus" type="checkbox" ${app.data.loyaltyConfiguration?.awardsStampForReview ? "checked" : ""}><span>Bonus-Stempel für Bewertungen</span></label>
          <p class="field-hint">Zählt jede Reservierung, die nicht storniert wurde oder als „Nicht erschienen" markiert ist. Sichtbar in App, Dashboard und auf der Reservierungsseite.</p>
          <button class="primary" type="submit">Kundenbindungsprogramm speichern</button>
        </form>
        <script>
          (() => {
            const kindSelect = document.getElementById("loyalty-reward-kind");
            const groups = {
              freeProduct: document.getElementById("loyalty-freeproduct-field"),
              discount: document.getElementById("loyalty-discount-field"),
              voucher: document.getElementById("loyalty-voucher-field")
            };
            function sync() {
              Object.entries(groups).forEach(([key, el]) => {
                el?.classList.toggle("hidden", kindSelect?.value !== key);
              });
            }
            kindSelect?.addEventListener("change", sync);
            sync();
          })();
        </script>
      </div>
    </section>`;
}

function settingsKasseTab() {
  if (!app.fiscalStatus) loadFiscalStatus();
  return `
    <section class="section">
      <header class="section-header"><h2>Kassenstatus (Server)</h2></header>
      <div class="section-body compact-list">
        ${renderFiscalStatusSection()}
      </div>
    </section>`;
}

function settingsGeraeteTab() {
  return `
    <section class="section">
      <header class="section-header"><h2>Drucker</h2><button class="secondary" type="button" data-action="add-printer">Drucker hinzufügen</button></header>
      <div class="section-body">
        ${app.data.printers.length ? `<table class="data-table">
          <thead><tr><th>Name</th><th>Verbindung</th><th>Station</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${app.data.printers.map((printer) => {
              const station = app.data.stations.find((item) => item.id === printer.assignedStationID);
              return `<tr class="${printer.isActive === false ? "is-disabled" : ""}">
                <td><strong>${escapeHTML(printer.name)}</strong></td>
                <td>${escapeHTML(printer.transport === "Bluetooth" ? "Bluetooth" : printer.transport === "Testdrucker" ? "Testdrucker" : "WLAN")}${printer.endpoint ? ` · ${escapeHTML(printer.endpoint)}` : ""}</td>
                <td>${escapeHTML(station?.name || "–")}</td>
                <td>${printer.isActive === false ? `<span class="badge red">Deaktiviert</span>` : `<span class="badge green">Aktiv</span>`}</td>
                <td><div class="row-actions"><button class="row-button" type="button" data-printer-id="${printer.id}">Bearbeiten</button></div></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>` : emptyHTML("Noch keine Drucker", "Lege deinen ersten Bondrucker an - er lässt sich danach einer Station zuordnen.")}
        <p class="field-hint">Bluetooth-Drucker müssen einmal in der Haviko-App gekoppelt werden; von hier aus lassen sich nur WLAN-Drucker (per IP) neu anlegen.</p>
      </div>
    </section>
    <section class="section">
      <header class="section-header"><h2>Geräte & Stationen</h2></header>
      <div class="section-body">
        <p>Gerätezugänge (Kassen, digitale Stationsdisplays) werden im Team-Bereich verwaltet und ausschließlich in der Haviko-App angemeldet.</p>
        <p class="field-hint">Kassen öffnen Tische und Theke. Digitale Stationsdisplays zeigen nur die Aufträge ihrer zugewiesenen Station. Stationen selbst werden unter „Stationen" verwaltet.</p>
      </div>
    </section>`;
}

function notificationConfiguration() {
  return app.data.notificationConfiguration || {
    inAppBannersEnabled: true,
    reservationNotifications: true,
    shiftNotifications: true,
    cashDayNotifications: true,
    quietHoursEnabled: false,
    quietHoursStartMinutes: 22 * 60,
    quietHoursEndMinutes: 7 * 60
  };
}

function settingsNotificationsTab() {
  const config = notificationConfiguration();
  return `
    <section class="section">
      <header class="section-header"><h2>Benachrichtigungen</h2></header>
      <div class="section-body">
        <form id="notification-settings-form">
          <label class="check-row"><input id="notify-banners" type="checkbox" ${config.inAppBannersEnabled !== false ? "checked" : ""}><span>In-App Hinweise anzeigen</span></label>
          <label class="check-row"><input id="notify-reservations" type="checkbox" ${config.reservationNotifications !== false ? "checked" : ""}><span>Reservierungen</span></label>
          <label class="check-row"><input id="notify-shifts" type="checkbox" ${config.shiftNotifications !== false ? "checked" : ""}><span>Schichten & Dienstplan</span></label>
          <label class="check-row"><input id="notify-cashday" type="checkbox" ${config.cashDayNotifications !== false ? "checked" : ""}><span>Kasse & Tagesabschluss</span></label>
          <label class="check-row"><input id="notify-quiet" type="checkbox" ${config.quietHoursEnabled ? "checked" : ""}><span>Ruhezeiten verwenden</span></label>
          <div class="field-grid">
            <label class="field"><span>Ruhezeit Beginn</span><input id="notify-quiet-start" type="time" value="${timeFromMinutes(config.quietHoursStartMinutes ?? 22 * 60)}"></label>
            <label class="field"><span>Ruhezeit Ende</span><input id="notify-quiet-end" type="time" value="${timeFromMinutes(config.quietHoursEndMinutes ?? 7 * 60)}"></label>
          </div>
          <p class="field-hint">Push-Berechtigungen selbst werden weiterhin am Gerät erteilt. Diese Einstellungen steuern den gemeinsamen Haviko-Status für Web und App.</p>
          <button class="primary" type="submit">Benachrichtigungen speichern</button>
        </form>
      </div>
    </section>`;
}

function settingsAppearanceTab() {
  return `
    <section class="section">
      <header class="section-header"><h2>Darstellung</h2></header>
      <div class="section-body">
        <form id="appearance-settings-form">
          <div class="filter-row" role="radiogroup" aria-label="Darstellung">
            ${["System", "Hell", "Dunkel"].map((mode) => `
              <label class="filter-button ${app.appearanceMode === mode ? "selected" : ""}">
                <input class="visually-hidden" type="radio" name="appearance-mode" value="${mode}" ${app.appearanceMode === mode ? "checked" : ""}>
                ${mode}
              </label>`).join("")}
          </div>
          <p class="field-hint">Der Web-Modus wird lokal im Browser gespeichert. Die App nutzt weiterhin die iOS-Systemeinstellung bzw. ihre lokale App-Einstellung.</p>
          <button class="primary" type="submit">Darstellung speichern</button>
        </form>
      </div>
    </section>`;
}

function settingsLegalTab() {
  return `
    <section class="section">
      <header class="section-header"><h2>Rechtliches</h2></header>
      <div class="section-body compact-list">
        <a class="compact-row no-icon" href="https://reservierung.haviko.de/datenschutz/" target="_blank" rel="noopener">
          <div class="activity-copy"><strong>Datenschutzerklärung</strong><span>Aktuelle öffentliche Fassung öffnen</span></div><span class="badge">Web</span>
        </a>
        <a class="compact-row no-icon" href="https://reservierung.haviko.de/nutzungsbedingungen/" target="_blank" rel="noopener">
          <div class="activity-copy"><strong>Nutzungsbedingungen</strong><span>Aktuelle öffentliche Fassung öffnen</span></div><span class="badge">Web</span>
        </a>
        <a class="compact-row no-icon" href="https://reservierung.haviko.de/impressum/" target="_blank" rel="noopener">
          <div class="activity-copy"><strong>Impressum</strong><span>Betreiberangaben öffnen</span></div><span class="badge">Web</span>
        </a>
      </div>
    </section>`;
}

function settingsSupportTab() {
  return `
    <section class="section">
      <header class="section-header"><h2>Hilfe-Center</h2><span class="badge ${hasHavikoPlusAccess() ? "green" : ""}">${hasHavikoPlusAccess() ? "Priority" : "Standard"}</span></header>
      <div class="section-body compact-list">
        <a class="compact-row no-icon" href="https://support.haviko.de/" target="_blank" rel="noopener">
          <div class="activity-copy"><strong>Support öffnen</strong><span>Fragen, Konto, Freischaltung und Hilfe</span></div><span class="badge">Web</span>
        </a>
        <a class="compact-row no-icon" href="mailto:support@haviko.de?subject=Haviko%20Support%20${encodeURIComponent(app.workspace?.restaurantCode || "")}">
          <div class="activity-copy"><strong>E-Mail an Support</strong><span>${escapeHTML(app.workspace?.restaurantCode || "Restaurantkennung")} mitsenden</span></div><span class="badge">Mail</span>
        </a>
        <div class="compact-row no-icon"><div class="activity-copy"><strong>Restaurantkennung</strong><span>${escapeHTML(app.workspace?.restaurantCode || "–")}</span></div><button class="row-button" type="button" data-action="copy-code">Kopieren</button></div>
      </div>
    </section>`;
}

function settingsAboutTab() {
  return `
    <section class="section">
      <header class="section-header"><h2>Über Haviko</h2></header>
      <div class="section-body compact-list">
        ${settingStatus("Dashboard", "dashboard.haviko.de", true)}
        ${settingStatus("Restaurant", app.data.restaurantName || app.workspace?.restaurantName || "–", true)}
        ${settingStatus("Rolle", roleTitles[app.workspace?.role] || app.workspace?.role || "–", true)}
        ${settingStatus("Haviko+", havikoPlusStatusTitle(), hasHavikoPlusAccess())}
      </div>
    </section>`;
}

function systemComponentRows(status) {
  const components = Array.isArray(status?.components) ? status.components : [];
  if (!components.length) return emptyHTML("Keine Komponenten", "Der Systemstatus liefert gerade keine Detailkomponenten.");
  return `<div class="compact-list">${components.map((component) => {
    const state = component.status || component.state || "unknown";
    const badgeClass = state === "operational" || state === "ready" ? "green" : state === "degraded" ? "orange" : state === "maintenance" ? "blue" : "red";
    return `<div class="compact-row no-icon"><div class="activity-copy"><strong>${escapeHTML(component.name || component.id || "Komponente")}</strong><span>${escapeHTML(component.message || component.description || "")}</span></div><span class="badge ${badgeClass}">${escapeHTML(state)}</span></div>`;
  }).join("")}</div>`;
}

function settingsSystemStatusTab() {
  const status = lastSystemStatus;
  const overall = status?.overall || status?.status || "unknown";
  const badgeClass = overall === "operational" || overall === "ready" ? "green" : overall === "maintenance" ? "blue" : overall === "degraded" ? "orange" : "red";
  return `
    <section class="section">
      <header class="section-header"><h2>Systemstatus</h2><span class="badge ${badgeClass}">${escapeHTML(overall)}</span></header>
      <div class="section-body">
        <button class="secondary" type="button" data-action="refresh-system-status">Aktualisieren</button>
        ${status ? systemComponentRows(status) : emptyHTML("Status wird geladen", "Aktualisiere den Systemstatus.")}
      </div>
    </section>`;
}

function renderSettings() {
  const tab = SETTINGS_TABS.some((item) => item.id === app.settingsTab) ? app.settingsTab : "restaurant";
  const panels = {
    restaurant: settingsRestaurantTab,
    billing: settingsBillingTab,
    betrieb: settingsBetriebTab,
    reservierung: settingsReservierungTab,
    kundenbindung: settingsKundenbindungTab,
    kasse: settingsKasseTab,
    geraete: settingsGeraeteTab,
    notifications: settingsNotificationsTab,
    appearance: settingsAppearanceTab,
    legal: settingsLegalTab,
    support: settingsSupportTab,
    about: settingsAboutTab,
    systemStatus: settingsSystemStatusTab
  };
  $("view").innerHTML = `
    <div class="page-tools"><div><h2>Einstellungen</h2><p>Restaurant, Online-Buchung und Kassenvorbereitung.</p></div></div>
    <div class="filter-row" role="tablist" aria-label="Einstellungen">
      ${SETTINGS_TABS.map((item) => `<button class="filter-button ${item.id === tab ? "selected" : ""}" type="button" data-settings-tab="${item.id}">${escapeHTML(item.title)}</button>`).join("")}
    </div>
    <div class="settings-layout">
      ${panels[tab]()}
    </div>
  `;
}

function settingStatus(title, value, positive) {
  return `<div class="compact-row no-icon"><div class="activity-copy"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(value)}</span></div><span class="badge ${positive ? "green" : "orange"}">${positive ? "Bereit" : "Offen"}</span></div>`;
}

async function saveBusinessSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const email = $("business-email").value.trim();
  const phone = $("business-phone").value.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  if (email && !$("business-email").checkValidity()) {
    toast("E-Mail prüfen", "Bitte gib eine vollständige E-Mail-Adresse ein.", "error");
    $("business-email").focus();
    return;
  }
  if (phone && (!/^[+0-9 ()/-]+$/.test(phone) || phoneDigits.length < 6 || phoneDigits.length > 18)) {
    toast("Telefonnummer prüfen", "Bitte gib eine gültige Telefonnummer ein.", "error");
    $("business-phone").focus();
    return;
  }
  const configuration = structuredClone(
    app.data.onlineBookingConfiguration ||
      defaultOnlineBookingConfiguration(app.workspace)
  );
  const street = $("business-street").value.trim();
  const houseNumber = $("business-house-number").value.trim();
  const postalCode = $("business-postal-code").value.trim();
  const city = $("business-city").value.trim();
  const state = $("business-state").value.trim();
  const country = $("business-country").value;
  configuration.restaurant.street = street;
  configuration.restaurant.houseNumber = houseNumber;
  configuration.restaurant.postalCode = postalCode;
  configuration.restaurant.city = city;
  configuration.restaurant.state = state;
  configuration.restaurant.country = country;
  configuration.restaurant.address = [
    [street, houseNumber].filter(Boolean).join(" "),
    [postalCode, city].filter(Boolean).join(" "),
    state,
    country
  ].filter(Boolean).join(", ");
  configuration.restaurant.phone = phone;
  configuration.restaurant.email = email;
  configuration.restaurant.openingHoursText =
    $("business-opening-text").value.trim();
  configuration.restaurant.settings.bookingEnabled =
    $("business-booking-enabled").checked;
  configuration.restaurant.settings.automaticConfirmation =
    $("business-auto-confirm").checked;
  configuration.restaurant.settings.clockInRequiresLocation =
    $("business-location-required").checked;
  configuration.restaurant.settings.hasOutdoorSeating =
    $("business-outdoor-seating").checked;
  configuration.restaurant.settings.benchmarkOptIn =
    $("business-benchmark-optin").checked;
  configuration.restaurant.settings.clockInRadiusMeters = Math.max(
    50,
    Math.min(1000, Number($("business-location-radius").value || 150))
  );
  if (street && postalCode && city && configuration.restaurant.settings.clockInLatitude == null) {
    const coords = await geocodeAddress(configuration.restaurant.address);
    if (coords) {
      configuration.restaurant.settings.clockInLatitude = coords.latitude;
      configuration.restaurant.settings.clockInLongitude = coords.longitude;
    }
  }
  await savePatch(
    { onlineBookingConfiguration: configuration },
    "Betriebs- und Reservierungsdaten wurden gespeichert."
  );
}

async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return null;
    const results = await response.json();
    const first = results[0];
    if (!first) return null;
    return { latitude: Number(first.lat), longitude: Number(first.lon) };
  } catch (error) {
    return null;
  }
}

async function saveLoyaltySettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const visitsRequired = Math.max(1, Math.min(100, Number($("loyalty-visits-required").value || 5)));
  const rewardKind = $("loyalty-reward-kind").value;
  const voucherValue = Math.max(0, Number($("loyalty-voucher-value").value || 0));
  const discountPercentage = Math.max(1, Math.min(100, Number($("loyalty-discount-percentage").value || 10)));
  const freeProductName = $("loyalty-free-product-name").value.trim() || "Gratis Dessert";
  await savePatch(
    {
      loyaltyConfiguration: {
        enabled: $("loyalty-enabled").checked,
        visitsRequired,
        rewardKind,
        voucherValue,
        discountPercentage,
        freeProductName,
        awardsStampForReview: $("loyalty-review-bonus").checked
      }
    },
    "Kundenbindungsprogramm wurde gespeichert."
  );
}

async function saveNotificationSettings(event) {
  event.preventDefault();
  const configuration = {
    inAppBannersEnabled: $("notify-banners")?.checked !== false,
    reservationNotifications: $("notify-reservations")?.checked !== false,
    shiftNotifications: $("notify-shifts")?.checked !== false,
    cashDayNotifications: $("notify-cashday")?.checked !== false,
    quietHoursEnabled: $("notify-quiet")?.checked || false,
    quietHoursStartMinutes: minutesFromTime($("notify-quiet-start")?.value, 22 * 60),
    quietHoursEndMinutes: minutesFromTime($("notify-quiet-end")?.value, 7 * 60)
  };
  await savePatch({ notificationConfiguration: configuration }, "Benachrichtigungen wurden gespeichert.");
}

function saveAppearanceSettings(event) {
  event.preventDefault();
  const mode = document.querySelector("input[name='appearance-mode']:checked")?.value || "System";
  app.appearanceMode = mode;
  localStorage.setItem("haviko-appearance-mode", mode);
  toast("Gespeichert", "Darstellung wurde für diesen Browser gespeichert.", "success");
  renderSettings();
}

function renderFiscalStatusSection() {
  const status = app.fiscalStatus;
  if (!status) {
    return `<p class="field-hint">Kassenstatus wird geladen…</p>`;
  }
  if (status.error) {
    return `<p class="field-hint">Kassenstatus konnte nicht geladen werden: ${escapeHTML(status.error)}</p>`;
  }
  const register = status.register;
  const stateTitles = {
    notConfigured: "Nicht eingerichtet",
    testMode: "Testmodus",
    ready: "Bereit",
    error: "Fehler",
    offline: "Offline"
  };
  const stateGood = { testMode: true, ready: true };
  const rows = register
    ? [
        settingStatus("Status", stateTitles[register.fiscalization_state] || register.fiscalization_state, Boolean(stateGood[register.fiscalization_state])),
        settingStatus("Kasse", register.label, true),
        settingStatus("TSE-Anbieter", register.tse_provider || "Kein Anbieter hinterlegt", Boolean(register.tse_provider)),
        settingStatus("Letzte Signierung", register.last_signed_at ? formatDate(register.last_signed_at, { dateStyle: "medium", timeStyle: "short" }) : "–", Boolean(register.last_signed_at))
      ].join("")
    : `<p class="field-hint">Noch keine Kasse eingerichtet.</p>`;
  return `
    ${rows}
    ${settingStatus("Belege (Server)", String(status.receiptCount || 0), status.exportReady)}
    <p class="field-hint">Vorbereitete DSFinV-K-Dateistruktur inkl. Kassenbewegungen, noch keine geprüfte oder zertifizierte DSFinV-K-Kasse.</p>
    <button class="secondary" type="button" data-action="export-dsfinvk" ${status.exportReady ? "" : "disabled"}>DSFinV-K-Export herunterladen</button>
  `;
}

async function loadFiscalStatus() {
  if (!app.workspace?.restaurantId) return;
  try {
    const status = await rpc("get_fiscal_status", { p_restaurant_id: app.workspace.restaurantId });
    app.fiscalStatus = status;
    if (app.route === "settings") render();
  } catch (error) {
    app.fiscalStatus = { error: error.message };
  }
}

async function exportDsfinvk(fromDate, toDate) {
  await ensureSession();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/dsfinvk-export`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      restaurantID: app.workspace.restaurantId,
      fromDate,
      toDate
    })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Export fehlgeschlagen.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dsfinvk-export-${fromDate}-${toDate}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function useCurrentBusinessLocation() {
  if (!navigator.geolocation) {
    toast("Standort nicht verfügbar", "Dieser Browser unterstützt keine Standortabfrage.", "error");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const configuration = structuredClone(
        app.data.onlineBookingConfiguration ||
          defaultOnlineBookingConfiguration(app.workspace)
      );
      configuration.restaurant.settings.clockInLatitude = coords.latitude;
      configuration.restaurant.settings.clockInLongitude = coords.longitude;
      if (await savePatch(
        { onlineBookingConfiguration: configuration },
        "Der Restaurantstandort wurde übernommen."
      )) {
        renderSettings();
      }
    },
    () => {
      toast(
        "Standort nicht übernommen",
        "Erlaube den Standortzugriff im Browser und versuche es erneut.",
        "error"
      );
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function openModal({ eyebrow = "Haviko", title, body, footer = "" }) {
  $("modal-eyebrow").textContent = eyebrow;
  $("modal-title").textContent = title;
  $("modal-body").innerHTML = body;
  $("modal-footer").innerHTML = footer;
  if (!$("modal").open) $("modal").showModal();
}

function closeModal() {
  $("modal").close();
}

function showMoreNavigation() {
  const items = roleRouteList().filter(
    (route) => !["overview", "tables", "orders", "reservations"].includes(route.id)
  );
  openModal({
    title: "Mehr",
    body: `
      <div class="compact-list">${items.map((route) => quickAction(route.id, route.title)).join("")}</div>
      <div class="modal-account-actions">
        <button class="secondary full" type="button" data-modal-action="account">Restaurant & Konto</button>
        <button class="quiet full" type="button" data-modal-action="logout">Abmelden</button>
      </div>`
  });
}

function showHiddenDesktopNavigation() {
  const items = roleRouteList().filter((route) => !CORE_NAV_ROUTES.includes(route.id));
  openModal({
    title: "Mehr",
    body: `<div class="compact-list">${items.map((route) => quickAction(route.id, route.title)).join("")}</div>`
  });
}

const MOOD_LABELS = { green: "Grün", yellow: "Gelb", red: "Rot" };

function openTable(tableID) {
  const table = app.data.tables.find((item) => item.id === tableID);
  if (!table) return;
  const reservation = upcomingReservationForTable(tableID);
  const seatedReservation = table.status === "besetzt"
    ? app.data.reservations.find((item) => item.tableID === tableID && item.status === "Platziert")
    : null;
  const total = tableRunningTotal(tableID);
  const body = `
    <div class="metric-grid">
      ${metric("Status", table.status, table.area)}
      ${metric("Gäste", `${table.guests || 0}/${table.capacity}`, reservation?.name || "Keine Reservierung")}
    </div>
    ${reservation && ["frei", "reserviert"].includes(table.status) ? `
      <div class="review-block">
        <strong>${escapeHTML(reservation.name)}</strong>
        <p>${Number(reservation.guests)} Personen · ${formatDate(reservation.time)}</p>
      </div>` : ""}
    ${table.status === "besetzt" ? `
      <div class="review-block"><strong>Laufender Umsatz: ${formatCurrency(total)}</strong></div>
    ` : ""}
    ${seatedReservation ? `
      <label class="field"><span>Stimmung</span>
        <select onchange="setTableMood('${seatedReservation.id}', this.value)">
          <option value="" ${!seatedReservation.moodFlag ? "selected" : ""}>Keine Angabe</option>
          <option value="green" ${seatedReservation.moodFlag === "green" ? "selected" : ""}>Grün</option>
          <option value="yellow" ${seatedReservation.moodFlag === "yellow" ? "selected" : ""}>Gelb</option>
          <option value="red" ${seatedReservation.moodFlag === "red" ? "selected" : ""}>Rot</option>
        </select>
      </label>
    ` : ""}
    <p class="modal-note">Platzieren, Bestellen, Bezahlen und Abschließen sind ausschließlich in der Haviko-App möglich. Das Web-Dashboard zeigt den Status nur an.</p>
  `;
  openModal({ eyebrow: table.area, title: table.number ? `${table.name} · ${table.number}` : table.name, body });
}

async function setTableMood(reservationID, mood) {
  const reservations = structuredClone(app.data.reservations);
  const reservation = reservations.find((item) => item.id === reservationID);
  if (!reservation) return;
  reservation.moodFlag = mood || null;
  await savePatch({ reservations }, "Stimmung wurde gespeichert.");
}

async function placeWalkIn(tableID) {
  if (blockOperationalAction()) return;
  const guests = Math.max(1, Number($("walkin-guests")?.value || 1));
  const tables = structuredClone(app.data.tables);
  const table = tables.find((item) => item.id === tableID);
  if (!table) return;
  table.guests = Math.min(guests, table.capacity);
  table.status = "besetzt";
  const reservations = structuredClone(app.data.reservations);
  reservations.push({
    id: uuid(),
    name: "Walk-in",
    email: "",
    phone: "",
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    notes: "",
    tableID: table.id,
    table: table.number ? `${table.name} · ${table.number}` : table.name,
    guests: table.guests,
    time: swiftDate(),
    status: "Platziert",
    createdBy: app.workspace.displayName,
    source: "Laufkundschaft",
    receivedAt: swiftDate(),
    waitlistPosition: null
  });
  if (await savePatch({ tables, reservations }, "Walk-in wurde platziert.")) {
    closeModal();
    openOrder(tableID);
  }
}

async function placeReservation(reservationID) {
  if (blockOperationalAction()) return;
  const reservations = structuredClone(app.data.reservations);
  const reservation = reservations.find((item) => item.id === reservationID);
  if (!reservation?.tableID) return;
  reservation.status = "Platziert";
  const tables = structuredClone(app.data.tables);
  const table = tables.find((item) => item.id === reservation.tableID);
  if (table) {
    table.status = "besetzt";
    table.guests = Math.min(Number(reservation.guests || 1), table.capacity);
  }
  if (await savePatch({ tables, reservations }, "Reservierung wurde platziert.")) {
    closeModal();
    openOrder(reservation.tableID);
  }
}

async function setTableStatus(tableID, status, guests = 0) {
  if (blockOperationalAction()) return;
  const tables = structuredClone(app.data.tables);
  const table = tables.find((item) => item.id === tableID);
  if (!table) return;
  table.status = status;
  table.guests = guests;
  const patch = { tables };
  if (status === "reinigen") {
    patch.tableSaleItems = { ...app.data.tableSaleItems, [tableID]: [] };
  }
  if (await savePatch(patch, status === "frei" ? "Tisch ist wieder frei." : "Besuch wurde beendet.")) {
    closeModal();
  }
}

function openOrder(tableID) {
  if (blockOperationalAction()) return;
  const table = app.data.tables.find((item) => item.id === tableID);
  if (!table) return;
  app.orderTableID = tableID;
  app.orderCart = [];
  renderOrderModal(table);
}

function renderOrderModal(table) {
  const categories = app.data.categories.filter((category) =>
    app.data.products.some((product) => product.category === category)
  );
  const cashDay = activeCashDay();
  const cartTotal = app.orderCart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
  openModal({
    eyebrow: table.area,
    title: `Bestellung · ${table.number ? `${table.name} ${table.number}` : table.name}`,
    body: `
      ${app.data.products.length ? categories.map((category) => `
        <div class="review-block">
          <h3>${escapeHTML(category)}</h3>
          <div class="product-grid">
            ${app.data.products.filter((product) => product.category === category && product.isAvailable).map((product) => `
              <button class="product-card" type="button" data-modal-action="add-cart" data-id="${product.id}" style="--product-color:${itemColor(product.colorName)}">
                <strong>${escapeHTML(product.name)}</strong><span>${formatCurrency(product.price)}</span>
              </button>`).join("")}
          </div>
        </div>`).join("") : emptyHTML("Keine Produkte", "Die Restaurantleitung muss zuerst Produkte anlegen.")}
      <div class="section">
        <header class="section-header"><h3>Auswahl</h3><strong>${formatCurrency(cartTotal)}</strong></header>
        <div class="section-body compact-list">
          ${app.orderCart.length ? app.orderCart.map((item) => `
            <div class="compact-row"><span class="activity-icon">${item.quantity}</span><div class="activity-copy"><strong>${escapeHTML(item.name)}</strong><span>${formatCurrency(item.price)} je Position</span></div><button class="row-button" type="button" data-modal-action="remove-cart" data-id="${item.productID}">−</button></div>`).join("") : `<p class="field-hint">Tippe auf Produkte, um sie hinzuzufügen.</p>`}
        </div>
      </div>
      ${cashDay ? "" : `<div class="inline-alert"><strong>Betriebstag geschlossen</strong><span>Öffne den Tag in den Einstellungen, bevor du bonierst.</span></div>`}
      ${cashDay && !sameDay(cashDay.businessDate) ? `<div class="inline-alert"><strong>Vortag noch offen</strong><span>Diese Bestellung wird dem Betriebstag ${escapeHTML(formatDate(cashDay.businessDate, { dateStyle: "medium" }))} zugeordnet.</span></div>` : ""}`,
    footer: `
      <button class="secondary" type="button" data-modal-action="close">Abbrechen</button>
      <button class="primary" type="button" data-modal-action="submit-order" ${app.orderCart.length && cashDay ? "" : "disabled"}>Bonieren · ${formatCurrency(cartTotal)}</button>
    `
  });
}

function addCart(productID) {
  const product = app.data.products.find((item) => item.id === productID);
  const table = app.data.tables.find((item) => item.id === app.orderTableID);
  if (!product || !table) return;
  if (product.optionGroups?.length) {
    openProductOptions(product);
    return;
  }
  commitCartProduct(product, []);
}

function commitCartProduct(product, options) {
  const table = app.data.tables.find((item) => item.id === app.orderTableID);
  if (!product || !table) return;
  const extras = options.map((option) =>
    Number(option.priceDelta || 0)
      ? `${option.name} (+${formatCurrency(option.priceDelta)})`
      : option.name
  );
  const existing = app.orderCart.find(
    (item) => item.productID === product.id && JSON.stringify(item.extras || []) === JSON.stringify(extras)
  );
  if (existing) existing.quantity += 1;
  else {
    app.orderCart.push({
      id: uuid(),
      productID: product.id,
      name: product.name,
      station: product.station,
      price: Number(product.price) + options.reduce((sum, option) => sum + Number(option.priceDelta || 0), 0),
      quantity: 1,
      variants: [],
      extras,
      notes: "",
      allergens: product.allergens || [],
      itemKind: "product",
      taxRate: Number(product.taxRate || 19),
      voucherCode: null
    });
  }
  renderOrderModal(table);
}

function openProductOptions(product) {
  openModal({
    eyebrow: product.category,
    title: product.name,
    body: `
      <form id="product-options-form" data-id="${product.id}">
        ${(product.optionGroups || []).map((group) => `
          <fieldset class="option-group" data-group-id="${group.id}" data-min="${Number(group.minSelections || 0)}" data-max="${Number(group.maxSelections || 1)}">
            <legend>${escapeHTML(group.name)} ${Number(group.minSelections || 0) > 0 ? "<span>Erforderlich</span>" : "<span>Optional</span>"}</legend>
            ${(group.options || []).map((option) => `
              <label class="check">
                <input type="${Number(group.maxSelections || 1) === 1 ? "radio" : "checkbox"}" name="group-${group.id}" value="${option.id}">
                <span>${escapeHTML(option.name)}</span>
                <strong>${Number(option.priceDelta || 0) ? `+${formatCurrency(option.priceDelta)}` : ""}</strong>
              </label>`).join("")}
          </fieldset>`).join("")}
      </form>`,
    footer: `
      <button class="secondary" type="button" data-modal-action="order" data-id="${app.orderTableID}">Zurück</button>
      <button class="primary" type="button" data-modal-action="add-configured-cart" data-id="${product.id}">Hinzufügen</button>`
  });
}

function addConfiguredCart(productID) {
  const product = app.data.products.find((item) => item.id === productID);
  const form = $("product-options-form");
  if (!product || !form) return;
  const selected = [];
  for (const group of product.optionGroups || []) {
    const values = [...form.querySelectorAll(`[name="group-${group.id}"]:checked`)].map((input) => input.value);
    if (values.length < Number(group.minSelections || 0)) {
      toast("Auswahl fehlt", `Wähle bei „${group.name}“ mindestens ${group.minSelections} Option aus.`, "error");
      return;
    }
    selected.push(...(group.options || []).filter((option) => values.includes(option.id)));
  }
  commitCartProduct(product, selected);
}

function removeCart(productID) {
  const item = app.orderCart.find((entry) => entry.productID === productID);
  const table = app.data.tables.find((entry) => entry.id === app.orderTableID);
  if (!item || !table) return;
  item.quantity -= 1;
  if (item.quantity <= 0) app.orderCart = app.orderCart.filter((entry) => entry !== item);
  renderOrderModal(table);
}

async function submitOrder() {
  if (blockOperationalAction()) return;
  const table = app.data.tables.find((item) => item.id === app.orderTableID);
  if (!table || !app.orderCart.length || table.status !== "besetzt") return;
  const cashDay = activeCashDay();
  if (!cashDay) {
    toast("Betriebstag geschlossen", "Öffne zuerst den Betriebstag in den Einstellungen.", "error");
    return;
  }
  if (!sameDay(cashDay.businessDate)
      && !window.confirm("Der offene Betriebstag ist vom Vortag. Trotzdem auf diesen Tag bonieren?")) {
    return;
  }
  const tickets = structuredClone(app.data.tickets);
  const saleItems = structuredClone(app.data.tableSaleItems);
  saleItems[table.id] = [...(saleItems[table.id] || []), ...structuredClone(app.orderCart)];
  const grouped = Map.groupBy
    ? Map.groupBy(app.orderCart, (item) => item.station)
    : app.orderCart.reduce((map, item) => {
        const list = map.get(item.station) || [];
        list.push(item);
        map.set(item.station, list);
        return map;
      }, new Map());
  for (const [station, items] of grouped) {
    const ticketID = uuid();
    const createdAt = swiftDate();
    tickets.push({
      id: ticketID,
      table: table.number ? `${table.name} · ${table.number}` : table.name,
      station,
      items: items.map((item) => `${item.quantity}x ${item.name}`),
      status: "Neu",
      minutesWaiting: 0,
      createdAt,
      updatedAt: createdAt,
      area: table.area,
      guests: table.guests,
      orderNumber: `#${ticketID.slice(0, 6).toUpperCase()}`,
      serviceName: app.workspace.displayName,
      course: "Hauptgang",
      priority: "Normal",
      lineItems: items.map((item) => ({
        id: uuid(),
        productID: item.productID,
        name: item.name,
        quantity: item.quantity,
        variants: item.variants || [],
        extras: item.extras || [],
        notes: item.notes || "",
        allergens: item.allergens || [],
        status: "Offen"
      })),
      comments: [],
      isReorder: Boolean((saleItems[table.id] || []).length > app.orderCart.length),
      isDeferred: false,
      deferredAt: null
    });
  }
  if (await savePatch({ tickets, tableSaleItems: saleItems }, "Bestellung erfolgreich abgeschickt.")) {
    closeModal();
    navigate("tables");
  }
}

function hasReservationConflictWeb(tableID, time, durationMinutes = 105, excludingID = null) {
  if (!tableID) return false;
  const start = time.getTime();
  const end = start + durationMinutes * 60000;
  return app.data.reservations.some((item) => {
    if (item.id === excludingID || item.tableID !== tableID) return false;
    if (!["Geplant", "Zu bestätigen", "Platziert"].includes(item.status)) return false;
    const otherStart = dateFromSwift(item.time).getTime();
    const otherEnd = otherStart + 105 * 60000;
    return start < otherEnd && otherStart < end;
  });
}

function suggestTableWeb(guests, time, excludingID = null) {
  const candidates = app.data.tables.filter((table) =>
    !table.isPlaceholder && table.capacity >= guests && !hasReservationConflictWeb(table.id, time, 105, excludingID)
  );
  candidates.sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name, "de"));
  return candidates[0] || null;
}

function openReservationEditor(reservationID = null, initialTableID = null) {
  const reservation = app.data.reservations.find((item) => item.id === reservationID);
  const date = reservation ? dateFromSwift(reservation.time) : new Date(`${app.reservationDate}T18:00:00`);
  const tableOptions = app.data.tables
    .filter((table) => !table.isPlaceholder)
    .map((table) => `<option value="${table.id}" ${(reservation?.tableID || initialTableID) === table.id ? "selected" : ""}>${escapeHTML(table.number ? `${table.name} · ${table.number}` : table.name)} · ${escapeHTML(table.area)}</option>`)
    .join("");
  openModal({
    eyebrow: reservation ? "Bearbeiten" : "Neu",
    title: "Reservierung",
    body: `
      <form id="reservation-form" data-id="${reservation?.id || ""}">
        <label class="field"><span>Gastname</span><input id="reservation-name" value="${escapeHTML(reservation?.name || "")}" required></label>
        <div class="field-grid">
          <label class="field"><span>E-Mail</span><input id="reservation-email" type="email" value="${escapeHTML(reservation?.email || "")}"></label>
          <label class="field"><span>Telefon</span><input id="reservation-phone" type="tel" value="${escapeHTML(reservation?.phone || "")}"></label>
        </div>
        <div class="field-grid">
          <label class="field"><span>Datum</span><input id="reservation-form-date" type="date" value="${localDateInput(date)}" required></label>
          <label class="field"><span>Uhrzeit</span><input id="reservation-form-time" type="time" step="900" value="${date.toTimeString().slice(0, 5)}" required></label>
        </div>
        <div class="field-grid">
          <label class="field"><span>Personen</span><input id="reservation-guests" type="number" min="1" max="100" value="${Number(reservation?.guests || 2)}" required></label>
          <label class="field"><span>Tisch</span><select id="reservation-table"><option value="">Noch nicht zuweisen</option>${tableOptions}</select></label>
        </div>
        <p class="field-hint" id="reservation-conflict-hint"></p>
        <p class="field-hint" id="reservation-suggestion-hint"></p>
        <label class="field"><span>Geburtstag des Gasts (optional)</span><input id="reservation-birthday" type="date" value="${reservation?.guestBirthday ? localDateInput(dateFromSwift(reservation.guestBirthday)) : ""}"></label>
        <label class="field"><span>Adresse</span><input id="reservation-address" value="${escapeHTML([reservation?.street, reservation?.houseNumber].filter(Boolean).join(" "))}" placeholder="Straße und Hausnummer"></label>
        <div class="field-grid">
          <label class="field"><span>Postleitzahl</span><input id="reservation-postal" value="${escapeHTML(reservation?.postalCode || "")}"></label>
          <label class="field"><span>Ort</span><input id="reservation-city" value="${escapeHTML(reservation?.city || "")}"></label>
        </div>
        <label class="field"><span>Notiz</span><textarea id="reservation-notes" rows="3">${escapeHTML(reservation?.notes || "")}</textarea></label>
        <label class="field" id="reservation-preorder-field" style="display:none;"><span>Vorbestellung</span><textarea id="reservation-preorder" rows="3" placeholder="z. B. 10× Pizza Margherita, 5× Cola">${escapeHTML(reservation?.preOrderNotes || "")}</textarea></label>
      </form>
      <script>
        (() => {
          const guestsInput = document.getElementById("reservation-guests");
          const tableSelect = document.getElementById("reservation-table");
          const dateInput = document.getElementById("reservation-form-date");
          const timeInput = document.getElementById("reservation-form-time");
          const preorderField = document.getElementById("reservation-preorder-field");
          const conflictHint = document.getElementById("reservation-conflict-hint");
          const suggestionHint = document.getElementById("reservation-suggestion-hint");
          function sync() {
            const guests = Number(guestsInput.value || 0);
            preorderField.style.display = guests >= 8 ? "" : "none";
            const time = window.dateTimeFromInputs ? window.dateTimeFromInputs(dateInput.value, timeInput.value) : new Date(\`\${dateInput.value}T\${timeInput.value}\`);
            const excludingID = "${reservation?.id || ""}" || null;
            if (tableSelect.value && window.hasReservationConflictWeb && window.hasReservationConflictWeb(tableSelect.value, time, 105, excludingID)) {
              conflictHint.textContent = "Für diesen Tisch überschneidet sich bereits eine Reservierung.";
              conflictHint.style.color = "var(--red, #c83d4d)";
            } else {
              conflictHint.textContent = "";
            }
            if (!tableSelect.value && guests > 0 && window.suggestTableWeb) {
              const suggestion = window.suggestTableWeb(guests, time, excludingID);
              suggestionHint.textContent = suggestion ? \`Vorschlag: \${suggestion.name}\${suggestion.number ? " · " + suggestion.number : ""} (bis \${suggestion.capacity} Gäste)\` : "";
            } else {
              suggestionHint.textContent = "";
            }
          }
          guestsInput?.addEventListener("input", sync);
          tableSelect?.addEventListener("change", sync);
          dateInput?.addEventListener("change", sync);
          timeInput?.addEventListener("change", sync);
          sync();
        })();
      </script>`,
    footer: `
      ${reservation ? `<button class="danger" type="button" data-modal-action="cancel-reservation" data-id="${reservation.id}">Stornieren</button>` : ""}
      <button class="secondary" type="button" data-modal-action="close">Abbrechen</button>
      <button class="primary" type="button" data-modal-action="save-reservation">Speichern</button>
    `
  });
}

async function saveReservation() {
  const form = $("reservation-form");
  if (!form?.reportValidity()) return;
  const tableID = $("reservation-table").value || null;
  if (!tableID && !window.confirm("Willst du die Reservierung wirklich ohne Tisch speichern?")) return;
  const reservations = structuredClone(app.data.reservations);
  const existing = reservations.find((item) => item.id === form.dataset.id);
  const table = app.data.tables.find((item) => item.id === tableID);
  const address = $("reservation-address").value.trim().split(/\s+/);
  const record = {
    id: existing?.id || uuid(),
    name: $("reservation-name").value.trim(),
    email: $("reservation-email").value.trim(),
    phone: $("reservation-phone").value.trim(),
    street: address.length > 1 ? address.slice(0, -1).join(" ") : address.join(" "),
    houseNumber: address.length > 1 ? address.at(-1) : "",
    postalCode: $("reservation-postal").value.trim(),
    city: $("reservation-city").value.trim(),
    notes: $("reservation-notes").value.trim(),
    preOrderNotes: $("reservation-preorder")?.value.trim() || null,
    guestBirthday: $("reservation-birthday").value ? swiftDate(new Date(`${$("reservation-birthday").value}T00:00:00`)) : (existing?.guestBirthday || null),
    tableID,
    table: table ? (table.number ? `${table.name} · ${table.number}` : table.name) : null,
    guests: Number($("reservation-guests").value),
    time: swiftDate(dateTimeFromInputs($("reservation-form-date").value, $("reservation-form-time").value)),
    status: existing?.status || "Geplant",
    createdBy: existing?.createdBy || app.workspace.displayName,
    source: existing?.source || "Mitarbeiter",
    receivedAt: existing?.receivedAt || swiftDate(),
    waitlistPosition: existing?.waitlistPosition || null
  };
  if (existing) Object.assign(existing, record);
  else reservations.push(record);
  if (await savePatch({ reservations }, existing ? "Reservierung wurde aktualisiert." : "Reservierung wurde angelegt.")) closeModal();
}

async function changeReservationStatus(reservationID, status) {
  const reservations = structuredClone(app.data.reservations);
  const reservation = reservations.find((item) => item.id === reservationID);
  if (!reservation) return;
  reservation.status = status;
  await savePatch({ reservations }, `Reservierung ist jetzt „${status}“.`);
  closeModal();
}

function openProductEditor(productID = null) {
  const product = app.data.products.find((item) => item.id === productID);
  const stations = app.data.stations.map((station) => `<option ${product?.station === station.name ? "selected" : ""}>${escapeHTML(station.name)}</option>`).join("");
  const categories = app.data.categories.map((category) => `<option ${product?.category === category ? "selected" : ""}>${escapeHTML(category)}</option>`).join("");
  openModal({
    eyebrow: product ? "Bearbeiten" : "Neu",
    title: "Produkt",
    body: `
      <form id="product-form" data-id="${product?.id || ""}">
        <label class="field"><span>Name</span><input id="product-name" value="${escapeHTML(product?.name || "")}" required></label>
        <div class="field-grid">
          <label class="field"><span>Kategorie</span><select id="product-category">${categories}</select></label>
          <label class="field"><span>Station</span><select id="product-station">${stations}</select></label>
        </div>
        <div class="field-grid">
          <label class="field"><span>Preis</span><input id="product-price" type="number" min="0" step="0.01" value="${Number(product?.price || 0)}" required></label>
          <label class="field"><span>Mehrwertsteuer</span><select id="product-tax"><option value="19" ${Number(product?.taxRate) === 19 ? "selected" : ""}>19 %</option><option value="7" ${Number(product?.taxRate) === 7 ? "selected" : ""}>7 %</option><option value="0" ${Number(product?.taxRate) === 0 ? "selected" : ""}>0 %</option></select></label>
        </div>
        <label class="field"><span>Beschreibung</span><textarea id="product-description">${escapeHTML(product?.productDescription || "")}</textarea></label>
        <label class="check"><input id="product-available" type="checkbox" ${product?.isAvailable !== false ? "checked" : ""}><span>Produkt ist verfügbar</span></label>
        <div class="review-block">
          <div class="section-header"><h3>Auswahl und Extras</h3><button class="row-button" type="button" data-modal-action="add-option-group">+ Gruppe</button></div>
          <div id="product-option-groups">
            ${(product?.optionGroups || []).map(optionGroupEditorHTML).join("")}
          </div>
          <p class="field-hint">Beispiele: Beilage, Garstufe oder „Pommes +1,00 €“.</p>
        </div>
      </form>`,
    footer: `
      ${product ? `<button class="danger" type="button" data-modal-action="delete-product" data-id="${product.id}">Löschen</button>` : ""}
      <button class="secondary" type="button" data-modal-action="close">Abbrechen</button>
      <button class="primary" type="button" data-modal-action="save-product">Speichern</button>`
  });
}

function optionGroupEditorHTML(group = {}) {
  const groupID = group.id || uuid();
  return `
    <div class="option-group-editor" data-group-id="${groupID}">
      <div class="field-grid">
        <label class="field"><span>Gruppenname</span><input data-option-field="name" value="${escapeHTML(group.name || "")}" placeholder="z. B. Beilage" required></label>
        <label class="field"><span>Maximale Auswahl</span><input data-option-field="max" type="number" min="1" max="10" value="${Number(group.maxSelections || 1)}"></label>
      </div>
      <label class="check"><input data-option-field="required" type="checkbox" ${Number(group.minSelections || 0) > 0 ? "checked" : ""}><span>Auswahl erforderlich</span></label>
      <div data-options>
        ${(group.options || []).map(optionEditorHTML).join("")}
      </div>
      <div class="row-actions">
        <button class="row-button" type="button" data-modal-action="add-product-option" data-id="${groupID}">+ Option</button>
        <button class="row-button danger-text" type="button" data-modal-action="remove-option-group" data-id="${groupID}">Gruppe entfernen</button>
      </div>
    </div>`;
}

function optionEditorHTML(option = {}) {
  return `
    <div class="option-editor" data-option-id="${option.id || uuid()}">
      <input data-option-value="name" value="${escapeHTML(option.name || "")}" placeholder="Option" required>
      <input data-option-value="price" type="number" step="0.01" value="${Number(option.priceDelta || 0)}" aria-label="Aufpreis">
      <button class="row-button" type="button" data-modal-action="remove-product-option" aria-label="Option entfernen">−</button>
    </div>`;
}

function addOptionGroupEditor() {
  $("product-option-groups")?.insertAdjacentHTML("beforeend", optionGroupEditorHTML());
}

function addProductOptionEditor(groupID) {
  document
    .querySelector(`.option-group-editor[data-group-id="${groupID}"] [data-options]`)
    ?.insertAdjacentHTML("beforeend", optionEditorHTML());
}

function readProductOptionGroups() {
  return [...document.querySelectorAll(".option-group-editor")].map((group) => ({
    id: group.dataset.groupId,
    name: group.querySelector('[data-option-field="name"]').value.trim(),
    minSelections: group.querySelector('[data-option-field="required"]').checked ? 1 : 0,
    maxSelections: Number(group.querySelector('[data-option-field="max"]').value || 1),
    options: [...group.querySelectorAll(".option-editor")].map((option) => ({
      id: option.dataset.optionId,
      name: option.querySelector('[data-option-value="name"]').value.trim(),
      priceDelta: Number(option.querySelector('[data-option-value="price"]').value || 0)
    })).filter((option) => option.name)
  })).filter((group) => group.name && group.options.length);
}

async function saveProduct() {
  const form = $("product-form");
  if (!form?.reportValidity()) return;
  const products = structuredClone(app.data.products);
  const existing = products.find((item) => item.id === form.dataset.id);
  const product = {
    id: existing?.id || uuid(),
    name: $("product-name").value.trim(),
    category: $("product-category").value,
    station: $("product-station").value,
    price: Number($("product-price").value),
    isAvailable: $("product-available").checked,
    colorName: existing?.colorName || "mint",
    taxRate: Number($("product-tax").value),
    sku: existing?.sku || "",
    productDescription: $("product-description").value.trim(),
    allergens: existing?.allergens || [],
    sortOrder: Number(existing?.sortOrder || products.length),
    optionGroups: readProductOptionGroups()
  };
  if (existing) Object.assign(existing, product);
  else products.push(product);
  if (await savePatch({ products }, "Produkt wurde gespeichert.")) closeModal();
}

async function openCashDay(event) {
  event.preventDefault();
  const openingFloat = Number($("cash-day-float")?.value || 0);
  if (openingFloat < 0 || activeCashDay()) return;
  // Opens the SAME real cash_day_sessions row the App and the fiscal
  // backend use (open_cash_day RPC) instead of only writing a client-made
  // id into the shared JSON blob - a blob-only session had no server-side
  // row at all, so TSE receipts referencing it and the DSFinV-K export
  // (which reads the real table) would silently disagree with what the
  // dashboard showed as "open".
  let session;
  try {
    session = await rpc("open_cash_day", {
      p_restaurant_id: app.workspace.restaurantId,
      p_opening_float: openingFloat
    });
  } catch (error) {
    toast("Nicht geöffnet", friendlyError(error), "error");
    return;
  }
  const sessions = structuredClone(app.data.cashDaySessions || []);
  sessions.unshift({
    id: session.id,
    businessDate: swiftDate(new Date(session.business_date)),
    openedAt: swiftDate(new Date(session.opened_at)),
    openedBy: session.opened_by_name || app.workspace.displayName,
    openingFloat: Number(session.opening_float),
    status: "open",
    closedAt: null,
    closedBy: null,
    expectedCash: null,
    actualCash: null,
    closingNote: ""
  });
  if (await savePatch({ cashDaySessions: sessions }, "Betriebstag wurde geöffnet.")) renderSettings();
}

async function recordCashMovement(event) {
  event.preventDefault();
  const session = activeCashDay();
  const kind = $("cash-movement-kind")?.value;
  const amount = Number($("cash-movement-amount")?.value);
  const note = $("cash-movement-note")?.value.trim() || "";
  if (!session || !["deposit", "withdrawal"].includes(kind) || !Number.isFinite(amount) || amount <= 0) {
    toast("Nicht gebucht", "Prüfe Bewegungsart und Betrag.", "error");
    return;
  }
  const idempotencyKey = `web-cash-movement-${uuid()}`;
  let remoteMovement;
  try {
    remoteMovement = await rpc("record_cash_movement", {
      p_restaurant_id: app.workspace.restaurantId,
      p_cash_day_session_id: session.id,
      p_kind: kind,
      p_amount: amount,
      p_note: note,
      p_idempotency_key: idempotencyKey
    });
  } catch (error) {
    toast("Nicht gebucht", friendlyError(error), "error");
    return;
  }
  const movements = structuredClone(app.data.cashMovements || []);
  const movementID = remoteMovement?.id || idempotencyKey.replace("web-cash-movement-", "");
  if (!movements.some((movement) => movement.id === movementID)) {
    movements.push({
      id: movementID,
      cashDaySessionID: remoteMovement?.cash_day_session_id || session.id,
      kind: remoteMovement?.kind || kind,
      amount: Number(remoteMovement?.amount || amount),
      note: remoteMovement?.note || note,
      createdBy: remoteMovement?.created_by_name || app.workspace.displayName,
      createdAt: remoteMovement?.created_at ? swiftDate(new Date(remoteMovement.created_at)) : swiftDate()
    });
  }
  if (await savePatch({ cashMovements: movements }, "Kassenbewegung wurde gebucht.")) renderSettings();
}

async function closeCashDay(event) {
  event.preventDefault();
  const actualCash = Number($("cash-day-actual")?.value);
  const note = $("cash-day-note")?.value.trim() || "";
  const sessions = structuredClone(app.data.cashDaySessions || []);
  const session = sessions.find((item) => item.status === "open");
  if (!session || !Number.isFinite(actualCash) || actualCash < 0) {
    toast("Nicht abgeschlossen", "Prüfe den gezählten Kassenbestand.", "error");
    return;
  }
  const closingIssues = cashDayClosingIssues();
  if (closingIssues.length) {
    toast("Nicht abgeschlossen", closingIssues.join(" · "), "error");
    return;
  }
  let expectedCash = expectedCashForSession(session);
  try {
    const closedSession = await rpc("close_cash_day", {
      p_restaurant_id: app.workspace.restaurantId,
      p_cash_day_session_id: session.id,
      p_expected_cash: expectedCash,
      p_actual_cash: actualCash,
      p_note: note
    });
    expectedCash = Number(closedSession?.expected_cash ?? expectedCash);
  } catch (error) {
    // A session opened before this fix (or opened by a still-older client)
    // may have no matching real server-side row at all. Rather than
    // blocking closing entirely, fall back to the blob-only close so the
    // day can still be closed - but say so plainly, since that record then
    // has no real fiscal backing (no audit event, no DSFinV-K visibility).
    if (String(error?.message || "").includes("No open cash day session found")) {
      toast(
        "Ohne Server-Beleg abgeschlossen",
        "Für diesen Betriebstag gab es keinen echten Datensatz beim fiskalischen Backend (vermutlich vor diesem Fix geöffnet). Er wurde nur lokal abgeschlossen - das entspricht NICHT den DSFinV-K-Anforderungen für diesen Tag.",
        "error"
      );
    } else {
      toast("Nicht abgeschlossen", friendlyError(error), "error");
      return;
    }
  }
  session.status = "closed";
  session.closedAt = swiftDate();
  session.closedBy = app.workspace.displayName;
  session.expectedCash = expectedCash;
  session.actualCash = actualCash;
  session.closingNote = note;
  if (await savePatch({ cashDaySessions: sessions }, "Betriebstag wurde abgeschlossen.")) renderSettings();
}

async function deleteProduct(productID) {
  if (!window.confirm("Produkt wirklich löschen? Historische Bons bleiben erhalten.")) return;
  if (await savePatch({ products: app.data.products.filter((item) => item.id !== productID) }, "Produkt wurde gelöscht.")) closeModal();
}

function permissionEditorHTML(member, role) {
  const selected = new Set(member?.permissions || defaultPermissions(role));
  const manager = role === "Restaurantleitung";
  return `
    <div class="permission-list" id="member-permissions">
      ${teamPermissions.map(([id, title, explanation]) => `
        <label class="permission-row">
          <span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(explanation)}</small></span>
          <span class="switch">
            <input type="checkbox" value="${id}" ${manager || selected.has(id) ? "checked" : ""} ${manager ? "disabled" : ""}>
            <span aria-hidden="true"></span>
          </span>
        </label>`).join("")}
    </div>`;
}

const ONBOARDING_STEPS = [
  { id: "login", title: "Anmeldung", detail: "Mit eigenem Anmeldenamen und Passwort einloggen." },
  { id: "tables", title: "Tischplan", detail: "Tische öffnen, Walk-ins platzieren, Reservierungen zuordnen." },
  { id: "orders", title: "Bestellungen aufnehmen", detail: "Bestellung anlegen und an die Küche senden." },
  { id: "kitchen", title: "Küchendisplay", detail: "Küchenbons verstehen, Status setzen, Allergien beachten." },
  { id: "payment", title: "Kasse & Zahlung", detail: "Zahlung erfassen, Trinkgeld, Rechnung abschließen." },
  { id: "shift", title: "Ein-/Ausstempeln", detail: "Eigene Schicht starten und beenden." },
  { id: "emergency", title: "Notfallkontakte", detail: "Wo Notfallkontakte und Fluchtwege zu finden sind." }
];

function onboardingChecklistHTML(memberID) {
  const completed = new Set(app.data.onboardingChecklistProgress?.[memberID] || []);
  return `
    <div class="section-heading"><div><p class="eyebrow">Einarbeitung</p><h3>${completed.size} von ${ONBOARDING_STEPS.length} erledigt</h3></div></div>
    <div class="compact-list">
      ${ONBOARDING_STEPS.map((step) => `
        <label class="check">
          <input type="checkbox" ${completed.has(step.id) ? "checked" : ""} onchange="toggleOnboardingStep('${memberID}', '${step.id}', this.checked)">
          <span><strong>${escapeHTML(step.title)}</strong><br><small class="muted">${escapeHTML(step.detail)}</small></span>
        </label>`).join("")}
    </div>`;
}

async function toggleOnboardingStep(memberID, stepID, checked) {
  const progress = structuredClone(app.data.onboardingChecklistProgress || {});
  const steps = new Set(progress[memberID] || []);
  if (checked) steps.add(stepID);
  else steps.delete(stepID);
  progress[memberID] = [...steps];
  await savePatch({ onboardingChecklistProgress: progress }, "Einarbeitung wurde aktualisiert.");
}

function openMemberEditor(memberID = null) {
  const member = app.data.team.find((item) => item.id === memberID);
  const role = member?.role || "Service";
  openModal({
    eyebrow: "Geschützter Zugang",
    title: member ? "Mitarbeiter bearbeiten" : "Mitarbeiter anlegen",
    body: `
      <form id="member-form" data-id="${member?.id || ""}" data-login-name="${escapeHTML(member?.username || member?.name || "")}">
        <label class="field"><span>Name</span><input id="member-name" value="${escapeHTML(member?.name || "")}" required></label>
        <label class="field"><span>Rolle</span><select id="member-role"><option ${role === "Restaurantleitung" ? "selected" : ""}>Restaurantleitung</option><option ${role === "Service" ? "selected" : ""}>Service</option><option ${role === "Management" ? "selected" : ""}>Management</option><option ${role === "Küche" ? "selected" : ""}>Küche</option><option ${role === "Bar" ? "selected" : ""}>Bar</option></select></label>
        <label class="field"><span>${member ? "Neues Passwort (optional)" : "Startpasswort"}</span><input id="member-password" type="password" minlength="8" autocomplete="new-password" ${member ? "" : "required"}></label>
        <label class="field"><span>Telefon</span><input id="member-phone" type="tel" value="${escapeHTML(member?.phone || "")}"></label>
        <label class="check"><input id="member-active" type="checkbox" ${member?.isActive !== false ? "checked" : ""}><span>Zugang ist aktiv</span></label>
        <p class="field-hint">Der Name ist gleichzeitig der eindeutige Anmeldename. Groß- und Kleinschreibung werden nicht unterschieden. Das Passwort wird ausschließlich als sicherer Hash gespeichert.</p>
        <div id="member-permission-editor">${permissionEditorHTML(member, role)}</div>
      </form>
      ${member ? onboardingChecklistHTML(member.id) : ""}`,
    footer: `${member ? `<button class="danger" type="button" data-modal-action="delete-member" data-id="${member.id}">Mitarbeiter löschen</button>` : ""}<button class="secondary" type="button" data-modal-action="close">Abbrechen</button><button class="primary" type="button" data-modal-action="save-member">${member ? "Speichern" : "Zugang erstellen"}</button>`
  });
  $("member-role")?.addEventListener("change", () => {
    $("member-permission-editor").innerHTML =
      permissionEditorHTML(null, $("member-role").value);
  });
}

function openScheduledShiftEditor(shiftID = null, presetMemberID = null, presetDate = null) {
  if (!canManage()) return;
  const existing = shiftID ? app.data.scheduledShifts.find((item) => item.id === shiftID) : null;
  let start = existing ? dateFromSwift(existing.start) : new Date();
  let end = existing ? dateFromSwift(existing.end) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
  if (!existing) {
    if (presetDate) {
      const [year, month, dayOfMonth] = presetDate.split("-").map(Number);
      start = new Date(year, month - 1, dayOfMonth, 17, 0, 0, 0);
    } else {
      start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    }
    end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  }
  openModal({
    eyebrow: "Dienstplan",
    title: existing ? "Schicht bearbeiten" : "Schicht planen",
    body: `
      <form id="scheduled-shift-form" data-id="${existing?.id || ""}">
        <label class="field"><span>Mitarbeiter</span><select id="scheduled-shift-member" required>
          <option value="">Bitte auswählen</option>
          ${app.data.team.filter((member) => member.isActive !== false).map((member) => `<option value="${member.id}" ${(existing?.memberID || presetMemberID) === member.id ? "selected" : ""}>${escapeHTML(member.name)} · ${escapeHTML(member.role)}</option>`).join("")}
        </select></label>
        <div class="field-grid">
          <label class="field"><span>Beginn</span><input id="scheduled-shift-start" type="datetime-local" step="900" value="${localDateInput(start)}T${start.toTimeString().slice(0, 5)}" required></label>
          <label class="field"><span>Ende</span><input id="scheduled-shift-end" type="datetime-local" step="900" value="${localDateInput(end)}T${end.toTimeString().slice(0, 5)}" required></label>
        </div>
        <label class="field"><span>Notiz</span><textarea id="scheduled-shift-note" rows="3">${escapeHTML(existing?.note || "")}</textarea></label>
      </form>`,
    footer: `
      ${existing ? `<button class="danger" type="button" data-modal-action="delete-scheduled-shift" data-id="${existing.id}">Löschen</button>` : ""}
      <button class="secondary" type="button" data-modal-action="close">Abbrechen</button>
      <button class="primary" type="button" data-modal-action="save-scheduled-shift">Speichern</button>`
  });
}

async function saveScheduledShift() {
  if (!canManage()) return;
  const form = $("scheduled-shift-form");
  if (!form?.reportValidity()) return;
  const member = app.data.team.find((item) => item.id === $("scheduled-shift-member").value);
  const start = new Date($("scheduled-shift-start").value);
  const end = new Date($("scheduled-shift-end").value);
  if (!member || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    toast("Nicht gespeichert", "Bitte prüfe Mitarbeiter, Beginn und Ende.", "error");
    return;
  }
  const existingID = form.dataset.id || null;
  const shift = {
    id: existingID || uuid(),
    memberID: member.id,
    memberName: member.name,
    start: swiftDate(start),
    end: swiftDate(end),
    note: $("scheduled-shift-note").value.trim(),
    createdBy: app.workspace.displayName,
    updatedAt: swiftDate()
  };
  const scheduledShifts = existingID
    ? app.data.scheduledShifts.map((item) => (item.id === existingID ? shift : item))
    : [...app.data.scheduledShifts, shift];
  if (await savePatch(
    { scheduledShifts },
    existingID ? "Schicht wurde aktualisiert." : "Schicht wurde eingeplant."
  )) closeModal();
}

async function deleteScheduledShift(shiftID) {
  if (!canManage() || !window.confirm("Diese Schicht wirklich löschen?")) return;
  const scheduledShifts = app.data.scheduledShifts.filter((item) => item.id !== shiftID);
  if (await savePatch({ scheduledShifts }, "Schicht wurde gelöscht.")) closeModal();
}

async function saveMember() {
  const form = $("member-form");
  if (!form?.reportValidity()) return;
  const memberID = form.dataset.id || null;
  const previousLoginName = form.dataset.loginName;
  const roleTitle = $("member-role").value;
  const member = {
    id: memberID || uuid(),
    name: $("member-name").value.trim(),
    role: roleTitle,
    phone: $("member-phone").value.trim(),
    username: $("member-name").value.trim(),
    isActive: $("member-active")?.checked !== false,
    permissions: roleTitle === "Restaurantleitung"
      ? defaultPermissions(roleTitle)
      : [...form.querySelectorAll("#member-permissions input:checked")].map((input) => input.value)
  };
  if (memberID && String(previousLoginName).localeCompare(String(app.workspace.username), "de", { sensitivity: "base" }) === 0 && member.isActive === false) {
    toast("Nicht gespeichert", "Du kannst deinen eigenen Zugang nicht deaktivieren.", "error");
    return;
  }
  const nextTeam = memberID
    ? app.data.team.map((item) => item.id === memberID ? member : item)
    : [...app.data.team, member];
  const activeManagers = nextTeam.filter((item) =>
    item.role === "Restaurantleitung" && item.isActive !== false
  ).length;
  if (activeManagers === 0) {
    toast("Nicht gespeichert", "Mindestens eine aktive Restaurantleitung muss erhalten bleiben.", "error");
    return;
  }
  if (app.data.team.some((item) =>
    item.id !== memberID &&
    String(item.name).localeCompare(member.name, "de", { sensitivity: "base" }) === 0
  ) || app.data.stations.some((item) =>
    String(item.accessUsername || item.name).localeCompare(member.name, "de", { sensitivity: "base" }) === 0
  ) || app.data.devices.some((item) =>
    String(item.loginName || item.name).localeCompare(member.name, "de", { sensitivity: "base" }) === 0
  )) {
    toast("Name bereits vergeben", "Jeder Anmeldename muss im Restaurant eindeutig sein.", "error");
    return;
  }
  try {
    const password = $("member-password").value;
    if (memberID) {
      await rpc("update_restaurant_credential_identity", {
        target_restaurant_id: app.workspace.restaurantId,
        previous_username: previousLoginName,
        member_name: member.name,
        member_password: password,
        member_role: stateRoleToDatabaseRole[roleTitle]
      });
    } else {
      await rpc("upsert_restaurant_credential", {
        target_restaurant_id: app.workspace.restaurantId,
        member_username: member.username,
        member_password: password,
        member_display_name: member.name,
        member_role: stateRoleToDatabaseRole[roleTitle]
      });
    }
    await rpc("set_restaurant_member_profile_edit_permission", {
      target_restaurant_id: app.workspace.restaurantId,
      member_username: member.username,
      is_enabled: member.permissions.includes("editOwnProfile")
    });
    if (await savePatch({ team: nextTeam }, memberID ? "Mitarbeiter wurde aktualisiert." : "Mitarbeiterzugang wurde erstellt.")) closeModal();
  } catch (error) {
    toast("Zugang nicht gespeichert", friendlyError(error), "error");
  }
}

async function deleteMember(memberID) {
  const member = app.data.team.find((item) => item.id === memberID);
  if (!member) return;
  const managerCount = app.data.team.filter((item) => item.role === "Restaurantleitung").length;
  if (member.role === "Restaurantleitung" && managerCount <= 1) {
    toast("Nicht möglich", "Die letzte Restaurantleitung kann nicht gelöscht werden.", "error");
    return;
  }
  if (String(member.username).localeCompare(String(app.workspace.username), "de", { sensitivity: "base" }) === 0) {
    toast("Nicht möglich", "Der aktuell angemeldete Zugang kann hier nicht gelöscht werden.", "error");
    return;
  }
  if (!window.confirm(`Mitarbeiterzugang „${member.name}“ endgültig löschen?`)) return;
  try {
    await rpc("delete_restaurant_credential", {
      target_restaurant_id: app.workspace.restaurantId,
      member_username: member.username || member.name
    });
    if (await savePatch(
      { team: app.data.team.filter((item) => item.id !== memberID) },
      "Mitarbeiterzugang wurde gelöscht."
    )) closeModal();
  } catch (error) {
    toast("Mitarbeiter nicht gelöscht", friendlyError(error), "error");
  }
}

function openDeviceEditor(deviceID = null) {
  const device = app.data.devices.find((item) => item.id === deviceID);
  const kind = device?.kind || "Bonier-Tablet";
  const digitalStations = app.data.stations.filter(
    (station) => station.defaultMode === "digital" && station.isActive !== false
  );
  openModal({
    eyebrow: "Geschützter Gerätezugang",
    title: device ? "Gerät bearbeiten" : "Gerät anlegen",
    body: `
      <form id="device-form" data-id="${device?.id || ""}" data-login-name="${escapeHTML(device?.loginName || device?.name || "")}">
        <label class="field"><span>Gerätename</span><input id="device-name" value="${escapeHTML(device?.name || "")}" required></label>
        <label class="field"><span>Gerätetyp</span>
          <select id="device-kind">
            <option value="Bonier-Tablet" ${kind === "Bonier-Tablet" ? "selected" : ""}>Kasse</option>
            <option value="Küchenanzeige" ${kind === "Küchenanzeige" ? "selected" : ""}>Digitales Stationsdisplay</option>
          </select>
        </label>
        <label class="field" id="device-station-field"><span>Digitale Station</span>
          <select id="device-station">
            <option value="">Bitte auswählen</option>
            ${digitalStations.map((station) => `<option value="${station.id}" ${device?.stationID === station.id ? "selected" : ""}>${escapeHTML(station.name)}</option>`).join("")}
          </select>
        </label>
        <label class="field"><span>${device ? "Neues Passwort (optional)" : "Gerätepasswort"}</span><input id="device-password" type="password" minlength="6" autocomplete="new-password" ${device ? "" : "required"}></label>
        <div class="notice-card">
          <strong>Anmeldung am Gerät</strong>
          <p>Restaurantkennung, Gerätename und Gerätepasswort öffnen direkt die passende Oberfläche. Der Anmeldename ändert sich automatisch mit dem Gerätenamen.</p>
        </div>
      </form>`,
    footer: `
      ${device ? `<button class="danger" type="button" data-modal-action="delete-device" data-id="${device.id}">Gerät löschen</button>` : ""}
      <button class="secondary" type="button" data-modal-action="close">Abbrechen</button>
      <button class="primary" type="button" data-modal-action="save-device">Speichern</button>`
  });
  updateDeviceStationVisibility();
  $("device-kind")?.addEventListener("change", updateDeviceStationVisibility);
}

function updateDeviceStationVisibility() {
  const isKitchen = $("device-kind")?.value === "Küchenanzeige";
  $("device-station-field")?.classList.toggle("hidden", !isKitchen);
  if ($("device-station")) $("device-station").required = isKitchen;
}

async function saveDevice() {
  const form = $("device-form");
  if (!form?.reportValidity()) return;
  const deviceID = form.dataset.id || null;
  const previousLoginName = form.dataset.loginName;
  const name = $("device-name").value.trim();
  const kind = $("device-kind").value;
  const stationID = kind === "Küchenanzeige" ? $("device-station").value : null;
  const password = $("device-password").value;
  const duplicate =
    app.data.team.some((item) =>
      String(item.name).localeCompare(name, "de", { sensitivity: "base" }) === 0
    ) ||
    app.data.stations.some((item) =>
      String(item.accessUsername || item.name).localeCompare(name, "de", { sensitivity: "base" }) === 0
    ) ||
    app.data.devices.some((item) =>
      item.id !== deviceID &&
      String(item.loginName || item.name).localeCompare(name, "de", { sensitivity: "base" }) === 0
    );
  if (duplicate) {
    toast("Name bereits vergeben", "Mitarbeiter, Stationen und Geräte benötigen eindeutige Anmeldenamen.", "error");
    return;
  }

  const devices = structuredClone(app.data.devices);
  const existing = devices.find((item) => item.id === deviceID);
  const device = existing || {
    id: uuid(),
    createdAt: swiftDate()
  };
  device.name = name;
  device.loginName = name;
  device.kind = kind;
  device.stationID = stationID || null;

  try {
    if (existing) {
      await rpc("update_restaurant_credential_identity", {
        target_restaurant_id: app.workspace.restaurantId,
        previous_username: previousLoginName,
        member_name: name,
        member_password: password,
        member_role: kind === "Küchenanzeige" ? "kitchen" : "service"
      });
    } else {
      await rpc("upsert_restaurant_credential", {
        target_restaurant_id: app.workspace.restaurantId,
        member_username: name,
        member_password: password,
        member_display_name: `Gerät · ${name}`,
        member_role: kind === "Küchenanzeige" ? "kitchen" : "service"
      });
      devices.push(device);
    }
    if (await savePatch({ devices }, "Gerätezugang wurde gespeichert.")) closeModal();
  } catch (error) {
    toast("Gerät nicht gespeichert", friendlyError(error), "error");
  }
}

async function deleteDevice(deviceID) {
  const device = app.data.devices.find((item) => item.id === deviceID);
  if (!device || !window.confirm(`Gerätezugang „${device.name}“ endgültig löschen?`)) return;
  try {
    await rpc("delete_restaurant_credential", {
      target_restaurant_id: app.workspace.restaurantId,
      member_username: device.loginName || device.name
    });
    if (await savePatch(
      { devices: app.data.devices.filter((item) => item.id !== deviceID) },
      "Gerätezugang wurde gelöscht."
    )) closeModal();
  } catch (error) {
    toast("Gerät nicht gelöscht", friendlyError(error), "error");
  }
}

function openTableEditor() {
  const areaOptions = app.data.areas.map((area) => `<option>${escapeHTML(area)}</option>`).join("");
  openModal({
    eyebrow: "Tischplan",
    title: "Tisch anlegen",
    body: `
      <form id="table-form">
        <div class="field-grid"><label class="field"><span>Name</span><input id="table-name" value="Tisch" required></label><label class="field"><span>Nummer</span><input id="table-number" required></label></div>
        <label class="field"><span>Bereich</span><input id="table-area" list="areas-list" required><datalist id="areas-list">${areaOptions}</datalist></label>
        <div class="field-grid"><label class="field"><span>Kapazität</span><input id="table-capacity" type="number" min="1" max="100" value="4" required></label><label class="field"><span>Form</span><select id="table-shape"><option value="rectangle">Rechteck</option><option value="square">Quadrat</option><option value="round">Rund</option><option value="oval">Oval</option></select></label></div>
        <label class="check"><input id="table-online" type="checkbox"><span>Dieser Tisch kann online gebucht werden.</span></label>
      </form>`,
    footer: `<button class="secondary" type="button" data-modal-action="close">Abbrechen</button><button class="primary" type="button" data-modal-action="save-table">Speichern</button>`
  });
}

async function saveTable() {
  const form = $("table-form");
  if (!form) return;
  const requiredFields = [...form.querySelectorAll("[required]")];
  const missingField = requiredFields.find((field) => !String(field.value || "").trim());
  if (missingField) {
    missingField.focus();
    toast("Angabe fehlt", "Bitte fülle alle Pflichtfelder aus.", "error");
    return;
  }
  const area = $("table-area").value.trim();
  const table = {
    id: uuid(),
    name: $("table-name").value.trim(),
    number: $("table-number").value.trim(),
    area,
    guests: 0,
    status: "frei",
    capacity: Number($("table-capacity").value),
    isOnlineBookable: $("table-online").checked,
    isPlaceholder: false,
    positionX: null,
    positionY: null,
    width: 120,
    height: 90,
    shape: $("table-shape").value,
    colorName: "mint"
  };
  const areas = app.data.areas.includes(area) ? app.data.areas : [...app.data.areas, area];
  if (await savePatch({ tables: [...app.data.tables, table], areas }, "Tisch wurde angelegt.")) closeModal();
}

function openStationEditor(stationID = null) {
  const station = app.data.stations.find((item) => item.id === stationID);
  openModal({
    eyebrow: station ? "Bearbeiten" : "Neu",
    title: "Station",
    body: `
      <form id="station-form" data-id="${station?.id || ""}">
        <label class="field"><span>Name</span><input id="station-name" value="${escapeHTML(station?.name || "")}" required></label>
        <div class="field-grid"><label class="field"><span>Ausgabeweg</span><select id="station-mode"><option value="digital" ${station?.defaultMode === "digital" ? "selected" : ""}>Digitales Stationsdisplay</option><option value="print" ${station?.defaultMode === "print" ? "selected" : ""}>Bondruck</option></select></label><label class="field"><span>Warnung nach Minuten</span><input id="station-warning" type="number" min="1" max="120" value="${Number(station?.warningMinutes || 12)}"></label></div>
        <label class="check"><input id="station-active" type="checkbox" ${station?.isActive !== false ? "checked" : ""}><span>Station ist aktiv</span></label>
      </form>`,
    footer: `<button class="secondary" type="button" data-modal-action="close">Abbrechen</button><button class="primary" type="button" data-modal-action="save-station">Speichern</button>`
  });
}

function openAccountMenu() {
  openModal({
    eyebrow: roleTitles[app.workspace.role] || "Haviko",
    title: app.data.restaurantName,
    body: `
      <div class="detail-list">
        <div><span>Restaurantkennung</span><strong>${escapeHTML(app.workspace.restaurantCode)}</strong></div>
        <div><span>Angemeldet als</span><strong>${escapeHTML(app.workspace.displayName || app.workspace.username)}</strong></div>
        <div><span>Anmeldename</span><strong>${escapeHTML(app.workspace.username)}</strong></div>
      </div>
      <p class="modal-note">Geräte- und Druckerzugänge werden aus Sicherheitsgründen ausschließlich in der Haviko App verwendet.</p>`,
    footer: `
      <button class="secondary" type="button" data-modal-action="copy-code">Kennung kopieren</button>
      <button class="secondary" type="button" data-modal-action="edit-name">Namen ändern</button>
      ${app.workspace.role === "restaurant_manager" ? `<button class="secondary" type="button" data-modal-action="change-password">Passwort ändern</button>` : ""}
      <button class="danger" type="button" data-modal-action="logout">Abmelden</button>`
  });
}

function openEditProfileName() {
  openModal({
    eyebrow: roleTitles[app.workspace.role] || "Haviko",
    title: "Namen ändern",
    body: `
      <form id="edit-name-form">
        <label class="field">
          <span>Name</span>
          <input id="edit-name-value" value="${escapeHTML(app.workspace.displayName || app.workspace.username)}" minlength="2" required>
        </label>
        <p class="form-error hidden" id="edit-name-error" role="alert"></p>
      </form>`,
    footer: `
      <button class="quiet" type="button" data-modal-action="close">Abbrechen</button>
      <button class="primary" type="button" data-modal-action="save-name">Speichern</button>`
  });
}

async function saveProfileName() {
  const input = $("edit-name-value");
  const error = $("edit-name-error");
  error.classList.add("hidden");
  const newName = input.value.trim();
  if (newName.length < 2) {
    error.textContent = "Bitte gib einen gültigen Namen ein.";
    error.classList.remove("hidden");
    return;
  }
  try {
    await rpc("update_restaurant_credential_identity", {
      target_restaurant_id: app.workspace.restaurantId,
      previous_username: app.workspace.username,
      member_name: newName,
      member_password: "",
      member_role: app.workspace.role
    });
    app.workspace.displayName = newName;
    $("sidebar-user-name").textContent = newName;
    toast("Gespeichert", "Dein Name wurde aktualisiert.", "success");
    closeModal();
  } catch (caught) {
    error.textContent = friendlyError(caught);
    error.classList.remove("hidden");
  }
}

function openChangePassword() {
  openModal({
    eyebrow: roleTitles[app.workspace.role] || "Haviko",
    title: "Passwort ändern",
    body: `
      <form id="change-password-form">
        <label class="field">
          <span>Aktuelles Passwort</span>
          <input id="change-password-current" type="password" autocomplete="current-password" required>
        </label>
        <label class="field">
          <span>Neues Passwort</span>
          <input id="change-password-new" type="password" autocomplete="new-password" minlength="10" required>
        </label>
        <label class="field">
          <span>Neues Passwort bestätigen</span>
          <input id="change-password-confirm" type="password" autocomplete="new-password" minlength="10" required>
        </label>
        <p class="form-error hidden" id="change-password-error" role="alert"></p>
      </form>`,
    footer: `
      <button class="quiet" type="button" data-modal-action="close">Abbrechen</button>
      <button class="primary" type="button" data-modal-action="save-password">Speichern</button>`
  });
}

async function saveProfilePassword() {
  const error = $("change-password-error");
  error.classList.add("hidden");
  const currentPassword = $("change-password-current").value;
  const newPassword = $("change-password-new").value;
  const confirmPassword = $("change-password-confirm").value;
  if (newPassword.length < 10) {
    error.textContent = "Das neue Passwort muss mindestens 10 Zeichen haben.";
    error.classList.remove("hidden");
    return;
  }
  if (newPassword !== confirmPassword) {
    error.textContent = "Die Passwörter stimmen nicht überein.";
    error.classList.remove("hidden");
    return;
  }
  try {
    await rpc("change_primary_owner_password", {
      p_restaurant_id: app.workspace.restaurantId,
      p_current_password: currentPassword,
      p_new_password: newPassword
    });
    toast("Gespeichert", "Dein Passwort wurde geändert.", "success");
    closeModal();
  } catch (caught) {
    error.textContent = friendlyError(caught);
    error.classList.remove("hidden");
  }
}

async function saveStation() {
  const form = $("station-form");
  if (!form?.reportValidity()) return;
  const stations = structuredClone(app.data.stations);
  const existing = stations.find((item) => item.id === form.dataset.id);
  const name = $("station-name").value.trim();
  const stationMode = $("station-mode").value;
  if (stations.some((item) =>
    item.id !== form.dataset.id &&
    String(item.name).localeCompare(name, "de", { sensitivity: "base" }) === 0
  ) || app.data.team.some((item) =>
    String(item.name).localeCompare(name, "de", { sensitivity: "base" }) === 0
  ) || app.data.devices.some((item) =>
    String(item.loginName || item.name).localeCompare(name, "de", { sensitivity: "base" }) === 0
  )) {
    toast("Name bereits vergeben", "Stations-, Mitarbeiter- und Gerätenamen müssen eindeutig sein.", "error");
    return;
  }
  let operatingMode = app.data.kitchenOperatingMode;
  if (!operatingModeSupports(operatingMode, stationMode)) {
    if (!window.confirm("Diese Station passt nicht zur aktuellen Ausgabeart. Auf „Kombiniert“ wechseln?")) return;
    operatingMode = "hybrid";
  }
  const station = {
    id: existing?.id || uuid(),
    name,
    icon: existing?.icon || "flame",
    defaultMode: stationMode,
    accessUsername: existing?.accessUsername || null,
    colorName: existing?.colorName || "orange",
    isActive: $("station-active").checked,
    warningMinutes: Number($("station-warning").value),
    printerID: existing?.printerID || null
  };
  if (existing) Object.assign(existing, station);
  else stations.push(station);
  if (await savePatch(
    { stations, kitchenOperatingMode: operatingMode },
    "Station wurde gespeichert."
  )) closeModal();
}

function openPrinterEditor(printerID = null) {
  const printer = app.data.printers.find((item) => item.id === printerID);
  const printStations = app.data.stations.filter((station) => station.defaultMode === "print");
  openModal({
    eyebrow: printer ? "Bearbeiten" : "Neu",
    title: "Drucker",
    body: `
      <form id="printer-form" data-id="${printer?.id || ""}">
        <label class="field"><span>Name</span><input id="printer-name" value="${escapeHTML(printer?.name || "")}" required></label>
        <label class="field"><span>IP-Adresse (WLAN)</span><input id="printer-endpoint" value="${escapeHTML(printer?.endpoint || "")}" placeholder="z. B. 192.168.1.50" ${printer && printer.transport !== "Netzwerk" ? "" : "required"}></label>
        <label class="field"><span>Bondruckprofil</span>
          <select id="printer-station">
            <option value="">Noch keiner Station zugeordnet</option>
            ${printStations.map((station) => `<option value="${station.id}" ${printer?.assignedStationID === station.id ? "selected" : ""}>${escapeHTML(station.name)}</option>`).join("")}
          </select>
        </label>
        <label class="check"><input id="printer-active" type="checkbox" ${printer?.isActive !== false ? "checked" : ""}><span>Drucker ist aktiv</span></label>
        ${printer && printer.transport !== "Netzwerk" ? `<p class="field-hint">Dieser Drucker wurde über ${escapeHTML(printer.transport === "Bluetooth" ? "Bluetooth" : "den internen Testdienst")} in der App eingerichtet - die Verbindung selbst lässt sich nur dort ändern.</p>` : ""}
      </form>`,
    footer: `
      ${printer ? `<button class="danger" type="button" data-modal-action="delete-printer" data-id="${printer.id}">Löschen</button>` : ""}
      <button class="secondary" type="button" data-modal-action="close">Abbrechen</button>
      <button class="primary" type="button" data-modal-action="save-printer">Speichern</button>`
  });
}

async function savePrinter() {
  const form = $("printer-form");
  if (!form?.reportValidity()) return;
  const printers = structuredClone(app.data.printers);
  const existing = printers.find((item) => item.id === form.dataset.id);
  const printer = {
    id: existing?.id || uuid(),
    name: $("printer-name").value.trim(),
    transport: existing?.transport || "Netzwerk",
    endpoint: $("printer-endpoint").value.trim(),
    assignedStationID: $("printer-station").value || null,
    connectionStatus: existing?.connectionStatus || "Unbekannt",
    paperStatus: existing?.paperStatus || "Papier vorhanden",
    isActive: $("printer-active").checked,
    printsReceiptsByDefault: existing?.printsReceiptsByDefault || false
  };
  if (existing) Object.assign(existing, printer);
  else printers.push(printer);
  if (await savePatch({ printers }, "Drucker wurde gespeichert.")) closeModal();
}

async function deletePrinter(printerID) {
  if (!window.confirm("Diesen Drucker wirklich löschen?")) return;
  const printers = app.data.printers.filter((item) => item.id !== printerID);
  if (await savePatch({ printers }, "Drucker wurde gelöscht.")) closeModal();
}

async function shiftAction(action) {
  const now = swiftDate();
  if (action === "start") {
    await savePatch({ activeShiftStart: now, activeBreakStart: null, accumulatedBreak: 0 }, "Schicht wurde gestartet.");
    return;
  }
  if (action === "break") {
    if (app.data.activeBreakStart) {
      const breakSeconds = Math.max(0, (dateFromSwift(now) - dateFromSwift(app.data.activeBreakStart)) / 1000);
      await savePatch({
        activeBreakStart: null,
        accumulatedBreak: Number(app.data.accumulatedBreak || 0) + breakSeconds
      }, "Pause wurde beendet.");
    } else {
      await savePatch({ activeBreakStart: now }, "Pause wurde gestartet.");
    }
    return;
  }
  if (action === "end" && app.data.activeShiftStart) {
    let breakDuration = Number(app.data.accumulatedBreak || 0);
    if (app.data.activeBreakStart) {
      breakDuration += Math.max(0, (dateFromSwift(now) - dateFromSwift(app.data.activeBreakStart)) / 1000);
    }
    const member = currentMember();
    const record = {
      id: uuid(),
      memberID: member?.id || null,
      start: app.data.activeShiftStart,
      end: now,
      breakDuration
    };
    await savePatch({
      activeShiftStart: null,
      activeBreakStart: null,
      accumulatedBreak: 0,
      shiftRecords: [...app.data.shiftRecords, record]
    }, "Schicht wurde beendet.");
  }
}

function handleViewClick(event) {
  const route = event.target.closest("[data-route]")?.dataset.route;
  if (route) {
    if ($("modal").open) closeModal();
    navigate(route);
    return;
  }
  const tableID = event.target.closest("[data-table-id]")?.dataset.tableId;
  if (tableID) return openTable(tableID);
  const reservationID = event.target.closest("[data-reservation-id]")?.dataset.reservationId;
  if (reservationID) return openReservationEditor(reservationID);
  const productID = event.target.closest("[data-product-id]")?.dataset.productId;
  if (productID) return openProductEditor(productID);
  const counterProductID = event.target.closest("[data-counter-product-id]")?.dataset.counterProductId;
  if (counterProductID) return addCounterProduct(counterProductID);
  const counterIncID = event.target.closest("[data-counter-inc-id]")?.dataset.counterIncId;
  if (counterIncID) return updateCounterCartItem(counterIncID, 1);
  const counterDecID = event.target.closest("[data-counter-dec-id]")?.dataset.counterDecId;
  if (counterDecID) return updateCounterCartItem(counterDecID, -1);
  const counterRemoveID = event.target.closest("[data-counter-remove-id]")?.dataset.counterRemoveId;
  if (counterRemoveID) return removeCounterCartItem(counterRemoveID);
  const stationID = event.target.closest("[data-station-id]")?.dataset.stationId;
  if (stationID) return openStationEditor(stationID);
  const printerID = event.target.closest("[data-printer-id]")?.dataset.printerId;
  if (printerID) return openPrinterEditor(printerID);
  const memberID = event.target.closest("[data-member-id]")?.dataset.memberId;
  if (memberID) return openMemberEditor(memberID);
  const deviceID = event.target.closest("[data-device-id]")?.dataset.deviceId;
  if (deviceID) return openDeviceEditor(deviceID);
  const guestID = event.target.closest("[data-guest-id]")?.dataset.guestId;
  if (guestID) return openGuestProfile(guestID);
  const cashDayID = event.target.closest("[data-cash-day-id]")?.dataset.cashDayId;
  if (cashDayID) return openCashDayReport(cashDayID);
  const shiftReportID = event.target.closest("[data-shift-report-id]")?.dataset.shiftReportId;
  if (shiftReportID) return openShiftReport(shiftReportID);
  const receiptID = event.target.closest("[data-receipt-id]")?.dataset.receiptId;
  if (receiptID) return openReceiptDetail(receiptID);
  const voucherID = event.target.closest("[data-voucher-id]")?.dataset.voucherId;
  if (voucherID) return openVoucherDetail(voucherID);
  const blockedPeriodID = event.target.closest("[data-blocked-period-remove]")?.dataset.blockedPeriodRemove;
  if (blockedPeriodID) return removeBlockedPeriod(blockedPeriodID);
  const chatKind = event.target.closest("[data-chat-kind]")?.dataset.chatKind;
  if (chatKind) {
    app.chatKind = chatKind;
    app.chatConversationID = null;
    renderTeamChat();
    return;
  }
  const chatConversationID = event.target.closest("[data-chat-conversation-id]")?.dataset.chatConversationId;
  if (chatConversationID) {
    app.chatConversationID = chatConversationID;
    renderTeamChat();
    return;
  }
  const billingMonth = event.target.closest("[data-action='download-billing-invoice']")?.dataset.month;
  if (billingMonth) return downloadBillingInvoice(billingMonth);
  const counterCategory = event.target.closest("[data-counter-category]")?.dataset.counterCategory;
  if (counterCategory) {
    app.counterCategory = counterCategory;
    renderCounter();
    return;
  }
  const area = event.target.closest("[data-area]")?.dataset.area;
  if (area) {
    app.tableArea = area;
    renderTables();
    return;
  }
  const viewMode = event.target.closest("[data-view-mode]")?.dataset.viewMode;
  if (viewMode) {
    app.tableViewMode = viewMode;
    renderTables();
    return;
  }
  const teamViewMode = event.target.closest("[data-team-view-mode]")?.dataset.teamViewMode;
  if (teamViewMode) {
    app.teamViewMode = teamViewMode;
    renderTeam();
    return;
  }
  const settingsTab = event.target.closest("[data-settings-tab]")?.dataset.settingsTab;
  if (settingsTab) {
    app.settingsTab = settingsTab;
    renderSettings();
    return;
  }
  const weekOffset = event.target.closest("[data-week-offset]")?.dataset.weekOffset;
  if (weekOffset) {
    if (weekOffset === "today") app.scheduleWeekOffset = 0;
    else if (weekOffset === "next") app.scheduleWeekOffset = (app.scheduleWeekOffset || 0) + 1;
    else if (weekOffset === "prev") app.scheduleWeekOffset = (app.scheduleWeekOffset || 0) - 1;
    renderShifts();
    return;
  }
  const scheduleCell = event.target.closest("[data-schedule-cell]");
  if (scheduleCell) {
    openScheduledShiftEditor(
      scheduleCell.dataset.shiftId || null,
      scheduleCell.dataset.memberId,
      scheduleCell.dataset.date
    );
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "add-table") openTableEditor();
  if (action === "add-reservation") openReservationEditor();
  if (action === "add-product") openProductEditor();
  if (action === "manage-categories") openCategoryManager();
  if (action === "counter-checkout") openCounterCheckout();
  if (action === "voucher-settings") openVoucherSettings();
  if (action === "save-availability") saveAvailability();
  if (action === "add-blocked-period") openBlockedPeriodEditor();
  if (action === "refresh-system-status") {
    checkMaintenanceMode().then(() => renderSettings());
  }
  if (action === "add-member") openMemberEditor();
  if (action === "add-device") openDeviceEditor();
  if (action === "add-station") openStationEditor();
  if (action === "add-printer") openPrinterEditor();
  if (action === "save-operating-mode") saveKitchenOperatingMode();
  if (action === "plan-shift") openScheduledShiftEditor();
  if (action === "start-shift") shiftAction("start");
  if (action === "toggle-break") shiftAction("break");
  if (action === "end-shift") shiftAction("end");
  if (action === "use-current-location") useCurrentBusinessLocation();
  if (action === "export-dsfinvk") {
    const toDate = localDateInput(new Date());
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fromDate = localDateInput(from);
    exportDsfinvk(fromDate, toDate).catch((error) => {
      toast("Export fehlgeschlagen", error.message, "error");
    });
  }
}

function handleModalClick(event) {
  const target = event.target.closest("[data-modal-action]");
  if (!target) return;
  const action = target.dataset.modalAction;
  const id = target.dataset.id;
  if (action === "close") closeModal();
  if (action === "edit-guest" && id) openReservationEditor(id);
  if (action === "walkin") placeWalkIn(id);
  if (action === "place-reservation") placeReservation(id);
  if (action === "order") openOrder(id);
  if (action === "end-visit") setTableStatus(id, "reinigen", 0);
  if (action === "cleaned") setTableStatus(id, "frei", 0);
  if (action === "add-cart") addCart(id);
  if (action === "add-configured-cart") addConfiguredCart(id);
  if (action === "remove-cart") removeCart(id);
  if (action === "submit-order") submitOrder();
  if (action === "save-reservation") saveReservation();
  if (action === "cancel-reservation") changeReservationStatus(id, "Storniert");
  if (action === "save-product") saveProduct();
  if (action === "save-category") saveCategory();
  if (action === "move-category-up") moveCategory(id, -1);
  if (action === "move-category-down") moveCategory(id, 1);
  if (action === "delete-category") deleteCategory(id);
  if (action === "add-option-group") addOptionGroupEditor();
  if (action === "add-product-option") addProductOptionEditor(id);
  if (action === "remove-option-group") {
    document.querySelector(`.option-group-editor[data-group-id="${id}"]`)?.remove();
  }
  if (action === "remove-product-option") target.closest(".option-editor")?.remove();
  if (action === "delete-product") deleteProduct(id);
  if (action === "toggle-voucher" && id) toggleVoucher(id);
  if (action === "save-voucher-settings") saveVoucherSettings();
  if (action === "save-blocked-period") saveBlockedPeriod();
  if (action === "save-member") saveMember();
  if (action === "delete-member") deleteMember(id);
  if (action === "save-device") saveDevice();
  if (action === "delete-device") deleteDevice(id);
  if (action === "save-scheduled-shift") saveScheduledShift();
  if (action === "delete-scheduled-shift" && id) deleteScheduledShift(id);
  if (action === "save-table") saveTable();
  if (action === "save-station") saveStation();
  if (action === "save-printer") savePrinter();
  if (action === "delete-printer" && id) deletePrinter(id);
  if (action === "account") openAccountMenu();
  if (action === "edit-name") openEditProfileName();
  if (action === "save-name") saveProfileName();
  if (action === "change-password") openChangePassword();
  if (action === "save-password") saveProfilePassword();
  if (action === "copy-code") {
    navigator.clipboard
      .writeText(app.workspace.restaurantCode)
      .then(() => toast("Kopiert", "Die Restaurantkennung liegt in der Zwischenablage.", "success"))
      .catch(() => toast("Nicht kopiert", "Bitte kopiere die Kennung manuell.", "error"));
  }
  if (action === "logout") {
    closeModal();
    logout();
  }
}

async function login(event) {
  event.preventDefault();
  const button = $("login-submit");
  const error = $("login-error");
  error.classList.add("hidden");
  button.disabled = true;
  button.textContent = "Anmeldung läuft …";
  try {
    await ensureSession();
    const rows = await rpc("claim_restaurant_access", {
      p_restaurant_code: $("login-code").value.trim().toUpperCase(),
      p_member_username: $("login-username").value.trim(),
      p_member_password: $("login-password").value
    });
    const session = Array.isArray(rows) ? rows[0] : rows;
    if (!session?.restaurant_id) throw new Error("Invalid restaurant credentials");
    if (!Object.keys(roleTitles).includes(session.role)) {
      throw new Error("Gerätezugänge können sich nicht im Web-Dashboard anmelden.");
    }
    await loadWorkspace(session.restaurant_id);
    redirectToDashboardIfOnLoginHost();
    const isDeviceAccess = app.data.devices.some(
      (device) =>
        String(device.loginName || device.name).localeCompare(
          session.username,
          "de",
          { sensitivity: "base" }
        ) === 0
    );
    if (isDeviceAccess) {
      await logout();
      throw new Error("Gerätezugänge können sich nur in der Haviko-App anmelden.");
    }
  } catch (caught) {
    error.textContent = friendlyError(caught);
    error.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Anmelden";
  }
}

async function register(event) {
  event.preventDefault();
  const button = $("register-submit");
  const error = $("register-error");
  error.classList.add("hidden");
  button.disabled = true;
  button.textContent = "Restaurant wird erstellt …";
  try {
    await ensureSession();
    const rows = await rpc("create_restaurant_account", {
      p_restaurant_name: $("register-name").value.trim(),
      p_restaurant_type: $("register-type").value,
      p_owner_username: $("register-username").value.trim(),
      p_owner_password: $("register-password").value,
      p_owner_display_name: $("register-username").value.trim()
    });
    const session = Array.isArray(rows) ? rows[0] : rows;
    if (!session?.restaurant_id) throw new Error("Restaurant konnte nicht erstellt werden.");
    await initializeRestaurantState(session);
    await loadWorkspace(session.restaurant_id);
    redirectToDashboardIfOnLoginHost();
    toast("Restaurant erstellt", `Deine Kennung lautet ${session.restaurant_code}.`, "success");
  } catch (caught) {
    error.textContent = friendlyError(caught);
    error.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Restaurant sicher erstellen";
  }
}

async function logout() {
  if (app.isLoggingOut) return;
  app.isLoggingOut = true;
  try {
    if (app.session?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: authHeaders(false)
      });
    }
  } finally {
    clearSession();
    if ($("modal")?.open) closeModal();
    if (IS_LOGIN_HOST) {
      showAuth();
      app.isLoggingOut = false;
    } else {
      window.location.replace(LOGIN_URL);
    }
  }
}

function switchAuth(mode) {
  const loginMode = mode === "login";
  document.title = loginMode ? "Anmelden | Haviko" : "Restaurant erstellen | Haviko";
  $("login-form").classList.toggle("hidden", !loginMode);
  $("register-form").classList.toggle("hidden", loginMode);
  $("login-tab").classList.toggle("selected", loginMode);
  $("register-tab").classList.toggle("selected", !loginMode);
  $("login-tab").setAttribute("aria-selected", String(loginMode));
  $("register-tab").setAttribute("aria-selected", String(!loginMode));
  $("auth-title").textContent = loginMode ? "Anmelden" : "Restaurant erstellen";
  $("auth-subtitle").textContent = loginMode
    ? "Mit Restaurantkennung und persönlichem Zugang."
    : "Starte leer und richte deinen Betrieb anschließend ein.";
}

function updateOnlineStatus() {
  const banner = $("offline-banner");
  if (!navigator.onLine) {
    const queueLength = queuedMutations().filter((item) => item.restaurantID === app.workspace?.restaurantId).length;
    banner.textContent = queueLength
      ? `${queueLength} Änderung${queueLength === 1 ? "" : "en"} warten auf Synchronisierung.`
      : "Offline - Änderungen werden vorgemerkt und bei Wiederverbindung synchronisiert.";
    banner.classList.remove("hidden");
    setSyncState("error", "Offline");
  } else {
    banner.classList.add("hidden");
    if (app.workspace) setSyncState("ready", "Aktuell");
    flushQueuedMutations();
  }
}

async function start() {
  if (app.isLoggingOut) return;
  switchAuth(INITIAL_AUTH_MODE);
  try {
    const stored = readStoredSession();
    if (!stored?.access_token && !stored?.refresh_token) {
      if (IS_DASHBOARD_HOST) window.location.replace(LOGIN_URL);
      else showAuth();
      return;
    }
    app.session = stored;
    await ensureSession();
    await loadWorkspace(readLastRestaurant());
    await flushQueuedMutations();
    redirectToDashboardIfOnLoginHost();
  } catch {
    clearSession();
    if (IS_DASHBOARD_HOST) window.location.replace(LOGIN_URL);
    else showAuth();
  }
}

document.addEventListener("click", (event) => {
  const route = event.target.closest("[data-route]")?.dataset.route;
  if (route && !event.target.closest("#view")) {
    if ($("modal").open) closeModal();
    navigate(route);
  }
});
$("view").addEventListener("click", handleViewClick);
$("modal-shell").addEventListener("click", handleModalClick);
$("login-form").addEventListener("submit", login);
$("register-form").addEventListener("submit", register);
$("login-tab").addEventListener("click", () => switchAuth("login"));
$("register-tab").addEventListener("click", () => switchAuth("register"));
$("logout-button").addEventListener("click", logout);
$("sidebar-profile-button")?.addEventListener("click", () => navigate("settings"));
$("restaurant-button").addEventListener("click", openAccountMenu);
$("refresh-button").addEventListener("click", () => loadWorkspace(app.workspace.restaurantId));
$("view").addEventListener("change", (event) => {
  if (event.target.id === "reservation-date") {
    app.reservationDate = event.target.value;
    renderReservations();
  }
});
$("view").addEventListener("submit", (event) => {
  if (event.target.id === "cash-day-open-form") openCashDay(event);
  if (event.target.id === "cash-movement-form") recordCashMovement(event);
  if (event.target.id === "cash-day-close-form") closeCashDay(event);
  if (event.target.id === "business-settings-form") saveBusinessSettings(event);
  if (event.target.id === "loyalty-settings-form") saveLoyaltySettings(event);
  if (event.target.id === "notification-settings-form") saveNotificationSettings(event);
  if (event.target.id === "appearance-settings-form") saveAppearanceSettings(event);
  if (event.target.id === "chat-message-form") sendChatMessage(event);
});
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
window.addEventListener("popstate", () => {
  if (!app.workspace) return;
  const routeID = routeFromLocation() || "overview";
  if (!routeAllowed(routeID)) {
    syncRouteURL("replace");
    return;
  }
  app.route = routeID;
  buildNavigation();
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
});

let incidentBannerDismissed = false;
let lastSystemStatus = null;

function incidentMessageFor(status) {
  if (!status || status.maintenance_mode) return null;

  const globalMessage = status.globalIncidentMessage?.trim();
  if (globalMessage) return globalMessage;

  const components = Array.isArray(status.components) ? status.components : [];
  const degraded = components.filter((c) => !c.isOperational);
  if (degraded.length === 0) return null;

  return degraded.length === 1
    ? (degraded[0].note?.trim() || `Es gibt momentan Störungen im Bereich ${degraded[0].label}.`)
    : `Es gibt momentan Störungen in mehreren Bereichen: ${degraded.map((c) => c.label).join(", ")}.`;
}

function renderDashboardIncidentBanner() {
  const container = $("dashboard-incident-banner");
  if (!container) return;

  if (incidentBannerDismissed) {
    container.innerHTML = "";
    return;
  }

  const message = incidentMessageFor(lastSystemStatus);
  if (!message) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="compact-row no-icon" style="background:var(--red);color:white;border-radius:var(--radius, 8px);padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <span>${escapeHTML(message)}</span>
      <button type="button" id="dashboard-incident-dismiss" style="border:0;background:none;color:white;font-size:18px;line-height:1;cursor:pointer;padding:2px 4px;" aria-label="Hinweis schließen">×</button>
    </div>`;
  $("dashboard-incident-dismiss")?.addEventListener("click", () => {
    incidentBannerDismissed = true;
    renderDashboardIncidentBanner();
  });
}

function showIncidentBanner(status) {
  lastSystemStatus = status;
  renderDashboardIncidentBanner();
}

async function checkMaintenanceMode() {
  try {
    const status = await rpc("get_system_status");
    const active = Boolean(status?.maintenance_mode);
    if (status?.maintenance_message) {
      $("maintenance-message").textContent = status.maintenance_message;
    }
    $("maintenance-shell").classList.toggle("hidden", !active);
    if (active) {
      $("boot-shell")?.classList.add("hidden");
      document.body.classList.remove("is-booting");
    }
    showIncidentBanner(status);
    return active;
  } catch {
    if (navigator.onLine) {
      const banner = $("offline-banner");
      banner.textContent = "Haviko-Backend nicht erreichbar - Änderungen bitte erst nach Wiederverbindung ausführen.";
      banner.classList.remove("hidden");
      setSyncState("error", "Backend nicht erreichbar");
    }
    return false;
  }
}

updateOnlineStatus();
(async () => {
  const underMaintenance = await checkMaintenanceMode();
  setInterval(checkMaintenanceMode, 30000);
  setInterval(checkSessionStillValid, 30000);
  if (underMaintenance) return;
  start();
})();
