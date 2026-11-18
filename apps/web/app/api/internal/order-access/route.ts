// Chequeo de acceso a la confirmación de pedido para proxy.ts (R17).
// El token viaja en la URL; la página no puede devolver un 404 real una vez
// que el shell PPR ya empezó a streamear, así que la guarda corre antes del render.
// Responde solo 204/404: no expone datos del pedido.
import { type NextRequest, NextResponse } from "next/server";
import { getRepositories } from "@nudo/data/repositories";
import { guardInternal, internalHeaders } from "../../../../lib/internal-auth";

export async function GET(request: NextRequest) {
  const denied = await guardInternal(request);
  if (denied) return denied;

  const number = request.nextUrl.searchParams.get("number") ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!number || !token) {
    return NextResponse.json(
      { error: "missing_params" },
      { status: 400, headers: internalHeaders },
    );
  }

  const order = await (await getRepositories()).orders.findForConfirmation(number, token);
  return new NextResponse(null, {
    status: order ? 204 : 404,
    headers: internalHeaders,
  });
}
