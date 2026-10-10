#!/usr/bin/env python3
"""Публикация меню на сайт (GitHub CDN → виджет в Tilda).

Берёт menu.json + order.json из каталога кода, накладывает порядок (как отдаёт
витрина), кладёт результат в каталог live-репозитория и делает git commit + push.
Туда же (один раз) кладёт widget.js и фото разделов. CDN (raw/jsDelivr) отдаёт это
публично с CORS — Tilda читает напрямую, свой сервер/туннель не нужен.

Куда публикуем — каталог рабочей копии репо tayny-live:
  env TAYNY_LIVE_DIR, иначе ~/sites/tayny-live
Запускается кнопкой «Выгрузить на сайт» в админке (serve.py → /api/publish) или вручную.
Выводит в stdout JSON-строку с результатом.
"""
import datetime
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIVE = os.environ.get('TAYNY_LIVE_DIR') or os.path.expanduser('~/sites/tayny-live')
ASSETS = ['widget.js', 'sec_main.jpg', 'sec_breakfast.jpg', 'sec_kids.jpg', 'sec_wine.jpg', 'kam_hero.jpg']
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
    return subprocess.run(['git', '-C', LIVE, *args], capture_output=True, text=True)


def out(obj):
    print(json.dumps(obj, ensure_ascii=False))


def main():
    if not os.path.isdir(os.path.join(LIVE, '.git')):
        out({'ok': False, 'error': 'live-репозиторий не найден: ' + LIVE +
             ' (клонируй github.com/AleksTheBorsh/tayny-live или задай TAYNY_LIVE_DIR)'})
        return 2

    menu = apply_order(load('menu.json', {'groups': [], 'total': 0}))
    if not menu.get('groups'):
        out({'ok': False, 'error': 'menu.json пустой — сначала «Обновить из R_Keeper»'})
        return 1

    json.dump(menu, open(os.path.join(LIVE, 'menu.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    for a in ASSETS:                      # ассеты шлём, если их ещё нет или они изменились
        src = os.path.join(HERE, a)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(LIVE, a))

    git('add', '-A')
    status = git('status', '--porcelain').stdout.strip()
    if not status:
        out({'ok': True, 'changed': False, 'total': menu.get('total', 0)})
        return 0

    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    c = git('commit', '-m', 'menu %s · %d блюд' % (stamp, menu.get('total', 0)))
    if c.returncode != 0 and 'nothing to commit' not in (c.stdout + c.stderr):
        out({'ok': False, 'error': ('commit: ' + (c.stderr or c.stdout))[-400:]})
        return 1
    p = git('push', 'origin', 'HEAD')
    if p.returncode != 0:
        out({'ok': False, 'error': ('push: ' + (p.stderr or p.stdout))[-400:]})
        return 1
    out({'ok': True, 'changed': True, 'total': menu.get('total', 0)})
    return 0


if __name__ == '__main__':
    sys.exit(main())
