"""
Motor de reglas EPP — HydroAlia
Mapea herramientas detectadas → EPP requerido → valida lo que se ve en el frame
"""

from dataclasses import dataclass

# ─────────────────────────────────────────────
# Niveles de riesgo
# ─────────────────────────────────────────────
RIESGO_ALTO   = "ALTO"
RIESGO_MEDIO  = "MEDIO"
RIESGO_BAJO   = "BAJO"

# ─────────────────────────────────────────────
# Clases que el modelo puede detectar
# ─────────────────────────────────────────────
# EPP presente (OK)
PPE_PRESENT = {
    "hardhat", "safety vest", "mask", "gloves",
    "face shield", "safety glasses", "harness"
}
# EPP ausente (violación)
PPE_ABSENT = {
    "no-hardhat", "no-safety vest", "no-mask",
    "no-gloves", "no-face shield"
}
# Herramientas
TOOL_CLASSES = {
    "angle grinder", "drill", "circular saw", "welding",
    "ladder", "generator", "compactor", "machete",
    "sledgehammer", "shovel", "pickaxe"
}

# ─────────────────────────────────────────────
# Reglas: herramienta → EPP obligatorio
# ─────────────────────────────────────────────
@dataclass
class PPERule:
    tool_name: str           # nombre visible
    required_ppe: list[str]  # clases que DEBEN estar presentes
    risk_level: str
    description: str         # descripción de la tarea


RULES: dict[str, PPERule] = {

    # ── ELÉCTRICAS ─────────────────────────────
    "angle grinder": PPERule(
        tool_name    = "Pulidora / Amoladora",
        required_ppe = ["hardhat", "face shield", "gloves", "safety vest"],
        risk_level   = RIESGO_ALTO,
        description  = "Riesgo de proyección de partículas y chispas"
    ),
    "circular saw": PPERule(
        tool_name    = "Sierra circular",
        required_ppe = ["hardhat", "safety glasses", "gloves", "safety vest"],
        risk_level   = RIESGO_ALTO,
        description  = "Riesgo de corte y proyección de astillas"
    ),
    "drill": PPERule(
        tool_name    = "Taladro",
        required_ppe = ["safety glasses", "gloves"],
        risk_level   = RIESGO_MEDIO,
        description  = "Riesgo de proyección de polvo y perforación"
    ),
    "welding": PPERule(
        tool_name    = "Soldadora",
        required_ppe = ["face shield", "gloves", "safety vest", "mask"],
        risk_level   = RIESGO_ALTO,
        description  = "Riesgo de quemaduras, radiación UV y humos"
    ),
    "generator": PPERule(
        tool_name    = "Generador eléctrico",
        required_ppe = ["safety vest", "gloves"],
        risk_level   = RIESGO_MEDIO,
        description  = "Riesgo eléctrico y de combustible"
    ),

    # ── MANUALES PESADAS ────────────────────────
    "sledgehammer": PPERule(
        tool_name    = "Almágana / Martillo piqueta",
        required_ppe = ["hardhat", "safety glasses", "gloves", "safety vest"],
        risk_level   = RIESGO_ALTO,
        description  = "Riesgo de proyección de fragmentos"
    ),
    "compactor": PPERule(
        tool_name    = "Compactador",
        required_ppe = ["hardhat", "safety vest", "gloves"],
        risk_level   = RIESGO_MEDIO,
        description  = "Riesgo de vibración y atrapamiento"
    ),
    "machete": PPERule(
        tool_name    = "Machete",
        required_ppe = ["gloves", "safety vest"],
        risk_level   = RIESGO_MEDIO,
        description  = "Riesgo de corte"
    ),

    # ── EXCAVACIÓN ──────────────────────────────
    "shovel": PPERule(
        tool_name    = "Pala / Azadón / Piocha",
        required_ppe = ["hardhat", "safety vest", "gloves"],
        risk_level   = RIESGO_MEDIO,
        description  = "Riesgo de golpe y esfuerzo físico"
    ),
    "pickaxe": PPERule(
        tool_name    = "Piocha / Chancha",
        required_ppe = ["hardhat", "safety vest", "gloves", "safety glasses"],
        risk_level   = RIESGO_MEDIO,
        description  = "Riesgo de proyección de tierra y golpes"
    ),

    # ── ALTURA ──────────────────────────────────
    "ladder": PPERule(
        tool_name    = "Escalera (6' tijera / 28' extensión)",
        required_ppe = ["hardhat", "safety vest", "harness"],
        risk_level   = RIESGO_ALTO,
        description  = "Riesgo de caída en altura"
    ),
}

# ─────────────────────────────────────────────
# Función principal: evaluar frame
# ─────────────────────────────────────────────
def evaluate_frame(detections: list[dict]) -> list[dict]:
    """
    Recibe lista de detecciones YOLO:
      [{"class": "angle grinder", "confidence": 0.85}, ...]

    Retorna lista de violaciones contextuales:
      [{"tool": "Pulidora", "missing_ppe": ["face shield"], "risk": "ALTO", ...}]
    """
    detected_classes = {d["class"].lower() for d in detections}
    violations = []

    for tool_class, rule in RULES.items():
        if tool_class not in detected_classes:
            continue  # herramienta no detectada en este frame

        missing = []
        for ppe in rule.required_ppe:
            ppe_present     = ppe in detected_classes
            ppe_absent_flag = f"no-{ppe}" in detected_classes
            if not ppe_present or ppe_absent_flag:
                missing.append(ppe)

        if missing:
            violations.append({
                "tool":        rule.tool_name,
                "tool_class":  tool_class,
                "missing_ppe": missing,
                "risk_level":  rule.risk_level,
                "description": rule.description,
                "message":     _build_message(rule, missing),
            })

    return violations


def _build_message(rule: PPERule, missing: list[str]) -> str:
    ppe_labels = {
        "hardhat":       "casco",
        "face shield":   "careta facial",
        "gloves":        "guantes",
        "safety vest":   "chaleco",
        "mask":          "mascarilla",
        "safety glasses":"lentes de seguridad",
        "harness":       "arnés",
    }
    missing_str = ", ".join(ppe_labels.get(p, p) for p in missing)
    return f"{rule.tool_name} — falta: {missing_str} [{rule.risk_level}]"
