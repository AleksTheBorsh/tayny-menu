#!/usr/bin/env bash
# Выкатка виджета на сайт (запускать ТОЛЬКО на нашем боксе). Сниппеты в Tilda при этом НЕ меняются:
#  1) код и статика (widget.js, menupdf.js, logo.png, фото) — коммитом в tayny-live (если что-то изменилось);
#  2) version.json → хэш последнего коммита с кодом. Постоянный loader.js на страницах подхватит его
#     в течение ~5 минут (столько CDN GitHub держит version.json).
# Откат:  ./deploy_widget.sh --rollback <хэш>   — просто переписывает version.json на старую версию.
set -euo pipefail
CODE="$(cd "$(dirname "$0")" && pwd)"; LIVE="${TAYNY_LIVE_DIR:-$(dirname "$CODE")/tayny-live}"
REPO=AleksTheBorsh/tayny-live
FILES=(widget.js menupdf.js logo.png 'sec_*.jpg' kam_hero.jpg)     # pathspec для git (глоб в кавычках)
g() { git -C "$LIVE" "$@"; }
sync() { g fetch -q origin && g reset -q --hard origin/main; }
push_retry() { for i in 1 2 3; do g push -q origin HEAD 2>/dev/null && return 0; sync; "$@"; done; echo "push не прошёл" >&2; return 1; }
cur_version() { python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('widget',''))" "$LIVE/version.json" 2>/dev/null || true; }
write_version() {
  printf '{"widget": "%s", "updated": "%s"}\n' "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LIVE/version.json"
  g add version.json; g diff --cached --quiet || g commit -q -m "version.json → $1"
}
copy_code() {
  cp "$CODE"/widget.js "$CODE"/menupdf.js "$CODE"/logo.png "$CODE"/sec_*.jpg "$CODE"/kam_hero.jpg "$LIVE"/
  g add -- "${FILES[@]}"; g diff --cached --quiet || g commit -q -m "widget $(date '+%Y-%m-%d %H:%M')"
}

if [ "${1:-}" = "--rollback" ]; then
  V="${2:?укажи хэш версии}"; sync; write_version "$V"; push_retry write_version "$V"
  echo "откат: version.json → $V (на сайте — в течение ~5 мин)"; exit 0
fi

sync; copy_code; push_retry copy_code
X=$(g log -1 --format=%h -- "${FILES[@]}")            # последний коммит, менявший код/статику
if [ "$(cur_version)" = "$X" ]; then echo "код не менялся, уже выкачено: widget@$X"; exit 0; fi
for i in $(seq 1 20); do                                  # jsDelivr подхватывает новый коммит не мгновенно
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://cdn.jsdelivr.net/gh/$REPO@$X/widget.js" || true)
  [ "$code" = 200 ] && break; sleep 3
done
[ "$code" = 200 ] || { echo "jsDelivr не отдаёт widget@$X (HTTP $code) — version.json НЕ переключаю" >&2; exit 1; }
sync; write_version "$X"; push_retry write_version "$X"
echo "выкачено: widget@$X; version.json → $X (на сайте — в течение ~5 мин)"
