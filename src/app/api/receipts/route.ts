import { getReceipts, totalRaisedSol } from "@/lib/receipts";
import { CAUSE } from "@/lib/config";

/** Feed for the live page: goal, total raised, and recent receipts. */
export const GET = async () => {
  return Response.json({
    cause: {
      title: CAUSE.title,
      organization: CAUSE.organization,
      goalSol: CAUSE.goalSol,
    },
    totalRaisedSol: totalRaisedSol(),
    receipts: getReceipts(),
  });
};
