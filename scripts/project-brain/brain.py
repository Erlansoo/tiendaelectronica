# -*- coding: utf-8 -*-
"""CLI del Mapa Mental del Proyecto (.project-brain).

Principio de diseño: brain.py es dueño de los DATOS (brain.json), no de la
INTERFAZ (viewer.html). El viewer se mantiene como una app independiente; el
CLI solo inyecta los datos dentro de su bloque marcado, sin reescribir el HTML.

Lo que se puede derivar del grafo se genera (mapas Mermaid, esqueleto de rutas).
Lo único 100% manual es context/current.md (la brújula del momento) y la prosa
curada de cada ruta.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EXCLUDED_DIRS = {
    '.git', '.project-brain', 'node_modules', 'dist', 'build', '.next', '.vite',
    '__pycache__', '.venv', 'venv', 'target', 'coverage', '.pytest_cache',
}
EXCLUDED_SUFFIXES = {
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.7z', '.rar',
    '.exe', '.dll', '.pdb', '.pyc', '.log', '.lock', '.map', '.mp4', '.mp3', '.wav',
}
IMPORTANT_NAMES = {
    'README.md', 'AGENTS.md', 'CLAUDE.md', 'package.json', 'vite.config.ts',
    'tsconfig.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'Makefile',
}

BRAIN_VERSION = 5

# Migajas de lenguaje (aliases): escalera de confianza.
# inferred (la IA creyó) -> verified (pasó validación) -> user-confirmed -> stale.
ALIAS_CONFIDENCE = {'inferred', 'verified', 'user-confirmed', 'stale'}

# Capas válidas y su orden canónico.
LAYER_ORDER = ['interaction', 'product', 'architecture', 'work', 'todo', 'risks', 'decisions']
LAYER_SUMMARIES = {
    'interaction':  'Memoria de trabajo humano + IA. Actualizar después de sesiones importantes.',
    'product':      'Intención del producto, usuarios, flujos y restricciones.',
    'architecture': 'Módulos reales del código, flujo de datos y restricciones técnicas.',
    'work':         'Trabajos completados por la IA, pendientes de aprobación o ya aprobados por el usuario.',
    'todo':         'Lista de tareas del PRD. La IA marca lo que implementó; el usuario confirma con su checkmark.',
    'risks':        'Zonas calientes y frágiles: qué puede romperse y dónde tener cuidado.',
    'decisions':    'Decisiones aceptadas con justificación y archivos afectados.',
}

# Capas donde no exigimos status/confidence (el todo tiene su propio modelo).
LAYERS_NO_STATUS = {'todo'}
SEVERITY_LEVELS = {'low', 'medium', 'high', 'critical'}

# Hotspots: bandas por líneas (no porque grande sea malo, sino porque la IA
# necesita entrar con mapa, no tragarse el edificio entero).
CODE_KINDS = {'logic', 'frontend-component', 'ui'}
HOTSPOT_BANDS = [(3000, 'critical'), (1500, 'hotspot'), (800, 'revisar')]

# Estados de promoción (set chico, no 8 niveles que nadie respeta).
# idea/hypothesis -> active -> verified -> approved -> rule -> archived
# Más los estados de aprobación de la capa work.
VALID_STATUSES = {
    'idea', 'hypothesis', 'active', 'verified', 'approved', 'rule', 'archived',
    'pending', 'pending-approval', 'rejected', 'resolved', 'blocked',
}
# Confianza: cuánto podemos fiarnos del nodo.
VALID_CONFIDENCE = {'observed', 'inferred', 'user-confirmed', 'stale'}

# Marcador de datos dentro del viewer.
BRAIN_DATA_RE = re.compile(r'(?m)^const brain = .*;\s*$')

SCRIPT_DIR = Path(__file__).resolve().parent
VIEWER_TEMPLATE = SCRIPT_DIR / 'viewer_template.html'

# Patrones típicos de mojibake (UTF-8 mal decodificado / reemplazos perdidos).
MOJIBAKE_MARKERS = ['Ã', 'Â¿', 'Â¡', 'â€”', 'â€“', 'â€™', 'â€œ', 'â€', '�', 'ðŸ']


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def brain_dir(project: Path) -> Path:
    return project / '.project-brain'


def safe_id(value: str) -> str:
    """Sanitiza un fragmento de id para que no rompa selectores CSS/HTML."""
    return re.sub(r'[^a-zA-Z0-9_-]', '-', value)


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def detect_project_name(project: Path) -> str:
    package_json = project / 'package.json'
    if package_json.exists():
        try:
            return json.loads(package_json.read_text(encoding='utf-8')).get('name') or project.name
        except Exception:
            return project.name
    return project.name


def default_brain(project: Path) -> dict[str, Any]:
    name = detect_project_name(project)
    return {
        'schema': 'project-brain-map',
        'version': BRAIN_VERSION,
        'project': {
            'name': name,
            'displayName': name,
            'root': str(project),
            'createdAt': now_iso(),
            'updatedAt': now_iso(),
        },
        'layers': {
            layer: {'summary': LAYER_SUMMARIES[layer], 'nodes': []}
            for layer in LAYER_ORDER
        },
        'files': [],
        'links': [],
        'routes': [],
        'aliases': [],
        'insights': [],
        'language': 'es',
    }


def migrate_brain(brain: dict[str, Any], project: Path) -> dict[str, Any]:
    """Normaliza un brain.json viejo al esquema actual sin perder datos."""
    brain.setdefault('schema', 'project-brain-map')
    brain['version'] = BRAIN_VERSION

    proj = brain.setdefault('project', {})
    proj.setdefault('name', detect_project_name(project))
    proj.setdefault('displayName', proj['name'])
    proj.setdefault('root', str(project))
    proj.setdefault('createdAt', now_iso())

    layers = brain.setdefault('layers', {})
    for layer in LAYER_ORDER:
        layers.setdefault(layer, {'summary': LAYER_SUMMARIES[layer], 'nodes': []})
        layers[layer].setdefault('summary', LAYER_SUMMARIES[layer])
        layers[layer].setdefault('nodes', [])

    brain.setdefault('files', [])
    brain.setdefault('links', [])
    brain.setdefault('routes', [])
    brain.setdefault('aliases', [])
    brain.setdefault('insights', [])
    brain.setdefault('language', 'es')
    return brain


def load_brain(project: Path) -> dict[str, Any]:
    brain_path = brain_dir(project) / 'brain.json'
    brain = read_json(brain_path, default_brain(project))
    return migrate_brain(brain, project)


def all_node_ids(brain: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for layer in brain.get('layers', {}).values():
        for node in layer.get('nodes', []):
            if node.get('id'):
                ids.add(node['id'])
    return ids


# ─────────────────────────────────────────────────────────────────────────────
# Documentos y contexto
# ─────────────────────────────────────────────────────────────────────────────

def ensure_docs(project: Path, brain: dict[str, Any]) -> None:
    bd = brain_dir(project)
    (bd / 'maps').mkdir(parents=True, exist_ok=True)
    (bd / 'context' / 'routes').mkdir(parents=True, exist_ok=True)
    name = brain['project']['name']
    docs = {
        'product.md': (
            f"# Producto\n\n## Intención\n\nDescribir para qué existe `{name}`.\n\n"
            "## Usuarios\n\n- Pendiente\n\n## Flujos principales\n\n- Pendiente\n"
        ),
        'architecture.md': (
            "# Arquitectura\n\n## Mapa del sistema\n\n"
            "Ejecutá `python brain.py scan <proyecto>` para poblar la capa de arquitectura.\n\n"
            "## Restricciones importantes\n\n- Pendiente\n"
        ),
        'interaction.md': (
            "# Memoria de interacción\n\n## Hilo actual\n\n- Mapa mental inicializado.\n\n"
            "## Resuelto\n\n- Pendiente\n\n## Siguiente\n\n- Pendiente\n"
        ),
        'decisions.md': (
            "# Decisiones\n\n## Aceptadas\n\n- Pendiente\n\n## Rechazadas\n\n- Pendiente\n"
        ),
    }
    for filename, content in docs.items():
        path = bd / filename
        if not path.exists():
            path.write_text(content, encoding='utf-8')

    # Brújula: lo primero que debería leer cualquier IA al retomar el proyecto.
    current = bd / 'context' / 'current.md'
    if not current.exists():
        current.write_text(
            "# Contexto actual\n\n"
            "> Brújula del proyecto. Es lo PRIMERO que debe leer la IA al retomar.\n\n"
            "## Objetivo actual\n\n[Qué estamos intentando hacer ahora]\n\n"
            "## Nodo activo\n\n[Ej: Stage 0 / PreForma]\n\n"
            "## Archivos relevantes\n\n- \n\n"
            "## Decisiones relacionadas\n\n- \n\n"
            "## Riesgos / No tocar\n\n- \n\n"
            "## Próximo paso\n\n- \n",
            encoding='utf-8',
        )


# ─────────────────────────────────────────────────────────────────────────────
# Scan de archivos
# ─────────────────────────────────────────────────────────────────────────────

def should_skip(path: Path, project: Path) -> bool:
    rel_parts = path.relative_to(project).parts
    if any(part in EXCLUDED_DIRS for part in rel_parts):
        return True
    if path.is_file() and path.suffix.lower() in EXCLUDED_SUFFIXES:
        return True
    return False


def classify_file(path: Path, project: Path) -> str:
    rel = path.relative_to(project).as_posix()
    name = path.name
    suffix = path.suffix.lower()
    if name in IMPORTANT_NAMES:
        return 'project-control'
    if '/ui/' in f'/{rel.lower()}/' or suffix in {'.css', '.scss'}:
        return 'ui'
    if suffix in {'.tsx', '.jsx', '.vue', '.svelte'}:
        return 'frontend-component'
    if suffix in {'.ts', '.js', '.mjs', '.cjs'}:
        return 'logic'
    if suffix in {'.py', '.go', '.rs', '.java', '.cs'}:
        return 'logic'
    if suffix in {'.md', '.mdx'}:
        return 'documentation'
    if suffix in {'.json', '.yaml', '.yml', '.toml'}:
        return 'configuration'
    return 'other'


def scan_files(project: Path) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    for path in project.rglob('*'):
        if should_skip(path, project) or not path.is_file():
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size > 800_000:
            continue
        rel = path.relative_to(project).as_posix()
        files.append({'path': rel, 'kind': classify_file(path, project), 'size': size})
    files.sort(key=lambda item: (item['kind'], item['path']))
    return files


def build_architecture_nodes(files: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[str]] = {}
    for item in files:
        top = item['path'].split('/')[0]
        grouped.setdefault(top, []).append(item['path'])
    nodes = []
    for folder, paths in sorted(grouped.items()):
        important = [p for p in paths if Path(p).name in IMPORTANT_NAMES][:6]
        sample = important or paths[:6]
        nodes.append({
            'id': f'arch-{safe_id(folder)}',
            'title': folder,
            'status': 'active',
            'confidence': 'observed',
            'summary': f'{len(paths)} archivos rastreados',
            'files': sample,
        })
    return nodes


# ─────────────────────────────────────────────────────────────────────────────
# Mapas Mermaid (lentes separadas, generadas desde el grafo)
# ─────────────────────────────────────────────────────────────────────────────

def _mm_safe(label: str) -> str:
    return str(label).replace('(', '[').replace(')', ']').replace('"', "'")


def write_maps(project: Path, brain: dict[str, Any]) -> None:
    maps_dir = brain_dir(project) / 'maps'
    maps_dir.mkdir(parents=True, exist_ok=True)

    # overview.mmd — mindmap de todas las capas
    lines = ['mindmap', f"  root(({brain['project']['name']}))"]
    for layer_name in LAYER_ORDER:
        layer = brain['layers'].get(layer_name)
        if not layer:
            continue
        lines.append(f'    {layer_name.capitalize()}')
        nodes = layer.get('nodes', [])[:8]
        if not nodes:
            lines.append('      Pendiente')
        for node in nodes:
            label = node.get('title') or node.get('id') or 'node'
            lines.append(f"      {_mm_safe(label)} [{node.get('status', 'active')}]")
    (maps_dir / 'overview.mmd').write_text('\n'.join(lines) + '\n', encoding='utf-8')

    # architecture.mmd — flowchart producto -> arquitectura, según links
    arch = ['flowchart LR']
    for node in brain['layers'].get('architecture', {}).get('nodes', []):
        nid = safe_id(node['id'])
        arch.append(f'  {nid}["{_mm_safe(node.get("title", node["id"]))}"]')
    rel_types = {'realized-by', 'requires', 'implements', 'stage', 'depends-on'}
    for link in brain.get('links', []):
        if link.get('type') in rel_types:
            a, b = safe_id(link['from']), safe_id(link['to'])
            label = link.get('label') or link.get('type')
            arch.append(f'  {a} -->|{label}| {b}')
    (maps_dir / 'architecture.mmd').write_text('\n'.join(arch) + '\n', encoding='utf-8')

    # work.mmd — estado de los trabajos
    work = ['flowchart TB']
    for node in brain['layers'].get('work', {}).get('nodes', []):
        nid = safe_id(node['id'])
        status = node.get('status', 'active')
        work.append(f'  {nid}["{_mm_safe(node.get("title", node["id"]))}\\n({status})"]')
    (maps_dir / 'work.mmd').write_text('\n'.join(work) + '\n', encoding='utf-8')

    # risks.mmd — capa formal `risks` + cualquier riesgo embebido en otros nodos
    risks = ['flowchart TB', '  subgraph Riesgos']
    found = False
    # 1) capa formal de riesgos
    for node in brain['layers'].get('risks', {}).get('nodes', []):
        found = True
        nid = safe_id(node['id'])
        sev = node.get('severity', '')
        tag = f' [{sev}]' if sev else ''
        risks.append(f'    {nid}["{_mm_safe(node.get("title", node["id"]))}{tag}"]')
        for fp in node.get('files', [])[:4]:
            risks.append(f'    {nid} --- {safe_id(nid + fp)}["{_mm_safe(fp)}"]')
    # 2) riesgos embebidos (campo risks/severity en nodos de otras capas)
    for layer_name, layer in brain['layers'].items():
        if layer_name == 'risks':
            continue
        for node in layer.get('nodes', []):
            node_risks = node.get('risks') or []
            if node_risks:
                found = True
                nid = safe_id(node['id'])
                risks.append(f'    {nid}["{_mm_safe(node.get("title", node["id"]))}"]')
                for r in node_risks:
                    risks.append(f'    {nid} --- {safe_id(nid + r[:12])}["{_mm_safe(r)[:60]}"]')
    if not found:
        risks.append('    sin_riesgos["Sin riesgos registrados"]')
    risks.append('  end')
    (maps_dir / 'risks.mmd').write_text('\n'.join(risks) + '\n', encoding='utf-8')


# ─────────────────────────────────────────────────────────────────────────────
# Viewer (solo inyección de datos)
# ─────────────────────────────────────────────────────────────────────────────

def render_viewer(project: Path, brain: dict[str, Any]) -> None:
    """Inyecta los datos en el viewer SIN reescribir su HTML/CSS/JS."""
    viewer_path = brain_dir(project) / 'viewer.html'
    data = json.dumps(brain, ensure_ascii=False)
    data_line = f'const brain = {data};'

    def inject(html: str) -> str:
        new_html, n = BRAIN_DATA_RE.subn(lambda _m: data_line, html, count=1)
        if n == 0:
            raise SystemExit(
                'No se encontró la línea `const brain = ...;` en el viewer. '
                'No se tocó el archivo para no romperlo.'
            )
        return new_html

    if viewer_path.exists():
        html = viewer_path.read_text(encoding='utf-8')
        new_html = inject(html)
        if new_html != html:
            viewer_path.write_text(new_html, encoding='utf-8')
        return

    if VIEWER_TEMPLATE.exists():
        template = VIEWER_TEMPLATE.read_text(encoding='utf-8')
        viewer_path.write_text(inject(template), encoding='utf-8')
        return

    viewer_path.write_text(_fallback_viewer(data), encoding='utf-8')


def _fallback_viewer(data: str) -> str:
    return (
        '<!doctype html><html lang="es"><head><meta charset="utf-8">'
        '<title>Mapa Mental del Proyecto</title>'
        '<style>body{margin:0;background:#07111f;color:#dbeafe;'
        'font-family:system-ui,sans-serif;padding:24px}pre{white-space:pre-wrap}</style>'
        '</head><body><h1>Mapa Mental del Proyecto</h1>'
        '<p style="color:#93a4b8">Falta viewer_template.html — mostrando datos crudos.</p>'
        f'<script>const brain = {data};</script>'
        '<pre id="out"></pre>'
        '<script>document.getElementById("out").textContent='
        'JSON.stringify(brain,null,2);</script>'
        '</body></html>\n'
    )


# ─────────────────────────────────────────────────────────────────────────────
# Persistencia
# ─────────────────────────────────────────────────────────────────────────────

def persist(project: Path, brain: dict[str, Any]) -> Path:
    bd = brain_dir(project)
    bd.mkdir(parents=True, exist_ok=True)
    brain['project']['updatedAt'] = now_iso()
    ensure_docs(project, brain)
    brain_path = bd / 'brain.json'
    write_json(brain_path, brain)
    write_maps(project, brain)
    render_viewer(project, brain)
    return brain_path


# ─────────────────────────────────────────────────────────────────────────────
# Comandos
# ─────────────────────────────────────────────────────────────────────────────

def init(project: Path) -> None:
    project = project.resolve()
    if not project.exists():
        raise SystemExit(f'La ruta del proyecto no existe: {project}')
    brain = load_brain(project)
    persist(project, brain)
    print(f'Mapa mental inicializado en {brain_dir(project)}')


def scan(project: Path) -> None:
    project = project.resolve()
    brain = load_brain(project)
    files = scan_files(project)
    brain['files'] = files
    arch_nodes = brain['layers']['architecture'].get('nodes', [])
    if not arch_nodes:
        brain['layers']['architecture']['nodes'] = build_architecture_nodes(files)
        print('Capa de arquitectura autogenerada por carpetas.')
    else:
        print(f'Capa de arquitectura preservada ({len(arch_nodes)} nodos curados).')
    persist(project, brain)
    print(f'Se rastrearon {len(files)} archivos en {brain_dir(project) / "brain.json"}')


def add_note(project: Path, layer: str, title: str, summary: str,
             status: str = 'active', confidence: str = 'inferred') -> None:
    project = project.resolve()
    brain = load_brain(project)
    if layer not in brain['layers']:
        raise SystemExit(f'Capa desconocida: {layer}')
    count = len(brain['layers'][layer]['nodes'])
    node = {
        'id': f'{layer}:{count + 1:03d}',
        'title': title,
        'summary': summary,
        'status': status,
        'confidence': confidence,
        'createdAt': now_iso(),
    }
    brain['layers'][layer]['nodes'].append(node)
    persist(project, brain)
    print(f'Nota agregada en {layer}: {title}')


def sync(project: Path) -> None:
    project = project.resolve()
    brain = load_brain(project)
    persist(project, brain)
    print(f'Viewer y mapas sincronizados desde {brain_dir(project) / "brain.json"}')


def add_insight(project: Path, route_slug: str, title: str, summary: str,
                kind: str = 'user-map', confidence: str = 'inferred') -> None:
    """Agrega una síntesis corta para el viewer humano.

    Regla de costo: esto no reemplaza documentación técnica. Es una nota breve
    post-tarea para traducir complejidad del proyecto al usuario.
    """
    project = project.resolve()
    brain = load_brain(project)
    if confidence not in VALID_CONFIDENCE:
        raise SystemExit(f'confidence inválida: {confidence}. Usá {sorted(VALID_CONFIDENCE)}.')
    if not any(r.get('slug') == route_slug for r in brain.get('routes', [])):
        avail = ', '.join(r.get('slug', '') for r in brain.get('routes', []))
        raise SystemExit(f'Ruta desconocida: {route_slug}. Disponibles: {avail}')
    title = title.strip()
    summary = summary.strip()
    if not title or not summary:
        raise SystemExit('title y summary son obligatorios.')
    insights = brain.setdefault('insights', [])
    item = {
        'id': f'insight:{len(insights) + 1:03d}',
        'route': route_slug,
        'kind': kind,
        'title': title,
        'summary': summary,
        'confidence': confidence,
        'createdAt': now_iso(),
    }
    insights.insert(0, item)
    # Mantenerlo liviano: por ruta solo conservamos las 5 síntesis más recientes.
    seen_for_route = 0
    kept = []
    for ins in insights:
        if ins.get('route') == route_slug:
            seen_for_route += 1
            if seen_for_route > 5:
                continue
        kept.append(ins)
    brain['insights'] = kept
    persist(project, brain)
    print(f'Síntesis agregada para {route_slug}: {title}')


def route(project: Path, slug: str, title: str | None = None) -> None:
    """Crea el esqueleto de una ruta de navegación, derivando links del grafo."""
    project = project.resolve()
    brain = load_brain(project)
    slug = safe_id(slug)
    title = title or slug.replace('-', ' ').title()
    # Registrar la ruta en el grafo (para que validate exija su archivo).
    routes = brain.setdefault('routes', [])
    if not any(r.get('slug') == slug for r in routes):
        routes.append({'slug': slug, 'title': title, 'nodes': []})
        write_json(brain_dir(project) / 'brain.json', brain)
    route_path = brain_dir(project) / 'context' / 'routes' / f'{slug}.md'
    route_path.parent.mkdir(parents=True, exist_ok=True)
    if route_path.exists():
        print(f'Ruta registrada. El archivo ya existe: {route_path} (no se sobreescribe)')
        return
    route_path.write_text(
        f"# Ruta: {title}\n\n"
        "## Para qué sirve\n\n[Resumen funcional]\n\n"
        "## Archivos principales\n\n- \n\n"
        "## Nodos relacionados\n\n- \n\n"
        "## Decisiones vigentes\n\n- \n\n"
        "## Riesgos\n\n- \n\n"
        "## Cómo modificar con seguridad\n\n"
        "1. Revisar tipos\n2. Revisar lógica/geometría\n3. Revisar interacción\n"
        "4. Validar persistencia/export\n5. Ejecutar lint/build\n",
        encoding='utf-8',
    )
    print(f'Ruta creada: {route_path}')


def validate(project: Path) -> int:
    """Revisa integridad del brain. Devuelve cantidad de problemas."""
    project = project.resolve()
    bd = brain_dir(project)
    brain_path = bd / 'brain.json'
    errors: list[str] = []
    warnings: list[str] = []

    # 1) parsea
    try:
        brain = read_json(brain_path, None)
    except Exception as exc:
        print(f'✗ brain.json no parsea: {exc}')
        return 1
    if brain is None:
        print('✗ No existe brain.json. Corré: python brain.py init')
        return 1

    raw = brain_path.read_text(encoding='utf-8')

    # 1b) identidad del proyecto: evita abrir/sincronizar un viewer de otro proyecto.
    meta = brain.get('project', {}) if isinstance(brain.get('project', {}), dict) else {}
    stored_root_raw = meta.get('root')
    if not stored_root_raw:
        errors.append('project.root faltante: no se puede verificar a qué proyecto pertenece este Brain.')
    else:
        try:
            stored_root = Path(str(stored_root_raw)).resolve()
            if os.path.normcase(str(stored_root)) != os.path.normcase(str(project)):
                errors.append(
                    'project.root no coincide con la carpeta validada: '
                    f'brain.json dice "{stored_root}", pero estás validando "{project}".'
                )
        except Exception as exc:
            errors.append(f'project.root inválido: {stored_root_raw!r} ({exc})')

    # 2) mojibake
    for marker in MOJIBAKE_MARKERS:
        if marker in raw:
            warnings.append(f'Posible mojibake/encoding roto: contiene "{marker}".')

    # 3) nodos bien formados + estados/confianza válidos
    node_ids = all_node_ids(brain)
    for layer_name, layer in brain.get('layers', {}).items():
        for node in layer.get('nodes', []):
            nid = node.get('id', '<sin-id>')
            if not node.get('id'):
                errors.append(f'[{layer_name}] nodo sin id.')
            if not node.get('title'):
                errors.append(f'[{layer_name}] {nid}: sin title.')
            status = node.get('status')
            if layer_name not in LAYERS_NO_STATUS and not status:
                errors.append(f'[{layer_name}] {nid}: sin status.')
            if status and status not in VALID_STATUSES:
                warnings.append(f'[{layer_name}] {nid}: status no estándar "{status}".')
            conf = node.get('confidence')
            if conf and conf not in VALID_CONFIDENCE:
                warnings.append(f'[{layer_name}] {nid}: confidence no estándar "{conf}".')
            # confidence obligatoria salvo en todo (que tiene checkedByAi/User)
            if layer_name not in LAYERS_NO_STATUS and not conf:
                warnings.append(f'[{layer_name}] {nid}: sin confidence (observed/inferred/user-confirmed/stale).')
            if layer_name == 'todo':
                for field in ('priority', 'area'):
                    if not node.get(field):
                        warnings.append(f'[todo] {nid}: sin {field}.')
                if not (node.get('summary') or node.get('description')):
                    warnings.append(f'[todo] {nid}: sin summary/description.')
            if layer_name == 'risks':
                sev = node.get('severity')
                if not sev:
                    warnings.append(f'[risks] {nid}: sin severity.')
                elif sev not in SEVERITY_LEVELS:
                    warnings.append(f'[risks] {nid}: severity no estándar "{sev}".')

    # 4) links apuntan a nodos o archivos existentes, con prefijo consistente
    known_files = {f['path'] for f in brain.get('files', [])}

    def looks_like_path(ref: str) -> bool:
        return ('/' in ref or re.search(r'\.\w{1,5}$', ref)) and ':' not in ref.split('/')[0]

    for link in brain.get('links', []):
        for end in ('from', 'to'):
            ref = link.get(end, '')
            if not ref:
                errors.append(f'Link con extremo "{end}" vacío: {link}.')
                continue
            if ref.startswith('file:'):
                fp = ref[5:]
                if fp not in known_files and not (project / fp).exists():
                    warnings.append(f'Link {end}={ref}: archivo no encontrado.')
            elif ref in node_ids:
                pass
            elif ref in known_files or (project / ref).exists():
                warnings.append(f'Link {end}={ref}: usar prefijo consistente "file:{ref}".')
            elif looks_like_path(ref):
                warnings.append(f'Link {end}={ref}: parece archivo sin prefijo "file:" y no existe.')
            else:
                warnings.append(f'Link {end}={ref}: no es nodo ni archivo conocido.')

    # 4b) rutas registradas deben tener su archivo
    routes_dir = bd / 'context' / 'routes'
    for r in brain.get('routes', []):
        slug = r.get('slug')
        if slug and not (routes_dir / f'{slug}.md').exists():
            warnings.append(f'Ruta registrada "{slug}" sin archivo en context/routes/{slug}.md.')

    # 4c) risks.mmd con contenido pero sin capa risks formal
    risks_layer = brain.get('layers', {}).get('risks', {}).get('nodes', [])
    risks_map = bd / 'maps' / 'risks.mmd'
    if not risks_layer and risks_map.exists():
        txt = risks_map.read_text(encoding='utf-8')
        if 'sin_riesgos' not in txt and txt.count('[') > 2:
            warnings.append('risks.mmd tiene riesgos embebidos pero no hay capa formal "risks". '
                            'Conviene promoverlos a nodos risk:NNN.')

    # 5) viewer sincronizado con brain.json
    viewer_path = bd / 'viewer.html'
    if not viewer_path.exists():
        warnings.append('No existe viewer.html. Corré: python brain.py sync')
    else:
        vhtml = viewer_path.read_text(encoding='utf-8')
        m = re.search(r'const brain = (.*);\s*$', vhtml, re.MULTILINE)
        if not m:
            warnings.append('viewer.html no tiene línea `const brain = ...;`.')
        else:
            try:
                embedded = json.loads(m.group(1))
                if json.dumps(embedded, sort_keys=True, ensure_ascii=False) != \
                   json.dumps(brain, sort_keys=True, ensure_ascii=False):
                    warnings.append('viewer.html desincronizado. Corré: python brain.py sync')
            except Exception:
                warnings.append('viewer.html: datos embebidos no parsean.')

    # 5b) aliases (migajas de lenguaje)
    route_slugs = {r['slug'] for r in brain.get('routes', [])}
    seen_phrases: set[str] = set()
    for a in brain.get('aliases', []):
        ph = a.get('phrase', '')
        if not ph.strip():
            errors.append('Alias con phrase vacía.')
            continue
        pn = _norm(ph)
        if pn in seen_phrases:
            warnings.append(f'Alias duplicado: "{ph}".')
        seen_phrases.add(pn)
        rt = a.get('route')
        if rt not in route_slugs:
            warnings.append(f'Alias "{ph}" apunta a ruta inexistente "{rt}". Marcá stale o forget.')
        conf = a.get('confidence')
        if conf and conf not in ALIAS_CONFIDENCE:
            warnings.append(f'Alias "{ph}": confidence no estándar "{conf}".')
        for f in a.get('files', []):
            if f not in known_files and not (project / f).exists():
                warnings.append(f'Alias "{ph}": archivo no encontrado {f} (pista posiblemente stale).')

    # 6) brújula presente
    cur_path = bd / 'context' / 'current.md'
    if not cur_path.exists():
        warnings.append('Falta context/current.md (la brújula). Corré: python brain.py init')
    else:
        # 6b) brújula posiblemente desactualizada: menciona como pendiente algo ya hecho.
        cur_txt = cur_path.read_text(encoding='utf-8').lower()
        triggers = ('completar', 'falta', 'faltan', 'crear ruta', 'pendiente')
        existing = [r['slug'] for r in brain.get('routes', [])
                    if (bd / 'context' / 'routes' / f"{r['slug']}.md").exists()]
        flagged = set()
        for line in cur_txt.splitlines():
            if any(t in line for t in triggers):
                for slug in existing:
                    if slug in line and slug not in flagged:
                        flagged.add(slug)
                        warnings.append(
                            f'current.md menciona "{slug}" como pendiente, pero esa ruta ya existe. '
                            'Actualizá la brújula (si la brújula miente, el sistema pierde autoridad).')

    # reporte
    for e in errors:
        print(f'✗ {e}')
    for w in warnings:
        print(f'⚠ {w}')
    if not errors and not warnings:
        print('✓ Brain válido y sincronizado.')
    else:
        print(f'\nResumen: {len(errors)} errores, {len(warnings)} advertencias.')
    return len(errors)


# ─────────────────────────────────────────────────────────────────────────────
# context — salida COMPACTA para pegar al prompt de la IA (modo "codear")
# ─────────────────────────────────────────────────────────────────────────────

def _node_index(brain: dict[str, Any]) -> dict[str, tuple[str, dict[str, Any]]]:
    idx: dict[str, tuple[str, dict[str, Any]]] = {}
    for lname, layer in brain.get('layers', {}).items():
        for n in layer.get('nodes', []):
            if n.get('id'):
                idx[n['id']] = (lname, n)
    return idx


def route_context(brain: dict[str, Any], route: dict[str, Any]):
    """Deriva del grafo: nodos, archivos, decisiones, riesgos y trabajos de una ruta."""
    idx = _node_index(brain)
    ids = set(route.get('nodes', []))
    nodes = [idx[i][1] for i in route.get('nodes', []) if i in idx]
    files: list[str] = []
    seen: set[str] = set()
    for n in nodes:
        for f in n.get('files', []):
            if f not in seen:
                seen.add(f)
                files.append(f)
    rel: dict[str, list[dict[str, Any]]] = {'decisions': [], 'work': [], 'risks': []}
    relset: dict[str, set[str]] = {'decisions': set(), 'work': set(), 'risks': set()}
    # nodos DIRECTOS de la ruta que sean decisión/riesgo/trabajo también se listan
    for i in route.get('nodes', []):
        if i in idx:
            lay, n = idx[i]
            if lay in rel and i not in relset[lay]:
                relset[lay].add(i)
                rel[lay].append(n)
    for link in brain.get('links', []):
        if link.get('from') in ids or link.get('to') in ids:
            for x in (link.get('from'), link.get('to')):
                if x in ids or x not in idx:
                    continue
                lay = idx[x][0]
                if lay in rel and x not in relset[lay]:
                    relset[lay].add(x)
                    rel[lay].append(idx[x][1])
    # riesgos por solapamiento de archivos (no siempre tienen link explícito)
    fileset = set(files)
    for n in brain.get('layers', {}).get('risks', {}).get('nodes', []):
        if any(f in fileset for f in n.get('files', [])) and n.get('id') not in relset['risks']:
            relset['risks'].add(n['id'])
            rel['risks'].append(n)
    return nodes, files, rel


def _route_specificity(brain: dict[str, Any], route: dict[str, Any], file_path: str) -> int:
    """Qué tan central es un archivo a una ruta. Más alto = más específica.

    Señal fuerte: el archivo es el de un nodo de ARQUITECTURA de la ruta (la ruta
    trata de ese módulo). Señal débil: entra por arrastre de una decisión/trabajo.
    A igualdad, gana la ruta más enfocada (menos archivos).
    """
    idx = _node_index(brain)
    score = 0
    for nid in route.get('nodes', []):
        if nid not in idx:
            continue
        lay, n = idx[nid]
        if file_path in (n.get('files') or []):
            if lay == 'architecture':
                score += 100
            elif lay == 'work':
                score += 20
            else:  # decisión u otra capa: arrastre, señal débil
                score += 5
    _, files, _ = route_context(brain, route)
    score += max(0, 20 - len(files))  # rutas enfocadas pesan más
    return score


def _md_section(text: str, heading: str) -> str:
    """Extrae el contenido bajo `## heading` hasta el próximo `## `."""
    m = re.search(r'(?ms)^##\s+' + re.escape(heading) + r'\s*\n(.*?)(?=^##\s|\Z)', text)
    return m.group(1).strip() if m else ''


# ─────────────────────────────────────────────────────────────────────────────
# Migajas de lenguaje (aliases): traducen el vocabulario humano del usuario a
# rutas técnicas. Se aprenden cuando la IA RESUELVE (no cuando el usuario habla).
# ─────────────────────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    """Normaliza: sin tildes, minúsculas, espacios colapsados (cámara~camara)."""
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'\s+', ' ', s.lower()).strip()


def match_alias(brain: dict[str, Any], task: str) -> dict[str, Any] | None:
    """La migaja más específica (frase más larga) contenida en la tarea."""
    t = _norm(task)
    best, best_len = None, -1
    for a in brain.get('aliases', []):
        if a.get('confidence') == 'stale':
            continue
        p = _norm(a.get('phrase', ''))
        if p and p in t and len(p) > best_len:
            best, best_len = a, len(p)
    return best


def learn(project: Path, phrase: str, route: str, files: list[str] | None = None,
          symbols: list[str] | None = None, confidence: str = 'inferred',
          intent: str | None = None, reason: str | None = None) -> None:
    project = project.resolve()
    brain = load_brain(project)
    if not _norm(phrase):
        raise SystemExit('La frase (--phrase) está vacía.')
    if confidence not in ALIAS_CONFIDENCE:
        raise SystemExit(f'confidence inválida: {confidence}. Usá {sorted(ALIAS_CONFIDENCE)}.')
    if not any(r.get('slug') == route for r in brain.get('routes', [])):
        avail = ', '.join(r['slug'] for r in brain.get('routes', []))
        raise SystemExit(f'Ruta desconocida: {route}. Disponibles: {avail}')

    aliases = brain.setdefault('aliases', [])
    existing = next((a for a in aliases if _norm(a.get('phrase', '')) == _norm(phrase)), None)
    if existing:
        existing['route'] = route
        existing['confidence'] = confidence
        if files:
            existing['files'] = sorted(set((existing.get('files') or []) + files))
        if symbols:
            existing['symbols'] = sorted(set((existing.get('symbols') or []) + symbols))
        if intent:
            existing['intent'] = intent
        if reason:
            existing['reason'] = reason
        action = 'actualizado'
    else:
        alias = {'phrase': phrase, 'route': route, 'files': files or [],
                 'symbols': symbols or [], 'confidence': confidence,
                 'learnedAt': now_iso(), 'hits': 0}
        if intent:
            alias['intent'] = intent
        if reason:
            alias['reason'] = reason
        aliases.append(alias)
        action = 'aprendido'
    persist(project, brain)
    print(f'Alias {action}: "{phrase}" → {route} ({confidence})')


def list_aliases(project: Path) -> None:
    brain = load_brain(project.resolve())
    al = brain.get('aliases', [])
    if not al:
        print('# Sin migajas de lenguaje aún. La IA las deja con `brain learn` al resolver.')
        return
    print('# Migajas de lenguaje (frase humana → ruta)')
    print()
    for a in sorted(al, key=lambda x: x.get('confidence', '')):
        line = f'- "{a.get("phrase","")}" → {a.get("route","?")} ({a.get("confidence","?")})'
        if a.get('intent'):
            line += f' · {a["intent"]}'
        print(line)


def forget(project: Path, phrase: str) -> None:
    project = project.resolve()
    brain = load_brain(project)
    pn = _norm(phrase)
    before = len(brain.get('aliases', []))
    brain['aliases'] = [a for a in brain.get('aliases', []) if _norm(a.get('phrase', '')) != pn]
    if len(brain['aliases']) == before:
        print(f'No había ningún alias "{phrase}".')
        return
    persist(project, brain)
    print(f'Alias olvidado: "{phrase}"')


# Relevancia por palabras clave (sin embeddings: barato y portable).
_STOPWORDS = {
    'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'para', 'por',
    'con', 'y', 'o', 'u', 'en', 'a', 'al', 'que', 'se', 'su', 'sus', 'lo', 'del',
    'le', 'les', 'mi', 'este', 'esta', 'eso', 'esa', 'como', 'the', 'of', 'to',
    'and', 'is', 'in', 'on', 'for', 'with', 'add', 'fix',
}


def _keywords(text: str) -> set[str]:
    words = re.findall(r'[a-zA-ZáéíóúñÁÉÍÓÚÑ0-9_]+', (text or '').lower())
    return {w for w in words if len(w) >= 3 and w not in _STOPWORDS}


def _kw_overlap(a: set[str], b: set[str]) -> int:
    """Coincidencias entre dos sets de keywords, tolerando plurales/conjugaciones
    simples por prefijo (relieve~relieves, export~exportar)."""
    count = 0
    for x in a:
        for y in b:
            if x == y or (len(x) >= 4 and len(y) >= 4 and (x.startswith(y) or y.startswith(x))):
                count += 1
                break
    return count


def _node_text(node: dict[str, Any]) -> str:
    return ' '.join([
        node.get('id', ''), node.get('title', ''),
        node.get('summary', ''), node.get('description', ''),
    ] + (node.get('files') or []))


def _file_gravity(brain: dict[str, Any], path: str) -> int:
    """Peso de un archivo: cuántos nodos/links lo referencian."""
    g = 0
    for layer in brain.get('layers', {}).values():
        for n in layer.get('nodes', []):
            if path in (n.get('files') or []):
                g += 1
    for link in brain.get('links', []):
        if link.get('to') in (f'file:{path}', path):
            g += 1
    return g


def rank_routes_by_task(brain: dict[str, Any], task: str):
    """Rankea rutas por relevancia. La IDENTIDAD de la ruta (slug/título) pesa
    mucho más que archivos heredados por arrastre, para no confundir rutas."""
    kw = _keywords(task)
    scored = []
    for r in brain.get('routes', []):
        nodes, files, _ = route_context(brain, r)
        identity_kw = _keywords(f"{r.get('slug','')} {r.get('title','')}")
        node_kw = _keywords(' '.join(_node_text(n) for n in nodes))
        file_hits = sum(1 for f in files for k in kw if k in f.lower())
        score = _kw_overlap(kw, identity_kw) * 5 + _kw_overlap(kw, node_kw) * 2 + file_hits
        scored.append((score, r))
    scored.sort(key=lambda t: -t[0])
    return scored


def rank_files_by_task(brain: dict[str, Any], files: list[str], task: str) -> list[str]:
    kw = _keywords(task)
    def fscore(f: str) -> int:
        return sum(1 for k in kw if k in f.lower()) * 5 + _file_gravity(brain, f)
    return sorted(files, key=lambda f: -fscore(f))


def clarification_hint(task: str, alternatives: str = '') -> list[str]:
    """One-question fallback when the compass cannot map an ambiguous task.

    The goal is not to ask an interrogation. It is to stop the AI from touching
    code blindly and request the cheapest evidence that disambiguates the route.
    """
    out = ['# Aclaración mínima sugerida']
    if alternatives:
        out.append(f'# No estoy seguro de la habitación correcta. Alternativas: {alternatives}.')
    else:
        out.append(f'# No encontré una ruta clara para: "{task}".')
    out.append('# Pregunta una sola cosa y espera respuesta:')
    out.append('# ¿Está en Etapa 0, Etapa 1 o en la herramienta de cotas?')
    out.append('# O mandame una captura marcando la zona y entro directo.')
    return out


def build_route_packet(project: Path, brain: dict[str, Any], route: dict[str, Any],
                       budget: str = 'normal', task: str | None = None) -> str:
    """Arma el paquete de una ruta según presupuesto: short | normal | deep | <tokens>."""
    nodes, files, rel = route_context(brain, route)
    if task:
        files = rank_files_by_task(brain, files, task)
    md_path = brain_dir(project) / 'context' / 'routes' / f"{route['slug']}.md"
    md = md_path.read_text(encoding='utf-8') if md_path.exists() else ''
    objetivo = _md_section(md, 'Para qué sirve')
    validacion = _md_section(md, 'Cómo modificar con seguridad')
    obj1 = objetivo.split('\n')[0] if objetivo else ''
    top_risk = rel['risks'][0] if rel['risks'] else None
    title = route.get('title', route['slug'])

    def short() -> list[str]:
        out = [f'# Ruta: {title}', '']
        if obj1: out += [obj1, '']
        if files: out += ['## Archivos top'] + [f'- {f}' for f in files[:3]] + ['']
        if top_risk:
            out += ['## Riesgo principal',
                    f'- [{top_risk.get("severity","?")}] {top_risk.get("title","")}', '']
        return out

    def normal() -> list[str]:
        out = [f'# Ruta: {title}', '']
        if objetivo: out += ['## Objetivo', objetivo, '']
        if files: out += ['## Archivos'] + [f'- {f}' for f in files] + ['']
        if rel['decisions']:
            out += ['## Decisiones vigentes'] + \
                   [f'- {d.get("title","")}: {d.get("summary","")}' for d in rel['decisions']] + ['']
        if rel['risks']:
            out += ['## Riesgos / No tocar'] + \
                   [f'- [{r.get("severity","?")}] {r.get("title","")}: {r.get("summary","")}' for r in rel['risks']] + ['']
        if rel['work']:
            out += ['## Trabajos relacionados'] + \
                   [f'- {w.get("title","")} ({w.get("status","?")})' for w in rel['work']] + ['']
        if validacion: out += ['## Validación', validacion, '']
        return out

    def deep() -> list[str]:
        out = normal()
        if nodes:
            out += ['## Nodos (detalle)'] + \
                   [f'- {n.get("id")}: {n.get("title","")} — {n.get("summary","")}' for n in nodes] + ['']
        return out

    if budget == 'short':
        text = '\n'.join(short()).rstrip()
    elif budget == 'deep':
        text = '\n'.join(deep()).rstrip()
    elif isinstance(budget, int):  # presupuesto en tokens (~chars/4)
        text = '\n'.join(normal()).rstrip()
        if len(text) // 4 > budget:
            text = '\n'.join(short()).rstrip()
        if len(text) // 4 > budget:
            text = text[:budget * 4].rstrip() + '\n# … (recortado por budget)'
    else:
        text = '\n'.join(normal()).rstrip()
    return text


def _parse_budget(value: str | None):
    if not value:
        return 'normal'
    if value.isdigit():
        return int(value)
    if value in ('short', 'normal', 'deep'):
        return value
    raise SystemExit(f'Budget inválido: {value}. Usá short|normal|deep o un número de tokens.')


def context(project: Path, route_slug: str | None = None, file_path: str | None = None,
            task: str | None = None, budget: str | None = None,
            section: str | None = None) -> None:
    project = project.resolve()
    bd = brain_dir(project)
    budget_val = _parse_budget(budget)

    # archivo + sección/símbolos: mapa para entrar a un archivo grande sin leerlo entero.
    if file_path and section is not None:
        file_sections(project, file_path, section or None)
        return

    # tarea -> ruta por relevancia (modo "prompt pack").
    if task:
        brain = load_brain(project)
        routes_by_slug = {r['slug']: r for r in brain.get('routes', [])}

        # 1º: ¿hay una migaja de lenguaje que ya traduce esta frase? (conocimiento > inferencia)
        alias = match_alias(brain, task)
        if alias and alias.get('route') in routes_by_slug:
            route = routes_by_slug[alias['route']]
            conf = {'verified': 'alta', 'user-confirmed': 'alta',
                    'inferred': 'media'}.get(alias.get('confidence'), 'media')
            scored = rank_routes_by_task(brain, task)
            alts = ', '.join(r['slug'] for s, r in scored if r['slug'] != route['slug'] and s > 0)
            print(f'# Tarea: {task}')
            print(f'# Ruta recomendada: {route["slug"]}  | confianza: {conf}')
            print(f'# Alias aprendido: "{alias["phrase"]}" → {alias["route"]} ({alias.get("confidence")})')
            if alias.get('intent'):
                print(f'# Intención: {alias["intent"]}')
            print()
            text = build_route_packet(project, brain, route, budget_val, task)
            print(text)
            print(f'\n# (~{len(text.splitlines())} líneas / {len(text)} chars / ~{len(text)//4} tokens)', file=sys.stderr)
            return

        # 2: sin migaja, ranking por keywords.
        scored = rank_routes_by_task(brain, task)
        if not scored or scored[0][0] == 0:
            avail = ', '.join(r['slug'] for r in brain.get('routes', [])) or '(ninguna)'
            print('\n'.join(clarification_hint(task)))
            print(f'# Rutas disponibles: {avail}')
            print('# Si la resolvés, dejá una migaja: brain learn --phrase "..." --route <slug>')
            return
        route = scored[0][1]
        top = scored[0][0]
        second = scored[1][0] if len(scored) > 1 else 0
        gap = top - second
        if top <= 2 or gap == 0:
            confidence = 'baja'
        elif gap >= max(2, top * 0.4):
            confidence = 'alta'
        else:
            confidence = 'media'
        alts = ', '.join(r['slug'] for s, r in scored[1:3] if s > 0)
        print(f'# Tarea: {task}')
        print(f'# Ruta recomendada: {route["slug"]}  | confianza: {confidence}')
        if confidence != 'alta' and alts:
            print(f'# Tarea ambigua - alternativas: {alts}')
        if confidence == 'baja':
            print()
            print('\n'.join(clarification_hint(task, alts)))
            print('# No codees todavía: pedí esa aclaración y esperá respuesta.')
            return
        print()
        text = build_route_packet(project, brain, route, budget_val, task)
        print(text)
        print(f'\n# (~{len(text.splitlines())} líneas / {len(text)} chars / ~{len(text)//4} tokens)', file=sys.stderr)
        return

    # archivo -> ruta más específica.
    if file_path and not route_slug:
        brain = load_brain(project)
        order = {r['slug']: i for i, r in enumerate(brain.get('routes', []))}
        scored = []
        for r in brain.get('routes', []):
            _, files, _ = route_context(brain, r)
            if file_path in files:
                scored.append((_route_specificity(brain, r, file_path), r['slug']))
        if not scored:
            avail = ', '.join(r['slug'] for r in brain.get('routes', [])) or '(ninguna)'
            print(f'# Ninguna ruta cubre {file_path}.\n# Rutas disponibles: {avail}')
            return
        scored.sort(key=lambda t: (-t[0], order[t[1]]))
        route_slug = scored[0][1]
        if len(scored) > 1:
            alts = ', '.join(s for _, s in scored[1:])
            print(f'# {file_path} aparece en varias rutas.')
            print(f'# Recomendada: {route_slug}')
            print(f'# Alternativas: {alts}\n')

    # sin ruta: la brújula (current.md), que ya es corta por diseño.
    if not route_slug:
        cur = bd / 'context' / 'current.md'
        if cur.exists():
            print(cur.read_text(encoding='utf-8').rstrip())
        else:
            print('# Falta context/current.md. Corré: python brain.py init')
        return

    # paquete de una ruta concreta, con presupuesto.
    brain = load_brain(project)
    route = next((r for r in brain.get('routes', []) if r['slug'] == route_slug), None)
    if not route:
        avail = ', '.join(r['slug'] for r in brain.get('routes', []))
        raise SystemExit(f'Ruta desconocida: {route_slug}. Disponibles: {avail}')
    text = build_route_packet(project, brain, route, budget_val)
    print(text)
    print(f'\n# (~{len(text.splitlines())} líneas / {len(text)} chars / ~{len(text)//4} tokens)', file=sys.stderr)


def impact(project: Path, file_path: str) -> None:
    """Impacto inverso: qué rutas/decisiones/riesgos/trabajos toca un archivo."""
    project = project.resolve()
    brain = load_brain(project)
    fref = f'file:{file_path}'

    routes_hit = []
    for r in brain.get('routes', []):
        _, files, _ = route_context(brain, r)
        if file_path in files:
            routes_hit.append(r)

    by_layer: dict[str, list[dict[str, Any]]] = {}
    for lname, layer in brain.get('layers', {}).items():
        for n in layer.get('nodes', []):
            if file_path in (n.get('files') or []):
                by_layer.setdefault(lname, []).append(n)

    out = [f'# Impacto de cambiar: {file_path}', '']
    if routes_hit:
        out += ['## Rutas afectadas'] + \
               [f'- {r.get("title", r["slug"])} ({r["slug"]})' for r in routes_hit] + ['']
    labels = {'decisions': 'Decisiones', 'risks': 'Riesgos', 'work': 'Trabajos',
              'architecture': 'Módulos', 'product': 'Producto', 'todo': 'TODOs',
              'interaction': 'Interacción'}
    for lname in ('decisions', 'risks', 'work', 'architecture', 'product', 'todo', 'interaction'):
        nodes = by_layer.get(lname)
        if nodes:
            out += [f'## {labels[lname]}'] + [
                f'- {n.get("title", n.get("id"))}' + (f' [{n["severity"]}]' if n.get('severity') else '')
                for n in nodes
            ] + ['']
    if not routes_hit and not by_layer:
        out += [f'# {file_path} no está mapeado en el brain todavía.']
    text = '\n'.join(out).rstrip()
    print(text)
    print(f'\n# (~{len(text.splitlines())} líneas / {len(text)} chars)', file=sys.stderr)


# ─────────────────────────────────────────────────────────────────────────────
# hotspots — archivos con alto costo de contexto (deuda cognitiva + de tokens)
# ─────────────────────────────────────────────────────────────────────────────

def _count_signals(text: str) -> tuple[int, int, int]:
    exports = len(re.findall(r'(?m)^\s*export\b', text))
    funcs = len(re.findall(
        r'\bfunction\s+\w+|\bconst\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|\bclass\s+\w+', text))
    hooks = len(re.findall(r'\buse(?:State|Ref|Effect|Memo|Callback|Reducer)\b', text))
    return exports, funcs, hooks


_GENERIC_TOKENS = {
    'handle', 'create', 'update', 'get', 'set', 'use', 'draw', 'make', 'add',
    'remove', 'value', 'props', 'state', 'data', 'node', 'item', 'index',
    'event', 'ref', 'current', 'default', 'render', 'build', 'compute', 'apply',
}


def detected_responsibilities(text: str) -> list[str]:
    """Temas recurrentes en los nombres de símbolos (data-driven, no hardcodeado)."""
    from collections import Counter
    tokens: Counter[str] = Counter()
    for name, _ in extract_symbols(text):
        for part in re.findall(r'[A-Z]?[a-z]{3,}', name):
            tokens[part.lower()] += 1
    common = [w for w, c in tokens.most_common(25) if w not in _GENERIC_TOKENS and c >= 3]
    return common[:6]


def file_cost(project: Path, brain: dict[str, Any], path: str) -> dict[str, Any] | None:
    try:
        text = (project / path).read_text(encoding='utf-8', errors='ignore')
    except OSError:
        return None
    lines = text.count('\n') + 1
    routes_ref = sum(1 for r in brain.get('routes', []) if path in route_context(brain, r)[1])
    if path.lower().endswith(('.css', '.scss', '.sass', '.less')):
        blocks = text.count('{')
        media = text.count('@media')
        cost = lines + blocks + media * 5 + routes_ref * 10
        detail = (f'{lines} líneas · {blocks} bloques · {media} @media · '
                  f'{routes_ref} ruta(s) lo referencian')
        resp: list[str] = []
    else:
        exports, funcs, hooks = _count_signals(text)
        cost = lines + exports * 5 + funcs * 3 + hooks * 2 + routes_ref * 10
        detail = (f'{lines} líneas · {funcs} funciones · {exports} exports · '
                  f'{hooks} hooks React · {routes_ref} ruta(s) lo referencian')
        resp = detected_responsibilities(text)
    band = next((b for thr, b in HOTSPOT_BANDS if lines > thr), None)
    return {'path': path, 'lines': lines, 'routes': routes_ref, 'cost': cost,
            'band': band, 'detail': detail, 'responsibilities': resp}


def hotspots(project: Path, threshold: int = 800) -> None:
    project = project.resolve()
    brain = load_brain(project)
    risk_files: set[str] = set()
    for n in brain.get('layers', {}).get('risks', {}).get('nodes', []):
        for f in n.get('files', []):
            risk_files.add(f)
    results = []
    for f in brain.get('files', []):
        if f.get('kind') in CODE_KINDS:
            info = file_cost(project, brain, f['path'])
            if info and info['lines'] >= threshold:
                results.append(info)
    results.sort(key=lambda d: -d['cost'])
    if not results:
        print(f'# Ningún archivo ≥ {threshold} líneas. Nada caliente. 🎉')
        return
    out = ['# Hotspots — archivos con alto costo de contexto', '']
    for d in results:
        out.append(f"## {d['path']}  [{d['band']}]")
        out.append(f"- {d['detail']}")
        out.append(f"- costo cognitivo ~{d['cost']}")
        if d.get('responsibilities'):
            out.append(f"- responsabilidades detectadas: {', '.join(d['responsibilities'])}")
        if d['path'] in risk_files:
            out.append('- ya está en riesgos ✓')
        elif d['band'] in ('critical', 'hotspot'):
            out.append('- sugerencia: promover a riesgo (brain note --layer risks) y dividir por responsabilidades')
        if d['band'] == 'critical':
            out.append('- la IA NO debería leerlo entero: `context --file <path> --section <tema>`')
        out.append('')
    text = '\n'.join(out).rstrip()
    print(text)
    print(f'\n# ({len(results)} archivos ≥ {threshold} líneas)', file=sys.stderr)


# ─────────────────────────────────────────────────────────────────────────────
# símbolos — entrar a un archivo grande con mapa, no tragarlo entero
# ─────────────────────────────────────────────────────────────────────────────

def extract_symbols(text: str) -> list[tuple[str, int]]:
    """Heurística (no parser): declaraciones top-level con su línea."""
    syms: list[tuple[str, int]] = []
    for i, line in enumerate(text.splitlines(), 1):
        m = (re.match(r'\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)', line)
             or re.match(r'\s*(?:export\s+)?const\s+(\w+)\s*=', line)
             or re.match(r'\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)', line)
             or re.match(r'\s*(?:export\s+)?(?:interface|type|enum)\s+(\w+)', line))
        if m:
            syms.append((m.group(1), i))
    return syms


def _containing_symbol(syms: list[tuple[str, int]], line: int) -> str | None:
    """El símbolo top-level cuyo cuerpo contiene esa línea (el último que empezó antes)."""
    best = None
    for name, start in syms:
        if start <= line:
            best = name
        else:
            break
    return best


def _line_ranges(text: str, kw: set[str], gap: int = 12, pad: int = 4):
    """Agrupa menciones del tema en rangos quirúrgicos.

    No devuelve solo la línea exacta del match: agrega un poco de contexto antes
    y después para que la IA lea una mini-habitación coherente, no una coordenada
    suelta. Luego fusiona rangos cercanos para evitar saltos innecesarios.
    """
    lines = text.splitlines()
    total = len(lines)
    hits = [i for i, l in enumerate(lines, 1)
            if any(k in l.lower() for k in kw)]
    clusters: list[list[int]] = []
    for h in hits:
        if clusters and h - clusters[-1][1] <= gap:
            clusters[-1][1] = h
        else:
            clusters.append([h, h])

    ranges: list[list[int]] = []
    for a, b in clusters:
        start = max(1, a - pad)
        end = min(total, b + pad)
        if ranges and start - ranges[-1][1] <= gap:
            ranges[-1][1] = max(ranges[-1][1], end)
        else:
            ranges.append([start, end])
    return ranges, hits


def _range_hits(hits: list[int], start: int, end: int) -> int:
    return sum(1 for h in hits if start <= h <= end)


def file_sections(project: Path, file_path: str, section: str | None) -> None:
    try:
        text = (project / file_path).read_text(encoding='utf-8', errors='ignore')
    except OSError:
        raise SystemExit(f'No pude leer {file_path}.')
    total = text.count('\n') + 1
    syms = extract_symbols(text)

    # sin tema: listado de símbolos top-level (mapa general del archivo).
    if not section:
        out = [f'# Símbolos en {file_path} ({total} líneas)', '']
        out += [f'- L{ln}: {name}' for name, ln in syms[:60]]
        text_out = '\n'.join(out).rstrip()
        print(text_out)
        print(f'\n# ({len(syms)} símbolos de {total} líneas)', file=sys.stderr)
        return

    # con tema: rangos de lectura agrupados, etiquetados con su símbolo contenedor.
    kw = _keywords(section)
    ranges, hits = _line_ranges(text, kw)
    out = [f'# Mapa de lectura: {file_path} ({total} líneas)',
           f'# Tema: "{section}" — {len(hits)} menciones', '']
    if not ranges:
        out.append('# Sin coincidencias. Probá otro término o mirá `brain hotspots`.')
    else:
        CAP = 25
        # Los rangos más densos primero; luego se listan en orden de lectura.
        shown = sorted(ranges, key=lambda r: -_range_hits(hits, r[0], r[1]))[:CAP]
        shown.sort(key=lambda r: r[0])
        for a, b in shown:
            sym = _containing_symbol(syms, a)
            label = f' — {sym}' if sym else ''
            span = f'L{a}-L{b}' if b > a else f'L{a}'
            mentions = _range_hits(hits, a, b)
            out.append(f'- {span}{label} ({mentions} menciones)')
        covered = sum(b - a + 1 for a, b in shown)
        out.append('')
        if len(ranges) > CAP:
            out.append(f'# {len(ranges)} focos en total (muestro los {CAP} más densos). '
                       'El tema satura el archivo: afiná el término o considerá dividirlo.')
        out.append(f'# Leé esos rangos mostrados (~{covered} líneas), no las {total} completas.')
        out.append('# Si el tema sigue siendo enorme, probá un término más específico.')
    text_out = '\n'.join(out).rstrip()
    print(text_out)
    print(f'\n# ({len(ranges)} rangos / {len(hits)} menciones de {total} líneas)', file=sys.stderr)


def open_viewer(project: Path) -> None:
    project = project.resolve()
    viewer = brain_dir(project) / 'viewer.html'
    if not viewer.exists():
        init(project)
    if sys.platform.startswith('win'):
        os.startfile(str(viewer))  # type: ignore[attr-defined]
    elif sys.platform == 'darwin':
        subprocess.run(['open', str(viewer)], check=False)
    else:
        subprocess.run(['xdg-open', str(viewer)], check=False)
    print(f'Visor abierto: {viewer}')


def main() -> None:
    # La consola de Windows suele ser cp1252 y no puede imprimir ✓/✗/acentos.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8')  # type: ignore[attr-defined]
        except Exception:
            pass

    parser = argparse.ArgumentParser(description='CLI del Mapa Mental del Proyecto')
    sub = parser.add_subparsers(dest='cmd', required=True)

    p_init = sub.add_parser('init', help='Inicializa .project-brain')
    p_init.add_argument('project', nargs='?', default='.')

    p_scan = sub.add_parser('scan', help='Rastrea archivos (preserva arquitectura curada)')
    p_scan.add_argument('project', nargs='?', default='.')

    p_sync = sub.add_parser('sync', help='Re-inyecta brain.json en viewer y mapas')
    p_sync.add_argument('project', nargs='?', default='.')

    p_val = sub.add_parser('validate', help='Revisa integridad del brain')
    p_val.add_argument('project', nargs='?', default='.')

    p_ctx = sub.add_parser('context', help='Contexto COMPACTO para la IA (brújula, ruta, archivo o tarea)')
    p_ctx.add_argument('project', nargs='?', default='.')
    p_ctx.add_argument('--route', default=None, help='slug de la ruta')
    p_ctx.add_argument('--file', default=None, help='archivo -> busca la ruta que lo cubre')
    p_ctx.add_argument('--task', default=None, help='tarea en lenguaje natural -> ruta por relevancia')
    p_ctx.add_argument('--budget', default=None, help='short | normal | deep | <nº de tokens>')
    p_ctx.add_argument('--section', default=None,
                       help='con --file: mapa de símbolos del archivo (filtrado por tema)')

    p_imp = sub.add_parser('impact', help='Impacto inverso de un archivo (qué rutas/decisiones/riesgos toca)')
    p_imp.add_argument('project')
    p_imp.add_argument('--file', required=True)

    p_hot = sub.add_parser('hotspots', help='Archivos con alto costo de contexto (deuda cognitiva)')
    p_hot.add_argument('project', nargs='?', default='.')
    p_hot.add_argument('--threshold', type=int, default=800, help='líneas mínimas (default 800)')

    p_learn = sub.add_parser('learn', help='Registra una migaja de lenguaje (frase humana -> ruta)')
    p_learn.add_argument('project')
    p_learn.add_argument('--phrase', required=True)
    p_learn.add_argument('--route', required=True)
    p_learn.add_argument('--file', action='append', default=None, dest='files')
    p_learn.add_argument('--symbol', action='append', default=None, dest='symbols')
    p_learn.add_argument('--confidence', default='inferred', choices=sorted(ALIAS_CONFIDENCE))
    p_learn.add_argument('--intent', default=None)
    p_learn.add_argument('--reason', default=None)

    p_al = sub.add_parser('aliases', help='Lista las migajas de lenguaje aprendidas')
    p_al.add_argument('project', nargs='?', default='.')

    p_forget = sub.add_parser('forget', help='Olvida una migaja de lenguaje')
    p_forget.add_argument('project')
    p_forget.add_argument('--phrase', required=True)

    p_open = sub.add_parser('open', help='Abre el viewer en el navegador (herramienta humana)')
    p_open.add_argument('project', nargs='?', default='.')

    p_route = sub.add_parser('route', help='Crea el esqueleto de una ruta de navegación')
    p_route.add_argument('project')
    p_route.add_argument('--slug', required=True)
    p_route.add_argument('--title', default=None)

    p_note = sub.add_parser('note', help='Agrega un nodo a una capa')
    p_note.add_argument('project')
    p_note.add_argument('--layer', required=True, choices=LAYER_ORDER)
    p_note.add_argument('--title', required=True)
    p_note.add_argument('--summary', required=True)
    p_note.add_argument('--status', default='active')
    p_note.add_argument('--confidence', default='inferred', choices=sorted(VALID_CONFIDENCE))

    p_ins = sub.add_parser('insight', help='Agrega síntesis humana breve para el viewer')
    p_ins.add_argument('project')
    p_ins.add_argument('--route', required=True)
    p_ins.add_argument('--title', required=True)
    p_ins.add_argument('--summary', required=True)
    p_ins.add_argument('--kind', default='user-map')
    p_ins.add_argument('--confidence', default='inferred', choices=sorted(VALID_CONFIDENCE))

    args = parser.parse_args()
    project = Path(args.project)
    if args.cmd == 'init':
        init(project)
    elif args.cmd == 'scan':
        scan(project)
    elif args.cmd == 'sync':
        sync(project)
    elif args.cmd == 'validate':
        raise SystemExit(1 if validate(project) else 0)
    elif args.cmd == 'context':
        context(project, args.route, args.file, args.task, args.budget, args.section)
    elif args.cmd == 'impact':
        impact(project, args.file)
    elif args.cmd == 'hotspots':
        hotspots(project, args.threshold)
    elif args.cmd == 'learn':
        learn(project, args.phrase, args.route, args.files, args.symbols,
              args.confidence, args.intent, args.reason)
    elif args.cmd == 'aliases':
        list_aliases(project)
    elif args.cmd == 'forget':
        forget(project, args.phrase)
    elif args.cmd == 'open':
        open_viewer(project)
    elif args.cmd == 'route':
        route(project, args.slug, args.title)
    elif args.cmd == 'note':
        add_note(project, args.layer, args.title, args.summary, args.status, args.confidence)
    elif args.cmd == 'insight':
        add_insight(project, args.route, args.title, args.summary, args.kind, args.confidence)


if __name__ == '__main__':
    main()
