import { requireOrigin } from "@/lib/auth";
import { db, householdSettings, jsonError, member } from "@/lib/server";
export const runtime="edge";
export async function GET(){try{const user=await member();if(!user)return jsonError("Access is not set up for this account.",403);return Response.json({...user.settings,role:user.role,email:user.email})}catch{return jsonError("Could not load your account. Please try again.",503)}}
export async function PUT(request:Request){try{if(!await requireOrigin(request))return jsonError("Invalid request origin.",403);
  const user=await member();if(user?.role!=="owner")return jsonError("Only the owner can change family settings.",403);
  const body=await request.json() as Record<string,unknown>;
  const ownerName=String(body.ownerName??"").trim().slice(0,32),partnerName=String(body.partnerName??"").trim().slice(0,32),partnerEmail=String(body.partnerEmail??"").trim().toLowerCase();
  if(!ownerName||!partnerName||(partnerEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerEmail))||partnerEmail.length>200||(partnerEmail&&user.email===partnerEmail))return jsonError("Check the names and email address.",400);
  await db().prepare("INSERT INTO household (id,owner_name,partner_name,partner_email) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET owner_name=excluded.owner_name,partner_name=excluded.partner_name,partner_email=excluded.partner_email").bind("family",ownerName,partnerName,partnerEmail).run();
  return Response.json(await householdSettings());
}catch{return jsonError("Could not save the settings. Please try again.",503)}}
