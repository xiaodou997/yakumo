import { useEffect, useState } from "react";
import {
  formatGrpcMessageText,
  insertGrpcFieldIntoMessage,
  mergeGrpcTemplateIntoMessage,
} from "./RequestGrpcSchemaModel";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";
import type { GrpcFillSummary, GrpcMessageEditorNotice } from "./RequestGrpcTypes";

export function useGrpcMessageEditorActions({
  selectedMethodShape,
  selectedMethodTemplate,
  selectedMethodTemplateText,
  selectedMethodName,
  grpcMessage,
  setGrpcMessage,
}: {
  selectedMethodShape: "unary" | "streaming" | null;
  selectedMethodTemplate: unknown | null;
  selectedMethodTemplateText: string;
  selectedMethodName: string | undefined;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
}) {
  const [lastInsertedFieldPath, setLastInsertedFieldPath] = useState<string>("");
  const [lastFillSummary, setLastFillSummary] = useState<GrpcFillSummary | null>(null);
  const [messageEditorNotice, setMessageEditorNotice] =
    useState<GrpcMessageEditorNotice | null>(null);

  useEffect(() => {
    setMessageEditorNotice(null);
  }, [selectedMethodName]);

  const formatGrpcMessage = () => {
    const formatted = formatGrpcMessageText(grpcMessage);
    if (!formatted.ok) {
      setMessageEditorNotice({
        tone: "danger",
        message: formatted.error,
      });
      return;
    }
    setGrpcMessage(formatted.text);
    setMessageEditorNotice({
      tone: "success",
      message: "Formatted request message JSON.",
    });
  };

  const applySelectedMethodTemplate = () => {
    if (selectedMethodTemplate == null) {
      return;
    }
    setGrpcMessage(selectedMethodTemplateText);
    setMessageEditorNotice({
      tone: "success",
      message: "Replaced request message with the discovered template.",
    });
  };

  const mergeSelectedMethodTemplate = () => {
    if (selectedMethodTemplate == null) {
      return;
    }
    const merged = mergeGrpcTemplateIntoMessage(grpcMessage, selectedMethodTemplate);
    if (!merged.ok) {
      setMessageEditorNotice({
        tone: "danger",
        message: merged.error,
      });
      return;
    }
    setGrpcMessage(merged.text);
    setMessageEditorNotice({
      tone: "success",
      message: "Filled missing fields from the discovered template.",
    });
  };

  const fillRequiredFields = (
    fields: GrpcSchemaFieldEntry[],
    label: string,
  ) => {
    if (selectedMethodShape !== "unary") {
      return { ok: false as const, reason: "non-unary" };
    }
    if (fields.length === 0) {
      setMessageEditorNotice({
        tone: "success",
        message: `No ${label} schema fields are currently pending.`,
      });
      return { ok: false as const, reason: "empty" };
    }
    let nextMessage = grpcMessage;
    for (const field of fields) {
      const inserted = insertGrpcFieldIntoMessage(nextMessage, field.path, field.example);
      if (!inserted.ok) {
        setMessageEditorNotice({
          tone: "danger",
          message: inserted.error,
        });
        return { ok: false as const, reason: "error", error: inserted.error };
      }
      nextMessage = inserted.text;
    }
    setGrpcMessage(nextMessage);
    const lastField = fields[fields.length - 1];
    setLastInsertedFieldPath(lastField?.path ?? "");
    const fillSummary: GrpcFillSummary = {
      title: `Filled ${fields.length} ${label} field${fields.length === 1 ? "" : "s"}`,
      entries: fields.map((field) => ({
        path: field.path,
        previousState: field.messageState === "partial" ? "partial" : "missing",
      })),
    };
    setLastFillSummary(fillSummary);
    setMessageEditorNotice({
      tone: "success",
      message: `Filled ${fields.length} ${label} field${fields.length === 1 ? "" : "s"}.`,
    });
    return { ok: true as const, fillSummary };
  };

  const insertGrpcFieldValue = (
    field: { path: string; example: unknown; branchExample: unknown },
    value: unknown,
    mode: "example" | "branch",
  ) => {
    const inserted = insertGrpcFieldIntoMessage(grpcMessage, field.path, value);
    if (!inserted.ok) {
      setMessageEditorNotice({
        tone: "danger",
        message: inserted.error,
      });
      return { ok: false as const, error: inserted.error };
    }
    setGrpcMessage(inserted.text);
    setLastInsertedFieldPath(field.path);
    setMessageEditorNotice({
      tone: "success",
      message:
        mode === "branch"
          ? `Inserted empty branch at ${field.path}.`
          : `Inserted ${field.path} into the request message.`,
    });
    return { ok: true as const, path: field.path };
  };

  const insertGrpcField = (field: { path: string; example: unknown; branchExample: unknown }) =>
    insertGrpcFieldValue(field, field.example, "example");

  const insertGrpcBranch = (field: { path: string; example: unknown; branchExample: unknown }) =>
    insertGrpcFieldValue(field, field.branchExample, "branch");

  return {
    lastInsertedFieldPath,
    setLastInsertedFieldPath,
    lastFillSummary,
    setLastFillSummary,
    messageEditorNotice,
    formatGrpcMessage,
    applySelectedMethodTemplate,
    mergeSelectedMethodTemplate,
    fillRequiredFields,
    insertGrpcField,
    insertGrpcBranch,
  };
}
