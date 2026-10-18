export type MarketNews={days:number;total:number;shown:number;truncated:boolean;source_count:number;regions:string[];topics:{slug:string;name:string;count:number}[];last_refresh:string|null;refresh_status:string;feed_results:Record<string,{stored?:number;error?:string;disabled?:boolean}>;items:{id:string;title:string;url:string;source:string;region:string;topics:string[];published_at:string;fetched_at:string;rights_basis:string}[]};
export async function getMarketNews(params=new URLSearchParams()):Promise<MarketNews>{const r=await fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8000'}/api/v1/markets/news?${params}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('Markets unavailable');return r.json();}
export const EXCHANGES=[
 {code:'NYSE',name:'New York Stock Exchange',city:'New York',region:'Americas',zone:'America/New_York',url:'https://www.nyse.com/'},
 {code:'NASDAQ',name:'Nasdaq',city:'New York',region:'Americas',zone:'America/New_York',url:'https://www.nasdaq.com/'},
 {code:'LSE',name:'London Stock Exchange',city:'London',region:'Europe',zone:'Europe/London',url:'https://www.londonstockexchange.com/'},
 {code:'EURONEXT',name:'Euronext',city:'Paris',region:'Europe',zone:'Europe/Paris',url:'https://www.euronext.com/en'},
 {code:'JPX',name:'Japan Exchange Group',city:'Tokyo',region:'Asia',zone:'Asia/Tokyo',url:'https://www.jpx.co.jp/english/'},
 {code:'HKEX',name:'Hong Kong Exchanges',city:'Hong Kong',region:'Asia',zone:'Asia/Hong_Kong',url:'https://www.hkex.com.hk/'},
 {code:'NSE',name:'National Stock Exchange of India',city:'Mumbai',region:'Asia',zone:'Asia/Kolkata',url:'https://www.nseindia.com/'},
 {code:'BSE',name:'BSE',city:'Mumbai',region:'Asia',zone:'Asia/Kolkata',url:'https://www.bseindia.com/'},
 {code:'SGX',name:'Singapore Exchange',city:'Singapore',region:'Asia',zone:'Asia/Singapore',url:'https://www.sgx.com/'},
 {code:'ASX',name:'Australian Securities Exchange',city:'Sydney',region:'Oceania',zone:'Australia/Sydney',url:'https://www.asx.com.au/'},
 {code:'JSE',name:'Johannesburg Stock Exchange',city:'Johannesburg',region:'Africa',zone:'Africa/Johannesburg',url:'https://www.jse.co.za/'},
 {code:'B3',name:'B3 — Brasil, Bolsa, Balcão',city:'São Paulo',region:'Americas',zone:'America/Sao_Paulo',url:'https://www.b3.com.br/en_us/'},
];
