# Badge Card (FR)

Carte Home Assistant « **derniers passages de badge** » : une ligne par personne avec ses initiales, l'heure du dernier passage (relative « il y a 3 h 20 » et absolue « Aujourd'hui à 18:03 »). Les passages récents sont mis en avant en vert, les anciens sont estompés mais toujours visibles, « Pas encore de passage » si l'entité est vide. Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → `https://github.com/Johan854/badge-card`, catégorie **Tableau de bord**. Puis recharger le navigateur (Ctrl+F5).

## Exemple
```yaml
type: custom:badge-card
title: Accès
recent_minutes: 60
old_days: 7
people:
  - input_text.badge_johan
  - input_text.badge_julie
  - entity: input_text.badge_marie_luce
    name: Marie-Luce
```

## Formats d'heure lus
`28/10/2026 18:42`, `2026-10-28 18:42:05` (ISO), `18:42` (aujourd'hui, ou hier si l'heure est dans le futur), timestamp Unix. Une valeur non reconnue est affichée telle quelle. Si la valeur ne contient pas de date, utilise `time_source: changed` (heure du dernier changement de l'entité).

## Options
| Option | Défaut | Description |
|---|---|---|
| `people` | `[]` | Liste d'entités (`input_text`, `input_datetime`, `sensor`…) ou d'objets `{entity, name, icon}` |
| `title` | `Accès` | Titre |
| `recent_minutes` | `60` | Un passage plus récent est mis en avant |
| `old_days` | `7` | Au-delà, la ligne est estompée |
| `sort_by_recent` | `false` | Trier du plus récent au plus ancien |
| `time_source` | `auto` | `auto` (valeur de l'entité), `value`, `changed` (dernier changement) |
| `empty_text` | `Pas encore de passage` | Texte si aucun passage |
| `theme` | `auto` | `auto`, `light`, `dark` |

Clic sur une ligne : détails de l'entité. Le bloc « Nuance de couleur » est identique à celui des autres cartes.
