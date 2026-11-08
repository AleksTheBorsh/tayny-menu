#!/usr/bin/env bash
# Выкатка виджета на сайт (запускать ТОЛЬКО на нашем боксе). Сниппеты в Tilda при этом не меняются.
#  1) кладёт код и статику (widget.js, menupdf.js, logo.png, фото) в tayny-live отдельным коммитом X;
#  2) пишет version.json = X — постоянный loader.js на страницах начинает грузить версию X.
# Откат: ./deploy_widget.sh --rollback <хэш>   (просто переписывает version.json на старую версию)
set -euo pipefail
CODE="$(cd "$(dirname "$0")" && pwd)"; LIVE="${TAYNY_LIVE_DIR:-$(dirname "$CODE")/tayny-live}"
REPO=AleksTheBorsh/tayny-live
sync() { git -C "$LIVE" fetch -q origin && git -C "$LIVE" reset -q --hard origin/main; }
push_retry() { for i in 1 2 3; do git -C "$LIVE" push -q origin HEAD && return 0; sync; "$@"; done; return 1; }
write_version() {
  printf '{"widget": "%s", "updated": "%s"}\n' "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LIVE/version.json"
  git -C "$LIVE" add version.json
  git -C "$LIVE" commit -q -m "version.json → $1" || true
}
if [ "${1:-}" = "--rollback" ]; then
  V="${2:?укажи хэш версии}"; sync; write_version "$V"; push_retry write_version "$V"
  echo "откат: version.json → $V"; exit 0
fi
copy_code() {
  cp "$CODE"/widget.js "$CODE"/menupdf.js "$CODE"/logo.png "$CODE"/sec_*.jpg "$CODE"/kam_hero.jpg "$LIVE"/
  git -C "$LIVE" add widget.js menupdf.js logo.png sec_*.jpg kam_hero.jpg
  git -C "$LIVE" commit -q -m "widget $(date +%Y-%m-%d\ %H:%M)" || true
}
sync; copy_code; push_retry copy_code
X=$(git -C "$LIVE" rev-parse --short HEAD)
sync; write_version "$X"; push_retry write_version "$X"
for i in $(seq 1 10); do   # jsDelivr подхватывает новый коммит не мгновенно — ждём, пока отдаст
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://cdn.jsdelivr.net/gh/$REPO@$X/widget.js") && [ "$code" = 200 ] && break; sleep 3
done
echo "выкачено: widget@$X (jsDelivr: $code); version.json → $X"
