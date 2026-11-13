import type { Redirect } from "@nudo/commerce/catalog";
import type { Db } from "mongodb";
import { collections, toRedirect } from "../mongo/collections";

export function createRedirectRepository(db: Db) {
  const { redirects } = collections(db);

  return {
    async findByFrom(from: string): Promise<Redirect | null> {
      const doc = await redirects.findOne({ from });
      return doc ? toRedirect(doc) : null;
    },
  };
}

export type RedirectRepository = ReturnType<typeof createRedirectRepository>;
