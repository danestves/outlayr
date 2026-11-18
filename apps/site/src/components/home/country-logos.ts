import type { PriceCountry } from "@outlayr/money/pro-prices";

type Four = readonly [string, string, string, string];

interface CountryLogos {
    global: Four;
    local: Four;
}

type Row = Partial<Pick<CountryLogos, "global">> & Pick<CountryLogos, "local">;

const GLOBAL: Four = ["netflix.com", "spotify.com", "zara.com", "mcdonalds.com"];

// `global` replaces a default brand that does not operate in that country.
const COUNTRY_LOGOS = {
    AE: { local: ["noon.com", "luluhypermarket.com", "talabat.com", "careem.com"] },
    AG: {
        global: ["netflix.com", "spotify.com", "apple.com", "kfc.com"],
        local: ["discoverflow.co", "cibccaribbean.com", "digicelgroup.com", "westernunion.com"],
    },
    AL: {
        global: ["netflix.com", "spotify.com", "zara.com", "kfc.com"],
        local: ["conad.al", "spar.al", "neptun.al", "baboon.al"],
    },
    AM: {
        global: ["netflix.com", "spotify.com", "zara.com", "kfc.com"],
        local: ["sas.am", "idram.am", "menu.am", "ucom.am"],
    },
    AO: {
        global: ["netflix.com", "spotify.com", "samsung.com", "totalenergies.com"],
        local: ["unitel.ao", "kibabo.co.ao", "emis.co.ao", "angomart.com"],
    },
    AR: { local: ["mercadolibre.com.ar", "ypf.com", "mercadopago.com.ar", "farmacity.com"] },
    AT: { local: ["billa.at", "spar.at", "dm.at", "lieferando.at"] },
    AU: { local: ["woolworths.com.au", "coles.com.au", "chemistwarehouse.com.au", "bunnings.com.au"] },
    AZ: { local: ["bravosupermarket.az", "arazmarket.az", "bakuelectronics.az", "azercell.com"] },
    BA: {
        global: ["netflix.com", "spotify.com", "zara.com", "kfc.com"],
        local: ["glovoapp.com", "bhtelecom.ba", "amko.ba", "konzum.ba"],
    },
    BD: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["pathao.com", "grameenphone.com", "chaldal.com", "bkash.com"],
    },
    BE: { local: ["colruyt.be", "kruidvat.be", "bol.com", "delhaize.be"] },
    BF: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["wave.com", "yango.com", "orange.bf", "moov-africa.bf"],
    },
    BG: { local: ["billa.bg", "emag.bg", "sopharmacy.bg", "yettel.bg"] },
    BH: { local: ["luluhypermarket.com", "careem.com", "beyon.com", "sharafdg.com"] },
    BJ: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["mtn.bj", "yango.com", "gozem.co", "moov-africa.bj"],
    },
    BM: {
        global: ["netflix.com", "youtube.com", "apple.com", "kfc.com"],
        local: ["lindos.bm", "marketplace.bm", "onecomm.bm", "phoenixstores.com"],
    },
    BO: {
        global: ["netflix.com", "spotify.com", "burgerking.com", "apple.com"],
        local: ["hipermaxi.com", "tigo.com.bo", "farmacorp.com", "pedidosya.com.bo"],
    },
    BR: { local: ["ifood.com.br", "mercadolivre.com.br", "99app.com", "drogaraia.com.br"] },
    BS: {
        global: ["netflix.com", "spotify.com", "apple.com", "mcdonalds.com"],
        local: ["myaliv.com", "lowespharmacybahamas.com", "bahamaeats.com", "hopbahamas.com"],
    },
    BW: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["mascom.bw", "shoprite.co.za", "choppies.co.bw", "engen.co.za"],
    },
    BY: {
        global: ["netflix.com", "spotify.com", "samsung.com", "aliexpress.com"],
        local: ["21vek.by", "gippo.by", "oz.by", "santa.by"],
    },
    BZ: {
        global: ["netflix.com", "spotify.com", "burgerking.com", "subway.com"],
        local: ["pumaenergy.com", "pizzahut.com", "digiwallet.bz", "brodies.bz"],
    },
    CA: { local: ["timhortons.ca", "canadiantire.ca", "skipthedishes.com", "shoppersdrugmart.ca"] },
    CD: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["m-pesa.com", "airtel.cd", "vodacom.cd", "orange.cd"],
    },
    CF: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["moov-africa.cf", "orangerca.com", "ecobank.com", "afrilandfirstbank.com"],
    },
    CG: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["mtn.cg", "gozem.co", "airtel.cg", "jiji.cg"],
    },
    CH: { local: ["migros.ch", "coop.ch", "twint.ch", "galaxus.ch"] },
    CI: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "kfc.com"],
        local: ["carrefour.ci", "wave.com", "yango.com", "jumia.ci"],
    },
    CL: { local: ["falabella.com", "cruzverde.cl", "copec.cl", "pedidosya.cl"] },
    CM: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["mtn.cm", "complexesantalucia.com", "yango.com", "orange.cm"],
    },
    CO: { local: ["rappi.com.co", "exito.com", "nequi.com.co", "farmatodo.com.co"] },
    CR: { local: ["automercado.cr", "masxmenos.cr", "rappi.co.cr", "gollo.com"] },
    CV: {
        global: ["netflix.com", "spotify.com", "shell.com", "dstv.com"],
        local: ["cvtelecom.com", "vinti4.cv", "bca.cv", "caixa.cv"],
    },
    CY: { local: ["foody.com.cy", "cyta.com.cy", "stephanis.com.cy", "papantoniou.com.cy"] },
    CZ: { local: ["albert.cz", "alza.cz", "rohlik.cz", "notino.cz"] },
    DE: { local: ["rewe.de", "dm.de", "lieferando.de", "lidl.de"] },
    DJ: {
        global: ["netflix.com", "spotify.com", "samsung.com", "totalenergies.com"],
        local: ["djiboutitelecom.dj", "d-money.dj", "waafi.com", "ride8294.com"],
    },
    DK: { local: ["mobilepay.dk", "foetex.dk", "q8.dk", "matas.dk"] },
    DM: {
        global: ["netflix.com", "spotify.com", "apple.com", "kfc.com"],
        local: ["whitchurch.com", "discoverflow.co", "cibccaribbean.com", "digicelgroup.com"],
    },
    DO: { local: ["sirena.do", "supermercadosnacional.com", "pedidosya.com.do", "claro.com.do"] },
    DZ: {
        global: ["netflix.com", "spotify.com", "samsung.com", "decathlon.com.dz"],
        local: ["yassir.com", "djezzy.dz", "condor.dz", "ouedkniss.com"],
    },
    EC: { local: ["supermaxi.com", "fybeca.com", "micomisariato.com", "claro.com.ec"] },
    EE: { local: ["selver.ee", "rimi.ee", "bolt.eu", "wolt.com"] },
    EG: { local: ["talabat.com", "fawry.com", "breadfast.com", "jumia.com.eg"] },
    ES: { local: ["glovoapp.com", "wallapop.com", "mercadona.es", "elcorteingles.es"] },
    ET: {
        global: ["netflix.com", "apple.com", "samsung.com", "totalenergies.com"],
        local: ["ethiotelecom.et", "deliveraddis.com", "ride8294.com", "safaricom.et"],
    },
    FI: { local: ["wolt.com", "verkkokauppa.com", "k-ruoka.fi", "s-kaupat.fi"] },
    FJ: {
        global: ["netflix.com", "spotify.com", "kfc.com", "mcdonalds.com"],
        local: ["vodafone.com.fj", "mh.com.fj", "p.energy", "courts.com.fj"],
    },
    FM: {
        global: ["netflix.com", "spotify.com", "samsung.com", "apple.com"],
        local: ["fsmtc.fm", "united.com", "bankguam.com", "westernunion.com"],
    },
    FR: { local: ["carrefour.fr", "fnac.com", "orange.fr", "totalenergies.fr"] },
    GA: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "kfc.com"],
        local: ["mbolo-gabon.com", "gozem.co", "airtel.ga", "moov-africa.ga"],
    },
    GB: { local: ["tesco.com", "greggs.co.uk", "boots.com", "deliveroo.co.uk"] },
    GD: {
        global: ["netflix.com", "spotify.com", "apple.com", "kfc.com"],
        local: ["discoverflow.co", "ramstrading-grenada.com", "realvalueiga.com", "cibccaribbean.com"],
    },
    GE: { local: ["carrefour.ge", "wolt.com", "aversi.ge", "magticom.ge"] },
    GH: {
        global: ["netflix.com", "spotify.com", "uber.com", "kfc.com"],
        local: ["melcom.com", "mtn.com.gh", "bolt.eu", "jumia.com.gh"],
    },
    GM: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "dstv.com"],
        local: ["africell.gm", "wave.com", "qmoney.gm", "ecobank.com"],
    },
    GN: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["yango.com", "orange-guinee.com", "mtn.com.gn", "ecobank.com"],
    },
    GR: { local: ["ab.gr", "e-food.gr", "skroutz.gr", "cosmote.gr"] },
    GT: { local: ["tigo.com.gt", "cemaco.com", "campero.com", "pedidosya.com.gt"] },
    GW: {
        global: ["netflix.com", "spotify.com", "apple.com", "canalplus.com"],
        local: ["mtn.gw", "orange-bissau.com", "ecobank.com", "westernunion.com"],
    },
    HK: { local: ["parknshop.com", "octopus.com.hk", "wellcome.com.hk", "maxims.com.hk"] },
    HN: { local: ["lacolonia.com", "claro.com.hn", "kielsa.com", "campero.com"] },
    HR: { local: ["konzum.hr", "studenac.hr", "glovoapp.com", "ina.hr"] },
    HT: {
        global: ["netflix.com", "spotify.com", "apple.com", "kfc.com"],
        local: ["delimarthaiti.com", "digicelgroup.com", "moncashdfs.com", "natcom.com.ht"],
    },
    HU: { local: ["spar.hu", "emag.hu", "dm.hu", "mol.hu"] },
    ID: { local: ["gojek.com", "tokopedia.com", "telkomsel.com", "pertamina.com"] },
    IE: { local: ["dunnesstores.com", "supervalu.ie", "centra.ie", "primark.com"] },
    IL: { local: ["wolt.com", "super-pharm.co.il", "shufersal.co.il", "gett.com"] },
    IN: { local: ["swiggy.com", "flipkart.com", "zomato.com", "paytm.com"] },
    IQ: {
        global: ["netflix.com", "spotify.com", "zara.com", "kfc.com"],
        local: ["talabat.com", "miswag.com", "baly.iq", "asiacell.com"],
    },
    IS: {
        global: ["netflix.com", "spotify.com", "zara.com", "kfc.is"],
        local: ["bonus.is", "kronan.is", "n1.is", "lyfja.is"],
    },
    IT: { local: ["conad.it", "unieuro.it", "tim.it", "eni.com"] },
    JM: {
        global: ["netflix.com", "spotify.com", "apple.com", "kfc.com"],
        local: ["juicipatties.com", "discoverflow.co", "pricesmart.com", "islandrunja.com"],
    },
    JO: { local: ["jo.zain.com", "careem.com", "talabat.com", "cozmo.jo"] },
    JP: { local: ["rakuten.co.jp", "paypay.ne.jp", "uniqlo.com", "yoshinoya.com"] },
    KE: {
        global: ["netflix.com", "spotify.com", "uber.com", "kfc.com"],
        local: ["naivas.co.ke", "safaricom.co.ke", "jumia.co.ke", "bolt.eu"],
    },
    KG: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["globus.kg", "nambafood.kg", "megacom.kg", "alma.kg"],
    },
    KH: {
        global: ["netflix.com", "spotify.com", "zara.com", "kfc.com"],
        local: ["wingbank.com.kh", "lucky.com.kh", "smart.com.kh", "aeon.com.kh"],
    },
    KM: {
        global: ["netflix.com", "spotify.com", "samsung.com", "totalenergies.com"],
        local: ["comorestelecom.km", "yas.km", "mvola.km", "westernunion.com"],
    },
    KN: {
        global: ["netflix.com", "spotify.com", "apple.com", "kfc.com"],
        local: ["ramstrading-stkittsnevis.com", "discoverflow.co", "cibccaribbean.com", "digicelgroup.com"],
    },
    KR: { local: ["coupang.com", "baemin.com", "oliveyoung.co.kr", "ssg.com"] },
    KW: { local: ["kw.zain.com", "luluhypermarket.com", "careem.com", "talabat.com"] },
    KY: {
        global: ["netflix.com", "youtube.com", "apple.com", "kfc.com"],
        local: ["hurleys.ky", "kirkmarket.ky", "bento.ky", "digicelgroup.com"],
    },
    KZ: { local: ["kaspi.kz", "magnum.kz", "arbuz.kz", "technodom.kz"] },
    LA: {
        global: ["netflix.com", "spotify.com", "cafe-amazon.com", "samsung.com"],
        local: ["unitel.com.la", "loca.la", "joma.biz", "bcel.com.la"],
    },
    LB: { local: ["alfa.com.lb", "spinneyslebanon.com", "toters.com", "zaatarwzeit.com"] },
    LC: {
        global: ["netflix.com", "spotify.com", "apple.com", "kfc.com"],
        local: ["massystoresslu.com", "discoverflow.co", "cibccaribbean.com", "digicelgroup.com"],
    },
    LK: {
        global: ["netflix.com", "spotify.com", "samsung.com", "mcdonalds.com"],
        local: ["keellssuper.com", "pickme.lk", "cargillsonline.com", "daraz.lk"],
    },
    LR: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "dstv.com"],
        local: ["lonestarcell.com", "orange.com.lr", "ecobank.com", "ubagroup.com"],
    },
    LT: { local: ["iki.lt", "pigu.lt", "bolt.eu", "cili.lt"] },
    LU: { local: ["delhaize.lu", "tango.lu", "q8.lu", "cactus.lu"] },
    LV: { local: ["rimi.lv", "maxima.lv", "virsi.lv", "bolt.eu"] },
    LY: {
        global: ["netflix.com", "spotify.com", "samsung.com", "geant.ly"],
        local: ["presto.app", "libyana.ly", "otlob.ly", "sadad.com.ly"],
    },
    MA: { local: ["marjane.ma", "glovoapp.com", "inwi.ma", "jumia.ma"] },
    MD: {
        global: ["netflix.com", "spotify.com", "samsung.com", "mcdonalds.com"],
        local: ["linella.md", "orange.md", "glovoapp.com", "999.md"],
    },
    MK: { local: ["tinex.mk", "vero.com.mk", "neptun.mk", "makpetrol.com.mk"] },
    ML: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["wave.com", "yango.com", "orangemali.com", "sama.money"],
    },
    MM: {
        global: ["netflix.com", "youtube.com", "samsung.com", "kfc.com"],
        local: ["citymartholdings.com", "kbzpay.com", "wavemoney.com", "mpt.com.mm"],
    },
    MN: {
        global: ["netflix.com", "spotify.com", "starbucks.com", "kfc.com"],
        local: ["nomin.mn", "mobicom.mn", "petrovis.mn", "gs25.mn"],
    },
    MO: { local: ["macaupass.com", "parknshop.com", "maxims.com.hk", "mannings.com.hk"] },
    MT: { local: ["go.com.mt", "lidl.com.mt", "food.bolt.eu", "ecabs.com.mt"] },
    MU: { local: ["winners.mu", "myt.mu", "yugo.mu", "blink.mu"] },
    MV: {
        global: ["netflix.com", "spotify.com", "samsung.com", "bk.com"],
        local: ["sto.mv", "villa.com.mv", "dhiraagu.com.mv", "gannamart.com"],
    },
    MX: { local: ["oxxo.com", "mercadolibre.com.mx", "liverpool.com.mx", "rappi.com.mx"] },
    MY: { local: ["touchngo.com.my", "99speedmart.com.my", "grab.com", "lotuss.com.my"] },
    MZ: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["shoprite.co.mz", "petromoc.co.mz", "game.co.za", "galp.com"],
    },
    NA: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["shoprite.com.na", "pnp.co.za", "clicks.co.za", "engen.co.za"],
    },
    NE: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["moov-africa.ne", "airtel.ne", "nitatransfert.com", "orangeniger.com"],
    },
    NG: {
        global: ["netflix.com", "spotify.com", "uber.com", "kfc.com"],
        local: ["jumia.com.ng", "mtn.ng", "chowdeck.com", "chicken-republic.com"],
    },
    NI: { local: ["lacolonia.com.ni", "tigo.com.ni", "walmart.com.ni", "campero.com"] },
    NL: { local: ["ah.nl", "bol.com", "thuisbezorgd.nl", "kruidvat.nl"] },
    NO: { local: ["rema.no", "vipps.no", "kiwi.no", "apotek1.no"] },
    NP: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["pathao.com", "ncell.com.np", "daraz.com.np", "esewa.com.np"],
    },
    NZ: { local: ["newworld.co.nz", "thewarehouse.co.nz", "spark.co.nz", "z.co.nz"] },
    OM: { local: ["talabat.com", "luluhypermarket.com", "ooredoo.om", "nestogroup.com"] },
    PA: { local: ["super99.com", "tigo.com.pa", "arrocha.com", "ribasmith.com"] },
    PE: { local: ["yape.com.pe", "plazavea.com.pe", "rappi.com.pe", "wong.pe"] },
    PG: {
        global: ["netflix.com", "spotify.com", "samsung.com", "apple.com"],
        local: ["cpl.com.pg", "bmobile.com.pg", "pumaenergy.com", "brianbell.com.pg"],
    },
    PH: { local: ["gcash.com", "mercurydrug.com", "globe.com.ph", "jollibee.com.ph"] },
    PK: {
        global: ["netflix.com", "spotify.com", "samsung.com", "mcdonalds.com"],
        local: ["foodpanda.pk", "jazz.com.pk", "careem.com", "imtiaz.com.pk"],
    },
    PL: { local: ["zabka.pl", "rossmann.pl", "pyszne.pl", "mediaexpert.pl"] },
    PT: { local: ["pingodoce.pt", "mbway.pt", "worten.pt", "meo.pt"] },
    PY: { local: ["superseis.com.py", "tigo.com.py", "farmacenter.com.py", "pedidosya.com.py"] },
    QA: { local: ["snoonu.com", "ooredoo.qa", "luluhypermarket.com", "woqod.com"] },
    RO: { local: ["emag.ro", "dedeman.ro", "profi.ro", "wolt.com"] },
    RS: { local: ["maxi.rs", "gigatron.rs", "benu.rs", "lilly.rs"] },
    RU: {
        global: ["samsung.com", "aliexpress.com", "mi.com", "apple.com"],
        local: ["wildberries.ru", "ozon.ru", "magnit.ru", "vkusvill.ru"],
    },
    RW: {
        global: ["netflix.com", "spotify.com", "samsung.com", "totalenergies.com"],
        local: ["mtn.co.rw", "isokko.com", "bolt.eu", "bk.rw"],
    },
    SA: { local: ["hungerstation.com", "jarir.com", "noon.com", "nahdionline.com"] },
    SB: {
        global: ["netflix.com", "spotify.com", "samsung.com", "apple.com"],
        local: ["ourtelekom.com.sb", "bsp.com.sb", "p.energy", "bmobile.com.sb"],
    },
    SC: {
        global: ["netflix.com", "spotify.com", "samsung.com", "apple.com"],
        local: ["cwseychelles.com", "stcl.sc", "seyapp.com", "airseychelles.com"],
    },
    SE: { local: ["ica.se", "swish.nu", "coop.se", "telia.se"] },
    SG: { local: ["fairprice.com.sg", "grab.com", "singtel.com", "shopee.sg"] },
    SI: { local: ["mercator.si", "petrol.si", "spar.si", "telekom.si"] },
    SK: { local: ["tesco.sk", "alza.sk", "drmax.sk", "wolt.com"] },
    SL: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "dstv.com"],
        local: ["africell.com", "choithrams.com", "monime.io", "orange.sl"],
    },
    SM: {
        global: ["netflix.com", "spotify.com", "amazon.com", "mcdonalds.com"],
        local: ["titancoop.sm", "d-piu.com", "conad.it", "crai-secom.it"],
    },
    SN: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "kfc.com"],
        local: ["wave.com", "yango.com", "carrefour.sn", "yassir.com"],
    },
    SO: {
        global: ["netflix.com", "apple.com", "samsung.com", "totalenergies.com"],
        local: ["hormuud.com", "dahabshiil.com", "premierwallet.so", "waafi.com"],
    },
    SR: {
        global: ["netflix.com", "spotify.com", "burgerking.com", "mcdonalds.com"],
        local: ["telesur.sr", "choi.sr", "kirpalani.com", "tulip-supermarket.com"],
    },
    SV: { local: ["superselectos.com", "tigo.com.sv", "farmaciasannicolas.com", "campero.com"] },
    TD: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["airtel.td", "moov-africa.td", "ecobank.com", "ubagroup.com"],
    },
    TG: {
        global: ["netflix.com", "spotify.com", "totalenergies.com", "canalplus.com"],
        local: ["yango.com", "gozem.co", "yas.tg", "moov-africa.tg"],
    },
    TH: { local: ["7eleven.co.th", "lineman.line.me", "ais.th", "cafe-amazon.com"] },
    TJ: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["paykar.tj", "alif.tj", "tcell.tj", "somon.tj"],
    },
    TM: {
        global: ["netflix.com", "apple.com", "samsung.com", "aliexpress.com"],
        local: ["parlak.com.tm", "tmcell.tm", "ashgabat.market", "ynamdar.com"],
    },
    TN: {
        global: ["netflix.com", "spotify.com", "zara.com", "kfc.com"],
        local: ["monoprix.tn", "tunisietelecom.tn", "mytek.tn", "glovoapp.com"],
    },
    TO: {
        global: ["netflix.com", "spotify.com", "samsung.com", "apple.com"],
        local: ["p.energy", "digicelgroup.com", "bsp.com.to", "westernunion.com"],
    },
    TR: { local: ["trendyol.com", "yemeksepeti.com", "migros.com.tr", "bim.com.tr"] },
    TT: {
        global: ["netflix.com", "spotify.com", "apple.com", "mcdonalds.com"],
        local: ["digicelgroup.com", "pricesmart.com", "fooddrop.com", "tstt.co.tt"],
    },
    TW: { local: ["7-11.com.tw", "shopee.tw", "momoshop.com.tw", "pxmart.com.tw"] },
    TZ: {
        global: ["netflix.com", "spotify.com", "uber.com", "kfc.com"],
        local: ["vodacom.co.tz", "bolt.eu", "azampesa.co.tz", "pumaenergy.com"],
    },
    UA: { local: ["silpo.ua", "atbmarket.com", "rozetka.com.ua", "uklon.com.ua"] },
    UG: {
        global: ["netflix.com", "spotify.com", "uber.com", "kfc.com"],
        local: ["mtn.co.ug", "jumia.ug", "safeboda.com", "glovoapp.com"],
    },
    US: { local: ["costco.com", "target.com", "doordash.com", "uber.com"] },
    UY: { local: ["pedidosya.com.uy", "tiendainglesa.com.uy", "farmashop.com.uy", "mercadolibre.com.uy"] },
    UZ: {
        global: ["netflix.com", "spotify.com", "zara.com", "kfc.com"],
        local: ["korzinka.uz", "uzum.uz", "payme.uz", "express24.uz"],
    },
    VE: { local: ["gamaenlinea.com", "farmatodo.com.ve", "digitel.com.ve", "tucentralonline.com"] },
    VG: {
        global: ["netflix.com", "youtube.com", "apple.com", "kfc.com"],
        local: ["riteway.vg", "bobbyssupermarket.com", "cctbvi.com", "cibccaribbean.com"],
    },
    VN: { local: ["momo.vn", "bachhoaxanh.com", "shopee.vn", "highlandscoffee.com.vn"] },
    VU: {
        global: ["netflix.com", "spotify.com", "samsung.com", "apple.com"],
        local: ["aubonmarche.co", "vodafone.com.vu", "p.energy", "bsp.com.vu"],
    },
    WS: {
        global: ["netflix.com", "spotify.com", "samsung.com", "apple.com"],
        local: ["vodafone.com.ws", "farmerjoe.ws", "samoamarket.com", "frankiesamoa.com"],
    },
    ZA: { local: ["checkers.co.za", "takealot.com", "clicks.co.za", "vodacom.co.za"] },
    ZM: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["shoprite.co.zm", "mtn.zm", "hungrylion.co.za", "pnp.co.za"],
    },
    ZW: {
        global: ["netflix.com", "spotify.com", "samsung.com", "kfc.com"],
        local: ["ecocash.co.zw", "zuvapetroleum.co.zw", "innbucks.co.zw", "chickeninn.co.zw"],
    },
} satisfies Record<PriceCountry, Row>;

const BY_COUNTRY = new Map<string, Row>(Object.entries(COUNTRY_LOGOS));
const US: Row = COUNTRY_LOGOS.US;

export function countryLogos(country: string | null): CountryLogos {
    const { global = GLOBAL, local } = (country === null ? undefined : BY_COUNTRY.get(country)) ?? US;
    return { global, local };
}

export const tileDomains = () =>
    [...new Set([...BY_COUNTRY.values()].flatMap(({ global = GLOBAL, local }) => [...global, ...local]))].toSorted();
