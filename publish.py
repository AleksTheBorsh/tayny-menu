#!/usr/bin/env python3
"""Публикация меню на сайт (GitHub CDN → виджет в Tilda).

Берёт menu.json + order.json из каталога кода, накладывает порядок (как отдаёт
витрина), кладёт результат в рабочую копию публичного репо tayny-live и делает
git commit + push. CDN (raw/jsDelivr) отдаёт это публично с CORS — Tilda читает
напрямую, свой сервер/туннель не нужен.

Куда публикуем (рабочая копия tayny-live):
  config.ini [rkeeper] live_dir=  /  env TAYNY_LIVE_DIR  /  по умолчанию — папка
  «tayny-live» рядом с кодом (на нашем боксе ~/sites/tayny-live, у клиента C:\\tayny-live).
Если копии нет — publish.py сам клонирует публичный репо (клон не требует токена).

Права на push:
  наш бокс — ssh-origin (gh-авторизация), токен не нужен;
  их Windows-бокс — HTTPS с fine-grained PAT: config.ini gh_token= / env GH_TOKEN
  (их сеть пускает исходящий 443). Токен в git не попадает (используется только в push).

Запускается кнопкой «Выгрузить на сайт» (serve.py → /api/publish) или вручную.
Выводит в stdout JSON-строку с результатом.
"""
import datetime
import json
import os
import shutil
import subprocess
import sys

from tkconfig import CFG

HERE = os.path.dirname(os.path.abspath(__file__))
LIVE = (CFG.get('live_dir') or os.environ.get('TAYNY_LIVE_DIR')
        or os.path.join(os.path.dirname(HERE), 'tayny-live'))
TOKEN = CFG.get('gh_token') or os.environ.get('GH_TOKEN') or ''
REPO = 'github.com/AleksTheBorsh/tayny-live.git'
ASSETS = ['widget.js', 'logo.png', 'sec_main.jpg', 'sec_breakfast.jpg', 'sec_kids.jpg', 'sec_wine.jpg', 'kam_hero.jpg']
SEP = '\u0001'


def load(name, default):
    try:
        return json.load(open(os.path.join(HERE, name), encoding='utf-8'))
    except Exception:
        return default


def apply_order(menu):
    """Тот же порядок, что отдаёт витрина (serve.apply_order)."""
    order = load('order.json', {})
    fo, do, so = order.get('folders', {}), order.get('dishes', {}), order.get('sections', [])
    def idx(lst, v):
        return lst.index(v) if v in lst else len(lst)
    groups = menu.get('groups', [])
    if so:
        groups.sort(key=lambda g: idx(so, g['title']))
    for g in groups:
        fl = fo.get(g['title'])
        if fl:
            g['categories'].sort(key=lambda c: idx(fl, c['title']))
        for c in g['categories']:
            dl = do.get(g['title'] + SEP + c['title'])
            if dl:
                c['items'].sort(key=lambda it: idx(dl, it.get('id')))
    return menu


def git(*args):
    # safe.directory=* — чтобы SYSTEM-служба на Windows не ругалась «dubious ownership»
    return subprocess.run(['git', '-c', 'safe.directory=*', '-C', LIVE, *args],
                          capture_output=True, text=True)


def out(obj):
    print(json.dumps(obj, ensure_ascii=False))


def ensure_clone():
    if os.path.isdir(os.path.join(LIVE, '.git')):
        return True
    parent = os.path.dirname(LIVE) or '.'
    os.makedirs(parent, exist_ok=True)
    r = subprocess.run(['git', '-c', 'safe.directory=*', 'clone', '--depth', '1',
                        'https://' + REPO, LIVE], capture_output=True, text=True)
    if r.returncode != 0:
        return 'clone: ' + ((r.stderr or r.stdout) or '')[-400:]
    git('config', 'user.name', 'AleksTheBorsh')
    git('config', 'user.email', 'alekstheborsh@users.noreply.github.com')
    return True


def push():
    if TOKEN:   # HTTPS с токеном (клиентский Windows-бокс)
        url = 'https://x-access-token:%s@%s' % (TOKEN, REPO)
        return git('push', url, 'HEAD:main')
    return git('push', 'origin', 'HEAD')   # ssh-origin (наш бокс)


def main():
    cl = ensure_clone()
    if cl is not True:
        out({'ok': False, 'error': cl})
        return 2

    menu = apply_order(load('menu.json', {'groups': [], 'total': 0}))
    if not menu.get('groups'):
        out({'ok': False, 'error': 'menu.json пустой — сначала «Обновить из R_Keeper»'})
        return 1

    json.dump(menu, open(os.path.join(LIVE, 'menu.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    for a in ASSETS:                      # ассеты шлём, если их ещё нет или изменились
        src = os.path.join(HERE, a)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(LIVE, a))

    git('add', '-A')
    if not git('status', '--porcelain').stdout.strip():
        out({'ok': True, 'changed': False, 'total': menu.get('total', 0)})
        return 0

    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    c = git('commit', '-m', 'menu %s · %d блюд' % (stamp, menu.get('total', 0)))
    if c.returncode != 0 and 'nothing to commit' not in (c.stdout + c.stderr):
        out({'ok': False, 'error': ('commit: ' + (c.stderr or c.stdout))[-400:]})
        return 1
    p = push()
    if p.returncode != 0:
        err = (p.stderr or p.stdout) or ''
        if TOKEN:
            err = err.replace(TOKEN, '***')
        hint = '' if TOKEN else ' (на клиентском боксе добавь gh_token= в config.ini)'
        out({'ok': False, 'error': ('push: ' + err)[-400:] + hint})
        return 1
    out({'ok': True, 'changed': True, 'total': menu.get('total', 0)})
    return 0


if __name__ == '__main__':
    sys.exit(main())
