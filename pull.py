#!/usr/bin/env python3
"""Выгрузка меню «Тайны Камчатки» из R_Keeper → menu.json (ПРАВИЛЬНАЯ логика).

Берём СТРОГО активные блюда, у которых есть классификация «Меню для сайта».
  РАЗДЕЛ (оглавление)  = членство в детях классификатора 4608 «Меню для сайта»
                         (4609 Основное, 4614 Завтрак, 4612 Детское, 4610 Винная карта…)
  КАТЕГОРИЯ (внутри)   = членство в «ФирмКатегории» (4353..4363: 01.Салаты … 11.Прочее)
Имя = Фирменное название (иначе кассовое); тянем Состав/Выход/БЖУ/Цену/Аллергены.
Привязки блюдо→группа — из справочника DISHGROUPS (Parent=группа, Child=блюдо).
Креды/адрес — ~/.secrets/rkeeper-tayny.
"""
import base64, json, os, ssl, urllib.request
import xml.etree.ElementTree as ET
from collections import OrderedDict, defaultdict
from datetime import datetime, timezone, timedelta
from tkconfig import CFG

CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
AUTH = base64.b64encode(f"{CFG['user']}:{CFG['pass']}".encode()).decode()


def rk(ref):
    body = (f'<?xml version="1.0" encoding="UTF-8"?><RK7Query>'
            f'<RK7CMD CMD="GetRefData" RefName="{ref}"/></RK7Query>').encode()
    req = urllib.request.Request(CFG['endpoint'], data=body, headers={
        'Content-Type': 'text/xml; charset=utf-8', 'Authorization': 'Basic ' + AUTH})
    return ET.fromstring(urllib.request.urlopen(req, timeout=120, context=CTX).read()).findall('.//Item')


MI = {i.get('Ident'): i for i in rk('MenuItems')}
alg = {i.get('Ident'): i.get('Name') for i in rk('ALLERGENS')}
dat = rk('GENERATEDPROPDATAS')
da = rk('DISHALLERGENS')
pr = rk('PRICES')
dg = rk('DISHGROUPS')

# разделы «Меню для сайта» (оглавление) — в порядке показа
SECTIONS = OrderedDict([('4609', 'Основное меню'), ('4614', 'Меню завтраков'),
                        ('4612', 'Детское меню'), ('4610', 'Винная карта'),
                        ('4613', 'Банкетное меню'), ('4611', 'Прочее')])
TYPE = {'1195452': 'brand', '1195451': 'sostav', '1207278': 'vyhod',
        '10032': 'kcal', '10033': 'bel', '10034': 'jir', '10035': 'ugl'}
props = {}
for d in dat:
    if d.get('ObjectRefNo') == '10' and d.get('RKTypeIdent') in TYPE:
        props.setdefault(d.get('ObjectIdent'), {})[TYPE[d.get('RKTypeIdent')]] = (d.get('PropertyVal') or '').strip()
alrg = defaultdict(set)
for d in da:
    alrg[d.get('Child')].add(alg.get(d.get('Parent'), d.get('Parent')))
price = {}
for p in pr:
    if p.get('PriceType') == '3' and p.get('Modifiers') in ('[]', None, ''):
        price[p.get('ObjectID')] = int(p.get('Value') or 0)
d2g = defaultdict(set)
for x in dg:
    d2g[x.get('Child')].add(x.get('Parent'))

# section_id -> OrderedDict{catname: [items]}  (категория = ПАПКА из CategPath)
buckets = {s: OrderedDict() for s in SECTIONS}
n = 0
for ident, mi in MI.items():
    if mi.get('Status') != 'rsActive':
        continue
    groups = d2g.get(ident, set())
    secs = [s for s in SECTIONS if s in groups]
    if not secs:
        continue                                   # нет классификации «Меню для сайта» → пропуск
    # подкатегория = папка меню (Путь по группам), без верхнего POS-корня
    parts = [x for x in (mi.get('CategPath') or '').split('\\') if x]
    subcat = ' · '.join(parts[1:]) if len(parts) > 1 else (parts[0] if parts else 'Прочее')
    p = props.get(ident, {})
    bju = {k: p[k] for k in ('kcal', 'bel', 'jir', 'ugl') if p.get(k)}
    item = OrderedDict(
        id=ident,
        name=p.get('brand') or mi.get('Name'),
        pos_name=mi.get('Name'),
        desc=p.get('sostav') or '',
        weight=p.get('vyhod') or '',   # только «Выход готового блюда»; пусто — ничего не придумываем
        price=round(price.get(ident, 0) / 100) if price.get(ident) else None,
        allergens=sorted(a for a in alrg.get(ident, []) if a),
        bju=bju,
    )
    for s in secs:
        buckets[s].setdefault(subcat, []).append(item)
    n += 1

out = OrderedDict(restaurant='Тайны Камчатки', total=n, groups=[])
kam = datetime.now(timezone(timedelta(hours=12)))
out['generated'] = kam.strftime('%d.%m.%Y %H:%M')
for s, title in SECTIONS.items():
    cats = buckets[s]
    if not cats:
        continue
    g = OrderedDict(title=title, count=sum(len(v) for v in cats.values()), categories=[])
    for cname, items in cats.items():
        g['categories'].append(OrderedDict(title=cname, items=sorted(items, key=lambda x: x['name'].lower())))
    out['groups'].append(g)

HERE = os.path.dirname(os.path.abspath(__file__))
json.dump(out, open(os.path.join(HERE, 'menu.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'menu.json: {n} блюд-в-разделах; разделы: ' +
      ', '.join(f"{g['title']}={g['count']}" for g in out['groups']))
