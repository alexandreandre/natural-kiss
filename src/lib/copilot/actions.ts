"use server";

import {
  generateDocument,
  summarizeEmailThread,
  type GenerateDocumentResult,
  type ThreadSummaryResult,
} from "@/lib/copilot/service";
import type { DocumentKind } from "@/lib/copilot/rules";

export async function summarizeThreadAction(
  threadKey: string,
): Promise<ThreadSummaryResult | null> {
  return summarizeEmailThread(threadKey);
}

export async function generateDocumentAction(
  kind: DocumentKind,
  lotId: string,
  threadKey?: string,
): Promise<GenerateDocumentResult> {
  return generateDocument(kind, lotId, threadKey);
}
