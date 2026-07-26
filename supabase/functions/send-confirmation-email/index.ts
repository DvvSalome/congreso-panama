// Se dispara vía un Database Webhook de Supabase en cada INSERT sobre public.inscripciones.
// Envía un correo de confirmación de inscripción por SMTP directo a Gmail (contraseña de
// aplicación), sin librerías externas. La imagen del encabezado se referencia por URL (jsDelivr,
// que sirve archivos de GitHub sin protección anti-bot) — Gmail web NO resuelve imágenes
// incrustadas vía Content-ID/cid:, así que esa técnica no es viable aquí.

const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? SMTP_USER;
const LOGO_URL = "https://cdn.jsdelivr.net/gh/DvvSalome/congreso-panama@main/site/assets/img/hero-lockup.png";

function encodeHeaderUtf8(text: string): string {
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  const chunkSize = 60;
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += chunkSize) {
    chunks.push(`=?UTF-8?B?${b64.slice(i, i + chunkSize)}?=`);
  }
  return chunks.join("\r\n ");
}

function quotedPrintableEncode(input: string): string {
  const bytes = new TextEncoder().encode(input.replace(/\r\n/g, "\n"));
  let out = "";
  let lineLen = 0;
  const push = (s: string) => {
    if (lineLen + s.length > 75) {
      out += "=\r\n";
      lineLen = 0;
    }
    out += s;
    lineLen += s.length;
  };
  for (const b of bytes) {
    if (b === 0x0a) {
      out += "\r\n";
      lineLen = 0;
    } else if ((b >= 33 && b <= 126 && b !== 0x3d) || b === 0x20 || b === 0x09) {
      push(String.fromCharCode(b));
    } else {
      push("=" + b.toString(16).toUpperCase().padStart(2, "0"));
    }
  }
  return out;
}

async function readResponse(conn: Deno.TlsConn): Promise<string> {
  const buf = new Uint8Array(4096);
  const n = await conn.read(buf);
  if (n === null) throw new Error("Conexión SMTP cerrada inesperadamente");
  return new TextDecoder().decode(buf.subarray(0, n));
}

async function writeAll(conn: Deno.TlsConn, data: Uint8Array) {
  let written = 0;
  while (written < data.length) {
    written += await conn.write(data.subarray(written));
  }
}

async function writeLine(conn: Deno.TlsConn, line: string) {
  await writeAll(conn, new TextEncoder().encode(line + "\r\n"));
}

async function sendViaGmailSmtp(opts: {
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
  try {
    await readResponse(conn); // greeting
    await writeLine(conn, "EHLO localhost");
    await readResponse(conn);

    await writeLine(conn, "AUTH LOGIN");
    await readResponse(conn);
    await writeLine(conn, btoa(opts.user));
    await readResponse(conn);
    await writeLine(conn, btoa(opts.pass));
    const authResp = await readResponse(conn);
    if (!authResp.startsWith("235")) throw new Error("Autenticación SMTP falló: " + authResp);

    await writeLine(conn, `MAIL FROM:<${opts.user}>`);
    await readResponse(conn);
    await writeLine(conn, `RCPT TO:<${opts.to}>`);
    const rcptResp = await readResponse(conn);
    if (!rcptResp.startsWith("250")) throw new Error("RCPT TO falló: " + rcptResp);

    await writeLine(conn, "DATA");
    await readResponse(conn);

    const boundary = `alt-${crypto.randomUUID()}`;
    const textPart = [
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      quotedPrintableEncode(opts.text),
    ].join("\r\n");
    const htmlPart = [
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      quotedPrintableEncode(opts.html),
    ].join("\r\n");
    const body = [textPart, htmlPart, `--${boundary}--`].join("\r\n\r\n");

    const headers = [
      `From: ${opts.from}`,
      `To: ${opts.to}`,
      `Subject: ${encodeHeaderUtf8(opts.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@gmail.com>`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].join("\r\n");

    const bodyEncoded = body
      .split("\r\n")
      .map((line) => (line.startsWith(".") ? "." + line : line))
      .join("\r\n");

    await writeAll(conn, new TextEncoder().encode(headers + "\r\n\r\n" + bodyEncoded + "\r\n.\r\n"));
    const dataResp = await readResponse(conn);
    if (!dataResp.startsWith("250")) throw new Error("Envío DATA falló: " + dataResp);

    await writeLine(conn, "QUIT");
  } finally {
    conn.close();
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (WEBHOOK_SECRET) {
    const incoming = req.headers.get("x-webhook-secret");
    if (incoming !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "inscripciones") {
    return new Response("Ignored", { status: 200 });
  }

  const r = payload.record ?? {};
  const nombre = r.nombre ?? "";
  const email = r.email ?? "";

  if (!email) {
    return new Response("No email in record", { status: 200 });
  }

  if (!SMTP_USER || !SMTP_PASS) {
    console.error("SMTP_USER/SMTP_PASS no configurados");
    return new Response("Missing SMTP credentials", { status: 500 });
  }

  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${LOGO_URL}" alt="I Congreso Internacional de Derecho Procesal Contemporáneo" width="240" style="max-width: 240px; width: 100%; height: auto;" />
      </div>
      <p>Estimado(a) Dr./Dra. <strong>${nombre}</strong>:</p>
      <p>Reciba un cordial saludo.</p>
      <p>Le informamos que hemos recibido satisfactoriamente su solicitud de inscripción al <strong>I Congreso Internacional de Derecho Procesal Contemporáneo</strong>, que se llevará a cabo los días 25 y 26 de septiembre de 2026 en Ciudad de Panamá.</p>
      <p>Es importante tener en cuenta que el diligenciamiento del formulario no confirma la inscripción ni reserva el cupo. Debido a que los cupos son limitados, la participación quedará confirmada únicamente una vez recibamos y validemos el correspondiente comprobante de pago.</p>
      <p>Si ya realizó el pago, agradecemos remitir el comprobante a <a href="mailto:ciderechoprocesal@gmail.com">ciderechoprocesal@gmail.com</a> o al WhatsApp <a href="https://wa.me/573014303874">+57 301 430 3874</a>. Si este ya fue enviado, puede hacer caso omiso a este recordatorio; una vez validado, recibirá la confirmación oficial de su inscripción.</p>
      <p>Agradecemos su interés en participar en este importante encuentro académico internacional y esperamos contar con su valiosa presencia.</p>
      <p>Cordialmente,<br />Comité Organizador<br />I Congreso Internacional de Derecho Procesal Contemporáneo</p>
    </div>
  `;

  const text = [
    `Estimado(a) Dr./Dra. ${nombre}:`,
    "",
    "Reciba un cordial saludo.",
    "",
    "Le informamos que hemos recibido satisfactoriamente su solicitud de inscripción al I Congreso Internacional de Derecho Procesal Contemporáneo, que se llevará a cabo los días 25 y 26 de septiembre de 2026 en Ciudad de Panamá.",
    "",
    "Es importante tener en cuenta que el diligenciamiento del formulario no confirma la inscripción ni reserva el cupo. Debido a que los cupos son limitados, la participación quedará confirmada únicamente una vez recibamos y validemos el correspondiente comprobante de pago.",
    "",
    "Si ya realizó el pago, agradecemos remitir el comprobante a ciderechoprocesal@gmail.com o al WhatsApp +57 301 430 3874. Si este ya fue enviado, puede hacer caso omiso a este recordatorio; una vez validado, recibirá la confirmación oficial de su inscripción.",
    "",
    "Agradecemos su interés en participar en este importante encuentro académico internacional y esperamos contar con su valiosa presencia.",
    "",
    "Cordialmente,",
    "Comité Organizador",
    "I Congreso Internacional de Derecho Procesal Contemporáneo",
  ].join("\n");

  try {
    await sendViaGmailSmtp({
      user: SMTP_USER,
      pass: SMTP_PASS,
      from: FROM_EMAIL,
      to: email,
      subject: "I Congreso Internacional de Derecho Procesal Contemporáneo | Recepción de su solicitud de inscripción",
      text,
      html,
    });
  } catch (err) {
    console.error("Error enviando correo vía Gmail SMTP:", err);
    return new Response(String(err), { status: 502 });
  }

  return new Response("OK", { status: 200 });
});
