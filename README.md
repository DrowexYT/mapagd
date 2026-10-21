# AREDL CZ/SK Komunitní Mapa Hráčů

Tento custom Tampermonkey userscript byl vytvořen speciálně pro českou a slovenskou Geometry Dash komunitu. Integruje plně interaktivní geografickou mapu a živý žebříček přímo do stránky [AREDL](https://aredl.net). 

Umožňuje hráčům připnout svou přibližnou polohu, vyhledávat lokální rivaly a propojovat tak digitální úspěchy ve hře s reálnými regiony.

## Hlavní funkce

- **Interaktivní mapa:** Elegantní Leaflet mapa (s podporou tmavého i světlého režimu), která se otevírá přímo v prostředí AREDL bez nutnosti opouštět stránku.
- **Integrovaný žebříček:** Živý panel umožňuje řadit hráče na mapě podle bodů (s packy i bez packů), Nejtěžšího Demona nebo počtu Extreme Demonů. Kliknutím na jméno v žebříčku se kamera automaticky přesune na daného hráče.
- **Automatická synchronizace:** Jakmile se jednou přidáš na mapu, skript bude automaticky sledovat tvé statistiky. Kdykoliv navštívíš svůj vlastní AREDL profil, skript na pozadí synchronizuje tvé nové ranky s databází.
- **🇨🇿/🇸🇰 Filtrování a vlajky:** Obsahuje plnou podporu pro české a slovenské vlajky. Kdykoliv si můžeš žebříček i mapu vyfiltrovat pouze na hráče z tvého státu.
- **Ochrana soukromí (Anti-Stalking):** Přesná adresa se **nikdy** neukládá. Skript automaticky aplikuje "jittering" – drobnou náhodnou odchylku k tvým souřadnicím (v okruhu cca 200 metrů). To zajišťuje, že hvězdy hráčů ze stejného města se nepřekrývají, a zároveň tvá skutečná poloha zůstává naprosto skryta.

---

## Instalace

Jelikož se jedná o privátní komunitní projekt, instalace probíhá přímo z tohoto repozitáře přes rozšíření Tampermonkey.

### Krok 1: Instalace Tampermonkey
Aby skript fungoval, potřebuješ správce uživatelských skriptů.
- Stáhni a nainstaluj si bezplatné rozšíření **Tampermonkey** z oficiálního obchodu tvého prohlížeče (dostupné pro Chrome, Firefox, Edge, Opera, Safari).

### Krok 2: Přidání skriptu
- **[KLIKNI ZDE PRO INSTALACI SKRIPTU]([../../raw/main/czskmapa.js](https://github.com/DrowexYT/mapagd/raw/refs/heads/main/czskmapa.user.js))**
- Tampermonkey automaticky otevře novou záložku s kódem. Klikni na velké tlačítko **Instalovat** (nebo Install).
- *Poznámka: Pokud v budoucnu vyjde aktualizace, skript se díky tomuto odkazu dokáže sám aktualizovat na pozadí.*

---

## Jak se přidat na mapu

1. Otevři si stránku [aredl.net](https://aredl.net).
2. V horním navigačním panelu uvidíš nové tlačítko **🗺️ CZ/SK MAPA**. Klikni na něj.
3. V pravém panelu vyhledej sekci **Tvůj Profil**.
4. Vyplň své Username a vlož URL odkaz na svůj AREDL profil.
5. Vyber si svou státní vlajku (CZ / SK) a do vyhledávače napiš své město nebo okres (např. *Brno*, *Praha*, *Košice*).
6. Klikni na **Přidat / Aktualizovat na mapě**. 

Tvá hvězda se okamžitě objeví na mapě a žebříček si automaticky stáhne tvé aktuální AREDL statistiky.

> **Máš nový počítač nebo prohlížeč?** 
> Pokud změníš zařízení nebo promažeš mezipaměť, stačí proces opakovat se **stejným AREDL odkazem**. Databáze tě podle odkazu pozná a tvou hvězdu pouze zaktualizuje, takže nikdy nevytvoříš duplikát.
