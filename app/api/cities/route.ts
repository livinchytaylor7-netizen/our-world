import { member,jsonError } from "@/lib/server";
export const runtime="edge";
export async function GET(request:Request){
  if(!await member())return jsonError("Not authorised.",403);
  const url=new URL(request.url),country=url.searchParams.get("country")?.toUpperCase()??"",q=url.searchParams.get("q")?.trim()??"";
  if(!/^[A-Z]{2}$/.test(country)||q.length<2||q.length>80)return jsonError("Choose a country and enter at least two letters.",400);
  try{const upstream=new URL("https://countries.dev/cities");upstream.searchParams.set("q",q);upstream.searchParams.set("country",country);upstream.searchParams.set("limit","12");const result=await fetch(upstream.toString(),{signal:AbortSignal.timeout(5000)});if(!result.ok)throw Error("City service unavailable");const body=await result.json() as Array<{name?:string;countryCode?:string}>;const cities=[...new Set(body.filter(x=>x.countryCode===country&&typeof x.name==="string").map(x=>x.name!))];return Response.json({cities},{headers:{"Cache-Control":"private, max-age=300"}})}catch{return jsonError("City suggestions unavailable; enter the city manually.",503)}
}
