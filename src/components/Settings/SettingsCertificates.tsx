import { useRef } from "react";
import { showConfirmDelete } from "../../lib/confirm";
import { useTranslate } from "../../lib/i18n";
import { useUpdateYakuSettings, useYakuSettings } from "../../lib/yaku-settings";
import type { YakuClientCertificate } from "../../lib/yaku-client";
import { Button } from "../core/Button";
import { Checkbox } from "../core/Checkbox";
import { DetailsBanner } from "../core/DetailsBanner";
import { Heading } from "../core/Heading";
import { IconButton } from "../core/IconButton";
import { InlineCode } from "../core/InlineCode";
import { PlainInput } from "../core/PlainInput";
import { Separator } from "../core/Separator";
import { HStack, VStack } from "../core/Stacks";
import { SelectFile } from "../SelectFile";

function createEmptyCertificate(): YakuClientCertificate {
  return {
    host: "",
    port: null,
    crtFile: null,
    keyFile: null,
    pfxFile: null,
    passphrase: null,
    enabled: true,
  };
}

interface CertificateEditorProps {
  certificate: YakuClientCertificate;
  index: number;
  onUpdate: (index: number, cert: YakuClientCertificate) => void;
  onRemove: (index: number) => void;
}

function CertificateEditor({ certificate, index, onUpdate, onRemove }: CertificateEditorProps) {
  const updateField = <K extends keyof YakuClientCertificate>(
    field: K,
    value: YakuClientCertificate[K],
  ) => {
    onUpdate(index, { ...certificate, [field]: value });
  };

  const t = useTranslate();
  const hasPfx = Boolean(certificate.pfxFile && certificate.pfxFile.length > 0);
  const hasCrtKey = Boolean(
    (certificate.crtFile && certificate.crtFile.length > 0) ||
      (certificate.keyFile && certificate.keyFile.length > 0),
  );
  const certType = hasPfx ? "PFX" : hasCrtKey ? "CERT" : null;
  const defaultOpen = useRef<boolean>(!certificate.host);

  return (
    <DetailsBanner
      defaultOpen={defaultOpen.current}
      summary={
        <HStack alignItems="center" justifyContent="between" space={2} className="w-full">
          <HStack space={1.5}>
            <Checkbox
              className="ml-1"
              checked={certificate.enabled ?? true}
              title={
                certificate.enabled
                  ? t("settings.certificates.disableCert")
                  : t("settings.certificates.enableCert")
              }
              hideLabel
              onChange={(enabled) => updateField("enabled", enabled)}
            />

            {certificate.host ? (
              <InlineCode>
                {certificate.host || <>&nbsp;</>}
                {certificate.port != null && `:${certificate.port}`}
              </InlineCode>
            ) : (
              <span className="italic text-sm text-text-subtlest">
                {t("settings.certificates.configure")}
              </span>
            )}
            {certType && <InlineCode>{certType}</InlineCode>}
          </HStack>
          <IconButton
            icon="trash"
            size="sm"
            title={t("settings.certificates.removeCert")}
            className="text-text-subtlest -mr-2"
            onClick={() => onRemove(index)}
          />
        </HStack>
      }
    >
      <VStack space={3} className="mt-2">
        <HStack space={2} alignItems="end">
          <PlainInput
            leftSlot={
              <div className="bg-surface-highlight flex items-center text-editor font-mono px-2 text-text-subtle mr-1">
                https://
              </div>
            }
            validate={(value) => Boolean(value) && /^[a-zA-Z0-9_.-]+$/.test(value)}
            label={t("settings.certificates.host")}
            placeholder="example.com"
            size="sm"
            required
            defaultValue={certificate.host}
            onChange={(host) => updateField("host", host)}
          />
          <PlainInput
            label={t("settings.certificates.port")}
            hideLabel
            validate={(value) => !value || !Number.isNaN(parseInt(value, 10))}
            placeholder="443"
            leftSlot={
              <div className="bg-surface-highlight flex items-center text-editor font-mono px-2 text-text-subtle mr-1">
                :
              </div>
            }
            size="sm"
            className="w-24"
            defaultValue={certificate.port?.toString() ?? ""}
            onChange={(port) => updateField("port", port ? parseInt(port, 10) : null)}
          />
        </HStack>

        <Separator className="my-3" />

        <VStack space={2}>
          <SelectFile
            label={t("settings.certificates.crtFile")}
            noun={t("settings.certificates.nounCert")}
            filePath={certificate.crtFile ?? null}
            size="sm"
            disabled={hasPfx}
            onChange={({ filePath }) => updateField("crtFile", filePath)}
          />
          <SelectFile
            label={t("settings.certificates.keyFile")}
            noun={t("settings.certificates.nounKey")}
            filePath={certificate.keyFile ?? null}
            size="sm"
            disabled={hasPfx}
            onChange={({ filePath }) => updateField("keyFile", filePath)}
          />
        </VStack>

        <Separator className="my-3" />

        <SelectFile
          label={t("settings.certificates.pfxFile")}
          noun={t("settings.certificates.nounKey")}
          filePath={certificate.pfxFile ?? null}
          size="sm"
          disabled={hasCrtKey}
          onChange={({ filePath }) => updateField("pfxFile", filePath)}
        />

        <PlainInput
          label={t("settings.certificates.passphrase")}
          size="sm"
          type="password"
          defaultValue={certificate.passphrase ?? ""}
          onChange={(passphrase) => updateField("passphrase", passphrase || null)}
        />
      </VStack>
    </DetailsBanner>
  );
}

export function SettingsCertificates() {
  const settings = useYakuSettings();
  const updateSettings = useUpdateYakuSettings();
  const certificates = settings.clientCertificates;
  const t = useTranslate();

  const updateCertificates = (clientCertificates: YakuClientCertificate[]) => {
    updateSettings.mutate({ clientCertificates });
  };

  const handleAdd = () => {
    updateCertificates([...certificates, createEmptyCertificate()]);
  };

  const handleUpdate = (index: number, cert: YakuClientCertificate) => {
    const nextCertificates = [...certificates];
    nextCertificates[index] = cert;
    updateCertificates(nextCertificates);
  };

  const handleRemove = async (index: number) => {
    const cert = certificates[index];
    if (cert == null) return;

    const host = cert.host || "this certificate";
    const port = cert.port != null ? `:${cert.port}` : "";

    const confirmed = await showConfirmDelete({
      id: "confirm-remove-certificate",
      title: t("settings.certificates.deleteTitle"),
      description: (
        <>
          {t("settings.certificates.deleteConfirm", { host })}{" "}
          <InlineCode>
            {host}
            {port}
          </InlineCode>
        </>
      ),
    });

    if (!confirmed) return;
    updateCertificates(certificates.filter((_, certificateIndex) => certificateIndex !== index));
  };

  return (
    <VStack space={3}>
      <div className="mb-3">
        <HStack justifyContent="between" alignItems="start">
          <div>
            <Heading>{t("settings.certificates")}</Heading>
            <p className="text-text-subtle">{t("settings.certificates.description")}</p>
          </div>
          <Button variant="border" size="sm" color="secondary" onClick={handleAdd}>
            {t("settings.certificates.add")}
          </Button>
        </HStack>
      </div>

      {certificates.length > 0 && (
        <VStack space={3}>
          {certificates.map((cert, index) => (
            <CertificateEditor
              // oxlint-disable-next-line react/no-array-index-key
              key={index}
              certificate={cert}
              index={index}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
}
