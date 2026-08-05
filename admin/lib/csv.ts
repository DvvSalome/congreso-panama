// Exportación a CSV pensada para abrirse en Excel en español:
// separador `;` y BOM UTF-8 para que las tildes y las ñ no se rompan.
export function descargarCsv(nombreArchivo: string, filas: Record<string, unknown>[]) {
  if (filas.length === 0) return;

  const columnas = Object.keys(filas[0]);
  const escapar = (valor: unknown) => {
    const s = valor === null || valor === undefined ? "" : String(valor);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    columnas.join(";"),
    ...filas.map((fila) => columnas.map((c) => escapar(fila[c])).join(";")),
  ].join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
