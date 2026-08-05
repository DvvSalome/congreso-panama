export type Estado = "pendiente" | "verificado" | "rechazado";

export type Inscripcion = {
  id: string;
  created_at: string;
  nombre: string;
  documento: string;
  email: string;
  telefono: string;
  pais: string;
  institucion: string | null;
  modalidad: string;
  categoria: string;
  moneda: string;
  precio_base: number;
  codigo_descuento: string | null;
  descuento_pct: number;
  total: number;
  comprobante_path: string | null;
  // Añadidos por 20260805000000_verificacion_y_seguridad.sql. Son opcionales
  // para que el panel siga funcionando (en modo solo lectura) si todavía no
  // se corrió la migración.
  estado?: Estado;
  verificado_at?: string | null;
  notas?: string | null;
  es_prueba?: boolean;
};
