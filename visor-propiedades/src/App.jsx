import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";

// ─── GOOGLE SHEETS CONFIG ─────────────────────────────────────────────────────
const SHEET_ID = "1Z1qYQ2ykQG2Kq1hO9K2PdjES_OvOR2d1yKPv7MdyAa4";
const csvUrl = (name) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;

const SHEET_NAMES = {
  aloj:   "ALOJAMIENTOS ACTIVOS",
  router: " ROUTER ",
  camas:  "CAMAS-MASCOTAS-WIFI-CAFETERAS",
  tlf:    "TLF. CONSERJ Y MANTENIM",
  llaves: "OROPESA- TORREBLANCA  LLAVES ",
};

// ─── PARSERS ──────────────────────────────────────────────────────────────────
const g  = (row, i) => (i < row.length && row[i] !== "" ? row[i].trim() : null);

function parseAlojamientos(rows) {
  return rows.slice(1).filter(r => g(r, 0)).map(r => ({
    propiedad:       g(r, 0),
    encargado:       g(r, 1),
    empleado:        g(r, 2),
    ref:             g(r, 3),
    capacidad:       g(r, 22),
    dir_alojamiento: g(r, 25),
    wifi:            g(r, 26),
    parking:         g(r, 27),
    poblacion:       g(r, 29),
    observaciones:   g(r, 31),
  }));
}

function parseCamas(rows) {
  const map = {};
  rows.slice(3).filter(r => g(r, 2)).forEach(r => {
    const raw = g(r, 2) || "";
    const key = raw.replace("*", "").padStart(3, "0");
    map[key] = {
      mascotas:        (g(r, 4) || "").toUpperCase() || null,
      wifi:            (g(r, 5) || "").toUpperCase() || null,
      wifi_usuario:    g(r, 6),
      wifi_clave:      g(r, 7),
      cafetera_drive:  g(r, 8),
      cafetera_airbnb: g(r, 10),
    };
  });
  return map;
}

function parseRouter(rows) {
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter(r => g(r, 0)).map(r => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h.trim()] = g(r, i); });
    return obj;
  });
}

function parseTlf(rows) {
  return rows.slice(1).filter(r => g(r, 0)).map(r => ({
    propiedad:     g(r, 0),
    ref:           g(r, 1),
    conserje:      g(r, 2),
    tlf_conserje:  g(r, 3),
    admin_fincas:  g(r, 4),
    tlf_admin:     g(r, 5),
    horario:       g(r, 9),
    num_apto:      g(r, 10),
    piscina:       g(r, 12),
    observaciones: g(r, 13),
  }));
}

function parseLlaves(rows) {
  return rows.slice(2)
    .filter(r => g(r, 0) && g(r, 0) !== "APARTAMENTO")
    .map(r => ({
      apartamento:   g(r, 0),
      ref:           g(r, 1),
      direccion:     g(r, 2),
      parking:       g(r, 3),
      llave:         g(r, 4),
      empleado:      g(r, 5),
      total:         g(r, 6),
      observaciones: g(r, 10),
    }));
}

async function fetchSheet(name) {
  const res = await fetch(csvUrl(name));
  if (!res.ok) throw new Error(`Error ${res.status} al cargar "${name}"`);
  const text = await res.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, { complete: r => resolve(r.data), error: reject });
  });
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
const encargadoColor = {
  CRISTOBAL: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  CATI:      { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  MARIA:     { bg: "#dcfce7", text: "#166534", border: "#86efac" },
};

const Badge = ({ value, type }) => {
  if (!value) return <span style={{ color: "#9ca3af", fontSize: "12px" }}>—</span>;
  const v = value.trim().toUpperCase();
  if (type === "encargado") {
    const c = encargadoColor[v] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
    return <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: "20px", padding: "2px 10px", fontSize: "12px", fontWeight: 700 }}>{value.trim()}</span>;
  }
  if (type === "yesno") {
    const yes = v === "SI";
    return <span style={{ background: yes ? "#dcfce7" : "#fee2e2", color: yes ? "#166534" : "#991b1b", borderRadius: "20px", padding: "2px 10px", fontSize: "12px", fontWeight: 700 }}>{yes ? "✓ SÍ" : "✗ NO"}</span>;
  }
  if (type === "router") {
    const m = { "EN USO": { bg: "#d1fae5", text: "#065f46" }, "LIBRE": { bg: "#fef3c7", text: "#92400e" }, "OTRO": { bg: "#e0e7ff", text: "#3730a3" } };
    const c = m[v] || { bg: "#f3f4f6", text: "#374151" };
    return <span style={{ background: c.bg, color: c.text, borderRadius: "20px", padding: "2px 10px", fontSize: "12px", fontWeight: 700 }}>{value}</span>;
  }
  return <span>{value}</span>;
};

function useSearch(items, fields) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const lo = q.toLowerCase();
    return items.filter(item => fields.some(f => item[f] && String(item[f]).toLowerCase().includes(lo)));
  }, [items, q, fields]);
  return [q, setQ, filtered];
}

const SearchBox = ({ value, onChange, placeholder }) => (
  <div style={{ position: "relative", marginBottom: "16px" }}>
    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", boxSizing: "border-box", paddingLeft: "38px", paddingRight: "34px", paddingTop: "10px", paddingBottom: "10px", borderRadius: "10px", border: "2px solid #e5e7eb", fontSize: "14px", outline: "none", background: "#fafafa", fontFamily: "inherit" }} />
    {value && <button onClick={() => onChange("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#9ca3af" }}>✕</button>}
  </div>
);

const EmptyState = () => (
  <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
    <div style={{ fontSize: "40px", marginBottom: "8px" }}>🔎</div>
    <div style={{ fontSize: "15px" }}>Sin resultados</div>
  </div>
);

const cafColors = { "Italiana": "#b45309", "Dolce Gusto": "#7c3aed", "Nespresso": "#991b1b", "Filtro": "#065f46", "Espresso": "#92400e", "Goteo": "#1e40af", "Meilitta": "#0e7490" };
const getCafColor = s => { if (!s) return "#6b7280"; const k = Object.keys(cafColors).find(k => s.toLowerCase().includes(k.toLowerCase())); return k ? cafColors[k] : "#374151"; };

// ─── TAB ALOJAMIENTOS ─────────────────────────────────────────────────────────
function TabAlojamientos({ data, camasMap }) {
  const [q, setQ, filtered] = useSearch(data, ["propiedad", "encargado", "empleado", "dir_alojamiento", "poblacion", "ref"]);
  const [filtroEnc, setFiltroEnc] = useState("TODOS");
  const [filtroEmp, setFiltroEmp] = useState("TODOS");

  const empleados = useMemo(() => {
    const uniq = [...new Set(data.map(a => a.empleado?.trim()).filter(Boolean))].sort();
    return ["TODOS", ...uniq];
  }, [data]);

  const final = useMemo(() => filtered.filter(a => {
    if (filtroEnc !== "TODOS" && (a.encargado||"").trim().toUpperCase() !== filtroEnc) return false;
    if (filtroEmp !== "TODOS") {
      if (filtroEmp === "SIN ASIGNAR") return !a.empleado;
      if ((a.empleado||"").trim() !== filtroEmp) return false;
    }
    return true;
  }), [filtered, filtroEnc, filtroEmp]);

  const encBtns = [
    { key: "TODOS",     label: "Todos",     activeBg: "#1e3a5f",                     activeColor: "white", inBg: "#f3f4f6",                      inColor: "#374151" },
    { key: "CRISTOBAL", label: "Cristóbal", activeBg: encargadoColor.CRISTOBAL.text, activeColor: "white", inBg: encargadoColor.CRISTOBAL.bg,    inColor: encargadoColor.CRISTOBAL.text },
    { key: "CATI",      label: "Cati",      activeBg: encargadoColor.CATI.text,      activeColor: "white", inBg: encargadoColor.CATI.bg,         inColor: encargadoColor.CATI.text },
    { key: "MARIA",     label: "María",     activeBg: encargadoColor.MARIA.text,     activeColor: "white", inBg: encargadoColor.MARIA.bg,        inColor: encargadoColor.MARIA.text },
  ];

  // Colores para empleados de limpieza
  const empColorList = ["#f59e0b","#10b981","#3b82f6","#ec4899","#8b5cf6","#ef4444","#14b8a6","#f97316","#6366f1"];
  const empColorMap = useMemo(() => {
    const map = {};
    empleados.filter(e => e !== "TODOS").forEach((e, i) => { map[e] = empColorList[i % empColorList.length]; });
    return map;
  }, [empleados]);

  const YN = ({ value, label }) => {
    if (!value) return null;
    const yes = value.toUpperCase() === "SI";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "52px" }}>
        <span style={{ fontSize: "18px", lineHeight: 1 }}>{yes ? "✅" : "❌"}</span>
        <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: 600, marginTop: "2px" }}>{label}</span>
      </div>
    );
  };

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar por nombre, dirección, población, ref..." />

      {/* Filtro encargado */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, minWidth: "90px" }}>🗂 Encargado:</span>
        {encBtns.map(b => {
          const active = filtroEnc === b.key;
          return <button key={b.key} onClick={() => setFiltroEnc(b.key)} style={{ padding: "5px 13px", borderRadius: "20px", cursor: "pointer", fontWeight: 700, fontSize: "12px", border: "2px solid transparent", background: active ? b.activeBg : b.inBg, color: active ? b.activeColor : b.inColor, transition: "all 0.15s" }}>{b.label}</button>;
        })}
      </div>

      {/* Filtro empleado limpieza */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, minWidth: "90px" }}>🧹 Limpieza:</span>
        {["TODOS", "SIN ASIGNAR", ...empleados.filter(e => e !== "TODOS")].map(emp => {
          const active = filtroEmp === emp;
          const col = emp === "TODOS" ? "#374151" : emp === "SIN ASIGNAR" ? "#9ca3af" : (empColorMap[emp] || "#6b7280");
          const activeBg = emp === "TODOS" ? "#1e3a5f" : col;
          return (
            <button key={emp} onClick={() => setFiltroEmp(emp)} style={{
              padding: "5px 13px", borderRadius: "20px", cursor: "pointer", fontWeight: 700, fontSize: "12px",
              border: active ? "2px solid transparent" : `2px solid ${col}44`,
              background: active ? activeBg : col + "15",
              color: active ? "white" : col,
              transition: "all 0.15s"
            }}>{emp === "SIN ASIGNAR" ? "Sin asignar" : emp}</button>
          );
        })}
      </div>

      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>{final.length} alojamientos</div>
      {final.length === 0 ? <EmptyState /> : (
        <div style={{ display: "grid", gap: "12px" }}>
          {final.map((a, i) => {
            const refKey = String(a.ref || "").padStart(3, "0");
            const extras = camasMap[refKey] || {};
            return (
              <div key={i} style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ background: "#1e3a5f", color: "white", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" }}>*{refKey}</span>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "#111827", flex: 1 }}>{a.propiedad}</span>
                </div>
                {a.dir_alojamiento && <div style={{ fontSize: "13px", color: "#4b5563", marginBottom: "10px" }}>📍 {a.dir_alojamiento}{a.poblacion ? " — " : ""}<strong>{a.poblacion}</strong></div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                  {[
                    { label: "ENCARGADO",  render: <Badge value={a.encargado} type="encargado" /> },
                    { label: "LIMPIEZA",   render: <span style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>{a.empleado || <span style={{ color: "#d1d5db" }}>—</span>}</span> },
                    { label: "CAPACIDAD",  render: <span style={{ fontSize: "13px", fontWeight: 700 }}>{a.capacidad ? `👥 ${a.capacidad}` : "—"}</span> },
                    { label: "PARKING",    render: <span style={{ fontSize: "12px", color: "#374151" }}>{a.parking || "—"}</span> },
                  ].map(({ label, render }) => (
                    <div key={label} style={{ minWidth: "100px" }}>
                      <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 700, marginBottom: "3px" }}>{label}</div>
                      {render}
                    </div>
                  ))}
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
                  <YN value={extras.mascotas} label="MASCOTAS" />
                  <YN value={extras.wifi}     label="WiFi" />
                  {(extras.cafetera_drive || extras.cafetera_airbnb) && <div style={{ width: "1px", background: "#e2e8f0", alignSelf: "stretch", minHeight: "30px" }} />}
                  {extras.cafetera_drive && (
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.5px", marginBottom: "3px" }}>☕ INFO.DRIVE</div>
                      <span style={{ background: getCafColor(extras.cafetera_drive)+"18", color: getCafColor(extras.cafetera_drive), border: `1px solid ${getCafColor(extras.cafetera_drive)}44`, borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: 700 }}>{extras.cafetera_drive}</span>
                    </div>
                  )}
                  {extras.cafetera_airbnb && (
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.5px", marginBottom: "3px" }}>☕ AIRBNB</div>
                      <span style={{ background: getCafColor(extras.cafetera_airbnb)+"18", color: getCafColor(extras.cafetera_airbnb), border: `1px solid ${getCafColor(extras.cafetera_airbnb)}44`, borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: 700 }}>{extras.cafetera_airbnb}</span>
                    </div>
                  )}
                  {extras.wifi === "SI" && (
                    <>
                      <div>
                        <div style={{ fontSize: "9px", fontWeight: 800, color: "#3b82f6", letterSpacing: "0.5px", marginBottom: "3px" }}>👤 USUARIO WiFi</div>
                        <span style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>{extras.wifi_usuario || "—"}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: "9px", fontWeight: 800, color: "#3b82f6", letterSpacing: "0.5px", marginBottom: "3px" }}>🔑 CLAVE WiFi</div>
                        <span style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>{extras.wifi_clave || "—"}</span>
                      </div>
                    </>
                  )}
                  {!extras.mascotas && !extras.cafetera_drive && <span style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>Sin datos de equipamiento</span>}
                </div>
                {a.observaciones && <div style={{ marginTop: "10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#92400e" }}>💬 {a.observaciones}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TAB ROUTER ───────────────────────────────────────────────────────────────
function TabRouter({ data }) {
  const [q, setQ, filtered] = useSearch(data, ["PROPIEDAD", "LLEVA", "NUMERO", "SIM", "OBSERVACIONES"]);
  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar por propiedad, empleado, número, SIM..." />
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>{filtered.length} routers</div>
      {filtered.length === 0 ? <EmptyState /> : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filtered.map((r, i) => (
            <div key={i} style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px" }}>📶 {r.PROPIEDAD || "—"}</span>
                <Badge value={r.ROUTER} type="router" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px" }}>
                {[["📅 FECHA", r.FECHA], ["👤 LLEVA", r.LLEVA], ["📱 NÚMERO", r.NUMERO], ["💿 SIM", r.SIM]].map(([lbl, val]) => (
                  <div key={lbl} style={{ background: "#f9fafb", borderRadius: "8px", padding: "8px 10px" }}>
                    <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 700, marginBottom: "2px" }}>{lbl}</div>
                    <div style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>{val || <span style={{ color: "#d1d5db" }}>—</span>}</div>
                  </div>
                ))}
              </div>
              {r.OBSERVACIONES && <div style={{ marginTop: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "7px", padding: "7px 10px", fontSize: "12px", color: "#1e40af" }}>💬 {r.OBSERVACIONES}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB CAMAS ────────────────────────────────────────────────────────────────
function TabCamas({ camasMap }) {
  const items = useMemo(() => Object.entries(camasMap).map(([ref, v]) => ({ ref, ...v })), [camasMap]);
  const [q, setQ, filtered] = useSearch(items, ["ref", "cafetera_drive", "cafetera_airbnb"]);
  const [filtroM, setFiltroM] = useState("TODOS");
  const [filtroW, setFiltroW] = useState("TODOS");
  const final = useMemo(() => filtered.filter(c => {
    if (filtroM !== "TODOS" && (c.mascotas||"") !== filtroM) return false;
    if (filtroW !== "TODOS" && (c.wifi||"") !== filtroW) return false;
    return true;
  }), [filtered, filtroM, filtroW]);

  const Btn = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: "20px", border: active ? "2px solid #3b82f6" : "2px solid #e5e7eb", background: active ? "#eff6ff" : "white", color: active ? "#1d4ed8" : "#6b7280", fontWeight: active ? 700 : 500, fontSize: "12px", cursor: "pointer" }}>{label}</button>
  );

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar ref, tipo de cafetera..." />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "#9ca3af", alignSelf: "center" }}>🐾 Mascotas:</span>
        {["TODOS","SI","NO"].map(v => <Btn key={v} label={v} active={filtroM===v} onClick={() => setFiltroM(v)} />)}
        <span style={{ fontSize: "12px", color: "#9ca3af", alignSelf: "center", marginLeft: "8px" }}>📶 WiFi:</span>
        {["TODOS","SI","NO"].map(v => <Btn key={v} label={v} active={filtroW===v} onClick={() => setFiltroW(v)} />)}
      </div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>{final.length} propiedades</div>
      {final.length === 0 ? <EmptyState /> : (
        <div style={{ display: "grid", gap: "10px" }}>
          {final.map((c, i) => (
            <div key={i} style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                <span style={{ background: "#1e3a5f", color: "white", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>*{c.ref}</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>Mascotas</span><Badge value={c.mascotas} type="yesno" />
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>WiFi</span><Badge value={c.wifi} type="yesno" />
                </div>
              </div>
              {c.wifi === "SI" && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "10px 12px", marginBottom: "8px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontSize: "11px", color: "#1e40af", fontWeight: 800 }}>📶 WiFi</div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#3b82f6", fontWeight: 700, marginBottom: "2px" }}>USUARIO</div>
                    <div style={{ fontSize: "13px", color: "#1e3a8a", fontWeight: 700, fontFamily: "monospace", background: "white", padding: "2px 10px", borderRadius: "6px", border: "1px solid #bfdbfe", minWidth: "80px" }}>{c.wifi_usuario || <span style={{color:"#9ca3af"}}>—</span>}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#3b82f6", fontWeight: 700, marginBottom: "2px" }}>CONTRASEÑA</div>
                    <div style={{ fontSize: "13px", color: "#1e3a8a", fontWeight: 700, fontFamily: "monospace", background: "white", padding: "2px 10px", borderRadius: "6px", border: "1px solid #bfdbfe", minWidth: "80px" }}>{c.wifi_clave || <span style={{color:"#9ca3af"}}>—</span>}</div>
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ background: "#fef9ef", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "10px", color: "#d97706", fontWeight: 700, marginBottom: "2px" }}>☕ INFO.DRIVE</div>
                  <div style={{ fontSize: "13px", color: "#92400e", fontWeight: 600 }}>{c.cafetera_drive || "—"}</div>
                </div>
                <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, marginBottom: "2px" }}>☕ AIRBNB</div>
                  <div style={{ fontSize: "13px", color: "#166534", fontWeight: 600 }}>{c.cafetera_airbnb || "—"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB TLF ──────────────────────────────────────────────────────────────────
function TabTlf({ data }) {
  const [q, setQ, filtered] = useSearch(data, ["propiedad", "ref", "conserje", "tlf_conserje", "admin_fincas", "horario", "observaciones"]);
  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar por propiedad, conserje, administración..." />
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>{filtered.length} propiedades</div>
      {filtered.length === 0 ? <EmptyState /> : (
        <div style={{ display: "grid", gap: "12px" }}>
          {filtered.map((t, i) => (
            <div key={i} style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                {t.ref && <span style={{ background: "#1e3a5f", color: "white", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>{t.ref}</span>}
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>{t.propiedad}</span>
                {t.num_apto && <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}>Apto {t.num_apto}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px", marginBottom: "8px" }}>
                <div style={{ background: "#fdf2f8", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "10px", color: "#9d174d", fontWeight: 700, marginBottom: "2px" }}>🔑 CONSERJE</div>
                  <div style={{ fontSize: "13px", color: "#831843", fontWeight: 600 }}>{t.conserje || "—"}</div>
                  {t.tlf_conserje && <div style={{ fontSize: "12px", color: "#9d174d", marginTop: "2px" }}>📞 {t.tlf_conserje}</div>}
                </div>
                <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "10px", color: "#1e40af", fontWeight: 700, marginBottom: "2px" }}>🏢 ADMINISTRACIÓN</div>
                  <div style={{ fontSize: "13px", color: "#1e3a8a", fontWeight: 600 }}>{t.admin_fincas || "—"}</div>
                  {t.tlf_admin && <div style={{ fontSize: "12px", color: "#1e40af", marginTop: "2px" }}>📞 {t.tlf_admin}</div>}
                </div>
                {t.piscina && (
                  <div style={{ background: "#ecfeff", borderRadius: "8px", padding: "8px 10px" }}>
                    <div style={{ fontSize: "10px", color: "#0e7490", fontWeight: 700, marginBottom: "2px" }}>🏊 PISCINA</div>
                    <div style={{ fontSize: "12px", color: "#164e63" }}>{t.piscina}</div>
                  </div>
                )}
              </div>
              {t.horario && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "7px 10px", fontSize: "12px", color: "#166534", marginBottom: "6px" }}>🕐 <strong>Horario:</strong> {t.horario}</div>}
              {t.observaciones && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "7px 10px", fontSize: "12px", color: "#92400e" }}>💬 {t.observaciones}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB LLAVES ───────────────────────────────────────────────────────────────
function TabLlaves({ data }) {
  const [q, setQ, filtered] = useSearch(data, ["apartamento", "ref", "direccion", "empleado", "llave", "observaciones"]);
  const [filtroEmp, setFiltroEmp] = useState("TODOS");
  const empleados = useMemo(() => ["TODOS", ...new Set(data.map(l => l.empleado?.trim()).filter(Boolean))], [data]);
  const final = useMemo(() => filtered.filter(l => filtroEmp === "TODOS" || (l.empleado||"").trim() === filtroEmp), [filtered, filtroEmp]);
  const empColors = { Gil: "#3b82f6", Rosmery: "#10b981", Williams: "#f59e0b", Nati: "#ec4899", PTE: "#9ca3af" };
  const ec = emp => empColors[emp?.trim()] || "#6b7280";

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar apartamento, dirección, empleado, tipo de llave..." />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "#9ca3af", alignSelf: "center" }}>👤 Empleado:</span>
        {empleados.map(emp => {
          const col = ec(emp); const active = filtroEmp === emp;
          return <button key={emp} onClick={() => setFiltroEmp(emp)} style={{ padding: "4px 10px", borderRadius: "20px", border: active ? `2px solid ${col}` : "2px solid #e5e7eb", background: active ? col+"22" : "white", color: active ? col : "#6b7280", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>{emp}</button>;
        })}
      </div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>{final.length} propiedades</div>
      {final.length === 0 ? <EmptyState /> : (
        <div style={{ display: "grid", gap: "10px" }}>
          {final.map((l, i) => {
            const col = ec(l.empleado);
            return (
              <div key={i} style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", borderLeft: `4px solid ${col}`, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                  <div>{l.ref && <span style={{ background: "#1e3a5f", color: "white", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700, marginRight: "8px" }}>{l.ref}</span>}<span style={{ fontWeight: 700, fontSize: "14px" }}>{l.apartamento}</span></div>
                  {l.empleado && <span style={{ background: col+"22", color: col, border: `1px solid ${col}55`, borderRadius: "20px", padding: "2px 10px", fontSize: "12px", fontWeight: 700 }}>👤 {l.empleado.trim()}</span>}
                </div>
                {l.direccion && <div style={{ fontSize: "12px", color: "#4b5563", marginBottom: "8px" }}>📍 {l.direccion}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                  {[["🗝 LLAVE", l.llave, "#fef9ef", "#d97706", "#92400e"], ["🅿 PARKING", l.parking, "#f0fdf4", "#16a34a", "#166534"], ["🔢 TOTAL", l.total, "#f5f3ff", "#7c3aed", "#5b21b6"]].map(([lbl, val, bg, hdr, txt]) => (
                    <div key={lbl} style={{ background: bg, borderRadius: "8px", padding: "7px 10px" }}>
                      <div style={{ fontSize: "10px", color: hdr, fontWeight: 700, marginBottom: "2px" }}>{lbl}</div>
                      <div style={{ fontSize: "12px", color: txt }}>{val || "—"}</div>
                    </div>
                  ))}
                </div>
                {l.observaciones && <div style={{ marginTop: "8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "7px", padding: "7px 10px", fontSize: "12px", color: "#92400e" }}>💬 {l.observaciones}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("aloj");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [db, setDb] = useState({ aloj: [], camasMap: {}, router: [], tlf: [], llaves: [] });
  const [lastLoaded, setLastLoaded] = useState(null);

  const loadData = async () => {
    setStatus("loading");
    setError(null);
    try {
      const [rawAloj, rawCamas, rawRouter, rawTlf, rawLlaves] = await Promise.all([
        fetchSheet(SHEET_NAMES.aloj),
        fetchSheet(SHEET_NAMES.camas),
        fetchSheet(SHEET_NAMES.router),
        fetchSheet(SHEET_NAMES.tlf),
        fetchSheet(SHEET_NAMES.llaves),
      ]);
      setDb({
        aloj:     parseAlojamientos(rawAloj),
        camasMap: parseCamas(rawCamas),
        router:   parseRouter(rawRouter),
        tlf:      parseTlf(rawTlf),
        llaves:   parseLlaves(rawLlaves),
      });
      setLastLoaded(new Date());
      setStatus("ok");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  useEffect(() => { loadData(); }, []);

  const TABS = [
    { id: "aloj",   label: "🏠 Alojamientos",  count: db.aloj.length },
    { id: "router", label: "📶 Router",          count: db.router.length },
    { id: "camas",  label: "🛏 Camas & Extras",  count: Object.keys(db.camasMap).length },
    { id: "tlf",    label: "📞 Conserjería",      count: db.tlf.length },
    { id: "llaves", label: "🗝 Llaves Oro-Torre", count: db.llaves.length },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f1f5f9", minHeight: "100vh", paddingBottom: "40px" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1e5a8a 100%)", padding: "20px 20px 0", color: "white" }}>
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2px", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <div style={{ fontSize: "11px", opacity: 0.65, letterSpacing: "1px", textTransform: "uppercase" }}>Panel de Gestión · En vivo desde Google Sheets</div>
              <h1 style={{ margin: "2px 0 0", fontSize: "21px", fontWeight: 800 }}>🏡 Propiedades Turísticas</h1>
            </div>
            <button onClick={loadData} disabled={status === "loading"}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: "8px", padding: "6px 14px", cursor: status === "loading" ? "wait" : "pointer", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "inline-block", animation: status === "loading" ? "spin 1s linear infinite" : "none" }}>🔄</span>
              {status === "loading" ? "Cargando..." : "Actualizar"}
            </button>
          </div>
          {lastLoaded && <div style={{ fontSize: "11px", opacity: 0.6, marginBottom: "14px", marginTop: "2px" }}>Actualizado: {lastLoaded.toLocaleTimeString("es-ES")}</div>}
          <div style={{ display: "flex", gap: "3px", overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 13px", background: tab === t.id ? "white" : "transparent", color: tab === t.id ? "#1e3a5f" : "rgba(255,255,255,0.75)", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: tab === t.id ? 700 : 500, fontSize: "13px", whiteSpace: "nowrap" }}>
                <div>{t.label}</div>
                {status === "ok" && <div style={{ fontSize: "10px", opacity: 0.65, fontWeight: 400 }}>{t.count} registros</div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "920px", margin: "0 auto", padding: "20px 16px" }}>
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "70px 20px", color: "#6b7280" }}>
            <div style={{ fontSize: "40px", animation: "spin 1.2s linear infinite", display: "inline-block", marginBottom: "14px" }}>🔄</div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>Conectando con Google Sheets...</div>
            <div style={{ fontSize: "13px", opacity: 0.7 }}>Cargando las 5 hojas del documento</div>
          </div>
        )}
        {status === "error" && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "24px", color: "#991b1b", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>Error al conectar con Google Sheets</div>
            <div style={{ fontSize: "13px", marginBottom: "12px" }}>{error}</div>
            <div style={{ fontSize: "12px", background: "#fee2e2", borderRadius: "8px", padding: "10px", marginBottom: "16px", color: "#7f1d1d" }}>
              💡 Asegúrate de que el Google Sheet está configurado como <strong>«Cualquier persona con el enlace puede ver»</strong>
            </div>
            <button onClick={loadData} style={{ background: "#991b1b", color: "white", border: "none", borderRadius: "8px", padding: "8px 22px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>Reintentar</button>
          </div>
        )}
        {status === "ok" && (
          <>
            {tab === "aloj"   && <TabAlojamientos data={db.aloj}     camasMap={db.camasMap} />}
            {tab === "router" && <TabRouter        data={db.router} />}
            {tab === "camas"  && <TabCamas         camasMap={db.camasMap} />}
            {tab === "tlf"    && <TabTlf           data={db.tlf} />}
            {tab === "llaves" && <TabLlaves        data={db.llaves} />}
          </>
        )}
      </div>
    </div>
  );
}
