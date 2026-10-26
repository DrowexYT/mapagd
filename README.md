# AREDL CZ/SK Komunitní Mapa Hráčů

Tento custom Tampermonkey userscript byl vytvořen speciálně pro českou a slovenskou Geometry Dash komunitu. Integruje plně interaktivní geografickou mapu a živý žebříček přímo do stránky [AREDL](https://aredl.net). 

Umožňuje hráčům připnout svou přibližnou polohu, vyhledávat lokální rivaly a propojovat tak digitální úspěchy ve hře s reálnými regiony.

## Hlavní funkce

- **Interaktivní mapa:** Elegantní Leaflet mapa (s podporou tmavého i světlého režimu), která se otevírá přímo v prostředí AREDL bez nutnosti opouštět stránku.
- **Integrovaný žebříček:** Živý panel umožňuje řadit hráče na mapě podle bodů (s packy i bez packů), Nejtěžšího Demona nebo počtu Extreme Demonů. Kliknutím na jméno v žebříčku se kamera automaticky přesune na daného hráče.
- **Automatická synchronizace:** Jakmile se jednou přidáš na mapu, skript bude automaticky sledovat tvé statistiky. Kdykoliv navštívíš svůj vlastní AREDL profil, skript na pozadí synchronizuje tvé nové ranky s databází.
- **Nezávislost a stabilita:** Skript stahuje čisté statistiky přímo ze serverů AREDL. Je tak plně imunní vůči jakýmkoliv dalším rozšířením (např. Theoretical Engine), která upravují vizuální vzhled stránky.
- **🇨🇿/🇸🇰 Filtrování a vlajky:** Obsahuje plnou podporu pro české a slovenské vlajky. Kdykoliv si můžeš žebříček i mapu vyfiltrovat pouze na hráče z tvého státu.
- **Ochrana soukromí (Anti-Stalking):** Přesná adresa se **nikdy** neukládá. Skript automaticky aplikuje "jittering" – drobnou náhodnou odchylku k tvým souřadnicím (v okruhu cca 200 metrů). To zajišťuje, že hvězdy hráčů ze stejného města se nepřekrývají, a zároveň tvá skutečná poloha zůstává naprosto skryta.

## Instalace

Instalace probíhá jednoduše přes oficiální platformu GreasyFork, která zajišťuje bezpečné a automatické aktualizace na pozadí.

### Krok 1: Instalace Tampermonkey
Aby skript fungoval, potřebuješ správce uživatelských skriptů.
- Stáhni a nainstaluj si bezplatné rozšíření **[Tampermonkey](https://www.tampermonkey.net/)** z oficiálního obchodu tvého prohlížeče (dostupné pro Chrome, Firefox, Edge, Opera, Safari).

### Krok 2: Přidání skriptu
- **[KLIKNI ZDE PRO INSTALACI SKRIPTU](https://greasyfork.org/en/scripts/602344-aredl-cz-sk-komunitn%C3%AD-mapa-hr%C3%A1%C4%8D%C5%AF)**
- Tampermonkey automaticky otevře novou záložku. Klikni na **Instalovat** (nebo Install).
- **Důležité:** Během instalace nebo při prvním spuštění tě může Tampermonkey zeptat na povolení přístupu k doménám `mapagd.vercel.app` (databáze) a `nominatim.openstreetmap.org` (mapa). Zvol **Vždy povolit** (Always allow).

## Jak se přidat na mapu

1. Otevři si stránku [aredl.net](https://aredl.net).
2. Přejdi na svůj profil (vpravo nahoře klikni na svou ikonku a vyber "Profile"). *Z bezpečnostních důvodů lze lokaci přidat nebo upravit pouze z tvého vlastního profilu.*
3. V horním navigačním panelu uvidíš nové tlačítko **🗺️ CZ/SK MAPA**. Klikni na něj.
4. V pravém panelu vyhledej sekci **Tvůj Profil**.
5. Vyber si svou státní vlajku (CZ / SK) a do vyhledávače napiš své město nebo okres (např. *Brno*, *Praha*, *Košice*).
6. Klikni na **Přidat / Aktualizovat na mapě**. 

Tvá hvězda se okamžitě objeví na mapě a žebříček si stáhne tvé aktuální AREDL statistiky.

> **Řešení problémů (XHR Security)** 
> Pokud vidíš chybovou hlášku *"Nepodařilo se připojit k Vercel API"*, Tampermonkey zablokoval připojení. Otevři Dashboard Tampermonkey, klikni na nastavení tohoto skriptu, najdi sekci **XHR Security** a ujisti se, že doména `mapagd.vercel.app` není blokována a nachází se v kolonce povolených domén (*User domain whitelist*). Skript se jinak sám automaticky aktualizuje na pozadí, ale ruční aktualizaci můžeš kdykoliv vynutit v menu Tampermonkey.
