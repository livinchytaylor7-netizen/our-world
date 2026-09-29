import { requireOrigin } from "@/lib/auth";
import { COUNTRY_BY_NAME } from "@/lib/places";
import { db,jsonError,member,validPlace } from "@/lib/server";
export const runtime="edge";
export async function GET(){try{
  if(!await member())return jsonError("Access is not set up for this account.",403);
  const result=await db().prepare("SELECT p.id,p.country,p.city,p.month,p.traveler,p.status,p.note,p.created_by AS createdBy,p.updated_at AS updatedAt,GROUP_CONCAT(ph.id) AS photoIds FROM places p LEFT JOIN photos ph ON ph.place_id=p.id GROUP BY p.id ORDER BY p.updated_at DESC").all();
  return Response.json((result.results??[]).map((r:Record<string,unknown>)=>({...r,photoIds:r.photoIds?String(r.photoIds).split(','):[]})));
}catch{return jsonError("Could not load places. Please try again.",503)}}
export async function POST(request:Request){try{if(!await requireOrigin(request))return jsonError("Invalid request origin.",403);
  const user=await member();if(!user)return jsonError("Access is not set up for this account.",403);
  const x=await request.json();if(!validPlace(x))return jsonError("Check the place details.",400);
  const country=COUNTRY_BY_NAME.get(x.country.trim().toLowerCase())?.[0]??x.country.trim();
  if(x.traveler!=="both"&&x.traveler!==user.role)return jsonError("Choose your own or a shared trip.",403);
  const id=crypto.randomUUID();await db().prepare("INSERT INTO places(id,country,city,month,traveler,status,note,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,country,x.city.trim(),x.month,x.traveler,x.status,x.note.trim(),user.id,Date.now()).run();
  return Response.json({id},{status:201});
}catch{return jsonError("Could not save the place. Please try again.",503)}}
