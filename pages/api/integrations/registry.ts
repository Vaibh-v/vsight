import type { NextApiRequest, NextApiResponse } from "next";
import { listIntegrations } from "../../../integrations/core/registry";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ providers: listIntegrations() });
}
