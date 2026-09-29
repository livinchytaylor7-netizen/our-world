import { env } from "cloudflare:workers";
import { currentUser } from "@/lib/auth";
export function db() {
  if (!env.DB) throw new Error("Travel database unavailable");
  return env.DB;
}
export async function householdSettings() {
  const row = await db().prepare("SELECT owner_name AS ownerName, partner_name AS partnerName, partner_email AS partnerEmail FROM household WHERE id = ?").bind("family").first<{ownerName:string;partnerName:string;partnerEmail:string}>();
  return row ?? { ownerName:"Li", partnerName:"Partner", partnerEmail:"" };
}
export async function member() {
  const user=await currentUser();if(!user)return null;
  const settings=await householdSettings();
  return {...user,settings};
}
export function jsonError(message:string,status:number){return Response.json({error:message},{status})}
export function validPlace(input:unknown):input is {country:string;city:string;month:string;traveler:"owner"|"partner"|"both";status:"visited"|"wish";note:string}{
  if(!input||typeof input!=="object")return false;
  const x=input as Record<string,unknown>;
  return typeof x.country==="string"&&!!x.country.trim()&&x.country.length<110&&typeof x.city==="string"&&x.city.length<=120&&typeof x.month==="string"&&(!x.month||/^\d{4}-(0[1-9]|1[0-2])$/.test(x.month))&&["owner","partner","both"].includes(String(x.traveler))&&["visited","wish"].includes(String(x.status))&&typeof x.note==="string"&&x.note.length<=1000;
}
