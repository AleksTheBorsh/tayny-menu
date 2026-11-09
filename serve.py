#!/usr/bin/env python3
"""Меню «Тайны Камчатки» — витрина + админка (MVP).

Публичное:
  GET  /            → index.html (витрина)
  GET  /menu.json   → меню с применённым порядком (order.json)
  GET  /<img|css>   → статика из папки
Админка (нужен заголовок X-Admin-Pw):
  GET  /admin       → admin.html
  GET  /api/order   → текущий порядок
  POST /api/order   → сохранить порядок папок/блюд
  POST /api/refresh → перезабрать меню из R_Keeper (pull.py)
Меню НЕ реального времени — обновляется кнопкой в админке.
"""
import json, os, subprocess, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from tkconfig import CFG

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get('PORT', '8913'))
ADMIN_PW = CFG['admin_pw']
SEP = '\u0001'


def load(name, default):
    try:
        return json.load(open(os.path.join(HERE, name), encoding='utf-8'))
    except Exception:
        return default


def _fmatch(saved, name):
    """Сохранённое в order.json имя папки подходит к текущему: совпадает, или у папки убрали обёртку
    («Завтрак A la Carte · Блины» → «Блины»), или подпапки слили («Холодные закуски · Морепродукты» →
    «Холодные закуски»). Так ручной порядок из админки переживает переименования папок."""
    return saved == name or saved.endswith(' · ' + name) or saved.startswith(name + ' · ')


def _pos(lst, name):
    if name in lst:
        return lst.index(name)
    for i, v in enumerate(lst):
        if _fmatch(v, name):
            return i
    return len(lst)


def apply_order(menu):
    """Порядок разделов/папок/блюд из order.json. Используется и витриной, и publish.py."""
    order = load('order.json', {})
    fo, do, so = order.get('folders', {}), order.get('dishes', {}), order.get('sections', [])
    groups = menu.get('groups', [])
    if so:
        groups.sort(key=lambda g: so.index(g['title']) if g['title'] in so else len(so))
    for g in groups:
        fl = fo.get(g['title']) or []
        if fl:
            g['categories'].sort(key=lambda c: _pos(fl, c['title']))
        for c in g['categories']:
            dl = do.get(g['title'] + SEP + c['title'])
            if dl is None and c['title'] not in fl:
                # папку переименовали/слили — берём сохранённый порядок блюд со старых папок, по их порядку
                olds = [f for f in fl if _fmatch(f, c['title'])]
                dl = [i for f in olds for i in do.get(g['title'] + SEP + f, [])] or None
            if dl:
                c['items'].sort(key=lambda it: dl.index(it.get('id')) if it.get('id') in dl else len(dl))
    return menu


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, code, body, ctype):
        if isinstance(body, str): body = body.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')   # для встраивания виджета в Tilda
        self.end_headers()
        if self.command != 'HEAD': self.wfile.write(body)

    def _file(self, name, ctype):
        try:
            with open(os.path.join(HERE, name), 'rb') as f:
                return self._send(200, f.read(), ctype)
        except FileNotFoundError:
            return self._send(404, 'not found', 'text/plain')

    def _authed(self):
        return self.headers.get('X-Admin-Pw') == ADMIN_PW

    def _body(self):
        n = int(self.headers.get('Content-Length', 0) or 0)
        return self.rfile.read(n) if n else b''

    def do_GET(self):
        p = self.path.split('?')[0]
        if p in ('/', '/index.html'): return self._file('index.html', 'text/html; charset=utf-8')
        if p in ('/admin', '/admin/', '/admin.html'): return self._file('admin.html', 'text/html; charset=utf-8')
        if p == '/menu.json':
            return self._send(200, json.dumps(apply_order(load('menu.json', {'groups': [], 'total': 0})),
                              ensure_ascii=False), 'application/json; charset=utf-8')
        if p == '/api/order':
            if not self._authed(): return self._send(401, '{"error":"auth"}', 'application/json')
            return self._send(200, json.dumps(load('order.json', {})), 'application/json; charset=utf-8')
        name = os.path.basename(p.lstrip('/')); ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
        MIME = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'svg': 'image/svg+xml',
                'webp': 'image/webp', 'css': 'text/css; charset=utf-8', 'js': 'text/javascript; charset=utf-8'}
        if ext in MIME and os.path.isfile(os.path.join(HERE, name)): return self._file(name, MIME[ext])
        return self._send(404, 'not found', 'text/plain')

    def do_POST(self):
        p = self.path.split('?')[0]
        if not self._authed(): return self._send(401, '{"error":"auth"}', 'application/json')
        if p == '/api/order':
            try:
                data = json.loads(self._body() or b'{}')
                tmp = os.path.join(HERE, 'order.json.tmp')
                json.dump(data, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
                os.replace(tmp, os.path.join(HERE, 'order.json'))
                return self._send(200, '{"ok":true}', 'application/json')
            except Exception as e:
                return self._send(500, json.dumps({'ok': False, 'error': str(e)}), 'application/json')
        if p == '/api/refresh':
            try:
                r = subprocess.run([sys.executable, os.path.join(HERE, 'pull.py')],
                                   capture_output=True, timeout=120, cwd=HERE)
                if r.returncode != 0:
                    return self._send(500, json.dumps({'ok': False, 'error': r.stderr.decode('utf-8', 'replace')[-400:]}), 'application/json')
                total = load('menu.json', {}).get('total', 0)
                return self._send(200, json.dumps({'ok': True, 'total': total}), 'application/json')
            except subprocess.TimeoutExpired:
                return self._send(504, '{"ok":false,"error":"timeout"}', 'application/json')
        if p == '/api/publish':
            try:
                r = subprocess.run([sys.executable, os.path.join(HERE, 'publish.py')],
                                   capture_output=True, timeout=180, cwd=HERE)
                last = (r.stdout or b'').decode('utf-8', 'replace').strip().splitlines()
                try:
                    j = json.loads(last[-1]) if last else {}
                except Exception:
                    j = {}
                if not j:
                    j = {'ok': r.returncode == 0, 'error': (r.stderr or b'').decode('utf-8', 'replace')[-400:]}
                return self._send(200 if j.get('ok') else 500, json.dumps(j, ensure_ascii=False), 'application/json; charset=utf-8')
            except subprocess.TimeoutExpired:
                return self._send(504, '{"ok":false,"error":"timeout"}', 'application/json')
        return self._send(404, 'not found', 'text/plain')


if __name__ == '__main__':
    print(f'tayny-menu: 0.0.0.0:{PORT}', flush=True)
    ThreadingHTTPServer(('0.0.0.0', PORT), H).serve_forever()
