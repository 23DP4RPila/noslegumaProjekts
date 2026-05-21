# Uzdevumu pārvaldnieks

Noslēguma darba projekts - **Mācību un uzdevumu pārvaldes sistēma**.

Minimālistisks uzdevumu pārvaldnieks ar SMART plānošanu, fokusa režīmu (viens uzdevums vienā reizē), apakšuzdevumu sadalīšanu un statistiku. Mērķauditorija - skolēni un studenti vecumā no 13 līdz 30 gadiem.

## Sistēmas palaišanas vadlīnijas

### Priekšnoteikumi

- **Node.js 18 vai jaunāka versija** - pārbaudi ar `node --version`
- **npm** (nāk līdzi Node.js)
- (Nav vajadzīga atsevišķa datubāzes servera instalācija - sistēma izmanto SQLite, kas glabājas failā.)

### Instalēšana

1. Klonē repozitoriju:
   ```bash
   git clone <repozitorija-url>
   cd theApp
   ```

2. Instalē dependencies:
   ```bash
   npm install
   ```

3. *(Pēc izvēles)* Izveido `.env` failu, pārkopējot `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Pielāgo `SESSION_SECRET` uz garu nejaušu virkni (vismaz 32 rakstzīmes).

4. Palaid serveri:
   ```bash
   npm start
   ```

5. Atver pārlūkā: <http://localhost:3000>

### Noklusētais administratora konts

Pirmajā palaišanas reizē sistēma automātiski izveido administratora kontu:

- **E-pasts:** `admin@example.com`
- **Parole:** `Admin123!`

⚠ **Pēc pirmās ienākšanas obligāti nomaini paroli kontā** (`/account.html`).

## Sistēmas izstrādes rīku saraksts

### Backend
- **Node.js** (v18+) - JavaScript izpildvide servera pusē
- **Express 4** - tīmekļa lietojumprogrammu ietvars
- **better-sqlite3** - SQLite datubāzes draiveris (sinhronais, ātrs)
- **bcrypt** - paroles hash veidošana
- **express-session** - sesiju pārvaldība
- **helmet** - HTTP drošības galvenes (OWASP)
- **express-rate-limit** - pieprasījumu skaita ierobežošana (brute force aizsardzība)
- **validator** - datu validācija
- **cookie-parser** - sīkdatņu apstrāde
- **dotenv** - vides mainīgo pārvaldība

### Frontend
- **HTML** + semantiskā struktūra
- **CSS** ar CSS mainīgajiem (gaišais/tumšais režīms)
- **JavaScript**
- **Web App Manifest + Service Worker** - PWA atbalsts

### Datubāze
- **SQLite 3** - viens fails (`data/app.db`), nav atsevišķa servera

### Drošība (OWASP)
- Parametrizēti SQL vaicājumi (SQL injekciju aizsardzība)
- bcrypt paroles hash ar 12 round salt
- HTTP-only, SameSite=Lax sīkdatnes
- Content Security Policy un citas drošības galvenes (Helmet)
- Pieprasījumu skaita ierobežošana (brute force aizsardzība)
- HTML eskeipošana frontend renderēšanai
- Sesijas atjaunošana pēc ienākšanas (session fixation aizsardzība)
- Lomu pārbaude administratora maršrutos

### Pieejamība (WCAG 2.1)
- Semantiskā HTML struktūra (`<header>`, `<main>`, `<nav>`, `<section>`, `<article>`)
- ARIA atribūti formām un dinamiskām zonām
- "Skip link" navigācijai
- Tastatūras navigācija ar fokusa indikatoriem
- Krāsu kontrasts atbilst AA līmenim
- `prefers-color-scheme` (gaišais/tumšais režīms)
- `prefers-reduced-motion` atbalsts
- Atbilstošas `label` un `aria-label` katram interaktīvam elementam

## Mapju struktūra

```
theApp/
├── server.js                 # Express servera entry point
├── db.js                     # Datubāzes shēma + savienojums (5 tabulas)
├── package.json
├── README.md
├── .env.example
├── .gitignore
├── middleware/
│   ├── auth.js               # requireAuth, requireAdmin
│   └── validation.js         # Datu validācija
├── routes/
│   ├── auth.js               # /api/auth - register, login, logout
│   ├── tasks.js              # /api/tasks - CRUD + filter/search/sort
│   ├── subtasks.js           # /api/subtasks - apakšuzdevumi
│   ├── categories.js         # /api/categories - kategorijas
│   ├── stats.js              # /api/stats - lietotāja statistika
│   └── admin.js              # /api/admin - admin panelis
├── docs/
│   └── testcases.md          # 5 testa gadījumi
├── data/                     # SQLite datubāze tiek izveidota šeit
└── public/                   # Frontend faili
    ├── index.html            # Sākumlapa (Viesim)
    ├── register.html
    ├── login.html
    ├── app.html              # Galvenā uzdevumu lapa (fokusa režīms)
    ├── stats.html            # Lietotāja statistika
    ├── account.html          # Konta pārvalde
    ├── admin.html            # Administratora panelis
    ├── styles.css
    ├── manifest.json         # PWA manifests
    ├── service-worker.js     # PWA bezsaistes atbalsts
    ├── js/                   # Klienta puses JavaScript
    └── icons/                # PWA ikonas
```

## Datubāzes shēma (5 tabulas)

1. **users** - lietotāju konti (id, username, email, password_hash, description, role, created_at, is_active)
2. **categories** - uzdevumu kategorijas (id, user_id, name, color)
3. **tasks** - uzdevumi (id, user_id, category_id, title, description, deadline, type, status, priority, SMART lauki, timestamps)
4. **subtasks** - apakšuzdevumi (id, task_id, title, completed, order_index)
5. **activity_log** - darbību žurnāls (id, user_id, action, target_type, target_id, ip_address, created_at)

Attiecības: `tasks` → `users`, `tasks` → `categories`, `subtasks` → `tasks`, `activity_log` → `users` (FK ar `ON DELETE` darbībām).

## Lietotāju lomas

| Loma | Tiesības |
|---|---|
| **Viesis** | Apskatīt sākumlapu, reģistrēties, ienākt |
| **Lietotājs** | Pārvaldīt savus uzdevumus, kategorijas, apakšuzdevumus; redzēt savu statistiku |
| **Administrators** | Visas lietotāja tiesības + pārvaldīt lietotājus, mainīt lomas, redzēt sistēmas statistiku un darbību žurnālu |

## Funkcionalitāte

- **Reģistrācija un ienākšana** ar validāciju un drošu paroles hash
- **CRUD uzdevumi** ar parasto un SMART veidu
- **Apakšuzdevumi** - sadalīt uzdevumu mazākos soļos
- **Kategorijas** ar krāsu kodiem
- **Parāda tikai vienu uzdevumu**
- **Filtrēšana** pēc statusa, veida, kategorijas; **meklēšana** virsrakstā/aprakstā; **kārtošana** pēc dažādiem kritērijiem
- **Statistika** ar aprēķiniem un GROUP BY (pēc kategorijas, pēc dienas, pabeigšanas %)
- **Administratora panelis** ar sistēmas statistiku, lietotāju pārvaldību, darbību žurnālu
- **PWA** - instalējams kā lietotne, darbojas bezsaistē (statiskās lapas)

## Testēšana

5 testa gadījumi pieejami: [`docs/testcases.md`](docs/testcases.md)

## Skripti

- `npm start` - palaiž serveri
- `npm run init-db` - inicializē datubāzi (notiek arī automātiski pie palaišanas)

## Licence

MIT
