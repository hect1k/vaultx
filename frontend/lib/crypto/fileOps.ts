import { aesEncryptArrayBuffer, encryptStringWithAes } from "./aes";
import { generateFileKey, deriveMasterKey } from "./keys";
import { bufToB64, genRandomBytes } from "./base";

export async function prepareFileUpload(
  file: File,
  metadata: Record<string, string>,
  masterKey: CryptoKey,
  searchKey_b64: string
) {
  const file_id = crypto.randomUUID();

  const fileKey_b64 = await generateFileKey();
  const fileKey = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(fileKey_b64), (c) => c.charCodeAt(0)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  const fileBuf = await file.arrayBuffer();
  const encFile = await aesEncryptArrayBuffer(fileBuf, fileKey);

  const metadataStr = JSON.stringify(metadata);
  const encMeta = await encryptStringWithAes(metadataStr, fileKey_b64);

  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: genRandomBytes(12) },
    masterKey,
    Uint8Array.from(atob(fileKey_b64), (c) => c.charCodeAt(0))
  );
  const encrypted_kf_b64 = bufToB64(wrapped);
  const encrypted_kf_iv = bufToB64(genRandomBytes(12).buffer);

  const tokens = [
    {
      token: bufToB64(genRandomBytes(16).buffer),
      value: bufToB64(genRandomBytes(16).buffer),
      prev_token: null,
    },
  ];

  const formData = new FormData();
  formData.append("file_id", file_id);
  formData.append("metadata_ciphertext", encMeta.ciphertext_b64);
  formData.append("metadata_iv", encMeta.iv_b64);
  formData.append("encrypted_kf_b64", encrypted_kf_b64);
  formData.append("encrypted_kf_iv", encrypted_kf_iv);
  formData.append("file_iv", encFile.iv_b64);
  formData.append("tokens_json", JSON.stringify(tokens));
  formData.append("file", file);

  return { file_id, formData, fileKey_b64 };
}
