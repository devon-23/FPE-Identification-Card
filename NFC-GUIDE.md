# PROGRAMMING THE TAGS

Everything needed to get 100 NFC tags written, tested and handed out at
Ohio State University on 17 October 2026.

Allow **90 minutes** for 100 tags: about 40 to write, 40 to test, 10 to fix
the ones that fail. Do it in one sitting if you can — batching is what keeps
you from losing your place.

---

## 0. Buying the tags

Get **NTAG215** (or NTAG213). These are NFC Forum Type 2 tags, which is what
phones read natively with no app involved.

Search `NTAG215 NFC cards` and check the listing names the chip. Roughly
$25-45 for 100.

**Do not buy anything described as:**

- UID changeable / magic card / block 0 writable
- MIFARE Classic, S50, or "1K"
- "access control", "door entry", "clone"

Those are MIFARE Classic fobs for duplicating apartment badges. **iPhones
cannot read them at all** -- Apple's Core NFC supports the Ultralight, Plus
and DESFire families and has never supported Classic -- and plenty of Android
phones can't either. Listings often still put "NFC Tags" in the title. One I
looked at said in its own bullets: *"Not suitable for using the nfc mobile
phone."*

**Cards, not keyfobs.** You need somewhere to print the designation and the
URL (see §8), and a keyfob gives you almost no surface. Blank white PVC
NTAG215 cards are credit-card sized and take a label or a card printer.

Capacity is a non-issue: the URL is 38 characters, about 35 bytes. NTAG213
holds 144.

---

## 1. What each tag holds

One tag, one URL, nothing else:

```
FPE-0042  →  https://fpe-archive.pages.dev/f/0042?k=PWPF63D2
```

That `?k=` is the card's own key, and it is the thing that stops someone
sitting at home typing `/f/0001` through `/f/0100` and claiming the whole set.
Anyone may *read* any record; only a request carrying the right key may
register one. Once a designation is claimed the key stops mattering.

**Make the keys once:**

```bash
node scripts/generate-keys.mjs https://fpe-archive.pages.dev 100
npx wrangler d1 execute fpe --remote --file=./keys.sql
```

That writes `urls.csv` — designation, key and full URL for all 100 — and
`keys.sql`, which teaches the database their hashes. The database only ever
stores hashes, so **`urls.csv` is the only copy of the keys.** Keep it. The
script refuses to overwrite it without `--force`, because re-running it makes
new keys and silently breaks every tag already programmed.

**The tag carries no data about the person.** It is a pointer to a number.
Everything else lives in the database, which is why a tag can be handed to a
stranger and still mean something a year later.

### Size

The URL is about 49 characters with the key on the end — roughly 46 bytes as
an NDEF URI record with the `https://` prefix abbreviated. NTAG213 holds 144,
so there is still three times the room needed.

### HTTPS is required

`https://`, not `http://`. iOS silently refuses to offer some plain-HTTP tags,
and the site only answers on HTTPS anyway. Check this on the first tag and the
rest will follow.

---

## 2. The app

**NFC Tools** by wakdev — free, on both iOS and Android, and the one most
guides assume. Android has more alternatives; iOS effectively has this one.

- iOS: App Store → "NFC Tools"
- Android: Play Store → "NFC Tools"

Turn NFC on first:

- **Android:** Settings → Connected devices → Connection preferences → NFC
- **iPhone XR and later:** always on, nothing to enable
- **iPhone 7, 8, X:** NFC works only inside an app; fine for writing, but see
  §6 about what those phones do when a fan taps

---

## 3. Writing a tag

Do this once slowly, then settle into a rhythm.

1. Open **NFC Tools** → **WRITE** tab
2. **Add a record** → **URL/URI**
3. Paste the full URL from `urls.csv`, key and all
4. **OK**, then **Write / Write 1 record**
5. Hold the tag against the phone until it confirms

Every tag now has a different key as well as a different number, so you
cannot just edit four digits between writes — copy each line out of
`urls.csv`. Keeping the csv open on a laptop and the app on your phone, or
mailing the list to yourself, both work.

### Where to hold the tag

- **iPhone:** the antenna is at the **very top of the back**, near the camera.
  Touch the top edge of the phone to the tag.
- **Android:** usually the **middle or upper third of the back**. If nothing
  happens, slide the tag slowly around the back until it catches.

Hold still for a second. Most "failed" writes are the tag moving.

### Keeping your place

Write in blocks of ten and lay each block out in order as you go. An unmarked
tag is indistinguishable from any other, and a tag you *think* is 0038 but
isn't will not be discovered until a fan is standing in front of you.

**Write the number on the card as you go**, even in pencil. See §8.

---

## 4. Testing every tag

Not a sample. **Every one.** A tag that fails at the venue cannot be fixed
there.

For each tag:

1. Tap it with a phone that is **not** the one you wrote it with, if possible
2. Confirm the browser opens `.../f/XXXX`
3. Confirm the number on screen matches the number you wrote on the card
4. Set it face-down in a "passed" pile

That third step is the one that matters. It catches the duplicate-number
mistake, which is the only failure mode you cannot recover from at the show.

A fast check for duplicates once you are done — if any number appears twice
you wrote a tag wrong:

```bash
cut -d, -f1 urls.csv | sort | uniq -d
```

(That checks the list, not the tags. The real check is the eyes-on pass above.)

---

## 5. Locking, and why I would not

NTAG chips have a one-way lock bit. Once set, **the tag is read-only forever**
— no app, no tool, no reset. A typo'd URL becomes landfill and you cannot
reuse the tags after the show.

What locking protects against is someone rewriting your tag to point somewhere
else. At a concert, with tags you hand over and never see again, that risk is
close to zero, and it lands on *them*, not on you.

**Better option: set a password instead.**

In NFC Tools → **Other** → **Set password**. This stops casual overwriting but
is reversible if you know the password. You get the protection without the
dead end.

- Use the same password for all 100 tags
- Put it in your password manager now
- If you forget it, those tags are effectively locked anyway

**If you do want a permanent lock:** write all 100, test all 100, sleep on it,
then lock. Never lock a tag you have not personally tapped and read back.

---

## 6. What a fan actually experiences

**iPhone XR and newer** — phone unlocked, screen on. Hold the top of the phone
to the card. A banner slides down from the top; **they must tap the banner** to
open the page. Phones do not navigate on their own. Say "tap the notification"
out loud — this is the step people miss.

**iPhone 7, 8, X** — background scanning does not exist. Nothing happens.
These people need the URL. See §8.

**Android** — unlocked, screen on. Hold the middle of the back to the card.
Most phones open the page directly; some show a prompt first.

**Any phone with NFC off, or locked, or in a thick case** — nothing happens.
This is normal and it will happen to a meaningful share of people.

---

## 7. Troubleshooting at the venue

| What you see | What it is | What to do |
|---|---|---|
| Nothing at all | NFC off, phone locked, or wrong spot on the back | Unlock, wake the screen, slide the card around the back |
| Nothing, iPhone 8 or older | No background NFC on that hardware | Have them type the URL |
| Banner appears, nothing opens | They did not tap the banner | "Tap the notification at the top" |
| Opens the wrong number | Tag written wrong | Hand them a different card, set that one aside |
| Page will not load | Venue network | Have them try on cell data, or come back later — **the claim is not lost, the number is still theirs to take** |
| 404 ER_ROR | Typo in the written URL | That tag is wrong; set it aside |
| "CAN ONLY BE REGISTERED FROM ITS OWN CARD" | The key is missing or wrong | They typed the URL without `?k=`, or that tag was written before the keys were loaded |
| "THE ARCHIVE IS NOT ACCEPTING SUBMISSIONS" | Claiming is still switched off | Open it from `/admin` |
| Someone claimed the wrong number | It happens | `/admin` → find it → RESET |

### Thick cases and metal

Popsockets, wallet cases and metal plates (magnetic mounts) block NFC. If
someone has one, ask them to take the card to the *top edge* of the phone
instead, or have them try without the case.

---

## 8. Print the URL on the card

You said no QR codes, which is fine — but that makes this important.

**Without a QR, a phone that cannot read NFC has no way in unless the URL is
printed on the card.** Based on §6 that is every iPhone 8 and older, every
phone with NFC switched off, and everyone with a thick case.

The URL is short enough to type:

```
fpe-archive.pages.dev/f/0042?k=PWPF63D2
```

Longer than it was, but it has to carry the key or it cannot be registered.
The key alphabet leaves out `0`, `O`, `1`, `I` and `L` precisely so it can be
read off a card in a dark room.

Printing the designation and the URL on the card also means the card is still
a collectible when the phone is dead, the network is gone, or it turns up in a
drawer in three years. I would put both on every card.

---

## 9. Pre-concert checklist

Work down this list. Nothing here takes long; all of it is unrecoverable if
skipped.

**A week out**

- [ ] Keys generated and `keys.sql` loaded into the live database
- [ ] `urls.csv` backed up somewhere that is not just this laptop
- [ ] All 100 tags written
- [ ] All 100 tags tapped and read back, number matched against the card
- [ ] Failures rewritten and re-tested
- [ ] Password set on the tags (or a conscious decision not to)
- [ ] Designation and URL printed or written on every card
- [ ] `npx wrangler pages deploy` run, so the live site matches the repo
- [ ] Admin password tested on **your phone**, not just a laptop
- [ ] Claimed one record end to end on your own phone: photo from the camera,
      consent box, submit, SAVE CARD through the share sheet
- [ ] That test record reset from `/admin`

**The day before**

- [ ] Phone charged, battery pack packed
- [ ] Admin password in your password manager, and you can open `/admin`
- [ ] Claiming confirmed **CLOSED**
- [ ] Cards counted and in something that will survive a pocket

**At the venue, before handing anything out**

- [ ] `/admin` → **OPEN IT**
- [ ] Tap one card yourself and claim it, to prove the whole chain works on
      venue network
- [ ] Reset that record

This is the one that bites: **if claiming is closed, every fan sees "THE
ARCHIVE IS NOT ACCEPTING SUBMISSIONS" and nobody can register.** It ships
closed on purpose so nobody can sweep the set in advance, but that means you
have to remember to open it.

---

## 10. Post-concert checklist

**That night or the next morning**

- [ ] `/admin` → **CLOSE IT**, if you do not want stragglers claiming the
      leftovers — or leave it open on purpose so someone who finds a card in a
      coat pocket can still register
- [ ] Skim the register for anything that needs removing
- [ ] Note how many went out versus how many were claimed

**Within the week**

- [ ] Decide whether unclaimed designations stay open forever
- [ ] Back up the database:

```bash
npx wrangler d1 execute fpe --remote --command "SELECT * FROM records;" --json > backup.json
```

**Leave the site up.** The whole point is that someone taps their card in two
years and the record is still there. Cloudflare's free tier costs nothing at
rest, and the only thing that would take it down is you deleting it.

---

## 11. If you need to reset a tag

Only possible if you did **not** permanently lock it.

- **No password:** NFC Tools → WRITE → new URL → write over it
- **Password set:** NFC Tools → Other → **Remove password** (needs the
  password), then write
- **Permanently locked:** nothing to be done; the tag is read-only for good

Resetting a *record* is separate and always possible: `/admin` → find the
designation → **RESET**. That returns the number to the pool, invalidates the
old owner's edit token and deletes their photo. The physical tag keeps working
and points at a now-unclaimed record.
