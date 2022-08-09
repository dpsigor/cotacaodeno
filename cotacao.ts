import { writeAllSync } from "https://deno.land/std@0.151.0/streams/mod.ts";
import { green, red } from "https://deno.land/std@0.151.0/fmt/colors.ts";

enum H {
  prc = "prc",
  prv = "prv",
  minYear = "minYear",
  maxYear = "maxYear",
  dif = "dif",
}

type Headers<T> = { [key in H]: T };

type Stat = Headers<number>;
type PrintStat = Headers<string>;

const digitOpts = {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
};

const tickers = Deno.args.length ? Deno.args.map((x) => x.toUpperCase()) : ["AAPL34", "AMZO34", "B3SA3", "BBDC4", "GOGL34", "IVVB11", "M1TA34"];

console.log("COD\tPRICE\tPREV\tY.LOW\tY.HIGH\tDIFF");
console.log("---\t-----\t----\t-----\t------\t----");

async function cotacao(ticker: string) {
  const res = await fetch(`https://www.google.com/finance/quote/${ticker}:BVMF?hl=en`);
  const html = await res.text();
  if (html.includes("We couldn't find any match for your search")) {
    console.log(`We couldn't find any match for your search: ${ticker}`);
    return;
  }
  const prcRgx = /class="YMlKec fxKbKc">R\$(.+?)</;
  const prvRgx = /Previous close.+?"P6K39c">R\$(.+?)</;
  const minYearRgx = /Year range.+?class="P6K39c">R\$(.+?) -/;
  const maxYearRgx = /Year range.+?class="P6K39c">.+? - R\$(.+?)</;
  const passos: { rgx: RegExp; key: H }[] = [
    { rgx: prcRgx, key: H.prc },
    { rgx: prvRgx, key: H.prv },
    { rgx: minYearRgx, key: H.minYear },
    { rgx: maxYearRgx, key: H.maxYear },
  ];
  const s: Stat = {
    prc: 0,
    prv: 0,
    minYear: 0,
    maxYear: 0,
    dif: 0,
  };
  for (const { rgx, key } of passos) {
    const ms = html.match(rgx);
    if (ms) {
      const v = parseFloat(ms[1]);
      if (v) s[key] = v;
    }
    if (!s[key]) throw new Error("failed to parse");
  }
  s.dif = (s.prc - s.prv) / s.prv;
  const p: PrintStat = {
    prc: s.prc.toLocaleString("pt-BR", digitOpts),
    prv: s.prv.toLocaleString("pt-BR", digitOpts),
    minYear: s.minYear.toLocaleString("pt-BR", digitOpts),
    maxYear: s.maxYear.toLocaleString("pt-BR", digitOpts),
    dif: (s.dif * 100).toLocaleString("pt-BR", digitOpts) + "%",
  };
  if (s.dif < 0) {
    p.dif = red(p.dif);
    p.prc = red(p.prc);
  } else {
    p.dif = green(p.dif);
    p.prc = green(p.prc);
  }
  for (const str of [ticker, ...Object.values(p)]) {
    const text = new TextEncoder().encode(`${str}\t`);
    writeAllSync(Deno.stdout, text);
  }
  console.log();
}

await Promise.all(tickers.map((ticker) => cotacao(ticker)));
