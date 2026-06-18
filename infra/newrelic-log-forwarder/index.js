/**
 * Forwarder Cloud Logging -> New Relic Log API.
 *
 * Gatilho: mensagem Pub/Sub publicada pelo Log Router sink (1 LogEntry por mensagem).
 * Saida: POST no New Relic Log API (https://docs.newrelic.com/docs/logs/log-api/introduction-log-api/).
 *
 * Mantem a app vendor-neutral: nenhuma dependencia de New Relic vive no backend Spring.
 * O backend so emite JSON em stdout; este forwarder e' a unica peca que conhece o vendor,
 * exatamente como manda docs/OBSERVABILITY.md ("coletor e' decisao de deploy-time").
 *
 * Envs:
 *   NR_LICENSE_KEY  (obrigatorio) - ingest/license key. Vem do Secret Manager via --set-secrets.
 *   NR_LOG_API      (opcional)    - endpoint. Default US. Para EU: https://log-api.eu.newrelic.com/log/v1
 */
const https = require('https');
const { URL } = require('url');

const LICENSE_KEY = process.env.NR_LICENSE_KEY;
const LOG_API = process.env.NR_LOG_API || 'https://log-api.newrelic.com/log/v1';

if (!LICENSE_KEY) {
  // Falha cedo no cold start: sem key nao ha o que fazer.
  throw new Error('NR_LICENSE_KEY ausente — configure via --set-secrets newrelic-license-key.');
}

const endpoint = new URL(LOG_API);

// Campos do evento de log (framework) que ficam no TOPO do registro NR. Todo o resto do
// jsonPayload (nosso MDC enriquecido) vai pra `custom` — a NR achata em `custom.*`,
// separando nitidamente "dado nosso" de "basico da aplicacao". Allowlist inversa:
// manutencao zero, MDC key nova cai em custom automaticamente.
const FRAMEWORK_KEYS = new Set([
  '@timestamp', '@version', 'timestamp', 'message', 'level', 'level_value',
  'logger_name', 'thread_name', 'app', 'appName', 'stack_trace',
]);

/**
 * Converte um LogEntry do Cloud Logging num registro do New Relic Log API.
 * - jsonPayload (nossos logs estruturados): campos de framework no topo, MDC sob `custom`.
 * - textPayload (logs de plataforma/Spring) vira o campo `message`.
 * - severity, trace e labels do recurso entram como atributos pra filtro no NR.
 */
function toNewRelicLog(entry) {
  const attrs = {
    timestamp: entry.timestamp ? Date.parse(entry.timestamp) : undefined,
    'log.level': entry.severity,
    'gcp.resource.type': entry.resource && entry.resource.type,
    'gcp.service': entry.resource && entry.resource.labels && entry.resource.labels.service_name,
    'gcp.revision': entry.resource && entry.resource.labels && entry.resource.labels.revision_name,
    'gcp.trace': entry.trace,
    'gcp.insertId': entry.insertId,
  };

  if (entry.jsonPayload && typeof entry.jsonPayload === 'object') {
    const custom = {};
    for (const [k, v] of Object.entries(entry.jsonPayload)) {
      if (FRAMEWORK_KEYS.has(k)) attrs[k] = v;
      else custom[k] = v;
    }
    if (Object.keys(custom).length) attrs.custom = custom;
    if (!attrs.message && entry.jsonPayload.message) attrs.message = entry.jsonPayload.message;
  } else if (typeof entry.textPayload === 'string') {
    attrs.message = entry.textPayload;
  } else {
    attrs.message = JSON.stringify(entry.jsonPayload || entry.protoPayload || entry);
  }

  // Remove undefined pra nao poluir o NR.
  Object.keys(attrs).forEach((k) => attrs[k] === undefined && delete attrs[k]);
  return attrs;
}

function postToNewRelic(payload) {
  const body = JSON.stringify([payload]);
  const options = {
    hostname: endpoint.hostname,
    path: endpoint.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': LICENSE_KEY,
      'Content-Length': Buffer.byteLength(body),
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.statusCode);
        else reject(new Error(`New Relic respondeu ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Entry point CloudEvent (Pub/Sub gen2). Lanca em falha pra acionar o retry do Pub/Sub.
 */
exports.forwardLog = async (event) => {
  // O Pub/Sub chega em dois formatos dependendo do runtime/framework:
  //  - background/legacy: `event` E' a propria mensagem -> event.data = base64 (string)
  //  - CloudEvent:        event.data.message.data = base64
  const data = event && event.data;
  const b64 =
    typeof data === 'string' ? data : data && data.message && data.message.data;
  if (!b64) return; // keep-alive / mensagem vazia

  const decoded = Buffer.from(b64, 'base64').toString('utf8');
  let entry;
  try {
    entry = JSON.parse(decoded);
  } catch (_) {
    entry = { textPayload: decoded };
  }

  const payload = toNewRelicLog(entry);
  const nrStatus = await postToNewRelic(payload);
  // Log de diagnostico (NAO vai pro NR — o sink so' captura service_name=psi-organizer-api).
  console.log(
    JSON.stringify({
      forwarded: true,
      nrStatus,
      logName: entry.logName,
      msgPreview: String(payload.message || '').slice(0, 120),
    })
  );
};
