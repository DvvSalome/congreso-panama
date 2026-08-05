"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { descargarCsv } from "@/lib/csv";
import type { Estado, Inscripcion } from "@/lib/types";

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

type Row = Omit<Inscripcion, "estado" | "es_prueba"> & {
  estado: Estado;
  es_prueba: boolean;
  thumbUrl: string | null;
  fullUrl: string | null;
  comprobanteError: string | null;
};

type Orden = "recientes" | "antiguos" | "monto" | "nombre";

const ESTADOS: { valor: Estado; etiqueta: string }[] = [
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "verificado", etiqueta: "Verificado" },
  { valor: "rechazado", etiqueta: "Rechazado" },
];

function fmtMoney(n: number, moneda: string) {
  return moneda === "COP"
    ? `$${Math.round(n).toLocaleString("es-CO")} COP`
    : `$${n.toFixed(2).replace(/\.00$/, "")} USD`;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function extensionDe(path: string | null) {
  return path?.split(".").pop()?.toLowerCase() ?? "";
}

// El comprobante original puede pesar varios MB (hay uno de 11 MB). Para la
// miniatura pedimos la versión redimensionada del transformador de imágenes de
// Supabase; el enlace de "ver completo" sigue apuntando al archivo original.
function urlMiniatura(signedUrl: string) {
  return signedUrl.replace("/object/sign/", "/render/image/sign/") + "&width=240&quality=55";
}

// Anima desde el valor que se está mostrando ahora, no desde cero: así al
// verificar una inscripción el contador sube del número viejo al nuevo en vez
// de reiniciarse.
function useCountUp(target: number, duration = 650) {
  const [value, setValue] = useState(0);
  const actual = useRef(0);

  useEffect(() => {
    const inicio = actual.current;
    if (inicio === target) return;

    let frame = 0;
    let t0: number | null = null;

    function paso(ts: number) {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const v = inicio + (target - inicio) * (1 - Math.pow(1 - p, 3));
      actual.current = v;
      setValue(v);
      if (p < 1) frame = requestAnimationFrame(paso);
    }

    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const RING_R = 17;
const RING_C = 2 * Math.PI * RING_R;

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  const [query, setQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<Estado | "todos">("todos");
  const [filtroModalidad, setFiltroModalidad] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroMoneda, setFiltroMoneda] = useState("todas");
  const [verPruebas, setVerPruebas] = useState(false);
  const [orden, setOrden] = useState<Orden>("recientes");

  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [notaAbierta, setNotaAbierta] = useState<string | null>(null);
  const [visorIdx, setVisorIdx] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ id: string; estado: Estado } | null>(null);

  // Indicador deslizante del filtro por estado: se mide el botón activo para
  // que la pastilla viaje hasta él en vez de saltar.
  const segRef = useRef<HTMLDivElement>(null);
  const [segPos, setSegPos] = useState({ left: 0, width: 0 });

  const mostrarToast = useCallback((msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const cargar = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("inscripciones")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("No se pudieron cargar las inscripciones: " + fetchError.message);
      return;
    }
    setError("");

    const inscripciones = (data ?? []) as Inscripcion[];
    const paths = inscripciones
      .map((r) => r.comprobante_path)
      .filter((p): p is string => Boolean(p));

    // Una sola llamada para firmar todos los comprobantes, en vez de una por fila.
    const firmadas = new Map<string, { url: string | null; error: string | null }>();
    if (paths.length > 0) {
      const { data: signed, error: signError } = await supabase.storage
        .from("comprobantes")
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

      if (signError) {
        paths.forEach((p) => firmadas.set(p, { url: null, error: signError.message }));
      } else {
        (signed ?? []).forEach((s) => {
          if (s.path) firmadas.set(s.path, { url: s.signedUrl ?? null, error: s.error });
        });
      }
    }

    setRows(
      inscripciones.map((row) => {
        const firma = row.comprobante_path ? firmadas.get(row.comprobante_path) : undefined;
        const fullUrl = firma?.url ?? null;
        const esImagen = IMAGE_EXT.has(extensionDe(row.comprobante_path));
        return {
          ...row,
          estado: (row.estado ?? "pendiente") as Estado,
          es_prueba: row.es_prueba ?? false,
          fullUrl,
          thumbUrl: fullUrl && esImagen ? urlMiniatura(fullUrl) : fullUrl,
          comprobanteError:
            row.comprobante_path && !fullUrl
              ? firma?.error ?? "No se pudo firmar el archivo"
              : null,
        };
      })
    );
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/");
        return;
      }
      if (cancelado) return;
      setReady(true);
      await cargar();
      if (!cancelado) setLoading(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [router, cargar]);

  async function refrescar() {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
    mostrarToast("Lista actualizada");
  }

  // Guardado optimista: pintamos el cambio de inmediato y revertimos si falla.
  async function guardar(id: string, patch: Partial<Inscripcion>) {
    const anterior = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    const { error: updateError } = await supabase
      .from("inscripciones")
      .update(patch)
      .eq("id", id);

    if (updateError) {
      setRows(anterior);
      mostrarToast(
        updateError.message.includes("column")
          ? "Falta correr la migración 20260805000000 en Supabase."
          : "No se pudo guardar: " + updateError.message,
        "error"
      );
    }
  }

  function cambiarEstado(row: Row, estado: Estado) {
    const nuevo = row.estado === estado ? "pendiente" : estado;
    setFlash({ id: row.id, estado: nuevo });
    window.setTimeout(() => setFlash(null), 900);
    guardar(row.id, {
      estado: nuevo,
      verificado_at: nuevo === "pendiente" ? null : new Date().toISOString(),
    });
  }

  const opciones = useMemo(() => {
    const unicos = (sel: (r: Row) => string) =>
      Array.from(new Set(rows.map(sel).filter(Boolean))).sort();
    return {
      modalidades: unicos((r) => r.modalidad),
      categorias: unicos((r) => r.categoria),
      monedas: unicos((r) => r.moneda),
    };
  }, [rows]);

  // Un mismo documento o correo repetido casi siempre es un envío duplicado.
  const duplicados = useMemo(() => {
    const cuenta = (sel: (r: Row) => string) => {
      const mapa = new Map<string, number>();
      rows
        .filter((r) => !r.es_prueba)
        .forEach((r) => {
          const k = sel(r).trim().toLowerCase();
          if (k) mapa.set(k, (mapa.get(k) ?? 0) + 1);
        });
      return new Set(Array.from(mapa.entries()).filter(([, n]) => n > 1).map(([k]) => k));
    };
    return { documentos: cuenta((r) => r.documento), emails: cuenta((r) => r.email) };
  }, [rows]);

  const visibles = useMemo(() => rows.filter((r) => verPruebas || !r.es_prueba), [rows, verPruebas]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lista = visibles.filter((r) => {
      if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false;
      if (filtroModalidad !== "todas" && r.modalidad !== filtroModalidad) return false;
      if (filtroCategoria !== "todas" && r.categoria !== filtroCategoria) return false;
      if (filtroMoneda !== "todas" && r.moneda !== filtroMoneda) return false;
      if (!q) return true;
      return [r.nombre, r.email, r.documento, r.pais, r.institucion ?? "", r.notas ?? ""].some(
        (v) => v.toLowerCase().includes(q)
      );
    });

    const ordenada = [...lista];
    ordenada.sort((a, b) => {
      switch (orden) {
        case "antiguos":
          return a.created_at.localeCompare(b.created_at);
        case "monto":
          return b.total - a.total;
        case "nombre":
          return a.nombre.localeCompare(b.nombre, "es");
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return ordenada;
  }, [visibles, query, filtroEstado, filtroModalidad, filtroCategoria, filtroMoneda, orden]);

  const stats = useMemo(() => {
    const reales = rows.filter((r) => !r.es_prueba);
    const verificados = reales.filter((r) => r.estado === "verificado");
    const suma = (lista: Row[], moneda: string) =>
      lista.filter((r) => r.moneda === moneda).reduce((s, r) => s + r.total, 0);
    return {
      total: reales.length,
      verificados: verificados.length,
      pendientes: reales.filter((r) => r.estado === "pendiente").length,
      rechazados: reales.filter((r) => r.estado === "rechazado").length,
      confirmadoCop: suma(verificados, "COP"),
      confirmadoUsd: suma(verificados, "USD"),
    };
  }, [rows]);

  const countTotal = useCountUp(stats.total);
  const countVerificados = useCountUp(stats.verificados);
  const countPendientes = useCountUp(stats.pendientes);
  const countCop = useCountUp(stats.confirmadoCop);
  const countUsd = useCountUp(stats.confirmadoUsd);

  const pctVerificado = stats.total > 0 ? (stats.verificados / stats.total) * 100 : 0;

  useEffect(() => {
    const activo = segRef.current?.querySelector<HTMLButtonElement>("button.active");
    if (activo) setSegPos({ left: activo.offsetLeft, width: activo.offsetWidth });
  }, [filtroEstado, stats.pendientes, loading]);

  // El visor recorre solo las filas que tienen comprobante, en el orden visible.
  const paraVisor = useMemo(() => filtered.filter((r) => r.fullUrl), [filtered]);

  useEffect(() => {
    if (visorIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setVisorIdx(null);
      if (e.key === "ArrowRight") setVisorIdx((i) => (i === null ? i : Math.min(i + 1, paraVisor.length - 1)));
      if (e.key === "ArrowLeft") setVisorIdx((i) => (i === null ? i : Math.max(i - 1, 0)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visorIdx, paraVisor.length]);

  async function copiar(texto: string, etiqueta: string) {
    try {
      await navigator.clipboard.writeText(texto);
      mostrarToast(`${etiqueta} copiado`);
    } catch {
      mostrarToast("No se pudo copiar", "error");
    }
  }

  function exportar() {
    descargarCsv(
      `inscripciones-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((r) => ({
        Estado: r.estado,
        Recibido: new Date(r.created_at).toLocaleString("es-CO"),
        Nombre: r.nombre,
        Documento: r.documento,
        Correo: r.email,
        Telefono: r.telefono,
        Pais: r.pais,
        Institucion: r.institucion ?? "",
        Modalidad: r.modalidad,
        Categoria: r.categoria,
        Moneda: r.moneda,
        "Precio base": r.precio_base,
        "Descuento %": r.descuento_pct,
        "Codigo descuento": r.codigo_descuento ?? "",
        Total: r.total,
        Comprobante: r.comprobante_path ?? "",
        Notas: r.notas ?? "",
      }))
    );
    mostrarToast(`${filtered.length} inscripciones exportadas`);
  }

  function limpiarFiltros() {
    setQuery("");
    setFiltroEstado("todos");
    setFiltroModalidad("todas");
    setFiltroCategoria("todas");
    setFiltroMoneda("todas");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!ready) return null;

  const hayFiltros =
    Boolean(query) ||
    filtroEstado !== "todos" ||
    filtroModalidad !== "todas" ||
    filtroCategoria !== "todas" ||
    filtroMoneda !== "todas";

  const enVisor = visorIdx !== null ? paraVisor[visorIdx] : null;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">IC</div>
          <div>
            <span className="eyebrow">Panel interno</span>
            <h1>Inscripciones · I Congreso de Derecho Procesal</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="ghost" onClick={refrescar} disabled={refreshing}>
            <svg
              className={refreshing ? "spinning" : ""}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            Actualizar
          </button>
          <button className="ghost" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="container">
        {!loading && !error && (
          <section className="stats">
            <div className="stat-card accent">
              <div className="stat-label">Inscritos</div>
              <div className="stat-value">{Math.round(countTotal)}</div>
              <div className="stat-foot">sin contar pruebas</div>
            </div>
            <div className="stat-card ok">
              <div>
                <div className="stat-label">Verificados</div>
                <div className="stat-value">{Math.round(countVerificados)}</div>
                <div className="stat-foot">{Math.round(pctVerificado)}% del total</div>
              </div>
              <svg className="ring" width="46" height="46" viewBox="0 0 46 46">
                <circle className="ring-bg" cx="23" cy="23" r={RING_R} />
                <circle
                  className="ring-fg"
                  cx="23"
                  cy="23"
                  r={RING_R}
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - pctVerificado / 100)}
                />
              </svg>
            </div>
            <div className={`stat-card${stats.pendientes > 0 ? " warn" : ""}`}>
              <div className="stat-label">Por revisar</div>
              <div className="stat-value">{Math.round(countPendientes)}</div>
              <div className="stat-foot">
                {stats.rechazados > 0 ? `${stats.rechazados} rechazadas` : "sin rechazos"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Confirmado USD</div>
              <div className="stat-value">${countUsd.toFixed(2).replace(/\.00$/, "")}</div>
              <div className="stat-foot">solo pagos verificados</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Confirmado COP</div>
              <div className="stat-value">${Math.round(countCop).toLocaleString("es-CO")}</div>
              <div className="stat-foot">solo pagos verificados</div>
            </div>
          </section>
        )}

        <section className="controls">
          <div className="controls-top">
            <div className="search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                className={query ? "has-clear" : ""}
                type="text"
                placeholder="Buscar por nombre, correo, documento, país, nota..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="clear-btn" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="segmented" ref={segRef}>
              <span
                className="seg-indicator"
                style={{ transform: `translateX(${segPos.left}px)`, width: segPos.width }}
              />
              {(["todos", ...ESTADOS.map((e) => e.valor)] as const).map((valor) => (
                <button
                  key={valor}
                  className={filtroEstado === valor ? "active" : ""}
                  onClick={() => setFiltroEstado(valor as Estado | "todos")}
                >
                  {valor === "todos"
                    ? "Todos"
                    : valor === "pendiente"
                      ? `Pendientes${stats.pendientes ? ` (${stats.pendientes})` : ""}`
                      : valor === "verificado"
                        ? "Verificados"
                        : "Rechazados"}
                </button>
              ))}
            </div>

            <button className="ghost dark" onClick={exportar} disabled={filtered.length === 0}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />
              </svg>
              Exportar CSV
            </button>
          </div>

          <div className="controls-bottom">
            <select value={filtroModalidad} onChange={(e) => setFiltroModalidad(e.target.value)}>
              <option value="todas">Toda modalidad</option>
              {opciones.modalidades.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="todas">Toda categoría</option>
              {opciones.categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={filtroMoneda} onChange={(e) => setFiltroMoneda(e.target.value)}>
              <option value="todas">Toda moneda</option>
              {opciones.monedas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
              <option value="recientes">Más recientes</option>
              <option value="antiguos">Más antiguos</option>
              <option value="monto">Mayor monto</option>
              <option value="nombre">Nombre A–Z</option>
            </select>

            <label className="switch">
              <input type="checkbox" checked={verPruebas} onChange={(e) => setVerPruebas(e.target.checked)} />
              <span className="switch-track" />
              Ver pruebas
            </label>

            {hayFiltros && (
              <button className="link-btn" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}

            <span className="count">
              {filtered.length} de {visibles.length}
            </span>
          </div>
        </section>

        {error && <p className="error-msg">{error}</p>}

        {loading && (
          <div className="list">
            {[0, 1, 2, 3].map((i) => (
              <div className="skeleton-row" key={i}>
                <div className="skeleton-thumb" />
                <div className="skeleton-lines">
                  <div className="skeleton-line w-40" />
                  <div className="skeleton-line w-70" />
                  <div className="skeleton-line w-55" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            No hay inscripciones que coincidan.
          </div>
        )}

        {/* La key cambia con los filtros para que la lista vuelva a entrar
            escalonada; deliberadamente no incluye la búsqueda, que dispararía
            la animación en cada tecla. */}
        <div
          className="list"
          key={`${filtroEstado}|${filtroModalidad}|${filtroCategoria}|${filtroMoneda}|${orden}|${verPruebas}`}
        >
          {!loading &&
            filtered.map((r, idx) => {
              const ext = extensionDe(r.comprobante_path);
              const esImagen = IMAGE_EXT.has(ext);
              const idxVisor = paraVisor.findIndex((v) => v.id === r.id);
              const dupDoc = duplicados.documentos.has(r.documento.trim().toLowerCase());
              const dupMail = duplicados.emails.has(r.email.trim().toLowerCase());

              return (
                <article
                  className={`row estado-${r.estado}${r.es_prueba ? " es-prueba" : ""}${
                    flash?.id === r.id ? ` flash-${flash.estado}` : ""
                  }`}
                  key={r.id}
                  style={{ animationDelay: `${Math.min(idx, 12) * 32}ms` }}
                >
                  <div className="thumb" title={r.comprobante_path ?? undefined}>
                    {!r.comprobante_path ? (
                      <span className="thumb-empty">Sin comprobante</span>
                    ) : !r.fullUrl ? (
                      <span className="thumb-error">{r.comprobanteError}</span>
                    ) : esImagen && !brokenIds.has(r.id) ? (
                      <button
                        type="button"
                        className="thumb-btn"
                        onClick={() => setVisorIdx(idxVisor)}
                        aria-label={`Ver comprobante de ${r.nombre}`}
                      >
                        <img
                          src={r.thumbUrl ?? r.fullUrl}
                          alt=""
                          loading="lazy"
                          className={loadedIds.has(r.id) ? "loaded" : ""}
                          onLoad={() => setLoadedIds((p) => new Set(p).add(r.id))}
                          onError={() => setBrokenIds((p) => new Set(p).add(r.id))}
                        />
                        <span className="thumb-zoom">Ampliar</span>
                      </button>
                    ) : (
                      <button type="button" className="thumb-file" onClick={() => setVisorIdx(idxVisor)}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                        {ext === "pdf" ? "Ver PDF" : "Abrir"}
                      </button>
                    )}
                  </div>

                  <div className="info">
                    <div className="name-line">
                      <h2>{r.nombre}</h2>
                      <span className={`badge modalidad-${r.modalidad.toLowerCase()}`}>{r.modalidad}</span>
                      <span className="badge">{r.categoria}</span>
                      {r.es_prueba && <span className="badge prueba">Prueba</span>}
                      {(dupDoc || dupMail) && (
                        <span className="badge dup" title="Otra inscripción comparte este dato">
                          ⚠ Posible duplicado
                        </span>
                      )}
                    </div>

                    <div className="meta">
                      <span>
                        <b>Correo</b>{" "}
                        <button className="copyable" onClick={() => copiar(r.email, "Correo")} title="Copiar">
                          {r.email}
                        </button>
                      </span>
                      <span>
                        <b>Documento</b> {r.documento}
                      </span>
                      <span>
                        <b>Teléfono</b>{" "}
                        <button className="copyable" onClick={() => copiar(r.telefono, "Teléfono")} title="Copiar">
                          {r.telefono}
                        </button>
                      </span>
                      <span>
                        <b>País</b> {r.pais}
                      </span>
                      {r.institucion && (
                        <span>
                          <b>Institución</b> {r.institucion}
                        </span>
                      )}
                      <span>
                        <b>Total</b> <span className="total-value">{fmtMoney(r.total, r.moneda)}</span>
                      </span>
                      {r.codigo_descuento && (
                        <span>
                          <b>Código</b> {r.codigo_descuento} ({r.descuento_pct}%)
                        </span>
                      )}
                      <span>
                        <b>Recibido</b> {fmtFecha(r.created_at)}
                      </span>
                    </div>

                    {notaAbierta === r.id ? (
                      <textarea
                        className="nota-input"
                        autoFocus
                        defaultValue={r.notas ?? ""}
                        placeholder="Nota interna sobre esta inscripción..."
                        onBlur={(e) => {
                          const valor = e.target.value.trim();
                          if (valor !== (r.notas ?? "")) guardar(r.id, { notas: valor || null });
                          setNotaAbierta(null);
                        }}
                      />
                    ) : (
                      r.notas && (
                        <button className="nota-text" onClick={() => setNotaAbierta(r.id)}>
                          📝 {r.notas}
                        </button>
                      )
                    )}
                  </div>

                  <div className="acciones">
                    <span className={`pill ${r.estado}`}>
                      {r.estado === "verificado" ? "Verificado" : r.estado === "rechazado" ? "Rechazado" : "Pendiente"}
                    </span>

                    <div className="btn-group">
                      <button
                        className={`act ok${r.estado === "verificado" ? " on" : ""}`}
                        onClick={() => cambiarEstado(r, "verificado")}
                        title="Marcar como verificado"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <path d="m5 13 4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        className={`act no${r.estado === "rechazado" ? " on" : ""}`}
                        onClick={() => cambiarEstado(r, "rechazado")}
                        title="Marcar como rechazado"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="acciones-links">
                      <button className="link-btn sm" onClick={() => setNotaAbierta(r.id)}>
                        {r.notas ? "Editar nota" : "Nota"}
                      </button>
                      <button className="link-btn sm" onClick={() => guardar(r.id, { es_prueba: !r.es_prueba })}>
                        {r.es_prueba ? "No es prueba" : "Prueba"}
                      </button>
                    </div>

                    {r.verificado_at && (
                      <span className="verificado-at">
                        {new Date(r.verificado_at).toLocaleDateString("es-CO")}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
        </div>
      </main>

      {enVisor && (
        <div className="visor" onClick={() => setVisorIdx(null)}>
          <div className="visor-bar" onClick={(e) => e.stopPropagation()}>
            <div>
              <strong>{enVisor.nombre}</strong>
              <span>
                {fmtMoney(enVisor.total, enVisor.moneda)} · {enVisor.modalidad} · {enVisor.categoria}
              </span>
            </div>
            <div className="visor-bar-actions">
              <a href={enVisor.fullUrl ?? "#"} target="_blank" rel="noreferrer" className="ghost">
                Abrir original ↗
              </a>
              <button className="ghost" onClick={() => setVisorIdx(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>
          </div>

          <div className="visor-body" onClick={(e) => e.stopPropagation()}>
            {visorIdx !== null && visorIdx > 0 && (
              <button className="visor-nav prev" onClick={() => setVisorIdx(visorIdx - 1)} aria-label="Anterior">
                ‹
              </button>
            )}
            {IMAGE_EXT.has(extensionDe(enVisor.comprobante_path)) ? (
              <img key={enVisor.id} src={enVisor.fullUrl ?? ""} alt={`Comprobante de ${enVisor.nombre}`} />
            ) : (
              <iframe key={enVisor.id} src={enVisor.fullUrl ?? ""} title={`Comprobante de ${enVisor.nombre}`} />
            )}
            {visorIdx !== null && visorIdx < paraVisor.length - 1 && (
              <button className="visor-nav next" onClick={() => setVisorIdx(visorIdx + 1)} aria-label="Siguiente">
                ›
              </button>
            )}
          </div>

          <div className="visor-foot" onClick={(e) => e.stopPropagation()}>
            <button
              className="act-wide ok"
              onClick={() => {
                cambiarEstado(enVisor, "verificado");
                if (visorIdx !== null && visorIdx < paraVisor.length - 1) setVisorIdx(visorIdx + 1);
              }}
            >
              ✓ Verificar y seguir
            </button>
            <button className="act-wide no" onClick={() => cambiarEstado(enVisor, "rechazado")}>
              ✕ Rechazar
            </button>
            <span className="visor-count">
              {(visorIdx ?? 0) + 1} de {paraVisor.length} · ← → para navegar
            </span>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.tipo}`} key={toast.msg}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            {toast.tipo === "ok" ? <path d="m5 13 4 4L19 7" /> : <path d="M12 8v5M12 17h.01" />}
          </svg>
          {toast.msg}
          <span className="toast-bar" />
        </div>
      )}
    </>
  );
}
