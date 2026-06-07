# Uzdevumu pārvaldnieks

Minimālistisks uzdevumu pārvaldnieks ar SMART plānošanu, koncentrēšanās režīmu (viens uzdevums vienā reizē), apakšuzdevumu sadalīšanu un statistiku. 

## Sistēmas palaišana

### Priekšnoteikumi

- **Node.js >=18**
- **npm**

### Instalēšana

1. Klonē repozitoriju:
   ```bash
   cd <mape>
   git clone <repozitorija-url>
   ```

2. Instalē dependencies:
   ```bash
   npm install
   ```

3. Palaid serveri:
   ```bash
   npm start
   ```

4. Atver pārlūkā: <http://localhost:3000>

### Noklusējuma administratora konts

Tiek automātiski izveidots administratora konts:

- **E-pasts:** `admin@example.com`
- **Parole:** `Admin123!`

## Sistēmas izstrādes rīku saraksts

### Backend
- **Node.js** - JavaScript izpildvide servera pusē
- **Express 4** - tīmekļa lietojumprogrammu framework
- **better-sqlite3** - SQLite datubāzes draiveris
- **bcrypt** - paroles hash veidošana
- **express-session** - sesiju pārvaldība
- **helmet** - HTTP drošības nosacījumi (OWASP)
- **express-rate-limit** - pieprasījumu skaita ierobežošana (brute force aizsardzība)
- **validator** - datu validācija
- **cookie-parser** - sīkdatņu apstrāde
- **dotenv** - vides mainīgo pārvaldība

### Frontend
- **HTML**
- **CSS**
- **JavaScript**
- **Web App Manifest + Service Worker** - PWA atbalsts


### Drošība (OWASP)
- Parametrizēti SQL vaicājumi (SQL injekciju aizsardzība)
- HTTP-only, SameSite=Lax sīkdatnes
- Pieprasījumu skaita ierobežošana (brute force aizsardzība)
- Lomu pārbaude administratora maršrutos

### Pieejamība (WCAG 2.1)
- Semantiskā HTML struktūra (`<header>`, `<main>`, `<nav>`, `<section>`, `<article>`)
- ARIA atribūti formām un dinamiskām zonām
- "Skip link" navigācijai
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
├── data/                     # SQLite datubāze
└── public/                   # Frontend faili
    ├── index.html            # Sākumlapa
    ├── register.html
    ├── login.html
    ├── app.html              # Uzdevumu lapa 
    ├── stats.html            # Lietotāja statistika
    ├── account.html          # Konta pārvalde
    ├── admin.html            # Administratora panelis
    ├── styles.css
    ├── manifest.json         
    ├── service-worker.js     # PWA bezsaistes atbalsts
    ├── js/                   # Klienta puses JavaScript
    └── icons/                # PWA ikonas
```

## Datubāzes struktūra (5 tabulas)

1. **users** - lietotāju konti (id, username, email, password_hash, description, role, created_at, is_active)
2. **categories** - uzdevumu kategorijas (id, user_id, name, color)
3. **tasks** - uzdevumi (id, user_id, category_id, title, description, deadline, type, status, priority, SMART lauki, timestamps)
4. **subtasks** - apakšuzdevumi (id, task_id, title, completed, order_index)
5. **activity_log** - darbību žurnāls (id, user_id, action, target_type, target_id, ip_address, created_at)

## Lietotājie pieejamās funkcionalitātes

| Loma | Tiesības |
|---|---|
| **Viesis** | Apskatīt sākumlapu, reģistrēties, ienākt |
| **Lietotājs** | Pārvaldīt savus uzdevumus, kategorijas, apakšuzdevumus; redzēt savu statistiku |
| **Administrators** | Visas lietotāja tiesības + pārvaldīt lietotājus, mainīt lomas, redzēt sistēmas statistiku un darbību žurnālu |

## Lietotnes funkcionalitāšu saraksts

- **Reģistrācija un ienākšana**
- **SMART principi** 
- **Apakšuzdevumi**
- **Kategorijas** ar krāsu kodiem
- **Uzdevumu pildīšana - pa vienam**
- **Filtrēšana** pēc statusa, veida, kategorijas; **meklēšana** virsrakstā/aprakstā; **kārtošana** pēc dažādiem kritērijiem
- **Lietotāja statistika**
- **Administratora panelis** ar sistēmas statistiku, lietotāju pārvaldību, darbību žurnālu