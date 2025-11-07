export interface VaultXContext {
  accessToken: string
  masterKey_b64: string
  searchKey_b64: string
  privateKey_b64: string
  publicKey_b64: string
}

export function getVaultXContext(): VaultXContext {
  const accessToken =
    localStorage.getItem("vaultx_access_token") || ""
  const masterKey_b64 =
    sessionStorage.getItem("vaultx_master_key") || ""
  const searchKey_b64 =
    sessionStorage.getItem("vaultx_search_key") || ""
  const privateKey_b64 =
    sessionStorage.getItem("vaultx_private_key") || ""
  const publicKey_b64 =
    sessionStorage.getItem("vaultx_public_key") || ""

  if (
    !accessToken ||
    !masterKey_b64 ||
    !searchKey_b64 ||
    !privateKey_b64 ||
    !publicKey_b64
  ) {
    clearVaultXContext();
    alert("Please login again.");
    window.location.href = "/";
  }

  return {
    accessToken,
    masterKey_b64,
    searchKey_b64,
    privateKey_b64,
    publicKey_b64,
  }
}

export function clearVaultXContext() {
  localStorage.removeItem("vaultx_access_token")
  sessionStorage.removeItem("vaultx_master_key")
  sessionStorage.removeItem("vaultx_search_key")
  sessionStorage.removeItem("vaultx_private_key")
  sessionStorage.removeItem("vaultx_public_key")
}
