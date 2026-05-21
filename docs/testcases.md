# Testa gadījumi

Šie 5 manuālie testa gadījumi pārbauda galvenās funkcionalitātes prasības.

---

## TC-01: Jauna lietotāja reģistrācija un automātiska ienākšana

**Mērķis:** Pārbaudīt vai jauns lietotājs var izveidot kontu un tūlīt tiek ielogots.

**Priekšnoteikumi:** Servera process palaists; lietotājs pārlūkā atver `/register.html`.

**Soļi:**
1. Ievadīt lietotājvārdu: `testuser01`
2. Ievadīt e-pastu: `test01@example.com`
3. Ievadīt paroli: `Parole123`
4. Nospiest pogu **Reģistrēties**.

**Sagaidāmais rezultāts:**
- Tiek saņemts HTTP 200 atbilde no `POST /api/auth/register`.
- Pārlūks tiek pārvirzīts uz `/app.html`.
- Topbar augšā tiek parādīts lietotājvārds `testuser01`.
- Datubāzē `users` tabulā parādās jauns ieraksts ar `role = 'user'` un `is_active = 1`.

**Faktiskais rezultāts:** _aizpilda testētājs_

**Statuss:** ☐ Pass ☐ Fail

---

## TC-02: Validācijas kļūdas paroles ievadē

**Mērķis:** Pārbaudīt vai sistēma noraida vāju paroli.

**Priekšnoteikumi:** Lietotājs atver `/register.html`.

**Soļi:**
1. Ievadīt lietotājvārdu: `weakpwuser`
2. Ievadīt e-pastu: `weak@example.com`
3. Ievadīt paroli: `abc` (par īsu, bez lielajiem burtiem, bez cipariem)
4. Nospiest pogu **Reģistrēties**.

**Sagaidāmais rezultāts:**
- Servers atgriež HTTP 400 ar kļūdas ziņojumu, kurā norādīts, ka parole nav pietiekami stipra.
- Sarkans kļūdas paziņojums parādās virs formas.
- Datubāzē `users` tabulā nav izveidots jauns ieraksts.

**Faktiskais rezultāts:** _aizpilda testētājs_

**Statuss:** ☐ Pass ☐ Fail

---

## TC-03: Uzdevuma izveide, atzīmēšana kā pabeigts un fokusa režīma pāriešana uz nākamo uzdevumu

**Mērķis:** Pārbaudīt CRUD un fokusa režīma loģiku.

**Priekšnoteikumi:** Lietotājs ielogots, atrodas `/app.html`. Datubāzē nav neizpildītu uzdevumu.

**Soļi:**
1. Sadaļā "Pievienot uzdevumu" ievadīt virsrakstu: `Pirmais uzdevums`. Nospiest **Pievienot**.
2. Sadaļā "Pievienot uzdevumu" ievadīt virsrakstu: `Otrais uzdevums`. Nospiest **Pievienot**.
3. Pārbaudīt, ka fokusa kartiņā augšā tiek rādīts `Pirmais uzdevums`.
4. Nospiest pogu **Pabeigt uzdevumu**.

**Sagaidāmais rezultāts:**
- Pēc 1. un 2. soļa abi uzdevumi parādās "Visi uzdevumi" sarakstā.
- Pēc 3. soļa fokusa zona rāda tieši vienu uzdevumu (`Pirmais uzdevums`).
- Pēc 4. soļa:
  - `Pirmais uzdevums` tabulā `tasks` saņem `status = 'done'` un `completed_at` nav NULL.
  - Fokusa zona automātiski pāriet uz `Otrais uzdevums`.
  - "Visi uzdevumi" sarakstā `Pirmais uzdevums` parādās ar pārsvītrojumu.

**Faktiskais rezultāts:** _aizpilda testētājs_

**Statuss:** ☐ Pass ☐ Fail

---

## TC-04: Meklēšana un filtrēšana

**Mērķis:** Pārbaudīt datu filtrēšanu un meklēšanu.

**Priekšnoteikumi:** Lietotājs ir izveidojis vismaz 3 uzdevumus ar dažādiem virsrakstiem, no kuriem viens ir pabeigts un viens satur vārdu "matemātika".

**Soļi:**
1. Filtrā "Statuss" izvēlēties **Pabeigti**.
2. Pārbaudīt, ka redzami tikai pabeigtie uzdevumi.
3. Atgriezt filtru uz **Visi**.
4. Meklēšanas laukā ievadīt: `matemātika`.

**Sagaidāmais rezultāts:**
- Pēc 1. soļa parādās tikai uzdevumi ar `status = 'done'`.
- Pēc 4. soļa parādās tikai uzdevumi, kuru virsrakstā vai aprakstā ir vārds "matemātika".
- Saraksts atjaunojas dinamiski (bez lapas pārlādes).

**Faktiskais rezultāts:** _aizpilda testētājs_

**Statuss:** ☐ Pass ☐ Fail

---

## TC-05: Administratora piekļuves kontrole

**Mērķis:** Pārbaudīt funkcionālo pienākumu sadalīšanu — parastam lietotājam nav piekļuves admin endpointiem.

**Priekšnoteikumi:** Lietotājs ielogots ar lomu `user` (nevis admin).

**Soļi:**
1. Pārlūka adresē ievadīt `/admin.html` un nospiest Enter.
2. Pārbaudīt pārlūka tīkla cilnē izsaukumu uz `GET /api/admin/stats`.
3. Mēģināt manuāli izsaukt `POST /api/admin/users/1` (piemēram, ar fetch konsolē).

**Sagaidāmais rezultāts:**
- Pēc 1. soļa skripts `admin.js` pārbauda lomu un pārvirza uz `/app.html`.
- Visi `/api/admin/*` izsaukumi atgriež HTTP **403 Forbidden** ar ziņojumu "Nepieciešamas administrātora tiesības".
- Parastam lietotājam nekādā veidā nav iespējams modificēt citu lietotāju datus.

**Faktiskais rezultāts:** _aizpilda testētājs_

**Statuss:** ☐ Pass ☐ Fail

---

## Kopsavilkums

| Testa ID | Apraksts | Statuss |
|---|---|---|
| TC-01 | Reģistrācija | ☐ |
| TC-02 | Paroles validācija | ☐ |
| TC-03 | CRUD + fokusa režīms | ☐ |
| TC-04 | Meklēšana un filtrēšana | ☐ |
| TC-05 | Admin piekļuves kontrole | ☐ |
