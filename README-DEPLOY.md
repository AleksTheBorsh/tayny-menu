# Витрина меню «Тайны Камчатки» — развёртывание

Лёгкий мост R_Keeper → веб-меню. Чистый Python (только стандартная библиотека, pip-зависимостей нет).
Наружу отдаётся только публичное меню (`/menu.json`, read-only). Админка и пароли — локально.

## Состав
- `pull.py` — забирает меню из R_Keeper (XML-интерфейс) → `menu.json`. Логика: берём активные
  блюда с классификацией «Меню для сайта» (раздел), подкатегории = папки меню.
- `serve.py` — веб-сервер (порт 8913): витрина `/`, `/menu.json`, админка `/admin`, API.
- `index.html` / `admin.html` — витрина и админка.
- `tkconfig.py` — конфиг (config.ini → env → ~/.secrets).
- `order.json` — порядок папок/блюд (правится в админке; в git не хранится).
- `update.bat` — авто-обновление кода из git.

## Данные vs код
Код приходит из git и обновляется. **Данные клиента не трогаются** обновлением:
`config.ini` (креды+пароль), `menu.json` (кэш), `order.json` (порядок) — в `.gitignore`, живут локально.

## Установка на Windows-сервере
1. **Python 3** (python.org, галочка «Add to PATH») и **Git**.
2. Клонировать репозиторий:
   ```
   git clone <URL репозитория> C:\tayny-menu
   cd C:\tayny-menu
   ```
3. Конфиг: скопировать `config.ini.example` → `config.ini`, заполнить `endpoint/user/pass/admin_pw`.
   `endpoint` — адрес XML-интерфейса R_Keeper в локальной сети (напр. `https://192.168.1.206:8096/rk7api/v0/xmlinterface.xml`).
4. Первая выгрузка меню: `python pull.py` (создаст `menu.json`).
5. Служба через **NSSM** (nssm.cc):
   ```
   nssm install tayny-menu "C:\Python3\python.exe" "C:\tayny-menu\serve.py"
   nssm set tayny-menu AppDirectory C:\tayny-menu
   nssm start tayny-menu
   ```
   Проверка: http://localhost:8913/

## Авто-обновление (правки с нашей стороны доезжают сами)
Планировщик задач Windows → задача на `C:\tayny-menu\update.bat`, триггер «каждые 10 минут» и
«при запуске». Скрипт делает `git pull`; если код изменился — перезапускает службу.
(Мы правим у себя → `git push` → их сервер подхватывает. `config.ini`/`order.json`/`menu.json` не затрагиваются.)

## Публичный доступ для Tilda (без домена) — Cloudflare Tunnel
1. Установить `cloudflared` (Windows), залогиниться в Cloudflare.
2. Поднять тоннель на локальный порт:
   ```
   cloudflared tunnel --url http://localhost:8913
   ```
   (для постоянного — named tunnel + установка службой `cloudflared service install`).
   Получите https-адрес вида `https://xxx.trycloudflare.com` (или свой на named-tunnel).
3. В Tilda (блок «T123 / HTML-код») вставить виджет, который читает `<https-адрес>/menu.json`.
   CORS уже включён (`Access-Control-Allow-Origin: *`).

## Безопасность (чеклист)
- Пользователь R_Keeper (`user`) — **только чтение** меню.
- `admin_pw` — отдельный, не равен паролю R_Keeper.
- Админку (`/admin`, `/api/*`) желательно оставить доступной **только из локальной сети**
  (правило Windows Defender Firewall на входящие для порта 8913 — только локальная подсеть),
  а наружу через тоннель публиковать только `/menu.json` (ingress-правило cloudflared).
- Публичный порт R_Keeper из интернета можно закрыть — мост ходит в кассу по локалке.
- Мост лучше ставить на отдельной машине в сети, не на сам POS-сервер.
