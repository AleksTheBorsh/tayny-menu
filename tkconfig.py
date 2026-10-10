"""Единый резолвер конфигурации (креды R_Keeper + пароль админки).

Приоритет источников:
  1) config.ini рядом с приложением (секция [rkeeper]) — ПРОД (их сервер)
  2) переменные окружения RK_ENDPOINT/RK_USER/RK_PASS/ADMIN_PW
  3) ~/.secrets/rkeeper-tayny (наш бокс/превью)
config.ini и секреты в git НЕ попадают (см. .gitignore). Код — попадает.
"""
import configparser
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def _load():
    c = {}
    ini = os.path.join(HERE, 'config.ini')
    if os.path.isfile(ini):
        p = configparser.ConfigParser()
        p.read(ini, encoding='utf-8-sig')   # utf-8-sig: корректно ест BOM, если он есть
        if p.has_section('rkeeper'):
            for k, v in p['rkeeper'].items():
                c[k.lower()] = v.strip()
    env = {'endpoint': os.environ.get('RK_ENDPOINT'), 'user': os.environ.get('RK_USER'),
           'pass': os.environ.get('RK_PASS'), 'admin_pw': os.environ.get('ADMIN_PW'),
           'live_dir': os.environ.get('TAYNY_LIVE_DIR'), 'gh_token': os.environ.get('GH_TOKEN')}
    for k, v in env.items():
        if v and not c.get(k):
            c[k] = v.strip()
    sec = os.path.expanduser('~/.secrets/rkeeper-tayny')
    if os.path.isfile(sec):
        for ln in open(sec, encoding='utf-8'):
            ln = ln.strip()
            if ln and not ln.startswith('#') and '=' in ln:
                k, v = ln.split('=', 1)
                c.setdefault(k.strip().lower(), v.strip())
    return {
        'endpoint': c.get('endpoint', ''),
        'user': c.get('user', ''),
        'pass': c.get('pass', ''),
        'admin_pw': c.get('admin_pw') or '134597',
        'live_dir': c.get('live_dir', ''),   # куда публиковать (рабочая копия tayny-live)
        'gh_token': c.get('gh_token', ''),   # PAT для push с клиентского бокса (HTTPS)
    }


CFG = _load()
