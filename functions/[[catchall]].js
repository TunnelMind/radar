/**
 * functions/[[catchall]].js — Cloudflare Pages Function
 *
 * Handles all non-static routes for radar.tunnelmind.ai:
 *   GET  /.well-known/openapi.json
 *   GET  /.well-known/mcp.json
 *   GET  /.well-known/agent.json
 *   GET  /.well-known/security.txt
 *   GET  /v1/graph              — queryable surveillance entity graph
 *
 * Everything else passes through to CF Pages static assets
 * (index.html, d3.min.js, radar-graph.json).
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Well-known discovery files ────────────────────────────────────────────────

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'TunnelMind Radar API',
    version: '1.0.0',
    description: 'Queryable surveillance entity graph. 704 entities, 65 ownership links, categorized by jurisdiction and industry. Designed for agent-driven privacy research.',
    contact: { url: 'https://tunnelmind.ai', email: 'api@tunnelmind.ai' },
    license: { name: 'Commercial', url: 'https://tunnelmind.ai/terms' },
  },
  servers: [{ url: 'https://radar.tunnelmind.ai', description: 'Production' }],
  'x-well-known-url': 'https://radar.tunnelmind.ai/.well-known/openapi.json',
  paths: {
    '/v1/graph': {
      get: {
        operationId: 'get_graph',
        summary: 'Query the TunnelMind surveillance entity graph with filters',
        description: `Returns nodes (surveillance entities) and links (ownership/affiliation edges) from
the TunnelMind radar graph. Supports filtering by category, jurisdiction, industry,
minimum domain count, and keyword search.

Use this tool when:
- You want to explore which surveillance entities operate in a specific jurisdiction (EU, US, CN).
- You need to understand ownership relationships between surveillance actors.
- You are mapping the ad-tech or analytics ecosystem by industry.
- You want to find entities controlling large numbers of tracker domains.

Do NOT use this tool when:
- You need full domain-level tracker data — use data.tunnelmind.ai/v1/domains instead.
- You need live domain probes — use data.tunnelmind.ai/v1/intel/* instead.

Returns:
- nodes: array of entity objects with id, label, category, jurisdiction, industry, domainCount, avgCpm.
- links: array of ownership/affiliation edges { source, target }.
- meta: count, total_nodes, total_links, filters_applied, took_ms.`,
        tags: ['Graph'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['surveillance', 'analytics', 'monetization', 'social', 'infrastructure'] }, description: 'Filter by surveillance category' },
          { name: 'jurisdiction', in: 'query', schema: { type: 'string', enum: ['US', 'EU', 'CN', 'RU', 'unknown'] }, description: 'Filter by legal jurisdiction' },
          { name: 'industry', in: 'query', schema: { type: 'string' }, description: 'Filter by industry (e.g. ad_tech, analytics, data_broker)' },
          { name: 'min_domains', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Minimum domainCount threshold' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Keyword search on entity label/id' },
          { name: 'include_links', in: 'query', schema: { type: 'boolean', default: true }, description: 'Include ownership links in response' },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['full', 'summary'], default: 'summary' }, description: 'full includes topDomains array; summary omits it' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 704, default: 200 }, description: 'Max nodes to return' },
        ],
        responses: {
          '200': { description: 'Graph data matching filters' },
          '400': { description: 'Invalid filter parameters' },
        },
      },
    },
  },
};

const MCP_CARD = {
  schema_version: 'mcp-server-card/1.0-draft',
  name: 'TunnelMind Radar',
  description: 'Surveillance entity graph — query 704 entities by category, jurisdiction, and industry.',
  server_url: 'https://radar.tunnelmind.ai',
  transport: 'pages-function',
  tools_count: 1,
  auth: { type: 'none' },
  openapi_url: 'https://radar.tunnelmind.ai/.well-known/openapi.json',
  homepage: 'https://tunnelmind.ai',
  data_api: 'https://data.tunnelmind.ai',
};

const AGENT_CARD = {
  schema_version: 'a2a/1.0-draft',
  name: 'TunnelMind Radar',
  description: 'Surveillance ecosystem map. Exposes 704 surveillance entities with ownership links, jurisdiction, industry, and domain-count data. Use for ecosystem-level research.',
  url: 'https://radar.tunnelmind.ai',
  capabilities: [
    {
      id: 'graph_query',
      description: 'Query surveillance entity graph with filters for category, jurisdiction, industry, and keyword search.',
    },
  ],
  auth: { type: 'none' },
  openapi_url:  'https://radar.tunnelmind.ai/.well-known/openapi.json',
  mcp_url:      'https://radar.tunnelmind.ai/.well-known/mcp.json',
  related_apis: ['https://data.tunnelmind.ai/.well-known/agent.json'],
  homepage:     'https://tunnelmind.ai',
  contact:      'api@tunnelmind.ai',
};

const SECURITY_TXT = `Contact: mailto:security@tunnelmind.ai
Expires: 2027-04-17T00:00:00.000Z
Policy: https://tunnelmind.ai/security/policy
Canonical: https://radar.tunnelmind.ai/.well-known/security.txt
Preferred-Languages: en
`;

const WK_HEADERS_JSON = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300, must-revalidate',
};

const WK_HEADERS_TEXT = {
  ...CORS_HEADERS,
  'Content-Type': 'text/plain',
  'Cache-Control': 'public, max-age=300, must-revalidate',
};

function handleWellKnown(file) {
  switch (file) {
    case 'openapi.json':
      return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), { headers: WK_HEADERS_JSON });
    case 'mcp.json':
      return new Response(JSON.stringify(MCP_CARD, null, 2), { headers: WK_HEADERS_JSON });
    case 'agent.json':
      return new Response(JSON.stringify(AGENT_CARD, null, 2), { headers: WK_HEADERS_JSON });
    case 'security.txt':
      return new Response(SECURITY_TXT, { headers: WK_HEADERS_TEXT });
    default:
      return null;
  }
}

// ── GET /v1/graph ─────────────────────────────────────────────────────────────

async function handleGraph(url, env) {
  const startMs   = Date.now();
  const params    = url.searchParams;

  const filterCat    = params.get('category')     || null;
  const filterJuris  = params.get('jurisdiction') || null;
  const filterInd    = params.get('industry')     || null;
  const minDomains   = parseInt(params.get('min_domains') || '0', 10);
  const searchQ      = (params.get('search') || '').toLowerCase().trim();
  const includeLinks = params.get('include_links') !== 'false';
  const format       = params.get('format') === 'full' ? 'full' : 'summary';
  const limit        = Math.min(parseInt(params.get('limit') || '200', 10), 704);

  if (isNaN(minDomains) || isNaN(limit) || limit < 1) {
    return Response.json(
      { ok: false, error: { code: 'invalid_request', message: 'Invalid numeric parameter' } },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Load graph from static asset (CF Pages serves it at /radar-graph.json)
  let graph;
  try {
    const resp = await env.ASSETS.fetch(new Request(`${url.origin}/radar-graph.json`));
    graph = await resp.json();
  } catch {
    return Response.json(
      { ok: false, error: { code: 'internal_error', message: 'Failed to load graph data' } },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let nodes = graph.nodes ?? [];
  const links = graph.links ?? [];

  // Apply filters
  if (filterCat)   nodes = nodes.filter(n => n.category   === filterCat);
  if (filterJuris) nodes = nodes.filter(n => n.jurisdiction === filterJuris);
  if (filterInd)   nodes = nodes.filter(n => n.industry    === filterInd);
  if (minDomains > 0) nodes = nodes.filter(n => (n.domainCount ?? 0) >= minDomains);
  if (searchQ)     nodes = nodes.filter(n =>
    (n.label ?? '').toLowerCase().includes(searchQ) ||
    (n.id    ?? '').toLowerCase().includes(searchQ)
  );

  // Sort by domainCount desc, then limit
  nodes = nodes.sort((a, b) => (b.domainCount ?? 0) - (a.domainCount ?? 0)).slice(0, limit);

  // Strip topDomains in summary mode
  if (format === 'summary') {
    nodes = nodes.map(({ topDomains: _td, ...rest }) => rest);
  }

  // Filter links to matched node set (only when includeLinks)
  const nodeIds = new Set(nodes.map(n => n.id));
  const filteredLinks = includeLinks
    ? links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
    : [];

  const filtersApplied = Object.fromEntries(
    [
      filterCat   && ['category', filterCat],
      filterJuris && ['jurisdiction', filterJuris],
      filterInd   && ['industry', filterInd],
      minDomains  && ['min_domains', minDomains],
      searchQ     && ['search', searchQ],
    ].filter(Boolean)
  );

  return Response.json({
    ok: true,
    data: {
      nodes,
      links: filteredLinks,
    },
    meta: {
      count:          nodes.length,
      total_nodes:    (graph.nodes ?? []).length,
      total_links:    links.length,
      filters_applied: filtersApplied,
      took_ms:        Date.now() - startMs,
    },
  }, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } });
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;
  const url  = new URL(request.url);
  const path = url.pathname;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // /.well-known/*
  if (path.startsWith('/.well-known/')) {
    const file = path.slice('/.well-known/'.length);
    const resp = handleWellKnown(file);
    if (resp) return resp;
  }

  // /v1/graph
  if (path === '/v1/graph' && request.method === 'GET') {
    return handleGraph(url, env);
  }

  // Pass everything else to static assets (index.html, d3.min.js, radar-graph.json)
  return env.ASSETS.fetch(request);
}
